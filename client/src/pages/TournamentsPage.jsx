import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { HiOutlinePlus, HiOutlineX, HiOutlineCalendar, HiOutlineTrash, HiOutlineSearch } from 'react-icons/hi';
import CustomDialog from '../components/CustomDialog';

const TournamentsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tournaments, setTournaments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('my');
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '', playersPerTeam: 11, defaultOvers: 20 });
  const [saving, setSaving] = useState(false);
  const [dateError, setDateError] = useState('');
  const [todayDate, setTodayDate] = useState('');
  const [dialog, setDialog] = useState({ isOpen: false, title: '', message: '', type: 'confirm', onConfirm: () => {} });

  // Calculate today's date in YYYY-MM-DD format (IST / Local safe)
  useEffect(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    setTodayDate(dateString);
  }, []);

  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setShowModal(true);
    }
  }, [searchParams]);

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

    setDialog({
      isOpen: true,
      title: 'Create Tournament?',
      message: `Are you sure you want to create "${form.name}"?`,
      type: 'confirm',
      onConfirm: async () => {
        setSaving(true);
        try {
          const res = await api.post('/tournaments', form);
          setShowModal(false);
          setForm({ name: '', startDate: '', endDate: '', playersPerTeam: 11, defaultOvers: 20 });
          setDateError('');
          // Redirect to the new tournament detail page to add teams
          if (res.data.data?._id) {
            navigate(`/tournaments/${res.data.data._id}`);
          } else {
            fetchTournaments();
          }
        } catch (err) {
          setDialog({
            isOpen: true,
            title: 'Error',
            message: err.response?.data?.message || err.message || 'Failed to create tournament',
            type: 'alert',
            onConfirm: () => setDialog(prev => ({ ...prev, isOpen: false }))
          });
        } finally {
          setSaving(false);
          setDialog(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleDateChange = (field, value) => {
    const newForm = { ...form, [field]: value };
    setForm(newForm);

    // Validate dates as user types
    const error = validateDates(newForm.startDate, newForm.endDate);
    setDateError(error);
  };

  const handleDelete = () => {
    if (!showDeleteModal) return;
    setDialog({
      isOpen: true,
      title: 'Delete Tournament?',
      message: `Are you sure you want to delete "${showDeleteModal.name}"? This action cannot be undone and will delete all related matches and scores.`,
      type: 'danger',
      onConfirm: async () => {
        setSaving(true);
        try {
          await api.delete(`/tournaments/${showDeleteModal._id}`);
          setShowDeleteModal(null);
          fetchTournaments();
        } catch (err) {
          setDialog({
            isOpen: true,
            title: 'Error',
            message: err.response?.data?.message || 'Failed to delete tournament',
            type: 'alert',
            onConfirm: () => setDialog(prev => ({ ...prev, isOpen: false }))
          });
        } finally {
          setSaving(false);
          setDialog(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const canDelete = (tournament) => {
    if (!user) return false;
    const userId = (user.id || user._id)?.toString();
    const organizerId = (tournament.organizerId?._id || tournament.organizerId)?.toString();
    return userId && organizerId && userId === organizerId;
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

  const [searchQuery, setSearchQuery] = useState('');

  const viewFiltered = tournaments.filter(t => {
    const userId = user?.id || user?._id;
    const organizerId = t.organizerId?._id || t.organizerId;
    const isMine = userId && organizerId && userId.toString() === organizerId.toString();
    
    // Search filter
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (t.organizerId?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
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
                className={`px-5 py-2 rounded-md text-sm font-bold capitalize transition-all ${view === v ? 'bg-primary text-white shadow-md' : 'text-txt-secondary hover:text-primary'
                  }`}>{v}</button>
            ))}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-64">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-muted" />
            <input 
              type="text" 
              placeholder="Search tournaments..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10 h-11 text-base shadow-sm"
            />
          </div>
          <div className="flex bg-surface-card rounded-lg border border-surface-border p-1">
            {['all', 'upcoming', 'ongoing', 'completed'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-md text-sm font-bold capitalize transition-all ${filter === f ? 'bg-primary text-white shadow-md' : 'text-txt-secondary hover:text-primary'
                  }`}>{f === 'ongoing' ? 'Live' : f}</button>
            ))}
          </div>
          {user && (
            <button onClick={() => setShowModal(true)} className="btn-primary inline-flex items-center space-x-2 h-10 px-4">
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
                    <p className="text-txt-muted text-xs">created by: {t.organizerId?.name || 'N/A'}</p>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Players per Team</label>
                  <input type="number" min="2" max="22" value={form.playersPerTeam} onChange={e => setForm({ ...form, playersPerTeam: Number(e.target.value) })}
                    className="input" required />
                </div>
                <div>
                  <label className="label">Overs per Match</label>
                  <input type="number" min="1" max="50" value={form.defaultOvers} onChange={e => setForm({ ...form, defaultOvers: Number(e.target.value) })}
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

export default TournamentsPage;
