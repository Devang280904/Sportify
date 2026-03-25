import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';
import ScoreCard from '../components/ScoreCard';
import LiveIndicator from '../components/LiveIndicator';
import { MdSportsCricket } from 'react-icons/md';
import { HiOutlinePlus, HiOutlineCollection, HiOutlineUserGroup } from 'react-icons/hi';

const DashboardPage = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [liveMatches, setLiveMatches] = useState([]);
  const [scheduledMatches, setScheduledMatches] = useState([]);
  const [recentMatches, setRecentMatches] = useState([]);
  const [stats, setStats] = useState({ tournaments: 0, teams: 0, matches: 0 });
  const [scores, setScores] = useState({});
  const [loading, setLoading] = useState(true);

  const handleDeleteMatch = (deletedMatchId) => {
    setScheduledMatches(prev => prev.filter(m => m._id !== deletedMatchId));
    setStats(prev => ({ ...prev, matches: prev.matches - 1 }));
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('scoreUpdated', (data) => {
      setScores(prev => ({
        ...prev,
        [data.matchId]: prev[data.matchId]
          ? prev[data.matchId].map(s => s.teamId === data.teamId
            ? { ...s, runs: data.runs, wickets: data.wickets, overs: data.overs }
            : s)
          : prev[data.matchId]
      }));
    });

    socket.on('matchDeleted', (data) => {
      handleDeleteMatch(data.matchId);
    });

    return () => {
      socket.off('scoreUpdated');
      socket.off('matchDeleted');
    };
  }, [socket]);

  const fetchData = async () => {
    try {
      const [matchesRes, tournamentsRes] = await Promise.all([
        api.get('/matches'),
        api.get('/tournaments')
      ]);

      const allMatches = matchesRes.data.data;
      setLiveMatches(allMatches.filter(m => m.status === 'live'));
      const upcomingMatches = allMatches.filter(m => m.status === 'scheduled').sort((a, b) => new Date(a.matchDate) - new Date(b.matchDate));
      setScheduledMatches(upcomingMatches);
      setRecentMatches(allMatches.filter(m => m.status === 'completed').slice(0, 6));

      setStats({
        tournaments: tournamentsRes.data.data.length,
        teams: new Set(allMatches.flatMap(m => [m.team1Id?._id, m.team2Id?._id])).size,
        matches: allMatches.length,
      });

      // Fetch scores for live matches
      for (const match of allMatches.filter(m => m.status === 'live')) {
        try {
          const scoreRes = await api.get(`/matches/${match._id}`);
          setScores(prev => ({ ...prev, [match._id]: scoreRes.data.data.scores }));
        } catch (e) { /* ignore */ }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-txt-primary">
            Welcome back, <span className="text-primary">{user?.name}</span> 👋
          </h1>
          <p className="text-txt-secondary mt-1">Here's what's happening today</p>
        </div>
        {user && (
          <Link to="/matches/create" className="btn-primary inline-flex items-center space-x-2">
            <HiOutlinePlus className="text-lg" />
            <span>Create Match</span>
          </Link>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-surface-border pb-8">
        <div className="card bg-gradient-to-br from-primary to-primary-light text-white transition-transform hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/70 text-sm">Tournaments</p>
              <p className="text-3xl font-bold mt-1">{stats.tournaments}</p>
            </div>
            <HiOutlineCollection className="text-4xl text-white/30" />
          </div>
        </div>
        <div className="card bg-gradient-to-br from-secondary to-secondary-dark text-white transition-transform hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/70 text-sm">Teams</p>
              <p className="text-3xl font-bold mt-1">{stats.teams}</p>
            </div>
            <HiOutlineUserGroup className="text-4xl text-white/30" />
          </div>
        </div>
        <div className="card bg-gradient-to-br from-accent to-accent-dark text-white transition-transform hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/70 text-sm">Matches</p>
              <p className="text-3xl font-bold mt-1">{stats.matches}</p>
            </div>
            <MdSportsCricket className="text-4xl text-white/30" />
          </div>
        </div>
      </div>

      <div className="border-t border-surface-border"></div>

      {/* LOCAL TOURNAMENTS SECTION */}
      <div>
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <MdSportsCricket className="text-2xl text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-txt-primary">Local Tournaments</h2>
            <p className="text-xs text-txt-muted">Matches hosted on this platform</p>
          </div>
        </div>

        {/* Live Local Matches */}
        {liveMatches.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center space-x-3 mb-3">
              <h3 className="text-md font-bold text-txt-secondary">Live Matches</h3>
              <LiveIndicator size="sm" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {liveMatches.map(match => (
                <ScoreCard key={match._id} match={match} scores={scores[match._id] || []} />
              ))}
            </div>
          </div>
        )}

        {/* Scheduled/Upcoming Matches */}
        {scheduledMatches.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center space-x-3 mb-3">
              <h3 className="text-md font-bold text-txt-secondary">Upcoming Matches</h3>
              <span className="badge bg-secondary/10 text-secondary text-xs font-bold">{scheduledMatches.length}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {scheduledMatches.map(match => (
                <ScoreCard key={match._id} match={match} scores={scores[match._id] || []} onDelete={handleDeleteMatch} />
              ))}
            </div>
          </div>
        )}

        {/* Recent Local Matches */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-md font-bold text-txt-secondary">Recent Results</h3>
            <Link to="/fixtures" className="text-secondary text-sm hover:text-secondary-dark font-medium">View Local →</Link>
          </div>
          {recentMatches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {recentMatches.map(match => (
                <ScoreCard key={match._id} match={match} scores={[]} />
              ))}
            </div>
          ) : (
            <div className="card text-center py-12">
              <MdSportsCricket className="text-5xl text-txt-muted mx-auto mb-3" />
              <p className="text-txt-muted">No matches yet. Get started by creating a local tournament!</p>
              {user && (
                <Link to="/tournaments" className="btn-primary inline-block mt-4">Create Tournament</Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
