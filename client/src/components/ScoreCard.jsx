import LiveIndicator from './LiveIndicator';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { HiOutlineTrash } from 'react-icons/hi';
import { useState } from 'react';

const ScoreCard = ({ match, scores, onDelete }) => {
  const { user } = useAuth();
  const [deleting, setDeleting] = useState(false);
  
  // Use scores from prop (if passed for real-time updates) or from the injected match.scores
  const activeScores = scores && scores.length > 0 ? scores : (match.scores || []);
  // Provide a safe fallback if scores somehow don't exist yet
  const team1Score = activeScores?.find(s => s.teamId === match.team1Id?._id) || { runs: 0, wickets: 0, overs: 0 };
  const team2Score = activeScores?.find(s => s.teamId === match.team2Id?._id) || { runs: 0, wickets: 0, overs: 0 };

  const statusColors = {
    live: 'border-accent',
    scheduled: 'border-secondary',
    completed: 'border-surface-border',
  };

  // Determine navigation link based on match status and user role
  const getMatchLink = () => {
    if (user && ['scheduled', 'live'].includes(match.status)) {
      return `/match/${match._id}/score`; // Live Scoring Page
    }
    if (match.status === 'live') {
      return `/match/${match._id}/view`; // Live Viewer for non-organizers
    }
    return `/match/${match._id}`; // Default Viewer Page
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    if (!window.confirm('Are you sure you want to delete this match? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      await api.delete(`/matches/${match._id}`);
      if (onDelete) onDelete(match._id);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete match');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Link
      to={getMatchLink()}
      className={`bg-primary-dark rounded-xl border border-white/10 hover:border-white/30 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 block relative group overflow-hidden`}
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
        <span className="text-[10px] text-white/50 uppercase font-black tracking-widest truncate max-w-[150px]">
          {match.tournamentId?.name || 'Local Series'}
        </span>
        <div className="flex items-center gap-2">
          {match.status === 'live' && <LiveIndicator />}
          {match.status === 'scheduled' && (
            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-white/10 text-white/70">Scheduled</span>
          )}
          {match.status === 'completed' && (
            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-white/5 text-white/40">Completed</span>
          )}

          {/* Delete Button - Only for Scheduled Matches */}
          {user && match.status === 'scheduled' && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-danger hover:bg-danger/10 p-1.5 rounded-lg ml-1 z-10 relative"
              title="Delete match"
            >
              <HiOutlineTrash className="text-sm" />
            </button>
          )}
        </div>
      </div>

      <div className="p-4 md:p-5 space-y-4">
        {/* Team 1 */}
        <div className={`flex items-center justify-between ${match.winnerId === match.team1Id?._id ? 'opacity-100' : (match.status === 'completed' ? 'opacity-60' : 'opacity-100')}`}>
          <div className="flex items-center gap-3">
            {match.team1Id?.logoURL ? (
              <img src={match.team1Id.logoURL} alt={match.team1Id.teamName} className="w-8 h-8 rounded-full object-contain bg-white/5 p-0.5" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/80 text-xs font-black uppercase">
                {match.team1Id?.teamName?.charAt(0) || 'T'}
              </div>
            )}
            <span className="text-white text-sm font-bold uppercase tracking-wider">{match.team1Id?.teamName || 'Team 1'}</span>
          </div>
          {team1Score && (
            <span className="text-white font-black text-lg font-mono">
              {team1Score.runs}<span className="text-white/50 text-base">/{team1Score.wickets}</span>
              <span className="text-white/40 text-[10px] font-sans font-bold ml-2 uppercase">({team1Score.overs} ov)</span>
            </span>
          )}
        </div>

        {/* Team 2 */}
        <div className={`flex items-center justify-between ${match.winnerId === match.team2Id?._id ? 'opacity-100' : (match.status === 'completed' ? 'opacity-60' : 'opacity-100')}`}>
          <div className="flex items-center gap-3">
            {match.team2Id?.logoURL ? (
              <img src={match.team2Id.logoURL} alt={match.team2Id.teamName} className="w-8 h-8 rounded-full object-contain bg-white/5 p-0.5" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/80 text-xs font-black uppercase">
                {match.team2Id?.teamName?.charAt(0) || 'T'}
              </div>
            )}
            <span className="text-white text-sm font-bold uppercase tracking-wider">{match.team2Id?.teamName || 'Team 2'}</span>
          </div>
          {team2Score && (
            <span className="text-white font-black text-lg font-mono">
              {team2Score.runs}<span className="text-white/50 text-base">/{team2Score.wickets}</span>
              <span className="text-white/40 text-[10px] font-sans font-bold ml-2 uppercase">({team2Score.overs} ov)</span>
            </span>
          )}
        </div>
      </div>

      {/* Footer / Results Info */}
      <div className="px-4 py-3 border-t border-white/10 bg-black/20 mt-1 text-center flex flex-col items-center justify-center min-h-[48px]">
         {match.status === 'completed' ? (
           <p className="text-accent text-[10px] font-black uppercase tracking-widest">{match.resultMessage || (match.winnerId ? 'Match Completed' : 'Match Ended')}</p>
         ) : match.status === 'live' ? (
           <p className="text-accent text-[10px] font-black uppercase tracking-widest animate-pulse">Match is in progress</p>
         ) : (
           <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">
             {new Date(match.matchDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {new Date(match.matchDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
           </p>
         )}
      </div>
    </Link>
  );
};

export default ScoreCard;
