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
  ballByBall: scoreRecord.ballByBall,
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

    if (!teamId) {
      return res.status(400).json({ success: false, message: 'teamId is required to set batsmen' });
    }

    const scoreRecord = await ScoreRecord.findOne({ matchId, teamId });
    if (!scoreRecord) {
      return res.status(404).json({ success: false, message: `Score record not found for team ${teamId} in match ${matchId}` });
    }

    if (strikerId) {
      // Check if already out
      const stat = scoreRecord.batting.find(b => b.playerId.toString() === strikerId.toString());
      if (stat && stat.isOut) return res.status(400).json({ success: false, message: 'This player is already out and cannot bat again!' });
      
      scoreRecord.strikerId = strikerId;
      const player = await Player.findById(strikerId);
      if (player && !stat) {
        scoreRecord.batting.push({ playerId: strikerId, playerName: player.name });
      }
    }
    if (nonStrikerId) {
      const stat = scoreRecord.batting.find(b => b.playerId.toString() === nonStrikerId.toString());
      if (stat && stat.isOut) return res.status(400).json({ success: false, message: 'This player is already out and cannot bat again!' });
      
      scoreRecord.nonStrikerId = nonStrikerId;
      const player = await Player.findById(nonStrikerId);
      if (player && !stat) {
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

    if (!teamId) {
       return res.status(400).json({ success: false, message: 'teamId is required to set bowler' });
    }

    const scoreRecord = await ScoreRecord.findOne({ matchId, teamId });
    if (!scoreRecord) {
      return res.status(404).json({ success: false, message: `Score record not found for team ${teamId} in match ${matchId}` });
    }

    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    if (bowlerId) {
      const maxOversPerBowler = Math.ceil((match.totalOvers || 20) / 5);
      const bowlerStat = scoreRecord.bowling.find(b => b.playerId.toString() === bowlerId.toString());
      if (bowlerStat && bowlerStat.ballsBowled >= maxOversPerBowler * 6) {
         return res.status(400).json({ success: false, message: `Bowler limit reached: A bowler can only bowl up to ${maxOversPerBowler} overs in a ${match.totalOvers}-over match.` });
      }

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
    const { teamId, runs, type, description, strikerId, nonStrikerId, bowlerId, dismissalType, dismissalDescription } = req.body;
    const matchId = req.params.id;

    if (!teamId) {
      return res.status(400).json({ success: false, message: 'teamId is required' });
    }

    const match = await Match.findById(matchId).populate('team1Id').populate('team2Id');
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    if (match.status === 'completed') {
      return res.status(400).json({ success: false, message: 'This match has already ended!' });
    }

    if (teamId !== match.battingTeamId.toString()) {
      return res.status(400).json({ success: false, message: 'Only the active batting team can score runs! Please swap innings if necessary.' });
    }

    if (match.status === 'scheduled') {
      await Match.findByIdAndUpdate(matchId, { $set: { status: 'live' } });
      const io = req.app.get('io');
      const startPayload = { matchId: matchId.toString() };
      io.to(`match:${matchId}`).emit('matchStarted', startPayload);
      io.emit('matchStarted', startPayload); // Global broadcast
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
      const bTeamId = match.battingTeamId.toString();
      const t1Id = (match.team1Id?._id || match.team1Id).toString();
      const otherTeamId = bTeamId === t1Id ? match.team2Id : match.team1Id;
      
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
      dismissalType: currentBallType === 'wicket' ? (dismissalType || null) : null,
      dismissalDescription: currentBallType === 'wicket' ? (dismissalDescription || '') : '',
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
      if (currentBallType === 'wicket') {
        striker.isOut = true;
        striker.dismissalType = dismissalType || null;
        striker.dismissalDescription = dismissalDescription || '';
      }
      striker.strikeRate = (striker.runs / striker.ballsFaced) * 100;
    }

    // Update bowler stats
    if (bowler) {
      const maxBowlerOvers = Math.ceil(match.totalOvers / 5);
      if (legalDelivery && (bowler.ballsBowled / 6) >= maxBowlerOvers) {
        return res.status(400).json({ success: false, message: `Bowler ${bowler.playerName} has already completed their maximum limit of ${maxBowlerOvers} overs.` });
      }
      
      bowler.runsConceded += safeRuns;
      if (legalDelivery) {
        bowler.ballsBowled += 1;
        bowler.oversBowled = toOverNotation(bowler.ballsBowled);
      }
      if (currentBallType === 'wicket') bowler.wickets += 1;
      bowler.economy = (bowler.runsConceded / (bowler.ballsBowled / 6 || 1));
    }

    if (currentBallType === 'wicket') {
      const maxWickets = (match.playersPerTeam || 11) - 1;
      scoreRecord.wickets = Math.min(scoreRecord.wickets + 1, maxWickets + 1);
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

    // Auto-complete match logic for 2nd Innings
    if (match.currentInnings === 2) {
      const bTeamId = match.battingTeamId.toString();
      const t1Id = (match.team1Id?._id || match.team1Id).toString();
      const t2Id = (match.team2Id?._id || match.team2Id).toString();
      const targetTeamId = bTeamId === t1Id ? t2Id : t1Id;
      
      const otherScoreRecord = await ScoreRecord.findOne({ matchId, teamId: targetTeamId });
      if (otherScoreRecord) {
        let matchEnded = false;
        
        // Case 1: Chasing team successfully chases the target
        if (scoreRecord.runs > otherScoreRecord.runs) {
           const winner = bTeamId === t1Id ? match.team1Id : match.team2Id;
           match.status = 'completed';
           match.winnerId = match.battingTeamId;
           match.resultMessage = `${winner?.teamName || 'Unknown Team'} won by ${ (match.playersPerTeam || 11) - 1 - scoreRecord.wickets } wickets`;
           matchEnded = true;
        } 
        // Case 2: Chasing team is all out (wickets reached player count - 1) OR max overs reached
        else if (scoreRecord.wickets >= (match.playersPerTeam || 11) - 1 || (legalDelivery && (legalBallsBefore + 1) >= maxLegalBalls)) {
           match.status = 'completed';
           if (scoreRecord.runs < otherScoreRecord.runs) {
               const winner = t1Id === targetTeamId ? match.team1Id : match.team2Id;
               match.winnerId = targetTeamId;
               match.resultMessage = `${winner?.teamName || 'Winner'} won by ${otherScoreRecord.runs - scoreRecord.runs} runs`;
           } else {
               match.winnerId = null;
               match.resultMessage = "Match Tied";
           }
           matchEnded = true;
        }

        if (matchEnded) {
           await Match.findByIdAndUpdate(match._id, { 
             $set: {
               status: 'completed', 
               winnerId: match.winnerId, 
               resultMessage: match.resultMessage,
               endTime: new Date()
             }
           });
           
           const populatedMatch = await Match.findById(match._id).populate('winnerId', 'teamName logoURL');
           const completionPayload = { 
             matchId: match._id.toString(), 
             winnerId: populatedMatch.winnerId, 
             resultMessage: match.resultMessage,
             status: 'completed'
           };
           io.to(`match:${matchId}`).emit('matchCompleted', completionPayload);
           io.emit('matchCompleted', completionPayload); // Global broadcast
           
           // Update Player Global Stats here (similar to completeMatch endpoint)
           const records = await ScoreRecord.find({ matchId: match._id });
           for (const record of records) {
             for (const b of record.batting) {
               await Player.findByIdAndUpdate(b.playerId, {
                 $inc: { 
                   'stats.batting.runs': b.runs, 'stats.batting.ballsFaced': b.ballsFaced,
                   'stats.batting.fours': b.fours, 'stats.batting.sixes': b.sixes, 'stats.batting.matches': 1
                 }
               });
             }
             for (const bw of record.bowling) {
               await Player.findByIdAndUpdate(bw.playerId, {
                 $inc: {
                   'stats.bowling.wickets': bw.wickets, 'stats.bowling.runsConceded': bw.runsConceded,
                   'stats.bowling.ballsBowled': bw.ballsBowled, 'stats.bowling.matches': 1
                 }
               });
             }
           }
           if (match.tournamentId) {
             await delCache(`points:${match.tournamentId}`);
           }
        }
      }
    }

    // Final success response, including match status for auto-completion feedback
    res.json({ 
      success: true, 
      data: scoreRecord,
      matchStatus: match.status,
      winnerId: match.winnerId,
      resultMessage: match.resultMessage
    });
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
      if (lastBall.type === 'wicket') {
        striker.isOut = false;
        striker.dismissalType = null;
        striker.dismissalDescription = '';
      }
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

    // Robustly determine other team ID for inning swap
    const currentBattingIdStr = match.battingTeamId.toString();
    const team1IdStr = (match.team1Id?._id || match.team1Id).toString();
    const otherTeamId = currentBattingIdStr === team1IdStr ? match.team2Id : match.team1Id;
    
    await Match.findByIdAndUpdate(matchId, {
      $set: {
        battingTeamId: otherTeamId,
        currentInnings: newInnings
      }
    });

    const updatedMatch = await Match.findById(matchId);

    const io = req.app.get('io');
    const swapPayload = { matchId: matchId.toString(), newBattingTeamId: otherTeamId.toString(), innings: newInnings };
    io.to(`match:${matchId}`).emit('inningsSwapped', swapPayload);
    io.emit('scoreUpdated', { matchId: matchId.toString(), isSwapped: true }); // Notify list views too

    res.json({ success: true, data: updatedMatch });
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

    // Comprehensive Result Calculation
    const s1 = await ScoreRecord.findOne({ matchId: req.params.id, teamId: match.team1Id });
    const s2 = await ScoreRecord.findOne({ matchId: req.params.id, teamId: match.team2Id });
    
    if (s1 && s2) {
        if (s1.runs === s2.runs) {
            match.resultMessage = "Match Tied";
            match.winnerId = null;
        } else {
            const calculatedWinnerId = s1.runs > s2.runs ? match.team1Id?._id : match.team2Id?._id;
            const winningTeamObj = s1.runs > s2.runs ? match.team1Id : match.team2Id;
            const winningRecord = s1.runs > s2.runs ? s1 : s2;
            
            match.winnerId = winnerId || calculatedWinnerId;
            const finalWinningTeam = match.winnerId.toString() === match.team1Id?._id.toString() ? match.team1Id : match.team2Id;
            
            // Check if it was a chase (Innings 2 victory)
            if (match.currentInnings === 2 && match.winnerId.toString() === match.battingTeamId?.toString()) {
                match.resultMessage = `${finalWinningTeam?.teamName || 'Winner'} won by ${ (match.playersPerTeam || 11) - 1 - winningRecord.wickets } wickets`;
            } else {
                match.resultMessage = `${finalWinningTeam?.teamName || 'Winner'} won by ${Math.abs(s1.runs - s2.runs)} runs`;
            }
        }
    }

    match.status = 'completed';
    match.endTime = new Date();
    await match.save();

    // Update Player global stats from all score records of this match
    const records = [s1, s2];
    for (const record of records) {
      if (!record) continue;
      for (const b of record.batting) {
        await Player.findByIdAndUpdate(b.playerId, {
          $inc: { 
            'stats.batting.runs': b.runs, 'stats.batting.ballsFaced': b.ballsFaced,
            'stats.batting.fours': b.fours, 'stats.batting.sixes': b.sixes, 'stats.batting.matches': 1
          }
        });
      }
      for (const bw of record.bowling) {
        await Player.findByIdAndUpdate(bw.playerId, {
          $inc: {
            'stats.bowling.wickets': bw.wickets, 'stats.bowling.runsConceded': bw.runsConceded,
            'stats.bowling.ballsBowled': bw.ballsBowled, 'stats.bowling.matches': 1
          }
        });
      }
    }

    const populatedMatch = await Match.findById(match._id).populate('winnerId', 'teamName logoURL');
    const io = req.app.get('io');
    const finalPayload = { 
      matchId: match._id.toString(), 
      winnerId: populatedMatch.winnerId, 
      resultMessage: match.resultMessage,
      status: 'completed'
    };
    io.to(`match:${match._id}`).emit('matchCompleted', finalPayload);
    io.emit('matchCompleted', finalPayload); // Global broadcast

    if (match.tournamentId) {
      await delCache(`points:${match.tournamentId}`);
    }
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
      .populate('winnerId', 'teamName')
      .populate('createdBy', 'name')
      .populate({
        path: 'tournamentId',
        select: 'name organizerId',
        populate: { path: 'organizerId', select: 'name' }
      });
    
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

    // Fetch the tournament to get ALL registered teams (even those with 0 matches)
    const Tournament = require('../models/Tournament');
    const tournament = await Tournament.findById(tournamentId).lean();
    if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found' });

    const pointsMap = {};

    // Pre-seed every registered team with zeroes
    for (const teamId of tournament.teams) {
      const key = teamId.toString();
      pointsMap[key] = { teamId: key, played: 0, won: 0, lost: 0, tied: 0, points: 0 };
    }

    // Now process completed matches to fill in real stats
    const matches = await Match.find({ tournamentId, status: 'completed' }).lean();

    for (const match of matches) {
      const t1 = match.team1Id.toString();
      const t2 = match.team2Id.toString();

      // Safety: add if team wasn't in the tournament.teams list for any reason
      if (!pointsMap[t1]) pointsMap[t1] = { teamId: t1, played: 0, won: 0, lost: 0, tied: 0, points: 0 };
      if (!pointsMap[t2]) pointsMap[t2] = { teamId: t2, played: 0, won: 0, lost: 0, tied: 0, points: 0 };

      pointsMap[t1].played++;
      pointsMap[t2].played++;

      if (match.winnerId) {
        const winner = match.winnerId.toString();
        const loser = winner === t1 ? t2 : t1;
        pointsMap[winner].won++;
        pointsMap[winner].points += 2;
        pointsMap[loser].lost++;
      } else {
        // Tie
        pointsMap[t1].tied++;
        pointsMap[t1].points += 1;
        pointsMap[t2].tied++;
        pointsMap[t2].points += 1;
      }
    }

    // Sort: points desc, then won desc
    const pointsTable = Object.values(pointsMap).sort((a, b) =>
      b.points !== a.points ? b.points - a.points : b.won - a.won
    );

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

