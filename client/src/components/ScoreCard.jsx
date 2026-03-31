import LiveIndicator from './LiveIndicator';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { HiOutlineTrash } from 'react-icons/hi';
import { useState } from 'react';

const ScoreCard = ({ match, scores, onDelete }) => {
  const { user } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const team1Score = scores?.find(s => s.teamId === match.team1Id?._id);
  const team2Score = scores?.find(s => s.teamId === match.team2Id?._id);

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
      className={`card border-l-4 ${statusColors[match.status] || 'border-surface-border'} 
                  hover:shadow-card-lg transition-all duration-300 block animate-slide-up relative group`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-txt-muted font-medium">
          {match.tournamentId?.name || 'Tournament'}
        </span>
        <div className="flex items-center gap-2">
          {match.status === 'live' && <LiveIndicator />}
          {match.status === 'scheduled' && (
            <span className="badge-scheduled">Upcoming</span>
          )}
          {match.status === 'completed' && (
            <span className="badge-completed">Completed</span>
          )}

          {/* Delete Button - Only for Scheduled Matches */}
          {user && match.status === 'scheduled' && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-danger hover:bg-danger/10 p-1.5 rounded-lg ml-2"
              title="Delete match"
            >
              <HiOutlineTrash className="text-lg" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {/* Team 1 */}
        <div className={`flex items-center justify-between ${match.winnerId === match.team1Id?._id ? 'font-bold' : ''}`}>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
              {match.team1Id?.teamName?.charAt(0) || 'T'}
            </div>
            <span className="text-txt-primary text-sm">{match.team1Id?.teamName || 'Team 1'}</span>
          </div>
          {team1Score && (
            <span className="text-txt-primary font-semibold">
              {team1Score.runs}/{team1Score.wickets}
              <span className="text-txt-muted text-xs ml-1">({team1Score.overs} ov)</span>
            </span>
          )}
        </div>

        <div className="text-center text-txt-muted text-xs">vs</div>

        {/* Team 2 */}
        <div className={`flex items-center justify-between ${match.winnerId === match.team2Id?._id ? 'font-bold' : ''}`}>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center text-secondary text-xs font-bold">
              {match.team2Id?.teamName?.charAt(0) || 'T'}
            </div>
            <span className="text-txt-primary text-sm">{match.team2Id?.teamName || 'Team 2'}</span>
          </div>
          {team2Score && (
            <span className="text-txt-primary font-semibold">
              {team2Score.runs}/{team2Score.wickets}
              <span className="text-txt-muted text-xs ml-1">({team2Score.overs} ov)</span>
            </span>
          )}
        </div>
      </div>

      {match.venue && (
        <div className="mt-3 pt-3 border-t border-surface-border">
          <p className="text-xs text-txt-muted">📍 {match.venue}</p>
          <p className="text-xs text-txt-muted flex items-center gap-1">
            <span>📅 {new Date(match.matchDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            <span className="opacity-40">•</span>
            <span>{new Date(match.matchDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </p>
        </div>
      )}
    </Link>
  );
};

export default ScoreCard;
