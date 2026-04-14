const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('temp_wiki.html', 'utf8');
const $ = cheerio.load(html);

const teams = new Set();
const translations = {};

// Look for tables that might contain team names
$('table.wikitable').each((i, table) => {
    $(table).find('tr').each((j, row) => {
        $(row).find('td').each((k, cell) => {
            const text = $(cell).text().trim();
            // In Hebrew Wikipedia, team names are often in links with titles
            $(cell).find('a').each((l, link) => {
                const title = $(link).attr('title');
                const linkText = $(link).text().trim();
                if (title && !title.includes(':') && !title.includes('/') && title.length < 50) {
                    teams.add(title);
                }
            });
        });
    });
});

console.log('Found teams (Hebrew):', Array.from(teams));

// Try to get English names for these teams if possible, or just use common knowledge
// (I will use common knowledge for the mapping as I can't fetch English Wiki easily right now)
// But I can try to find English names in the HTML if they are mentioned (e.g. in captions)
