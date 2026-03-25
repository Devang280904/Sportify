const Team = require('../models/Team');
const Player = require('../models/Player');
const Tournament = require('../models/Tournament');

// @desc    Create team
// @route   POST /api/teams
exports.createTeam = async (req, res) => {
  try {
    const { teamName, tournamentId, captainId, logoURL } = req.body;

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    const team = await Team.create({
      teamName,
      tournamentId,
      captainId: captainId || req.user.id,
      logoURL,
    });

    // Add team to tournament
    tournament.teams.push(team._id);
    await tournament.save();

    res.status(201).json({ success: true, data: team });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get team by ID
// @route   GET /api/teams/:id
exports.getTeam = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('players')
      .populate('captainId', 'name email')
      .populate('tournamentId', 'name');
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }
    res.json({ success: true, data: team });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all teams (optionally filtered by tournament)
// @route   GET /api/teams
exports.getTeams = async (req, res) => {
  try {
    const filter = {};
    if (req.query.tournamentId) {
      filter.tournamentId = req.query.tournamentId;
    }
    const teams = await Team.find(filter)
      .populate('players')
      .populate('captainId', 'name email')
      .populate('tournamentId', 'name');
    res.json({ success: true, data: teams });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add player to team
// @route   POST /api/teams/:id/players
exports.addPlayer = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    if (team.players.length >= 11) {
      return res.status(400).json({ success: false, message: 'Team already has 11 players' });
    }

    const { name, role, battingStyle, bowlingStyle } = req.body;
    const player = await Player.create({
      name,
      role,
      battingStyle,
      bowlingStyle,
      teamId: team._id,
    });

    team.players.push(player._id);
    team.playerNumber = team.players.length;
    await team.save();

    res.status(201).json({ success: true, data: player });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Remove player from team
// @route   DELETE /api/teams/:id/players/:playerId
exports.removePlayer = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    team.players = team.players.filter(p => p.toString() !== req.params.playerId);
    team.playerNumber = team.players.length;
    await team.save();

    await Player.findByIdAndDelete(req.params.playerId);

    res.json({ success: true, message: 'Player removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete team
// @route   DELETE /api/teams/:id
exports.deleteTeam = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    // Verify ownership or admin
    const tournament = await Tournament.findById(team.tournamentId);
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Associated tournament not found' });
    }

    if (tournament.organizerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this team' });
    }

    const mongoose = require('mongoose');
    const Player = mongoose.model('Player');
    const Match = mongoose.model('Match');
    const ScoreRecord = mongoose.model('ScoreRecord');

    // Remove the team from the tournament's teams array
    await Tournament.findByIdAndUpdate(team.tournamentId, {
      $pull: { teams: team._id }
    });

    // Delete all players associated with this team
    if (team.players && team.players.length > 0) {
      await Player.deleteMany({ _id: { $in: team.players } });
    }

    // Delete matches and their score records where this team is playing
    const matches = await Match.find({ $or: [{ team1Id: team._id }, { team2Id: team._id }] });
    const matchIds = matches.map(m => m._id);

    if (matchIds.length > 0) {
      // Delete ScoreRecords for these matches
      await ScoreRecord.deleteMany({ matchId: { $in: matchIds } });
      // Delete the matches themselves
      await Match.deleteMany({ _id: { $in: matchIds } });
    }

    // Delete all ScoreRecords specifically mapped to this team 
    // (belt and suspenders, though the above match block handles it)
    await ScoreRecord.deleteMany({ teamId: team._id });

    // Delete the team
    await Team.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Team and perfectly associated players/matches deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
