<div align="center">
  <h1>🏏 SPORTIFY</h1>
  <p><strong>A Professional Real-Time Cricket Scoring & Tournament Management Platform</strong></p>

  <p>
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white" alt="Node" />
    <img src="https://img.shields.io/badge/Express.js-404D59?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
    <img src="https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
    <img src="https://img.shields.io/badge/Socket.io-black?style=for-the-badge&logo=socket.io&badgeColor=010101" alt="Socket.io" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind" />
  </p>
</div>

<hr />

## 🌟 Overview

**Sportify** is a fully-featured, premium cricket tournament and live scoring application. Built to eliminate the need for manual page refreshes, it leverages robust WebSockets to provide seamless, real-time match state synchronization across all client views. Whether you are managing complex tournaments, creating independent matches, or tracking ball-by-ball timelines, Sportify delivers a professional, glitch-free sports app experience.

## ✨ Key Features

- **🔴 Real-Time Live Scoring**: Instant, synchronized updates using WebSockets for ball-by-ball timelines, score changes, and innings swaps.
- **🏆 Tournament Management**: Comprehensive workflows to create, manage, and track cricket tournaments.
- **🏏 Match & Team Independence**: Decoupled architecture allowing for both tournament-bound and independent matches and teams.
- **📊 Detailed Match Summaries**: Professional match scorecards supporting scheduled, live, and completed matches natively.
- **⚖️ Strict Match Validations**: Active enforcement of bowler over-limits, batsman-out status, and batting team transitions to ensure 100% accurate statistics.
- **🔐 Secure Authentication & Access**: JWT-based authentication with strict ownership and permission controls for matches, teams, and tournaments.
- **🎨 Premium UI/UX**: A beautiful, dark-themed (`primary-dark`) sleek interface tailored for a high-end modern sports aesthetic with full responsiveness.

---

## 🛠️ Technology Stack

### Frontend Architecture
- **React.js (Vite)** for lightning-fast performance and component architecture
- **TailwindCSS** for utility-first, modern responsive styling
- **Socket.io-client** for instant real-time reactivity
- **Canvas-Confetti** for interactive, native victory celebrations

### Backend Architecture
- **Node.js & Express.js** for robust API scaling
- **MongoDB & Mongoose** for flexible, highly-relational data modeling
- **Socket.io** for bridging real-time concurrent communication instances
- **Redis (ioredis)** for efficient caching mechanisms & rate-limiting layers
- **JWT & bcryptjs** for cryptographic authentication and session control

---

## 🚀 Getting Started

Follow these steps to set up the project locally.

### Prerequisites

- [Node.js](https://nodejs.org/en/) (v16 or higher recommended)
- [MongoDB](https://www.mongodb.com/) (Local installation or MongoDB Atlas cluster)
- [Redis](https://redis.io/) (for caching, optional but highly recommended)

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/sportify.git
cd sportify
```

### 2. Backend Setup
Navigate to the server directory and install dependencies:
```bash
cd server
npm install
```
Create a `.env` file in the `server` directory and add the necessary environment variables:

Start the backend server in development mode:
```bash
npm run dev
```

### 3. Frontend Setup
Open a new terminal session, navigate to the client directory, and install dependencies:
```bash
cd client
npm install
```
Start the frontend development server (Vite):
```bash
npm run dev
```

---

## 🤝 Contributing
Contributions, active issues, and targeted feature requests are welcome! Feel free to check the repository issues page to start contributing.


<br />

<div align="center">
  <b>Built with ❤️ for Cricket Enthusiasts and Web Developers</b>
</div>
