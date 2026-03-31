import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { HiOutlinePlus, HiOutlineX, HiOutlineCalendar, HiOutlineTrash } from 'react-icons/hi';

const TournamentsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('my');
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '' });
  const [saving, setSaving] = useState(false);
  const [dateError, setDateError] = useState('');
  const [todayDate, setTodayDate] = useState('');

  // Calculate today's date in YYYY-MM-DD format
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateString = today.toISOString().split('T')[0];
    setTodayDate(dateString);
  }, []);

  useEffect(() => { fetchTournaments(); }, []);

  const fetchTournaments = async () => {
    try {
      const res = await api.get('/tournaments');
      setTournaments(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const validateDates = (startDate, endDate) => {
    if (!startDate || !endDate) return '';

    if (startDate < todayDate) {
      return 'Start date cannot be before today.';
    }

    if (endDate < todayDate) {
      return 'End date cannot be before today.';
    }

    if (endDate < startDate) {
      return 'End date must be equal to or after the start date.';
    }

    return '';
  };

  const handleCreate = async (e) => {
    e.preventDefault();

    const error = validateDates(form.startDate, form.endDate);
    if (error) {
      setDateError(error);
      return;
    }

    setSaving(true);
    try {
      const res = await api.post('/tournaments', form);
      setShowModal(false);
      setForm({ name: '', startDate: '', endDate: '' });
      setDateError('');
      // Redirect to the new tournament detail page to add teams
      if (res.data.data?._id) {
        navigate(`/tournaments/${res.data.data._id}`);
      } else {
        fetchTournaments();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create tournament');
    } finally {
      setSaving(false);
    }
  };

  const handleDateChange = (field, value) => {
    const newForm = { ...form, [field]: value };
    setForm(newForm);

    // Validate dates as user types
    const error = validateDates(newForm.startDate, newForm.endDate);
    setDateError(error);
  };

  const handleDelete = async () => {
    if (!showDeleteModal) return;
    setSaving(true);
    try {
      await api.delete(`/tournaments/${showDeleteModal._id}`);
      setShowDeleteModal(null);
      fetchTournaments();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete tournament');
    } finally {
      setSaving(false);
    }
  };

  const canDelete = (tournament) => {
    if (!user) return false;
    const userId = user.id || user._id;
    const organizerId = tournament.organizerId?._id || tournament.organizerId;
    return userId && organizerId && userId.toString() === organizerId.toString();
  };

  const getEffectiveStatus = (t) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(t.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(t.endDate);
    end.setHours(0, 0, 0, 0);

    if (today < start) return 'upcoming';
    if (today > end) return 'completed';
    return 'live';
  };

  const viewFiltered = tournaments.filter(t => {
    const userId = user?.id || user?._id;
    const organizerId = t.organizerId?._id || t.organizerId;
    const isMine = userId && organizerId && userId.toString() === organizerId.toString();
    return view === 'my' ? isMine : !isMine;
  });

  const filtered = filter === 'all' ? viewFiltered : viewFiltered.filter(t => {
    const status = getEffectiveStatus(t);
    return status === filter || (filter === 'ongoing' && status === 'live') || (filter === 'completed' && status === 'completed');
  });

  const statusColors = {
    upcoming: 'bg-secondary/10 text-secondary',
    ongoing: 'bg-accent/10 text-accent',
    live: 'bg-accent/10 text-accent',
    completed: 'bg-txt-muted/10 text-txt-secondary',
    finished: 'bg-txt-muted/10 text-txt-secondary',
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
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-txt-primary">Tournaments</h1>
          <div className="flex bg-surface-card rounded-lg border border-surface-border p-1 w-fit">
            {['my', 'other'].map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold capitalize transition-all ${view === v ? 'bg-primary text-white shadow-sm' : 'text-txt-secondary hover:text-primary'
                  }`}>{v}</button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-surface-card rounded-lg border border-surface-border p-1">
            {['all', 'upcoming', 'ongoing', 'completed'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${filter === f ? 'bg-primary text-white shadow-sm' : 'text-txt-secondary hover:text-primary'
                  }`}>{f === 'ongoing' ? 'Live' : f}</button>
            ))}
          </div>
          {user && (
            <button onClick={() => setShowModal(true)} className="btn-primary inline-flex items-center space-x-2">
              <HiOutlinePlus /> <span>New Tournament</span>
            </button>
          )}
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(t => {
            const effectiveStatus = getEffectiveStatus(t);
            return (
              <div key={t._id} className="card hover:shadow-card-lg transition-all duration-300 group animate-slide-up relative">
                <Link to={`/tournaments/${t._id}`} className="block">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-txt-primary group-hover:text-primary transition-colors pr-8">
                      {t.name}
                    </h3>
                    <span className={`badge ${statusColors[effectiveStatus]}`}>
                      {effectiveStatus === 'completed' ? 'finished' : effectiveStatus}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm text-txt-secondary">
                    <div className="flex items-center space-x-2">
                      <HiOutlineCalendar className="text-txt-muted" />
                      <span>{new Date(t.startDate).toLocaleDateString()} – {new Date(t.endDate).toLocaleDateString()}</span>
                    </div>
                    <p className="text-txt-muted">{t.teams?.length || 0} teams registered</p>
                    <p className="text-txt-muted text-xs">Organizer: {t.organizerId?.name || 'N/A'}</p>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card text-center py-12">
          <p className="text-txt-muted">No tournaments found.</p>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-txt-primary">Create Tournament</h2>
              <button onClick={() => { setShowModal(false); setDateError(''); }} className="p-1 hover:bg-surface rounded-lg">
                <HiOutlineX className="text-xl text-txt-muted" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label">Tournament Name</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="input" placeholder="IPL 2026" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Start Date</label>
                  <input type="date" value={form.startDate}
                    onChange={e => handleDateChange('startDate', e.target.value)}
                    min={todayDate}
                    className="input" required />
                </div>
                <div>
                  <label className="label">End Date</label>
                  <input type="date" value={form.endDate}
                    onChange={e => handleDateChange('endDate', e.target.value)}
                    min={todayDate}
                    className="input" required />
                </div>
              </div>
              {dateError && (
                <div className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-lg p-3">
                  {dateError}
                </div>
              )}
              <button type="submit" disabled={saving || !!dateError} className="btn-primary w-full py-2.5 disabled:opacity-50 disabled:cursor-not-allowed">
                {saving ? 'Creating...' : 'Create Tournament'}
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
            <h2 className="text-xl font-bold text-center text-txt-primary mb-2">Delete Tournament?</h2>
            <p className="text-center text-txt-secondary mb-6">
              Are you sure you want to delete <span className="font-bold text-txt-primary">{showDeleteModal.name}</span>?<br />
              <span className="text-danger font-medium mt-1 inline-block">This action will also permanently delete all associated teams, matches, and score records. This cannot be undone.</span>
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

export default TournamentsPage;
