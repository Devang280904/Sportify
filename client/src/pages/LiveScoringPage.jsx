import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import LiveIndicator from '../components/LiveIndicator';
import { HiOutlineRewind, HiOutlineSwitchHorizontal, HiOutlineChevronRight } from 'react-icons/hi';
import { MdSportsCricket, MdPersonAdd } from 'react-icons/md';
import VictoryOverlay from '../components/VictoryOverlay';

const DISMISSAL_TYPES = [
  { value: 'BOWLED',            label: 'Bowled',                       icon: '🎯', desc: 'Ball hits the stumps', prefix: 'b' },
  { value: 'CAUGHT',            label: 'Caught',                       icon: '🤲', desc: 'Fielder catches ball', prefix: 'c', needsFielder: true },
  { value: 'LBW',               label: 'LBW',                          icon: '🦵', desc: 'Leg before wicket', prefix: 'lbw b' },
  { value: 'RUN_OUT',           label: 'Run Out',                      icon: '🏃', desc: 'Failed to reach crease', prefix: 'run out', needsFielder: true },
  { value: 'STUMPED',           label: 'Stumped',                      icon: '🧤', desc: 'Keeper removes bails', prefix: 'st', needsFielder: true },
  { value: 'HIT_WICKET',        label: 'Hit Wicket',                   icon: '🏏', desc: 'Batsman hits own stumps', prefix: 'hit wicket b' },
  { value: 'MANKAD',            label: 'Mankad (Non-Striker Run Out)',  icon: '⚡', desc: 'Non-striker backing up early', prefix: 'run out (mankad) b' },
  { value: 'RETIRED_OUT',       label: 'Retired Out',                  icon: '🚶', desc: 'Leaves without permission' },
  { value: 'RETIRED_HURT',      label: 'Retired Hurt (Not Out)',       icon: '🩹', desc: 'Leaves due to injury' },
  { value: 'OBSTRUCTING_FIELD', label: 'Obstructing the Field',        icon: '🚫', desc: 'Deliberate obstruction' },
  { value: 'HIT_BALL_TWICE',    label: 'Hit the Ball Twice',           icon: '❌', desc: 'Hits ball twice' },
  { value: 'TIMED_OUT',         label: 'Timed Out',                    icon: '⏱️', desc: 'New batsman late' },
];

const LiveScoringPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { socket, joinMatch } = useSocket();
  const { user } = useAuth();
  const [match, setMatch] = useState(null);
  const [scores, setScores] = useState([]);
  const [activeTeamId, setActiveTeamId] = useState(null);
  const [matchResult, setMatchResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState('live'); // 'live', 'scorecard', 'squads'
  const [showCelebration, setShowCelebration] = useState(false);

  // For selection modals/dropdowns
  const [team1Players, setTeam1Players] = useState([]);
  const [team2Players, setTeam2Players] = useState([]);
  const [showBatsmanModal, setShowBatsmanModal] = useState(false);
  const [showBowlerModal, setShowBowlerModal] = useState(false);
  const [selectingType, setSelectingType] = useState('striker'); // 'striker', 'nonStriker', 'bowler'

  // Dismissal modal state
  const [showDismissalModal, setShowDismissalModal] = useState(false);
  const [selectedDismissalType, setSelectedDismissalType] = useState(null);
  const [selectedFielderId, setSelectedFielderId] = useState(null);

  useEffect(() => {
    fetchMatch();
    if (id) {
       joinMatch(id);
    }
  }, [id, socket, joinMatch]);

  useEffect(() => {
    if (!socket) return;
    socket.on('scoreUpdated', (data) => {
      if (data.matchId?.toString() === id?.toString()) {
        setScores(prev => prev.map(s => s.teamId?.toString() === data.teamId?.toString() ? { ...s, ...data } : s));
      }
    });
    socket.on('inningsSwapped', (data) => {
      if (data.matchId?.toString() === id?.toString()) {
        setMatch(prev => prev ? { 
            ...prev, 
            currentInnings: data.innings, 
            battingTeamId: data.newBattingTeamId 
        } : prev);
        setActiveTeamId(data.newBattingTeamId?.toString());
      }
    });
    socket.on('matchStarted', (data) => {
      if (data.matchId?.toString() === id?.toString()) {
        setMatch(prev => prev ? { ...prev, status: 'live' } : prev);
      }
    });
    socket.on('matchCompleted', (data) => {
      if (data.matchId?.toString() === id?.toString()) {
        setMatchResult(data?.resultMessage || "Match Completed");
        setMatch(prev => prev ? { 
            ...prev, 
            status: 'completed', 
            winnerId: data.winnerId, 
            resultMessage: data.resultMessage 
        } : prev);
        setShowCelebration(true);
      }
    });
    return () => {
      socket.off('scoreUpdated');
      socket.off('inningsSwapped');
      socket.off('matchCompleted');
      socket.off('matchStarted');
    };
  }, [socket, id]);

  const fetchMatch = async () => {
    try {
      const res = await api.get(`/matches/${id}`);
      const matchData = res.data.data.match;
      setMatch(matchData);
      setScores(res.data.data.scores);

      if (matchData.battingTeamId) {
        setActiveTeamId(matchData.battingTeamId.toString());
      } else if (res.data.data.scores.length > 0) {
        setActiveTeamId(res.data.data.scores[0].teamId.toString());
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

  const activeScore = scores.find(s => s.teamId.toString() === activeTeamId?.toString());
  const battingTeam = activeTeamId?.toString() === (match?.team1Id?._id || match?.team1Id)?.toString() ? match?.team1Id : match?.team2Id;
  const bowlingTeam = activeTeamId?.toString() === (match?.team1Id?._id || match?.team1Id)?.toString() ? match?.team2Id : match?.team1Id;
  const battingPlayers = activeTeamId?.toString() === (match?.team1Id?._id || match?.team1Id)?.toString() ? team1Players : team2Players;
  const bowlingPlayers = activeTeamId?.toString() === (match?.team1Id?._id || match?.team1Id)?.toString() ? team2Players : team1Players;

  const updateScore = async (runs, type = 'normal', description = '', dismissalType = null, dismissalDesc = '') => {
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
        dismissalType: type === 'wicket' ? dismissalType : null,
        dismissalDescription: type === 'wicket' ? dismissalDesc : '',
      });
      const newScore = res.data.data;
      setScores(prev => prev.map(s => s.teamId === activeTeamId ? newScore : s));
      
      // Auto-end match if status returned in response
      if (res.data.matchStatus === 'completed') {
        setMatch(prev => ({ 
          ...prev, 
          status: 'completed', 
          winnerId: res.data.winnerId, 
          resultMessage: res.data.resultMessage 
        }));
        setMatchResult(res.data.resultMessage);
        setShowCelebration(true);
      }

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

  // Called when user presses "Out" button — shows dismissal modal first
  const handleWicketPress = () => {
    if (!activeTeamId || updating) return;
    if (!activeScore?.strikerId || !activeScore?.currentBowlerId) {
      alert('Please select striker and bowler first');
      return;
    }
    setSelectedDismissalType(null);
    setSelectedFielderId(null);
    setShowDismissalModal(true);
  };

  // Confirmed from dismissal modal
  const confirmDismissal = () => {
    if (!selectedDismissalType) {
      alert('Please select a dismissal type');
      return;
    }

    const typeConfig = DISMISSAL_TYPES.find(t => t.value === selectedDismissalType);
    
    // Purely auto-generate description based on selection
    let autoDesc = '';
    const fielder = bowlingPlayers.find(p => p._id === selectedFielderId);
    const bowler = bowlingPlayers.find(p => p._id === activeScore?.currentBowlerId);
    
    if (selectedDismissalType === 'CAUGHT' && fielder && bowler) {
      if (fielder._id.toString() === bowler._id.toString()) {
        autoDesc = `c & b ${bowler.name}`;
      } else {
        autoDesc = `${typeConfig.prefix} ${fielder.name} b ${bowler.name}`;
      }
    } else if (selectedDismissalType === 'STUMPED' && fielder && bowler) {
      autoDesc = `${typeConfig.prefix} ${fielder.name} b ${bowler.name}`;
    } else if (['BOWLED', 'LBW', 'HIT_WICKET', 'MANKAD'].includes(selectedDismissalType) && bowler) {
      autoDesc = `${typeConfig.prefix} ${bowler.name}`;
    } else if (selectedDismissalType === 'RUN_OUT' && fielder) {
      autoDesc = `${typeConfig.prefix} (${fielder.name})`;
    } else {
      autoDesc = typeConfig.label;
    }

    setShowDismissalModal(false);
    const isRetiredHurt = selectedDismissalType === 'RETIRED_HURT';
    updateScore(0, isRetiredHurt ? 'normal' : 'wicket', '', selectedDismissalType, autoDesc);
  };

  const setBatsman = async (playerId, type) => {
    try {
      const payload = { teamId: activeTeamId };
      if (type === 'striker') payload.strikerId = playerId;
      else payload.nonStrikerId = playerId;

      const res = await api.post(`/matches/${id}/set-batsmen`, payload);
      const updatedScore = res.data.data;
      setScores(prev => prev.map(s => s.teamId.toString() === activeTeamId.toString() ? updatedScore : s));
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

  const isOwner = user?.id?.toString() === (match?.tournamentId?.organizerId?._id || match?.tournamentId?.organizerId)?.toString() ||
                   user?.id?.toString() === (match?.createdBy?._id || match?.createdBy)?.toString();

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
    <div className="max-w-4xl mx-auto space-y-6 pb-20 relative">
      {/* Victory Celebration Overlay */}
      {showCelebration && match?.status === 'completed' && (
        <VictoryOverlay 
          winner={match.winnerId} 
          resultMessage={matchResult || match.resultMessage} 
          onAction={() => {
            setShowCelebration(false);
            navigate(`/match/${id}/summary`);
          }} 
        />
      )}

      {/* Match Header Scoreboard: Professional Dark Theme */}
      <div className="bg-primary-dark text-white rounded-t-xl overflow-hidden relative border border-white/10 shadow-2xl">
        <div className="absolute top-0 right-0 p-4"><LiveIndicator size="md" /></div>
        
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
            <div 
              onClick={() => navigate(`/teams/${match.team1Id._id}`)}
              className={`flex flex-col items-center gap-3 w-24 shrink-0 cursor-pointer hover:opacity-100 transition-opacity ${activeTeamId?.toString() === (match?.team1Id?._id || match?.team1Id).toString() ? 'opacity-100 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'opacity-60 grayscale-[30%]'}`}>
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
                  <h2 className="text-3xl lg:text-4xl font-black tabular-nums tracking-tight">
                    {scores.find(s => s.teamId?.toString() === (match.team1Id?._id || match.team1Id).toString())?.runs || 0}/{scores.find(s => s.teamId?.toString() === (match.team1Id?._id || match.team1Id).toString())?.wickets || 0}
                  </h2>
                  <p className="text-sm text-white/60 font-medium mt-1">({scores.find(s => s.teamId?.toString() === (match.team1Id?._id || match.team1Id).toString())?.overs || 0} ov)</p>
              </div>

              {/* Separator / Target */}
              <div className="flex flex-col items-center justify-center min-w-[80px]">
                {match.currentInnings === 2 && (
                  <div className="mb-2 px-3 py-1 bg-white/10 rounded-full">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white">Target: {
                      (scores.find(s => s.teamId.toString() !== match.battingTeamId.toString())?.runs || 0) + 1
                    }</span>
                  </div>
                )}
                <span className="font-black text-white/20 uppercase tracking-[0.2em] text-sm">V/S</span>
              </div>

              {/* Team 2 Score */}
              <div className="text-center">
                  <h2 className="text-3xl lg:text-4xl font-black tabular-nums tracking-tight">
                    {scores.find(s => s.teamId?.toString() === (match.team2Id?._id || match.team2Id).toString())?.runs || 0}/{scores.find(s => s.teamId?.toString() === (match.team2Id?._id || match.team2Id).toString())?.wickets || 0}
                  </h2>
                  <p className="text-sm text-white/60 font-medium mt-1">({scores.find(s => s.teamId?.toString() === (match.team2Id?._id || match.team2Id).toString())?.overs || 0} ov)</p>
              </div>
            </div>

            {/* Team 2 Profile */}
            <div 
              onClick={() => navigate(`/teams/${match.team2Id._id}`)}
              className={`flex flex-col items-center gap-3 w-24 shrink-0 cursor-pointer hover:opacity-100 transition-opacity ${activeTeamId?.toString() === (match?.team2Id?._id || match?.team2Id).toString() ? 'opacity-100 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'opacity-60 grayscale-[30%]'}`}>
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
            {match.status === 'completed' && match.resultMessage ? (
              <p className="font-medium text-white">{match.resultMessage}</p>
            ) : match.status === 'live' ? (
              <p className="font-medium text-accent">Match is Live</p>
            ) : (
              <p className="font-medium text-white/60">Match Scheduled</p>
            )}

            {/* Extra bottom meta Info */}
            <div className="text-[11px] text-white/40 uppercase tracking-widest font-medium pt-2">
              T{match.totalOvers} • {match.playersPerTeam} Players • Created by: {match.createdBy?.name || match.tournamentId?.organizerId?.name || 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-primary-dark/95 rounded-b-xl border border-t-0 border-white/10 shadow-sm overflow-hidden mb-6">
        {['live', 'scorecard', 'squads'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-4 px-4 text-[11px] md:text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === tab 
                ? 'text-white border-b-[3px] border-white bg-white/5' 
                : 'text-white/50 hover:text-white hover:bg-white/5 border-b-[3px] border-transparent'
            }`}>
            {tab}
          </button>
        ))}
      </div>

      {!isOwner && match.status === 'live' && (
        <div className="card text-center py-4 bg-primary/5 text-primary rounded-xl border border-primary/20">
          <p className="font-black text-xs uppercase tracking-widest">LIVE • VIEW ONLY MODE</p>
        </div>
      )}

      {activeTab === 'live' && match.status === 'live' && (
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
                  <button onClick={handleWicketPress} disabled={updating} className="btn bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white py-4 font-black rounded-xl text-lg uppercase">Out</button>
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

      {activeTab === 'scorecard' && (
        <div className="space-y-6 animate-fade-in">
          {scores.map((score, idx) => {
            const team = score.teamId?.toString() === (match?.team1Id?._id || match?.team1Id).toString() ? match.team1Id : match.team2Id;
            return (
              <div key={idx} className="card p-0 overflow-hidden border-2 border-primary/10 shadow-xl">
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
                                    <td className="px-6 py-4 text-txt-primary">
                                        <div className="flex flex-col">
                                            <span className="font-bold">{b.playerName}</span>
                                            <span className="text-[10px] text-txt-muted mt-0.5">
                                                {b.isOut ? (b.dismissalDescription || b.dismissalType || 'Out') : 'not out'}
                                            </span>
                                        </div>
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

      {activeTab === 'squads' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
           {[match.team1Id, match.team2Id].map((team, idx) => (
             <div key={idx} className="card p-0 overflow-hidden border border-surface-border shadow-lg">
                <div className="bg-surface-alt px-6 py-4 border-b border-surface-border flex items-center gap-3">
                   {team?.logoURL ? (
                     <img src={team.logoURL} alt={team.teamName} className="w-10 h-10 object-contain" />
                   ) : (
                     <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary uppercase">{team?.teamName?.charAt(0)}</div>
                   )}
                   <h3 className="font-black uppercase tracking-widest text-sm">{team?.teamName} Squad</h3>
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

      {/* Match Setup - Pick batting team */}
      {activeTab === 'live' && match.status === 'scheduled' && isOwner && (
        <div className="card text-center py-12 space-y-6 shadow-2xl border-none bg-white">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <MdSportsCricket className="text-5xl text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-txt-primary uppercase tracking-widest mb-2">Match Setup</h2>
            {new Date(Date.now() + 15 * 60000) < new Date(match.matchDate) ? (
              <div className="space-y-4">
                <p className="text-txt-muted text-sm font-medium">The match is scheduled for {new Date(match.matchDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.<br/>You can set up the toss 15 minutes prior to the start time.</p>
                <div className="inline-block bg-surface-alt border border-surface-border text-txt-secondary font-bold px-6 py-3 rounded-full uppercase tracking-widest text-xs">
                  Awaiting Match Time
                </div>
              </div>
            ) : (
              <>
                <p className="text-txt-muted text-sm font-medium mb-6">Decide the toss and start the live scoring</p>
                <div className="flex flex-col sm:flex-row justify-center gap-4 max-w-sm mx-auto">
                  <button
                    onClick={async () => {
                      try {
                        const res = await api.post(`/matches/${id}/start`, { battingTeamId: (match.team1Id?._id || match.team1Id) });
                        setMatch(res.data.data);
                        setActiveTeamId(res.data.data.battingTeamId);
                      } catch (e) { alert(e.response?.data?.message || 'Failed to start match'); }
                    }}
                    className="btn-primary flex-1 py-4 text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/20"
                  >
                    🏏 {match.team1Id?.teamName} Bats
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const res = await api.post(`/matches/${id}/start`, { battingTeamId: (match.team2Id?._id || match.team2Id) });
                        setMatch(res.data.data);
                        setActiveTeamId(res.data.data.battingTeamId);
                      } catch (e) { alert(e.response?.data?.message || 'Failed to start match'); }
                    }}
                    className="btn-secondary flex-1 py-4 text-sm font-black uppercase tracking-widest shadow-xl shadow-secondary/20"
                  >
                    🏏 {match.team2Id?.teamName} Bats
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Ball-by-ball log */}
      {activeTab === 'live' && activeScore?.ballByBall?.length > 0 && (
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

      {/* Dismissal Modal */}
      {showDismissalModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 uppercase">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 p-5 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="font-black text-lg uppercase tracking-widest">Wicket! 🏏</h2>
                  <p className="text-red-100 text-[10px] mt-1 font-bold">How was the batsman dismissed?</p>
                </div>
                <button onClick={() => setShowDismissalModal(false)} className="text-white/70 hover:text-white text-xl font-bold">✕</button>
              </div>
            </div>

            {/* Dismissal type grid */}
            <div className="p-4 max-h-72 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2">
                {DISMISSAL_TYPES.map(dt => (
                  <button
                    key={dt.value}
                    onClick={() => setSelectedDismissalType(dt.value)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      selectedDismissalType === dt.value
                        ? 'border-red-500 bg-red-50 shadow-sm'
                        : 'border-surface-border hover:border-red-200 hover:bg-red-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{dt.icon}</span>
                      <span className={`font-black text-[11px] uppercase tracking-wide ${
                        selectedDismissalType === dt.value ? 'text-red-600' : 'text-txt-primary'
                      }`}>{dt.label}</span>
                    </div>
                    <p className="text-[9px] text-txt-muted leading-tight font-medium normal-case">{dt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Fielder Selection (Conditional) */}
            {selectedDismissalType && DISMISSAL_TYPES.find(t => t.value === selectedDismissalType)?.needsFielder && (
              <div className="px-4 pb-4 border-t border-surface-border pt-4 bg-red-50/30">
                <label className="block text-[10px] font-black text-red-600 uppercase tracking-widest mb-2">
                  Select {selectedDismissalType === 'STUMPED' ? 'Keeper' : 'Fielder'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {bowlingPlayers
                    .filter(player => {
                      if (selectedDismissalType === 'STUMPED') return player.role === 'wicketkeeper';
                      return true; // Show all for others (including bowler for c&b)
                    })
                    .map(player => (
                    <button
                      key={player._id}
                      onClick={() => setSelectedFielderId(player._id)}
                      className={`px-3 py-2 rounded-lg text-[10px] font-bold border transition-all ${
                        selectedFielderId === player._id
                          ? 'bg-red-600 text-white border-red-700 shadow-sm'
                          : 'bg-white text-txt-primary border-surface-border hover:border-red-300'
                      }`}
                    >
                      {player.name}
                      {player.role === 'wicketkeeper' && <span className="ml-1 text-[8px] opacity-70">🧤</span>}
                    </button>
                  ))}
                </div>
                {selectedDismissalType === 'STUMPED' && bowlingPlayers.filter(p => p.role === 'wicketkeeper').length === 0 && (
                  <p className="text-[10px] text-txt-muted mt-2 text-center italic">No player with &quot;wicketkeeper&quot; role found in fielding team. Please select a fielder below:</p>
                )}
                {selectedDismissalType === 'STUMPED' && bowlingPlayers.filter(p => p.role === 'wicketkeeper').length === 0 && (
                   <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                   {bowlingPlayers.map(player => (
                     <button
                       key={player._id}
                       onClick={() => setSelectedFielderId(player._id)}
                       className={`px-3 py-2 rounded-lg text-[10px] font-bold border transition-all ${
                         selectedFielderId === player._id
                           ? 'bg-red-600 text-white border-red-700 shadow-sm'
                           : 'bg-white text-txt-primary border-surface-border hover:border-red-300'
                       }`}
                     >
                       {player.name}
                     </button>
                   ))}
                 </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="p-4 flex gap-3 border-t border-surface-border bg-surface-alt">
              <button
                onClick={() => setShowDismissalModal(false)}
                className="flex-1 py-3 rounded-xl border border-surface-border text-txt-muted font-bold hover:bg-white transition-all text-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmDismissal}
                disabled={!selectedDismissalType}
                className={`flex-1 py-3 rounded-xl font-black uppercase tracking-wide transition-all text-sm ${
                  selectedDismissalType
                    ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/20'
                    : 'bg-surface-alt text-txt-muted cursor-not-allowed border border-surface-border'
                }`}
              >
                Confirm Wicket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveScoringPage;
