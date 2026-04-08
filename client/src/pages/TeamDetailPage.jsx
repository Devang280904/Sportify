import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { HiOutlineTrash, HiOutlineDownload, HiOutlineUpload, HiOutlineUserAdd, HiOutlineX, HiOutlineInformationCircle, HiOutlinePencil, HiOutlineCheck } from 'react-icons/hi';
import CustomDialog from '../components/CustomDialog';

const TeamDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showTournamentInfo, setShowTournamentInfo] = useState(false);
  
  // Custom Dialog States
  const [dialog, setDialog] = useState({ isOpen: false, title: '', message: '', type: 'confirm', onConfirm: () => {} });

  // Edit Team States
  const [showEditTeam, setShowEditTeam] = useState(false);
  const [editTeamName, setEditTeamName] = useState('');
  const [showDeletePlayerModal, setShowDeletePlayerModal] = useState(null);

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

  const handleRemovePlayer = (playerId) => {
    setDialog({
      isOpen: true,
      title: 'Remove Player?',
      message: 'Are you sure you want to remove this player from the squad?',
      type: 'danger',
      onConfirm: async () => {
        try {
          await api.delete(`/teams/${id}/players/${playerId}`);
          fetchTeam();
          setDialog(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          setDialog({
            isOpen: true,
            title: 'Error',
            message: 'Failed to remove player from squad',
            type: 'alert',
            onConfirm: () => setDialog(prev => ({ ...prev, isOpen: false }))
          });
        }
      }
    });
  };

  const handleAddManualPlayer = async (e) => {
    e.preventDefault();
    const currentMaxPlayers = 30;
    if (team.players.length >= currentMaxPlayers) {
      setDialog({
        isOpen: true,
        title: 'Limit Reached',
        message: `Team already has the maximum ${currentMaxPlayers} players.`,
        type: 'alert',
        onConfirm: () => setDialog(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    
    setSaving(true);
    try {
      await api.post(`/teams/${id}/players`, playerForm);
      setPlayerForm({ name: '', role: 'batsman', battingStyle: 'Right handed', bowlingStyle: 'NA' });
      setShowManualForm(false);
      fetchTeam();
    } catch (err) {
      setDialog({
        isOpen: true,
        title: 'Error',
        message: err.response?.data?.message || 'Failed to add player',
        type: 'alert',
        onConfirm: () => setDialog(prev => ({ ...prev, isOpen: false }))
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadTemplate = () => {
    const headers = 'name,role,battingStyle,bowlingStyle\n';
    const examplePlayers = [
      'Virat Kohli,batsman,Right handed,NA',
      'Jasprit Bumrah,bowler,Right handed,right arm pacer',
      'Ravindra Jadeja,allrounder,Left handed,left arm spinner',
      'MS Dhoni,wicketkeeper,Right handed,NA',
      'Rashid Khan,bowler,Right handed,right arm spinner',
      'Trent Boult,bowler,Right handed,left arm pacer',
      'Glenn Maxwell,allrounder,Right handed,right arm spinner',
      'Jos Buttler,wicketkeeper,Right handed,NA',
      'Adam Zampa,bowler,Right handed,right arm spinner',
      'Yuvvraj Singh,allrounder,Left handed,left arm spinner',
      'Hardik Pandya,allrounder,Right handed,right arm pacer'
    ];
    const blob = new Blob([headers + examplePlayers.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'team_squad_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleUpdateTeam = async (e) => {
    e.preventDefault();
    if (!editTeamName.trim()) return;
    setSaving(true);
    try {
      await api.put(`/teams/${id}`, { 
        teamName: editTeamName.trim(),
      });
      setShowEditTeam(false);
      fetchTeam();
      setDialog({
        isOpen: true,
        title: 'Success',
        message: 'Team details updated successfully!',
        type: 'alert',
        onConfirm: () => setDialog(prev => ({ ...prev, isOpen: false }))
      });
    } catch (err) {
      setDialog({
        isOpen: true,
        title: 'Error',
        message: err.response?.data?.message || 'Failed to update team details',
        type: 'alert',
        onConfirm: () => setDialog(prev => ({ ...prev, isOpen: false }))
      });
    } finally {
      setSaving(false);
    }
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
        setDialog({
          isOpen: true,
          title: 'Empty File',
          message: 'No valid player data found in the selected CSV.',
          type: 'alert',
          onConfirm: () => setDialog(prev => ({ ...prev, isOpen: false }))
        });
        return;
      }

      setSaving(true);
      try {
        await api.post(`/teams/${id}/players/upload`, { players });
        fetchTeam();
        setDialog({
          isOpen: true,
          title: 'Success',
          message: `${players.length} players uploaded successfully!`,
          type: 'alert',
          onConfirm: () => setDialog(prev => ({ ...prev, isOpen: false }))
        });
      } catch (err) {
        setDialog({
          isOpen: true,
          title: 'Error',
          message: err.response?.data?.message || 'Failed to upload players',
          type: 'alert',
          onConfirm: () => setDialog(prev => ({ ...prev, isOpen: false }))
        });
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
  const userId = user?.id || user?._id;
  const creatorId = team.createdBy?._id || team.createdBy;
  const isTeamOwner = userId && creatorId && userId.toString() === creatorId.toString();

  const isTournamentOrganizer = userId && team.tournamentIds?.some(t => {
    const orgId = t.organizerId?._id || t.organizerId;
    return orgId && orgId.toString() === userId.toString();
  });
  
  const canEdit = isTeamOwner || isTournamentOrganizer;

  const maxPlayers = 30;

  const handleOpenEdit = () => {
    setEditTeamName(team.teamName);
    setShowEditTeam(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card bg-gradient-to-r from-surface-card to-primary/5 relative">
        <div className="flex items-start sm:items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              {team.teamName?.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-txt-primary">{team.teamName}</h1>
                {canEdit && (
                  <button 
                    onClick={handleOpenEdit}
                    className="p-1.5 hover:bg-primary/10 text-primary rounded-lg transition-all"
                    title="Edit Team Name"
                  >
                    <HiOutlinePencil className="text-sm" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                {team.tournamentIds?.length > 0 && (
                  <span className="bg-primary/5 text-primary text-[11px] px-2 py-0.5 rounded border border-primary/10 max-w-[140px] truncate sm:max-w-none">
                    {team.tournamentIds[0].name}
                    {team.tournamentIds.length > 1 && ` (+${team.tournamentIds.length - 1})`}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Info Button for Tournaments */}
          <div className="relative">
            <button 
              onClick={() => setShowTournamentInfo(!showTournamentInfo)}
              onBlur={() => setTimeout(() => setShowTournamentInfo(false), 200)}
              className="p-2.5 bg-white rounded-full border border-surface-border text-primary hover:bg-primary/5 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 group"
              title="View Enrolled Tournaments"
            >
              <HiOutlineInformationCircle className="text-2xl group-hover:scale-110 transition-transform" />
            </button>
            
            {/* Popover */}
            {showTournamentInfo && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-2xl border border-surface-border p-4 z-50 animate-slide-up origin-top-right">
                <h4 className="font-bold text-sm text-txt-primary mb-3 border-b border-surface-border pb-2">Enrolled Tournaments</h4>
                {team.tournamentIds?.length > 0 ? (
                  <ul className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                    {team.tournamentIds.map(t => (
                      <li key={t._id} className="text-sm text-txt-secondary flex items-start hover:text-primary transition-colors">
                        <span className="text-primary mr-2 text-lg leading-none mt-0.5">•</span> 
                        <span className="font-medium">{t.name}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-txt-muted italic flex items-center gap-2 bg-surface/50 p-2 rounded-lg">
                    <HiOutlineInformationCircle /> Not currently enrolled in any tournament.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Players List Section */}
      <div className="animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h2 className="text-lg font-bold text-txt-primary">Squad Management {!canEdit && <span className="text-xs text-txt-muted font-normal ml-2">(View Only)</span>}</h2>
          <div className="flex items-center gap-2">
            {canEdit && user && team.players.length < maxPlayers && (
              <button 
                onClick={() => setShowManualForm(!showManualForm)}
                className={`btn-primary flex items-center space-x-2 text-sm transition-all ${showManualForm ? 'bg-danger hover:bg-danger-dark focus:ring-danger' : ''}`}
              >
                {showManualForm ? <><HiOutlineX /> <span>Cancel</span></> : <><HiOutlineUserAdd /> <span>Add Manually</span></>}
              </button>
            )}
            <div className="h-8 w-[1px] bg-surface-border mx-1 hidden sm:block"></div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-[10px] text-txt-muted font-medium uppercase tracking-tighter">Use exact terms: right arm pacer, left arm spinner, etc.</span>
              <button onClick={handleDownloadTemplate} className="btn-outline inline-flex items-center space-x-2 text-sm py-2">
                <HiOutlineDownload /> <span>Download Template (CSV)</span>
              </button>
            </div>
            {canEdit && user && team.players.length < maxPlayers && (
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

      {/* Edit Team Modal */}
      {showEditTeam && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-slide-up">
            <div className="flex items-center justify-between p-6">
              <h2 className="text-xl font-black text-txt-primary uppercase tracking-tight">Edit Team Details</h2>
              <button onClick={() => setShowEditTeam(false)} className="p-1.5 hover:bg-surface rounded-lg transition-colors">
                <HiOutlineX className="text-xl text-txt-muted" />
              </button>
            </div>
            <form onSubmit={handleUpdateTeam} className="px-6 pb-6 space-y-4">
              <div>
                <label className="label">Team Name</label>
                <input
                  value={editTeamName}
                  onChange={(e) => setEditTeamName(e.target.value)}
                  className="input"
                  placeholder="e.g. Mumbai Indians"
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowEditTeam(false)} className="btn-outline flex-1 py-3 text-sm font-bold">
                  Cancel
                </button>
                <button type="submit" disabled={saving || !editTeamName.trim()} className="btn-primary flex-1 py-3 text-sm font-black uppercase tracking-widest shadow-lg shadow-primary/20">
                  {saving ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reusable Dialog */}
      <CustomDialog 
        isOpen={dialog.isOpen}
        title={dialog.title}
        message={dialog.message}
        type={dialog.type}
        onConfirm={dialog.onConfirm}
        onCancel={() => setDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default TeamDetailPage;
