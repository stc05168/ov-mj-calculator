import re
from collections import Counter

with open('c:/stc05168/ov-mj-calculator/test.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find all test blocks - handle multi-line bodies
tests = re.findall(r"add\('(.+?)',(\d+),'(.+?)',\(\)=>\{(.+?)\}\);", content, re.DOTALL)

print(f"Found {len(tests)} tests\n")

for i, (name, score, desc, body) in enumerate(tests):
    tiles = []
    
    # Find ALL handTiles assignments (take the last one)
    ht_matches = re.findall(r'state\.handTiles=\[(.*?)\]', body, re.DOTALL)
    if ht_matches:
        ht_str = ht_matches[-1]  # use last assignment
        tiles.extend(re.findall(r'[wsth]\(\d+\)', ht_str))
    
    # Find ALL winningTile assignments (take the last one)
    wt_matches = re.findall(r'state\.winningTile=([wsth]\(\d+\))', body)
    if wt_matches:
        wt_str = wt_matches[-1]
        if wt_str != 'null':
            tiles.append(wt_str)
    
    # pungs
    pung_matches = re.findall(r'mkPung\(([wsth]),(\d+)\)', body)
    for fn, v in pung_matches:
        tiles.extend([f'{fn}({v})'] * 3)
    
    # chows
    chow_matches = re.findall(r'mkChow\(([wsth]),(\d+),(\d+),(\d+)\)', body)
    for fn, a, b, c in chow_matches:
        tiles.extend([f'{fn}({a})', f'{fn}({b})', f'{fn}({c})'])
    
    # kongs
    kong_matches = re.findall(r'mkKong\(([wsth]),(\d+)\)', body)
    for fn, v in kong_matches:
        tiles.extend([f'{fn}({v})'] * 4)
    
    # Count
    counts = Counter(tiles)
    violations = {k: v for k, v in counts.items() if v > 4}
    total = len(tiles)
    
    issues = []
    if violations:
        issues.append(f"tile_violations={violations}")
    if total != 17:
        issues.append(f"total={total}")
    
    if issues:
        print(f"#{i+1:3d} {name:20s} (score={score:3s}): {', '.join(issues)}")
