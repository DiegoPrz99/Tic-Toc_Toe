# Tic-Tac-Toe Full-Stack (Demo)

## 1. Descripción del Proyecto

- Juego de triqui (tic-tac-toe) en tiempo real.  
- Backend con **Node.js + Express + Socket.IO**.  
- Frontend con **React + Vite**.  
- Base de datos **PostgreSQL** con persistencia de jugadores y partidas.  

---

## 2. Tecnologías Utilizadas
- **Frontend:** React + Vite + TypeScript  
- **Backend:** Node.js + Express + Socket.IO  
- **Base de datos:** PostgreSQL  
- **Infraestructura:** Docker + Docker Compose (para desarrollo local)  
- **Despliegue:** Render (para backend + DB) y Vercel para el Frontend

---

## Estructura
- `backend/` — servidor Node.js + TypeScript + Socket.IO
- `frontend/` — cliente React + Vite + TypeScript

---

## Requisitos
- Node 20
- npm
- (Opcional) Docker y docker-compose

---

## Desarrollo local (sin Docker)

- Clonar el repositorio
```bash
  git clone https://github.com/DiegoPrz99/Tic-Toc_Toe.git
```

1. Backend
```bash
  cd backend
  npm install
  npm run dev
```
  -> servidor escucha en http://localhost:4000

1. Frontend
```bash
  cd frontend
  npm install
  npm run dev
```
  -> cliente en http://localhost:5173

## Con Docker (dev mode)
docker-compose up --build

---

## Desarrollo Desplegado

1. Frontend -> https://tic-toc-toe-amber.vercel.app/
2. Backend -> https://tic-toc-toe-pjmy.onrender.com
3. Base de datos -> PostgreSQL gestionada en Render

---

## Eventos Socket.IO (principales)
- `create_room` { userId } -> crea sala
- `join_room` { roomId, userId } -> unirse
- `start_game` { roomId } -> iniciar
- `make_move` { gameId, userId, pos } -> mover
- Eventos recibidos: `room_created`, `room_updated`, `game_started`, `move_made`, `game_ended`

