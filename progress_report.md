# Project Progress Report: Sportify

## 1. Project Overview
- **Project Title:** Sportify - Real-time Cricket Scoring Platform
- **Team Members:**
    1. Devang (Project Leader)
    2. Member 2 
    3. Member 3
    4. Member 4
    5. Member 5
- **Objectives:**
    - Provide a robust, real-time platform for managing cricket matches and tournaments.
    - Implement a strike-rotation logic and live scoring system for accurate ball-by-ball updates.
    - Enable CSV-based bulk player and team uploads for ease of management.
    - Ensure secure user authentication and personalized dashboards.
- **Current Phase of SDLC:** **Implementation Phase** (Transitioning into Integration and Beta Testing).

## 2. Work Completed So Far
The following modules have been successfully developed and integrated:
- **User Authentication:** Secure JWT-based registration, login, and password reset functionality.
- **Team Management:** Full CRUD operations for teams, including player associations.
- **Tournament Module:** Framework for creating and tracking multi-match tournaments.
- **Match Management:** Ability to create matches, select toss winners, and set match parameters.
- **Core Database Schema:** Scalable MongoDB models for Users, Teams, Matches, Players, and ScoreRecords.
- **Real-time Infrastructure:** Socket.io integration on the server to handle live score broadcasts.

## 3. Work in Progress
- **Live Scoring Interface:** Refining the ball-by-ball input UI to handle extras (wides, no-balls) and wicket types more intuitively.
- **Automated Strike Rotation:** Completing the logic that automatically switches strikers based on runs scored or end-of-over.
- **Dashboard Visualizations:** Developing charts and statistics for user profiles to show match history and player performance.
- **Expected Completion Timeline:** Phase 1 (Core Features) - 10 days; Phase 2 (Enhancements & Analytics) - 14 days.

## 4. Future Plan
- **Tasks for next two weeks:**
    - Complete the "All-Out" state logic (preventing further scoring after 10 wickets).
    - Implement real-time points table updates for tournaments.
    - Optimize mobile responsiveness for the live scoring page.
    - Conduct end-to-end integration testing between the Socket.io server and React client.
- **Challenges and Issues:**
    - **Caching:** Managing Redis cache consistency for live matches during high concurrency.
    - **API Limits:** Handling fallback data when external cricket data APIs are unavailable.

## 5. Individual Contribution & Supporting Evidence

### [Devang (Project Leader)]
- **Contribution:** Backend Architecture, Core Routing, and Database Design.
- **Details:** Designed the normalized MongoDB schema and implemented the robust Authentication system (JWT + Bcrypt). Integrated Redis for session management and performance.
- **Logic/Pseudo-code:**
  ```javascript
  // Security-First Authentication Flow
  async function handleUserLogin(credentials) {
    const user = await User.findOne({ email: credentials.email });
    if (user && await bcrypt.compare(credentials.password, user.password)) {
      const token = jwt.sign({ id: user._id }, SECRET, { expiresIn: '24h' });
      return { success: true, token };
    }
    throw new Error('Invalid Credentials');
  }
  ```

### [Member 2]
- **Contribution:** Frontend UI/UX & Responsive Layouts.
- **Details:** Developed the primary Dashboard, Sidebar, and Navbar components using React and Tailwind CSS. Ensured a premium, glassmorphism-based aesthetic across all pages.
- **Logic/Pseudo-code:**
  ```javascript
  // Dynamic Side Navigation for Seamless UX
  const Sidebar = ({ isCollapsed }) => {
    const activeStyle = "bg-primary text-white shadow-lg shadow-primary/50";
    return (
      <nav className={`h-screen transition-width ${isCollapsed ? 'w-20' : 'w-64'}`}>
        {menuItems.map(item => (
          <NavLink to={item.path} className={({isActive}) => isActive ? activeStyle : ""}>
            <Icon name={item.icon} /> {!isCollapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>
    );
  }
  ```

### [Member 3]
- **Contribution:** Tournament & Match Management Logic.
- **Details:** Implemented controllers and routes for managing matches and tournaments. Handled complex logic for match summaries and state transitions.
- **Logic/Pseudo-code:**
  ```javascript
  // Match Life-cycle State Machine
  const transitionMatchState = async (matchId, action) => {
    let match = await Match.findById(matchId);
    switch(action.type) {
      case 'START_MATCH': match.status = 'LIVE'; break;
      case 'INNINGS_COMPLETE': match.status = 'BREAK'; break;
      case 'WICKET': if (match.wickets === 10) match.status = 'COMPLETED'; break;
    }
    await match.save();
  }
  ```

### [Member 4]
- **Contribution:** Live Scoring Engine & Real-time Sockets.
- **Details:** Developed the frontend Live Scoring page and the backend `scoreController`. Integrated Socket.io for instantaneous score updates across multiple viewers.
- **Logic/Pseudo-code:**
  ```javascript
  // Strike Rotation and Score Broadcasting Logic
  function processDelivery(runs, isExtra) {
    let { striker, nonStriker } = currentMatchState;
    if (runs % 2 !== 0) [striker, nonStriker] = [nonStriker, striker];
    
    const update = { runs, striker, nonStriker, timestamp: Date.now() };
    socket.emit('broadcastScore', update); // Real-time push to all viewers
  }
  ```

### [Member 5]
- **Contribution:** Utilities, Documentation & Data Services.
- **Details:** Implemented the CSV upload service for bulk player data. Set up the email notification system and conducted unit testing for core utility functions.
- **Logic/Pseudo-code:**
  ```javascript
  // Bulk Data Ingestion and Validation
  async function ingestTeamData(csvFile) {
    const players = await csvParser.parse(csvFile);
    const validData = players.filter(p => validateSchema(p, PlayerModel));
    
    // Transactional save to ensure data integrity
    const session = await mongoose.startSession();
    await session.withTransaction(() => Player.insertMany(validData));
  }
  ```

---
*Note: Please replace placeholders (Member 2-5) with actual names and add screenshots of the respective pages as requested by the professor.*
