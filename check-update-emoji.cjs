const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('app.html', 'utf8');
const source = html.slice(html.indexOf('function eventTitleEmoji('), html.indexOf('function LatestUpdates('));
assert.ok(source, 'Event title emoji helper exists');
const emoji = vm.runInNewContext(source + '; eventTitleEmoji');
for (const [title, expected] of [
  ['Piano class', '🎹'], ['鋼琴班', '🎹'], ['eng test', '📝'],
  ['return reading report', '📚'], ['Ocean Park', '🎢'],
  ['Bday party', '🎂'], ['CC school holiday', '🏖️'],
  ['Swimming', '🏊'], ['Taekwondo', '🥋'], ['interview', '💬'],
  ['Something else', '📌'], ['', '📌']
]) assert.equal(emoji(title), expected, title);
console.log('Latest-update emojis match event titles with a neutral fallback.');
