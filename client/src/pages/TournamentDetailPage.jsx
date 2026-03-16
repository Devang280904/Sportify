import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { HiOutlineCalendar, HiOutlineUserGroup } from 'react-icons/hi';

const TournamentDetailPage = () => {
  const { id } = useParams();
  const { canManage } = useAuth();
  const [tournament, setTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!tournament) return <div className="card text-center py-12"><p className="text-txt-muted">Tournament not found</p></div>;

  const statusColor = {
    upcoming: 'bg-secondary/10 text-secondary',
    ongoing: 'bg-accent/10 text-accent',
    completed: 'bg-txt-muted/10 text-txt-secondary',
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-txt-primary">{tournament.name}</h1>
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
          {canManage() && (
            <Link to={`/teams?tournamentId=${id}`} className="btn-secondary text-sm">Manage Teams</Link>
          )}
        </div>
        {tournament.teams?.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tournament.teams.map(team => (
              <Link key={team._id} to={`/teams/${team._id}`} className="card hover:shadow-card-lg group">
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
            <p className="text-txt-muted">No teams registered yet.</p>
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
    </div>
  );
};

export default TournamentDetailPage;
