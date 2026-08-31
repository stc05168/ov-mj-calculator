"""
Run mahjong tests by loading the HTML page in a subprocess.
Since we can't run JS directly, we'll use a different approach:
Parse the test definitions and check tile counts.
"""
import re
from collections import Counter

with open('c:/stc05168/ov-mj-calculator/test.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find all test blocks
pattern = r"add\('([^']+)',(\d+),'([^']+)',\(\)=>\{([\s\S]*?)\}\);"
tests = re.findall(pattern, content)

print(f"Found {len(tests)} tests")

# For each test, try to determine the actual final handTiles and total tile count
issues = []
for i, (name, score, desc, body) in enumerate(tests):
    test_num = i + 1
    
    # Find the LAST handTiles assignment
    ht_matches = list(re.finditer(r'state\.handTiles=\[([\s\S]*?)\]', body))
    
    uses_base = 'baseHand()' in body or 'applyBase(' in body
    
    if uses_base and not ht_matches:
        # baseHand: 16 handTiles + 1 WT = 17
        continue  # assume valid
    
    if not ht_matches:
        continue
    
    last_ht = ht_matches[-1]
    ht_str = last_ht.group(1)
    ht_tiles = re.findall(r'[wsth]\(\d+\)', ht_str)
    
    # Find the LAST winningTile assignment AFTER the last handTiles
    wt_str = body[last_ht.end():]
    wt_matches = re.findall(r'state\.winningTile=([wsth]\(\d+\))', wt_str)
    wt_tile = wt_matches[-1] if wt_matches else None
    if wt_tile and 'null' in wt_str[:wt_str.find(wt_tile)+len(wt_tile)]:
        # check if null comes after
        pass
    
    # Check for winningTile=null in the remainder
    wt_null_after = re.search(r'state\.winningTile=null', wt_str)
    wt_value_after = re.search(r'state\.winningTile=([wsth]\(\d+\))', wt_str)
    
    has_wt = False
    if wt_value_after:
        if wt_null_after and wt_null_after.start() > wt_value_after.start():
            has_wt = False  # null comes after the value, so WT is null
        else:
            has_wt = True
            wt_tile = wt_value_after.group(1)
    
    # Count melds
    pung_count = len(re.findall(r'mkPung\([wsth],\d+\)', body))
    chow_count = len(re.findall(r'mkChow\([wsth],\d+,\d+,\d+\)', body))
    kong_count = len(re.findall(r'mkKong\([wsth],\d+\)', body))
    
    # Count tiles from melds
    meld_tiles = 0
    for m in re.finditer(r'mkPung\(([wsth]),(\d+)\)', body):
        meld_tiles += 3
    for m in re.finditer(r'mkChow\(([wsth]),(\d+),(\d+),(\d+)\)', body):
        meld_tiles += 3
    for m in re.finditer(r'mkKong\(([wsth]),(\d+)\)', body):
        meld_tiles += 4
    
    # Total
    total = len(ht_tiles) + (1 if has_wt else 0) + meld_tiles
    
    # Count all tiles for duplicates
    all_tiles = list(ht_tiles)
    if has_wt:
        all_tiles.append(wt_tile)
    
    # Add meld tiles
    for m in re.finditer(r'mkPung\(([wsth]),(\d+)\)', body):
        fn, v = m.group(1), m.group(2)
        all_tiles.extend([f'{fn}({v})'] * 3)
    for m in re.finditer(r'mkChow\(([wsth]),(\d+),(\d+),(\d+)\)', body):
        fn, a, b, c = m.group(1), m.group(2), m.group(3), m.group(4)
        all_tiles.extend([f'{fn}({a})', f'{fn}({b})', f'{fn}({c})'])
    for m in re.finditer(r'mkKong\(([wsth]),(\d+)\)', body):
        fn, v = m.group(1), m.group(2)
        all_tiles.extend([f'{fn}({v})'] * 4)
    
    counts = Counter(all_tiles)
    violations = {k: v for k, v in counts.items() if v > 4}
    
    problems = []
    if total != 17 + kong_count:
        problems.append(f"total={total} (expected {17+kong_count})")
    if violations:
        problems.append(f"duplicate_tiles={violations}")
    
    if problems:
        issues.append((test_num, name, score, problems, body))
        print(f"#{test_num:3d} {name:25s} score={score:3s}: {'; '.join(problems)}")

print(f"\n{len(issues)} tests with issues out of {len(tests)} total")
