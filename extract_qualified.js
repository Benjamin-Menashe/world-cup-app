const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('temp_wiki.html', 'utf8');
const $ = cheerio.load(html);

const qualifiedTeams = [];

// Search for the table with "נבחרת" and "תאריך העפלה" headers
$('table.wikitable').each((i, table) => {
    const headers = $(table).find('th').text();
    if (headers.includes('נבחרת') && (headers.includes('תאריך העפלה') || headers.includes('דרך העפלה'))) {
        $(table).find('tr').each((j, row) => {
            const cells = $(row).find('td');
            if (cells.length > 0) {
                // Usually the team name is in the first or second cell
                const teamCell = cells.eq(0);
                const teamNameHe = teamCell.text().replace(/ נבחרת|בכדורגל/g, '').trim();
                const teamLink = teamCell.find('a').attr('title');
                if (teamLink) {
                    qualifiedTeams.push({
                        he: teamLink.replace('נבחרת ', '').replace(' בכדורגל', ''),
                        source: teamLink
                    });
                }
            }
        });
    }
});

console.log(JSON.stringify(qualifiedTeams, null, 2));
