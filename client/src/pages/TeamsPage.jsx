import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { HiOutlinePlus, HiOutlineX, HiOutlineTrash } from 'react-icons/hi';

const TeamsPage = () => {
  const { user, canManage, isAdmin } = useAuth();
  const [searchParams] = useSearchParams();
  const [teams, setTeams] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ teamName: '', tournamentId: searchParams.get('tournamentId') || '' });
  const [saving, setSaving] = useState(false);

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
      alert(err.response?.data?.message || 'Failed to create team');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!showDeleteModal) return;
    setSaving(true);
    try {
      await api.delete(`/teams/${showDeleteModal._id}`);
      setShowDeleteModal(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete team');
    } finally {
      setSaving(false);
    }
  };

  const canDelete = (team) => {
    if (isAdmin()) return true;
    // Check if the current user is the organizer of the tournament this team belongs to
    const tournament = tournaments.find(t => t._id === (team.tournamentId?._id || team.tournamentId));
    if (canManage() && tournament?.organizerId === user?.id) return true;
    return false;
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-txt-primary">Teams</h1>
        {canManage() && (
          <button onClick={() => setShowModal(true)} className="btn-primary inline-flex items-center space-x-2">
            <HiOutlinePlus /> <span>New Team</span>
          </button>
        )}
      </div>

      {teams.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map(team => (
            <div key={team._id} className="card hover:shadow-card-lg transition-all group animate-slide-up relative">
              <Link to={`/teams/${team._id}`} className="block">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xl font-bold">
                    {team.teamName?.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-txt-primary group-hover:text-primary transition-colors pr-8">
                      {team.teamName}
                    </h3>
                    <p className="text-sm text-txt-secondary">{team.tournamentId?.name || 'No tournament'}</p>
                    <p className="text-xs text-txt-muted mt-1">{team.players?.length || 0}/11 players</p>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="w-full bg-surface rounded-full h-2">
                    <div className="bg-accent rounded-full h-2 transition-all" 
                      style={{ width: `${((team.players?.length || 0) / 11) * 100}%` }}></div>
                  </div>
                </div>
              </Link>
              
              {canDelete(team) && (
                <button 
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowDeleteModal(team); }}
                  className="absolute top-4 right-4 p-2 text-txt-muted hover:text-danger hover:bg-danger/10 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete Team"
                >
                  <HiOutlineTrash className="text-lg" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <p className="text-txt-muted">No teams found.</p>
        </div>
      )}

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
                <input value={form.teamName} onChange={e => setForm({...form, teamName: e.target.value})}
                  className="input" placeholder="Mumbai Indians" required />
              </div>
              <div>
                <label className="label">Tournament</label>
                <select value={form.tournamentId} onChange={e => setForm({...form, tournamentId: e.target.value})}
                  className="input" required>
                  <option value="">Select tournament</option>
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
              Are you sure you want to delete <span className="font-bold text-txt-primary">{showDeleteModal.teamName}</span>?<br/>
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
