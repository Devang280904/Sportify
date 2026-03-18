const Match = require('../models/Match');
const ScoreRecord = require('../models/ScoreRecord');

// @desc    Create match
// @route   POST /api/matches
exports.createMatch = async (req, res) => {
  try {
    const { tournamentId, team1Id, team2Id, matchDate, venue } = req.body;

    if (team1Id === team2Id) {
      return res.status(400).json({ success: false, message: 'Team1 and Team2 cannot be the same' });
    }

    // Backend Date Validation
    const matchTime = new Date(matchDate).getTime();
    // Allow a 5 minute grace period for "current time" requests
    const currentTime = Date.now() - (5 * 60 * 1000); 

    if (matchTime < currentTime) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid match schedule. Match time must be current or future.' 
      });
    }

    const match = await Match.create({
      tournamentId, team1Id, team2Id, matchDate, venue,
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
      .populate('tournamentId', 'name')
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

// @desc    Start toss (randomly choose team and coin flip)
// @route   POST /api/matches/:id/toss
exports.startToss = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    // Check if match is scheduled and within 20 minutes of start time
    const matchTime = new Date(match.matchDate).getTime();
    const currentTime = Date.now();
    const timeDifference = matchTime - currentTime;
    const minutesDifference = timeDifference / (1000 * 60);

    if (match.status !== 'scheduled') {
      return res.status(400).json({ success: false, message: 'Toss can only be done for scheduled matches' });
    }

    if (minutesDifference > 20 * 60 * 1000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Toss can only be started within 20 minutes before match start time' 
      });
    }

    // Randomly choose a team (0 = team1, 1 = team2)
    const tossWinnerIndex = Math.random() < 0.5 ? 0 : 1;
    const tossWinnerId = tossWinnerIndex === 0 ? match.team1Id : match.team2Id;

    // Randomly choose coin flip result
    const coinResult = Math.random() < 0.5 ? 'heads' : 'tails';

    // Update match with toss information
    match.status = 'toss-pending';
    match.toss = {
      winnerId: tossWinnerId,
      coinResult: coinResult,
      chosenTeamId: tossWinnerId,
    };
    await match.save();

    const io = req.app.get('io');
    io.to(`match:${match._id}`).emit('tossStarted', {
      matchId: match._id,
      tossWinnerId: match.toss.winnerId,
      coinResult: coinResult,
    });

    res.json({ success: true, data: match });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Make toss decision (bat or bowl)
// @route   POST /api/matches/:id/toss-decision
exports.makeTossDecision = async (req, res) => {
  try {
    const { decision } = req.body; // 'bat' or 'bowl'
    const match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    if (match.status !== 'toss-pending') {
      return res.status(400).json({ success: false, message: 'Match is not in toss-pending state' });
    }

    if (!['bat', 'bowl'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'Decision must be "bat" or "bowl"' });
    }

    // Update toss decision
    match.toss.decision = decision;
    match.toss.completedAt = new Date();

    // Determine batting team based on decision
    if (decision === 'bat') {
      match.battingTeamId = match.toss.winnerId;
    } else {
      // If toss winner chose to bowl, other team bats
      match.battingTeamId = match.toss.winnerId.toString() === match.team1Id.toString() ? match.team2Id : match.team1Id;
    }

    // Change status to live to start recording balls
    match.status = 'live';
    await match.save();

    const io = req.app.get('io');
    io.to(`match:${match._id}`).emit('tossDecisionMade', {
      matchId: match._id,
      decision: decision,
      battingTeamId: match.battingTeamId,
      tossInfo: match.toss,
    });

    res.json({ success: true, data: match });
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
