import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
  ComposedChart
} from 'recharts';

const MatchGraphs = ({ scores, match }) => {
  const [activeTab, setActiveTab] = useState('runs'); // 'runs' or 'runrate'
  const [selectedTeam, setSelectedTeam] = useState('both'); // 'both', 'team1', 'team2'

  const team1 = match?.team1Id;
  const team2 = match?.team2Id;

  const chartData = useMemo(() => {
    if (!scores || scores.length === 0) return [];

    const dataMap = new Map();
    const maxOvers = match?.totalOvers || 20;

    // Initialize with over 0
    dataMap.set(0, { over: 0, t1Cumulative: 0, t2Cumulative: 0 });

    scores.forEach((score) => {
      const isTeam1 = score.teamId?.toString() === (team1?._id || team1)?.toString();
      const prefix = isTeam1 ? 't1' : 't2';
      
      let cumulative = 0;
      let ballCount = 0;

      score.ballByBall?.forEach((ball) => {
        const runs = Number(ball.runs) || 0;
        cumulative += runs;
        
        const isExtra = ball.type === 'wide' || ball.type === 'no-ball';
        if (!isExtra) {
          ballCount++;
        }

        const overValue = (Math.floor((ballCount - 1) / 6)) + ((ballCount - 1) % 6 + 1) / 6;
        
        if (!dataMap.has(overValue)) {
          dataMap.set(overValue, { over: overValue });
        }
        
        const entry = dataMap.get(overValue);
        entry[`${prefix}Cumulative`] = cumulative;
        entry[`${prefix}RR`] = overValue > 0 ? parseFloat((cumulative / overValue).toFixed(2)) : 0;
        
        if (ball.type === 'wicket') {
          entry[`${prefix}Wicket`] = true;
          entry[`${prefix}WicketInfo`] = {
            batsman: ball.batsmanName,
            bowler: ball.bowlerName
          };
        }
      });
    });

    for (let i = 0; i <= maxOvers; i++) {
        if (!dataMap.has(i)) {
            dataMap.set(i, { over: i });
        }
    }

    return Array.from(dataMap.values()).sort((a, b) => a.over - b.over);
  }, [scores, match, team1, team2]);

  // Custom Dot Component with "W" label
  const CustomDot = (props) => {
    const { cx, cy, stroke, payload, dataKey } = props;
    const prefix = dataKey.startsWith('t1') ? 't1' : 't2';
    
    const isWicket = payload[`${prefix}Wicket`];
    const isIntegerOver = Number.isInteger(payload.over);

    if (isWicket) {
      return (
        <g>
          <circle 
            cx={cx} 
            cy={cy} 
            r={6} 
            stroke={stroke} 
            strokeWidth={2} 
            fill="white"
            className="drop-shadow-sm"
          />
          <text 
            x={cx} 
            y={cy - 12} 
            textAnchor="middle" 
            fill="#ef4444" 
            fontSize="10" 
            fontWeight="900" 
            className="select-none"
          >
            W
          </text>
        </g>
      );
    }

    if (isIntegerOver && payload[dataKey] !== undefined && payload.over > 0) {
      return (
        <circle 
          cx={cx} 
          cy={cy} 
          r={4} 
          fill={stroke} 
        />
      );
    }

    return null;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const overDisplay = Number.isInteger(label) ? label : `${Math.floor(label)}.${Math.round((label % 1) * 6)}`;
      
      return (
        <div className="bg-white/95 border border-surface-border p-3 rounded-lg shadow-xl backdrop-blur-sm min-w-[180px]">
          <p className="font-black text-[10px] uppercase tracking-widest text-txt-muted mb-2">Over {overDisplay}</p>
          {payload.map((entry, index) => {
             const prefix = entry.dataKey.toString().startsWith('t1') ? 't1' : 't2';
             const wicketInfo = entry.payload[`${prefix}WicketInfo`];
             
             return (
                <div key={index} className="mb-2 last:mb-0">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                    <p className="text-sm font-bold text-txt-primary">
                      <span className="text-txt-muted">{entry.name}:</span> {entry.value} {activeTab === 'runs' ? 'Runs' : 'RR'}
                    </p>
                  </div>
                  {wicketInfo && (
                    <div className="ml-4 mt-1 bg-red-50 border-l-2 border-red-500 px-2 py-1 rounded-r">
                       <p className="text-[10px] font-black text-red-600 uppercase tracking-tighter">WICKET!</p>
                       <p className="text-[11px] font-medium text-txt-primary leading-tight">
                         {wicketInfo.batsman} <span className="text-txt-muted italic lowercase">b</span> {wicketInfo.bowler}
                       </p>
                    </div>
                  )}
                </div>
             );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-surface-card p-2 rounded-xl border border-surface-border shadow-sm">
        <div className="flex bg-surface-alt p-1 rounded-lg">
          <button 
            onClick={() => setActiveTab('runs')}
            className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md transition-all ${activeTab === 'runs' ? 'bg-primary text-white shadow-md' : 'text-txt-muted hover:text-txt-primary'}`}
          >
            Runs Progress
          </button>
          <button 
            onClick={() => setActiveTab('runrate')}
            className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md transition-all ${activeTab === 'runrate' ? 'bg-primary text-white shadow-md' : 'text-txt-muted hover:text-txt-primary'}`}
          >
            Run Rate
          </button>
        </div>

        <div className="flex bg-surface-alt p-1 rounded-lg">
          <button 
            onClick={() => setSelectedTeam('both')}
            className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-md transition-all ${selectedTeam === 'both' ? 'bg-white text-primary shadow-sm border border-surface-border/50' : 'text-txt-muted'}`}
          >
            Both
          </button>
          <button 
            onClick={() => setSelectedTeam('team1')}
            className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-md transition-all ${selectedTeam === 'team1' ? 'bg-white text-primary shadow-sm border border-surface-border/50' : 'text-txt-muted'}`}
          >
             {team1?.teamName?.substring(0, 3) || 'T1'}
          </button>
          <button 
            onClick={() => setSelectedTeam('team2')}
            className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-md transition-all ${selectedTeam === 'team2' ? 'bg-white text-primary shadow-sm border border-surface-border/50' : 'text-txt-muted'}`}
          >
             {team2?.teamName?.substring(0, 3) || 'T2'}
          </button>
        </div>
      </div>

      {/* Main Graph Card */}
      <div className="card p-6 border-none shadow-2xl bg-white overflow-hidden relative">
        <h3 className="text-[10px] font-black text-txt-muted uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span>
          {activeTab === 'runs' ? 'Cumulative Runs Progress' : 'Innings Run Rate (Per Over)'}
        </h3>

        <div className="h-[380px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {activeTab === 'runs' ? (
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="over" 
                  type="number"
                  domain={[0, 'dataMax']}
                  ticks={Array.from({length: (match?.totalOvers || 20) + 1}, (_, i) => i)}
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e2e8f0', strokeWidth: 2 }} />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  iconType="circle"
                  formatter={(value) => <span className="text-[10px] font-black uppercase tracking-widest text-txt-primary ml-1">{value}</span>}
                />
                {(selectedTeam === 'both' || selectedTeam === 'team1') && (
                  <Line 
                    type="monotone" 
                    dataKey="t1Cumulative" 
                    name={team1?.teamName || 'Team 1'} 
                    stroke="#ec4899" 
                    strokeWidth={3} 
                    dot={<CustomDot />}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    connectNulls
                  />
                )}
                {(selectedTeam === 'both' || selectedTeam === 'team2') && (
                  <Line 
                    type="monotone" 
                    dataKey="t2Cumulative" 
                    name={team2?.teamName || 'Team 2'} 
                    stroke="#0ea5e9" 
                    strokeWidth={3} 
                    dot={<CustomDot />}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    connectNulls
                  />
                )}
              </LineChart>
            ) : (
              <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorT1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorT2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="over" 
                  type="number"
                  domain={[0, 'dataMax']}
                  ticks={Array.from({length: (match?.totalOvers || 20) + 1}, (_, i) => i)}
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e2e8f0', strokeWidth: 2 }} />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  iconType="circle"
                  formatter={(value) => <span className="text-[10px] font-black uppercase tracking-widest text-txt-primary ml-1">{value}</span>}
                />
                {(selectedTeam === 'both' || selectedTeam === 'team1') && (
                  <Area 
                    type="monotone" 
                    dataKey="t1RR" 
                    name={team1?.teamName || 'Team 1'} 
                    stroke="#ec4899" 
                    fillOpacity={1} 
                    fill="url(#colorT1)" 
                    strokeWidth={3}
                    dot={<CustomDot />}
                  />
                )}
                {(selectedTeam === 'both' || selectedTeam === 'team2') && (
                  <Area 
                    type="monotone" 
                    dataKey="t2RR" 
                    name={team2?.teamName || 'Team 2'} 
                    stroke="#0ea5e9" 
                    fillOpacity={1} 
                    fill="url(#colorT2)" 
                    strokeWidth={3}
                    dot={<CustomDot />}
                  />
                )}
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
           <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-red-500">W</span>
              <span className="text-[9px] font-black uppercase tracking-widest text-txt-muted">Wicket (Hover for info)</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full border-2 border-slate-300 bg-white"></div>
              <span className="text-[9px] font-black uppercase tracking-widest text-txt-muted">Wicket Point</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-slate-400 opacity-40"></div>
              <span className="text-[9px] font-black uppercase tracking-widest text-txt-muted">Over End</span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default MatchGraphs;
