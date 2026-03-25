import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { HiOutlineTrash, HiOutlineDownload, HiOutlineUpload } from 'react-icons/hi';

const TeamDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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



  const handleRemovePlayer = async (playerId) => {
    if (!confirm('Remove this player?')) return;
    try {
      await api.delete(`/teams/${id}/players/${playerId}`);
      fetchTeam();
    } catch (err) {
      alert('Failed to remove player');
    }
  };

  const handleDownloadTemplate = () => {
    const headers = 'name,role,battingStyle,bowlingStyle\n';
    const example = 'Virat Kohli,batsman,right-hand,NA\nJasprit Bumrah,bowler,right-hand,pace';
    const blob = new Blob([headers + example], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'player_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const lines = text.split('\n');
      const players = [];

      // Skip header
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const [name, role, battingStyle, bowlingStyle] = line.split(',').map(s => s?.trim());
        if (name && role) {
          players.push({ name, role, battingStyle, bowlingStyle });
        }
      }

      if (players.length === 0) {
        return alert('No valid player data found in CSV');
      }

      setSaving(true);
      try {
        await api.post(`/teams/${id}/players/upload`, { players });
        fetchTeam();
        alert(`${players.length} players uploaded successfully`);
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to upload players');
      } finally {
        setSaving(false);
        e.target.value = ''; // Reset file input
      }
    };
    reader.readAsText(file);
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
          <div className="flex items-center space-x-2">
            <button onClick={handleDownloadTemplate} className="btn-outline inline-flex items-center space-x-2 text-sm py-1.5">
              <HiOutlineDownload /> <span>Template</span>
            </button>
            {user && team.players.length < 11 && (
              <label className="btn-secondary inline-flex items-center space-x-2 text-sm py-1.5 cursor-pointer">
                <HiOutlineUpload /> <span>Upload CSV</span>
                <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
              </label>
            )}
          </div>
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


    </div>
  );
};

export default TeamDetailPage;
