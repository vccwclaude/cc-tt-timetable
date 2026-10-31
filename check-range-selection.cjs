const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('app.html', 'utf8');
const finish = html.match(/const finishRange = \(\) => \{([\s\S]*?)\n    \};/)[1];
let selectedRange = null, opened = false;
const context = {
  rangeDrag: {start:'2026-11-20', end:'2026-11-16'}, rangeDragged:{current:true},
  setRangeDrag:()=>{}, setSelectedDate:()=>{}, setNewDate:()=>{}, setNewEndDate:()=>{},
  setSelectedRange:value=>{selectedRange=value;}, setShowAddEvent:value=>{opened=value;}
};
vm.runInNewContext('(()=>{' + finish + '})()', context);
assert.equal(opened, false, 'Releasing a range must not open Add Event');
assert.equal(selectedRange.start, '2026-11-16');
assert.equal(selectedRange.end, '2026-11-20');
const open = html.match(/<button onClick=\{\(\) => \{([^\n]+)\}\} style=\{\{[^\n]+>\+ Add Event/)[1];
let start, end;
vm.runInNewContext(open, {...context, selectedRange, setNewDate:v=>{start=v;}, setNewEndDate:v=>{end=v;}});
assert.equal(opened, true);
assert.equal(start, '2026-11-16');
assert.equal(end, '2026-11-20');
console.log('Range stays selected without a popup; Add Event opens with the selected dates.');
