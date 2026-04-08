import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { HiOutlinePlus, HiOutlineX, HiOutlineTrash, HiOutlineSearch } from 'react-icons/hi';
import CustomDialog from '../components/CustomDialog';

const TeamsPage = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [teams, setTeams] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('myTeams');
  const [form, setForm] = useState({ teamName: '', tournamentId: searchParams.get('tournamentId') || '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [dialog, setDialog] = useState({ isOpen: false, title: '', message: '', type: 'confirm', onConfirm: () => {} });

  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setShowModal(true);
    }
  }, [searchParams]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const tournamentId = searchParams.get('tournamentId');
      const url = tournamentId ? `/teams?tournamentId=${tournamentId}` : '/teams';
      const [teamsRes, tournamentsRes] = await Promise.all([
        api.get(url),
        api.get('/tournaments'),
      ]);
      setTeams(teamsRes.data.data);
      setTournaments(tournamentsRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/teams', form);
      setShowModal(false);
      setForm({ teamName: '', tournamentId: '' });
      fetchData();
    } catch (err) {
      setDialog({
        isOpen: true,
        title: 'Error',
        message: err.response?.data?.message || 'Failed to create team',
        type: 'alert',
        onConfirm: () => setDialog(prev => ({ ...prev, isOpen: false }))
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!showDeleteModal) return;
    setDialog({
      isOpen: true,
      title: 'Delete Team?',
      message: `Are you sure you want to delete "${showDeleteModal.teamName}"? This will also remove all player data.`,
      type: 'danger',
      onConfirm: async () => {
        setSaving(true);
        try {
          await api.delete(`/teams/${showDeleteModal._id}`);
          setShowDeleteModal(null);
          fetchData();
          setDialog(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          setDialog({
            isOpen: true,
            title: 'Error',
            message: err.response?.data?.message || 'Failed to delete team',
            type: 'alert',
            onConfirm: () => setDialog(prev => ({ ...prev, isOpen: false }))
          });
        } finally {
          setSaving(false);
        }
      }
    });
  };

  const canDelete = (team) => {
    if (!user) return false;
    const userId = user.id || user._id;
    const creatorId = team.createdBy?._id || team.createdBy;
    return userId && creatorId && userId.toString() === creatorId.toString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-txt-primary">Teams</h1>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-64">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-muted" />
            <input
              type="text"
              placeholder="Search teams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10 h-10 text-sm"
            />
          </div>
          {user && (
            <button onClick={() => setShowModal(true)} className="btn-primary inline-flex items-center space-x-2 h-11 px-5 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]">
              <HiOutlinePlus className="text-xl" /> <span className="font-bold">New Team</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-surface-card rounded-lg border border-surface-border p-1">
        <button
          onClick={() => setFilter('myTeams')}
          className={`flex-1 px-4 py-2.5 rounded-md text-sm font-bold transition-all ${filter === 'myTeams'
              ? 'bg-primary text-white shadow-md'
              : 'text-txt-secondary hover:text-primary'
            }`}
        >
          My Teams
        </button>
        <button
          onClick={() => setFilter('otherTeams')}
          className={`flex-1 px-4 py-2.5 rounded-md text-sm font-bold transition-all ${filter === 'otherTeams'
              ? 'bg-primary text-white shadow-md'
              : 'text-txt-secondary hover:text-primary'
            }`}
        >
          Other Teams
        </button>
      </div>

      {/* Teams Grid */}
      {(() => {
        const userId = user?.id || user?._id;
        const filteredTeams = teams.filter(t => {
          const creatorId = t.createdBy?._id || t.createdBy;
          const isCreator = userId && creatorId && userId.toString() === creatorId.toString();
          const isAnyOrganizer = userId && t.tournamentIds?.some(tout => {
            const orgId = tout.organizerId?._id || tout.organizerId;
            return orgId && orgId.toString() === userId.toString();
          });
          const isMine = isCreator || isAnyOrganizer;

          // Search filter
          const matchesSearch = t.teamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (t.tournamentIds?.[0]?.name || '').toLowerCase().includes(searchQuery.toLowerCase());

          if (!matchesSearch) return false;
          return filter === 'myTeams' ? isMine : !isMine;
        });

        return filteredTeams.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
            {filteredTeams.map(team => (
              <div key={team._id} className="card hover:shadow-card-lg transition-all group animate-slide-up relative p-5 sm:p-6 border border-surface-border hover:border-primary/20 flex flex-col justify-between">
                <Link to={`/teams/${team._id}`} className="block">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-4">
                      {team.logoURL ? (
                        <div className="w-14 h-14 rounded-full bg-surface-alt border border-surface-border overflow-hidden p-1 shadow-sm shrink-0">
                          <img src={team.logoURL} alt={team.teamName} className="w-full h-full object-contain rounded-full" />
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-black border border-primary/20 shadow-inner shrink-0">
                          {team.teamName?.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0 pr-8">
                        <h3 className="text-lg font-bold text-txt-primary truncate group-hover:text-primary transition-colors">
                          {team.teamName}
                        </h3>
                        <div className="mt-1.5 flex items-center font-bold">
                          {team.tournamentIds?.[0]?.name ? (
                            <span className="bg-primary/5 text-primary text-xs px-2.5 py-1 rounded-lg border border-primary/10 truncate max-w-[140px] sm:max-w-[180px]">
                              {team.tournamentIds[0].name}
                            </span>
                          ) : (
                            <span className="bg-secondary/5 text-secondary text-[11px] px-2.5 py-1 rounded-lg border border-secondary/10 uppercase tracking-widest font-black">
                              Global Team
                            </span>
                          )}
                          {team.tournamentIds?.length > 1 && (
                            <span className="text-txt-muted ml-2 text-[10px] font-bold">+{team.tournamentIds.length - 1}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 flex items-center justify-between border-t border-surface-border/50 pt-4">
                    <div className="flex items-center space-x-2">
                       <div className="flex -space-x-2">
                         {Array.from({ length: Math.min(team.players?.length || 0, 3) }).map((_, i) => (
                           <div key={i} className="w-7 h-7 rounded-full bg-surface-alt border-2 border-white flex items-center justify-center shadow-sm">
                             <span className="text-[10px] text-txt-muted opacity-50 block leading-none">👤</span>
                           </div>
                         ))}
                         {team.players?.length > 3 && (
                           <div className="w-7 h-7 rounded-full bg-surface border-2 border-white flex items-center justify-center text-[9px] font-black text-txt-secondary shadow-sm">
                             +{team.players.length - 3}
                           </div>
                         )}
                         {(!team.players || team.players.length === 0) && (
                           <div className="w-7 h-7 rounded-full bg-surface border-2 border-white border-dashed flex items-center justify-center shadow-sm"></div>
                         )}
                       </div>
                        <span className="text-xs font-black text-txt-secondary uppercase tracking-widest pl-1">
                          {team.players?.length || 0} Player{(team.players?.length !== 1) ? 's' : ''}
                        </span>
                     </div>
                     
                     <span className="text-xs uppercase font-black tracking-widest text-primary/80 group-hover:text-primary transition-colors">
                       View Squad →
                     </span>
                  </div>
                </Link>

                {canDelete(team) && (
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowDeleteModal(team); }}
                    className="absolute top-4 right-4 p-2 bg-surface hover:bg-danger/10 text-txt-muted hover:text-danger shadow-sm border border-surface-border hover:border-danger/30 rounded-lg transition-all opacity-0 group-hover:opacity-100 z-10"
                    title="Delete Team"
                  >
                    <HiOutlineTrash className="text-lg" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center py-12 bg-surface/50 border-dashed animate-fade-in">
            <p className="text-txt-muted font-medium">
              {filter === 'myTeams'
                ? 'You haven\'t created any teams yet.'
                : 'No teams available.'}
            </p>
            {filter === 'myTeams' && user && (
              <button
                onClick={() => setShowModal(true)}
                className="mt-4 btn-primary py-2 px-6"
              >
                Create Your First Team
              </button>
            )}
          </div>
        );
      })()}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Create Team</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-surface rounded-lg">
                <HiOutlineX className="text-xl text-txt-muted" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label">Team Name</label>
                <input value={form.teamName} onChange={e => setForm({ ...form, teamName: e.target.value })}
                  className="input" placeholder="Mumbai Indians" required />
              </div>
              <div>
                <label className="label">Tournament (Optional)</label>
                <select value={form.tournamentId} onChange={e => setForm({ ...form, tournamentId: e.target.value })}
                  className="input">
                  <option value="">No Tournament (Global Team)</option>
                  {tournaments.map(t => (
                    <option key={t._id} value={t._id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <button type="submit" disabled={saving} className="btn-primary w-full py-2.5">
                {saving ? 'Creating...' : 'Create Team'}
              </button>
            </form>
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
            <h2 className="text-xl font-bold text-center text-txt-primary mb-2">Delete Team?</h2>
            <p className="text-center text-txt-secondary mb-6">
              Are you sure you want to delete <span className="font-bold text-txt-primary">{showDeleteModal.teamName}</span>?<br />
              <span className="text-danger font-medium mt-1 inline-block">This action will also permanently delete all players, matches, and score records associated with this team. This cannot be undone.</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(null)}
                disabled={saving}
                className="btn-outline flex-1 py-2.5"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="btn-danger flex-1 py-2.5 shadow-lg shadow-danger/30"
              >
                {saving ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamsPage;
