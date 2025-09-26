# TicTacToe Full-Stack (Demo)

## Estructura
- `backend/` — servidor Node.js + TypeScript + Socket.IO
- `frontend/` — cliente React + Vite + TypeScript

## Requisitos
- Node 20
- npm
- (Opcional) Docker y docker-compose

## Desarrollo local (sin Docker)
1. Backend
```bash
  cd backend
  npm install
  npm run dev
```
  -> servidor escucha en http://localhost:4000

2. Frontend
```bash
  cd frontend
  npm install
  npm run dev
```
  -> cliente en http://localhost:5173

## Con Docker (dev mode)
docker-compose up --build

## Desarrollo Desplegado

1. Frontend -> https://tic-toc-toe-amber.vercel.app/
2. Backend -> https://tic-toc-toe-pjmy.onrender.com
3. Base de datos -> Desplegada con Render

## Eventos Socket.IO (principales)
- `create_room` { userId } -> crea sala
- `join_room` { roomId, userId } -> unirse
- `start_game` { roomId } -> iniciar
- `make_move` { gameId, userId, pos } -> mover
- Eventos recibidos: `room_created`, `room_updated`, `game_started`, `move_made`, `game_ended`

