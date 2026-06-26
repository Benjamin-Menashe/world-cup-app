const fs = require('fs');
const env = fs.readFileSync('.env', 'utf-8');
const key = env.split('\n').find(l => l.startsWith('API_FOOTBALL_KEY=')).split('=')[1].replace(/"/g,'').trim();

fetch('https://v3.football.api-sports.io/fixtures?league=1&season=2026', {
  headers: { 'x-apisports-key': key }
})
.then(r => r.json())
.then(data => {
  const fixtures = data.response || [];
  console.log('Total fixtures returned:', fixtures.length);
  if (fixtures.length > 0) {
    const rounds = [...new Set(fixtures.map(f => f.league.round))];
    console.log('Unique rounds:', rounds);
    
    // Print the first few games of the knockout round
    const knockouts = fixtures.filter(f => {
      if (!f.league || !f.league.round) return false;
      const r = f.league.round.toLowerCase();
      return r.includes('16') || r.includes('32') || r.includes('quarter') || r.includes('semi') || r.includes('3rd') || r.includes('third') || r.includes('final');
    });
    console.log('Knockout fixtures matched:', knockouts.length);
    if (knockouts.length > 0) {
      console.log('Sample knockout game:');
      console.log(JSON.stringify(knockouts[0], null, 2));
    }
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
})
.catch(console.error);
