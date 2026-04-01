const Team = require('../models/Team');
const Player = require('../models/Player');
const Tournament = require('../models/Tournament');

// @desc    Create team and optionally link to a tournament
// @route   POST /api/teams
exports.createTeam = async (req, res) => {
  try {
    const { teamName, tournamentId, captainId, logoURL } = req.body;

    // 1. Find if team already exists for this user globally
    let team = await Team.findOne({ createdBy: req.user.id, teamName: teamName.trim() });

    if (!team) {
      // 2. Create if not exists
      team = await Team.create({
        teamName: teamName.trim(),
        tournamentIds: tournamentId ? [tournamentId] : [],
        captainId: captainId || req.user.id,
        createdBy: req.user.id,
        logoURL,
      });
    } else {
      // 3. If exists, just add the new tournamentId if provided
      if (tournamentId && !team.tournamentIds.map(id => id.toString()).includes(tournamentId.toString())) {
        team.tournamentIds.push(tournamentId);
        await team.save();
      }
    }

    // 4. Update tournament to include this team
    if (tournamentId) {
      await Tournament.findByIdAndUpdate(tournamentId, {
        $addToSet: { teams: team._id }
      });
    }

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
        path: 'tournamentIds',
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
      filter.tournamentIds = req.query.tournamentId;
    }
    const teams = await Team.find(filter)
      .populate('players')
      .populate('captainId', 'name email')
      .populate('createdBy', 'name email')
      .populate({
        path: 'tournamentIds',
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
        { tournamentIds: { $in: tournamentIds } },
      ],
    })
      .sort({ createdAt: -1 })
      .populate('players')
      .populate('captainId', 'name email')
      .populate('createdBy', 'name email')
      .populate({
        path: 'tournamentIds',
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

// @desc    Link an existing global team to a tournament (No longer clones records)
// @route   POST /api/teams/link
exports.linkTeam = async (req, res) => {
  try {
    const { sourceTeamId, targetTournamentId } = req.body;

    const sourceTeam = await Team.findById(sourceTeamId);
    if (!sourceTeam) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    const targetTournament = await Tournament.findById(targetTournamentId);
    if (!targetTournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    // Check user owns target tournament
    if (targetTournament.organizerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Strict validation: Team MUST match the tournament's playersPerTeam requirement
    const requiredPlayers = targetTournament.playersPerTeam || 11;
    if (sourceTeam.players.length !== requiredPlayers) {
      return res.status(400).json({ 
        success: false, 
        message: `Team "${sourceTeam.teamName}" has ${sourceTeam.players.length} players, but this tournament requires exactly ${requiredPlayers} players per team. Please edit the team to match the requirement before linking.` 
      });
    }

    // 1. Link team to tournament (avoid duplicates)
    if (!sourceTeam.tournamentIds.map(id => id.toString()).includes(targetTournamentId)) {
      sourceTeam.tournamentIds.push(targetTournamentId);
      await sourceTeam.save();
    }

    // 2. Link tournament to team (avoid duplicates)
    await Tournament.findByIdAndUpdate(targetTournamentId, {
      $addToSet: { teams: sourceTeamId }
    });

    res.status(200).json({ success: true, message: "Team linked successfully", data: sourceTeam });
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
        path: 'tournamentIds',
        populate: {
          path: 'organizerId'
        }
      });
    
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    // Check if user is the team creator or any tournament organizer
    const isTeamCreator = team.createdBy && (team.createdBy._id.toString() === req.user.id || team.createdBy._id.toString() === req.user._id);
    const isAnyTournamentOrganizer = team.tournamentIds.some(t => t.organizerId && (t.organizerId._id.toString() === req.user.id || t.organizerId._id.toString() === req.user._id));

    if (!isTeamCreator && !isAnyTournamentOrganizer) {
      return res.status(403).json({ success: false, message: 'No permission' });
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
        path: 'tournamentIds',
        populate: {
          path: 'organizerId'
        }
      });
    
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    // Check if user is the team creator or any tournament organizer
    const isTeamCreator = team.createdBy && (team.createdBy._id.toString() === req.user.id || team.createdBy._id.toString() === req.user._id);
    const isAnyTournamentOrganizer = team.tournamentIds.some(t => t.organizerId && (t.organizerId._id.toString() === req.user.id || t.organizerId._id.toString() === req.user._id));

    if (!isTeamCreator && !isAnyTournamentOrganizer) {
      return res.status(403).json({ success: false, message: 'No permission' });
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

    // Validate: cannot delete if used in tournaments
    if (team.tournamentIds && team.tournamentIds.length > 0) {
      return res.status(400).json({ success: false, message: `Cannot delete team "${team.teamName}" because it is currently linked to ${team.tournamentIds.length} tournament(s). Unlink it from all tournaments first.` });
    }

    // Verify ownership
    if (team.createdBy.toString() !== req.user.id) {
       return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const mongoose = require('mongoose');
    const Player = mongoose.model('Player');

    // Delete all players associated with this team
    if (team.players && team.players.length > 0) {
      await Player.deleteMany({ _id: { $in: team.players } });
    }

    // Final global delete
    await Team.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Team deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Unlink a team from a specific tournament
// @route   POST /api/teams/:id/unlink
exports.unlinkTeam = async (req, res) => {
  try {
    const { tournamentId } = req.body;
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found' });

    // Check authorization (Tournament organizer or Team creator)
    if (tournament.organizerId.toString() !== req.user.id && team.createdBy.toString() !== req.user.id) {
       return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // 1. Remove tournament from team
    team.tournamentIds = team.tournamentIds.filter(id => id.toString() !== tournamentId);
    await team.save();

    // 2. Remove team from tournament
    await Tournament.findByIdAndUpdate(tournamentId, {
      $pull: { teams: team._id }
    });

    res.json({ success: true, message: 'Team unlinked from tournament' });
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
      .populate('players') // Populate players to check for duplicates
      .populate({
        path: 'tournamentIds',
        populate: {
          path: 'organizerId'
        }
      });
    
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    // Check if user is the team creator or any tournament organizer
    const isTeamCreator = team.createdBy && (team.createdBy._id.toString() === req.user.id || team.createdBy._id.toString() === req.user._id);
    const isAnyTournamentOrganizer = team.tournamentIds.some(t => t.organizerId && (t.organizerId._id.toString() === req.user.id || t.organizerId._id.toString() === req.user._id));

    if (!isTeamCreator && !isAnyTournamentOrganizer) {
      return res.status(403).json({ success: false, message: 'No permission' });
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
      let r = (role || '').toLowerCase().trim();
      if (r.includes('wicket') || r === 'wk' || r === 'keeper') r = 'wicketkeeper';
      else if (r.includes('all')) r = 'allrounder';
      else if (r.includes('bat')) r = 'batsman';
      else if (r.includes('bowl')) r = 'bowler';
      else r = 'batsman'; // Default to batsman if unknown

      // Duplicate check (by name, case-insensitive)
      const isDuplicate = team.players.some(p => p.name?.toLowerCase() === name.trim().toLowerCase());
      if (isDuplicate) {
         continue; // Skip duplicates silently or handle as error
      }

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
