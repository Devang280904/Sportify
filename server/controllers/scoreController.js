const Match = require('../models/Match');
const ScoreRecord = require('../models/ScoreRecord');
const Team = require('../models/Team');
const Player = require('../models/Player');
const { getCache, setCache, delCache } = require('../config/redis');

const EXTRAS_TYPES = new Set(['wide', 'no-ball']);

const isLegalDelivery = (deliveryType = 'normal') => !EXTRAS_TYPES.has(deliveryType);

const countLegalBalls = (ballByBall = []) =>
  ballByBall.filter(ball => isLegalDelivery(ball.type)).length;

const toOverNotation = (legalBalls) => {
  const completedOvers = Math.floor(legalBalls / 6);
  const ballsInCurrentOver = legalBalls % 6;
  return completedOvers + (ballsInCurrentOver / 10);
};

const buildScoreBroadcastPayload = (matchId, teamId, scoreRecord, extra = {}) => ({
  matchId,
  teamId,
  runs: scoreRecord.runs,
  wickets: scoreRecord.wickets,
  overs: scoreRecord.overs,
  strikerId: scoreRecord.strikerId,
  nonStrikerId: scoreRecord.nonStrikerId,
  currentBowlerId: scoreRecord.currentBowlerId,
  batting: scoreRecord.batting,
  bowling: scoreRecord.bowling,
  ...extra,
});

const handleServerError = (res, error) => {
  res.status(500).json({ success: false, message: error.message });
};

// @desc    Set/Change striker and non-striker
// @route   POST /api/matches/:id/set-batsmen
exports.setBatsmen = async (req, res) => {
  try {
    const { strikerId, nonStrikerId, teamId } = req.body;
    const matchId = req.params.id;

    const scoreRecord = await ScoreRecord.findOne({ matchId, teamId });
    if (!scoreRecord) {
      return res.status(404).json({ success: false, message: 'Score record not found' });
    }

    if (strikerId) {
      scoreRecord.strikerId = strikerId;
      // Add to batting array if not already there
      const player = await Player.findById(strikerId);
      if (player && !scoreRecord.batting.find(b => b.playerId.toString() === strikerId.toString())) {
        scoreRecord.batting.push({ playerId: strikerId, playerName: player.name });
      }
    }
    if (nonStrikerId) {
      scoreRecord.nonStrikerId = nonStrikerId;
      const player = await Player.findById(nonStrikerId);
      if (player && !scoreRecord.batting.find(b => b.playerId.toString() === nonStrikerId.toString())) {
        scoreRecord.batting.push({ playerId: nonStrikerId, playerName: player.name });
      }
    }

    await scoreRecord.save();
    
    const io = req.app.get('io');
    io.to(`match:${matchId}`).emit('scoreUpdated', buildScoreBroadcastPayload(matchId, teamId, scoreRecord));

    res.json({ success: true, data: scoreRecord });
  } catch (error) {
    handleServerError(res, error);
  }
};

// @desc    Set/Change current bowler
// @route   POST /api/matches/:id/set-bowler
exports.setBowler = async (req, res) => {
  try {
    const { bowlerId, teamId } = req.body; // teamId is the batting team's record to update
    const matchId = req.params.id;

    const scoreRecord = await ScoreRecord.findOne({ matchId, teamId });
    if (!scoreRecord) {
      return res.status(404).json({ success: false, message: 'Score record not found' });
    }

    if (bowlerId) {
      scoreRecord.currentBowlerId = bowlerId;
      const player = await Player.findById(bowlerId);
      if (player && !scoreRecord.bowling.find(b => b.playerId.toString() === bowlerId.toString())) {
        scoreRecord.bowling.push({ playerId: bowlerId, playerName: player.name });
      }
    }

    await scoreRecord.save();

    const io = req.app.get('io');
    io.to(`match:${matchId}`).emit('scoreUpdated', buildScoreBroadcastPayload(matchId, teamId, scoreRecord));

    res.json({ success: true, data: scoreRecord });
  } catch (error) {
    handleServerError(res, error);
  }
};

// @desc    Update score (ball by ball)
// @route   POST /api/matches/:id/score
exports.updateScore = async (req, res) => {
  try {
    const { teamId, runs, type, description, strikerId, nonStrikerId, bowlerId } = req.body;
    const matchId = req.params.id;

    if (!teamId) {
      return res.status(400).json({ success: false, message: 'teamId is required' });
    }

    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    if (match.status === 'scheduled') {
      match.status = 'live';
      await match.save();
      const io = req.app.get('io');
      io.to(`match:${matchId}`).emit('matchStarted', { matchId });
    }

    const scoreRecord = await ScoreRecord.findOne({ matchId, teamId });
    if (!scoreRecord) {
      return res.status(404).json({ success: false, message: 'Score record not found' });
    }

    const currentStrikerId = strikerId || scoreRecord.strikerId;
    const currentBowlerId = bowlerId || scoreRecord.currentBowlerId;

    if (!currentStrikerId || !currentBowlerId) {
      return res.status(400).json({ success: false, message: 'Striker and Bowler must be selected' });
    }

    const legalBallsBefore = countLegalBalls(scoreRecord.ballByBall);

    let maxLegalBalls = match.totalOvers * 6;
    if (match.currentInnings === 2) {
      const otherTeamId = match.battingTeamId.toString() === match.team1Id.toString() ? match.team2Id : match.team1Id;
      const otherScoreRecord = await ScoreRecord.findOne({ matchId, teamId: otherTeamId });
      if (otherScoreRecord) {
        const otherLegalBalls = countLegalBalls(otherScoreRecord.ballByBall);
        maxLegalBalls = Math.min(maxLegalBalls, otherLegalBalls);
      }
    }

    // Enforce match total overs constraint
    if (legalBallsBefore >= maxLegalBalls) {
      if (match.currentInnings === 2 && maxLegalBalls < match.totalOvers * 6) {
        return res.status(400).json({ success: false, message: `Maximum balls (${maxLegalBalls}) reached based on first innings` });
      }
      return res.status(400).json({ success: false, message: `Maximum overs (${match.totalOvers}) reached for this innings` });
    }

    const currentBallType = type || 'normal';
    const legalDelivery = isLegalDelivery(currentBallType);
    const safeRuns = Number.isFinite(runs) ? runs : 0;
    const overNumber = Math.floor(legalBallsBefore / 6) + 1;

    // Find names
    const striker = scoreRecord.batting.find(b => b.playerId.toString() === currentStrikerId.toString());
    const bowler = scoreRecord.bowling.find(b => b.playerId.toString() === currentBowlerId.toString());

    const ballData = {
      ballNumber: scoreRecord.ballByBall.length + 1,
      over: overNumber,
      runs: safeRuns,
      type: currentBallType,
      description: description || '',
      batsmanName: striker ? striker.playerName : 'Unknown',
      bowlerName: bowler ? bowler.playerName : 'Unknown',
      batsmanId: currentStrikerId,
      bowlerId: currentBowlerId,
      timestamp: new Date(),
    };

    scoreRecord.ballByBall.push(ballData);
    scoreRecord.runs += safeRuns;

    // Update batsman stats
    if (striker) {
      striker.runs += safeRuns;
      striker.ballsFaced += 1;
      if (safeRuns === 4) striker.fours += 1;
      if (safeRuns === 6) striker.sixes += 1;
      if (currentBallType === 'wicket') striker.isOut = true;
      striker.strikeRate = (striker.runs / striker.ballsFaced) * 100;
    }

    // Update bowler stats
    if (bowler) {
      bowler.runsConceded += safeRuns;
      if (legalDelivery) {
        bowler.ballsBowled += 1;
        bowler.oversBowled = toOverNotation(bowler.ballsBowled);
      }
      if (currentBallType === 'wicket') bowler.wickets += 1;
      bowler.economy = (bowler.runsConceded / (bowler.ballsBowled / 6 || 1));
    }

    if (currentBallType === 'wicket') {
      scoreRecord.wickets = Math.min(scoreRecord.wickets + 1, 10);
      scoreRecord.strikerId = null; // Wait for new batsman selection
    }

    if (legalDelivery) {
      scoreRecord.overs = toOverNotation(legalBallsBefore + 1);
    }

    // Strike Rotation Logic
    let rotateStrike = false;
    // Rotate on odd runs
    if (safeRuns % 2 !== 0 && currentBallType !== 'wicket') {
      rotateStrike = true;
    }
    // Rotate at end of over (6 balls)
    if (legalDelivery && (legalBallsBefore + 1) % 6 === 0) {
      rotateStrike = !rotateStrike; // Toggle if already rotating for odd runs
      scoreRecord.currentBowlerId = null; // Enforce new bowler selection
    }

    if (rotateStrike && scoreRecord.strikerId && scoreRecord.nonStrikerId) {
      const temp = scoreRecord.strikerId;
      scoreRecord.strikerId = scoreRecord.nonStrikerId;
      scoreRecord.nonStrikerId = temp;
    }

    scoreRecord.updatedAt = new Date();
    await scoreRecord.save();

    const io = req.app.get('io');
    const scoreUpdate = buildScoreBroadcastPayload(matchId, teamId, scoreRecord, {
      lastBall: ballData,
    });
    io.to(`match:${matchId}`).emit('scoreUpdated', scoreUpdate);

    await delCache(`points:${match.tournamentId}`);

    res.json({ success: true, data: scoreRecord });
  } catch (error) {
    handleServerError(res, error);
  }
};

// @desc    Undo last ball
// @route   POST /api/matches/:id/undo
exports.undoLastBall = async (req, res) => {
  try {
    const { teamId } = req.body;
    const matchId = req.params.id;

    if (!teamId) {
      return res.status(400).json({ success: false, message: 'teamId is required' });
    }

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

    // Reverse batsman stats
    const striker = scoreRecord.batting.find(b => b.playerId.toString() === lastBall.batsmanId.toString());
    if (striker) {
      striker.runs -= lastBall.runs;
      striker.ballsFaced -= 1;
      if (lastBall.runs === 4) striker.fours -= 1;
      if (lastBall.runs === 6) striker.sixes -= 1;
      if (lastBall.type === 'wicket') striker.isOut = false;
      striker.strikeRate = striker.ballsFaced > 0 ? (striker.runs / striker.ballsFaced) * 100 : 0;
    }

    // Reverse bowler stats
    const bowler = scoreRecord.bowling.find(b => b.playerId.toString() === lastBall.bowlerId.toString());
    if (bowler) {
      bowler.runsConceded -= lastBall.runs;
      if (isLegalDelivery(lastBall.type)) {
        bowler.ballsBowled -= 1;
        bowler.oversBowled = toOverNotation(bowler.ballsBowled);
      }
      if (lastBall.type === 'wicket') bowler.wickets -= 1;
      bowler.economy = (bowler.runsConceded / (bowler.ballsBowled / 6 || 1));
    }

    // Recalculate overs
    const legalBalls = countLegalBalls(scoreRecord.ballByBall);
    scoreRecord.overs = toOverNotation(legalBalls);

    // Restore the currentBowlerId to the undone ball's bowler
    scoreRecord.currentBowlerId = lastBall.bowlerId;

    scoreRecord.updatedAt = new Date();
    await scoreRecord.save();

    const io = req.app.get('io');
    io.to(`match:${matchId}`).emit('scoreUpdated', buildScoreBroadcastPayload(matchId, teamId, scoreRecord, {
      undone: true,
    }));

    res.json({ success: true, data: scoreRecord });
  } catch (error) {
    handleServerError(res, error);
  }
};

// @desc    Swap innings
// @route   POST /api/matches/:id/swap-innings
exports.swapInnings = async (req, res) => {
  try {
    const matchId = req.params.id;
    const match = await Match.findById(matchId);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });

    const newInnings = match.currentInnings + 1;
    if (newInnings > 2) {
      return res.status(400).json({ success: false, message: 'Match already has 2 innings' });
    }

    const scoreRecord = await ScoreRecord.findOne({ matchId, teamId: match.battingTeamId });
    if (scoreRecord) {
      const legalBalls = countLegalBalls(scoreRecord.ballByBall);
      if (legalBalls % 6 !== 0 && scoreRecord.wickets < 10) {
        return res.status(400).json({ success: false, message: 'You need to complete the ongoing over before ending the innings.' });
      }
    }

    // Set new batting team
    const otherTeamId = match.battingTeamId.toString() === match.team1Id.toString() ? match.team2Id : match.team1Id;
    match.battingTeamId = otherTeamId;
    match.currentInnings = newInnings;
    await match.save();

    const io = req.app.get('io');
    io.to(`match:${matchId}`).emit('inningsSwapped', { matchId, newBattingTeamId: otherTeamId, innings: newInnings });

    res.json({ success: true, data: match });
  } catch (error) {
    handleServerError(res, error);
  }
};

// @desc    Complete match and update player global stats
exports.completeMatch = async (req, res) => {
  try {
    const { winnerId } = req.body;
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });

    if (match.currentInnings === 1) {
      return res.status(400).json({ success: false, message: 'Cannot end match during the first innings. Please swap innings instead.' });
    }

    if (match.battingTeamId) {
      const scoreRecord = await ScoreRecord.findOne({ matchId: req.params.id, teamId: match.battingTeamId });
      if (scoreRecord) {
        const legalBalls = countLegalBalls(scoreRecord.ballByBall);
        
        const otherTeamId = match.battingTeamId.toString() === match.team1Id.toString() ? match.team2Id : match.team1Id;
        const otherScoreRecord = await ScoreRecord.findOne({ matchId: req.params.id, teamId: otherTeamId });
        
        let targetReached = false;
        if (match.currentInnings === 2 && otherScoreRecord) {
          targetReached = scoreRecord.runs > otherScoreRecord.runs;
        }

        if (legalBalls % 6 !== 0 && scoreRecord.wickets < 10 && !targetReached) {
          return res.status(400).json({ success: false, message: 'You need to complete the ongoing over before ending the innings.' });
        }
      }
    }

    match.status = 'completed';
    match.winnerId = winnerId || null;
    await match.save();

    // Update Player global stats from all score records of this match
    const records = await ScoreRecord.find({ matchId: req.params.id });
    for (const record of records) {
      for (const b of record.batting) {
        await Player.findByIdAndUpdate(b.playerId, {
          $inc: { 
            'stats.batting.runs': b.runs,
            'stats.batting.ballsFaced': b.ballsFaced,
            'stats.batting.fours': b.fours,
            'stats.batting.sixes': b.sixes,
            'stats.batting.matches': 1
          }
        });
      }
      for (const bw of record.bowling) {
        await Player.findByIdAndUpdate(bw.playerId, {
          $inc: {
            'stats.bowling.wickets': bw.wickets,
            'stats.bowling.runsConceded': bw.runsConceded,
            'stats.bowling.ballsBowled': bw.ballsBowled,
            'stats.bowling.matches': 1
          }
        });
      }
    }

    const io = req.app.get('io');
    io.to(`match:${match._id}`).emit('matchCompleted', { matchId: match._id, winnerId });

    await delCache(`points:${match.tournamentId}`);
    res.json({ success: true, data: match });
  } catch (error) {
    handleServerError(res, error);
  }
};

// @desc    Get match summary (scorecards)
// @route   GET /api/matches/:id/summary
exports.getMatchSummary = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id)
      .populate('team1Id', 'teamName logoURL')
      .populate('team2Id', 'teamName logoURL')
      .populate('winnerId', 'teamName');
    
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });

    const scores = await ScoreRecord.find({ matchId: req.params.id });
    res.json({ success: true, data: { match, scores } });
  } catch (error) {
    handleServerError(res, error);
  }
};

// @desc    Get points table
exports.getPointsTable = async (req, res) => {
  try {
    const tournamentId = req.params.id;
    const cacheKey = `points:${tournamentId}`;

    const cached = await getCache(cacheKey);
    if (cached) return res.json({ success: true, data: cached, cached: true });

    const matches = await Match.find({ tournamentId, status: 'completed' }).lean();
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
        pointsMap[t1].points += 1;
        pointsMap[t2].points += 1;
      }
    }

    const pointsTable = Object.values(pointsMap).sort((a, b) => b.points - a.points);
    const teams = await Team.find({ _id: { $in: pointsTable.map(e => e.teamId) } }).select('teamName logoURL').lean();
    const teamsById = new Map(teams.map(t => [t._id.toString(), t]));

    const enrichedTable = pointsTable.map(entry => {
      const team = teamsById.get(entry.teamId);
      return { ...entry, teamName: team ? team.teamName : 'Unknown', logoURL: team ? team.logoURL : '' };
    });

    await setCache(cacheKey, enrichedTable, 300);
    res.json({ success: true, data: enrichedTable });
  } catch (error) {
    handleServerError(res, error);
  }
};
