#!/usr/bin/env python3
"""Create a self-contained test runner HTML that runs synchronously."""
import re

# Read files
with open('mjConst.js', 'r', encoding='utf-8') as f:
    mjconst = f.read()

with open('checkHandType.js', 'r', encoding='utf-8') as f:
    checkhandtype = f.read()

with open('test.html', 'r', encoding='utf-8') as f:
    test_html = f.read()

# Extract the script block that contains test definitions
scripts = re.findall(r'<script>(.*?)</script>', test_html, re.DOTALL)

test_script = None
for s in scripts:
    if "function add(" in s and "function runAllTests" in s:
        test_script = s
        break

if not test_script:
    print("Could not find test script block!")
    exit(1)

# Extract everything from "// ===== Test Definitions" to "// ===== Test Runner"
test_defs_match = re.search(r'(// ={5,} Test Definitions.*?)(?=// ={5,} Test Runner)', test_script, re.DOTALL)
if not test_defs_match:
    print("Could not find test definitions section!")
    exit(1)

test_defs = test_defs_match.group(1)

# Remove duplicate const T=[] and function add declarations from test defs
test_defs = re.sub(r'^const T=\[\];\s*\n', '', test_defs, flags=re.MULTILINE)
test_defs = re.sub(r'^function add\(name,score,desc,setup\)\{T\.push.*?\}\s*\n', '', test_defs, flags=re.MULTILINE)

# Build the HTML file
parts = []
parts.append('''<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Test Runner</title></head>
<body>
<pre id="output">Running...</pre>
<script>
window.onerror = function(msg, url, line, col, error) {
  var el = document.getElementById('output');
  el.textContent += '\\nERROR: ' + msg + ' line:' + line + (error ? '\\n' + error.stack : '');
};
</script>
<script>
''')
parts.append(mjconst)
parts.append('''
</script>
<script>
const state = {
    handTiles:[], flowers:[], chows:[], pungs:[], openKongs:[], concealedKongs:[],
    winningTile:null, seatWind:'\u6771', roundWind:'\u6771', isDealer:false, dealerCount:0,
    isSelfDraw:false, isDeclaredReady:false, isIppatsu:false, isLastTileDraw:false,
    isLastDiscard:false, isFlowerDraw:false, isKongDraw:false, isRobbingKong:false,
    isDoubleKongDraw:false, isRobbingDoubleKong:false, isTenhou:false, isChihou:false,
    isTenReady:false, isChiReady:false, isFaceDown:false, isMultiWin:0,
    isMultiWinSelfDraw:false, visibleWinTileCount:0, history:[]
};
function getAllTiles(){
    const t=[...state.handTiles];
    state.chows.forEach(c=>t.push(...c.tiles));
    state.pungs.forEach(p=>t.push(...p.tiles));
    state.openKongs.forEach(k=>t.push(...k.tiles));
    state.concealedKongs.forEach(k=>t.push(...k.tiles));
    if(state.winningTile) t.push(state.winningTile);
    return t;
}
</script>
<script>
''')
parts.append(checkhandtype)
parts.append('''
</script>
<script>
function mt(type,value){return{type,value,display:type+'-'+value}}
function w(v){return mt(TILE_TYPES.CHARACTERS,v)}
function s(v){return mt(TILE_TYPES.BAMBOOS,v)}
function t(v){return mt(TILE_TYPES.DOTS,v)}
function h(v){return mt(TILE_TYPES.HONORS,v)}
function fl(v){return{type:TILE_TYPES.FLOWERS,value:v,display:'flower-'+v}}
function mkPung(fn,v){return{tiles:[fn(v),fn(v),fn(v)],type:fn(v).type,value:v}}
function mkChow(fn,a,b,c){return{tiles:[fn(a),fn(b),fn(c)],type:fn(a).type,value:a}}
function mkKong(fn,v){return{tiles:[fn(v),fn(v),fn(v),fn(v)],type:fn(v).type,value:v}}
function resetState(){
    state.handTiles=[];state.flowers=[];state.chows=[];state.pungs=[];
    state.openKongs=[];state.concealedKongs=[];state.winningTile=null;
    state.seatWind='\u6771';state.roundWind='\u6771';state.isDealer=false;state.dealerCount=0;
    state.isSelfDraw=false;state.isDeclaredReady=false;state.isIppatsu=false;
    state.isLastTileDraw=false;state.isLastDiscard=false;state.isFlowerDraw=false;
    state.isKongDraw=false;state.isRobbingKong=false;state.isDoubleKongDraw=false;
    state.isRobbingDoubleKong=false;state.isTenhou=false;state.isChihou=false;
    state.isTenReady=false;state.isChiReady=false;state.isFaceDown=false;
    state.isMultiWin=0;state.isMultiWinSelfDraw=false;state.visibleWinTileCount=0;
}
function baseHand(){
    return{ht:[w(2),w(3),w(4),w(6),w(7),w(8),s(2),s(3),s(4),s(6),s(7),s(8),t(2),t(3),t(4),t(5)],wt:t(5)};
}
function applyBase(b){
    state.handTiles=[...b.ht];state.winningTile=b.wt?{...b.wt}:null;
}
const T=[];
function add(name,score,desc,setup){T.push({name,score,desc,setup})}

// Test definitions extracted from test.html
''')
parts.append(test_defs)
parts.append('''

// Run tests synchronously
try {
let passed=0, failed=0;
const lines = [];
document.getElementById('output').textContent = 'Tests defined: ' + T.length + ' tests';
const sorted=[...T].sort((a,b)=>a.score-b.score||a.name.localeCompare(b.name));
sorted.forEach((test,i)=>{
    resetState();
    let results=[];
    try{
        test.setup();
        results=detectHandTypes();
        const match=results.find(r=>{
            if(r.name===test.name && r.score===test.score) return true;
            if(r.name.startsWith(test.name) && r.score===test.score) return true;
            if(test.name.startsWith(r.name) && r.score===test.score) return true;
            return false;
        });
        if(match) { passed++; }
        else {
            failed++;
            lines.push('FAIL #'+(i+1)+': "'+test.name+'" expected score='+test.score);
            lines.push('  Got: '+results.map(r=>r.name+'('+r.score+')').join(', '));
        }
    }catch(e){
        failed++;
        lines.push('ERROR #'+(i+1)+': "'+test.name+'" - '+e.message);
    }
});
lines.push('');
lines.push(passed+' passed / '+failed+' failed / '+T.length+' total');
document.getElementById('output').textContent = lines.join('\\n');
document.title = 'DONE:' + passed + '/' + failed + '/' + T.length;
} catch(e) {
  document.getElementById('output').textContent += '\\nRUN ERROR: ' + e.message + '\\n' + e.stack;
}
</script>
</body></html>
''')

output = ''.join(parts)

with open('test_standalone.html', 'w', encoding='utf-8') as f:
    f.write(output)

print(f"Created test_standalone.html ({len(output)} bytes)")
print(f"Test definitions: {len(test_defs)} chars")
