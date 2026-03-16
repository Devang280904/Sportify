const axios = require('axios');
const { getCache, setCache } = require('../config/redis');

const API_KEY = process.env.CRICKET_API_KEY;
const BASE_URL = 'https://api.cricapi.com/v1';
const CACHE_TTL = 10; // 10 seconds cache to avoid rate limits

// Helper to check if we should return mock data 
const useMockData = () => !API_KEY || API_KEY === 'your_api_key_here';

const generateMockMatch = (id, type) => {
  const teams = [
    { name: 'India', short: 'IND', img: 'https://flagcdn.com/w40/in.png' },
    { name: 'Australia', short: 'AUS', img: 'https://flagcdn.com/w40/au.png' },
    { name: 'England', short: 'ENG', img: 'https://flagcdn.com/w40/gb-eng.png' },
    { name: 'New Zealand', short: 'NZ', img: 'https://flagcdn.com/w40/nz.png' },
    { name: 'South Africa', short: 'SA', img: 'https://flagcdn.com/w40/za.png' },
    { name: 'Pakistan', short: 'PAK', img: 'https://flagcdn.com/w40/pk.png' },
  ];
  const t1 = teams[id % teams.length];
  const t2 = teams[(id + 1) % teams.length];
  
  const match = {
    id: `mock-match-${id}`,
    name: `${t1.name} vs ${t2.name}, ${id}th match`,
    matchType: 't20',
    status: type === 'live' ? `${t1.name} trailing by ${150 - (id * 9)} runs` : type === 'completed' ? `${t1.name} won by ${id % 5 + 1} wickets` : 'Match starts at 09:30 GMT',
    venue: 'Lord\'s, London',
    date: new Date().toISOString(),
    dateTimeGMT: new Date().toISOString(),
    teams: [t1.name, t2.name],
    teamInfo: [
      { name: t1.name, shortname: t1.short, img: t1.img },
      { name: t2.name, shortname: t2.short, img: t2.img }
    ],
    score: type !== 'upcoming' ? [
      { r: 250 + (id * 15), w: (id % 10), o: 40 + (id * 2.5), inning: `${t1.name} Inning 1` },
      { r: 100 + (id * 10), w: (id % 9), o: 20 + (id * 1.5), inning: `${t2.name} Inning 1` }
    ] : [],
    scorecard: type !== 'upcoming' ? [
      {
        inning: `${t1.name} Inning 1`,
        batting: [
          { batsman: { name: 'V. Kohli' }, r: 85, b: 52, '4s': 8, '6s': 3, sr: 163.4, dismissal: 'c Smith b Starc' },
          { batsman: { name: 'R. Sharma' }, r: 42, b: 30, '4s': 5, '6s': 1, sr: 140.0, dismissal: 'b Cummins' },
          { batsman: { name: 'S. Yadav' }, r: 65, b: 35, '4s': 6, '6s': 4, sr: 185.7, dismissal: 'not out' }
        ],
        bowling: [
          { bowler: { name: 'M. Starc' }, o: 4, m: 0, r: 35, w: 1, eco: 8.75 },
          { bowler: { name: 'P. Cummins' }, o: 4, m: 1, r: 28, w: 1, eco: 7.00 },
          { bowler: { name: 'A. Zampa' }, o: 4, m: 0, r: 42, w: 0, eco: 10.50 }
        ]
      },
      {
        inning: `${t2.name} Inning 1`,
        batting: [
          { batsman: { name: 'D. Warner' }, r: 55, b: 40, '4s': 6, '6s': 2, sr: 137.5, dismissal: 'c Rahul b Bumrah' },
          { batsman: { name: 'S. Smith' }, r: 12, b: 15, '4s': 1, '6s': 0, sr: 80.0, dismissal: 'lbw b Ashwin' },
          { batsman: { name: 'G. Maxwell' }, r: 80, b: 38, '4s': 5, '6s': 7, sr: 210.5, dismissal: 'not out' }
        ],
        bowling: [
          { bowler: { name: 'J. Bumrah' }, o: 4, m: 0, r: 24, w: 1, eco: 6.00 },
          { bowler: { name: 'R. Ashwin' }, o: 4, m: 0, r: 30, w: 1, eco: 7.50 },
          { bowler: { name: 'R. Jadeja' }, o: 4, m: 0, r: 38, w: 0, eco: 9.50 }
        ]
      }
    ] : [],
    matchStarted: type !== 'upcoming',
    matchEnded: type === 'completed',
    isMock: true
  };

  return match;
};

// Generate an array of mock matches
const getMockMatches = (type) => ({
  data: Array.from({ length: 3 }, (_, i) => generateMockMatch(i + 1, type)),
  isMock: true
});

exports.getLiveMatches = async () => {
  const cacheKey = 'cricapi:live_matches';
  
  if (useMockData()) {
    return getMockMatches('live');
  }

  try {
    const cachedData = await getCache(cacheKey);
    if (cachedData) return JSON.parse(cachedData);

    const response = await axios.get(`${BASE_URL}/currentMatches`, {
      params: { apikey: API_KEY, offset: 0 }
    });

    if (response.data.status !== 'success') {
      console.warn('CricAPI Error fallback to mock:', response.data.reason);
      return getMockMatches('live');
    }

    const matches = response.data.data;
    await setCache(cacheKey, JSON.stringify(matches), CACHE_TTL);
    return { data: matches, isMock: false };
  } catch (error) {
    console.error('CricAPI fetch error:', error.message);
    return getMockMatches('live'); // Graceful fallback
  }
};

exports.getUpcomingMatches = async () => {
  const cacheKey = 'cricapi:upcoming_matches';
  
  if (useMockData()) {
    return getMockMatches('upcoming');
  }

  try {
    const cachedData = await getCache(cacheKey);
    if (cachedData) return JSON.parse(cachedData);

    const response = await axios.get(`${BASE_URL}/matches`, {
      params: { apikey: API_KEY, offset: 0 }
    });

    if (response.data.status !== 'success') {
      return getMockMatches('upcoming');
    }

    // Filter upcoming
    const matches = response.data.data.filter(m => !m.matchStarted);
    await setCache(cacheKey, JSON.stringify(matches), 300); // 5 min cache
    return { data: matches, isMock: false };
  } catch (error) {
    return getMockMatches('upcoming');
  }
};

exports.getCompletedMatches = async () => {
  const cacheKey = 'cricapi:completed_matches';
  
  if (useMockData()) {
    return getMockMatches('completed');
  }

  try {
    const cachedData = await getCache(cacheKey);
    if (cachedData) return JSON.parse(cachedData);

    const response = await axios.get(`${BASE_URL}/matches`, {
      params: { apikey: API_KEY, offset: 0 }
    });

    if (response.data.status !== 'success') {
      return getMockMatches('completed');
    }

    // Filter completed
    const matches = response.data.data.filter(m => m.matchEnded);
    await setCache(cacheKey, JSON.stringify(matches), 300); // 5 min cache
    return { data: matches, isMock: false };
  } catch (error) {
    return getMockMatches('completed');
  }
};

exports.getMatchDetails = async (id) => {
  if (useMockData() || id.startsWith('mock-')) {
    return generateMockMatch(parseInt(id.replace('mock-match-', '')) || 1, 'live');
  }

  try {
    const cacheKey = `cricapi:match:${id}`;
    const cachedData = await getCache(cacheKey);
    if (cachedData) return JSON.parse(cachedData);

    const infoResponse = await axios.get(`${BASE_URL}/match_info`, {
      params: { apikey: API_KEY, id }
    });

    if (infoResponse.data.status !== 'success') throw new Error('API Error');

    const match = infoResponse.data.data;

    // Attempt to enrich with full scorecard dataset
    try {
      const scorecardResponse = await axios.get(`${BASE_URL}/match_scorecard`, {
        params: { apikey: API_KEY, id }
      });
      if (scorecardResponse.data.status === 'success' && scorecardResponse.data.data.scorecard) {
        match.scorecard = scorecardResponse.data.data.scorecard;
      }
    } catch(err) {
      // Gracefully ignore lack of scorecard access
      console.warn(`Could not fetch scorecard for match ${id}`);
    }

    // Attempt to merge fallback mock if testing edge cases (optional, but real API is working here)
    if(!match.scorecard && id.length < 5) {
       // Just basic protection
    }

    await setCache(cacheKey, JSON.stringify(match), CACHE_TTL);
    return match;
  } catch (error) {
    console.error('Match Details API Error:', error.message);
    return null;
  }
};
