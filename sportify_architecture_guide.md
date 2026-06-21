# Sportify: Architectural Design & Interview Guide

This guide breaks down the core architecture of Sportify, a real-time cricket scoring and tournament management platform built on the MERN stack. Use this guide to deeply understand your system's data flow, design patterns, and edge cases for technical interviews.

---

## SECTION 1: THE ENTITIES & DATABASE SCHEMA (MONGODB / MONGOOSE)

In a highly relational but NoSQL environment, you have separated concerns between Match metadata, Users, Teams, and the actual live Score Record. Here is how they interact and their JSON representations.

### 1. User Schema (Authentication & Hosting)
Manages authentication, passwords (hashed with bcrypt), and lockouts.
```json
{
  "_id": "ObjectId",
  "name": "Admin User",
  "email": "admin@sportify.com",
  "password": "hashed_password_string",
  "failedLoginAttempts": 0,
  "lockedUntil": null,
  "isLoggedIn": true
}
```

### 2. Match Schema (Match Metadata)
Tracks the high-level details of a match. It intentionally does *not* contain the ball-by-ball score to avoid massive document bloat. It only tracks state and associations.
```json
{
  "_id": "ObjectId",
  "tournamentId": "ObjectId(Tournament)",
  "team1Id": "ObjectId(Team_A)",
  "team2Id": "ObjectId(Team_B)",
  "battingTeamId": "ObjectId(Team_A)",
  "status": "live", // 'scheduled', 'live', 'completed'
  "totalOvers": 20,
  "currentInnings": 1,
  "createdBy": "ObjectId(User)",
  "matchDate": "ISODate"
}
```

### 3. Team Schema
Groups players and links to the tournament.
```json
{
  "_id": "ObjectId",
  "teamName": "Mumbai Indians",
  "captainId": "ObjectId(User)",
  "players": ["ObjectId(Player1)", "ObjectId(Player2)"],
  "tournamentIds": ["ObjectId(Tournament1)"]
}
```

### 4. ScoreRecord Schema (The Heavyweight)
This handles the active state of the game, holding current batsmen, bowlers, summary statistics, and the event log.
```json
{
  "_id": "ObjectId",
  "matchId": "ObjectId(Match)",
  "teamId": "ObjectId(Team)",
  "runs": 155,
  "wickets": 3,
  "overs": 18.2,
  "strikerId": "ObjectId(Player1)",
  "nonStrikerId": "ObjectId(Player2)",
  "currentBowlerId": "ObjectId(Player3)",
  "batting": [ 
     // Snapshot of each batsman's performance
     { "playerId": "...", "runs": 45, "ballsFaced": 30, "isOut": false }
  ],
  "bowling": [
     // Snapshot of each bowler's performance
     { "playerId": "...", "oversBowled": 3.2, "runsConceded": 25, "wickets": 1 }
  ],
  "ballByBall": [ ... ] // See Section 2
}
```

---

## SECTION 2: THE "CRICKET TIME-TRAVEL" PROBLEM (HISTORICAL STATE TRACKING)

Interviewer Question: *"How do you know that at over 2.3, the score was 15 runs with 2 wickets, and how do you support 'Undo'?"*

### Pattern 1: The Appended Event Log (Event Sourcing)
Instead of updating a single document, you insert a new document into a `Balls` collection for every single delivery.
- **Pros:** Perfect audit trail, infinite scale. Easy to "replay" the match state by folding events.
- **Cons:** Fetching the "current score" requires aggregating all historical balls or maintaining a separate materialized view, which adds complexity.

### Pattern 2: The Embedded Snapshot Array (Sportify's Approach)
You maintain the "Current State" (runs, wickets, overs) at the root of the `ScoreRecord` document, but you append every ball to an embedded `ballByBall` array inside the same document.

- **Pros:** A single database query returns the exact current score *and* the entire history of the innings. Undo is as simple as `$pop`ping the last ball from the array and reversing its specific runs/wickets from the root state.
- **Cons:** MongoDB documents have a 16MB limit. A T20 innings has ~120 balls, so the array is extremely small and well within safe limits. This is the optimal choice for cricket.

**The `Ball` Snapshot JSON Structure:**
```json
{
  "ballNumber": 3,
  "over": 2,
  "runs": 4,
  "batsmanRuns": 4,
  "extraRuns": 0,
  "type": "normal", // 'normal', 'wide', 'no-ball', 'wicket', 'bye', 'leg-bye'
  "strikerId": "ObjectId",
  "bowlerId": "ObjectId",
  "dismissalType": null, // 'BOWLED', 'CAUGHT', etc.
  "timestamp": "2026-06-18T10:00:00Z"
}
```

---

## SECTION 3: REAL-TIME FLOW & WEBSOCKETS (SOCKET.IO)

How a ball moves from the Admin to 10,000 viewers in milliseconds.

1. **Connection Setup (Rooms):** When a viewer opens the match page, the React client emits `joinMatch(matchId)`. The Node.js server uses `socket.join(\`match:${matchId}\`)`. This creates an isolated pub/sub channel.
2. **The Admin Event:** The admin clicks "4 runs". The React frontend sends an HTTP POST request to `/api/matches/:id/score` with the payload `{ runs: 4, type: 'normal' }`. (Note: We use HTTP POST for actions to leverage standard JWT middleware, rather than raw sockets).
3. **Database vs. Socket Ordering:** 
   - **Crucial Rule:** The backend MUST update MongoDB first. 
   - *Why?* If we emit the socket event first and the DB write fails, thousands of viewers see a score that doesn't exist in the database.
4. **The Broadcast:** Once MongoDB confirms the write, the Express controller triggers the socket instance: `io.to(\`match:${matchId}\`).emit('scoreUpdated', newScoreData)`.
5. **React State Management:** The viewer's React app listens to `scoreUpdated`. Instead of refetching the API or doing a full page reload, it simply calls `setMatchData(newScoreData)`. React's virtual DOM efficiently reconciles the difference, updating only the specific text nodes (e.g., changing "15" to "19") without lag.

---

## SECTION 4: SECURITY & AUTHENTICATION (JWT FLOW)

How we ensure random viewers cannot hijack the match.

1. **Token Generation:** On login, the backend generates a JWT using `jsonwebtoken`. The payload contains `{ id: user._id }` and is signed using `process.env.JWT_SECRET`. 
2. **Transmission:** The token is sent to the client and typically stored in HTTP-Only cookies or LocalStorage, then attached to the `Authorization: Bearer <token>` header on every write request.
3. **Auth Middleware Flow:**
   - A `POST /api/matches/:id/score` request hits the router.
   - The `protect` middleware intercepts it. It extracts the Bearer token and verifies the signature.
   - It fetches the User from MongoDB and attaches `req.user`.
   - The controller then checks: `if (match.createdBy.toString() !== req.user._id.toString()) throw Error("Unauthorized")`. This guarantees only the host can update the score.
4. **Token Expiration:** If the token expires mid-match, the `protect` middleware throws a 401 Unauthorized. The frontend Axios interceptor catches this 401, pauses the request, alerts the user, and redirects to the login screen.

---

## SECTION 5: TOUGH INTERVIEW SCENARIOS & RECOVERY

### 1. Network Disconnection
*What if the admin's internet drops, they click "4" and "Wicket" offline, and then reconnect?*
**Answer:** The frontend should ideally disable scoring buttons if `navigator.onLine` is false or the socket disconnects. If queued offline requests fire upon reconnection, the server must rely on idempotency or strict sequence checking. Currently, Sportify relies on HTTP POST requests, which will simply fail if the network is down, forcing the admin to wait for connection to input the score.

### 2. Concurrency (Two Admins Updating at Once)
*What happens if two authorized admins click "1 run" at the exact same millisecond?*
**Answer:** In Mongoose, doing `const record = await ScoreRecord.findById(); record.runs += 1; await record.save();` causes race conditions. To fix this, you must use atomic operators. We use MongoDB's `$inc` (e.g., `$inc: { runs: 1 }`) and `$push` (for the `ballByBall` array) so the database handles concurrent locks at the row level, ensuring both updates process perfectly sequentially.

### 3. DB Query Optimization
*How do we ensure the live scoreboard is lightning fast when we have 10,000 completed matches in the DB?*
**Answer:** 
- **Indexing:** We add Compound Indexes. Notice in `ScoreRecord.js` we have `scoreRecordSchema.index({ matchId: 1, teamId: 1 })`. This turns an O(N) collection scan into an O(log N) B-Tree lookup.
- **Caching:** We utilize `ioredis`. For complex calculations like Tournament Points Tables (`GET /api/tournaments/:id/points`), computing standings from 50 matches is slow. We calculate it once, cache it in Redis with a TTL, and invalidate the cache only when a match finishes.

---
*Created by Antigravity for technical interview preparation.*
