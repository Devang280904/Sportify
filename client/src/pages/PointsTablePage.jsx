import { useState, useEffect } from 'react';
import api from '../services/api';
import { HiOutlineChartBar } from 'react-icons/hi';

const PointsTablePage = () => {
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [pointsTable, setPointsTable] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/tournaments').then(res => {
      setTournaments(res.data.data);
      if (res.data.data.length > 0) {
        setSelectedTournament(res.data.data[0]._id);
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedTournament) {
      setLoading(true);
      api.get(`/tournaments/${selectedTournament}/points`)
        .then(res => setPointsTable(res.data.data))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [selectedTournament]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <HiOutlineChartBar className="text-2xl text-primary" />
          <h1 className="text-2xl font-bold text-txt-primary">Points Table</h1>
        </div>
        <select value={selectedTournament} onChange={e => setSelectedTournament(e.target.value)}
          className="input w-64">
          {tournaments.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent"></div>
          </div>
        ) : pointsTable.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-primary text-white">
                  <th className="text-left px-6 py-4 text-sm font-semibold">#</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold">Team</th>
                  <th className="text-center px-4 py-4 text-sm font-semibold">P</th>
                  <th className="text-center px-4 py-4 text-sm font-semibold">W</th>
                  <th className="text-center px-4 py-4 text-sm font-semibold">L</th>
                  <th className="text-center px-4 py-4 text-sm font-semibold">T</th>
                  <th className="text-center px-4 py-4 text-sm font-semibold">Pts</th>
                </tr>
              </thead>
              <tbody>
                {pointsTable.map((team, idx) => (
                  <tr key={team.teamId} className={`border-b border-surface-border hover:bg-surface transition-colors
                    ${idx === 0 ? 'bg-accent/5' : ''} ${idx < 2 ? 'border-l-4 border-l-accent' : ''}`}>
                    <td className="px-6 py-4 font-bold text-txt-primary">{idx + 1}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                         <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                           {team.teamName?.charAt(0)}
                         </div>
                         <span className="font-medium text-txt-primary">{team.teamName}</span>
                      </div>
                    </td>
                    <td className="text-center px-4 py-4 text-txt-secondary">{team.played}</td>
                    <td className="text-center px-4 py-4 text-accent font-semibold">{team.won}</td>
                    <td className="text-center px-4 py-4 text-danger font-semibold">{team.lost}</td>
                    <td className="text-center px-4 py-4 text-warning font-semibold">{team.tied || 0}</td>
                    <td className="text-center px-4 py-4">
                      <span className="bg-primary/10 text-primary font-bold px-3 py-1 rounded-full text-sm">
                        {team.points}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16">
            <HiOutlineChartBar className="text-5xl text-txt-muted mx-auto mb-3" />
            <p className="text-txt-muted">No teams registered in this tournament yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PointsTablePage;
