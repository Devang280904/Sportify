import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import LiveIndicator from '../components/LiveIndicator';
import { HiOutlineCalendar } from 'react-icons/hi';

const FixturesPage = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const { socket } = useSocket();

  useEffect(() => { fetchMatches(); }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('matchStarted', () => fetchMatches());
    socket.on('matchCompleted', () => fetchMatches());
    return () => {
      socket.off('matchStarted');
      socket.off('matchCompleted');
    };
  }, [socket]);

  const fetchMatches = async () => {
    try {
      const res = await api.get('/matches');
      setMatches(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = filter === 'all' ? matches : matches.filter(m => m.status === filter);

  const statusStyles = {
    scheduled: 'badge-scheduled',
    live: 'badge-live',
    completed: 'badge-completed',
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
        <div className="flex items-center space-x-3">
          <HiOutlineCalendar className="text-2xl text-primary" />
          <h1 className="text-2xl font-bold text-txt-primary">Fixtures & Results</h1>
        </div>
        <div className="flex bg-surface-card rounded-lg border border-surface-border p-1">
          {['all', 'scheduled', 'live', 'completed'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${
                filter === f ? 'bg-primary text-white shadow-sm' : 'text-txt-secondary hover:text-primary'
              }`}>{f}</button>
          ))}
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map(match => (
            <Link key={match._id}
              to={match.status === 'live' ? `/match/${match._id}/view` : `/match/${match._id}`}
              className={`card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:shadow-card-lg
                ${match.status === 'live' ? 'border-l-4 border-l-accent' : ''} animate-slide-up`}>
              <div className="flex items-center gap-4 flex-1">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                    {match.team1Id?.teamName?.charAt(0)}
                  </div>
                  <span className="font-medium text-txt-primary">{match.team1Id?.teamName}</span>
                </div>
                <span className="text-txt-muted text-sm">vs</span>
                <div className="flex items-center gap-3 flex-1 justify-end sm:justify-start">
                  <span className="font-medium text-txt-primary">{match.team2Id?.teamName}</span>
                  <div className="w-9 h-9 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-bold text-sm">
                    {match.team2Id?.teamName?.charAt(0)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-txt-muted">
                  {new Date(match.matchDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                <span className="text-txt-muted">📍 {match.venue}</span>
                {match.status === 'live' ? <LiveIndicator /> : (
                  <span className={statusStyles[match.status]}>{match.status}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <p className="text-txt-muted">No matches found.</p>
        </div>
      )}
    </div>
  );
};

export default FixturesPage;
