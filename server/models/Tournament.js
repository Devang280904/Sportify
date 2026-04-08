const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tournament name is required'],
    trim: true,
    maxlength: 100,
  },
  organizerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required'],
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required'],
    validate: {
      validator: function (value) {
        return value >= this.startDate;
      },
      message: 'End date must be after start date',
    },
  },
  playersPerTeam: {
    type: Number,
    required: [true, 'Players per team is required'],
    default: 11,
    min: 2,
    max: 22,
  },
  defaultOvers: {
    type: Number,
    required: [true, 'Default overs is required'],
    default: 20,
    min: 1,
  },
  status: {
    type: String,
    enum: ['upcoming', 'ongoing', 'completed'],
    default: 'upcoming',
  },
  teams: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
  }],
}, {
  timestamps: true,
});

tournamentSchema.index({ organizerId: 1 });

module.exports = mongoose.model('Tournament', tournamentSchema);
