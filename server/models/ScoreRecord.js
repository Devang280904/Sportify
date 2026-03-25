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
  // Current batsmen on crease
  strikerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    default: null,
  },
  nonStrikerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    default: null,
  },
  // Current bowler
  currentBowlerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    default: null,
  },
  // Per-batsman stats
  batting: [{
    playerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
    },
    playerName: String,
    runs: { type: Number, default: 0 },
    ballsFaced: { type: Number, default: 0 },
    fours: { type: Number, default: 0 },
    sixes: { type: Number, default: 0 },
    isOut: { type: Boolean, default: false },
    strikeRate: { type: Number, default: 0 },
  }],
  // Per-bowler stats
  bowling: [{
    playerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
    },
    playerName: String,
    oversBowled: { type: Number, default: 0 },
    ballsBowled: { type: Number, default: 0 },
    runsConceded: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    economy: { type: Number, default: 0 },
  }],
  ballByBall: [{
    ballNumber: Number,
    over: Number,
    runs: Number,
    type: {
      type: String,
      enum: ['normal', 'wide', 'no-ball', 'wicket', 'bye', 'leg-bye'],
      default: 'normal',
    },
    batsmanName: String,
    bowlerName: String,
    batsmanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
    },
    bowlerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
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
