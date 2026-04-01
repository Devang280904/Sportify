const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  tournamentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
  },
  playersPerTeam: {
    type: Number,
    required: [true, 'Players per team is required'],
    default: 11,
    min: 2,
    max: 11,
  },
  team1Id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
  },
  team2Id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
  },
  matchDate: {
    type: Date,
    required: [true, 'Match date is required'],
  },
  venue: {
    type: String,
    required: [true, 'Venue is required'],
    trim: true,
  },
  status: {
    type: String,
    enum: ['scheduled', 'live', 'completed'],
    default: 'scheduled',
  },
  winnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null,
  },
  resultMessage: {
    type: String,
    default: null,
  },
  battingTeamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null,
  },
  totalOvers: {
    type: Number,
    default: 20,
  },
  currentInnings: {
    type: Number,
    default: 1,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  startTime: {
    type: Date,
    default: null,
  },
  endTime: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

matchSchema.index({ tournamentId: 1 });
matchSchema.index({ matchDate: 1 });

matchSchema.pre('validate', function (next) {
  if (this.team1Id && this.team2Id && this.team1Id.toString() === this.team2Id.toString()) {
    return next(new Error('Team1 and Team2 cannot be the same'));
  }
  next();
});

module.exports = mongoose.model('Match', matchSchema);
