const Match = require('../models/Match');
const ScoreRecord = require('../models/ScoreRecord');

// @desc    Create match
// @route   POST /api/matches
exports.createMatch = async (req, res) => {
  try {
    const { tournamentId, team1Id, team2Id, matchDate, venue, totalOvers } = req.body;

    if (team1Id === team2Id) {
      return res.status(400).json({ success: false, message: 'Team1 and Team2 cannot be the same' });
    }

    // Verify tournament ownership
    const Tournament = require('../models/Tournament');
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }
    if (tournament.organizerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You cannot add or modify another user’s tournament/match.' });
    }

    // Backend Date Validation
    const matchTime = new Date(matchDate).getTime();
    const currentTime = Date.now() - (5 * 60 * 1000); 

    if (matchTime < currentTime) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid match schedule. Match time must be current or future.' 
      });
    }

    const match = await Match.create({
      tournamentId, team1Id, team2Id, matchDate, venue, totalOvers: totalOvers || 20,
    });

    // Create score records for both teams
    await ScoreRecord.create({ matchId: match._id, teamId: team1Id });
    await ScoreRecord.create({ matchId: match._id, teamId: team2Id });

    res.status(201).json({ success: true, data: match });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all matches
// @route   GET /api/matches
exports.getMatches = async (req, res) => {
  try {
    const filter = {};
    if (req.query.tournamentId) filter.tournamentId = req.query.tournamentId;
    if (req.query.status) filter.status = req.query.status;

    const matches = await Match.find(filter)
      .populate('team1Id', 'teamName logoURL')
      .populate('team2Id', 'teamName logoURL')
      .populate('tournamentId', 'name')
      .populate('winnerId', 'teamName')
      .sort({ matchDate: -1 });

    res.json({ success: true, data: matches });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single match with scores
// @route   GET /api/matches/:id
exports.getMatch = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id)
      .populate('team1Id', 'teamName logoURL players')
      .populate('team2Id', 'teamName logoURL players')
      .populate('tournamentId', 'name organizerId')
      .populate('winnerId', 'teamName');

    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    const scores = await ScoreRecord.find({ matchId: match._id });

    res.json({ success: true, data: { match, scores } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Start match (move from scheduled to live)
// @route   POST /api/matches/:id/start
exports.startMatch = async (req, res) => {
  try {
    const { battingTeamId } = req.body;
    const match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    // Accept 'scheduled' or legacy 'toss-pending' (migration support)
    if (!['scheduled', 'toss-pending'].includes(match.status)) {
      return res.status(400).json({ success: false, message: 'Match is already started or completed' });
    }

    if (!battingTeamId) {
      return res.status(400).json({ success: false, message: 'battingTeamId is required' });
    }

    const validTeam = [match.team1Id.toString(), match.team2Id.toString()].includes(battingTeamId);
    if (!validTeam) {
      return res.status(400).json({ success: false, message: 'battingTeamId must be one of the two match teams' });
    }

    // Use findByIdAndUpdate to bypass Mongoose enum validation on legacy docs
    const updatedMatch = await Match.findByIdAndUpdate(
      req.params.id,
      { $set: { status: 'live', battingTeamId } },
      { new: true, runValidators: false }
    ).populate('team1Id', 'teamName').populate('team2Id', 'teamName');

    const io = req.app.get('io');
    io.to(`match:${updatedMatch._id}`).emit('matchStarted', {
      matchId: updatedMatch._id,
      battingTeamId: updatedMatch.battingTeamId,
    });

    res.json({ success: true, data: updatedMatch });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update match details
// @route   PUT /api/matches/:id
exports.updateMatch = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    // Constraint: Once match starts, no structural changes
    if (match.status !== 'scheduled') {
      return res.status(400).json({ 
        success: false, 
        message: 'Structural changes are not allowed once the match has started.' 
      });
    }

    const updatedMatch = await Match.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.json({ success: true, data: updatedMatch });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete scheduled match
// @route   DELETE /api/matches/:id
exports.deleteMatch = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    if (match.status !== 'scheduled') {
      return res.status(400).json({ 
        success: false, 
        message: 'Only scheduled matches can be deleted. Live or completed matches cannot be deleted.' 
      });
    }

    // Delete associated score records
    await ScoreRecord.deleteMany({ matchId: req.params.id });

    // Delete the match
    await Match.findByIdAndDelete(req.params.id);

    const io = req.app.get('io');
    io.emit('matchDeleted', { matchId: req.params.id });

    res.json({ success: true, message: 'Match deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
