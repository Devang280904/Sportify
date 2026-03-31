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
      createdBy: req.user.id,
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
      .populate('createdBy', 'name email')
      .populate({
        path: 'tournamentId',
        select: 'name organizerId',
        populate: {
          path: 'organizerId',
          select: 'name email'
        }
      });
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
      .populate('createdBy', 'name email')
      .populate({
        path: 'tournamentId',
        select: 'name organizerId',
        populate: {
          path: 'organizerId',
          select: 'name email'
        }
      });
    res.json({ success: true, data: teams });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all teams created by current user (across all tournaments)
// @route   GET /api/teams/my-teams
exports.getMyTeams = async (req, res) => {
  try {
    // Find tournaments organized by this user
    const myTournaments = await Tournament.find({ organizerId: req.user.id }).select('_id');
    const tournamentIds = myTournaments.map(t => t._id);

    // Find all teams in those tournaments OR explicitly created by this user
    // Sort by createdAt desc so most recent versions are picked first
    const teams = await Team.find({
      $or: [
        { createdBy: req.user.id },
        { tournamentId: { $in: tournamentIds } },
      ],
    })
      .sort({ createdAt: -1 })
      .populate('players')
      .populate('captainId', 'name email')
      .populate('createdBy', 'name email')
      .populate({
        path: 'tournamentId',
        select: 'name organizerId',
        populate: {
          path: 'organizerId',
          select: 'name email'
        }
      });

    // Deduplicate by teamName (case insensitive)
    const seenNames = new Set();
    const uniqueTeams = teams.filter(team => {
      if (!team.teamName) return false;
      const lowerName = team.teamName.toLowerCase().trim();
      if (seenNames.has(lowerName)) return false;
      seenNames.add(lowerName);
      return true;
    });

    res.json({ success: true, data: uniqueTeams });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Clone an existing team (with players) into a different tournament
// @route   POST /api/teams/clone
exports.cloneTeam = async (req, res) => {
  try {
    const { sourceTeamId, targetTournamentId } = req.body;

    const sourceTeam = await Team.findById(sourceTeamId).populate('players');
    if (!sourceTeam) {
      return res.status(404).json({ success: false, message: 'Source team not found' });
    }

    const targetTournament = await Tournament.findById(targetTournamentId);
    if (!targetTournament) {
      return res.status(404).json({ success: false, message: 'Target tournament not found' });
    }

    // Check user owns target tournament
    if (targetTournament.organizerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to add teams to this tournament' });
    }

    // Check if a team with same name already exists in target tournament
    const existing = await Team.findOne({ teamName: sourceTeam.teamName, tournamentId: targetTournamentId });
    if (existing) {
      return res.status(400).json({ success: false, message: `Team "${sourceTeam.teamName}" already exists in this tournament` });
    }

    // Create the cloned team
    const clonedTeam = await Team.create({
      teamName: sourceTeam.teamName,
      tournamentId: targetTournamentId,
      captainId: req.user.id,
      createdBy: req.user.id,
      logoURL: sourceTeam.logoURL,
    });

    // Clone players
    const clonedPlayerIds = [];
    for (const player of sourceTeam.players) {
      const clonedPlayer = await Player.create({
        name: player.name,
        role: player.role,
        battingStyle: player.battingStyle,
        bowlingStyle: player.bowlingStyle,
        teamId: clonedTeam._id,
      });
      clonedPlayerIds.push(clonedPlayer._id);
    }

    clonedTeam.players = clonedPlayerIds;
    clonedTeam.playerNumber = clonedPlayerIds.length;
    await clonedTeam.save();

    // Add team to tournament
    targetTournament.teams.push(clonedTeam._id);
    await targetTournament.save();

    // Return populated team
    const populated = await Team.findById(clonedTeam._id)
      .populate('players')
      .populate('captainId', 'name email')
      .populate('tournamentId', 'name');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add player to team
// @route   POST /api/teams/:id/players
exports.addPlayer = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('createdBy')
      .populate({
        path: 'tournamentId',
        populate: {
          path: 'organizerId'
        }
      });
    
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    // Check if user is the team creator or tournament organizer
    const isTeamCreator = team.createdBy && (team.createdBy._id.toString() === req.user.id || team.createdBy._id.toString() === req.user._id);
    const isTournamentOrganizer = team.tournamentId.organizerId && (team.tournamentId.organizerId._id.toString() === req.user.id || team.tournamentId.organizerId._id.toString() === req.user._id);

    if (!isTeamCreator && !isTournamentOrganizer) {
      return res.status(403).json({ success: false, message: 'You do not have permission to add players to this team' });
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
    const team = await Team.findById(req.params.id)
      .populate('createdBy')
      .populate({
        path: 'tournamentId',
        populate: {
          path: 'organizerId'
        }
      });
    
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    // Check if user is the team creator or tournament organizer
    const isTeamCreator = team.createdBy && (team.createdBy._id.toString() === req.user.id || team.createdBy._id.toString() === req.user._id);
    const isTournamentOrganizer = team.tournamentId.organizerId && (team.tournamentId.organizerId._id.toString() === req.user.id || team.tournamentId.organizerId._id.toString() === req.user._id);

    if (!isTeamCreator && !isTournamentOrganizer) {
      return res.status(403).json({ success: false, message: 'You do not have permission to remove players from this team' });
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
// @desc    Upload players to team
// @route   POST /api/teams/:id/players/upload
exports.uploadPlayers = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('createdBy')
      .populate({
        path: 'tournamentId',
        populate: {
          path: 'organizerId'
        }
      });
    
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    // Check if user is the team creator or tournament organizer
    const isTeamCreator = team.createdBy && (team.createdBy._id.toString() === req.user.id || team.createdBy._id.toString() === req.user._id);
    const isTournamentOrganizer = team.tournamentId.organizerId && (team.tournamentId.organizerId._id.toString() === req.user.id || team.tournamentId.organizerId._id.toString() === req.user._id);

    if (!isTeamCreator && !isTournamentOrganizer) {
      return res.status(403).json({ success: false, message: 'You do not have permission to upload players to this team' });
    }

    const { players } = req.body;
    if (!players || !Array.isArray(players)) {
      return res.status(400).json({ success: false, message: 'Invalid player data' });
    }

    if (team.players.length + players.length > 11) {
      return res.status(400).json({ success: false, message: `Uploading ${players.length} players would exceed the 11-player limit (Current: ${team.players.length})` });
    }

    const newPlayers = [];
    for (const pData of players) {
      const { name, role, battingStyle, bowlingStyle } = pData;
      
      // Basic validation
      if (!name || !role) {
        return res.status(400).json({ success: false, message: 'Name and role are required for all players' });
      }

      // Robust mapping for batting style
      let bStyle = 'Right handed';
      if (battingStyle && battingStyle.toLowerCase().includes('left')) bStyle = 'Left handed';
      else if (battingStyle && battingStyle.toLowerCase().includes('right')) bStyle = 'Right handed';

      // Robust mapping for bowling style
      let boStyle = 'NA';
      const boLower = (bowlingStyle || '').toLowerCase();
      if (boLower.includes('left') && boLower.includes('spin')) boStyle = 'left arm spinner';
      else if (boLower.includes('right') && boLower.includes('spin')) boStyle = 'right arm spinner';
      else if (boLower.includes('left') && (boLower.includes('pace') || boLower.includes('fast'))) boStyle = 'left arm pacer';
      else if (boLower.includes('right') && (boLower.includes('pace') || boLower.includes('fast'))) boStyle = 'right arm pacer';
      else if (boLower.includes('spin')) boStyle = 'right arm spinner'; // Default spinner to right arm
      else if (boLower.includes('fast') || boLower.includes('pace')) boStyle = 'right arm pacer'; // Default pacer to right arm

      // Robust mapping for role
      let r = role.toLowerCase().trim();
      if (r.includes('wicket') || r === 'wk' || r === 'keeper') r = 'wicketkeeper';
      else if (r.includes('all')) r = 'allrounder';
      else if (r.includes('bat')) r = 'batsman';
      else if (r.includes('bowl')) r = 'bowler';

      const player = await Player.create({
        name,
        role: r,
        battingStyle: bStyle,
        bowlingStyle: boStyle,
        teamId: team._id,
      });
      newPlayers.push(player._id);
    }

    team.players.push(...newPlayers);
    team.playerNumber = team.players.length;
    await team.save();

    res.status(201).json({ success: true, message: `${players.length} players uploaded successfully` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
