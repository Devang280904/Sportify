const Match = require('../models/Match');
const ScoreRecord = require('../models/ScoreRecord');

// @desc    Create match
// @route   POST /api/matches
exports.createMatch = async (req, res) => {
  try {
    const { tournamentId, team1Id, team2Id, matchDate, venue, totalOvers, playersPerTeam } = req.body;

    if (team1Id === team2Id) {
      return res.status(400).json({ success: false, message: 'Team1 and Team2 cannot be the same' });
    }

    const Team = require('../models/Team');
    const team1 = await Team.findById(team1Id);
    const team2 = await Team.findById(team2Id);
    
    if (!team1 || !team2) {
      return res.status(404).json({ success: false, message: 'One or both teams not found' });
    }

    let requiredPlayers = playersPerTeam ? Number(playersPerTeam) : 11;

    // Verify tournament ownership if it's tied to a tournament
    if (tournamentId) {
      const Tournament = require('../models/Tournament');
      const tournament = await Tournament.findById(tournamentId);
      if (!tournament) {
        return res.status(404).json({ success: false, message: 'Tournament not found' });
      }
      if (tournament.organizerId.toString() !== req.user.id) {
        return res.status(403).json({ success: false, message: 'You cannot add or modify another user’s tournament/match.' });
      }
      requiredPlayers = tournament.playersPerTeam || 11;
    }

    // Validate player counts
    if (team1.players.length !== requiredPlayers) {
      return res.status(400).json({ success: false, message: `Team 1 (${team1.teamName}) has ${team1.players.length} players, but exactly ${requiredPlayers} are required` });
    }

    if (team2.players.length !== requiredPlayers) {
      return res.status(400).json({ success: false, message: `Team 2 (${team2.teamName}) has ${team2.players.length} players, but exactly ${requiredPlayers} are required` });
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

    const matchData = { 
      team1Id, 
      team2Id, 
      matchDate, 
      venue, 
      totalOvers: totalOvers || 20, 
      playersPerTeam: requiredPlayers,
      createdBy: req.user.id
    };
    if (tournamentId) matchData.tournamentId = tournamentId;

    // Check ownership for independent matches as well
    if (!tournamentId) {
      if (team1.createdBy.toString() !== req.user.id && team2.createdBy.toString() !== req.user.id) {
         return res.status(403).json({ success: false, message: 'You must own at least one of the teams to schedule an independent match.' });
      }
    }
    
    const match = await Match.create(matchData);

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
      .populate({ 
        path: 'tournamentId', 
        select: 'name organizerId playersPerTeam',
        populate: { path: 'organizerId', select: 'name' }
      })
      .populate('winnerId', 'teamName')
      .populate('createdBy', 'name')
      .sort({ matchDate: -1 });

    // Fetch score records efficiently for all found matches
    const matchIds = matches.map(m => m._id);
    const scoreRecords = await ScoreRecord.find({ matchId: { $in: matchIds } }).select('matchId teamId runs wickets overs');

    // Attach scores to match data
    const matchesWithScores = matches.map(match => {
      const matchScores = scoreRecords.filter(s => s.matchId.toString() === match._id.toString());
      return {
        ...match.toObject(),
        scores: matchScores
      };
    });

    res.json({ success: true, data: matchesWithScores });
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
      .populate({ 
        path: 'tournamentId', 
        select: 'name organizerId',
        populate: { path: 'organizerId', select: 'name' }
      })
      .populate('winnerId', 'teamName')
      .populate('createdBy', 'name');

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

    // Strict Schedule Enforcement: Match cannot start before its exact time
    const currentTime = Date.now();
    const scheduledTime = new Date(match.matchDate).getTime();
    if (currentTime < scheduledTime) {
      const waitMinutes = Math.ceil((scheduledTime - currentTime) / (60 * 1000));
      return res.status(400).json({ 
        success: false, 
        message: `Match is scheduled for ${new Date(match.matchDate).toLocaleString()}. Please wait ${waitMinutes} more minute(s) before starting.` 
      });
    }

    // Use findByIdAndUpdate to bypass Mongoose enum validation on legacy docs
    const updatedMatch = await Match.findByIdAndUpdate(
      req.params.id,
      { $set: { status: 'live', battingTeamId, startTime: new Date() } },
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
