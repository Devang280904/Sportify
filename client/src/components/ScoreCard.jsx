import LiveIndicator from './LiveIndicator';
import { Link } from 'react-router-dom';

const ScoreCard = ({ match, scores }) => {
  const team1Score = scores?.find(s => s.teamId === match.team1Id?._id);
  const team2Score = scores?.find(s => s.teamId === match.team2Id?._id);

  const statusColors = {
    live: 'border-accent',
    scheduled: 'border-secondary',
    completed: 'border-surface-border',
  };

  return (
    <Link
      to={match.status === 'live' ? `/match/${match._id}/view` : `/match/${match._id}`}
      className={`card border-l-4 ${statusColors[match.status] || 'border-surface-border'} 
                  hover:shadow-card-lg transition-all duration-300 block animate-slide-up`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-txt-muted font-medium">
          {match.tournamentId?.name || 'Tournament'}
        </span>
        {match.status === 'live' && <LiveIndicator />}
        {match.status === 'scheduled' && (
          <span className="badge-scheduled">Upcoming</span>
        )}
        {match.status === 'completed' && (
          <span className="badge-completed">Completed</span>
        )}
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
          <p className="text-xs text-txt-muted">
            📅 {new Date(match.matchDate).toLocaleDateString('en-US', {
              year: 'numeric', month: 'short', day: 'numeric'
            })}
          </p>
        </div>
      )}
    </Link>
  );
};

export default ScoreCard;
