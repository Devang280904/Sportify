import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import LiveIndicator from '../components/LiveIndicator';
import { HiOutlineRewind } from 'react-icons/hi';
import { MdSportsCricket } from 'react-icons/md';

const LiveScoringPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { socket, joinMatch } = useSocket();
  const [match, setMatch] = useState(null);
  const [scores, setScores] = useState([]);
  const [activeTeam, setActiveTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchMatch();
    joinMatch(id);
  }, [id]);

  const fetchMatch = async () => {
    try {
      const res = await api.get(`/matches/${id}`);
      setMatch(res.data.data.match);
      setScores(res.data.data.scores);
      if (res.data.data.scores.length > 0) {
        setActiveTeam(res.data.data.scores[0].teamId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateScore = async (runs, type = 'normal', description = '') => {
    if (!activeTeam || updating) return;
    setUpdating(true);
    try {
      const res = await api.post(`/matches/${id}/score`, {
        teamId: activeTeam, runs, type, description,
      });
      setScores(prev => prev.map(s => s.teamId === activeTeam ? res.data.data : s));
      // Re-fetch match in case status changed
      const matchRes = await api.get(`/matches/${id}`);
      setMatch(matchRes.data.data.match);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update score');
    } finally {
      setUpdating(false);
    }
  };

  const undoLastBall = async () => {
    if (!activeTeam || updating) return;
    setUpdating(true);
    try {
      const res = await api.post(`/matches/${id}/undo`, { teamId: activeTeam });
      setScores(prev => prev.map(s => s.teamId === activeTeam ? res.data.data : s));
    } catch (err) {
      alert(err.response?.data?.message || 'Nothing to undo');
    } finally {
      setUpdating(false);
    }
  };

  const completeMatch = async () => {
    const s1 = scores.find(s => s.teamId === match.team1Id?._id);
    const s2 = scores.find(s => s.teamId === match.team2Id?._id);
    let winnerId = null;
    if (s1 && s2) {
      winnerId = s1.runs > s2.runs ? match.team1Id._id : s2.runs > s1.runs ? match.team2Id._id : null;
    }
    try {
      await api.post(`/matches/${id}/complete`, { winnerId });
      navigate(`/match/${id}`);
    } catch (err) {
      alert('Failed to complete match');
    }
  };

  const activeScore = scores.find(s => s.teamId === activeTeam);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!match) return <div className="card text-center py-12"><p className="text-txt-muted">Match not found</p></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Toss Information (if available) */}
      {match.toss?.winnerId && (
        <div className="card bg-gradient-to-r from-accent/20 to-success/20 border-2 border-accent">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-txt-muted mb-1">Coin Result</p>
              <p className="text-2xl font-bold capitalize text-accent">{match.toss?.coinResult}</p>
            </div>
            <div>
              <p className="text-xs text-txt-muted mb-1">Toss Winner</p>
              <p className="text-sm font-bold text-txt-primary">
                {match.toss?.winnerId === match.team1Id?._id
                  ? match.team1Id?.teamName
                  : match.team2Id?.teamName}
              </p>
            </div>
            <div>
              <p className="text-xs text-txt-muted mb-1">Decision</p>
              <p className="text-sm font-bold text-success capitalize">{match.toss?.decision}</p>
            </div>
          </div>
          {match.battingTeamId && (
            <div className="mt-3 pt-3 border-t border-accent/30">
              <p className="text-xs text-txt-muted text-center">
                ⚾ Currently Batting: <span className="font-bold text-txt-primary">
                  {match.battingTeamId === match.team1Id?._id
                    ? match.team1Id?.teamName
                    : match.team2Id?.teamName}
                </span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Match Header */}
      <div className="card bg-gradient-to-r from-primary to-primary-light text-white">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-white/70">{match.tournamentId?.name}</span>
          <LiveIndicator size="md" />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex-1 text-center">
            <p className="font-bold text-lg">{match.team1Id?.teamName}</p>
            {scores.find(s => s.teamId === match.team1Id?._id) && (
              <p className="text-3xl font-bold mt-1">
                {scores.find(s => s.teamId === match.team1Id?._id).runs}/
                {scores.find(s => s.teamId === match.team1Id?._id).wickets}
                <span className="text-base text-white/70 ml-2">
                  ({scores.find(s => s.teamId === match.team1Id?._id).overs} ov)
                </span>
              </p>
            )}
          </div>
          <div className="px-6">
            <MdSportsCricket className="text-3xl text-white/30" />
          </div>
          <div className="flex-1 text-center">
            <p className="font-bold text-lg">{match.team2Id?.teamName}</p>
            {scores.find(s => s.teamId === match.team2Id?._id) && (
              <p className="text-3xl font-bold mt-1">
                {scores.find(s => s.teamId === match.team2Id?._id).runs}/
                {scores.find(s => s.teamId === match.team2Id?._id).wickets}
                <span className="text-base text-white/70 ml-2">
                  ({scores.find(s => s.teamId === match.team2Id?._id).overs} ov)
                </span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Team Selector */}
      <div className="flex gap-3">
        {scores.map(s => (
          <button key={s.teamId} onClick={() => setActiveTeam(s.teamId)}
            className={`flex-1 py-3 rounded-lg font-medium text-sm transition-all ${
              activeTeam === s.teamId
                ? 'bg-primary text-white shadow-md'
                : 'bg-surface-card border border-surface-border text-txt-secondary hover:border-primary'
            }`}>
            Scoring: {s.teamId === match.team1Id?._id ? match.team1Id?.teamName : match.team2Id?.teamName}
          </button>
        ))}
      </div>

      {/* Scoring Controls */}
      <div className="card">
        <h3 className="font-bold text-txt-primary mb-4">Update Score</h3>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
          {[0, 1, 2, 3, 4, 5, 6].map(runs => (
            <button key={runs} onClick={() => updateScore(runs)} disabled={updating}
              className="btn bg-surface hover:bg-primary hover:text-white text-txt-primary text-lg font-bold py-4 rounded-xl transition-all">
              {runs}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3 mt-3">
          <button onClick={() => updateScore(1, 'wide', 'Wide')} disabled={updating}
            className="btn bg-warning/10 text-warning-dark hover:bg-warning hover:text-white py-3 rounded-xl font-medium">
            Wide
          </button>
          <button onClick={() => updateScore(1, 'no-ball', 'No Ball')} disabled={updating}
            className="btn bg-warning/10 text-warning-dark hover:bg-warning hover:text-white py-3 rounded-xl font-medium">
            No Ball
          </button>
          <button onClick={() => updateScore(0, 'wicket', 'Wicket!')} disabled={updating}
            className="btn bg-danger/10 text-danger hover:bg-danger hover:text-white py-3 rounded-xl font-medium">
            Wicket
          </button>
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={undoLastBall} disabled={updating}
            className="btn-warning flex-1 inline-flex items-center justify-center space-x-2 py-2.5">
            <HiOutlineRewind /> <span>Undo Last Ball</span>
          </button>
          <button onClick={completeMatch}
            className="btn-danger flex-1 py-2.5">
            End Match
          </button>
        </div>
      </div>

      {/* Ball-by-Ball Log */}
      {activeScore && activeScore.ballByBall?.length > 0 && (
        <div className="card">
          <h3 className="font-bold text-txt-primary mb-3">Ball-by-Ball</h3>
          <div className="flex flex-wrap gap-2">
            {[...activeScore.ballByBall].reverse().map((ball, idx) => {
              const colors = {
                normal: 'bg-surface text-txt-primary',
                wide: 'bg-warning/10 text-warning-dark',
                'no-ball': 'bg-warning/10 text-warning-dark',
                wicket: 'bg-danger/10 text-danger',
                boundary: 'bg-accent/10 text-accent',
              };
              const color = ball.runs === 4 || ball.runs === 6
                ? 'bg-accent/10 text-accent border border-accent/20'
                : colors[ball.type] || colors.normal;
              return (
                <div key={idx} className={`${color} w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold`}
                  title={ball.description || `${ball.runs} runs`}>
                  {ball.type === 'wicket' ? 'W' : ball.type === 'wide' ? 'Wd' : ball.type === 'no-ball' ? 'Nb' : ball.runs}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveScoringPage;
