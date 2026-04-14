const fs = require('fs');
const html = fs.readFileSync('temp_wiki.html', 'utf8');

const m = html.indexOf('id="העפלה"');
const substr = html.substring(m, m + 15000);
const cheerio = require("cheerio");
const $ = cheerio.load(substr);
let t = [];
$("table.wikitable tr").each((i, el) => {
  t.push($(el).text().replace(/\n+/g, " | ").trim());
});
console.log(t.join("\n"));
