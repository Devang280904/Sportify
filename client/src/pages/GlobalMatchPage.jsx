import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { HiOutlineArrowLeft } from 'react-icons/hi';
import LiveIndicator from '../components/LiveIndicator';

const GlobalMatchPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatch();
  }, [id]);

  const fetchMatch = async () => {
    try {
      const res = await api.get(`/real-cricket/match/${id}`);
      setMatch(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="card text-center py-12">
        <h3 className="text-xl font-bold mb-2">Match not found</h3>
        <button onClick={() => navigate(-1)} className="btn-primary inline-flex items-center space-x-2">
          <HiOutlineArrowLeft /> <span>Go Back</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="inline-flex items-center space-x-2 text-txt-secondary hover:text-primary transition-colors">
        <HiOutlineArrowLeft /> <span>Back to Global Cricket</span>
      </button>

      {/* Match Header */}
      <div className="card bg-gradient-to-br from-surface-card to-primary/5 border-none">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold text-txt-muted uppercase tracking-wider">{match.matchType || 'Match'}</span>
          {match.status?.toLowerCase().includes('live') || match.matchStarted && !match.matchEnded ? (
             <LiveIndicator size="md" />
          ) : (
            <span className="badge bg-surface text-txt-secondary">{match.matchEnded ? 'Completed' : 'Upcoming'}</span>
          )}
        </div>
        
        <h1 className="text-2xl font-bold text-center mb-6 text-txt-primary">{match.name}</h1>
        
        <div className="flex items-center justify-around mb-6">
          <div className="text-center">
            {match.teamInfo?.[0]?.img ? (
              <img src={match.teamInfo[0].img} alt={match.teams[0]} className="w-16 h-16 mx-auto rounded-full object-contain mb-2 shadow-sm"/>
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl mx-auto mb-2">
                {match.teams?.[0]?.charAt(0)}
              </div>
            )}
            <h2 className="font-bold text-lg">{match.teamInfo?.[0]?.shortname || match.teams?.[0]}</h2>
             {match.score?.[0] && (
                <div className="mt-1">
                  <span className="text-2xl font-extrabold">{match.score[0].r}/{match.score[0].w}</span>
                  <p className="text-sm text-txt-muted">({match.score[0].o} ov)</p>
                </div>
              )}
          </div>
          
          <div className="text-txt-muted font-bold text-xl px-4">VS</div>

          <div className="text-center">
            {match.teamInfo?.[1]?.img ? (
              <img src={match.teamInfo[1].img} alt={match.teams[1]} className="w-16 h-16 mx-auto rounded-full object-contain mb-2 shadow-sm"/>
            ) : (
               <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-bold text-xl mx-auto mb-2">
                {match.teams?.[1]?.charAt(0)}
              </div>
            )}
            <h2 className="font-bold text-lg">{match.teamInfo?.[1]?.shortname || match.teams?.[1]}</h2>
            {match.score?.[1] && (
                <div className="mt-1">
                  <span className="text-2xl font-extrabold">{match.score[1].r}/{match.score[1].w}</span>
                  <p className="text-sm text-txt-muted">({match.score[1].o} ov)</p>
                </div>
              )}
          </div>
        </div>

        <div className="text-center border-t border-surface-border pt-4">
          <p className="font-semibold text-accent mb-1">{match.status}</p>
          <p className="text-sm text-txt-muted">{match.venue} • {new Date(match.date).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Detailed Scorecard */}
      {match.scorecard && match.scorecard.length > 0 ? (
        <div className="space-y-6">
          <h2 className="text-xl font-bold">Detailed Scorecards</h2>
          {match.scorecard.map((inning, idx) => (
            <div key={idx} className="card p-0 overflow-hidden animate-slide-up" style={{ animationDelay: `${idx * 100}ms` }}>
              <div className="bg-surface p-4 border-b border-surface-border">
                <h3 className="font-bold text-lg">{inning.inning}</h3>
              </div>
              
              {/* Batting Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-card text-txt-muted font-semibold">
                    <tr>
                      <th className="px-4 py-3">Batter</th>
                      <th className="px-4 py-3 text-right">R</th>
                      <th className="px-4 py-3 text-right">B</th>
                      <th className="px-4 py-3 text-right">4s</th>
                      <th className="px-4 py-3 text-right">6s</th>
                      <th className="px-4 py-3 text-right">SR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {inning.batting?.map((batter, i) => (
                      <tr key={i} className="hover:bg-surface/50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-primary">{batter.batsman?.name}</p>
                          <p className="text-xs text-txt-muted">{batter['dismissal-text'] || batter.dismissal || 'not out'}</p>
                        </td>
                        <td className="px-4 py-3 text-right font-bold">{batter.r}</td>
                        <td className="px-4 py-3 text-right">{batter.b}</td>
                        <td className="px-4 py-3 text-right">{batter['4s']}</td>
                        <td className="px-4 py-3 text-right">{batter['6s']}</td>
                        <td className="px-4 py-3 text-right text-txt-secondary">{batter.sr}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

               {/* Bowling Table */}
               <div className="overflow-x-auto border-t border-surface-border mt-4">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-card text-txt-muted font-semibold">
                    <tr>
                      <th className="px-4 py-3 border-t-4 border-surface w-full">Bowler</th>
                      <th className="px-4 py-3 border-t-4 border-surface text-right">O</th>
                      <th className="px-4 py-3 border-t-4 border-surface text-right">M</th>
                      <th className="px-4 py-3 border-t-4 border-surface text-right">R</th>
                      <th className="px-4 py-3 border-t-4 border-surface text-right">W</th>
                      <th className="px-4 py-3 border-t-4 border-surface text-right">ECON</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {inning.bowling?.map((bowler, i) => (
                      <tr key={i} className="hover:bg-surface/50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-secondary">{bowler.bowler?.name}</td>
                        <td className="px-4 py-3 text-right">{bowler.o}</td>
                        <td className="px-4 py-3 text-right">{bowler.m}</td>
                        <td className="px-4 py-3 text-right">{bowler.r}</td>
                        <td className="px-4 py-3 text-right font-bold text-accent">{bowler.w}</td>
                        <td className="px-4 py-3 text-right text-txt-secondary">{bowler.eco}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-8">
           <p className="text-txt-muted">Detailed scorecard is not available for this match yet.</p>
        </div>
      )}
    </div>
  );
};

export default GlobalMatchPage;
