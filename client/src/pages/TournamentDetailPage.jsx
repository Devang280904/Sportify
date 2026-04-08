import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { HiOutlineCalendar, HiOutlineUserGroup, HiOutlinePlus, HiOutlineX, HiOutlineSearch, HiOutlineClipboardCopy, HiOutlineCheck, HiOutlineTrash, HiOutlineSun, HiOutlineMoon, HiOutlinePencil } from 'react-icons/hi';
import LiveIndicator from '../components/LiveIndicator';
import CustomDialog from '../components/CustomDialog';

const TournamentDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add Team Modal
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [addTeamTab, setAddTeamTab] = useState('create'); // 'create' | 'existing'
  const [myTeams, setMyTeams] = useState([]);
  const [myTeamsLoading, setMyTeamsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [clonedTeamIds, setClonedTeamIds] = useState(new Set());
  const [toast, setToast] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteSaving, setDeleteSaving] = useState(false);
  
  // Custom Dialog States
  const [dialog, setDialog] = useState({ isOpen: false, title: '', message: '', type: 'confirm', onConfirm: () => {} });

  // Edit Tournament States
  const [showEditTournament, setShowEditTournament] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', startDate: '', endDate: '', playersPerTeam: 11, defaultOvers: 20 });

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [tRes, mRes, teamsRes] = await Promise.all([
        api.get(`/tournaments/${id}`),
        api.get(`/matches?tournamentId=${id}`),
        api.get(`/teams?tournamentId=${id}`),
      ]);
      // Use the separate teams fetch for the display
      const tournamentData = tRes.data.data;
      tournamentData.teams = teamsRes.data.data;
      
      setTournament(tournamentData);
      setMatches(mRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyTeams = async () => {
    setMyTeamsLoading(true);
    try {
      const res = await api.get('/teams');
      // Filter out teams that already belong to THIS tournament
      const filtered = res.data.data.filter(
        (t) => !t.tournamentIds?.some(tid => (tid._id || tid) === id)
      );
      setMyTeams(filtered);
    } catch (err) {
      console.error(err);
    } finally {
      setMyTeamsLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleOpenAddTeam = () => {
    setShowAddTeam(true);
    setAddTeamTab('create');
    setNewTeamName('');
    setSearchQuery('');
    setClonedTeamIds(new Set());
  };

  const handleTabSwitch = (tab) => {
    setAddTeamTab(tab);
    if (tab === 'existing' && myTeams.length === 0) {
      fetchMyTeams();
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    setSaving(true);
    try {
      await api.post('/teams', { teamName: newTeamName.trim(), tournamentId: id });
      setNewTeamName('');
      showToast(`Team "${newTeamName.trim()}" created successfully!`);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create team', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLinkTeam = async (teamId, teamName) => {
    setSaving(true);
    try {
      await api.post('/teams/link', { sourceTeamId: teamId, targetTournamentId: id });
      setClonedTeamIds((prev) => new Set([...prev, teamId]));
      showToast(`Team "${teamName}" linked successfully!`);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to link team', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveTeam = async (teamId, teamName) => {
    setDialog({
      isOpen: true,
      title: 'Remove Team?',
      message: `Are you sure you want to remove "${teamName}" from this tournament?`,
      type: 'danger',
      onConfirm: async () => {
        try {
          await api.delete(`/tournaments/${id}/teams/${teamId}`);
          showToast(`Team "${teamName}" removed successfully!`);
          fetchData();
        } catch (err) {
          showToast(err.response?.data?.message || 'Failed to remove team', 'error');
        } finally {
          setDialog(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // Filter my teams by search query
  const filteredMyTeams = myTeams.filter((t) =>
    t.teamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.tournamentIds?.[0]?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Check if team already exists in current tournament
  const isAlreadyInTournament = (teamName) => {
    return tournament?.teams?.some((t) => t.teamName.trim().toLowerCase() === teamName.trim().toLowerCase());
  };

  const getEffectiveStatus = () => {
    if (!tournament) return 'upcoming';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(tournament.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(tournament.endDate);
    end.setHours(0, 0, 0, 0);

    if (today < start) return 'upcoming';
    if (today > end) return 'completed';
    return 'live';
  };

  const isOrganizer = user && (user._id === tournament?.organizerId?._id || user.id === tournament?.organizerId?._id);

  const handleDeleteTournament = () => {
    setDialog({
      isOpen: true,
      title: 'Delete Tournament?',
      message: 'Are you sure you want to delete this tournament? This will permanently remove all associated matches, teams, and scores. This cannot be undone.',
      type: 'danger',
      onConfirm: async () => {
        setDeleteSaving(true);
        try {
          await api.delete(`/tournaments/${id}`);
          showToast('Tournament deleted successfully!', 'success');
          setTimeout(() => navigate('/tournaments'), 1500);
        } catch (err) {
          showToast(err.response?.data?.message || 'Failed to delete tournament', 'error');
        } finally {
          setDeleteSaving(false);
          setDialog(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleUpdateTournament = async (e) => {
    e.preventDefault();
    setDialog({
      isOpen: true,
      title: 'Save Changes?',
      message: 'Are you sure you want to save these changes to the tournament details?',
      type: 'confirm',
      onConfirm: async () => {
        setSaving(true);
        try {
          await api.put(`/tournaments/${id}`, editForm);
          setShowEditTournament(false);
          fetchData();
          showToast('Tournament updated successfully!');
        } catch (err) {
          showToast(err.response?.data?.message || 'Failed to update tournament', 'error');
        } finally {
          setSaving(false);
          setDialog(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!tournament) return <div className="card text-center py-12"><p className="text-txt-muted">Tournament not found</p></div>;

  const effectiveStatus = getEffectiveStatus();
  const isTournamentFinished = effectiveStatus === 'completed';

  const statusColor = {
    upcoming: 'bg-secondary/10 text-secondary',
    ongoing: 'bg-accent/10 text-accent',
    live: 'bg-accent/10 text-accent',
    completed: 'bg-txt-muted/10 text-txt-secondary',
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-2xl text-white text-sm font-medium animate-slide-up ${
          toast.type === 'error' 
            ? 'bg-gradient-to-r from-red-500 to-red-600' 
            : 'bg-gradient-to-r from-green-500 to-emerald-600'
        }`}
          style={{ animationDuration: '0.3s' }}
        >
          <div className="flex items-center gap-2">
            {toast.type === 'error' ? (
              <HiOutlineX className="text-lg" />
            ) : (
              <HiOutlineCheck className="text-lg" />
            )}
            {toast.message}
          </div>
        </div>
      )}

      {/* Tournament Header */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-txt-primary">{tournament.name}</h1>
              {isOrganizer && (
                <button 
                  onClick={() => { 
                    setShowEditTournament(true); 
                    setEditForm({ 
                      name: tournament.name, 
                      startDate: tournament.startDate.slice(0, 10), 
                      endDate: tournament.endDate.slice(0, 10),
                      playersPerTeam: tournament.playersPerTeam || 11,
                      defaultOvers: tournament.defaultOvers || 20
                    }); 
                  }}
                  className="p-1.5 hover:bg-primary/10 text-primary rounded-lg transition-all"
                  title="Edit Tournament"
                >
                  <HiOutlinePencil className="text-sm" />
                </button>
              )}
            </div>
            <p className="text-sm text-txt-muted mt-1">created by: <span className="font-semibold">{tournament.organizerId?.name}</span></p>
            <div className="flex items-center gap-4 mt-2 text-sm text-txt-secondary">
              <span className="flex items-center gap-1">
                <HiOutlineCalendar />
                {new Date(tournament.startDate).toLocaleDateString()} – {new Date(tournament.endDate).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <HiOutlineUserGroup />
                {tournament.teams?.length || 0} teams
              </span>
              <span className="flex items-center gap-1 md:border-l md:border-surface-border md:pl-4">
                <HiOutlineUserGroup />
                Max {tournament.playersPerTeam || 11} players / team
              </span>
            </div>
          </div>
          <span className={`badge text-sm ${statusColor[getEffectiveStatus()]}`}>
            {getEffectiveStatus().toUpperCase()}
          </span>
        </div>
      </div>

      {/* Teams */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-txt-primary">Teams</h2>
          <div className="flex items-center gap-2">
            {isOrganizer && (
              <button 
                onClick={handleOpenAddTeam} 
                disabled={isTournamentFinished}
                className={`inline-flex items-center space-x-2 text-sm ${
                  isTournamentFinished 
                    ? 'btn-primary opacity-50 cursor-not-allowed' 
                    : 'btn-primary'
                }`}
                title={isTournamentFinished ? 'Cannot add teams to finished tournaments' : ''}
              >
                <HiOutlinePlus /> <span>Add Team</span>
              </button>
            )}
            {isOrganizer && (
              <Link 
                to={`/teams?tournamentId=${id}`} 
                className={`text-sm ${
                  isTournamentFinished 
                    ? 'btn-outline opacity-50 pointer-events-none' 
                    : 'btn-outline'
                }`}
                onClick={isTournamentFinished ? (e) => e.preventDefault() : undefined}
                title={isTournamentFinished ? 'Cannot manage teams in finished tournaments' : ''}
              >
                Manage Teams
              </Link>
            )}
          </div>
        </div>
        {tournament.teams?.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tournament.teams.map(team => (
              <div key={team._id} className="relative group/team-card">
                <Link to={`/teams/${team._id}`} className="card hover:shadow-card-lg block animate-slide-up h-full">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {team.teamName?.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-txt-primary group-hover:text-primary">{team.teamName}</h3>
                      <p className="text-xs text-txt-muted">{team.players?.length || 0} players</p>
                    </div>
                  </div>
                </Link>
                {isOrganizer && !isTournamentFinished && (
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      handleRemoveTeam(team._id, team.teamName);
                    }}
                    className="absolute top-2 right-2 p-1.5 opacity-0 group-hover/team-card:opacity-100 transition-opacity bg-danger/10 text-danger hover:bg-danger hover:text-white rounded-lg"
                    title="Remove Team"
                  >
                    <HiOutlineX className="text-sm" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center py-8">
            <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center mx-auto mb-3">
              <HiOutlineUserGroup className="text-3xl text-primary/40" />
            </div>
            <p className="text-txt-muted mb-3">No teams registered yet.</p>
            {isOrganizer && !isTournamentFinished && (
              <button onClick={handleOpenAddTeam} className="btn-primary inline-flex items-center space-x-2 text-sm mx-auto">
                <HiOutlinePlus /> <span>Add Your First Team</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Matches */}
      <div>
        <h2 className="text-lg font-bold text-txt-primary mb-4">Matches</h2>
        {matches.length > 0 ? (
          <div className="relative mt-6">
            {/* Vertical Timeline Line */}
            <div className="hidden md:block absolute left-[140px] top-6 bottom-0 w-px border-l border-dashed border-txt-muted/30"></div>

            <div className="space-y-6">
              {matches.map((match, idx) => {
                const matchDate = new Date(match.matchDate);
                const hour = matchDate.getHours();
                const isDay = hour >= 6 && hour < 18;
                const timeString = matchDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

                const team1Score = match.scores?.find(s => s.teamId?.toString() === (match.team1Id?._id || match.team1Id)?.toString());
                const team2Score = match.scores?.find(s => s.teamId?.toString() === (match.team2Id?._id || match.team2Id)?.toString());

                return (
                  <div key={match._id} className="relative flex flex-col md:flex-row gap-4 md:items-stretch group animate-slide-up">
                    {/* Left Side: Timeline & Dates */}
                    <div className="md:w-[140px] flex-shrink-0 flex flex-col items-start pt-5 relative md:pr-6 z-10">
                      {/* Horizontal connector & dot (Desktop only) */}
                      <div className="hidden md:flex absolute top-[30px] -right-[6px] items-center">
                        <div className="w-12 border-t border-accent/40 mr-1 hidden lg:block"></div>
                        <div className="w-8 border-t border-accent/40 mr-1 lg:hidden"></div>
                        <div className="w-[11px] h-[11px] rounded-full bg-accent border-[3px] border-surface"></div>
                      </div>

                      <div className="border border-accent/40 text-accent text-[10px] font-bold px-2 py-0.5 rounded-sm tracking-widest mb-3 bg-surface z-10 relative">
                        MATCH {idx + 1}
                        <div className="hidden md:block absolute top-[9px] -right-12 lg:-right-16 w-12 lg:w-16 border-t border-accent/40 -z-10"></div>
                      </div>
                      
                      <h3 className="text-base font-black text-txt-primary uppercase tracking-tight">
                        {matchDate.toLocaleDateString('en-US', { month: 'short' })}, {matchDate.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}
                      </h3>
                      
                      <div className="flex items-center gap-1.5 text-xs text-txt-muted mt-1 font-medium">
                        {isDay ? <HiOutlineSun className="text-sm" /> : <HiOutlineMoon className="text-sm" />}
                        {timeString}
                      </div>

                      <div className="text-[9px] text-txt-muted/70 mt-3 truncate w-full font-medium">
                        by {match.createdBy?.name || tournament.organizerId?.name || 'N/A'}
                      </div>
                    </div>

                    {/* Right Side: Match Card */}
                    <div className="flex-1 w-full bg-surface-card border border-surface-border rounded-xl overflow-hidden hover:shadow-card-lg transition-all group-hover:border-primary/20">
                      <Link to={match.status === 'live' ? `/match/${match._id}/view` : `/match/${match._id}`} className="block p-5 sm:p-6">
                        {/* Top row: Venue + Status */}
                        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                          <span className="text-[13px] text-txt-secondary font-medium">
                            {match.venue ? match.venue : 'Venue TBA'}
                          </span>
                          {match.status === 'live' ? <LiveIndicator /> : (
                            <span className={`badge-${match.status === 'completed' ? 'completed' : 'scheduled'} text-[10px] scale-90 origin-right`}>{match.status === 'completed' ? 'completed' : 'scheduled'}</span>
                          )}
                        </div>

                        {/* Teams row */}
                        <div className="flex items-center justify-between">
                          {/* Team 1 */}
                          <div className="flex items-center gap-x-3 sm:gap-x-4 flex-1">
                            {match.team1Id?.logoURL ? (
                              <img src={match.team1Id.logoURL} alt={match.team1Id.teamName} className="w-10 h-10 sm:w-12 sm:h-12 object-contain bg-white rounded-full p-1 border border-surface-border shadow-sm shrink-0" />
                            ) : (
                              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-base sm:text-lg border border-primary/20 shrink-0">
                                {match.team1Id?.teamName?.charAt(0)}
                              </div>
                            )}
                            <span className="font-bold text-txt-primary hidden sm:block truncate pr-2">{match.team1Id?.teamName}</span>
                            <span className="font-bold text-[13px] text-txt-primary sm:hidden truncate">{match.team1Id?.teamName?.substring(0, 3).toUpperCase()}</span>
                          </div>

                          {/* Center Area: Scores or VS */}
                          {match.status === 'scheduled' || !match.scores || match.scores.length === 0 ? (
                            <div className="font-black italic text-surface-border text-xl sm:text-2xl px-2 sm:px-4 opacity-50 select-none">
                              V/S
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center px-1 sm:px-4 shrink-0">
                              <div className="flex items-center gap-3 sm:gap-6">
                                <div className="text-center">
                                  <div className="font-black text-xl sm:text-3xl tracking-tight text-txt-primary">
                                    {team1Score?.runs || 0}<span className="text-lg sm:text-2xl text-txt-muted/70">/{team1Score?.wickets || 0}</span>
                                  </div>
                                  <div className="text-[9px] sm:text-[10px] text-txt-muted font-bold tracking-widest mt-0.5">({team1Score?.overs || 0} OV)</div>
                                </div>
                                <div className="font-black italic text-surface-border/40 text-sm sm:text-lg select-none">-</div>
                                <div className="text-center">
                                  <div className="font-black text-xl sm:text-3xl tracking-tight text-txt-primary">
                                    {team2Score?.runs || 0}<span className="text-lg sm:text-2xl text-txt-muted/70">/{team2Score?.wickets || 0}</span>
                                  </div>
                                  <div className="text-[9px] sm:text-[10px] text-txt-muted font-bold tracking-widest mt-0.5">({team2Score?.overs || 0} OV)</div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Team 2 */}
                          <div className="flex items-center gap-x-3 sm:gap-x-4 flex-1 justify-end">
                            <span className="font-bold text-txt-primary hidden sm:block truncate pl-2 text-right">{match.team2Id?.teamName}</span>
                            <span className="font-bold text-[13px] text-txt-primary sm:hidden truncate text-right">{match.team2Id?.teamName?.substring(0, 3).toUpperCase()}</span>
                            
                            {match.team2Id?.logoURL ? (
                              <img src={match.team2Id.logoURL} alt={match.team2Id.teamName} className="w-10 h-10 sm:w-12 sm:h-12 object-contain bg-white rounded-full p-1 border border-surface-border shadow-sm shrink-0" />
                            ) : (
                              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-bold text-base sm:text-lg border border-secondary/20 shrink-0">
                                {match.team2Id?.teamName?.charAt(0)}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Result summary */}
                        {match.resultMessage && (
                          <div className="mt-5 pt-3 border-t border-surface-border/30 text-center">
                            <span className="text-[11px] font-black uppercase tracking-widest text-[#00cfa7]">{match.resultMessage}</span>
                          </div>
                        )}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="card text-center py-8 border-dashed border-surface-border bg-surface/30">
            <p className="text-txt-muted">No matches scheduled yet.</p>
          </div>
        )}
      </div>

      {/* ===== ADD TEAM MODAL ===== */}
      {showAddTeam && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-slide-up" style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 pb-0">
              <h2 className="text-lg font-bold text-txt-primary">Add Team to Tournament</h2>
              <button onClick={() => setShowAddTeam(false)} className="p-1.5 hover:bg-surface rounded-lg transition-colors">
                <HiOutlineX className="text-xl text-txt-muted" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex px-6 pt-4 gap-1">
              <button
                onClick={() => handleTabSwitch('create')}
                className={`flex-1 py-2.5 text-sm font-medium rounded-t-lg transition-all border-b-2 ${
                  addTeamTab === 'create'
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-txt-secondary hover:text-txt-primary hover:bg-surface'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <HiOutlinePlus className="text-base" />
                  Create New
                </div>
              </button>
              <button
                onClick={() => handleTabSwitch('existing')}
                className={`flex-1 py-2.5 text-sm font-medium rounded-t-lg transition-all border-b-2 ${
                  addTeamTab === 'existing'
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-txt-secondary hover:text-txt-primary hover:bg-surface'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <HiOutlineClipboardCopy className="text-base" />
                  Existing Teams
                </div>
              </button>
            </div>

            <div className="border-b border-surface-border mx-6"></div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
              {/* CREATE NEW TAB */}
              {addTeamTab === 'create' && (
                <div className="p-6">
                  <p className="text-sm text-txt-secondary mb-4">
                    Create a brand new team for this tournament. You can add players after creating the team.
                  </p>
                  <form onSubmit={handleCreateTeam} className="space-y-4">
                    <div>
                      <label className="label">Team Name</label>
                      <input
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                        className="input"
                        placeholder="e.g. Mumbai Indians"
                        required
                        autoFocus
                      />
                    </div>
                    <button type="submit" disabled={saving || !newTeamName.trim()} className="btn-primary w-full py-2.5">
                      {saving ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          Creating...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          <HiOutlinePlus /> Create Team
                        </span>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* EXISTING TEAMS TAB */}
              {addTeamTab === 'existing' && (
                <div className="flex flex-col" style={{ maxHeight: 'calc(85vh - 160px)' }}>
                  {/* Search */}
                  <div className="p-6 pb-3">
                    <p className="text-sm text-txt-secondary mb-3">
                      Link existing teams to this tournament. <strong className="text-primary font-medium">Requires exactly {tournament.playersPerTeam || 11} players.</strong>
                    </p>
                    <div className="relative">
                      <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-muted" />
                      <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input pl-10"
                        placeholder="Search teams globally..."
                      />
                    </div>
                  </div>

                  {/* Team List */}
                  <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-2" style={{ maxHeight: '340px' }}>
                    {myTeamsLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-3 border-primary border-t-transparent"></div>
                      </div>
                    ) : filteredMyTeams.length > 0 ? (
                      filteredMyTeams.map((team) => {
                        const alreadyAdded = clonedTeamIds.has(team._id) || isAlreadyInTournament(team.teamName);
                        return (
                          <div
                            key={team._id}
                            className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${
                              alreadyAdded
                                ? 'bg-green-50 border-green-200'
                                : 'bg-white border-surface-border hover:border-primary/30 hover:shadow-sm'
                            }`}
                          >
                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                {team.teamName?.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-semibold text-txt-primary text-sm truncate">{team.teamName}</h4>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs text-txt-muted truncate">
                                    {team.tournamentId?.name || 'Unknown tournament'}
                                  </span>
                                  <span className="text-xs text-txt-muted">•</span>
                                  <span className={`text-xs whitespace-nowrap ${team.players?.length === (tournament?.playersPerTeam || 11) ? 'text-green-600' : 'text-danger'}`}>
                                    {team.players?.length || 0}/{tournament?.playersPerTeam || 11} players
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="ml-3 flex-shrink-0">
                              {alreadyAdded ? (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-100 px-3 py-1.5 rounded-lg">
                                  <HiOutlineCheck /> Added
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleLinkTeam(team._id, team.teamName)}
                                  disabled={saving || (team.players?.length || 0) !== (tournament?.playersPerTeam || 11)}
                                  className={`btn-primary text-xs py-1.5 px-3 inline-flex items-center gap-1 ${(team.players?.length || 0) !== (tournament?.playersPerTeam || 11) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  title={(team.players?.length || 0) !== (tournament?.playersPerTeam || 11) ? `Team must have exactly ${tournament?.playersPerTeam || 11} players` : ''}
                                >
                                  {saving ? (
                                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                                  ) : (
                                    <HiOutlinePlus />
                                  )}
                                  Add
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-12">
                        <div className="w-14 h-14 rounded-full bg-surface flex items-center justify-center mx-auto mb-3">
                          <HiOutlineUserGroup className="text-2xl text-txt-muted" />
                        </div>
                        <p className="text-sm text-txt-muted">
                          {searchQuery
                            ? 'No teams match your search.'
                            : 'No global teams found yet.'}
                        </p>
                        <p className="text-xs text-txt-muted mt-1">
                          {!searchQuery && 'Create teams globally first to see them here.'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Tournament Section - Only for Organizer */}
      {isOrganizer && (
        <div className="card border border-danger/20 bg-danger/5 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-danger mb-1">Danger Zone</h3>
              <p className="text-sm text-txt-secondary">Delete this tournament and all associated data</p>
            </div>
            <button 
              onClick={handleDeleteTournament}
              className="btn-danger inline-flex items-center space-x-2 text-sm"
            >
              <HiOutlineTrash /> <span>Delete Tournament</span>
            </button>
          </div>
        </div>
      )}

      {/* Edit Tournament Modal */}
      {showEditTournament && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-slide-up">
            <div className="flex items-center justify-between p-6">
              <h2 className="text-xl font-black text-txt-primary uppercase tracking-tight">Edit Tournament</h2>
              <button onClick={() => setShowEditTournament(false)} className="p-1.5 hover:bg-surface rounded-lg transition-colors">
                <HiOutlineX className="text-xl text-txt-muted" />
              </button>
            </div>
            <form onSubmit={handleUpdateTournament} className="px-6 pb-6 space-y-4">
              <div>
                <label className="label">Tournament Name</label>
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  className="input" placeholder="e.g. Summer Smash 2024" required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Start Date</label>
                  <input
                    type="date"
                    value={editForm.startDate}
                    onChange={(e) => setEditForm({...editForm, startDate: e.target.value})}
                    className="input" required
                  />
                </div>
                <div>
                  <label className="label">End Date</label>
                  <input
                    type="date"
                    value={editForm.endDate}
                    onChange={(e) => setEditForm({...editForm, endDate: e.target.value})}
                    className="input" required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Players Per Team</label>
                  <input
                    type="number"
                    min="1"
                    max="25"
                    value={editForm.playersPerTeam}
                    onChange={(e) => setEditForm({...editForm, playersPerTeam: parseInt(e.target.value)})}
                    className="input" required
                  />
                </div>
                <div>
                  <label className="label">Overs per Match</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={editForm.defaultOvers}
                    onChange={(e) => setEditForm({...editForm, defaultOvers: parseInt(e.target.value)})}
                    className="input" required
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowEditTournament(false)} className="btn-outline flex-1 py-3 text-sm font-bold">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 py-3 text-sm font-black uppercase tracking-widest shadow-lg shadow-primary/20">
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

export default TournamentDetailPage;
