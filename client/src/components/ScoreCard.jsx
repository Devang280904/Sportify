import LiveIndicator from './LiveIndicator';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { HiOutlineTrash, HiOutlinePencil } from 'react-icons/hi';
import { useState } from 'react';
import CustomDialog from './CustomDialog';

const ScoreCard = ({ match, scores, onDelete }) => {
  const { user } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const [dialog, setDialog] = useState({ isOpen: false, title: '', message: '', type: 'confirm', onConfirm: () => {} });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [newMatchDate, setNewMatchDate] = useState('');
  const [updatingTime, setUpdatingTime] = useState(false);
  const [matchDateState, setMatchDateState] = useState(match.matchDate);

  const isMatchOwner = user && (
    match.tournamentId 
      ? (match.tournamentId.organizerId?._id === user._id || match.tournamentId.organizerId === user._id)
      : (match.createdBy?._id === user._id || match.createdBy === user._id)
  );
  
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

  const handleDelete = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDialog({
      isOpen: true,
      title: 'Delete Match?',
      message: 'Are you sure you want to delete this match? This action cannot be undone and will remove all scoring data.',
      type: 'danger',
      onConfirm: async () => {
        setDeleting(true);
        try {
          await api.delete(`/matches/${match._id}`);
          if (onDelete) onDelete(match._id);
          setDialog(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          setDialog({
            isOpen: true,
            title: 'Error',
            message: err.response?.data?.message || 'Failed to delete match',
            type: 'alert',
            onConfirm: () => setDialog(prev => ({ ...prev, isOpen: false }))
          });
        } finally {
          setDeleting(false);
        }
      }
    });
  };

  const handleEditTimeSubmit = async () => {
    setUpdatingTime(true);
    try {
      const res = await api.put(`/matches/${match._id}`, { matchDate: newMatchDate });
      if (res.data && res.data.data) {
        setMatchDateState(res.data.data.matchDate);
      } else {
        setMatchDateState(newMatchDate);
      }
      setEditDialogOpen(false);
    } catch (err) {
      setDialog({
        isOpen: true,
        title: 'Error',
        message: err.response?.data?.message || 'Failed to update match time',
        type: 'alert',
        onConfirm: () => setDialog(prev => ({ ...prev, isOpen: false }))
      });
    } finally {
      setUpdatingTime(false);
    }
  };

  return (
    <Link
      to={getMatchLink()}
      className={`bg-primary-dark rounded-xl border border-white/10 hover:border-white/30 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 block relative group overflow-hidden`}
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
        <span className="text-xs text-white/50 uppercase font-black tracking-widest truncate max-w-[150px]">
          {match.tournamentId?.name || 'Local Series'}
        </span>
        <div className="flex items-center gap-2">
          {match.status === 'live' && <LiveIndicator />}
          {match.status === 'scheduled' && (
            <span className="px-2 py-0.5 rounded text-xs font-black uppercase tracking-widest bg-white/10 text-white/70">Scheduled</span>
          )}
          {match.status === 'completed' && (
            <span className="px-2 py-0.5 rounded text-xs font-black uppercase tracking-widest bg-white/5 text-white/40">Completed</span>
          )}

          {/* Edit Timing Button - Only for Scheduled Matches and Creator/Organizer */}
          {isMatchOwner && match.status === 'scheduled' && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setNewMatchDate(new Date(matchDateState).toISOString().slice(0, 16));
                setEditDialogOpen(true);
              }}
              disabled={updatingTime}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-secondary hover:bg-secondary/10 p-1.5 rounded-lg ml-1 z-10 relative"
              title="Edit match timing"
            >
              <HiOutlinePencil className="text-sm" />
            </button>
          )}

          {/* Delete Button - Only for Scheduled Matches and Creator/Organizer */}
          {isMatchOwner && match.status === 'scheduled' && (
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
            <span className="text-white font-black text-xl font-mono">
              {team1Score.runs}<span className="text-white/50 text-lg">/{team1Score.wickets}</span>
              <span className="text-white/40 text-xs font-sans font-bold ml-2 uppercase">({team1Score.overs} ov)</span>
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
            <span className="text-white font-black text-xl font-mono">
              {team2Score.runs}<span className="text-white/50 text-lg">/{team2Score.wickets}</span>
              <span className="text-white/40 text-xs font-sans font-bold ml-2 uppercase">({team2Score.overs} ov)</span>
            </span>
          )}
        </div>
      </div>

      {/* Footer / Results Info */}
      <div className="px-4 py-3 border-t border-white/10 bg-black/20 mt-1 text-center flex flex-col items-center justify-center min-h-[48px]">
         {match.status === 'completed' ? (
           <p className="text-accent text-xs font-black uppercase tracking-widest">{match.resultMessage || (match.winnerId ? 'Match Completed' : 'Match Ended')}</p>
         ) : match.status === 'live' ? (
           <p className="text-accent text-xs font-black uppercase tracking-widest animate-pulse">Match is in progress</p>
         ) : (
           <p className="text-white/40 text-xs font-black uppercase tracking-widest">
             {new Date(matchDateState).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {new Date(matchDateState).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
           </p>
         )}
      </div>

      <CustomDialog 
        isOpen={dialog.isOpen}
        title={dialog.title}
        message={dialog.message}
        type={dialog.type}
        onConfirm={dialog.onConfirm}
        onCancel={() => setDialog(prev => ({ ...prev, isOpen: false }))}
      />

      <CustomDialog 
        isOpen={editDialogOpen}
        title="Edit Match Timing"
        confirmLabel={updatingTime ? 'Updating...' : 'Update'}
        cancelLabel="Cancel"
        onConfirm={handleEditTimeSubmit}
        onCancel={() => setEditDialogOpen(false)}
      >
        <div className="mt-3">
          <label className="block text-xs font-bold text-txt-muted uppercase tracking-wider mb-2">
            New Match Date & Time
          </label>
          <input
            type="datetime-local"
            value={newMatchDate}
            onChange={(e) => setNewMatchDate(e.target.value)}
            disabled={updatingTime}
            className="w-full bg-surface-alt border border-surface-border text-txt-primary rounded-xl px-4 py-3 font-medium outline-none focus:border-primary transition-colors text-sm"
          />
        </div>
      </CustomDialog>
    </Link>
  );
};

export default ScoreCard;
