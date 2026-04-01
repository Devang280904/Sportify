const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    require('./models/User');
    require('./models/Tournament');
    const Match = require('./models/Match');
    const matches = await Match.find().populate('createdBy', 'name').populate({ path: 'tournamentId', select: 'name', populate: { path: 'organizerId', select: 'name' } });
    console.log(JSON.stringify(matches.map(m => ({
      id: m._id,
      createdBy: m.createdBy,
      tournament: m.tournamentId
    })), null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
