const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Tournament = require('../models/Tournament');
const Match = require('../models/Match');
const Team = require('../models/Team');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized, token invalid' });
  }
};

// Ownership middleware: checks if the user owns the tournament (by :id param)
const isOwner = async (req, res, next) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }
    if (tournament.organizerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You cannot add or modify another user’s tournament/match.' });
    }
    req.tournament = tournament;
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Ownership middleware for matches: looks up match -> tournament -> organizerId
const isMatchOwner = async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }
    const tournament = await Tournament.findById(match.tournamentId);
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }
    if (tournament.organizerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You cannot add or modify another user’s tournament/match.' });
    }
    req.match = match;
    req.tournament = tournament;
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Ownership middleware for teams: looks up team -> tournament -> organizerId
const isTeamOwner = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }
    const tournament = await Tournament.findById(team.tournamentId);
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }
    if (tournament.organizerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You cannot add or modify another user’s tournament/match.' });
    }
    req.team = team;
    req.tournament = tournament;
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { protect, isOwner, isMatchOwner, isTeamOwner };
