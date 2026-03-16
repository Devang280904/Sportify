const cricketService = require('../services/cricketAPIService');

// @desc    Get live real cricket matches
// @route   GET /api/real-cricket/live
exports.getLiveMatches = async (req, res) => {
  try {
    const result = await cricketService.getLiveMatches();
    res.status(200).json({ success: true, count: result.data.length, data: result.data, isMock: result.isMock });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch live matches' });
  }
};

// @desc    Get upcoming real cricket matches
// @route   GET /api/real-cricket/upcoming
exports.getUpcomingMatches = async (req, res) => {
  try {
    const result = await cricketService.getUpcomingMatches();
    res.status(200).json({ success: true, count: result.data.length, data: result.data, isMock: result.isMock });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch upcoming matches' });
  }
};

// @desc    Get completed real cricket matches
// @route   GET /api/real-cricket/completed
exports.getCompletedMatches = async (req, res) => {
  try {
    const result = await cricketService.getCompletedMatches();
    res.status(200).json({ success: true, count: result.data.length, data: result.data, isMock: result.isMock });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch completed matches' });
  }
};

// @desc    Get single real cricket match
// @route   GET /api/real-cricket/match/:id
exports.getMatchDetails = async (req, res) => {
  try {
    const match = await cricketService.getMatchDetails(req.params.id);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
    res.status(200).json({ success: true, data: match, isMock: match.isMock || false });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch match details' });
  }
};
