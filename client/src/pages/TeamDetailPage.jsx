import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineX } from 'react-icons/hi';

const TeamDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [playerForm, setPlayerForm] = useState({
    name: '', role: 'batsman', battingStyle: 'right-hand', bowlingStyle: 'NA',
  });

  useEffect(() => { fetchTeam(); }, [id]);

  const fetchTeam = async () => {
    try {
      const res = await api.get(`/teams/${id}`);
      setTeam(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/teams/${id}/players`, playerForm);
      setShowModal(false);
      setPlayerForm({ name: '', role: 'batsman', battingStyle: 'right-hand', bowlingStyle: 'NA' });
      fetchTeam();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add player');
    } finally {
      setSaving(false);
    }
  };

  const handleRemovePlayer = async (playerId) => {
    if (!confirm('Remove this player?')) return;
    try {
      await api.delete(`/teams/${id}/players/${playerId}`);
      fetchTeam();
    } catch (err) {
      alert('Failed to remove player');
    }
  };

  const roleColors = {
    batsman: 'bg-primary/10 text-primary',
    bowler: 'bg-accent/10 text-accent',
    allrounder: 'bg-secondary/10 text-secondary',
    wicketkeeper: 'bg-warning/10 text-warning-dark',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!team) return <div className="card text-center py-12"><p className="text-txt-muted">Team not found</p></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-2xl font-bold">
            {team.teamName?.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-txt-primary">{team.teamName}</h1>
            <p className="text-txt-secondary text-sm">
              {team.tournamentId?.name || 'No tournament'} • {team.players?.length || 0}/11 players
            </p>
          </div>
        </div>
      </div>

      {/* Players List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-txt-primary">Squad</h2>
          {user && team.players.length < 11 && (
            <button onClick={() => setShowModal(true)} className="btn-primary inline-flex items-center space-x-2">
              <HiOutlinePlus /> <span>Add Player</span>
            </button>
          )}
        </div>

        {team.players?.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {team.players.map((player, idx) => (
              <div key={player._id} className="card flex items-center justify-between animate-slide-up"
                style={{ animationDelay: `${idx * 50}ms` }}>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center text-primary font-bold text-sm">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="font-medium text-txt-primary">{player.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`badge text-xs ${roleColors[player.role]}`}>{player.role}</span>
                      <span className="text-xs text-txt-muted">{player.battingStyle} bat</span>
                    </div>
                  </div>
                </div>
                {user && (
                  <button onClick={() => handleRemovePlayer(player._id)} 
                    className="p-2 text-txt-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-all">
                    <HiOutlineTrash />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center py-8">
            <p className="text-txt-muted">No players added yet.</p>
          </div>
        )}
      </div>

      {/* Add Player Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Add Player</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-surface rounded-lg">
                <HiOutlineX className="text-xl" />
              </button>
            </div>
            <form onSubmit={handleAddPlayer} className="space-y-4">
              <div>
                <label className="label">Player Name</label>
                <input value={playerForm.name} onChange={e => setPlayerForm({...playerForm, name: e.target.value})}
                  className="input" required placeholder="Virat Kohli" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Role</label>
                  <select value={playerForm.role} onChange={e => setPlayerForm({...playerForm, role: e.target.value})} className="input">
                    <option value="batsman">Batsman</option>
                    <option value="bowler">Bowler</option>
                    <option value="allrounder">All-rounder</option>
                    <option value="wicketkeeper">Wicket-keeper</option>
                  </select>
                </div>
                <div>
                  <label className="label">Batting Style</label>
                  <select value={playerForm.battingStyle} onChange={e => setPlayerForm({...playerForm, battingStyle: e.target.value})} className="input">
                    <option value="right-hand">Right Hand</option>
                    <option value="left-hand">Left Hand</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Bowling Style</label>
                <select value={playerForm.bowlingStyle} onChange={e => setPlayerForm({...playerForm, bowlingStyle: e.target.value})} className="input">
                  <option value="NA">N/A</option>
                  <option value="pace">Pace</option>
                  <option value="spin">Spin</option>
                </select>
              </div>
              <button type="submit" disabled={saving} className="btn-primary w-full py-2.5">
                {saving ? 'Adding...' : 'Add Player'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamDetailPage;
