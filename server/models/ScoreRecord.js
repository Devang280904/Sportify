const mongoose = require('mongoose');

const scoreRecordSchema = new mongoose.Schema({
  matchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    required: true,
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
  },
  runs: {
    type: Number,
    default: 0,
    min: 0,
  },
  wickets: {
    type: Number,
    default: 0,
    min: 0,
    max: 10,
    validate: {
      validator: function (v) {
        return v >= 0 && v <= 10;
      },
      message: 'Wickets must be between 0 and 10',
    },
  },
  overs: {
    type: Number,
    default: 0,
    min: 0,
    validate: {
      validator: function (v) {
        const decimal = Math.round((v % 1) * 10);
        return decimal <= 5;
      },
      message: 'Invalid overs format. Balls in an over must be 0-5',
    },
  },
  ballByBall: [{
    ballNumber: Number,
    over: Number,
    runs: Number,
    type: {
      type: String,
      enum: ['normal', 'wide', 'no-ball', 'wicket', 'bye', 'leg-bye'],
      default: 'normal',
    },
    description: String,
    timestamp: {
      type: Date,
      default: Date.now,
    },
  }],
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

scoreRecordSchema.index({ matchId: 1 });
scoreRecordSchema.index({ matchId: 1, teamId: 1 });

module.exports = mongoose.model('ScoreRecord', scoreRecordSchema);
