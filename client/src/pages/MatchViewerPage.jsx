import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import LiveIndicator from '../components/LiveIndicator';
import { MdSportsCricket } from 'react-icons/md';

const MatchViewerPage = () => {
  const { id } = useParams();
  const { socket, joinMatch, leaveMatch } = useSocket();
  const [match, setMatch] = useState(null);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    fetchMatch();
    joinMatch(id);
    return () => leaveMatch(id);
  }, [id]);

  useEffect(() => {
    if (!socket) return;

    socket.on('scoreUpdated', (data) => {
      if (data.matchId === id) {
        setScores(prev => prev.map(s =>
          s.teamId === data.teamId
            ? { ...s, runs: data.runs, wickets: data.wickets, overs: data.overs }
            : s
        ));
        setLastUpdate(data.lastBall || { type: 'update' });
      }
    });

    socket.on('matchCompleted', (data) => {
      if (data.matchId === id) {
        setMatch(prev => prev ? { ...prev, status: 'completed', winnerId: data.winnerId } : prev);
      }
    });

    return () => {
      socket.off('scoreUpdated');
      socket.off('matchCompleted');
    };
  }, [socket, id]);

  const fetchMatch = async () => {
    try {
      const res = await api.get(`/matches/${id}`);
      setMatch(res.data.data.match);
      setScores(res.data.data.scores);
    } catch (err) {
      console.error(err);
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

  if (!match) return <div className="card text-center py-12"><p className="text-txt-muted">Match not found</p></div>;

  const team1Score = scores.find(s => s.teamId === match.team1Id?._id);
  const team2Score = scores.find(s => s.teamId === match.team2Id?._id);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Scoreboard */}
      <div className="card bg-gradient-to-br from-primary via-primary to-primary-light text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-white/70">{match.tournamentId?.name}</span>
            {match.status === 'live' ? <LiveIndicator size="lg" /> : (
              <span className="badge bg-white/10 text-white capitalize">{match.status}</span>
            )}
          </div>

          <div className="flex items-center justify-between py-4">
            <div className="flex-1 text-center">
              <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-2xl font-bold mx-auto mb-2">
                {match.team1Id?.teamName?.charAt(0)}
              </div>
              <p className="font-bold text-lg mb-2">{match.team1Id?.teamName}</p>
              {team1Score && (
                <div>
                  <p className="text-4xl font-extrabold">{team1Score.runs}<span className="text-2xl text-white/70">/{team1Score.wickets}</span></p>
                  <p className="text-white/60 text-sm mt-1">({team1Score.overs} overs)</p>
                </div>
              )}
            </div>

            <div className="px-4">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                <MdSportsCricket className="text-2xl text-white/50" />
              </div>
            </div>

            <div className="flex-1 text-center">
              <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-2xl font-bold mx-auto mb-2">
                {match.team2Id?.teamName?.charAt(0)}
              </div>
              <p className="font-bold text-lg mb-2">{match.team2Id?.teamName}</p>
              {team2Score && (
                <div>
                  <p className="text-4xl font-extrabold">{team2Score.runs}<span className="text-2xl text-white/70">/{team2Score.wickets}</span></p>
                  <p className="text-white/60 text-sm mt-1">({team2Score.overs} overs)</p>
                </div>
              )}
            </div>
          </div>

          {match.status === 'completed' && (
            <div className="text-center mt-2 pt-4 border-t border-white/10">
              <p className="text-accent font-bold">
                {match.winnerId
                  ? `${match.winnerId === match.team1Id?._id ? match.team1Id?.teamName : match.team2Id?.teamName} won!`
                  : 'Match Drawn'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Match Info */}
      <div className="card">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-txt-muted">Venue</p>
            <p className="font-medium text-txt-primary">📍 {match.venue}</p>
          </div>
          <div>
            <p className="text-txt-muted">Date</p>
            <p className="font-medium text-txt-primary">📅 {new Date(match.matchDate).toLocaleDateString('en-US', {
              year: 'numeric', month: 'long', day: 'numeric',
            })}</p>
          </div>
        </div>
      </div>

      {/* Ball-by-Ball for both teams */}
      {scores.map(score => (
        score.ballByBall?.length > 0 && (
          <div key={score.teamId} className="card">
            <h3 className="font-bold text-txt-primary mb-3">
              {score.teamId === match.team1Id?._id ? match.team1Id?.teamName : match.team2Id?.teamName} – Ball-by-Ball
            </h3>
            <div className="flex flex-wrap gap-2">
              {score.ballByBall.map((ball, idx) => {
                const color = ball.type === 'wicket' ? 'bg-danger/10 text-danger border-danger/20'
                  : (ball.runs === 4 || ball.runs === 6) ? 'bg-accent/10 text-accent border-accent/20'
                  : ball.type === 'wide' || ball.type === 'no-ball' ? 'bg-warning/10 text-warning-dark border-warning/20'
                  : 'bg-surface text-txt-primary border-surface-border';
                return (
                  <div key={idx} className={`${color} w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border animate-fade-in`}>
                    {ball.type === 'wicket' ? 'W' : ball.type === 'wide' ? 'Wd' : ball.type === 'no-ball' ? 'Nb' : ball.runs}
                  </div>
                );
              })}
            </div>
          </div>
        )
      ))}
    </div>
  );
};

export default MatchViewerPage;
