import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import LiveIndicator from '../components/LiveIndicator';
import { HiOutlineRewind, HiOutlineSwitchHorizontal } from 'react-icons/hi';
import { MdSportsCricket, MdPersonAdd } from 'react-icons/md';

const LiveScoringPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { socket, joinMatch } = useSocket();
  const { user } = useAuth();
  const [match, setMatch] = useState(null);
  const [scores, setScores] = useState([]);
  const [activeTeamId, setActiveTeamId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // For selection modals/dropdowns
  const [team1Players, setTeam1Players] = useState([]);
  const [team2Players, setTeam2Players] = useState([]);
  const [showBatsmanModal, setShowBatsmanModal] = useState(false);
  const [showBowlerModal, setShowBowlerModal] = useState(false);
  const [selectingType, setSelectingType] = useState('striker'); // 'striker', 'nonStriker', 'bowler'

  useEffect(() => {
    fetchMatch();
    joinMatch(id);
  }, [id]);

  useEffect(() => {
    if (socket) {
      socket.on('scoreUpdated', (data) => {
        if (data.matchId === id) {
          setScores(prev => prev.map(s => s.teamId === data.teamId ? { ...s, ...data } : s));
        }
      });
      socket.on('inningsSwapped', () => fetchMatch());
      socket.on('matchCompleted', () => navigate(`/match/${id}/summary`));
    }
    return () => {
      if (socket) {
        socket.off('scoreUpdated');
        socket.off('inningsSwapped');
        socket.off('matchCompleted');
      }
    };
  }, [socket, id]);

  const fetchMatch = async () => {
    try {
      const res = await api.get(`/matches/${id}`);
      const matchData = res.data.data.match;
      setMatch(matchData);
      setScores(res.data.data.scores);

      if (matchData.battingTeamId) {
        setActiveTeamId(matchData.battingTeamId);
      } else if (res.data.data.scores.length > 0) {
        setActiveTeamId(res.data.data.scores[0].teamId);
      }

      // Fetch player lists for teams
      const [t1Res, t2Res] = await Promise.all([
        api.get(`/teams/${matchData.team1Id?._id}`),
        api.get(`/teams/${matchData.team2Id?._id}`),
      ]);
      setTeam1Players(t1Res.data.data.players || []);
      setTeam2Players(t2Res.data.data.players || []);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const activeScore = scores.find(s => s.teamId === activeTeamId);
  const battingTeam = activeTeamId === match?.team1Id?._id ? match?.team1Id : match?.team2Id;
  const bowlingTeam = activeTeamId === match?.team1Id?._id ? match?.team2Id : match?.team1Id;
  const battingPlayers = activeTeamId === match?.team1Id?._id ? team1Players : team2Players;
  const bowlingPlayers = activeTeamId === match?.team1Id?._id ? team2Players : team1Players;

  const updateScore = async (runs, type = 'normal', description = '') => {
    if (!activeTeamId || updating) return;
    if (!activeScore?.strikerId || !activeScore?.currentBowlerId) {
      alert('Please select striker and bowler first');
      return;
    }

    setUpdating(true);
    try {
      const res = await api.post(`/matches/${id}/score`, {
        teamId: activeTeamId,
        runs,
        type,
        description,
      });
      const newScore = res.data.data;
      setScores(prev => prev.map(s => s.teamId === activeTeamId ? newScore : s));

      if (type === 'wicket') {
        setShowBatsmanModal(true);
        setSelectingType('striker');
      }

      // Check if over completed (server will set currentBowlerId to null)
      if (!newScore.currentBowlerId && newScore.wickets < 10) {
        const legalBalls = newScore.ballByBall.filter(b => b.type !== 'wide' && b.type !== 'no-ball').length;
        // Don't pop modal if innings max overs reached
        if (legalBalls < match.totalOvers * 6) {
          setShowBowlerModal(true);
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update score');
    } finally {
      setUpdating(false);
    }
  };

  const setBatsman = async (playerId, type) => {
    try {
      const payload = { teamId: activeTeamId };
      if (type === 'striker') payload.strikerId = playerId;
      else payload.nonStrikerId = playerId;

      const res = await api.post(`/matches/${id}/set-batsmen`, payload);
      setScores(prev => prev.map(s => s.teamId === activeTeamId ? res.data.data : s));
      setShowBatsmanModal(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to set batsman');
    }
  };

  const setBowler = async (playerId) => {
    try {
      const res = await api.post(`/matches/${id}/set-bowler`, {
        teamId: activeTeamId,
        bowlerId: playerId
      });
      setScores(prev => prev.map(s => s.teamId === activeTeamId ? res.data.data : s));
      setShowBowlerModal(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to set bowler');
    }
  };

  const handleSwapInnings = async () => {
    if (!window.confirm('Are you sure you want to swap innings?')) return;
    try {
      await api.post(`/matches/${id}/swap-innings`);
      fetchMatch();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to swap innings');
    }
  };

  const undoLastBall = async () => {
    if (!activeTeamId || updating) return;
    setUpdating(true);
    try {
      const res = await api.post(`/matches/${id}/undo`, { teamId: activeTeamId });
      setScores(prev => prev.map(s => s.teamId === activeTeamId ? res.data.data : s));
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
    if (!window.confirm('Complete and end this match?')) return;
    try {
      await api.post(`/matches/${id}/complete`, { winnerId });
      navigate(`/match/${id}/summary`);
    } catch (err) {
      alert('Failed to complete match');
    }
  };

  // Helper to get player stats from scoreRecord
  const getBattingStat = (playerId) => activeScore?.batting?.find(b => b.playerId === playerId) || { runs: 0, ballsFaced: 0 };
  const getBowlingStat = (playerId) => activeScore?.bowling?.find(b => b.playerId === playerId) || { oversBowled: 0, runsConceded: 0, wickets: 0 };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-primary"><div className="animate-spin rounded-full h-12 w-12 border-4 border-accent border-t-transparent"></div></div>;
  if (!match) return <div className="card text-center py-12"><p className="text-txt-muted">Match not found</p></div>;

  const isOwner = user?.id === match?.tournamentId?.organizerId || user?.id === match?.tournamentId?.organizerId?._id;

  const availableBatsmen = battingPlayers.filter(player => {
    const stat = activeScore?.batting?.find(b => b.playerId === player._id);
    if (stat?.isOut) return false;
    if (selectingType === 'striker' && player._id === activeScore?.nonStrikerId) return false;
    if (selectingType === 'nonStriker' && player._id === activeScore?.strikerId) return false;
    return true;
  });

  const getRestrictedBowler = () => {
    if (!activeScore?.ballByBall?.length) return null;
    const legalBalls = activeScore.ballByBall.filter(b => b.type !== 'wide' && b.type !== 'no-ball');
    const completedOvers = Math.floor(legalBalls.length / 6);
    if (completedOvers === 0) return null;
    // Return the bowler who bowled the final ball of the last completed over
    const lastBallOfCompletedOver = legalBalls[completedOvers * 6 - 1];
    return lastBallOfCompletedOver?.bowlerId;
  };

  const restrictedBowlerId = getRestrictedBowler();
  const availableBowlers = bowlingPlayers.filter(player => player._id !== restrictedBowlerId);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Match Header Scoreboard */}
      <div className="card bg-gradient-to-br from-primary-dark to-primary text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4"><LiveIndicator size="md" /></div>
        <div className="grid grid-cols-2 gap-8 py-4">
          <div className={`text-center transition-all ${activeTeamId === match.team1Id?._id ? 'scale-110' : 'opacity-60'}`}>
            <p className="text-sm font-medium mb-1">{match.team1Id?.teamName}</p>
            <h2 className="text-4xl font-bold">
              {scores.find(s => s.teamId === match.team1Id?._id)?.runs || 0}/
              {scores.find(s => s.teamId === match.team1Id?._id)?.wickets || 0}
            </h2>
            <p className="text-xs text-white/70 mt-1">({scores.find(s => s.teamId === match.team1Id?._id)?.overs || 0} ov)</p>
          </div>
          <div className={`text-center transition-all ${activeTeamId === match.team2Id?._id ? 'scale-110' : 'opacity-60'}`}>
            <p className="text-sm font-medium mb-1">{match.team2Id?.teamName}</p>
            <h2 className="text-4xl font-bold">
              {scores.find(s => s.teamId === match.team2Id?._id)?.runs || 0}/
              {scores.find(s => s.teamId === match.team2Id?._id)?.wickets || 0}
            </h2>
            <p className="text-xs text-white/70 mt-1">({scores.find(s => s.teamId === match.team2Id?._id)?.overs || 0} ov)</p>
          </div>
        </div>
      </div>

      {!isOwner && match.status === 'live' && (
        <div className="card text-center py-4 bg-primary/5 text-primary">
          <p className="font-semibold text-sm">View Only Mode: You are watching this match live.</p>
        </div>
      )}

      {match.status === 'live' && (
        <>
          {/* Batting & Bowling Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Batsmen Card */}
            <div className="card bg-surface p-4 shadow-lg border-l-4 border-accent">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-txt-primary flex items-center gap-2">
                  <MdSportsCricket className="text-accent" /> Batting
                </h3>
              </div>
              <div className="space-y-3">
                {/* Striker */}
                <div className={`flex justify-between items-center p-2 rounded-lg ${activeScore?.strikerId ? 'bg-primary/5 border border-primary/10' : 'bg-surface-alt'}`}>
                  {activeScore?.strikerId ? (
                    <>
                      <div>
                        <p className="font-bold text-sm flex items-center gap-1">
                          {battingPlayers.find(p => p._id === activeScore.strikerId)?.name} <span className="text-accent">★</span>
                        </p>
                        <p className="text-[10px] text-txt-muted">SR: {getBattingStat(activeScore.strikerId).strikeRate?.toFixed(1) || 0}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-primary">{getBattingStat(activeScore.strikerId).runs}</p>
                        <p className="text-[10px] text-txt-muted">{getBattingStat(activeScore.strikerId).ballsFaced} balls</p>
                      </div>
                    </>
                  ) : (
                    isOwner ? (
                      activeScore?.wickets >= 10 ? (
                        <span className="text-danger font-bold text-sm mx-auto py-2">All Out</span>
                      ) : (
                        <button onClick={() => { setShowBatsmanModal(true); setSelectingType('striker'); }} className="text-xs text-primary font-medium flex items-center gap-1 mx-auto py-2">
                          <MdPersonAdd /> Select Striker
                        </button>
                      )
                    ) : null
                  )}
                </div>
                {/* Non-Striker */}
                <div className={`flex justify-between items-center p-2 rounded-lg ${activeScore?.nonStrikerId ? 'bg-surface-alt' : 'bg-surface-alt border-dashed border'}`}>
                  {activeScore?.nonStrikerId ? (
                    <>
                      <div>
                        <p className="font-bold text-sm">{battingPlayers.find(p => p._id === activeScore.nonStrikerId)?.name}</p>
                        <p className="text-[10px] text-txt-muted">SR: {getBattingStat(activeScore.nonStrikerId).strikeRate?.toFixed(1) || 0}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{getBattingStat(activeScore.nonStrikerId).runs}</p>
                        <p className="text-[10px] text-txt-muted">{getBattingStat(activeScore.nonStrikerId).ballsFaced} balls</p>
                      </div>
                    </>
                  ) : (
                    isOwner ? (
                      activeScore?.wickets >= 10 ? (
                        <span className="text-danger font-bold text-sm mx-auto py-2">All Out</span>
                      ) : (
                        <button onClick={() => { setShowBatsmanModal(true); setSelectingType('nonStriker'); }} className="text-xs text-txt-muted font-medium flex items-center gap-1 mx-auto py-2">
                          <MdPersonAdd /> Select Non-Striker
                        </button>
                      )
                    ) : null
                  )}
                </div>
              </div>
            </div>

            {/* Bowler Card */}
            <div className="card bg-surface p-4 shadow-lg border-l-4 border-secondary">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-txt-primary flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-secondary"></span> Bowling
                </h3>
              </div>
              <div className={`flex justify-between items-center p-3 rounded-lg h-24 ${activeScore?.currentBowlerId ? 'bg-secondary/5 border border-secondary/10' : 'bg-surface-alt border-dashed border'}`}>
                {activeScore?.currentBowlerId ? (
                  <>
                    <div>
                      <p className="font-bold text-sm">{bowlingPlayers.find(p => p._id === activeScore.currentBowlerId)?.name}</p>
                      <p className="text-[10px] text-txt-muted">Econ: {getBowlingStat(activeScore.currentBowlerId).economy?.toFixed(1) || 0}</p>
                      {isOwner && <button onClick={() => setShowBowlerModal(true)} className="text-[10px] text-secondary hover:underline mt-1 font-medium">Change Bowler</button>}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-secondary">
                        {getBowlingStat(activeScore.currentBowlerId).wickets}-{getBowlingStat(activeScore.currentBowlerId).runsConceded}
                      </p>
                      <p className="text-[10px] text-txt-muted">{getBowlingStat(activeScore.currentBowlerId).oversBowled} overs</p>
                    </div>
                  </>
                ) : (
                  isOwner ? (
                    <button onClick={() => setShowBowlerModal(true)} className="text-xs text-secondary font-medium flex items-center gap-1 mx-auto py-4">
                      <MdPersonAdd /> Select Bowler
                    </button>
                  ) : null
                )}
              </div>
            </div>
          </div>

          {/* Scoring Controls */}
          {isOwner && (
            <div className="card shadow-2xl overflow-hidden">
              <div className="bg-primary text-white px-4 py-2 text-xs font-bold tracking-widest uppercase flex justify-between">
                <span>Quick Actions</span>
                <span>Innings {match.currentInnings}</span>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-3 mb-6">
                  {[0, 1, 2, 3, 4, 5, 6].map(runs => (
                    <button key={runs} onClick={() => updateScore(runs)} disabled={updating}
                      className="h-16 flex flex-col items-center justify-center bg-surface-alt border border-surface-border hover:bg-primary hover:text-white hover:border-primary text-txt-primary rounded-xl transition-all group">
                      <span className="text-2xl font-black">{runs}</span>
                      <span className="text-[10px] opacity-0 group-hover:opacity-100 uppercase">Runs</span>
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <button onClick={() => updateScore(1, 'wide')} disabled={updating} className="btn bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-600 hover:text-white py-4 font-black rounded-xl text-lg uppercase">WD</button>
                  <button onClick={() => updateScore(1, 'no-ball')} disabled={updating} className="btn bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-600 hover:text-white py-4 font-black rounded-xl text-lg uppercase">NB</button>
                  <button onClick={() => updateScore(0, 'wicket')} disabled={updating} className="btn bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white py-4 font-black rounded-xl text-lg uppercase">Out</button>
                </div>
                <div className="flex gap-4 mt-8 pt-6 border-t border-surface-border">
                  <button onClick={undoLastBall} disabled={updating} className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-warning text-warning font-bold hover:bg-warning hover:text-white transition-all">
                    <HiOutlineRewind className="text-xl" /> Undo Ball
                  </button>
                  <button onClick={handleSwapInnings} disabled={match.currentInnings >= 2} className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border ${match.currentInnings >= 2 ? 'border-surface-border text-txt-muted opacity-50 cursor-not-allowed' : 'border-secondary text-secondary font-bold hover:bg-secondary hover:text-white'} transition-all`}>
                    <HiOutlineSwitchHorizontal className="text-xl" /> Swap Innings
                  </button>
                  {match.currentInnings === 2 && (
                    <button onClick={completeMatch} className="flex-1 py-3 px-4 rounded-xl bg-danger text-white font-bold hover:bg-danger-dark shadow-lg shadow-danger/20 transition-all">
                      End Match
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Match Setup - Pick batting team */}
      {match.status === 'scheduled' && isOwner && (
        <div className="card text-center py-10 space-y-6">
          <MdSportsCricket className="text-6xl text-primary mx-auto opacity-20" />
          <div>
            <h2 className="text-2xl font-bold mb-1">Ready to Start?</h2>
            <p className="text-txt-muted text-sm">Choose which team bats first</p>
          </div>
          <div className="flex flex-col sm:flex-row justify-center gap-4 max-w-sm mx-auto">
            <button
              onClick={async () => {
                try {
                  const res = await api.post(`/matches/${id}/start`, { battingTeamId: match.team1Id?._id });
                  setMatch(res.data.data);
                  setActiveTeamId(res.data.data.battingTeamId);
                } catch (e) { alert(e.response?.data?.message || 'Failed to start match'); }
              }}
              className="btn-primary flex-1 py-4 text-base font-bold"
            >
              🏏 {match.team1Id?.teamName} Bats
            </button>
            <button
              onClick={async () => {
                try {
                  const res = await api.post(`/matches/${id}/start`, { battingTeamId: match.team2Id?._id });
                  setMatch(res.data.data);
                  setActiveTeamId(res.data.data.battingTeamId);
                } catch (e) { alert(e.response?.data?.message || 'Failed to start match'); }
              }}
              className="btn-secondary flex-1 py-4 text-base font-bold"
            >
              🏏 {match.team2Id?.teamName} Bats
            </button>
          </div>
        </div>
      )}


      {/* Ball-by-ball log */}
      {activeScore?.ballByBall?.length > 0 && (
        <div className="card p-6 border-t-4 border-primary/20">
          <h3 className="font-bold text-txt-primary mb-4 flex items-center gap-2">
            {isOwner ? 'Current Over' : 'Over-by-Over History'}
          </h3>

          {isOwner ? (
            <div className="flex flex-wrap gap-2">
              {activeScore.ballByBall
                .filter(b => b.over === Math.max(...activeScore.ballByBall.map(x => x.over), 1))
                .map((ball, i) => (
                  <div key={i} className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border-2 shadow-sm ${ball.type === 'wicket' ? 'bg-red-600 text-white border-red-700' :
                      ball.runs === 4 ? 'bg-accent/20 text-accent border-accent/30' :
                        ball.runs === 6 ? 'bg-accent text-white border-accent-dark' :
                          (ball.type === 'wide' || ball.type === 'no-ball') ? 'bg-orange-100 text-orange-700 border-orange-200' :
                            'bg-surface-alt text-txt-primary border-surface-border'
                    }`}>
                    {ball.type === 'wicket' ? 'W' : ball.type === 'wide' ? 'Wd' : ball.type === 'no-ball' ? 'Nb' : ball.runs}
                  </div>
                ))}
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(
                activeScore.ballByBall.reduce((acc, ball) => {
                  if (!acc[ball.over]) acc[ball.over] = [];
                  acc[ball.over].push(ball);
                  return acc;
                }, {})
              ).map(([overNum, balls]) => (
                <div key={overNum} className="flex flex-col md:flex-row md:items-center gap-3 bg-surface-alt p-3 rounded-xl border border-surface-border shadow-sm">
                  <span className="text-xs font-bold text-txt-muted uppercase w-16 shrink-0">Over {overNum}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {balls.map((ball, i) => (
                      <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs border ${ball.type === 'wicket' ? 'bg-red-600 text-white border-red-700' :
                          ball.runs === 4 ? 'bg-accent/20 text-accent border-accent/30' :
                            ball.runs === 6 ? 'bg-accent text-white border-accent-dark' :
                              (ball.type === 'wide' || ball.type === 'no-ball') ? 'bg-orange-100 text-orange-700 border-orange-200' :
                                'bg-white text-txt-primary border-surface-border'
                        }`}>
                        {ball.type === 'wicket' ? 'W' : ball.type === 'wide' ? 'Wd' : ball.type === 'no-ball' ? 'Nb' : ball.runs}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showBatsmanModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
            <div className="bg-primary p-4 text-white font-bold flex justify-between items-center">
              <span>Select {selectingType === 'striker' ? 'Striker' : 'Non-Striker'}</span>
              <button onClick={() => setShowBatsmanModal(false)} className="text-white/70 hover:text-white">✕</button>
            </div>
            <div className="max-h-96 overflow-y-auto p-4 space-y-2">
              {availableBatsmen.map(player => (
                <button key={player._id} onClick={() => setBatsman(player._id, selectingType)}
                  className="w-full flex justify-between items-center p-4 rounded-xl border border-surface-border hover:border-primary hover:bg-primary/5 transition-all text-left">
                  <span className="font-bold">{player.name}</span>
                  <span className="text-xs text-txt-muted uppercase tracking-tighter">{player.role}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showBowlerModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
            <div className="bg-secondary p-4 text-white font-bold flex justify-between items-center">
              <span>Select Current Bowler</span>
              <button onClick={() => setShowBowlerModal(false)} className="text-white/70 hover:text-white">✕</button>
            </div>
            <div className="max-h-96 overflow-y-auto p-4 space-y-2">
              {availableBowlers.map(player => (
                <button key={player._id} onClick={() => setBowler(player._id)}
                  className="w-full flex justify-between items-center p-4 rounded-xl border border-surface-border hover:border-secondary hover:bg-secondary/5 transition-all text-left">
                  <span className="font-bold">{player.name}</span>
                  <span className="text-xs text-txt-muted uppercase tracking-tighter">{player.role}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveScoringPage;
