const Match = require('../models/Match');
const ScoreRecord = require('../models/ScoreRecord');
const { getCache, setCache, delCache } = require('../config/redis');

// @desc    Update score (ball by ball)
// @route   POST /api/matches/:id/score
exports.updateScore = async (req, res) => {
  try {
    const { teamId, runs, type, description } = req.body;
    const matchId = req.params.id;

    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    // Set match to live if scheduled or toss-pending
    if (match.status === 'scheduled' || match.status === 'toss-pending') {
      match.status = 'live';
      await match.save();
      const io = req.app.get('io');
      io.to(`match:${matchId}`).emit('matchStarted', { matchId });
    }

    const scoreRecord = await ScoreRecord.findOne({ matchId, teamId });
    if (!scoreRecord) {
      return res.status(404).json({ success: false, message: 'Score record not found' });
    }

    // Calculate ball and over
    const totalBalls = scoreRecord.ballByBall.filter(b => b.type !== 'wide' && b.type !== 'no-ball').length;
    const isLegalDelivery = type !== 'wide' && type !== 'no-ball';

    const ballData = {
      ballNumber: scoreRecord.ballByBall.length + 1,
      over: isLegalDelivery ? Math.floor((totalBalls + 1 - 1) / 6) + 1 : Math.floor(totalBalls / 6) + 1,
      runs: runs || 0,
      type: type || 'normal',
      description: description || '',
      timestamp: new Date(),
    };

    scoreRecord.ballByBall.push(ballData);
    scoreRecord.runs += (runs || 0);

    if (type === 'wicket') {
      scoreRecord.wickets = Math.min(scoreRecord.wickets + 1, 10);
    }

    if (isLegalDelivery) {
      const newTotalBalls = totalBalls + 1;
      const completedOvers = Math.floor(newTotalBalls / 6);
      const remainingBalls = newTotalBalls % 6;
      scoreRecord.overs = completedOvers + (remainingBalls / 10);
    }

    scoreRecord.updatedAt = new Date();
    await scoreRecord.save();

    // Broadcast score update via Socket.io
    const io = req.app.get('io');
    const scoreUpdate = {
      matchId,
      teamId,
      runs: scoreRecord.runs,
      wickets: scoreRecord.wickets,
      overs: scoreRecord.overs,
      lastBall: ballData,
    };
    io.to(`match:${matchId}`).emit('scoreUpdated', scoreUpdate);

    // Invalidate points cache
    await delCache(`points:${match.tournamentId}`);

    res.json({ success: true, data: scoreRecord });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Undo last ball
// @route   POST /api/matches/:id/undo
exports.undoLastBall = async (req, res) => {
  try {
    const { teamId } = req.body;
    const matchId = req.params.id;

    const scoreRecord = await ScoreRecord.findOne({ matchId, teamId });
    if (!scoreRecord || scoreRecord.ballByBall.length === 0) {
      return res.status(400).json({ success: false, message: 'No balls to undo' });
    }

    const lastBall = scoreRecord.ballByBall.pop();

    // Reverse the score changes
    scoreRecord.runs -= (lastBall.runs || 0);
    if (lastBall.type === 'wicket') {
      scoreRecord.wickets = Math.max(scoreRecord.wickets - 1, 0);
    }

    // Recalculate overs
    const legalBalls = scoreRecord.ballByBall.filter(b => b.type !== 'wide' && b.type !== 'no-ball').length;
    const completedOvers = Math.floor(legalBalls / 6);
    const remainingBalls = legalBalls % 6;
    scoreRecord.overs = completedOvers + (remainingBalls / 10);

    scoreRecord.updatedAt = new Date();
    await scoreRecord.save();

    // Broadcast undo via Socket.io
    const io = req.app.get('io');
    io.to(`match:${matchId}`).emit('scoreUpdated', {
      matchId,
      teamId,
      runs: scoreRecord.runs,
      wickets: scoreRecord.wickets,
      overs: scoreRecord.overs,
      undone: true,
    });

    res.json({ success: true, data: scoreRecord });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Complete match
// @route   POST /api/matches/:id/complete
exports.completeMatch = async (req, res) => {
  try {
    const { winnerId } = req.body;
    const match = await Match.findById(req.params.id);
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    match.status = 'completed';
    match.winnerId = winnerId || null;
    await match.save();

    const io = req.app.get('io');
    io.to(`match:${match._id}`).emit('matchCompleted', {
      matchId: match._id,
      winnerId,
    });

    await delCache(`points:${match.tournamentId}`);

    res.json({ success: true, data: match });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get points table
// @route   GET /api/tournaments/:id/points
exports.getPointsTable = async (req, res) => {
  try {
    const tournamentId = req.params.id;

    const cached = await getCache(`points:${tournamentId}`);
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    const matches = await Match.find({ tournamentId, status: 'completed' });

    const pointsMap = {};

    for (const match of matches) {
      const t1 = match.team1Id.toString();
      const t2 = match.team2Id.toString();

      if (!pointsMap[t1]) pointsMap[t1] = { teamId: t1, played: 0, won: 0, lost: 0, points: 0 };
      if (!pointsMap[t2]) pointsMap[t2] = { teamId: t2, played: 0, won: 0, lost: 0, points: 0 };

      pointsMap[t1].played++;
      pointsMap[t2].played++;

      if (match.winnerId) {
        const winner = match.winnerId.toString();
        const loser = winner === t1 ? t2 : t1;
        pointsMap[winner].won++;
        pointsMap[winner].points += 2;
        pointsMap[loser].lost++;
      } else {
        // Draw / No result: 1 point each
        pointsMap[t1].points += 1;
        pointsMap[t2].points += 1;
      }
    }

    const pointsTable = Object.values(pointsMap).sort((a, b) => b.points - a.points || b.won - a.won);

    // Populate team names
    const Team = require('../models/Team');
    for (const entry of pointsTable) {
      const team = await Team.findById(entry.teamId).select('teamName logoURL');
      entry.teamName = team ? team.teamName : 'Unknown';
      entry.logoURL = team ? team.logoURL : '';
    }

    await setCache(`points:${tournamentId}`, pointsTable, 300);

    res.json({ success: true, data: pointsTable });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
