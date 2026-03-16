import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import LiveIndicator from '../components/LiveIndicator';
import { MdOutlinePublic, MdSportsCricket } from 'react-icons/md';

const RealCricketPage = () => {
  const [activeTab, setActiveTab] = useState('completed');
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMock, setIsMock] = useState(false);

  const fetchMatches = async (type) => {
    setLoading(true);
    try {
      const res = await api.get(`/real-cricket/${type}`);
      setMatches(res.data.data);
      setIsMock(res.data.isMock || false);
    } catch (err) {
      console.error('Failed to fetch real cricket matches', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches(activeTab);
  }, [activeTab]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
            <MdOutlinePublic className="text-2xl text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-txt-primary">Global Cricket Results</h1>
            <p className="text-sm text-txt-muted">Detailed scorecards for recent international matches</p>
          </div>
          {isMock && (
             <span className="bg-amber-500/10 text-amber-600 px-3 py-1 rounded-full text-xs font-bold border border-amber-500/20 animate-pulse">
                MOCK DATA (API BLOCKED)
             </span>
          )}
        </div>

        <div className="flex bg-surface-card rounded-lg border border-surface-border p-1">
          {['completed'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-all ${
                activeTab === tab ? 'bg-primary text-white shadow-sm' : 'text-txt-secondary hover:text-primary'
              }`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {loading && matches.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent"></div>
        </div>
      ) : matches.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {matches.map((match, idx) => (
            <Link to={`/global-match/${match.id}`} key={match.id} className="card hover:-translate-y-1 hover:shadow-card-lg transition-all animate-slide-up block"
              style={{ animationDelay: `${idx * 50}ms` }}>
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-surface-border">
                <span className="text-xs font-semibold text-txt-muted uppercase tracking-wider">{match.matchType || 'Match'}</span>
                <span className="text-xs font-medium px-2 py-1 rounded bg-surface text-txt-secondary capitalize">Completed</span>
              </div>
              
              <p className="text-sm text-txt-primary font-medium mb-4 group-hover:text-primary transition-colors">{match.name}</p>

              <div className="flex items-center justify-between">
                {/* Team 1 */}
                <div className="flex flex-col items-center flex-1">
                  {match.teamInfo?.[0]?.img ? (
                    <img src={match.teamInfo[0].img} alt={match.teams?.[0]} className="w-12 h-12 object-contain rounded-full shadow-sm mb-2" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold mb-2">
                       {match.teams?.[0]?.charAt(0)}
                    </div>
                  )}
                  <span className="font-bold text-txt-primary text-center leading-tight">
                    {match.teamInfo?.[0]?.shortname || match.teams?.[0]}
                  </span>
                  {match.score?.[0] && (
                    <div className="mt-2 text-center">
                      <span className="text-xl font-extrabold text-txt-primary">{match.score[0].r}/{match.score[0].w}</span>
                      <p className="text-xs text-txt-muted">({match.score[0].o} ov)</p>
                    </div>
                  )}
                </div>

                <div className="px-4">
                  <div className="w-8 h-8 rounded-full bg-surface-border flex items-center justify-center">
                    <span className="text-xs font-bold text-txt-muted">VS</span>
                  </div>
                </div>

                {/* Team 2 */}
                <div className="flex flex-col items-center flex-1">
                  {match.teamInfo?.[1]?.img ? (
                    <img src={match.teamInfo[1].img} alt={match.teams?.[1]} className="w-12 h-12 object-contain rounded-full shadow-sm mb-2" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-bold mb-2">
                       {match.teams?.[1]?.charAt(0)}
                    </div>
                  )}
                  <span className="font-bold text-txt-primary text-center leading-tight">
                    {match.teamInfo?.[1]?.shortname || match.teams?.[1]}
                  </span>
                  {match.score?.[1] && (
                    <div className="mt-2 text-center">
                      <span className="text-xl font-extrabold text-txt-primary">{match.score[1].r}/{match.score[1].w}</span>
                      <p className="text-xs text-txt-muted">({match.score[1].o} ov)</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-surface-border text-center">
                <p className="text-sm font-medium text-accent">{match.status}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 card">
          <MdOutlinePublic className="text-6xl text-surface-border mx-auto mb-4" />
          <h3 className="text-lg font-bold text-txt-primary mb-1">No {activeTab} matches</h3>
          <p className="text-txt-muted">There are currently no {activeTab} international matches available.</p>
        </div>
      )}
    </div>
  );
};

export default RealCricketPage;
