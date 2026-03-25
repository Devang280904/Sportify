import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
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

  useEffect(() => {
    fetchMatch();
    joinMatch(id);
    return () => leaveMatch(id);
  }, [id]);

  useEffect(() => {
    if (!socket) return;
    socket.on('scoreUpdated', (data) => {
      if (data.matchId === id) {
        setScores(prev => prev.map(s => s.teamId === data.teamId ? { ...s, ...data } : s));
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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-primary"><div className="animate-spin rounded-full h-12 w-12 border-4 border-accent border-t-transparent"></div></div>;
  if (!match) return <div className="card text-center py-12"><p className="text-txt-muted">Match not found</p></div>;

  const activeInningsTeamId = match.battingTeamId;
  const activeScore = scores.find(s => s.teamId === activeInningsTeamId);
  const bowlingTeamId = activeInningsTeamId === match.team1Id?._id ? match.team2Id?._id : match.team1Id?._id;

  const team1Score = scores.find(s => s.teamId === match.team1Id?._id);
  const team2Score = scores.find(s => s.teamId === match.team2Id?._id);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Professional Scoreboard Card */}
      <div className="card bg-gradient-to-br from-primary-dark via-primary to-primary-light text-white overflow-hidden relative shadow-2xl">
        <div className="absolute top-0 right-0 p-4">{match.status === 'live' ? <LiveIndicator size="lg" /> : <span className="badge bg-white/20 text-white uppercase text-[10px] tracking-widest">{match.status}</span>}</div>
        
        <div className="relative z-10 pt-8 pb-4">
          <div className="flex items-center justify-around mb-8 px-4">
            {/* Team 1 */}
            <div className="text-center group">
              <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-3xl font-black mx-auto mb-3 group-hover:scale-110 transition-transform">
                {match.team1Id?.teamName?.charAt(0)}
              </div>
              <h2 className="font-bold text-lg mb-1">{match.team1Id?.teamName}</h2>
              {team1Score && (
                <div className="animate-fade-in">
                  <p className="text-3xl font-black">{team1Score.runs}<span className="text-xl text-white/60">/{team1Score.wickets}</span></p>
                  <p className="text-[10px] text-white/50 uppercase tracking-widest">{team1Score.overs} Overs</p>
                </div>
              )}
            </div>

            <div className="text-white/30 text-2xl font-black italic">VS</div>

            {/* Team 2 */}
            <div className="text-center group">
              <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-3xl font-black mx-auto mb-3 group-hover:scale-110 transition-transform">
                {match.team2Id?.teamName?.charAt(0)}
              </div>
              <h2 className="font-bold text-lg mb-1">{match.team2Id?.teamName}</h2>
              {team2Score && (
                <div className="animate-fade-in">
                  <p className="text-3xl font-black">{team2Score.runs}<span className="text-xl text-white/60">/{team2Score.wickets}</span></p>
                  <p className="text-[10px] text-white/50 uppercase tracking-widest">{team2Score.overs} Overs</p>
                </div>
              )}
            </div>
          </div>

          <div className="text-center pt-4 border-t border-white/10 bg-black/10 backdrop-blur-sm py-3">
             {match.status === 'completed' ? (
                <div className="space-y-2">
                  <p className="text-accent font-black tracking-widest uppercase">
                    {match.winnerId ? `${match.winnerId === match.team1Id?._id ? match.team1Id?.teamName : match.team2Id?.teamName} Won 🎉` : 'Match Drawn'}
                  </p>
                  <Link to={`/match/${id}/summary`} className="inline-block text-xs underline opacity-70 hover:opacity-100">View Full Scorecard</Link>
                </div>
             ) : (
                <p className="text-xs text-white/70 tracking-widest uppercase font-medium">
                  {match.venue} • {new Date(match.matchDate).toLocaleDateString()}
                </p>
             )}
          </div>
        </div>
      </div>

      {/* Live Commentary / Player Stats (When Live) */}
      {match.status === 'live' && activeScore && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card p-5 border-l-4 border-accent bg-surface-card shadow-lg">
            <h3 className="text-[10px] font-black text-txt-muted uppercase tracking-widest mb-4">Current Batting</h3>
            <div className="space-y-4">
              {/* Striker */}
              {activeScore.strikerId && (
                <div className="flex justify-between items-center bg-primary/5 p-3 rounded-xl border border-primary/10">
                  <div>
                    <p className="font-bold text-sm tracking-tight">{activeScore.batting?.find(b => b.playerId === activeScore.strikerId)?.playerName} <span className="text-accent ml-1">★</span></p>
                    <p className="text-[10px] text-txt-muted">SR {activeScore.batting?.find(b => b.playerId === activeScore.strikerId)?.strikeRate?.toFixed(1)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-primary">{activeScore.batting?.find(b => b.playerId === activeScore.strikerId)?.runs}</p>
                    <p className="text-[10px] text-txt-muted uppercase tracking-tighter">{activeScore.batting?.find(b => b.playerId === activeScore.strikerId)?.ballsFaced} balls</p>
                  </div>
                </div>
              )}
              {/* Non-Striker */}
              {activeScore.nonStrikerId && (
                <div className="flex justify-between items-center p-3 rounded-xl border border-surface-border">
                  <div>
                    <p className="font-bold text-sm text-txt-primary opacity-80">{activeScore.batting?.find(b => b.playerId === activeScore.nonStrikerId)?.playerName}</p>
                    <p className="text-[10px] text-txt-muted">SR {activeScore.batting?.find(b => b.playerId === activeScore.nonStrikerId)?.strikeRate?.toFixed(1)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-txt-secondary">{activeScore.batting?.find(b => b.playerId === activeScore.nonStrikerId)?.runs}</p>
                    <p className="text-[10px] text-txt-muted uppercase tracking-tighter">{activeScore.batting?.find(b => b.playerId === activeScore.nonStrikerId)?.ballsFaced} balls</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="card p-5 border-l-4 border-secondary bg-surface-card shadow-lg">
            <h3 className="text-[10px] font-black text-txt-muted uppercase tracking-widest mb-4">Current Bowling</h3>
            {activeScore.currentBowlerId && (
              <div className="flex justify-between items-center bg-secondary/5 p-4 rounded-xl border border-secondary/10 h-[100px]">
                <div>
                  <p className="font-bold text-sm">{activeScore.bowling?.find(bw => bw.playerId === activeScore.currentBowlerId)?.playerName}</p>
                  <p className="text-[10px] text-txt-muted">ECON {activeScore.bowling?.find(bw => bw.playerId === activeScore.currentBowlerId)?.economy?.toFixed(1)}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-secondary">
                    {activeScore.bowling?.find(bw => bw.playerId === activeScore.currentBowlerId)?.wickets}-
                    {activeScore.bowling?.find(bw => bw.playerId === activeScore.currentBowlerId)?.runsConceded}
                  </p>
                  <p className="text-[10px] text-txt-muted uppercase tracking-widest">{activeScore.bowling?.find(bw => bw.playerId === activeScore.currentBowlerId)?.oversBowled} OVERS</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Simplified Timeline */}
      {scores.find(s => s.ballByBall?.length > 0) && (
        <div className="card p-6 shadow-xl">
          <h3 className="text-xs font-black text-txt-primary mb-4 uppercase tracking-[0.2em] border-b border-surface-border pb-3">Recent Timeline</h3>
          <div className="flex flex-wrap gap-2">
            {[...(activeScore?.ballByBall || [])].reverse().slice(0, 18).map((ball, i) => (
              <div key={i} className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs border-2 transition-all hover:scale-110 cursor-default ${
                ball.type === 'wicket' ? 'bg-red-600 text-white border-red-700 shadow-lg shadow-red-200' :
                ball.runs === 4 ? 'bg-accent/20 text-accent border-accent/30' :
                ball.runs === 6 ? 'bg-accent text-white border-accent shadow-lg shadow-accent/20' :
                'bg-surface-alt text-txt-primary border-surface-border'
              }`}>
                {ball.type === 'wicket' ? 'W' : ball.runs}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchViewerPage;
