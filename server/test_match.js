const mongoose = require('mongoose');
const Match = require('./models/Match');
const Team = require('./models/Team');
const Tournament = require('./models/Tournament');
const ScoreRecord = require('./models/ScoreRecord');
require('dotenv').config();

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');

  // get a tournament
  const t = await Tournament.findOne();
  if(!t) return console.log('No tournament found');

  const teams = await Team.find({ tournamentId: t._id }).limit(2);
  if (teams.length < 2) return console.log('Not enough teams');

  console.log('Creating Match 2 between', teams[0].teamName, 'and', teams[1].teamName);

  try {
    const m = await Match.create({
      tournamentId: t._id,
      team1Id: teams[0]._id,
      team2Id: teams[1]._id,
      matchDate: new Date(Date.now() + 100000),
      venue: 'Test Venue',
      totalOvers: 5
    });
    console.log('Match successfully created', m._id);

    await ScoreRecord.create({ matchId: m._id, teamId: teams[0]._id });
    await ScoreRecord.create({ matchId: m._id, teamId: teams[1]._id });
    console.log('ScoreRecords created');

  } catch(e) {
    console.error('ERROR:', e.message);
  }

  process.exit();
}
test();
