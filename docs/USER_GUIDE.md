# User Guide

## 1. Purpose

The One Victoria Taiwan Mahjong Calculator helps a player enter a completed 16-tile Taiwan Mahjong hand and calculate its scoring items and total fan. The interface is in Traditional Chinese.

The calculator does not determine whether play should continue, manage players, settle payments, or replace agreement on local table rules. It evaluates the hand and conditions entered by the user according to the rules implemented in this repository.

## 2. Open the calculator

For predictable browser behavior, serve the repository over local HTTP:

```bat
python -m http.server 8000
```

Then open `http://127.0.0.1:8000/mj.html`.

No sign-in, server, database, or internet connection is required after the static files are available.

## 3. Screen layout

The page is divided into these areas:

1. **Tile banks**: character, bamboo, dot, and honor tiles.
2. **Selected hand**: concealed tiles currently held.
3. **Exposed area**: chow, pung, open-kong, and concealed-kong groups.
4. **Winning tile**: the single tile completing the hand.
5. **Controls**: 吃, 碰, 明槓, 暗槓, 復原, and 清除選擇.
6. **Flowers**: selected flower tiles.
7. **Settings**: seat wind, round wind, dealer status, repeat-dealer count, and self-draw.
8. **Special conditions**: situational scoring inputs.
9. **Results**: detected hand types and total fan.

## 4. Enter a hand

### 4.1 Select tiles

Select a tile from a tile bank by clicking or tapping it. The selected copy is added to the hand. You can also use the supported drag-and-drop and touch interactions to move tiles between valid areas.

The current guard rejects a fifth matching tile only while four copies remain in the concealed-hand array. Tiles already moved to the winning area or a meld are outside that check, so verify manually that the complete physical hand never contains more than four copies.

### 4.2 Concealed tiles and winning tile

Keep non-exposed tiles in the concealed hand area. Assign exactly one tile to the winning-tile area. When the concealed-hand capacity is reached, the next selected tile can be assigned automatically as the winning tile.

The scoring engine sees the concealed tiles, exposed sets, kongs, and winning tile as the complete tile collection.

### 4.3 Create exposed sets

The meld buttons infer tiles from the concealed-hand array; there is no independent click-selection state for concealed tiles.

- **吃**: uses the last three concealed tiles. Add or arrange the intended suited sequence as the final three tiles before pressing the button.
- **碰**: finds the largest identical concealed group containing at least three copies and moves three copies.
- **明槓**: finds an identical concealed group of exactly four copies and moves it as an open kong.
- **暗槓**: finds an identical concealed group of exactly four copies and moves it as a concealed kong.

If multiple identical groups qualify with the same count, the first qualifying group encountered in concealed-hand order is used. Check the exposed area immediately after creating a set and use **復原** if the inferred group was not the intended one.

### 4.4 Physical tile count

A completed Taiwan Mahjong hand normally contains 17 physical tiles. Every kong adds one replacement tile, so the required count is:

```text
17 + number of kongs
```

The result area displays a validation message instead of calculating when the physical tile count is incorrect.

## 5. Enter flowers and table settings

### Flowers

Select every flower held by the winning player. Flower selection affects flower-related scoring and may interact with seat wind.

### Seat and round wind

Choose:

- **座位風位**: the winning player's seat wind.
- **圈風**: the current round wind.

These values affect wind-related scoring.

### Dealer state

Use **是否莊家** to mark the winner as dealer. Select the applicable repeat-dealer count in **連莊次數**. Dealer and repeat-dealer fan are added by the UI after hand types are detected.

### Self-draw

Select **是否自摸** when the winning tile was drawn by the winner rather than discarded by another player.

## 6. Special conditions

Select a condition only when it actually occurred.

### Basic

- **宣告聽牌(叮)**: declared ready.
- **一發**: ippatsu under the implemented rule conditions.

### Special draws and kong situations

- **花上自摸**: self-draw after a flower replacement.
- **槓上自摸**: self-draw after a kong replacement.
- **槓上槓食糊**: win in the implemented double-kong situation.
- **搶槓食糊**: robbing a kong.
- **搶槓上槓糊**: robbing in the implemented double-kong situation.

### Heaven and earth states

- **天糊** and **地糊**: heaven/earth wins.
- **天聽** and **地聽**: heaven/earth ready states.

### Other conditions

- **蓋牌**: face-down condition.
- **海底撈月**: self-draw on the last tile.
- **河底撈魚**: win on the last discard.

### Multiple wins

Use the multiple-win selector for 雙響 or 三響 when applicable. Select **錦上添花** only for the corresponding self-draw condition.

### Visible winning-tile copies

Set **桌面可見食糊牌數** to the number of other winning-tile copies visible on the table. This input is used by the implemented rarity/wait rules.

## 7. Read the result

The result panel lists each detected scoring item and its fan value. The total includes:

- final hand-type results after exclusion rules;
- allowed situational rewards;
- dealer fan when selected; and
- repeat-dealer fan when selected.

Some valid raw patterns are intentionally absent because stronger or combined patterns exclude them. For example, designated v2.7 no-honor patterns suppress 無字 and 無字花 rather than stacking with them. See [Rules](RULES.md).

The displayed scoring entries follow the engine's deterministic result ordering. The total is the sum of the final entries plus dealer-related additions.

## 8. Undo and clear

- **復原** restores the preceding tile/meld/flower/winning-tile snapshot. Up to 50 snapshots are retained.
- **清除選擇** clears the selected hand data.

Undo history covers hand construction data. Do not rely on it to restore every checkbox or table setting; verify settings before accepting the result.

## 9. Recommended entry sequence

For fewer mistakes:

1. Enter exposed sets first.
2. Enter concealed tiles.
3. Assign the winning tile.
4. Add flowers.
5. Set seat wind and round wind.
6. Set dealer and self-draw values.
7. Select special conditions.
8. Confirm the physical tile count and final results.

## 10. Troubleshooting

### The calculator reports the wrong number of tiles

Count all concealed tiles, the winning tile, exposed sets, and all four tiles in each kong. The required count is 17 plus one for each kong.

### A fifth copy cannot be selected

The application enforces the physical limit of four copies per tile.

### No result appears

Confirm JavaScript is enabled, all five runtime files are in the same directory, and the page was loaded from a local/static HTTP server. Check the browser developer console for missing-file errors.

### A scoring item is missing

It may have been removed by an exclusion rule or replaced by a stronger result. Compare the hand with [Rules](RULES.md) and the canonical expectations in `../test.html`.

### Drag and drop is inconvenient on mobile

Use tap/click controls and the provided action buttons. Touch support exists, but device behavior can differ.

### The result disagrees with a local rule

This project follows its v2.7 reference and executable tests. Record the complete hand, winning tile, melds, flowers, winds, flags, expected result, and relevant rule section before proposing a scoring change. See [Contributing](../CONTRIBUTING.md).
