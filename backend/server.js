const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const pool = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

// ---------------- Estado en memoria ----------------
const rooms = {};

// ---------------- Estadisticas ------------

// Ranking de jugadores
app.get("/stats/ranking", async (req, res) => {
  const { rows } = await pool.query(`
    SELECT 
      id, nombre, partidas_jugadas, partidas_ganadas, partidas_perdidas, partidas_empatadas,
      ROUND((partidas_ganadas::decimal / NULLIF(partidas_jugadas,0)) * 100, 2) AS win_rate
    FROM jugadores
    ORDER BY win_rate DESC, partidas_jugadas DESC
    LIMIT 5
  `);
  res.json(rows);
});

// Últimas partidas
app.get("/stats/partidas", async (req, res) => {
  const { rows } = await pool.query(`
    SELECT p.id, j1.nombre AS jugador1, j2.nombre AS jugador2, 
          COALESCE(jg.nombre, 'Empate') AS resultado, p.fecha
    FROM partidas p
    JOIN jugadores j1 ON p.jugador1_id = j1.id
    JOIN jugadores j2 ON p.jugador2_id = j2.id
    LEFT JOIN jugadores jg ON p.ganador_id = jg.id
    ORDER BY p.fecha DESC
    LIMIT 6
  `);
  res.json(rows);
});


// ---------------- REST API ----------------

// Listar salas
app.get("/rooms", (req, res) => {
  res.json(Object.values(rooms));
});

// ---------------- Helpers ----------------
function createGame(roomId) {
  return {
    id: "g_" + Math.random().toString(36).slice(2, 9),
    roomId,
    board: Array(9).fill(null),
    nextTurn: "X",
    result: null,
  };
}

function checkWinner(board) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (let [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  if (board.every((cell) => cell)) return "draw";
  return null;
}

// --------- Validar o Crear Usuario ----------
async function ensurePlayer(userId) {
  const { rows: rowsLower } = await pool.query("SELECT * FROM jugadores WHERE LOWER(nombre) = $1", [userId]);
  const { rows: rowsExact } = await pool.query("SELECT * FROM jugadores WHERE nombre = $1", [userId]);
  if (rowsLower.length === 0 && rowsExact.length === 0) {
    await pool.query("INSERT INTO jugadores (nombre) VALUES ($1)", [userId]);
  }
}

// ---------------- WebSocket ----------------
io.on("connection", (socket) => {
  console.log("🔌 Nuevo cliente conectado:", socket.id);

    // Crear sala
    socket.on('create_room', async ({ userId }, ack) => {
      await ensurePlayer(userId);
      const roomId = "r_" + Math.random().toString(36).slice(2,9);
      rooms[roomId] = {
          id: roomId,
          ownerId: userId,
          players: [{ id: socket.id, name: userId, symbol: "X" }],
          board: Array(9).fill(null),
          turn: "X",
          status: "waiting",
          game: { id: roomId, board: Array(9).fill(null), nextTurn: "X", result: null }
      };
      socket.join(roomId);
      if (ack) ack({ ok: true, roomId, symbol: 'X' });
      socket.emit('room_created', { roomId, symbol: 'X' });
      io.emit('room_updated', rooms[roomId]);
    });

    // Unirse a sala
    socket.on("join_room", async ({ roomId, userId }, ack) => {
      await ensurePlayer(userId);
      const room = rooms[roomId];
      if (!room) {
        if (ack) ack({ ok: false, reason: "Sala no existe" });
      return;
      }
      if (room.players.some(p => p.name === userId)) {
        if (ack) ack({ ok: false, reason: "Ya estás en la sala" });
      return;
      }
      if (room.players.length >= 2) {
        if (ack) ack({ ok: false, reason: "Sala llena" });
      return;
      }

      room.players.push({ id: socket.id, name: userId, symbol: 'O' });
      console.log(`🙋 Usuario ${userId} se unió a la sala ${roomId}`);
      socket.join(roomId);
      if (ack) ack({ ok: true, roomId, symbol: 'O' });
      socket.emit('room_joined', { roomId, symbol: 'O' });
      const gameState = { id: roomId, roomId, board: room.board, nextTurn: room.turn, result: null };
      io.to(roomId).emit('game_started', gameState);
    });

    // Iniciar juego
    socket.on("start_game", ({ roomId }, ack) => {
      const room = rooms[roomId];
      if (!room) {
        if (ack) ack({ ok: false, reason: "Sala no existe" });
      return;
      }
      if (room.players.length < 2) {
        if (ack) ack({ ok: false, reason: "Faltan jugadores" });
      return;
      }

      room.status = "playing";
      room.game = createGame(roomId);

      console.log(`🎮 Juego iniciado en sala ${roomId}`);

      if (ack) ack({ ok: true });
      io.emit("game_started", room.game);
    });

    // Hacer movimiento
    socket.on("make_move", async ({ gameId, userId, pos }, ack) => {

      const room = Object.values(rooms).find((r) => r.game && r.game.id === gameId);
      if (!room) {
        if (ack) ack({ ok: false, reason: "Juego no encontrado" });
      return;
      }
      const game = room.game;

      if (game.result) {
        if (ack) ack({ ok: false, reason: "Juego ya terminó" });
      return;
      }
      if (game.board[pos]) {
        if (ack) ack({ ok: false, reason: "Celda ocupada" });
      return;
      }

      game.board[pos] = game.nextTurn;
      game.nextTurn = game.nextTurn === "X" ? "O" : "X";

      const winner = checkWinner(game.board);

      if (winner) {
        game.result = winner;
        room.status = "finished";

        // Guardar la partida en PostgreSQL
        const jugador1 = room.players[0].name;
        const jugador2 = room.players[1].name;

        let ganador = null;

        if (winner === "X") ganador = jugador1;
        else if (winner === "O") ganador = jugador2;

        const { rows: rowsLower } = await pool.query("SELECT * FROM jugadores WHERE LOWER(nombre) = $1", [userId]);
        const { rows: rowsExact } = await pool.query("SELECT * FROM jugadores WHERE nombre = $1", [userId]);

        if (rowsLower.length > 0) {
          await pool.query(
            "INSERT INTO partidas (jugador1_id, jugador2_id, ganador_id) VALUES ((SELECT id FROM jugadores WHERE LOWER(nombre)=$1), (SELECT id FROM jugadores WHERE LOWER(nombre)=$2), (SELECT id FROM jugadores WHERE LOWER(nombre)=$3))",
            [jugador1, jugador2, ganador]
          );
        } else if (rowsExact.length > 0) {
          await pool.query(
            "INSERT INTO partidas (jugador1_id, jugador2_id, ganador_id) VALUES ((SELECT id FROM jugadores WHERE nombre=$1), (SELECT id FROM jugadores WHERE nombre=$2), (SELECT id FROM jugadores WHERE nombre=$3))",
            [jugador1, jugador2, ganador]
          );
        }

        io.emit("game_ended", { game });
        } else {
        io.emit("move_made", { game });
        }

      if (ack) ack({ ok: true });
    });

    socket.on('delete_room', ({ roomId, userId }, ack) => {
      const room = rooms[roomId];
      if (!room) return ack?.({ ok: false, reason: 'Sala no existe' });
      if (room.ownerId !== userId) return ack?.({ ok: false, reason: 'Solo el creador puede eliminar la sala' });
      delete rooms[roomId];
      io.emit('rooms_updated', Object.values(rooms));
      ack?.({ ok: true });
    });

    socket.on("disconnect", () => {
        console.log("❌ Cliente desconectado:", socket.id);
    });
});

// ---------------- Server ----------------
const PORT = 4000;
server.listen(PORT, () => {
  console.log(`✅ Backend corriendo en http://localhost:${PORT}`);
});
