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
  tournamentIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
  }],
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

teamSchema.index({ tournamentIds: 1 });
teamSchema.index({ createdBy: 1, teamName: 1 }, { unique: true });

module.exports = mongoose.model('Team', teamSchema);
