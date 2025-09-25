const rooms = {}; // { roomId: { players: [], board: [...], turn: "X" } }

function createRoom(roomId, player, socket) {
  if (rooms[roomId]) {
    socket.emit("errorMessage", "La sala ya existe.");
    return;
  }
  rooms[roomId] = {
    players: [{ id: socket.id, name: player, symbol: "X" }],
    board: Array(9).fill(null),
    turn: "X",
    result: null
  };
  socket.join(roomId);
  socket.emit("room_created", { roomId, symbol: "X" });
}

function joinRoom(roomId, player, socket) {
  const room = rooms[roomId];
  if (!room) {
    socket.emit("errorMessage", "La sala no existe.");
    return;
  }
  if (room.players.length >= 2) {
    socket.emit("errorMessage", "La sala está llena.");
    return;
  }
  room.players.push({ id: socket.id, name: player, symbol: "O" });
  socket.join(roomId);
  socket.emit("room_joined", { roomId, symbol: "O" });

  // Notificar a ambos que el juego empieza
  const gameState = {
    id: roomId,
    roomId,
    board: room.board,
    nextTurn: room.turn,
    result: null
  };
  io.to(roomId).emit("game_started", gameState);
}

function makeMove(roomId, index, socket, io, statsManager) {
  const room = rooms[roomId];
  if (!room) return;

  const player = room.players.find(p => p.id === socket.id);
  if (!player || room.turn !== player.symbol || room.board[index]) {
    socket.emit("errorMessage", "Movimiento inválido.");
    return;
  }

  // Marcar movimiento
  room.board[index] = player.symbol;
  room.turn = player.symbol === "X" ? "O" : "X";

  // Verificar ganador
  const winner = checkWinner(room.board);
  if (winner) {
    room.result = winner;
    const gameState = { ...room, nextTurn: room.turn };
    io.to(roomId).emit("game_ended", { game: gameState });
    statsManager.updateStats(player.name);
    delete rooms[roomId];
  } else if (!room.board.includes(null)) {
    room.result = "draw";
    const gameState = { ...room, nextTurn: room.turn };
    io.to(roomId).emit("game_ended", { game: gameState });
    delete rooms[roomId];
  } else {
    const gameState = { ...room, nextTurn: room.turn };
    io.to(roomId).emit("move_made", { game: gameState });
  }
}

function checkWinner(board) {
  const lines = [
    [0,1,2],[3,4,5],[6,7,8], // rows
    [0,3,6],[1,4,7],[2,5,8], // cols
    [0,4,8],[2,4,6]          // diagonals
  ];
  for (let [a,b,c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

module.exports = { createRoom, joinRoom, makeMove };
