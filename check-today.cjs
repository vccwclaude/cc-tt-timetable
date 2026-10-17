const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('app.html', 'utf8');
const cell = html.slice(html.indexOf('<div key={key} data-date={key}'));
const expression = cell.match(/\n\s+border: (.*),/)[1];
// Catch selection or dragging overriding today's permanent border.
for (const isSel of [false, true]) {
  for (const isInDragRange of [false, true]) {
    for (const dropTarget of [null, 'today']) {
      assert.equal(vm.runInNewContext(expression, {
        isToday:true, key:'today', isSel, isInDragRange, dropTarget
      }), '2px solid #E74C3C');
    }
  }
}
assert.equal(vm.runInNewContext(expression, {
  isToday:false, key:'other', isSel:false, isInDragRange:false, dropTarget:null
}), '2px solid transparent');
console.log('Today retains its red border across selection and drag states.');
assert.equal(vm.runInNewContext(expression, {
  isToday:false, key:'other', isSel:true, isInDragRange:false, dropTarget:null
}), '2px solid #0984E3');
console.log('Other selected dates have a blue border; deselected dates have none.');
