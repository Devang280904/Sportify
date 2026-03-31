import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import LiveIndicator from '../components/LiveIndicator';
import { MdSportsCricket, MdLocationOn as HiOutlineLocationMarker, MdCalendarToday as HiOutlineCalendar } from 'react-icons/md';
import VictoryOverlay from '../components/VictoryOverlay';

const MatchViewerPage = () => {
  const { id } = useParams();
  const { socket, joinMatch, leaveMatch } = useSocket();
  const [match, setMatch] = useState(null);
  const [scores, setScores] = useState([]);
  const [team1Players, setTeam1Players] = useState([]);
  const [team2Players, setTeam2Players] = useState([]);
  const [activeTab, setActiveTab] = useState('live'); // 'live', 'scorecard', 'squads'
  const [showCelebration, setShowCelebration] = useState(false);
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
        setShowCelebration(true);
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
      const matchData = res.data.data.match;
      setMatch(matchData);
      setScores(res.data.data.scores);

      // Fetch squad data for both teams
      const [t1Res, t2Res] = await Promise.all([
        api.get(`/teams/${matchData.team1Id?._id || matchData.team1Id}`),
        api.get(`/teams/${matchData.team2Id?._id || matchData.team2Id}`),
      ]);
      setTeam1Players(t1Res.data.data.players || []);
      setTeam2Players(t2Res.data.data.players || []);
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

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 relative">
      {/* Victory Celebration Overlay */}
      {showCelebration && match?.status === 'completed' && (
        <VictoryOverlay 
          winner={match.winnerId} 
          resultMessage={match.resultMessage} 
          onAction={() => {
            setShowCelebration(false);
            setActiveTab('scorecard');
          }} 
        />
      )}

      {/* Professional Match Header */}
      <div className="card bg-gradient-to-br from-primary-dark to-primary text-white overflow-hidden relative shadow-2xl border-none">
        <div className="absolute top-0 right-0 p-4">
          {match.status === 'live' ? <LiveIndicator size="md" /> : <span className="badge bg-white/20 text-white uppercase text-[10px] tracking-widest">{match.status}</span>}
        </div>
        <div className="p-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                {/* Team 1 */}
                <div className={`flex flex-col items-center gap-2 ${match.battingTeamId?.toString() === (match?.team1Id?._id || match?.team1Id).toString() ? 'opacity-100 scale-105' : 'opacity-60'}`}>
                    {match.team1Id?.logoURL ? (
                      <img src={match.team1Id.logoURL} alt={match.team1Id.teamName} className="w-16 h-16 object-contain bg-white rounded-xl p-1" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center font-black text-2xl uppercase">{match.team1Id?.teamName?.charAt(0)}</div>
                    )}
                    <span className="font-black text-lg uppercase tracking-widest">{match.team1Id?.teamName}</span>
                    <div className="text-center">
                        <h2 className="text-3xl font-black italic">
                          {scores.find(s => s.teamId?.toString() === (match.team1Id?._id || match.team1Id).toString())?.runs || 0}/{scores.find(s => s.teamId?.toString() === (match.team1Id?._id || match.team1Id).toString())?.wickets || 0}
                        </h2>
                        <p className="text-[10px] text-white/50 uppercase tracking-widest font-bold mt-0.5">({scores.find(s => s.teamId?.toString() === (match.team1Id?._id || match.team1Id).toString())?.overs || 0} ov)</p>
                    </div>
                </div>

                <div className="flex flex-col items-center">
                    <span className="text-sm font-black italic uppercase text-white/40 tracking-widest">v/s</span>
                    <div className="mt-2 text-[10px] uppercase font-black tracking-widest py-1 px-4 bg-white/10 rounded-full border border-white/10">
                        {match.totalOvers} Overs • {match.playersPerTeam} Players
                    </div>
                </div>

                {/* Team 2 */}
                <div className={`flex flex-col items-center gap-2 ${match.battingTeamId?.toString() === (match?.team2Id?._id || match?.team2Id).toString() ? 'opacity-100 scale-105' : 'opacity-60'}`}>
                    {match.team2Id?.logoURL ? (
                      <img src={match.team2Id.logoURL} alt={match.team2Id.teamName} className="w-16 h-16 object-contain bg-white rounded-xl p-1" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center font-black text-2xl uppercase">{match.team2Id?.teamName?.charAt(0)}</div>
                    )}
                    <span className="font-black text-lg uppercase tracking-widest">{match.team2Id?.teamName}</span>
                    <div className="text-center">
                        <h2 className="text-3xl font-black italic">
                          {scores.find(s => s.teamId?.toString() === (match.team2Id?._id || match.team2Id).toString())?.runs || 0}/{scores.find(s => s.teamId?.toString() === (match.team2Id?._id || match.team2Id).toString())?.wickets || 0}
                        </h2>
                        <p className="text-[10px] text-white/50 uppercase tracking-widest font-bold mt-0.5">({scores.find(s => s.teamId?.toString() === (match.team2Id?._id || match.team2Id).toString())?.overs || 0} ov)</p>
                    </div>
                </div>
            </div>
            
            {/* Match Status Results */}
            <div className="mt-8 pt-6 border-t border-white/10 text-center">
                <div className="bg-white/10 border border-white/10 px-6 py-4 rounded-2xl inline-block shadow-lg backdrop-blur-sm">
                   <div className="flex flex-col items-center gap-2">
                       <div className="flex items-center justify-center gap-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/60 mb-1">
                          <span className="flex items-center gap-1.5"><HiOutlineLocationMarker /> {match.venue}</span>
                          <span className="w-1 h-1 bg-white/20 rounded-full"></span>
                          <span className="flex items-center gap-1.5"><HiOutlineCalendar /> {new Date(match.matchDate).toLocaleDateString()}</span>
                       </div>
                       
                       {match.status === 'completed' ? (
                         <p className="text-accent text-lg font-black tracking-widest uppercase mb-1">
                            {match.resultMessage || (match.winnerId ? `${match.winnerId === match.team1Id?._id ? match.team1Id?.teamName : match.team2Id?.teamName} Won 🎉` : 'Match Completed')}
                         </p>
                       ) : match.status === 'live' ? (
                         <div className="flex items-center gap-2 text-accent font-black uppercase tracking-tighter italic animate-pulse">
                            <span className="w-2 h-2 bg-accent rounded-full"></span>
                            Match is Live
                         </div>
                       ) : (
                         <div className="text-xs font-black uppercase text-white/40 tracking-widest">Match Scheduled</div>
                       )}

                       {match.startTime && (
                         <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-white/40 border-t border-white/5 pt-2 mt-1 w-full justify-center">
                            <span className="flex items-center gap-1"><HiOutlineCalendar /> Start: {new Date(match.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {match.endTime && <span className="flex items-center gap-1">• End: {new Date(match.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                            {match.endTime && match.startTime && (
                                <span className="text-accent/60 ml-2">({Math.floor((new Date(match.endTime) - new Date(match.startTime)) / (1000 * 60))} MINS)</span>
                            )}
                         </div>
                       )}
                   </div>
                </div>
            </div>
        </div>
      </div>

      {/* Unified Tabs */}
      <div className="flex bg-surface-card rounded-xl p-1 shadow-md border border-surface-border">
        {['live', 'scorecard', 'squads'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 px-4 rounded-lg font-black text-xs uppercase tracking-widest transition-all ${
              activeTab === tab ? 'bg-primary text-white shadow-lg' : 'text-txt-secondary hover:bg-primary/5'
            }`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Live Tab Content */}
      {activeTab === 'live' && (
        <div className="space-y-6 animate-fade-in">
           {match.status === 'live' && activeScore && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Stats cards same as LiveScoringPage, but view-only */}
                <div className="card p-5 border-l-4 border-accent bg-surface-card shadow-lg">
                    <h3 className="text-[10px] font-black text-txt-muted uppercase tracking-widest mb-4">Current Batting</h3>
                    <div className="space-y-4">
                        {activeScore.strikerId && (
                            <div className="flex justify-between items-center bg-primary/5 p-4 rounded-xl border border-primary/10">
                                <div><p className="font-bold text-sm">{activeScore.batting?.find(b => b.playerId === activeScore.strikerId)?.playerName} ★</p><p className="text-[10px] text-txt-muted">SR: {activeScore.batting?.find(b => b.playerId === activeScore.strikerId)?.strikeRate?.toFixed(1)}</p></div>
                                <div className="text-right"><p className="text-2xl font-black text-primary">{activeScore.batting?.find(b => b.playerId === activeScore.strikerId)?.runs}</p><p className="text-[10px] text-txt-muted uppercase font-bold">{activeScore.batting?.find(b => b.playerId === activeScore.strikerId)?.ballsFaced} Balls</p></div>
                            </div>
                        )}
                        {activeScore.nonStrikerId && (
                            <div className="flex justify-between items-center p-4 rounded-xl border border-surface-border shadow-sm">
                                <div><p className="font-bold text-sm text-txt-primary">{activeScore.batting?.find(b => b.playerId === activeScore.nonStrikerId)?.playerName}</p><p className="text-[10px] text-txt-muted">SR: {activeScore.batting?.find(b => b.playerId === activeScore.nonStrikerId)?.strikeRate?.toFixed(1)}</p></div>
                                <div className="text-right"><p className="text-2xl font-bold text-txt-secondary">{activeScore.batting?.find(b => b.playerId === activeScore.nonStrikerId)?.runs}</p><p className="text-[10px] text-txt-muted uppercase font-bold">{activeScore.batting?.find(b => b.playerId === activeScore.nonStrikerId)?.ballsFaced} Balls</p></div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="card p-5 border-l-4 border-secondary bg-surface-card shadow-lg">
                    <h3 className="text-[10px] font-black text-txt-muted uppercase tracking-widest mb-4">Current Bowling</h3>
                    {activeScore.currentBowlerId && (
                        <div className="flex justify-between items-center bg-secondary/5 p-4 rounded-xl border border-secondary/10 h-32">
                            <div><p className="font-bold text-sm">{activeScore.bowling?.find(bw => bw.playerId === activeScore.currentBowlerId)?.playerName}</p><p className="text-[10px] text-txt-muted">ECON: {activeScore.bowling?.find(bw => bw.playerId === activeScore.currentBowlerId)?.economy?.toFixed(1)}</p></div>
                            <div className="text-right"><p className="text-3xl font-black text-secondary">{activeScore.bowling?.find(bw => bw.playerId === activeScore.currentBowlerId)?.wickets}-{activeScore.bowling?.find(bw => bw.playerId === activeScore.currentBowlerId)?.runsConceded}</p><p className="text-[10px] text-txt-muted uppercase font-bold">{activeScore.bowling?.find(bw => bw.playerId === activeScore.currentBowlerId)?.oversBowled} Overs</p></div>
                        </div>
                    )}
                </div>
             </div>
           )}

           {/* Timeline - Show for both live and completed */}
           {scores.find(s => s.ballByBall?.length > 0) && (
              <div className="card p-6 shadow-xl border-none">
                <h3 className="text-xs font-black text-txt-primary mb-6 uppercase tracking-widest border-b border-surface-border pb-4">Recent Timeline</h3>
                <div className="flex flex-wrap gap-2">
                    {[...(scores.find(s => s.teamId === match.battingTeamId)?.ballByBall || scores[0]?.ballByBall || [])].reverse().slice(0, 24).map((ball, i) => (
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
      )}

      {/* Scorecard Tab Content */}
      {activeTab === 'scorecard' && (
        <div className="space-y-6 animate-fade-in">
          {scores.map((score, idx) => {
            const team = score.teamId?.toString() === (match?.team1Id?._id || match?.team1Id).toString() ? match.team1Id : match.team2Id;
            return (
              <div key={idx} className="card p-0 overflow-hidden border-2 border-primary/10 shadow-xl border-none">
                 <div className="bg-primary px-6 py-3 flex justify-between items-center text-white">
                    <h3 className="font-black italic uppercase tracking-wider">{team?.teamName} Innings</h3>
                    <span className="bg-white/10 px-3 py-1 rounded-full text-xs font-black">{score.runs}/{score.wickets} ({score.overs} ov)</span>
                 </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-surface-alt border-b border-surface-border uppercase text-[10px] font-black text-txt-muted tracking-widest">
                            <tr>
                                <th className="px-6 py-4 text-left">Batsman</th>
                                <th className="px-4 py-4 text-center">R</th>
                                <th className="px-4 py-4 text-center">B</th>
                                <th className="px-4 py-4 text-center">4s</th>
                                <th className="px-4 py-4 text-center">6s</th>
                                <th className="px-4 py-4 text-center">SR</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-border">
                            {score.batting?.map((b, i) => (
                                <tr key={i} className={`hover:bg-primary/5 transition-colors ${b.isOut ? 'opacity-70' : ''}`}>
                                    <td className="px-6 py-4 font-bold text-txt-primary flex items-center gap-2">
                                        {b.playerName} {b.isOut ? <span className="text-[10px] font-normal text-danger uppercase border border-danger/20 px-1 rounded">Out</span> : <span className="text-[10px] font-normal text-success uppercase border border-success/20 px-1 rounded">Not Out</span>}
                                    </td>
                                    <td className="px-4 py-4 text-center font-black text-primary text-base">{b.runs}</td>
                                    <td className="px-4 py-4 text-center text-txt-secondary">{b.ballsFaced}</td>
                                    <td className="px-4 py-4 text-center text-txt-secondary">{b.fours}</td>
                                    <td className="px-4 py-4 text-center text-txt-secondary">{b.sixes}</td>
                                    <td className="px-4 py-4 text-center text-txt-primary font-medium">{b.strikeRate?.toFixed(1) || 0}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
                 <div className="bg-secondary px-6 py-2 text-white text-[10px] uppercase font-black tracking-widest">Bowling Performance</div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-surface-alt border-b border-surface-border uppercase text-[10px] font-black text-txt-muted tracking-widest">
                            <tr>
                                <th className="px-6 py-4 text-left">Bowler</th>
                                <th className="px-4 py-4 text-center">O</th>
                                <th className="px-4 py-4 text-center">R</th>
                                <th className="px-4 py-4 text-center">W</th>
                                <th className="px-4 py-4 text-center">ECON</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-border">
                            {score.bowling?.map((bw, i) => (
                                <tr key={i} className="hover:bg-secondary/5 transition-colors">
                                    <td className="px-6 py-4 font-bold">{bw.playerName}</td>
                                    <td className="px-4 py-4 text-center">{bw.oversBowled}</td>
                                    <td className="px-4 py-4 text-center text-secondary font-bold">{bw.runsConceded}</td>
                                    <td className="px-4 py-4 text-center font-black text-secondary text-base">{bw.wickets}</td>
                                    <td className="px-4 py-4 text-center font-medium">{bw.economy?.toFixed(1) || 0}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Squads Tab Content */}
      {activeTab === 'squads' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
           {[match.team1Id, match.team2Id].map((team, idx) => (
             <div key={idx} className="card p-0 overflow-hidden border border-surface-border shadow-lg border-none">
                <div className="bg-surface-alt px-6 py-4 border-b border-surface-border flex items-center gap-3">
                   {team?.logoURL ? (
                     <img src={team.logoURL} alt={team.teamName} className="w-10 h-10 object-contain p-1 bg-white rounded-lg" />
                   ) : (
                     <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary uppercase">{team?.teamName?.charAt(0)}</div>
                   )}
                   <h3 className="font-black uppercase tracking-widest text-sm">{team?.teamName}</h3>
                </div>
                <div className="divide-y divide-surface-border">
                   {(idx === 0 ? team1Players : team2Players).map(player => (
                     <div key={player._id} className="p-4 flex justify-between items-center hover:bg-primary/5 transition-colors">
                        <div>
                            <p className="font-bold text-txt-primary">{player.name}</p>
                            <p className="text-[10px] text-txt-muted uppercase font-medium tracking-tighter">{player.role} • {player.battingStyle}</p>
                        </div>
                        <span className="text-[9px] font-black uppercase bg-surface-alt px-2 py-1 rounded text-txt-muted border border-surface-border">{player.bowlingStyle}</span>
                     </div>
                   ))}
                </div>
             </div>
           ))}
        </div>
      )}
    </div>
  );
};

export default MatchViewerPage;
