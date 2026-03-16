const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Player name is required'],
    trim: true,
    maxlength: 50,
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
  },
  role: {
    type: String,
    enum: ['batsman', 'bowler', 'allrounder', 'wicketkeeper'],
    required: true,
  },
  battingStyle: {
    type: String,
    enum: ['right-hand', 'left-hand'],
    default: 'right-hand',
  },
  bowlingStyle: {
    type: String,
    enum: ['pace', 'spin', 'NA'],
    default: 'NA',
  },
  totalRuns: { type: Number, default: 0 },
  totalWickets: { type: Number, default: 0 },
  matchesPlayed: { type: Number, default: 0 },
  ballsFaced: { type: Number, default: 0 },
  runsConceded: { type: Number, default: 0 },
  catches: { type: Number, default: 0 },
  strikeRate: { type: Number, default: 0 },
  economy: { type: Number, default: 0 },
}, {
  timestamps: true,
});

playerSchema.index({ teamId: 1 });

module.exports = mongoose.model('Player', playerSchema);
