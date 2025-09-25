# TicTacToe Full-Stack (Demo)

## Estructura
- `backend/` — servidor Node.js + TypeScript + Socket.IO
- `frontend/` — cliente React + Vite + TypeScript

## Requisitos
- Node 18+
- npm
- (Opcional) Docker y docker-compose

## Desarrollo local (sin Docker)
1. Backend
  cd backend
  npm install
  npm run dev
  -> servidor escucha en http://localhost:4000

2. Frontend
  cd frontend
  npm install
  npm run dev
  -> cliente en http://localhost:5173

## Con Docker (dev mode)
docker-compose up --build

## Eventos Socket.IO (principales)
- `create_room` { userId } -> crea sala
- `join_room` { roomId, userId } -> unirse
- `start_game` { roomId } -> iniciar
- `make_move` { gameId, userId, pos } -> mover
- Eventos recibidos: `room_created`, `room_updated`, `game_started`, `move_made`, `game_ended`

