/**
 * One-time migration script to fix "won by X wickets" result messages
 * that were calculated as (playersPerTeam - wickets) instead of
 * the correct (playersPerTeam - 1 - wickets).
 *
 * Run with: node fix_wicket_messages.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;

// ---- Minimal inline schemas (avoids circular require issues) ----
const ScoreRecordSchema = new mongoose.Schema({
  matchId: mongoose.Schema.Types.ObjectId,
  teamId:  mongoose.Schema.Types.ObjectId,
  runs:    Number,
  wickets: Number,
  overs:   Number,
  ballByBall: Array,
});

const MatchSchema = new mongoose.Schema({
  team1Id:       { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  team2Id:       { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  winnerId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  battingTeamId: mongoose.Schema.Types.ObjectId,
  currentInnings: Number,
  playersPerTeam: Number,
  status:        String,
  resultMessage: String,
});

const TeamSchema = new mongoose.Schema({ teamName: String });

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const Match       = mongoose.model('Match',       MatchSchema);
  const ScoreRecord = mongoose.model('ScoreRecord', ScoreRecordSchema);
  const Team        = mongoose.model('Team',        TeamSchema);

  // Find every completed match whose resultMessage contains "won by \d+ wickets"
  const badMatches = await Match.find({
    status: 'completed',
    resultMessage: /won by \d+ wickets/i,
  }).lean();

  console.log(`Found ${badMatches.length} match(es) to check.\n`);

  let fixed = 0;

  for (const match of badMatches) {
    // We only need to fix "wickets" wins — those happen during a chase (innings 2)
    // where the chasing team's wickets_fallen is what matters.
    const scores = await ScoreRecord.find({ matchId: match._id }).lean();
    if (!scores.length) continue;

    // Identify the winning team's score record
    const winningRecord = scores.find(
      s => s.teamId.toString() === (match.winnerId || '').toString()
    );

    if (!winningRecord) continue;

    const playersPerTeam = match.playersPerTeam || 11;
    const correctWickets = (playersPerTeam - 1) - winningRecord.wickets;

    // Fetch team name for the message
    const winningTeam = await Team.findById(match.winnerId).lean();
    const teamName = winningTeam?.teamName || 'Winner';

    const correctMessage = `${teamName} won by ${correctWickets} wickets`;

    if (match.resultMessage === correctMessage) {
      console.log(`  [SKIP]  ${match._id} — already correct: "${match.resultMessage}"`);
      continue;
    }

    await Match.updateOne(
      { _id: match._id },
      { $set: { resultMessage: correctMessage } }
    );

    console.log(`  [FIXED] ${match._id}`);
    console.log(`          Before: "${match.resultMessage}"`);
    console.log(`          After:  "${correctMessage}"\n`);
    fixed++;
  }

  console.log(`\nDone. Fixed ${fixed} / ${badMatches.length} match(es).`);
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
