import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { HiOutlineTrash, HiOutlineDownload, HiOutlineUpload, HiOutlineUserAdd, HiOutlineX } from 'react-icons/hi';

const TeamDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Manual Player Add States
  const [showManualForm, setShowManualForm] = useState(false);
  const [playerForm, setPlayerForm] = useState({
    name: '',
    role: 'batsman',
    battingStyle: 'Right handed',
    bowlingStyle: 'NA'
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

  const handleRemovePlayer = async (playerId) => {
    if (!confirm('Remove this player?')) return;
    try {
      await api.delete(`/teams/${id}/players/${playerId}`);
      fetchTeam();
    } catch (err) {
      alert('Failed to remove player');
    }
  };

  const handleAddManualPlayer = async (e) => {
    e.preventDefault();
    if (team.players.length >= 11) return alert('Team already has 11 players');
    
    setSaving(true);
    try {
      await api.post(`/teams/${id}/players`, playerForm);
      setPlayerForm({ name: '', role: 'batsman', battingStyle: 'Right handed', bowlingStyle: 'NA' });
      setShowManualForm(false);
      fetchTeam();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add player');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadTemplate = () => {
    const headers = 'name,role,battingStyle,bowlingStyle\n';
    const examplePlayers = [
      'Virat Kohli,batsman,Right handed,NA',
      'Rohit Sharma,batsman,Right handed,NA',
      'Jasprit Bumrah,bowler,Right handed,right arm pacer',
      'MS Dhoni,wicketkeeper,Right handed,NA',
      'Ravindra Jadeja,allrounder,Left handed,left arm spinner',
      'KL Rahul,wicketkeeper,Right handed,NA',
      'Hardik Pandya,allrounder,Right handed,right arm pacer',
      'Mohammed Shami,bowler,Right handed,right arm pacer',
      'Rishabh Pant,wicketkeeper,Left handed,NA',
      'Suryakumar Yadav,batsman,Right handed,NA',
      'Yuzvendra Chahal,bowler,Right handed,right arm spinner'
    ];
    const blob = new Blob([headers + examplePlayers.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'team_squad_template.csv';
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

  // Check if user owns this team
  const isTeamOwner = user && (user._id === team.createdBy?._id || user._id === team.createdBy || user.id === team.createdBy?._id || user.id === team.createdBy);
  const isTournamentOrganizer = user && (user._id === team.tournamentId?.organizerId?._id || user.id === team.tournamentId?.organizerId?._id || user._id === team.tournamentId?.organizerId || user.id === team.tournamentId?.organizerId);
  const canEdit = isTeamOwner || isTournamentOrganizer;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card bg-gradient-to-r from-surface-card to-primary/5">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-2xl font-bold shadow-lg">
            {team.teamName?.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-txt-primary">{team.teamName}</h1>
            <p className="text-txt-secondary text-sm">
              {team.tournamentId?.name || 'No tournament'} • <span className={team.players?.length >= 11 ? 'text-accent font-bold' : 'text-txt-muted'}>{team.players?.length || 0}/11 players</span>
            </p>
          </div>
        </div>
      </div>

      {/* Players List Section */}
      <div className="animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h2 className="text-lg font-bold text-txt-primary">Squad Management {!canEdit && <span className="text-xs text-txt-muted font-normal ml-2">(View Only)</span>}</h2>
          <div className="flex items-center gap-2">
            {canEdit && user && team.players.length < 11 && (
              <button 
                onClick={() => setShowManualForm(!showManualForm)}
                className={`btn-primary flex items-center space-x-2 text-sm transition-all ${showManualForm ? 'bg-danger hover:bg-danger-dark focus:ring-danger' : ''}`}
              >
                {showManualForm ? <><HiOutlineX /> <span>Cancel</span></> : <><HiOutlineUserAdd /> <span>Add Manually</span></>}
              </button>
            )}
            <div className="h-8 w-[1px] bg-surface-border mx-1 hidden sm:block"></div>
            <button onClick={handleDownloadTemplate} className="btn-outline inline-flex items-center space-x-2 text-sm py-2">
              <HiOutlineDownload /> <span>Download Template (11 Rows)</span>
            </button>
            {canEdit && user && team.players.length < 11 && (
              <label className="btn-secondary inline-flex items-center space-x-2 text-sm py-2 cursor-pointer transition-all hover:shadow-lg">
                <HiOutlineUpload /> <span>CSV Upload</span>
                <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
              </label>
            )}
          </div>
        </div>

        {/* Manual Add Form Overlay/Section */}
        {showManualForm && canEdit && (
          <div className="card border-primary/30 bg-primary/5 animate-slide-up mb-6">
            <h3 className="text-md font-bold text-primary mb-4 flex items-center gap-2">
              <HiOutlineUserAdd /> Add New Player
            </h3>
            <form onSubmit={handleAddManualPlayer} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="label">Player Name</label>
                  <input 
                    value={playerForm.name} 
                    onChange={e => setPlayerForm({...playerForm, name: e.target.value})}
                    className="input" placeholder="e.g. Virat Kohli" required 
                  />
                </div>
                <div>
                  <label className="label">Role</label>
                  <select 
                    value={playerForm.role}
                    onChange={e => setPlayerForm({...playerForm, role: e.target.value})}
                    className="input"
                  >
                    <option value="batsman">Batsman</option>
                    <option value="bowler">Bowler</option>
                    <option value="allrounder">All-Rounder</option>
                    <option value="wicketkeeper">Wicket-Keeper</option>
                  </select>
                </div>
              </div>

              {/* Batting Style - Show for Batsman, Wicket-keeper, and All-rounder */}
              {['batsman', 'wicketkeeper', 'allrounder'].includes(playerForm.role) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="label">Batting Style</label>
                    <select 
                      value={playerForm.battingStyle}
                      onChange={e => setPlayerForm({...playerForm, battingStyle: e.target.value})}
                      className="input"
                    >
                      <option value="Right handed">Right handed</option>
                      <option value="Left handed">Left handed</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Bowling Style - Show for Bowler and All-rounder */}
              {['bowler', 'allrounder'].includes(playerForm.role) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="label">Bowling Style</label>
                    <select 
                      value={playerForm.bowlingStyle}
                      onChange={e => setPlayerForm({...playerForm, bowlingStyle: e.target.value})}
                      className="input"
                    >
                      <option value="left arm spinner">Left arm spinner</option>
                      <option value="right arm spinner">Right arm spinner</option>
                      <option value="left arm pacer">Left arm pacer</option>
                      <option value="right arm pacer">Right arm pacer</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button type="submit" disabled={saving || !playerForm.name} className="btn-primary py-2.5 px-6">
                  {saving ? 'Adding...' : 'Add to Squad'}
                </button>
              </div>
            </form>
          </div>
        )}

        {team.players?.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {team.players.map((player, idx) => (
              <div key={player._id} className="card flex items-center justify-between hover:border-primary/40 transition-all animate-slide-up group"
                style={{ animationDelay: `${idx * 50}ms` }}>
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-full bg-surface border border-surface-border flex items-center justify-center text-primary font-bold text-xs">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-txt-primary truncate max-w-[150px]">{player.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${roleColors[player.role]}`}>{player.role}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-txt-muted whitespace-nowrap hidden group-hover:block transition-all">
                    {['batsman', 'wicketkeeper', 'allrounder'].includes(player.role) && player.battingStyle}
                    {player.role === 'allrounder' && player.battingStyle && player.bowlingStyle && ' • '}
                    {['bowler', 'allrounder'].includes(player.role) && player.bowlingStyle !== 'NA' && player.bowlingStyle}
                  </span>
                  {canEdit && user && (
                    <button onClick={() => handleRemovePlayer(player._id)} 
                      className="p-2 text-txt-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-all"
                      title="Remove Player">
                      <HiOutlineTrash />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center py-12 bg-surface/50 border-dashed">
            <HiOutlineUserAdd className="text-4xl text-txt-muted mx-auto mb-3 opacity-20" />
            <p className="text-txt-muted">Your squad is empty. Add players to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamDetailPage;
