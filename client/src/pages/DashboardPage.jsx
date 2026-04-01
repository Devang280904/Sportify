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

    socket.on('matchCompleted', (data) => {
      setLiveMatches(prev => prev.filter(m => m._id !== data.matchId));
      // Re-fetch or manually construct a basic match object for the 'Recent' list
      // For speed, we'll just re-fetch the match list or move the existing one
      setRecentMatches(prev => {
        // Find the match in liveMatches if it exists
        const finishedMatch = liveMatches.find(m => m._id === data.matchId);
        if (finishedMatch) {
          const updatedMatch = { ...finishedMatch, status: 'completed', winnerId: data.winnerId };
          return [updatedMatch, ...prev.slice(0, 5)];
        }
        return prev;
      });
    });

    return () => {
      socket.off('scoreUpdated');
      socket.off('matchDeleted');
      socket.off('matchCompleted');
    };
  }, [socket]);

  const fetchData = async () => {
    try {
      const [matchesRes, tournamentsRes, teamsRes] = await Promise.all([
        api.get('/matches'),
        api.get('/tournaments'),
        api.get('/teams')
      ]);

      const allMatches = matchesRes.data.data;
      setLiveMatches(allMatches.filter(m => m.status === 'live'));
      const upcomingMatches = allMatches.filter(m => m.status === 'scheduled').sort((a, b) => new Date(a.matchDate) - new Date(b.matchDate));
      setScheduledMatches(upcomingMatches);
      setRecentMatches(allMatches.filter(m => m.status === 'completed').slice(0, 6));

      setStats({
        tournaments: tournamentsRes.data.data.length,
        teams: teamsRes.data.data.length,
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
        </div>
        {user && (
          <Link to="/matches/create" className="btn-primary inline-flex items-center space-x-2">
            <HiOutlinePlus className="text-lg" />
            <span>Create Match</span>
          </Link>
        )}
      </div>



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
