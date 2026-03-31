import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { HiOutlineCalendar, HiOutlineUserGroup, HiOutlinePlus, HiOutlineX, HiOutlineSearch, HiOutlineClipboardCopy, HiOutlineCheck, HiOutlineTrash } from 'react-icons/hi';

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

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [tRes, mRes] = await Promise.all([
        api.get(`/tournaments/${id}`),
        api.get(`/matches?tournamentId=${id}`),
      ]);
      setTournament(tRes.data.data);
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
      const res = await api.get('/teams/my-teams');
      // Filter out teams that already belong to THIS tournament
      const filtered = res.data.data.filter(
        (t) => (t.tournamentId?._id || t.tournamentId) !== id
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

  const handleCloneTeam = async (teamId, teamName) => {
    setSaving(true);
    try {
      await api.post('/teams/clone', { sourceTeamId: teamId, targetTournamentId: id });
      setClonedTeamIds((prev) => new Set([...prev, teamId]));
      showToast(`Team "${teamName}" added with all players!`);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to add team', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Filter my teams by search query
  const filteredMyTeams = myTeams.filter((t) =>
    t.teamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.tournamentId?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Check if team already exists in current tournament
  const isAlreadyInTournament = (teamName) => {
    return tournament?.teams?.some((t) => t.teamName === teamName);
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

  const handleDeleteTournament = async () => {
    setDeleteSaving(true);
    try {
      await api.delete(`/tournaments/${id}`);
      showToast('Tournament deleted successfully!', 'success');
      setTimeout(() => navigate('/tournaments'), 1500);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete tournament', 'error');
    } finally {
      setDeleteSaving(false);
      setShowDeleteModal(false);
    }
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
            <h1 className="text-2xl font-bold text-txt-primary">{tournament.name}</h1>
            <p className="text-sm text-txt-muted mt-1">Organized by <span className="font-semibold">{tournament.organizerId?.name}</span></p>
            <div className="flex items-center gap-4 mt-2 text-sm text-txt-secondary">
              <span className="flex items-center gap-1">
                <HiOutlineCalendar />
                {new Date(tournament.startDate).toLocaleDateString()} – {new Date(tournament.endDate).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <HiOutlineUserGroup />
                {tournament.teams?.length || 0} teams
              </span>
            </div>
          </div>
          <span className={`badge text-sm ${statusColor[tournament.status]}`}>{tournament.status}</span>
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
              <Link key={team._id} to={`/teams/${team._id}`} className="card hover:shadow-card-lg group animate-slide-up">
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
          <div className="space-y-3">
            {matches.map(m => (
              <Link key={m._id} to={m.status === 'live' ? `/match/${m._id}/view` : `/match/${m._id}`}
                className="card flex items-center justify-between hover:shadow-card-lg">
                <div className="flex items-center gap-4">
                  <span className="font-medium text-txt-primary">{m.team1Id?.teamName}</span>
                  <span className="text-txt-muted text-sm">vs</span>
                  <span className="font-medium text-txt-primary">{m.team2Id?.teamName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-txt-muted">{new Date(m.matchDate).toLocaleDateString()}</span>
                  <span className={`badge ${statusColor[m.status] || ''}`}>{m.status}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="card text-center py-8">
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
                  My Teams
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
                      Add teams from your other tournaments. Players will be cloned along with the team.
                    </p>
                    <div className="relative">
                      <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-muted" />
                      <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input pl-10"
                        placeholder="Search teams by name or tournament..."
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
                                  <span className="text-xs text-txt-muted whitespace-nowrap">
                                    {team.players?.length || 0} players
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
                                  onClick={() => handleCloneTeam(team._id, team.teamName)}
                                  disabled={saving}
                                  className="btn-primary text-xs py-1.5 px-3 inline-flex items-center gap-1"
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
                            : 'No teams found from your other tournaments.'}
                        </p>
                        <p className="text-xs text-txt-muted mt-1">
                          {!searchQuery && 'Create teams in other tournaments first to see them here.'}
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
              onClick={() => setShowDeleteModal(true)}
              className="btn-danger inline-flex items-center space-x-2 text-sm"
            >
              <HiOutlineTrash /> <span>Delete Tournament</span>
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-scale-up">
            <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center mx-auto mb-4">
              <HiOutlineTrash className="text-3xl text-danger" />
            </div>
            <h2 className="text-xl font-bold text-center text-txt-primary mb-2">Delete Tournament?</h2>
            <p className="text-center text-txt-secondary mb-6">
              Are you sure you want to delete <span className="font-bold text-txt-primary">{tournament?.name}</span>?<br />
              <span className="text-danger font-medium mt-1 inline-block">This action will permanently delete all teams, matches, and score records. This cannot be undone.</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteSaving}
                className="btn-outline flex-1 py-2.5"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTournament}
                disabled={deleteSaving}
                className="btn-danger flex-1 py-2.5 shadow-lg shadow-danger/30"
              >
                {deleteSaving ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Deleting...
                  </span>
                ) : (
                  'Delete Tournament'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentDetailPage;
