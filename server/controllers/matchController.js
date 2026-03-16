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
