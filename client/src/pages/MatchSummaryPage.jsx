import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { MdSportsCricket, MdHistory, MdEmojiEvents } from 'react-icons/md';
import { HiOutlineUserGroup, HiOutlineCalendar, HiOutlineLocationMarker } from 'react-icons/hi';

const MatchSummaryPage = () => {
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0); // 0 or 1 for innings

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await api.get(`/matches/${id}/summary`);
        setMatch(res.data.data.match);
        setScores(res.data.data.scores);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-primary"><div className="animate-spin rounded-full h-12 w-12 border-4 border-accent border-t-transparent"></div></div>;
  if (!match) return <div className="card text-center py-12"><p className="text-txt-muted">Match summary not found</p></div>;

  const winnerTeam = match.winnerId?._id === match.team1Id?._id ? match.team1Id : match.team2Id;
  const resultText = match.winnerId ? `${winnerTeam?.teamName} Won by ${Math.abs(scores[0]?.runs - scores[1]?.runs)} runs` : 'Match Drawn';

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Result Banner */}
      <div className="card bg-gradient-to-r from-accent to-accent-dark text-white p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-20"><MdEmojiEvents className="text-8xl" /></div>
        <div className="relative z-10 text-center">
          <h1 className="text-3xl font-black italic tracking-widest uppercase mb-2">Match Report</h1>
          <p className="text-xl font-bold bg-white/10 backdrop-blur-md inline-block px-6 py-1 rounded-full border border-white/20">
            {resultText}
          </p>
        </div>
      </div>

      {/* Match Meta Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary"><HiOutlineCalendar className="text-xl" /></div>
          <div><p className="text-[10px] text-txt-muted uppercase font-bold tracking-widest">Date</p><p className="font-bold text-sm">{new Date(match.matchDate).toLocaleDateString()}</p></div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary"><HiOutlineLocationMarker className="text-xl" /></div>
          <div><p className="text-[10px] text-txt-muted uppercase font-bold tracking-widest">Venue</p><p className="font-bold text-sm">{match.venue}</p></div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent"><HiOutlineUserGroup className="text-xl" /></div>
          <div><p className="text-[10px] text-txt-muted uppercase font-bold tracking-widest">Tournament</p><p className="font-bold text-sm">{match.tournamentId?.name}</p></div>
        </div>
      </div>

      {/* Scorecard Tabs */}
      <div className="flex bg-surface-card rounded-xl p-1 shadow-md border border-surface-border">
        {scores.map((score, idx) => (
          <button key={score._id} onClick={() => setActiveTab(idx)}
            className={`flex-1 py-3 px-4 rounded-lg font-black text-sm uppercase tracking-widest transition-all ${
              activeTab === idx ? 'bg-primary text-white shadow-lg' : 'text-txt-secondary hover:bg-primary/5'
            }`}>
            {score.teamId === match.team1Id?._id ? match.team1Id?.teamName : match.team2Id?.teamName}
          </button>
        ))}
      </div>

      {/* Active Inning Scorecard */}
      <div className="space-y-6 animate-fade-in">
        <div className="card p-0 overflow-hidden border-2 border-primary/10 shadow-xl">
          <div className="bg-primary px-6 py-3 flex justify-between items-center text-white">
            <h3 className="font-black italic uppercase tracking-wider">Batting Scorecard</h3>
            <span className="bg-white/10 px-3 py-1 rounded-full text-xs font-bold">{scores[activeTab]?.runs}/{scores[activeTab]?.wickets} ({scores[activeTab]?.overs} ov)</span>
          </div>
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
              {scores[activeTab]?.batting?.map((b, i) => (
                <tr key={i} className={`hover:bg-primary/5 transition-colors ${b.isOut ? 'opacity-70' : ''}`}>
                  <td className="px-6 py-4 font-bold text-txt-primary flex items-center gap-2">
                    {b.playerName} {b.isOut ? <span className="text-[10px] font-normal text-danger uppercase border border-danger/20 px-1 rounded">Out</span> : <span className="text-[10px] font-normal text-success uppercase border border-success/20 px-1 rounded">Not Out</span>}
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

        <div className="card p-0 overflow-hidden border-2 border-secondary/10 shadow-xl">
          <div className="bg-secondary px-6 py-3 text-white">
            <h3 className="font-black italic uppercase tracking-wider">Bowling Scorecard</h3>
          </div>
          <table className="w-full text-sm text-txt-primary">
            <thead className="bg-surface-alt border-b border-surface-border uppercase text-[10px] font-black text-txt-muted tracking-widest">
              <tr>
                <th className="px-6 py-4 text-left">Bowler</th>
                <th className="px-4 py-4 text-center">O</th>
                <th className="px-4 py-4 text-center">M</th>
                <th className="px-4 py-4 text-center">R</th>
                <th className="px-4 py-4 text-center">W</th>
                <th className="px-4 py-4 text-center">ECON</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {scores[activeTab === 0 ? 1 : 0]?.bowling?.map((bw, i) => (
                <tr key={i} className="hover:bg-secondary/5 transition-colors">
                  <td className="px-6 py-4 font-bold">{bw.playerName}</td>
                  <td className="px-4 py-4 text-center">{bw.oversBowled}</td>
                  <td className="px-4 py-4 text-center">0</td>
                  <td className="px-4 py-4 text-center text-secondary font-bold">{bw.runsConceded}</td>
                  <td className="px-4 py-4 text-center font-black text-secondary text-base">{bw.wickets}</td>
                  <td className="px-4 py-4 text-center font-medium">{bw.economy?.toFixed(1) || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-center pt-8">
        <Link to="/fixtures" className="btn-secondary px-8 flex items-center gap-2">
          <MdHistory /> Back to Fixtures
        </Link>
      </div>
    </div>
  );
};

export default MatchSummaryPage;
