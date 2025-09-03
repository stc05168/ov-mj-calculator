// 檢測牌型
function detectHandTypes() {
    const handTypes = [];
    const allTiles = getAllTiles();
    
    // 先檢查大牌型（高番數）
    
    // 11. 字一色
    if (isAllHonors(allTiles)) {
        handTypes.push({ name: '字一色', score: 150 });
    }
    
    // 10. 大四喜
    let isWindsResult = isBigFourWinds(allTiles) || isSmallFourWinds(allTiles) || isBigThreeWinds(allTiles) || isSmallThreeWinds(allTiles);
    if (isBigFourWinds(allTiles)) {
        handTypes.push({ name: '大四喜', score: 120 });
    }else if (isSmallFourWinds(allTiles)) {
        handTypes.push({ name: '小四喜', score: 80 });
    }else if (isBigThreeWinds(allTiles)) {
        // 8. 大三風
        handTypes.push({ name: '大三風', score: 40 });
    }else if (isSmallThreeWinds(allTiles)) {
        handTypes.push({ name: '小三風', score: 20 });
    }
    
    // 6. 大三元
    let isDragonsResult = isBigThreeDragons(allTiles) || isSmallThreeDragons(allTiles);
    if (isBigThreeDragons(allTiles)) {
        handTypes.push({ name: '大三元', score: 60 });
    }else if (isSmallThreeDragons(allTiles)) {
        handTypes.push({ name: '小三元', score: 30 });
    }
    
    // 新增姊妹牌型檢測
    const sisterResults = detectSisterHandTypes(allTiles);
    if (sisterResults) {
        handTypes.push(sisterResults);
    }
    
    // 新增般高、相逢和步步高牌型檢測
    const gaoxiangResults = detectGaoxiangHandTypes(allTiles);
    gaoxiangResults.forEach(result => {
        handTypes.push(result);
    });
    
    // 檢查基本牌型
    // 檢查門前清 (沒有吃、碰和槓)
    if (state.chows.length === 0 && state.pungs.length === 0) {
        handTypes.push({ name: '門前清', score: 5 });
    }
    
    // 檢查平糊 (全部是順子)
    let isPingHuResult = isPingHu(allTiles);
    
    // 檢查對對糊 (全部是刻子)
    if (isDuiDuiHu(allTiles)) {
        handTypes.push({ name: '對對糊', score: 40 });
    }
    
    // 檢查混一色 (只有一種數牌和字牌)
    if (isMixedOneSuit(allTiles)) {
        handTypes.push({ name: '混一色', score: 40 });
    }
    
    // 檢查清一色 (只有一種數牌)
    if (isPureOneSuit(allTiles)) {
        handTypes.push({ name: '清一色', score: 100 });
    }
    
    // 新增番種檢測
    // a. 無字
    let hasNoHonors = isNoHonors(allTiles);
    
    // b. 無花
    let hasNoFlowers = isNoFlowers();
    
    // 優先檢查組合牌型
    if (hasNoHonors && hasNoFlowers && isPingHuResult) {
        handTypes.push({ name: '無字花大平糊', score: 15 });
    } else if (hasNoHonors && hasNoFlowers) {
        handTypes.push({ name: '無字花', score: 5 });
    } else {
        if (hasNoHonors) {
            handTypes.push({ name: '無字', score: 2 });
        }
        if (hasNoFlowers) {
            handTypes.push({ name: '無花', score: 2 });
        }
    }
    
    // 如果不是無字花大平糊，則添加平糊
    if (isPingHuResult && !(hasNoHonors && hasNoFlowers)) {
        handTypes.push({ name: '平糊', score: 2 });
    }
    
    // a. 缺一門: 只有筒索萬其中2款
    if (isMissingOneSuit(allTiles)) {
        handTypes.push({ name: '缺一門', score: 10 });
    }
    
    // b. 暗刻
    const concealedPungCount = getConcealedPungCount();
    if (concealedPungCount >= 2) {
        if (concealedPungCount === 2) {
            handTypes.push({ name: '2暗刻', score: 5 });
        } else if (concealedPungCount === 3) {
            handTypes.push({ name: '3暗刻', score: 15 });
        } else if (concealedPungCount === 4) {
            handTypes.push({ name: '4暗刻', score: 30 });
        } else if (concealedPungCount >= 5) {
            // 5暗刻+自摸=坎坎糊
            if (concealedPungCount >= 5 && state.isSelfDraw) {
                handTypes.push({ name: '坎坎糊', score: 200 });
                
                // 移除對對糊
                const duiDuiHuIndex = handTypes.findIndex(h => h.name === '對對糊');
                if (duiDuiHuIndex !== -1) handTypes.splice(duiDuiHuIndex, 1);
                
                // 移除暗刻
                const concealedPungIndex = handTypes.findIndex(h => h.name.includes('暗刻'));
                if (concealedPungIndex !== -1) handTypes.splice(concealedPungIndex, 1);
            } else {
                handTypes.push({ name: '5暗刻', score: 100 });
                
                // 移除對對糊
                const duiDuiHuIndex = handTypes.findIndex(h => h.name === '對對糊');
                if (duiDuiHuIndex !== -1) handTypes.splice(duiDuiHuIndex, 1);
            }
        }
    }
    
    // c. 明槓和暗槓
    if (state.openKongs.length > 0) {
        handTypes.push({ name: `明槓x${state.openKongs.length}`, score: state.openKongs.length });
    }
    
    if (state.concealedKongs.length > 0) {
        handTypes.push({ name: `暗槓x${state.concealedKongs.length}`, score: state.concealedKongs.length * 2 });
    }
    
    // d. 兄弟
    const brotherPungs = getBrotherPungs();
    if (isThreeBrothers(allTiles)) {
        handTypes.push({ name: '三兄弟', score: 30 });
    }else if (isSmallThreeBrothers(allTiles)) {
        handTypes.push({ name: '三小兄弟', score: 15 });
    }else if (brotherPungs.length >= 2) {
        handTypes.push({ name: '兩兄弟', score: 5 });
    }
    
    // e. 雜兄弟
    if (isBigMixedBrothers(allTiles)) {
        handTypes.push({ name: '大雜兄弟', score: 15 });
    }else if (isSmallMixedBrothers(allTiles)) {
        handTypes.push({ name: '小雜兄弟', score: 8 });
    }
    
    // 為了避免假獨和對碰同時出現，將獨獨/假獨檢查放在對碰為false時
    const isPair = isPairWait(allTiles);
    if (!isPair) {
        // d. 獨獨
        if (isSingleWait(allTiles)) {
            handTypes.push({ name: '獨獨', score: 2 });
        }
        // d2. 假獨
        else if (isFakeSingleWait(allTiles)) {
            handTypes.push({ name: '假獨', score: 1 });
        }
    }
    
    // e. 對碰
    if (isPair) {
        handTypes.push({ name: '對碰', score: 2 });
    }
    
    // f. 將眼
    if (is258Eye(allTiles)) {
        handTypes.push({ name: '將眼', score: 2 });
    }
    
    // g. 風牌
    const windPungs = getWindPungs();
    if (!isWindsResult) {
        windPungs.forEach(wind => {
            handTypes.push({ name: `風牌(${wind})`, score: 1 });
        });
    }
    
    // g2. 風牌 (圈)
    const roundWindPungs = getRoundWindPungs();
    roundWindPungs.forEach(wind => {
        handTypes.push({ name: `風牌(${wind}圈)`, score: 1 });
    });
    
    // g3. 風牌 (位)
    const seatWindPungs = getSeatWindPungs();
    seatWindPungs.forEach(wind => {
        handTypes.push({ name: `風牌(${wind}位)`, score: 1 });
    });
    
    // h. 元牌
    const dragonPungs = getDragonPungs();
    if (!isDragonsResult) {
        dragonPungs.forEach(dragon => {
            handTypes.push({ name: `元牌(${dragon})`, score: 2 });
        });
    }
    
    // 2. 花牌計番 (正花+2番，其他花+1番)
    const flowerScoreInfo = calculateFlowerScore();
    if (flowerScoreInfo.totalScore > 0) {
        handTypes.push({ 
            name: `花牌 (${flowerScoreInfo.positiveFlowers}正花 + ${flowerScoreInfo.otherFlowers}其他花)`, 
            score: flowerScoreInfo.totalScore 
        });
    }
    
    return sortHandTypes(handTypes);
}

// 新增般高、相逢和步步高牌型檢測函數
function detectGaoxiangHandTypes(allTiles) {
    const results = [];
    
    // 獲取所有順子（包括吃和手牌中的順子）
    const allChows = getAllChows(allTiles);
    
    // 1. 檢查般高（相同花色相同數字的順子）
    const gaoxiangResults = detectGaoxiang(allChows);
    results.push(...gaoxiangResults);
    
    // 2. 檢查相逢（不同花色相同數字的順子）
    const xiangfengResults = detectXiangfeng(allChows);
    results.push(...xiangfengResults);
    
    // 3. 檢查步步高（漸進式順子）
    const bubugaoResults = detectBubugao(allChows);
    results.push(...bubugaoResults);
    
    return results;
}

// 獲取所有順子（包括吃和手牌中的順子）
function getAllChows(allTiles) {
    const chows = [];
    
    // 添加吃的順子
    state.chows.forEach(chow => {
        chows.push({ 
            type: chow.type, 
            values: [chow.value, chow.value + 1, chow.value + 2],
            startValue: chow.value
        });
    });
    
    // 添加手牌中的順子（需要分析手牌來找出順子）
    const handChows = findChowsInHand(allTiles);
    chows.push(...handChows);
    
    return chows;
}

// 從手牌中找出順子
function findChowsInHand(allTiles) {
    const chows = [];
    const handTiles = [...allTiles];
    
    // 按花色和數值排序
    handTiles.sort((a, b) => {
        if (a.type !== b.type) return a.type.localeCompare(b.type);
        return a.value - b.value;
    });
    
    // 找出順子
    for (let i = 0; i < handTiles.length - 2; i++) {
        const tile1 = handTiles[i];
        if (tile1.type === TILE_TYPES.HONORS) continue; // 跳過字牌
        
        for (let j = i + 1; j < handTiles.length - 1; j++) {
            const tile2 = handTiles[j];
            if (tile2.type !== tile1.type) continue;
            
            for (let k = j + 1; k < handTiles.length; k++) {
                const tile3 = handTiles[k];
                if (tile3.type !== tile1.type) continue;
                
                // 檢查是否為順子
                const values = [tile1.value, tile2.value, tile3.value].sort((a, b) => a - b);
                if (values[0] + 1 === values[1] && values[1] + 1 === values[2]) {
                    chows.push({
                        type: tile1.type,
                        values: values,
                        startValue: values[0]
                    });
                    
                    // 移除已使用的牌（避免重複計算）
                    handTiles.splice(k, 1);
                    handTiles.splice(j, 1);
                    handTiles.splice(i, 1);
                    i--; // 調整索引
                    break;
                }
            }
        }
    }
    
    return chows;
}

// 檢測般高牌型
function detectGaoxiang(allChows) {
    const results = [];
    const chowGroups = {};
    
    // 按花色和起始數值分組順子
    allChows.forEach(chow => {
        const key = `${chow.type}-${chow.startValue}`;
        if (!chowGroups[key]) {
            chowGroups[key] = [];
        }
        chowGroups[key].push(chow);
    });
    
    // 計算每個組的數量
    const gaoxiangCounts = {};
    for (const key in chowGroups) {
        const count = chowGroups[key].length;
        if (count >= 2) {
            const [type, startValue] = key.split('-');
            if (!gaoxiangCounts[type]) {
                gaoxiangCounts[type] = {};
            }
            gaoxiangCounts[type][startValue] = count;
        }
    }
    
    // 檢查般高牌型
    let totalGaoxiang = 0;
    for (const type in gaoxiangCounts) {
        for (const startValue in gaoxiangCounts[type]) {
            const count = gaoxiangCounts[type][startValue];
            
            if (count === 4) {
                results.push({ name: '四般高', score: 30 });
                totalGaoxiang += 2; // 四般高算作兩個雙般高
            } else if (count === 3) {
                results.push({ name: '三般高', score: 15 });
                totalGaoxiang += 1; // 三般高算作一個般高
            } else if (count === 2) {
                totalGaoxiang += 1;
            }
        }
    }
    
    // 添加般高和雙般高
    if (totalGaoxiang >= 2) {
        results.push({ name: '雙般高', score: 10 });
    } else if (totalGaoxiang >= 1) {
        results.push({ name: '一般高', score: 5 });
    }
    
    return results;
}

// 檢測相逢牌型
function detectXiangfeng(allChows) {
    const results = [];
    const chowGroups = {};
    
    // 按起始數值分組順子（不分花色）
    allChows.forEach(chow => {
        const key = chow.startValue.toString();
        if (!chowGroups[key]) {
            chowGroups[key] = new Set();
        }
        chowGroups[key].add(chow.type);
    });
    
    // 檢查相逢牌型
    for (const startValue in chowGroups) {
        const suitCount = chowGroups[startValue].size;
        
        if (suitCount === 3) {
            results.push({ name: '三相逢', score: 10 });
        } else if (suitCount === 2) {
            results.push({ name: '二相逢', score: 3 });
        }
    }
    
    return results;
}

// 檢測步步高牌型
function detectBubugao(allChows) {
    const results = [];
    const chowsBySuit = {};
    
    // 按花色分組順子
    allChows.forEach(chow => {
        if (!chowsBySuit[chow.type]) {
            chowsBySuit[chow.type] = [];
        }
        chowsBySuit[chow.type].push(chow.startValue);
    });
    
    // 檢查一色步步高（同花色漸進式順子）
    for (const suit in chowsBySuit) {
        const values = chowsBySuit[suit].sort((a, b) => a - b);
        
        if (values.length >= 3) {
            // 檢查是否有連續三個漸進式順子
            for (let i = 0; i < values.length - 2; i++) {
                if (values[i] + 1 === values[i + 1] && values[i + 1] + 1 === values[i + 2]) {
                    results.push({ name: '一色步步高', score: 15 });
                    break;
                }
            }
        }
    }
    
    // 檢查三色步步高（不同花色漸進式順子）
    const allStartValues = [];
    allChows.forEach(chow => {
        allStartValues.push({
            suit: chow.type,
            value: chow.startValue
        });
    });
    
    // 按起始數值排序
    allStartValues.sort((a, b) => a.value - b.value);
    
    // 檢查三色步步高
    for (let i = 0; i < allStartValues.length - 2; i++) {
        const first = allStartValues[i];
        const second = allStartValues[i + 1];
        const third = allStartValues[i + 2];
        
        if (first.value + 1 === second.value && second.value + 1 === third.value &&
            first.suit !== second.suit && first.suit !== third.suit && second.suit !== third.suit) {
            results.push({ name: '三色步步高', score: 5 });
            break;
        }
    }
    
    return results;
}

// 新增姊妹牌型檢測函數
function detectSisterHandTypes(allTiles) {
    // 獲取所有刻子（包括碰、明槓、暗槓和手牌中的刻子）
    const allPungs = getAllPungs(allTiles);
    
    // 按花色分組刻子
    const pungsBySuit = {};
    allPungs.forEach(pung => {
        if (!pungsBySuit[pung.type]) {
            pungsBySuit[pung.type] = [];
        }
        pungsBySuit[pung.type].push(pung.value);
    });
    
    // 對每個花色的刻子進行排序
    for (const suit in pungsBySuit) {
        pungsBySuit[suit].sort((a, b) => a - b);
    }
    
    // 檢查每個花色的連續刻子
    for (const suit in pungsBySuit) {
        const values = pungsBySuit[suit];
        if (values.length < 2) continue; // 至少需要2個刻子
        
        // 找出所有連續序列
        const sequences = findConsecutiveSequences(values);
        
        // 檢查每個連續序列
        for (const seq of sequences) {
            const seqLength = seq.length;
            
            // 檢查是否有相連的眼（對子）
            const hasConnectedPair = checkConnectedPair(allTiles, suit, seq);
            
            // 根據序列長度和是否有相連的眼判斷牌型
            if (seqLength === 5 && hasConnectedPair) {
                return { name: '六小姊妹', score: 100 };
            } else if (seqLength === 5) {
                return { name: '五姊妹', score: 80 };
            } else if (seqLength === 4 && hasConnectedPair) {
                return { name: '五小姊妹', score: 60 };
            } else if (seqLength === 4) {
                return { name: '四姊妹', score: 40 };
            } else if (seqLength === 3 && hasConnectedPair) {
                return { name: '四小姊妹', score: 20 };
            } else if (seqLength === 3) {
                return { name: '三姊妹', score: 15 };
            } else if (seqLength === 2 && hasConnectedPair) {
                return { name: '三小姊妹', score: 8 };
            } else if (seqLength === 2) {
                return { name: '二姊妹', score: 5 };
            }
        }
    }
    
    return null;
}

// 獲取所有刻子（包括碰、明槓、暗槓和手牌中的刻子）
function getAllPungs(allTiles) {
    const pungs = [];
    
    // 添加碰的刻子
    state.pungs.forEach(pung => {
        pungs.push({ type: pung.type, value: pung.value });
    });
    
    // 添加明槓和暗槓的刻子
    state.openKongs.forEach(kong => {
        pungs.push({ type: kong.type, value: kong.value });
    });
    
    state.concealedKongs.forEach(kong => {
        pungs.push({ type: kong.type, value: kong.value });
    });
    
    // 添加手牌中的刻子
    const handCounts = {};
    allTiles.forEach(tile => {
        if (tile.type !== TILE_TYPES.HONORS && tile.type !== TILE_TYPES.FLOWERS) {
            const key = `${tile.type}-${tile.value}`;
            handCounts[key] = (handCounts[key] || 0) + 1;
        }
    });
    
    for (const key in handCounts) {
        if (handCounts[key] >= 3) {
            const [type, value] = key.split('-');
            pungs.push({ type, value: parseInt(value) });
        }
    }
    
    return pungs;
}

// 找出連續的數字序列
function findConsecutiveSequences(values) {
    const sequences = [];
    let currentSeq = [values[0]];
    
    for (let i = 1; i < values.length; i++) {
        if (values[i] === values[i - 1] + 1) {
            currentSeq.push(values[i]);
        } else {
            if (currentSeq.length >= 2) {
                sequences.push([...currentSeq]);
            }
            currentSeq = [values[i]];
        }
    }
    
    if (currentSeq.length >= 2) {
        sequences.push([...currentSeq]);
    }
    
    return sequences;
}

// 檢查是否有與刻子序列相連的眼（對子）
function checkConnectedPair(allTiles, suit, sequence) {
    const minValue = sequence[0];
    const maxValue = sequence[sequence.length - 1];
    
    // 檢查序列前一個數字是否有對子
    if (minValue > 1) {
        const prevValue = minValue - 1;
        const count = countTiles(allTiles, suit, prevValue);
        if (count >= 2) {
            return true;
        }
    }
    
    // 檢查序列後一個數字是否有對子
    if (maxValue < 9) {
        const nextValue = maxValue + 1;
        const count = countTiles(allTiles, suit, nextValue);
        if (count >= 2) {
            return true;
        }
    }
    
    return false;
}

// 計算特定花色和數值的牌數量
function countTiles(allTiles, suit, value) {
    let count = 0;
    allTiles.forEach(tile => {
        if (tile.type === suit && tile.value === value) {
            count++;
        }
    });
    return count;
}

// 計算花牌分數
function calculateFlowerScore() {
    let positiveFlowers = 0;
    let otherFlowers = 0;
    
    state.flowers.forEach(flower => {
        // 檢查是否為正花 (花的座位風位與玩家座位風位匹配)
        if (flower.seatWind === state.seatWind) {
            positiveFlowers++;
        } else {
            otherFlowers++;
        }
    });
    
    const totalScore = (positiveFlowers * 2) + otherFlowers;
    
    return {
        positiveFlowers,
        otherFlowers,
        totalScore
    };
}

// 檢查是否為平糊
function isPingHu(allTiles) {
    // 平糊需要全部是順子（不能有刻子）和一对将牌
    if (state.pungs.length > 0 || state.openKongs.length > 0 || state.concealedKongs.length > 0) {
        return false;
    }
    
    // 复制牌组以便操作
    const tiles = [...allTiles];
    
    // 首先找出将牌（一对相同的牌）
    let pairFound = false;
    for (let i = 0; i < tiles.length; i++) {
        for (let j = i + 1; j < tiles.length; j++) {
            if (tiles[i].type === tiles[j].type && tiles[i].value === tiles[j].value) {
                // 找到一对将牌
                const pair = [tiles[i], tiles[j]];
                const remainingTiles = tiles.filter((t, index) => index !== i && index !== j);
                
                // 检查剩余牌是否全部能组成顺子
                if (canFormAllChows(remainingTiles)) {
                    pairFound = true;
                    break;
                }
            }
        }
        if (pairFound) break;
    }
    
    return pairFound;
}

// 检查牌组是否能全部组成顺子
function canFormAllChows(tiles) {
    if (tiles.length === 0) return true;
    if (tiles.length % 3 !== 0) return false;
    
    // 按花色和数值排序
    const sortedTiles = [...tiles].sort((a, b) => {
        if (a.type !== b.type) return a.type.localeCompare(b.type);
        return a.value - b.value;
    });
    
    // 尝试找出顺子
    for (let i = 0; i < sortedTiles.length - 2; i++) {
        const first = sortedTiles[i];
        
        // 找第二张牌
        for (let j = i + 1; j < sortedTiles.length; j++) {
            if (sortedTiles[j].type === first.type && sortedTiles[j].value === first.value + 1) {
                // 找第三张牌
                for (let k = j + 1; k < sortedTiles.length; k++) {
                    if (sortedTiles[k].type === first.type && sortedTiles[k].value === first.value + 2) {
                        // 找到顺子，移除这三张牌并递归检查剩余牌
                        const remainingTiles = sortedTiles.filter((t, index) => 
                            index !== i && index !== j && index !== k
                        );
                        if (canFormAllChows(remainingTiles)) {
                            return true;
                        }
                    }
                }
            }
        }
    }
    
    return false;
}

// 檢查是否為對對糊
function isDuiDuiHu(allTiles) {
    // 對對糊需要全部是刻子（三张或四张相同的牌）和一对将牌
    if (state.chows.length > 0) {
        return false;
    }
    
    // 复制牌组以便操作
    const tiles = [...allTiles];
    const counts = {};
    
    // 统计每种牌的数量
    tiles.forEach(tile => {
        const key = `${tile.type}-${tile.value}`;
        counts[key] = (counts[key] || 0) + 1;
    });
    
    // 检查是否全部是刻子（3或4张相同的牌）和一对将牌
    let pairCount = 0;
    for (const key in counts) {
        const count = counts[key];
        if (count === 2) {
            pairCount++;
        } else if (count !== 3 && count !== 4) {
            return false;
        }
    }
    
    return pairCount === 1;
}

// 檢查是否為混一色
function isMixedOneSuit(allTiles) {
    // 混一色需要只有一種數牌和字牌
    const suits = new Set();
    let hasHonor = false;
    
    for (const tile of allTiles) {
        if (tile.type === TILE_TYPES.HONORS) {
            hasHonor = true;
        } else {
            suits.add(tile.type);
        }
        
        // 如果有超過一種數牌，則不是混一色
        if (suits.size > 1) {
            return false;
        }
    }
    
    // 必須有字牌和一種數牌
    return hasHonor && suits.size === 1;
}

// 檢查是否為清一色
function isPureOneSuit(allTiles) {
    // 清一色需要只有一種數牌（不能有字牌）
    const suits = new Set();
    
    for (const tile of allTiles) {
        if (tile.type === TILE_TYPES.HONORS) {
            return false;
        }
        suits.add(tile.type);
        
        // 如果有超過一種數牌，則不是清一色
        if (suits.size > 1) {
            return false;
        }
    }
    
    return true;
}

// 新增番種檢測函數

// a. 無字: 沒有東南西北中發白的字牌
function isNoHonors(allTiles) {
    return !allTiles.some(tile => tile.type === TILE_TYPES.HONORS);
}

// b. 無花: 沒有花牌
function isNoFlowers() {
    return state.flowers.length === 0;
}

// a. 缺一門: 只有筒索萬其中2款
function isMissingOneSuit(allTiles) {
    const suits = new Set();
    
    for (const tile of allTiles) {
        if (tile.type !== TILE_TYPES.HONORS && tile.type !== TILE_TYPES.FLOWERS) {
            suits.add(tile.type);
        }
        
        // 如果有超過2種數牌，則不是缺一門
        if (suits.size > 2) {
            return false;
        }
    }
    
    return suits.size === 2;
}

// b. 暗刻數量
function getConcealedPungCount() {
    let count = 0;
    
    // 手牌中的刻子
    const handCounts = {};
    state.handTiles.forEach(tile => {
        const key = `${tile.type}-${tile.value}`;
        handCounts[key] = (handCounts[key] || 0) + 1;
    });
    
    for (const key in handCounts) {
        if (handCounts[key] >= 3) {
            count++;
        }
    }
    
    // 暗槓也算暗刻
    count += state.concealedKongs.length;
    
    return count;
}

// d. 兩兄弟: 同數字不同款色的刻子
function getBrotherPungs() {
    const brotherPungs = [];
    const allTiles = getAllTiles();
    const counts = {};
    
    // 統計每種數字的每個花色數量
    allTiles.forEach(tile => {
        if (tile.type !== TILE_TYPES.HONORS && tile.type !== TILE_TYPES.FLOWERS) {
            const val = tile.value;
            if (!counts[val]) counts[val] = {};
            const suit = tile.type;
            counts[val][suit] = (counts[val][suit] || 0) + 1;
        }
    });
    
    // 檢查是否有同數字不同花色的刻子 (每個花色 >=3)
    for (const val in counts) {
        let numSuitsWithPung = 0;
        for (const suit in counts[val]) {
            if (counts[val][suit] >= 3) {
                numSuitsWithPung++;
            }
        }
        if (numSuitsWithPung >= 2) {
            brotherPungs.push(val);
        }
    }
    
    return brotherPungs;
}

// d2. 三小兄弟: 兩兄弟再加上另一個兄弟對子 (眼)
function isSmallThreeBrothers(allTiles) {
    const brotherPungs = getBrotherPungs();
    if (brotherPungs.length < 2) return false;
    
    // 檢查是否有對子
    const counts = {};
    allTiles.forEach(tile => {
        if (tile.type !== TILE_TYPES.HONORS && tile.type !== TILE_TYPES.FLOWERS) {
            const key = `${tile.type}-${tile.value}`;
            counts[key] = (counts[key] || 0) + 1;
        }
    });
    
    // 尋找對子
    for (const key in counts) {
        if (counts[key] >= 2) {
            const [type, value] = key.split('-');
            // 檢查這個對子是否與已有的兄弟刻子不同
            if (!brotherPungs.includes(value)) {
                return true;
            }
        }
    }
    
    return false;
}

// d3. 三兄弟: 三款不同而數子相同的刻子
function isThreeBrothers(allTiles) {
    const counts = {};
    
    // 統計每種數字的每個花色數量
    allTiles.forEach(tile => {
        if (tile.type !== TILE_TYPES.HONORS && tile.type !== TILE_TYPES.FLOWERS) {
            const val = tile.value;
            if (!counts[val]) counts[val] = {};
            const suit = tile.type;
            counts[val][suit] = (counts[val][suit] || 0) + 1;
        }
    });
    
    // 檢查是否有同數字三種花色的刻子 (每個花色 >=3)
    for (const val in counts) {
        let numSuitsWithPung = 0;
        for (const suit in counts[val]) {
            if (counts[val][suit] >= 3) {
                numSuitsWithPung++;
            }
        }
        if (numSuitsWithPung >= 3) {
            return true;
        }
    }
    
    return false;
}

// e. 小雜兄弟: 兩款不同而數子相連的刻子再加上第三款色不同相連對子(眼)
function isSmallMixedBrothers(allTiles) {
    const allPungs = [...state.pungs, ...state.openKongs, ...state.concealedKongs];
    const sequentialPungs = [];
    
    // 找出數值相連的刻子
    for (let i = 0; i < allPungs.length; i++) {
        for (let j = i + 1; j < allPungs.length; j++) {
            if (allPungs[i].type === allPungs[j].type && 
                Math.abs(allPungs[i].value - allPungs[j].value) === 1) {
                sequentialPungs.push(allPungs[i], allPungs[j]);
            }
        }
    }
    
    if (sequentialPungs.length < 2) return false;
    
    // 檢查是否有相連的對子
    const counts = {};
    allTiles.forEach(tile => {
        if (tile.type !== TILE_TYPES.HONORS && tile.type !== TILE_TYPES.FLOWERS) {
            const key = `${tile.type}-${tile.value}`;
            counts[key] = (counts[key] || 0) + 1;
        }
    });
    
    // 尋找與刻子相連的對子
    for (const key in counts) {
        if (counts[key] >= 2) {
            const [type, value] = key.split('-');
            const numValue = parseInt(value);
            
            // 檢查這個對子是否與刻子相連
            for (const pung of sequentialPungs) {
                if (pung.type !== type && Math.abs(pung.value - numValue) === 1) {
                    return true;
                }
            }
        }
    }
    
    return false;
}

// e2. 大雜兄弟: 三款不同而數子相連的刻子
function isBigMixedBrothers(allTiles) {
    const allPungs = [...state.pungs, ...state.openKongs, ...state.concealedKongs];
    const sequentialPungs = [];
    
    // 找出數值相連的刻子
    for (let i = 0; i < allPungs.length; i++) {
        for (let j = i + 1; j < allPungs.length; j++) {
            if (allPungs[i].type === allPungs[j].type && 
                Math.abs(allPungs[i].value - allPungs[j].value) === 1) {
                sequentialPungs.push(allPungs[i], allPungs[j]);
                
                // 檢查是否有第三個相連的刻子
                for (let k = j + 1; k < allPungs.length; k++) {
                    if (allPungs[i].type === allPungs[k].type && 
                        Math.abs(allPungs[i].value - allPungs[k].value) === 2) {
                        return true;
                    }
                }
            }
        }
    }
    
    return false;
}

// 5. 小三元: 有中發白其中兩款為刻子，一款為將牌
function isSmallThreeDragons(allTiles) {
    const dragonCounts = {
        '中': 0,
        '發': 0,
        '白': 0
    };
    
    // 統計中發白的數量
    allTiles.forEach(tile => {
        if (tile.type === TILE_TYPES.HONORS) {
            if (tile.value === 5) dragonCounts['中']++;
            if (tile.value === 6) dragonCounts['發']++;
            if (tile.value === 7) dragonCounts['白']++;
        }
    });
    
    // 檢查是否有兩款為刻子（3或4張），一款為將牌（2張）
    let pungCount = 0;
    let pairCount = 0;
    
    for (const dragon in dragonCounts) {
        const count = dragonCounts[dragon];
        if (count >= 3) pungCount++;
        else if (count === 2) pairCount++;
    }
    
    return pungCount === 2 && pairCount === 1;
}

// 6. 大三元: 有中發白三款均為刻子
function isBigThreeDragons(allTiles) {
    const dragonCounts = {
        '中': 0,
        '發': 0,
        '白': 0
    };
    
    // 統計中發白的數量
    allTiles.forEach(tile => {
        if (tile.type === TILE_TYPES.HONORS) {
            if (tile.value === 5) dragonCounts['中']++;
            if (tile.value === 6) dragonCounts['發']++;
            if (tile.value === 7) dragonCounts['白']++;
        }
    });
    
    // 檢查是否三款均為刻子（3或4張）
    return dragonCounts['中'] >= 3 && 
           dragonCounts['發'] >= 3 && 
           dragonCounts['白'] >= 3;
}

// 7. 小三風: 有東南西北其中三款為刻子或將牌
function isSmallThreeWinds(allTiles) {
    const windCounts = {
        '東': 0,
        '南': 0,
        '西': 0,
        '北': 0
    };
    
    // 統計東南西北的數量
    allTiles.forEach(tile => {
        if (tile.type === TILE_TYPES.HONORS) {
            if (tile.value === 1) windCounts['東']++;
            if (tile.value === 2) windCounts['南']++;
            if (tile.value === 3) windCounts['西']++;
            if (tile.value === 4) windCounts['北']++;
        }
    });
    
    // 檢查是否有三款為刻子（3或4張）或將牌（2張）
    let validCount = 0;
    
    for (const wind in windCounts) {
        const count = windCounts[wind];
        if (count >= 3 || count === 2) validCount++;
    }
    
    return validCount >= 3;
}

// 8. 大三風: 有東南西北其中三款為刻子
function isBigThreeWinds(allTiles) {
    const windCounts = {
        '東': 0,
        '南': 0,
        '西': 0,
        '北': 0
    };
    
    // 統計東南西北的數量
    allTiles.forEach(tile => {
        if (tile.type === TILE_TYPES.HONORS) {
            if (tile.value === 1) windCounts['東']++;
            if (tile.value === 2) windCounts['南']++;
            if (tile.value === 3) windCounts['西']++;
            if (tile.value === 4) windCounts['北']++;
        }
    });
    
    // 檢查是否有三款為刻子（3或4張）
    let pungCount = 0;
    
    for (const wind in windCounts) {
        const count = windCounts[wind];
        if (count >= 3) pungCount++;
    }
    
    return pungCount >= 3;
}

// 9. 小四喜: 有東南西北其中三款為刻子，一款為將牌
function isSmallFourWinds(allTiles) {
    const windCounts = {
        '東': 0,
        '南': 0,
        '西': 0,
        '北': 0
    };
    
    // 統計東南西北的數量
    allTiles.forEach(tile => {
        if (tile.type === TILE_TYPES.HONORS) {
            if (tile.value === 1) windCounts['東']++;
            if (tile.value === 2) windCounts['南']++;
            if (tile.value === 3) windCounts['西']++;
            if (tile.value === 4) windCounts['北']++;
        }
    });
    
    // 檢查是否有三款為刻子（3或4張），一款為將牌（2張）
    let pungCount = 0;
    let pairCount = 0;
    
    for (const wind in windCounts) {
        const count = windCounts[wind];
        if (count >= 3) pungCount++;
        else if (count === 2) pairCount++;
    }
    
    return pungCount === 3 && pairCount === 1;
}

// 10. 大四喜: 有東南西北四款均為刻子
function isBigFourWinds(allTiles) {
    const windCounts = {
        '東': 0,
        '南': 0,
        '西': 0,
        '北': 0
    };
    
    // 統計東南西北的數量
    allTiles.forEach(tile => {
        if (tile.type === TILE_TYPES.HONORS) {
            if (tile.value === 1) windCounts['東']++;
            if (tile.value === 2) windCounts['南']++;
            if (tile.value === 3) windCounts['西']++;
            if (tile.value === 4) windCounts['北']++;
        }
    });
    
    // 檢查是否四款均為刻子（3或4張）
    return windCounts['東'] >= 3 && 
           windCounts['南'] >= 3 && 
           windCounts['西'] >= 3 && 
           windCounts['北'] >= 3;
}

// 11. 字一色: 全部都是字牌
function isAllHonors(allTiles) {
    return allTiles.every(tile => tile.type === TILE_TYPES.HONORS);
}

// d. 獨獨: 食糊的必需是單吊/卡窿/偏章，而且不能變成叫多口的形狀
function isSingleWait(allTiles) {
    if (!state.winningTile) return false;
    
    // 如果是字牌，只能是單吊
    if (state.winningTile.type === TILE_TYPES.HONORS) {
        const count = allTiles.filter(t => 
            t.type === state.winningTile.type && t.value === state.winningTile.value
        ).length;
        return count === 2; // 單吊
    }
    
    // 檢查是否為邊張 (1或9)
    if (state.winningTile.value === 1 || state.winningTile.value === 9) {
        return true;
    }
    
    // 檢查是否為嵌張 (需要與前後兩張牌形成順子)
    const hasPrev = allTiles.some(t => 
        t.type === state.winningTile.type && t.value === state.winningTile.value - 1
    );
    const hasNext = allTiles.some(t => 
        t.type === state.winningTile.type && t.value === state.winningTile.value + 1
    );
    
    // 如果是嵌張，檢查是否只能叫這張牌
    if ((hasPrev && !hasNext) || (!hasPrev && hasNext)) {
        // 檢查是否有其他叫牌可能性
        const potentialWaits = findPotentialWaits(allTiles, state.winningTile);
        return potentialWaits.length === 1; // 只能叫這一張牌
    }
    
    return false;
}

// d2. 假獨: 食糊那隻可以變成叫多口，也可以是單吊/卡窿/偏章
function isFakeSingleWait(allTiles) {
    if (!state.winningTile) return false;
    
    // 檢查是否為邊張、嵌張或單吊，但不是真正的獨獨
    const winningValue = state.winningTile.value;
    const winningType = state.winningTile.type;
    
    // 如果是字牌，不可能是假獨
    if (winningType === TILE_TYPES.HONORS) {
        return false;
    }
    
    // 檢查是否為邊張 (1或9)
    if (winningValue === 1 || winningValue === 9) {
        // 檢查是否有其他叫牌可能性
        const potentialWaits = findPotentialWaits(allTiles, state.winningTile);
        return potentialWaits.length > 1; // 可以叫多口
    }
    
    // 檢查是否為嵌張 (需要與前後兩張牌形成順子)
    const hasPrev = allTiles.some(t => 
        t.type === winningType && t.value === winningValue - 1
    );
    const hasNext = allTiles.some(t => 
        t.type === winningType && t.value === winningValue + 1
    );
    
    if ((hasPrev && !hasNext) || (!hasPrev && hasNext)) {
        // 檢查是否有其他叫牌可能性
        const potentialWaits = findPotentialWaits(allTiles, state.winningTile);
        return potentialWaits.length > 1; // 可以叫多口
    }
    
    return false;
}

// 尋找可能的叫牌
function findPotentialWaits(allTiles, winningTile) {
    const waits = [];
    const winningValue = winningTile.value;
    const winningType = winningTile.type;
    
    // 如果是字牌，只能是單吊
    if (winningType === TILE_TYPES.HONORS) {
        return [winningValue];
    }
    
    // 檢查邊張
    if (winningValue === 1) {
        waits.push(1);
        if (allTiles.some(t => t.type === winningType && t.value === 2)) {
            waits.push(4);
        }
        if (allTiles.some(t => t.type === winningType && t.value === 3)) {
            waits.push(7);
        }
    } else if (winningValue === 9) {
        waits.push(9);
        if (allTiles.some(t => t.type === winningType && t.value === 8)) {
            waits.push(6);
        }
        if (allTiles.some(t => t.type === winningType && t.value === 7)) {
            waits.push(3);
        }
    } else {
        // 檢查嵌張和其他可能性
        waits.push(winningValue);
        
        // 檢查是否可以形成順子
        for (let i = Math.max(1, winningValue - 2); i <= Math.min(9, winningValue + 2); i++) {
            if (i === winningValue) continue;
            
            if (allTiles.some(t => t.type === winningType && t.value === i)) {
                waits.push(i);
            }
        }
    }
    
    return [...new Set(waits)]; // 去除重複
}

// e. 對碰: 食糊是對碰
function isPairWait(allTiles) {
    if (!state.winningTile) return false;
    
    const winningValue = state.winningTile.value;
    const winningType = state.winningTile.type;
    
    // 檢查是否有對子
    const pairCount = allTiles.filter(t => 
        t.type === winningType && t.value === winningValue
    ).length;
    
    return pairCount >= 2;
}

// f. 將眼: 將是數字牌而且是2/5/8
function is258Eye(allTiles) {
    // 找出將牌
    const counts = {};
    allTiles.forEach(tile => {
        const key = `${tile.type}-${tile.value}`;
        counts[key] = (counts[key] || 0) + 1;
    });
    
    // 尋找將牌 (一對)
    for (const key in counts) {
        if (counts[key] === 2) {
            const [type, value] = key.split('-');
            const numValue = parseInt(value);
            
            // 檢查是否為數字牌且是2/5/8
            if (type !== TILE_TYPES.HONORS && (numValue === 2 || numValue === 5 || numValue === 8)) {
                return true;
            }
        }
    }
    
    return false;
}

// g. 風牌: 有3隻或4隻東/南/西/北
function getWindPungs() {
    const winds = [];
    const allTiles = getAllTiles();
    
    // 檢查東南西北
    const windValues = {
        1: '東',
        2: '南',
        3: '西',
        4: '北'
    };
    
    for (let i = 1; i <= 4; i++) {
        const count = allTiles.filter(t => 
            t.type === TILE_TYPES.HONORS && t.value === i
        ).length;
        
        if (count >= 3) {
            winds.push(windValues[i]);
        }
    }
    
    return winds;
}

// g2. 風牌 (圈): 有3隻或4隻圈風的風牌
function getRoundWindPungs() {
    const winds = [];
    const allTiles = getAllTiles();
    
    // 將圈風轉換為數值
    const roundWindValue = {
        '東': 1,
        '南': 2,
        '西': 3,
        '北': 4
    }[state.roundWind];
    
    if (roundWindValue) {
        const count = allTiles.filter(t => 
            t.type === TILE_TYPES.HONORS && t.value === roundWindValue
        ).length;
        
        if (count >= 3) {
            winds.push(state.roundWind);
        }
    }
    
    return winds;
}

// g3. 風牌 (位): 有3隻或4隻門風的風牌
function getSeatWindPungs() {
    const winds = [];
    const allTiles = getAllTiles();
    
    // 將門風轉換為數值
    const seatWindValue = {
        '東': 1,
        '南': 2,
        '西': 3,
        '北': 4
    }[state.seatWind];
    
    if (seatWindValue) {
        const count = allTiles.filter(t => 
            t.type === TILE_TYPES.HONORS && t.value === seatWindValue
        ).length;
        
        if (count >= 3) {
            winds.push(state.seatWind);
        }
    }
    
    return winds;
}

// h. 元牌: 有3隻或4隻中發白
function getDragonPungs() {
    const dragons = [];
    const allTiles = getAllTiles();
    
    // 檢查中發白
    const dragonValues = {
        5: '中',
        6: '發',
        7: '白'
    };
    
    for (let i = 5; i <= 7; i++) {
        const count = allTiles.filter(t => 
            t.type === TILE_TYPES.HONORS && t.value === i
        ).length;
        
        if (count >= 3) {
            dragons.push(dragonValues[i]);
        }
    }
    
    return dragons;
}

function sortHandTypes(handTypes) {
    return handTypes.sort((a, b) => {
        // 先按 score 降序排序
        if (a.score !== b.score) {
            return a.score - b.score;
        }
        // score 相同時，按 name 升序排序
        return a.name.localeCompare(b.name);
    });
}