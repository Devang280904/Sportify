require('dotenv').config();
const mongoose = require('mongoose');
const Tournament = require('./server/models/Tournament');
const User = require('./server/models/User');

const test = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    const user = await User.findOne();
    if (!user) {
      console.log('No user found');
      return;
    }

    const today = new Date();
    today.setHours(0,0,0,0);

    const tour = await Tournament.create({
      name: 'Test Tournament',
      startDate: today,
      endDate: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000),
      organizerId: user._id,
      playersPerTeam: 11
    });

    console.log('Tournament created:', tour._id);
    await Tournament.findByIdAndDelete(tour._id);
    console.log('Test successful');
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
};

test();
