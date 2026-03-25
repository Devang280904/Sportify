async function request(method, path, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);
  
  const res = await fetch('http://localhost:5000/api' + path, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

async function verify() {
  try {
    const userA = { name: 'User A', email: `testA_${Date.now()}@sportify.com`, password: 'password123' };
    const userB = { name: 'User B', email: `testB_${Date.now()}@sportify.com`, password: 'password123' };

    console.log('Registering users...');
    const resA = await request('POST', '/auth/register', userA);
    const tokenA = resA.token;
    
    const resB = await request('POST', '/auth/register', userB);
    const tokenB = resB.token;

    console.log('Creating tournament as User A...');
    const tRes = await request('POST', '/tournaments', { name: 'Test Tourney ' + Date.now(), startDate: new Date(), endDate: new Date(Date.now() + 86400000) }, tokenA);
    const tId = tRes.data._id;

    console.log('Creating teams...');
    const bRes1 = await request('POST', '/teams', { teamName: 'Team X ' + Date.now(), tournamentId: tId }, tokenA);
    const bRes2 = await request('POST', '/teams', { teamName: 'Team Y ' + Date.now(), tournamentId: tId }, tokenA);
    const team1Id = bRes1.data._id;
    const team2Id = bRes2.data._id;

    console.log('Creating Match with 1 over...');
    const mRes = await request('POST', '/matches', { 
        tournamentId: tId, team1Id, team2Id, matchDate: new Date(Date.now() + 600000), venue: 'Test', totalOvers: 1 
    }, tokenA);
    const matchId = mRes.data._id;

    console.log('Attempting unauthorized match update (User B)...');
    try {
        await request('PUT', `/matches/${matchId}`, { venue: 'Hacked' }, tokenB);
        console.error('FAIL: User B was able to update the match!');
    } catch(err) {
        console.log('SUCCESS: User B got error: ' + err.message);
    }

    console.log('Starting match as User A...');
    await request('POST', `/matches/${matchId}/start`, { battingTeamId: team1Id }, tokenA);
    
    // Create random players
    const p1 = await request('POST', '/players', { name: 'P1', role: 'Batsman' }, tokenA);
    const p2 = await request('POST', '/players', { name: 'P2', role: 'Bowler' }, tokenA);

    await request('POST', `/matches/${matchId}/set-batsmen`, { teamId: team1Id, strikerId: p1.data._id }, tokenA);
    await request('POST', `/matches/${matchId}/set-bowler`, { teamId: team1Id, bowlerId: p2.data._id }, tokenA);

    console.log('Simulating 1 over (6 balls)...');
    for(let i=1; i<=6; i++) {
        await request('POST', `/matches/${matchId}/score`, { teamId: team1Id, runs: 0 }, tokenA);
    }

    console.log('Submitting 7th ball, should be rejected...');
    try {
        await request('POST', `/matches/${matchId}/score`, { teamId: team1Id, runs: 1 }, tokenA);
        console.error('FAIL: Allowed 7th ball for a 1 over match!');
    } catch(err) {
        console.log('SUCCESS: Blocked 7th ball with error: ' + err.message);
    }

    console.log('Ending match manually...');
    await request('POST', `/matches/${matchId}/complete`, {}, tokenA);
    console.log('Test complete!');

  } catch(err) {
    console.error('Test script failed:', err.message);
  }
}

verify();
