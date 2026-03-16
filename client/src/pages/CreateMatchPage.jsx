import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { MdSportsCricket } from 'react-icons/md';

const CreateMatchPage = () => {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [form, setForm] = useState({
    tournamentId: '', team1Id: '', team2Id: '', matchDate: '', venue: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Calculate current date and time in the correct local format for the min attribute
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  const currentDateTime = now.toISOString().slice(0, 16);

  useEffect(() => {
    api.get('/tournaments').then(res => setTournaments(res.data.data)).catch(console.error);
  }, []);

  useEffect(() => {
    if (form.tournamentId) {
      api.get(`/teams?tournamentId=${form.tournamentId}`)
        .then(res => setTeams(res.data.data))
        .catch(console.error);
    } else {
      setTeams([]);
    }
  }, [form.tournamentId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.team1Id === form.team2Id) {
      return setError('Team 1 and Team 2 cannot be the same');
    }

    // Frontend Date Validation
    const selectedDate = new Date(form.matchDate);
    const currentDate = new Date();
    
    // We allow a 5 minute grace period for "current time" selections
    currentDate.setMinutes(currentDate.getMinutes() - 5);

    if (selectedDate < currentDate) {
      return setError('Match cannot be scheduled in the past. Please select the current time or a future time.');
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
            <label className="label">Tournament</label>
            <select value={form.tournamentId}
              onChange={e => setForm({ ...form, tournamentId: e.target.value, team1Id: '', team2Id: '' })}
              className="input" required>
              <option value="">Select tournament</option>
              {tournaments.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Team 1</label>
              <select value={form.team1Id} onChange={e => setForm({...form, team1Id: e.target.value})}
                className="input" required disabled={!form.tournamentId}>
                <option value="">Select team</option>
                {teams.filter(t => t._id !== form.team2Id).map(t => (
                  <option key={t._id} value={t._id}>{t.teamName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Team 2</label>
              <select value={form.team2Id} onChange={e => setForm({...form, team2Id: e.target.value})}
                className="input" required disabled={!form.tournamentId}>
                <option value="">Select team</option>
                {teams.filter(t => t._id !== form.team1Id).map(t => (
                  <option key={t._id} value={t._id}>{t.teamName}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Match Date & Time</label>
              <input type="datetime-local" value={form.matchDate}
                min={currentDateTime}
                onChange={e => setForm({...form, matchDate: e.target.value})}
                className="input" required />
            </div>
            <div>
              <label className="label">Venue</label>
              <input value={form.venue} onChange={e => setForm({...form, venue: e.target.value})}
                className="input" placeholder="Wankhede Stadium" required />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1 py-2.5">
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
