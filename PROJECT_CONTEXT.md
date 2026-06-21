# 🏏 Sportify: Project Context

Sportify is a professional real-time cricket scoring and tournament management platform. It features a complete end-to-end workflow for managing teams, players, tournaments, and live ball-by-ball scoring with instant synchronization via WebSockets.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React (Vite), TailwindCSS, Socket.io-client, Recharts |
| **Backend** | Node.js, Express.js, MongoDB (Mongoose), Redis (ioredis) |
| **Real-time** | Socket.io (Rooms & Events) |
| **Auth** | JWT, bcryptjs |
| **Others** | Axios, Canvas-Confetti, Nodemailer |

---

## 📁 Directory Structure

```text
sportify/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components (MatchGraphs, ProtectedRoute, etc.)
│   │   ├── context/        # AuthContext, SocketContext
│   │   ├── pages/          # 16+ pages (LiveScoring, MatchViewer, TournamentDetail, etc.)
│   │   ├── services/       # API communication logic
│   │   └── App.jsx         # Routing configuration
│   └── tailwind.config.js
├── server/                 # Node.js Backend
│   ├── config/             # DB & Redis connection logic
│   ├── controllers/        # Business logic (Score, Match, Team, Tournament, Auth)
│   ├── middlewares/        # Auth & Rate Limiting
│   ├── models/             # Mongoose Schemas (Match, ScoreRecord, Team, Player, etc.)
│   ├── routes/             # API Endpoint definitions
│   ├── sockets/            # Socket.io event handlers (scoreSocket.js)
│   └── server.js           # Server entry point & Socket initialization
└── README.md               # Project overview & Setup instructions
```

---

## 🏗️ Architecture & Core Logic

### 1. Real-Time Scoring System
- **WebSockets**: Uses Socket.io "rooms" partitioned by match ID (`match:${matchId}`).
- **State Sync**: Every ball update (`scoreController.updateScore`) triggers a `scoreUpdated` event to the match room.
- **Scoring Engine**: Logic in `scoreController.js` handles:
  - Run calculation (including extras like Wide/No-ball).
  - Bowler over limits (calculated as `match.totalOvers / 5`).
  - Batsman strike rotation (on odd runs or end of over).
  - Wicket handling & Innings swapping.

### 2. Data Models (Mongoose)
- **Match**: Tracks status (`scheduled`, `live`, `completed`), teams, scores, tournament association, and results.
- **ScoreRecord**: Deeply nested schema storing `ballByBall` arrays (timestamp, ball#, over#, runs, type, etc.) and per-player statistics for that specific match.
- **Player**: Global statistics aggregator across all matches.
- **Team**: Collection of players with metadata.
- **Tournament**: Grouping of matches and teams with a points table.

### 3. API Endpoints
- `POST /api/matches/:id/score`: The heartbeat of the app. Processes one ball at a time.
- `POST /api/matches/:id/undo`: Reverses the last ball, correctly reverting all batsman/bowler/team stats.
- `POST /api/matches/:id/swap-innings`: Transitions from 1st to 2nd innings with validation on completed overs.
- `GET /api/tournaments/:id/points`: Dynamically calculates standings with caching (Redis).

---

## 🚀 Key Features for AI Reference
- **No Page Refreshes**: The app is built to be a live dashboard.
- **Automatic Completeness**: The scoring engine auto-detects match victory during the 2nd innings (chase successful or all out).
- **Strict Validations**: Prevents double-scheduling teams, prevents out-batsmen from coming back, and enforces bowler limits.
- **Rich Visuals**: Uses Recharts for run-rate graphs and Canvas-Confetti for victory celebrations.

---

## 🔧 Setup & Development
1. **Backend**: `cd server && npm run dev` (Runs on port 5001).
2. **Frontend**: `cd client && npm run dev` (Runs on port 5173).
3. **Environment**: Requires `MONGO_URI`, `REDIS_URL`, and `JWT_SECRET`.

---

*This document is generated to provide structural and logical context for AI assistants working on the Sportify codebase.*
