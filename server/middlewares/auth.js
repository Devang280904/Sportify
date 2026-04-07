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

    // Update lastActive timestamp on every request
    req.user.lastActive = Date.now();
    req.user.isLoggedIn = true; // Ensure logged in status if session active
    await req.user.save({ validateBeforeSave: false });

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
    const organizerId = (tournament.organizerId?._id || tournament.organizerId)?.toString();
    if (organizerId !== req.user.id) {
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
    if (match.tournamentId) {
      const tournament = await Tournament.findById(match.tournamentId);
      if (!tournament) {
        return res.status(404).json({ success: false, message: 'Tournament not found' });
      }
      const organizerId = (tournament.organizerId?._id || tournament.organizerId)?.toString();
      if (organizerId !== req.user.id) {
        return res.status(403).json({ success: false, message: 'You cannot modify this match as you are not the tournament organizer.' });
      }
      req.tournament = tournament;
    } else {
      // Independent Match: Check the match creator directly
      const creatorId = (match.createdBy?._id || match.createdBy)?.toString();
      if (creatorId !== req.user.id) {
        return res.status(403).json({ success: false, message: 'You cannot modify this independent match as you are not the creator.' });
      }
    }
    
    req.match = match;
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Ownership middleware for teams: handles both original creator and tournament organizers
const isTeamOwner = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id).populate('tournamentIds');
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    // 1. Direct Ownership
    const isCreator = team.createdBy?.toString() === req.user.id;
    
    // 2. Tournament Participation (if any organizer matches current user)
    const isOrganizer = team.tournamentIds && team.tournamentIds.some(t => 
      (t.organizerId?._id || t.organizerId)?.toString() === req.user.id
    );

    if (!isCreator && !isOrganizer) {
      return res.status(403).json({ success: false, message: 'You are not authorized to manage this team.' });
    }

    req.team = team;
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { protect, isOwner, isMatchOwner, isTeamOwner };
