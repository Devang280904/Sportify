const Tournament = require('../models/Tournament');
const { getCache, setCache, delCache } = require('../config/redis');

// @desc    Create tournament
// @route   POST /api/tournaments
exports.createTournament = async (req, res) => {
  try {
    const { name, startDate, endDate, status } = req.body;

    // Validate dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    if (start < today) {
      return res.status(400).json({ success: false, message: 'Start date cannot be before today.' });
    }

    if (end < today) {
      return res.status(400).json({ success: false, message: 'End date cannot be before today.' });
    }

    if (end < start) {
      return res.status(400).json({ success: false, message: 'End date must be equal to or after the start date.' });
    }

    const tournament = await Tournament.create({
      name,
      startDate,
      endDate,
      status: status || 'upcoming',
      organizerId: req.user.id,
    });
    await delCache('tournaments:all');
    res.status(201).json({ success: true, data: tournament });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all tournaments
// @route   GET /api/tournaments
exports.getTournaments = async (req, res) => {
  try {
    const cached = await getCache('tournaments:all');
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }
    const tournaments = await Tournament.find()
      .populate('organizerId', 'name email')
      .populate('teams', 'teamName')
      .sort({ createdAt: -1 });
    await setCache('tournaments:all', tournaments, 300);
    res.json({ success: true, data: tournaments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single tournament
// @route   GET /api/tournaments/:id
exports.getTournament = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id)
      .populate('organizerId', 'name email')
      .populate({ path: 'teams', populate: { path: 'players' } });
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }
    res.json({ success: true, data: tournament });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update tournament
// @route   PUT /api/tournaments/:id
exports.updateTournament = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }
    if (tournament.organizerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You cannot add or modify another user’s tournament/match.' });
    }
    // If dates are being updated, validate them
    if (req.body.startDate || req.body.endDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const startDate = req.body.startDate ? new Date(req.body.startDate) : new Date(tournament.startDate);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = req.body.endDate ? new Date(req.body.endDate) : new Date(tournament.endDate);
      endDate.setHours(0, 0, 0, 0);

      if (startDate < today) {
        return res.status(400).json({ success: false, message: 'Start date cannot be before today.' });
      }

      if (endDate < today) {
        return res.status(400).json({ success: false, message: 'End date cannot be before today.' });
      }

      if (endDate < startDate) {
        return res.status(400).json({ success: false, message: 'End date must be equal to or after the start date.' });
      }
    }
    const updated = await Tournament.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    });
    await delCache('tournaments:all');
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete tournament
// @route   DELETE /api/tournaments/:id
exports.deleteTournament = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    if (tournament.organizerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You cannot add or modify another user’s tournament/match.' });
    }

    const mongoose = require('mongoose');
    const Match = mongoose.model('Match');
    const Team = mongoose.model('Team');
    const ScoreRecord = mongoose.model('ScoreRecord');

    // Find all matches associated with this tournament
    const matches = await Match.find({ tournamentId: req.params.id });
    const matchIds = matches.map(m => m._id);

    // Delete all ScoreRecords associated with those matches
    if (matchIds.length > 0) {
      await ScoreRecord.deleteMany({ matchId: { $in: matchIds } });
    }

    // Delete all Matches
    await Match.deleteMany({ tournamentId: req.params.id });

    // Delete all Teams
    await Team.deleteMany({ tournamentId: req.params.id });

    // Finally, delete the Tournament
    await Tournament.findByIdAndDelete(req.params.id);
    
    // Clear caches
    await delCache('tournaments:all');
    await delCache(`points:${req.params.id}`);

    res.json({ success: true, message: 'Tournament and all associated data deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
