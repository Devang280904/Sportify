import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { MdSportsCricket, MdHistory, MdEmojiEvents } from 'react-icons/md';
import { HiOutlineUserGroup, HiOutlineCalendar, HiOutlineLocationMarker } from 'react-icons/hi';

const processInningsBalls = (balls) => {
  let currentOver = 0;
  let legalBallsInOver = 0;
  
  let overs = [];
  let currentOverBalls = [];
  
  balls.forEach((ball) => {
      const isExtra = ball.type === 'wide' || ball.type === 'no-ball';
      
      let displayLabel;
      if (ball.type === 'wicket') displayLabel = 'W';
      else if (ball.type === 'wide') displayLabel = `${ball.runs || 1}wd`;
      else if (ball.type === 'no-ball') displayLabel = `${ball.runs || 1}nb`;
      else displayLabel = ball.runs.toString();
      
      let deliveryNotation = `${currentOver}.${legalBallsInOver + (isExtra ? 0 : 1)}`;
      if (isExtra && legalBallsInOver === 6) {
         deliveryNotation = `${currentOver}.6`;
      }

      currentOverBalls.push({
         ...ball,
         displayLabel,
         deliveryNotation
      });
      
      if (!isExtra) {
          legalBallsInOver++;
      }
      
      if (legalBallsInOver === 6) {
          let overRuns = currentOverBalls.reduce((acc, b) => acc + (Number(b.runs) || 0), 0);
          overs.push({
              overNumber: currentOver + 1,
              balls: currentOverBalls,
              runs: overRuns
          });
          currentOver++;
          legalBallsInOver = 0;
          currentOverBalls = [];
      }
  });
  
  if (currentOverBalls.length > 0) {
      let overRuns = currentOverBalls.reduce((acc, b) => acc + (Number(b.runs) || 0), 0);
      overs.push({
          overNumber: currentOver + 1,
          balls: currentOverBalls,
          runs: overRuns
      });
  }
  
  return overs;
};

const MatchSummaryPage = () => {
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [scores, setScores] = useState([]);
  const [team1Players, setTeam1Players] = useState([]);
  const [team2Players, setTeam2Players] = useState([]);
  const [activeTab, setActiveTab] = useState('live'); // 'live', 'scorecard', 'squads'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await api.get(`/matches/${id}/summary`);
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
    fetchSummary();
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-primary"><div className="animate-spin rounded-full h-12 w-12 border-4 border-accent border-t-transparent"></div></div>;
  if (!match) return <div className="card text-center py-12"><p className="text-txt-muted">Match summary not found</p></div>;

  const winnerTeam = match.winnerId?._id === match.team1Id?._id ? match.team1Id : match.team2Id;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Professional Match Header: Dark Theme */}
      <div className="bg-primary-dark text-white rounded-t-xl overflow-hidden relative border border-white/10 shadow-2xl">
        <div className="absolute top-0 right-0 p-4">
          <span className="badge bg-white/10 text-white uppercase text-[10px] tracking-widest">Completed</span>
        </div>

        <div className="p-6 md:p-8">
          {/* Top Meta info */}
          <div className="flex items-center text-xs text-txt-muted mb-6 font-medium tracking-wide">
            <span className="uppercase text-white/80">{match.tournamentId?.name || 'Local Series'}</span>
            <span className="mx-2 opacity-40">•</span>
            <span className="text-white/60">{new Date(match.matchDate).toDateString()}</span>
            {match.venue && (
              <>
                <span className="mx-2 opacity-40">•</span>
                <span className="text-white/60">{match.venue}</span>
              </>
            )}
          </div>

          {/* Center Teams Horizontal Layout */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12 w-full max-w-3xl mx-auto">

            {/* Team 1 Profile */}
            <div className={`flex flex-col items-center gap-3 w-24 shrink-0 ${match.winnerId?.toString() === (match?.team1Id?._id || match?.team1Id).toString() ? 'opacity-100 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'opacity-60 grayscale-[30%]'}`}>
              {match.team1Id?.logoURL ? (
                <img src={match.team1Id.logoURL} alt={match.team1Id.teamName} className="w-16 h-16 object-contain" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-bold text-2xl uppercase">{match.team1Id?.teamName?.charAt(0)}</div>
              )}
              <span className="font-bold text-sm tracking-widest uppercase text-center">{match.team1Id?.teamName}</span>
            </div>

            {/* Scores Center Area */}
            <div className="flex-1 flex justify-center items-center gap-6 md:gap-16 w-full">
              {/* Team 1 Score */}
              <div className="text-center">
                <h2 className={`text-3xl lg:text-4xl font-black tabular-nums tracking-tight ${match.winnerId?.toString() === (match?.team1Id?._id || match?.team1Id).toString() ? 'text-white' : 'text-white/80'}`}>
                  {scores.find(s => s.teamId?.toString() === (match.team1Id?._id || match.team1Id).toString())?.runs || 0}/{scores.find(s => s.teamId?.toString() === (match.team1Id?._id || match.team1Id).toString())?.wickets || 0}
                </h2>
                <p className="text-sm text-white/60 font-medium mt-1">({scores.find(s => s.teamId?.toString() === (match.team1Id?._id || match.team1Id).toString())?.overs || 0} ov)</p>
              </div>

              {/* Separator */}
              <div className="flex flex-col items-center justify-center min-w-[80px]">
                <span className="font-black text-white/20 uppercase tracking-[0.2em] text-sm">V/S</span>
              </div>

              {/* Team 2 Score */}
              <div className="text-center">
                <h2 className={`text-3xl lg:text-4xl font-black tabular-nums tracking-tight ${match.winnerId?.toString() === (match?.team2Id?._id || match?.team2Id).toString() ? 'text-white' : 'text-white/80'}`}>
                  {scores.find(s => s.teamId?.toString() === (match.team2Id?._id || match.team2Id).toString())?.runs || 0}/{scores.find(s => s.teamId?.toString() === (match.team2Id?._id || match.team2Id).toString())?.wickets || 0}
                </h2>
                <p className="text-sm text-white/60 font-medium mt-1">({scores.find(s => s.teamId?.toString() === (match.team2Id?._id || match.team2Id).toString())?.overs || 0} ov)</p>
              </div>
            </div>

            {/* Team 2 Profile */}
            <div className={`flex flex-col items-center gap-3 w-24 shrink-0 ${match.winnerId?.toString() === (match?.team2Id?._id || match?.team2Id).toString() ? 'opacity-100 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'opacity-60 grayscale-[30%]'}`}>
              {match.team2Id?.logoURL ? (
                <img src={match.team2Id.logoURL} alt={match.team2Id.teamName} className="w-16 h-16 object-contain" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-bold text-2xl uppercase">{match.team2Id?.teamName?.charAt(0)}</div>
              )}
              <span className="font-bold text-sm tracking-widest uppercase text-center">{match.team2Id?.teamName}</span>
            </div>

          </div>

          {/* Bottom Status Message */}
          <div className="mt-8 text-center space-y-2">
            <p className="font-medium text-white">{match.resultMessage || (match.winnerId ? `${winnerTeam?.teamName} Won 🎉` : 'Match Completed')}</p>

            {/* Extra bottom meta Info */}
            <div className="text-[11px] text-white/40 uppercase tracking-widest font-medium pt-2">
              T{match.totalOvers} • {match.playersPerTeam} Players • Created by: {match.createdBy?.name || match.tournamentId?.organizerId?.name || 'N/A'}
              {match.startTime && (
                <> • Started at {new Date(match.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-primary-dark/95 rounded-b-xl border border-t-0 border-white/10 shadow-sm overflow-hidden mb-6">
        {['live', 'scorecard', 'squads'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-4 px-4 text-[11px] md:text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab
                ? 'text-white border-b-[3px] border-white bg-white/5'
                : 'text-white/50 hover:text-white hover:bg-white/5 border-b-[3px] border-transparent'
              }`}>
            {tab === 'live' ? 'Summary' : tab}
          </button>
        ))}
      </div>

      {/* Live (Summary) Tab Content */}
      {activeTab === 'live' && (
        <div className="space-y-6 animate-fade-in">
          {/* Timeline */}
          {scores.find(s => s.ballByBall?.length > 0) && (
             <div className="card p-6 shadow-xl border-none">
                <h3 className="text-xs font-black text-txt-primary mb-6 uppercase tracking-widest border-b border-surface-border pb-4">Match Timeline (Ball by Ball)</h3>
                
                {scores.map((score, sIdx) => {
                    const team = score.teamId?.toString() === (match?.team1Id?._id || match?.team1Id).toString() ? match.team1Id : match.team2Id;
                    const overs = processInningsBalls(score.ballByBall || []);
                    
                    if (overs.length === 0) return null;

                    return (
                        <div key={sIdx} className="mb-10 last:mb-0">
                           <h4 className="text-[11px] font-black text-txt-secondary mb-4 uppercase tracking-widest flex items-center gap-2">
                               <span className="w-2 h-2 rounded-full bg-primary inline-block"></span>
                               {team?.teamName || 'Unknown Team'} Innings
                           </h4>
                           
                           <div className="flex flex-nowrap overflow-x-auto pb-6 gap-0 items-center custom-scrollbar">
                              {overs.map((overData, oIdx) => (
                                  <div key={oIdx} className="flex items-center shrink-0 relative pr-4 md:pr-6">
                                     {/* Over Wrapper */}
                                     <div className="flex gap-2 items-center">
                                         {overData.balls.map((ball, bIdx) => (
                                             <div key={bIdx} className="flex flex-col items-center gap-1.5 min-w-[32px]">
                                                 <span className="text-[9px] font-bold text-txt-muted tracking-tighter">
                                                     {ball.deliveryNotation}
                                                 </span>
                                                 <div className={`w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0 rounded-full flex items-center justify-center font-black text-[10px] sm:text-xs border-2 transition-transform hover:-translate-y-1 hover:shadow-lg cursor-default ${
                                                     ball.type === 'wicket' ? 'bg-danger text-white border-danger-dark shadow-md shadow-danger/20' :
                                                     ball.type === 'wide' || ball.type === 'no-ball' ? 'bg-warning/20 text-warning-dark border-warning/30' :
                                                     ball.runs === 4 ? 'bg-accent/20 text-accent border-accent/30' :
                                                     ball.runs === 6 ? 'bg-accent text-white border-accent shadow-md shadow-accent/20' :
                                                     'bg-surface-alt text-txt-primary border-surface-border'
                                                 }`}>
                                                     {ball.displayLabel}
                                                 </div>
                                             </div>
                                         ))}
                                     </div>
                                     
                                     {/* Over Separator & Summary */}
                                     <div className="flex flex-col items-center justify-center ml-4 md:ml-6 relative h-16 w-16 shrink-0 group">
                                        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 border-l-2 border-dashed border-surface-border/80 group-hover:border-primary/40 transition-colors"></div>
                                        <div className="bg-surface-card border border-surface-border px-2 py-1.5 rounded-lg shadow-sm z-10 text-center min-w-[50px] group-hover:border-primary/30 transition-colors">
                                            <span className="block text-[8px] font-black text-txt-muted uppercase tracking-widest leading-none mb-1">OV {overData.overNumber}</span>
                                            <span className="block text-[11px] font-black text-primary leading-none">{overData.runs} Runs</span>
                                        </div>
                                     </div>
                                  </div>
                              ))}
                           </div>
                        </div>
                    );
                })}
                
                {scores.every(s => !s.ballByBall || s.ballByBall.length === 0) && (
                   <div className="text-center text-txt-muted italic text-sm py-8 bg-surface/50 rounded-xl border border-dashed border-surface-border">No timeline data available yet.</div>
                )}
             </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card p-5 bg-surface-card shadow-lg border border-surface-border">
              <h3 className="text-[10px] font-black text-txt-muted uppercase tracking-widest mb-4">Top Performers</h3>
              <p className="text-sm italic text-txt-muted">Feature coming soon: Match MVPs and impact players.</p>
            </div>
            <div className="card p-5 bg-surface-card shadow-lg border border-surface-border">
              <h3 className="text-[10px] font-black text-txt-muted uppercase tracking-widest mb-4">Tournament Info</h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary"><HiOutlineUserGroup className="text-lg" /></div>
                <div>
                  <p className="font-bold text-sm text-txt-primary">{match.tournamentId?.name || "Independent Match"}</p>
                  <p className="text-[10px] text-txt-muted uppercase font-bold tracking-widest">Host Organization</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scorecard Tab Content */}
      {activeTab === 'scorecard' && (
        <div className="space-y-6 animate-fade-in">
          {scores.map((score, idx) => {
            const team = score.teamId?.toString() === (match?.team1Id?._id || match?.team1Id).toString() ? match.team1Id : match.team2Id;
            return (
              <div key={idx} className="card p-0 overflow-hidden border-none shadow-xl">
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

      <div className="flex justify-center pt-8 border-t border-surface-border">
        <Link to="/fixtures" className="btn-primary px-12 flex items-center gap-2 py-4 rounded-2xl shadow-xl shadow-primary/20">
          <MdHistory className="text-xl" /> Return to Fixtures
        </Link>
      </div>
    </div>
  );
};

export default MatchSummaryPage;
