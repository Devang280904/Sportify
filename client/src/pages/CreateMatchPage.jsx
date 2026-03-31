import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { MdSportsCricket } from 'react-icons/md';

const CreateMatchPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [form, setForm] = useState({
    tournamentId: '', team1Id: '', team2Id: '', matchDate: '', venue: '', totalOvers: 20, playersPerTeam: 11
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Get team details by ID
  const getTeamDetails = (teamId) => {
    return teams.find(t => t._id === teamId);
  };

  // Get required players count dynamically
  const getRequiredPlayers = () => {
    if (selectedTournament && selectedTournament.playersPerTeam) {
      return selectedTournament.playersPerTeam;
    }
    return form.playersPerTeam || 11;
  };

  // Check if team has the required amount of players
  const hasCompleteSquad = (teamId) => {
    const team = getTeamDetails(teamId);
    return team && team.players && team.players.length === getRequiredPlayers();
  };

  // Get player count for display
  const getPlayerCount = (teamId) => {
    const team = getTeamDetails(teamId);
    return team ? (team.players?.length || 0) : 0;
  };

  // Calculate current date and time in the correct local format for the min attribute
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  const currentDateTime = now.toISOString().slice(0, 16);

  // Calculate min/max datetime based on selected tournament
  const getMinMaxDateTime = () => {
    if (!selectedTournament) {
      return { min: currentDateTime, max: '' };
    }

    const tourStart = new Date(selectedTournament.startDate);
    tourStart.setHours(0, 0, 0, 0);
    tourStart.setMinutes(tourStart.getMinutes() - tourStart.getTimezoneOffset());
    
    const tourEnd = new Date(selectedTournament.endDate);
    tourEnd.setHours(23, 59, 59, 999);
    tourEnd.setMinutes(tourEnd.getMinutes() - tourEnd.getTimezoneOffset());

    // Use the later of tournament start or current time
    const minDate = tourStart > now ? tourStart : now;
    const minDateTime = minDate.toISOString().slice(0, 16);
    const maxDateTime = tourEnd.toISOString().slice(0, 16);

    return { min: minDateTime, max: maxDateTime };
  };

  const { min: minDateTime, max: maxDateTime } = getMinMaxDateTime();

  useEffect(() => {
    api.get('/tournaments')
      .then(res => {
        // Only allow creating matches in tournaments owned by the current user
        const ownedTournaments = res.data.data.filter(t => {
          const orgId = t.organizerId?._id || t.organizerId;
          return orgId === user?._id || orgId === user?.id;
        });
        setTournaments(ownedTournaments);
      })
      .catch(console.error);
  }, [user]);

  useEffect(() => {
    if (form.tournamentId) {
      // Find and set the selected tournament
      const tournament = tournaments.find(t => t._id === form.tournamentId);
      setSelectedTournament(tournament);
      
      api.get(`/teams?tournamentId=${form.tournamentId}`)
        .then(res => setTeams(res.data.data))
        .catch(console.error);
    } else {
      setSelectedTournament(null);
      api.get('/teams/my-teams')
        .then(res => setTeams(res.data.data))
        .catch(console.error);
    }
  }, [form.tournamentId, tournaments]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.team1Id === form.team2Id) {
      return setError('Team 1 and Team 2 cannot be the same');
    }

    // Check if both teams have 11 players
    const team1 = getTeamDetails(form.team1Id);
    const team2 = getTeamDetails(form.team2Id);
    // Validation removed as per user request to allow more flexibility during testing/setup
    // But we still require team selection
    if (!form.team1Id || !form.team2Id) {
      return setError('Please select both teams');
    }
    
    /* Previous strict 11-player constraint was here */

    // Frontend Date Validation
    const selectedDate = new Date(form.matchDate);
    const currentDate = new Date();
    
    // We allow a 5 minute grace period for "current time" selections
    currentDate.setMinutes(currentDate.getMinutes() - 5);

    if (selectedDate < currentDate) {
      return setError('Match cannot be scheduled in the past. Please select the current time or a future time.');
    }

    // Tournament date range validation
    if (selectedTournament) {
      const tourStart = new Date(selectedTournament.startDate);
      tourStart.setHours(0, 0, 0, 0);
      const tourEnd = new Date(selectedTournament.endDate);
      tourEnd.setHours(23, 59, 59, 999);

      if (selectedDate < tourStart) {
        return setError(`Match date cannot be before tournament start date (${new Date(selectedTournament.startDate).toLocaleDateString()})`);
      }

      if (selectedDate > tourEnd) {
        return setError(`Match date cannot be after tournament end date (${new Date(selectedTournament.endDate).toLocaleDateString()})`);
      }
    }

    setSaving(true);
    try {
      const res = await api.post('/matches', form);
      navigate(`/match/${res.data.data._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create match');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <MdSportsCricket className="text-xl text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-txt-primary">Create Match</h1>
            <p className="text-sm text-txt-muted">Schedule a new cricket match</p>
          </div>
        </div>

        {error && (
          <div className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-lg p-3 mb-4 animate-fade-in">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label">Tournament (Optional)</label>
            <select value={form.tournamentId}
              onChange={e => setForm({ ...form, tournamentId: e.target.value, team1Id: '', team2Id: '' })}
              className="input">
              <option value="">No Tournament (Independent Match)</option>
              {tournaments.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
            </select>
          </div>

          {!form.tournamentId && (
            <div>
              <label className="label">Exact Players Required</label>
              <input type="number" min="2" max="11" value={form.playersPerTeam} onChange={e => setForm({ ...form, playersPerTeam: Number(e.target.value) })}
                className="input" required />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Team 1</label>
              <select value={form.team1Id} onChange={e => setForm({...form, team1Id: e.target.value})}
                className="input" required>
                <option value="">Select team</option>
                {teams.filter(t => t._id !== form.team2Id).map(t => {
                  const playerCount = t.players?.length || 0;
                  const req = getRequiredPlayers();
                  const isComplete = playerCount === req;
                  return (
                    <option key={t._id} value={t._id}>
                      {t.teamName} ({playerCount}/{req}) {isComplete ? '✓' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="label">Team 2</label>
              <select value={form.team2Id} onChange={e => setForm({...form, team2Id: e.target.value})}
                className="input" required>
                <option value="">Select team</option>
                {teams.filter(t => t._id !== form.team1Id).map(t => {
                  const playerCount = t.players?.length || 0;
                  const req = getRequiredPlayers();
                  const isComplete = playerCount === req;
                  return (
                    <option key={t._id} value={t._id}>
                      {t.teamName} ({playerCount}/{req}) {isComplete ? '✓' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Match Date & Time</label>
              <input type="datetime-local" value={form.matchDate}
                min={minDateTime}
                max={maxDateTime}
                onChange={e => setForm({...form, matchDate: e.target.value})}
                className="input" required />
            </div>
            <div>
              <label className="label">Venue</label>
              <input value={form.venue} onChange={e => setForm({...form, venue: e.target.value})}
                className="input" placeholder="Wankhede Stadium" required />
            </div>
            <div>
              <label className="label">Overs</label>
              <select value={form.totalOvers} onChange={e => setForm({...form, totalOvers: Number(e.target.value)})}
                className="input" required>
                <option value={5}>5 Overs</option>
                <option value={10}>10 Overs</option>
                <option value={20}>20 Overs (T20)</option>
                <option value={50}>50 Overs (ODI)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={saving || !hasCompleteSquad(form.team1Id) || !hasCompleteSquad(form.team2Id)} className="btn-primary flex-1 py-2.5" title={!hasCompleteSquad(form.team1Id) || !hasCompleteSquad(form.team2Id) ? `Both teams must have ${getRequiredPlayers()} players` : ''}>
              {saving ? 'Creating...' : 'Create Match'}
            </button>
            <button type="button" onClick={() => navigate(-1)} className="btn-outline py-2.5 px-6">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateMatchPage;
