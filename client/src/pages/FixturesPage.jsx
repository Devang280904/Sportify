import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import LiveIndicator from '../components/LiveIndicator';
import { HiOutlineCalendar, HiOutlineSun, HiOutlineMoon } from 'react-icons/hi';

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
        <div className="relative mt-8">
          {/* Vertical Timeline Line */}
          <div className="hidden md:block absolute left-[140px] top-6 bottom-0 w-px border-l border-dashed border-txt-muted/30"></div>

          <div className="space-y-6">
            {filtered.map((match, idx) => {
              const matchDate = new Date(match.matchDate);
              const hour = matchDate.getHours();
              const isDay = hour >= 6 && hour < 18;
              const timeString = matchDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

              const team1Score = match.scores?.find(s => s.teamId?.toString() === (match.team1Id?._id || match.team1Id)?.toString());
              const team2Score = match.scores?.find(s => s.teamId?.toString() === (match.team2Id?._id || match.team2Id)?.toString());

              return (
                <div key={match._id} className="relative flex flex-col md:flex-row gap-4 md:items-stretch group animate-slide-up">
                  {/* Left Side: Timeline & Dates */}
                  <div className="md:w-[140px] flex-shrink-0 flex flex-col items-start pt-5 relative md:pr-6 z-10">
                    {/* Horizontal connector & dot (Desktop only) */}
                    <div className="hidden md:flex absolute top-[30px] -right-[6px] items-center">
                      <div className="w-12 border-t border-accent/40 mr-1 hidden lg:block"></div>
                      <div className="w-8 border-t border-accent/40 mr-1 lg:hidden"></div>
                      <div className="w-[11px] h-[11px] rounded-full bg-accent border-[3px] border-surface"></div>
                    </div>

                    <div className="border border-accent/40 text-accent text-[10px] font-bold px-2 py-0.5 rounded-sm tracking-widest mb-3 bg-surface z-10 relative">
                      MATCH {idx + 1}
                      <div className="hidden md:block absolute top-[9px] -right-12 lg:-right-16 w-12 lg:w-16 border-t border-accent/40 -z-10"></div>
                    </div>
                    
                    <h3 className="text-base font-black text-txt-primary uppercase tracking-tight">
                      {matchDate.toLocaleDateString('en-US', { month: 'short' })}, {matchDate.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}
                    </h3>
                    
                    <div className="flex items-center gap-1.5 text-xs text-txt-muted mt-1 font-medium">
                      {isDay ? <HiOutlineSun className="text-sm" /> : <HiOutlineMoon className="text-sm" />}
                      {timeString}
                    </div>
                  </div>

                  {/* Right Side: Match Card */}
                  <div className="flex-1 w-full bg-surface-card border border-surface-border rounded-xl overflow-hidden hover:shadow-card-lg transition-all group-hover:border-primary/20">
                    <Link to={match.status === 'live' ? `/match/${match._id}/view` : `/match/${match._id}`} className="block p-5 sm:p-6">
                      {/* Top row: Venue + Status */}
                      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                        <span className="text-[13px] text-txt-secondary font-medium">
                          {match.venue ? match.venue : 'Venue TBA'}
                        </span>
                        {match.status === 'live' ? <LiveIndicator /> : (
                          <span className={`${statusStyles[match.status]} text-[10px] scale-90 origin-right`}>{match.status}</span>
                        )}
                      </div>

                      {/* Teams row */}
                      <div className="flex items-center justify-between">
                        {/* Team 1 */}
                        <div className="flex items-center gap-x-3 sm:gap-x-4 flex-1">
                          {match.team1Id?.logoURL ? (
                            <img src={match.team1Id.logoURL} alt={match.team1Id.teamName} className="w-10 h-10 sm:w-12 sm:h-12 object-contain bg-white rounded-full p-1 border border-surface-border shadow-sm shrink-0" />
                          ) : (
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-base sm:text-lg border border-primary/20 shrink-0">
                              {match.team1Id?.teamName?.charAt(0)}
                            </div>
                          )}
                          <span className="font-bold text-txt-primary hidden sm:block truncate pr-2">{match.team1Id?.teamName}</span>
                          <span className="font-bold text-[13px] text-txt-primary sm:hidden truncate">{match.team1Id?.teamName?.substring(0, 3).toUpperCase()}</span>
                        </div>

                        {/* Center Area: Scores or VS */}
                        {match.status === 'scheduled' || !match.scores || match.scores.length === 0 ? (
                          <div className="font-black italic text-surface-border text-xl sm:text-2xl px-2 sm:px-4 opacity-50 select-none">
                            V/S
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center px-1 sm:px-4 shrink-0">
                            <div className="flex items-center gap-3 sm:gap-6">
                              <div className="text-center">
                                <div className="font-black text-xl sm:text-3xl tracking-tight text-txt-primary">
                                  {team1Score?.runs || 0}<span className="text-lg sm:text-2xl text-txt-muted/70">/{team1Score?.wickets || 0}</span>
                                </div>
                                <div className="text-[9px] sm:text-[10px] text-txt-muted font-bold tracking-widest mt-0.5">({team1Score?.overs || 0} OV)</div>
                              </div>
                              <div className="font-black italic text-surface-border/40 text-sm sm:text-lg select-none">-</div>
                              <div className="text-center">
                                <div className="font-black text-xl sm:text-3xl tracking-tight text-txt-primary">
                                  {team2Score?.runs || 0}<span className="text-lg sm:text-2xl text-txt-muted/70">/{team2Score?.wickets || 0}</span>
                                </div>
                                <div className="text-[9px] sm:text-[10px] text-txt-muted font-bold tracking-widest mt-0.5">({team2Score?.overs || 0} OV)</div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Team 2 */}
                        <div className="flex items-center gap-x-3 sm:gap-x-4 flex-1 justify-end">
                          <span className="font-bold text-txt-primary hidden sm:block truncate pl-2 text-right">{match.team2Id?.teamName}</span>
                          <span className="font-bold text-[13px] text-txt-primary sm:hidden truncate text-right">{match.team2Id?.teamName?.substring(0, 3).toUpperCase()}</span>
                          
                          {match.team2Id?.logoURL ? (
                            <img src={match.team2Id.logoURL} alt={match.team2Id.teamName} className="w-10 h-10 sm:w-12 sm:h-12 object-contain bg-white rounded-full p-1 border border-surface-border shadow-sm shrink-0" />
                          ) : (
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-bold text-base sm:text-lg border border-secondary/20 shrink-0">
                              {match.team2Id?.teamName?.charAt(0)}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Result summary */}
                      {match.resultMessage && (
                        <div className="mt-5 pt-3 border-t border-surface-border/30 text-center">
                          <span className="text-[11px] font-black uppercase tracking-widest text-[#00cfa7]">{match.resultMessage}</span>
                        </div>
                      )}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="card text-center py-16">
          <HiOutlineCalendar className="text-5xl text-txt-muted mx-auto mb-3" />
          <p className="text-txt-muted text-lg">No matches found.</p>
        </div>
      )}
    </div>
  );
};

export default FixturesPage;
