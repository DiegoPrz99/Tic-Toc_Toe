import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import Board from './components/Board';

const SERVER = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

type GameState = any;

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [roomId, setRoomId] = useState<string>('');
  const [game, setGame] = useState<GameState | null>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [mySymbol, setMySymbol] = useState<string | null>(null);

  // Estadísticas
  const [ranking, setRanking] = useState<any[]>([]);
  const [partidas, setPartidas] = useState<any[]>([]);

  // ------------------ Helpers ------------------
  function createUserIfEmpty(): string {
    if (userId) return userId;
    const newId = 'u_' + Math.random().toString(36).slice(2, 9);
    setUserId(newId);
    return newId;
  }

  async function fetchRooms() {
    try {
      const res = await fetch(`${SERVER}/rooms`);
      const data = await res.json();
      setRooms(data);
    } catch (err) {
      console.warn('No se pudo traer rooms', err);
    }
  }

  async function fetchStats() {
    try {
      const r1 = await fetch(`${SERVER}/stats/ranking`);
      setRanking(await r1.json());

      const r2 = await fetch(`${SERVER}/stats/partidas`);
      setPartidas(await r2.json());
    } catch (err) {
      console.warn("No se pudo traer estadísticas", err);
    }
  }

  // ------------------ useEffects ------------------
  useEffect(() => {
    const s = io(SERVER);
    setSocket(s);

    s.on('connect', () => console.log('connected', s.id));

    const handleRoomCreated = (r: any) => {
      if (r?.symbol) setMySymbol(r.symbol);
      if (r?.roomId) setRoomId(r.roomId);
      fetchRooms();
    };
    s.on('room_created', handleRoomCreated);
    s.on('roomCreated', handleRoomCreated);

    const handleRoomJoined = (r: any) => {
      if (r?.symbol) setMySymbol(r.symbol);
      if (r?.roomId) setRoomId(r.roomId);
      fetchRooms();
    };
    s.on('room_joined', handleRoomJoined);
    s.on('roomJoined', handleRoomJoined);

    const setGameFromPayload = (payload: any) => {
      const g = payload?.game ?? payload;
      if (!g) return;
      if (g.turn && !g.nextTurn) g.nextTurn = g.turn;
      setGame(g);
      if (g.roomId) setRoomId(g.roomId);
    };

    s.on('game_started', setGameFromPayload);
    s.on('gameStarted', setGameFromPayload);
    s.on('move_made', (p: any) => setGameFromPayload(p));
    s.on('moveMade', (p: any) => setGameFromPayload(p));

    s.on('game_ended', (p: any) => {
      setGameFromPayload(p);
      const g = p?.game ?? p;
      alert('Partida finalizada: ' + (g?.result ?? g?.winner ?? '—'));
      fetchStats();
    });
    s.on('gameEnded', (p: any) => {
      setGameFromPayload(p);
      const g = p?.game ?? p;
      alert('Partida finalizada: ' + (g?.result ?? g?.winner ?? '—'));
      fetchStats();
    });

    s.on('errorMessage', (msg: string) => console.warn('server error:', msg));

    return () => {
      s.disconnect();
    };
  }, []); 

  useEffect(() => {
    fetchRooms();
    fetchStats();

    const interval = setInterval(() => {
      fetchRooms();
      fetchStats();
    }, 10000); // 10000 ms = 10 segundos
  
    // Limpiar el intervalo al desmontar
    return () => clearInterval(interval);
  }, []);

  // ------------------ Handlers ------------------
  function handleCreateRoom() {
    const uid = createUserIfEmpty();
    socket?.emit('create_room', { userId: uid }, (ack: any) => {
      if (ack && ack.ok) {
        if (ack.roomId) setRoomId(ack.roomId);
        if (ack.symbol) setMySymbol(ack.symbol);
      }
      fetchRooms();
    });
  }

  function handleJoin(roomIdToJoin: string) {
    const uid = createUserIfEmpty();
    socket?.emit('join_room', { roomId: roomIdToJoin, userId: uid }, (ack: any) => {
      if (ack && ack.ok) {
        setRoomId(roomIdToJoin);
        if (ack.symbol) setMySymbol(ack.symbol);
        fetchRooms();
      } else {
        alert('No se pudo unir: ' + (ack?.reason ?? JSON.stringify(ack)));
      }
    });
  }

  function handleStart() {
    if (!roomId) return alert('No room');
    socket?.emit('start_game', { roomId }, (ack: any) => {
      if (ack && !ack.ok) alert('No se pudo iniciar: ' + ack.reason);
      if (ack && ack.game) setGame(ack.game);
    });
  }

  function handleDeleteRoom(roomIdToDelete: string) {
    if (!socket) return;
    socket.emit('delete_room', { roomId: roomIdToDelete, userId }, (ack: any) => {
      if (ack && ack.ok) {
        if (roomId === roomIdToDelete) {
          setRoomId('');
          setGame(null);
          setMySymbol(null);
        }
        fetchRooms();
      } else {
        alert('No se pudo eliminar la sala: ' + (ack?.reason ?? 'error desconocido'));
      }
    });
  }

  function handleMakeMove(pos: number) {
    if (!game) return;
    if (!mySymbol) {
      alert('Esperando asignación de símbolo.');
      return;
    }
    if (game.nextTurn !== mySymbol) {
      alert('⏳ No es tu turno.');
      return;
    }

    socket?.emit('make_move', { gameId: game.id, userId, pos }, (ack: any) => {
      if (!ack?.ok) {
        alert('Movimiento inválido: ' + (ack?.reason ?? 'sin detalle'));
      }
    });
  }

  // ------------------ Render ------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-800 to-pink-700 text-white flex flex-col">
      <header className="p-4 text-center bg-black/30 backdrop-blur-md shadow-lg">
        <h1 className="text-3xl font-bold tracking-wider">🎮 Tic-Tac-Toe Online</h1>
        <p className="text-sm opacity-80">Juega con tus amigos en tiempo real</p>
      </header>
  
      <main className="flex flex-col md:flex-row flex-1 p-4 gap-6">
        {/* Lobby */}
        <div className="w-full md:w-1/3 bg-black/40 rounded-2xl p-4 shadow-lg">
          <h3 className="text-xl font-semibold mb-3">🏠 Lobby</h3>
  
          <div className="flex items-center gap-2 mb-4">
            <input
              value={userId}
              onChange={e => setUserId(e.target.value)}
              placeholder="Tu nombre"
              className="flex-1 px-3 py-2 rounded-md text-black"
            />
            <button
              onClick={() => createUserIfEmpty()}
              className="bg-indigo-600 hover:bg-indigo-700 px-3 py-2 rounded-md"
            >
              Generar ID
            </button>
          </div>
  
          <div className="flex gap-2 mb-3">
            <button
              onClick={handleCreateRoom}
              className="flex-1 bg-green-600 hover:bg-green-700 px-3 py-2 rounded-md"
            >
              Crear sala
            </button>
            <button
              onClick={fetchRooms}
              className="flex-1 bg-yellow-500 hover:bg-yellow-600 px-3 py-2 rounded-md"
            >
              Refrescar
            </button>
          </div>
  
          <ul className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-purple-500">
            {rooms.map(r => (
              <li
                key={r.id}
                className="flex justify-between items-center bg-white/10 rounded-md px-3 py-2"
              >
                <div>
                  <p className="text-sm font-mono">{r.id}</p>
                  <p className="text-xs opacity-80">
                    {r.players?.length || 0} jugadores — {r.status}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleJoin(r.id)}
                    className="bg-blue-500 hover:bg-blue-600 px-2 py-1 rounded text-sm"
                  >
                    Unirse
                  </button>
                  {r.ownerId === userId && (
                    <button
                      onClick={() => handleDeleteRoom(r.id)}
                      className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-sm"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
  
        {/* Juego */}
        <div className="flex-1 bg-black/40 rounded-2xl p-4 shadow-lg">
          <h3 className="text-xl font-semibold mb-3">🎲 Sala / Juego</h3>
          <p className="mb-2">RoomId: <span className="font-mono">{roomId}</span></p>
          <button
            onClick={handleStart}
            className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-md mb-4"
          >
            Iniciar juego (2 jugadores)
          </button>
  
          {game ? (
            <div className="space-y-2">
                <p className="bg-white/10 px-3 py-1 rounded-md shadow-sm font-mono text-sm">
                  <span className="text-purple-400 font-semibold">Game:</span> {game.id} — 
                  <span className="text-green-400 font-semibold"> Resultado:</span> {game.result ?? "—"}
                </p>

                <p className="bg-white/10 px-3 py-1 rounded-md shadow-sm font-mono text-sm">
                  <span className="text-purple-400 font-semibold">Turno:</span> {game.nextTurn}
                </p>

                <p className="bg-white/10 px-3 py-1 rounded-md shadow-sm font-mono text-sm">
                  <span className="text-purple-400 font-semibold">Tu símbolo:</span> {mySymbol ?? "—"}
                </p>
  
              <div className="flex justify-center mt-4">
                <Board
                  board={game.board}
                  onCellClick={(pos: number) => handleMakeMove(pos)}
                  disabled={game.nextTurn !== mySymbol}
                />
              </div>
            </div>
          ) : (
            <p className="opacity-70">No hay juego activo</p>
          )}
        </div>

        {/* Estadísticas */}
        <div className="w-full md:w-1/3 bg-black/40 rounded-2xl p-4 shadow-lg overflow-y-auto">
          <h3 className="text-xl font-semibold mb-3">📊 Estadísticas</h3>

          {/* Ranking */}
          <h4 className="font-semibold text-lg mb-2">🏆 Ranking</h4>
          <table className="w-full text-sm mb-4">
            <thead>
              <tr className="text-left opacity-70">
                <th className="p-1">Jugador</th>
                <th className="p-1">PJ</th>
                <th className="p-1">G</th>
                <th className="p-1">P</th>
                <th className="p-1">E</th>
                <th className="p-1">WR%</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((r, i) => (
                <tr key={r.id} className={i % 2 ? "bg-white/5" : ""}>
                  <td className="p-1">{r.nombre}</td>
                  <td className="p-1">{r.partidas_jugadas}</td>
                  <td className="p-1">{r.partidas_ganadas}</td>
                  <td className="p-1">{r.partidas_perdidas}</td>
                  <td className="p-1">{r.partidas_empatadas}</td>
                  <td className="p-1">{r.win_rate}%</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Últimas partidas */}
          <h4 className="font-semibold text-lg mb-2">⏱ Últimas partidas</h4>
          <ul className="space-y-1 text-sm">
            {partidas.map((p) => (
              <li key={p.id} className="bg-white/5 rounded-md p-2">
                {p.jugador1} vs {p.jugador2} → {p.resultado} <br />
                <span className="opacity-60 text-xs">{new Date(p.fecha).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      </main>
  
      <footer className="p-3 text-center text-xs bg-black/30">
        © {new Date().getFullYear()} Tic-Tac-Toe Online
      </footer>
    </div>
  );  
}
