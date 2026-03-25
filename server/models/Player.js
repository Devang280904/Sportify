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
    enum: ['Right handed', 'Left handed'],
    default: 'Right handed',
  },
  bowlingStyle: {
    type: String,
    enum: ['faster', 'spiner', 'NA'],
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
