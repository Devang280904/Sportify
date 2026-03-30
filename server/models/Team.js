const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  teamName: {
    type: String,
    required: [true, 'Team name is required'],
    trim: true,
    maxlength: 50,
  },
  captainId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  tournamentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true,
  },
  players: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
  }],
  logoURL: {
    type: String,
    default: '',
  },
  playerNumber: {
    type: Number,
    default: 0,
    min: 0,
    max: 11,
  },
}, {
  timestamps: true,
});

teamSchema.index({ tournamentId: 1 });

module.exports = mongoose.model('Team', teamSchema);
