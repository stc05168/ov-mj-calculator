// Debug - trace full detectHandTypes flow
const fs = require('fs');
const html = fs.readFileSync('test_standalone.html', 'utf8');
const scriptRegex = /<script>([\s\S]*?)<\/script>/gi;
const scripts = [];
let match;
while ((match = scriptRegex.exec(html)) !== null) { scripts.push(match[1]); }
global.document = { getElementById: () => ({ textContent: '' }) };
global.window = { onerror: null };

let combinedJs = '';
for (let i = 1; i < scripts.length; i++) { combinedJs += scripts[i] + '\n'; }

// Patch detectHandTypes to log pre-exclusion
combinedJs = combinedJs.replace(
    'let finalHandTypes = applyExclusions(handTypes);',
    'console.log("PRE-EXCLUSION:", handTypes.map(h=>h.name+"("+h.score+")").join(", ")); let finalHandTypes = applyExclusions(handTypes); console.log("POST-EXCLUSION:", finalHandTypes.map(h=>h.name+"("+h.score+")").join(", "));'
);

combinedJs += `
// Test #15: 二相逢x1
resetState();
state.chows=[mkChow(w,1,2,3),mkChow(s,1,2,3)];
state.handTiles=[t(2),t(3),t(4),t(5),t(6),t(7),w(4),w(5),w(6),t(8)];
state.winningTile=t(8);
console.log("\\n=== Test #15: 二相逢x1 ===");
let r = detectHandTypes();
console.log("FINAL:", r.map(x=>x.name+"("+x.score+")").join(", "));

// Test #49: 雙般高
resetState();
state.chows=[mkChow(w,1,2,3),mkChow(w,1,2,3),mkChow(s,4,5,6),mkChow(s,4,5,6)];
state.handTiles=[t(2),t(3),t(4),t(7)];
state.winningTile=t(7);
console.log("\\n=== Test #49: 雙般高 ===");
r = detectHandTypes();
console.log("FINAL:", r.map(x=>x.name+"("+x.score+")").join(", "));
`;

eval(combinedJs);
