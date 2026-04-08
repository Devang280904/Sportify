require('dotenv').config();
const mongoose = require('mongoose');
const Tournament = require('./models/Tournament');
const User = require('./models/User');

const test = async () => {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!uri) {
      console.error('MONGO_URI is missing in .env');
      process.exit(1);
    }
    await mongoose.connect(uri);
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
    console.error('Test failed:', err.message);
    if (err.errors) {
      console.error('Validation errors:', Object.keys(err.errors).map(k => `${k}: ${err.errors[k].message}`));
    }
    process.exit(1);
  }
};

test();
