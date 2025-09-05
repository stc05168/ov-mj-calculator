// 檢測牌型
function detectHandTypes() {
    const handTypes = [];
    const allTiles = getAllTiles();
    
    // 優先檢查十三么（16張牌版本）
    if (isValidShiSanYao(allTiles)) {
        // 检查是否是独独
        if (isShiSanYaoDuDu(state.handTiles, state.winningTile)) {
            handTypes.push({ name: '十三么（獨獨）', score: 150 });
        } else {
            // 分析和牌前的听牌情况
            const waits = analyzeWaitsBeforeWinForShiSanYao(state.handTiles);
            
            if (waits.length > 1) {
                handTypes.push({ name: `十三么（${waits.length} 飛）`, score: 140 });
            } else {
                handTypes.push({ name: '十三么', score: 140 });
            }
        }
    }
    
    // 檢查十六不搭（16張牌）
    const shiLiuBuDaResult = isShiLiuBuDa(allTiles);
    if (shiLiuBuDaResult.isValid) {
        handTypes.push({ 
            name: shiLiuBuDaResult.isShiLiuFei ? '十六不搭 (十六飛) ' : '十六不搭', 
            score: shiLiuBuDaResult.isShiLiuFei ? 70 : 60 
        });

        // 檢查十六不搭獨獨
        if (isShiLiuBuDaDuDu(allTiles)) {
            handTypes.push({ name: '十六不搭獨獨', score: 2 });
        }
        
        // 檢查三相逢
        const sanXiangFengResult = isShiLiuBuDaSanXiangFeng(allTiles);
        if (sanXiangFengResult.isValid) {
            handTypes.push({ 
                name: sanXiangFengResult.isDark ? '十六不搭三相逢 (暗)' : '十六不搭三相逢 (明)', 
                score: sanXiangFengResult.isDark ? 20 : 10 
            });
        }

        // 檢查雜龍
        const zhaLongResult = isShiLiuBuDaZhaLong(allTiles);
        if (zhaLongResult.isValid) {
            handTypes.push({ 
                name: zhaLongResult.isDark ? '十六不搭雜龍 (暗)' : '十六不搭雜龍 (明)', 
                score: zhaLongResult.isDark ? 20 : 10 
            });
        }
    }

    // 新增：大於五
    if (isGreaterThanFive(allTiles)) {
        handTypes.push({ name: '大於五', score: 50 });
    }

    // 新增：小於五
    if (isLessThanFive(allTiles)) {
        handTypes.push({ name: '小於五', score: 50 });
    }

    // 新增：缺五
    if (isMissingFive(allTiles)) {
        handTypes.push({ name: '缺五', score: 10 });
    }

    // 新增：大七門（大）25番
    if (!shiLiuBuDaResult.isValid && !isShiSanYao(allTiles)) {
        if (isBigSevenDoors(allTiles)) {
            handTypes.push({ name: '七門齊（大）', score: 25 });
        } else if (isSmallSevenDoors(allTiles)) {
            handTypes.push({ name: '七門齊（小）', score: 20 });
        } else if (isBigFiveDoors(allTiles)) {
            handTypes.push({ name: '五門齊（大）', score: 15 });
        } else if (isSmallFiveDoors(allTiles)) {
            handTypes.push({ name: '五門齊（小）', score: 10 });
        }
    }
    
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
    
    // 新增龍牌型檢測
    if (!shiLiuBuDaResult.isValid) {
        const dragonResults = detectDragonHandTypes(allTiles);
        dragonResults.forEach(result => {
            handTypes.push(result);
        });        
    }
    
    // 新增么九相關牌型檢測（優先檢查高番數的）
    const yaojiuResults = detectYaojiuHandTypes(allTiles);
    yaojiuResults.forEach(result => {
        handTypes.push(result);
    });
    
    // 新增四歸一相關牌型檢測
    const siguiResults = detectSiguiHandTypes(allTiles);
    siguiResults.forEach(result => {
        handTypes.push(result);
    });
    
    // 新增全帶X相關牌型檢測
    const quanDaiXResults = detectQuanDaiXHandTypes(allTiles);
    quanDaiXResults.forEach(result => {
        handTypes.push(result);
    });
    
    // 檢查基本牌型
    // 檢查門前清 (沒有吃、碰和槓)
    if (!shiLiuBuDaResult.isValid && !isShiSanYao(allTiles) && state.chows.length === 0 && state.pungs.length === 0) {
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
        handTypes.push({ name: '平糊', score: 5 });
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

    // 4. 檢查嚦咕嚦咕（七對子 + 1組刻子）
    if (isLiguligu(allTiles)) {
        results.push({ name: '嚦咕嚦咕', score: 50 });
    }
    
    // 為了避免假獨和對碰同時出現，將獨獨/假獨檢查放在對碰為false時
    if (!isShiSanYao(allTiles) && !isShiLiuBuDa(allTiles)) {
        const isPair = isPairWait(allTiles);
    
        // 先检查是否是真正的独独
        if (isSingleWait(allTiles)) {
            handTypes.push({ name: '獨獨', score: 2 });
        }
        // 如果不是独独，再检查是否是假独
        else if (!isPair && isFakeSingleWait(allTiles)) {
            handTypes.push({ name: '假獨', score: 1 });
        }
        
        // e. 對碰
        if (isPair) {
            handTypes.push({ name: '對碰', score: 2 });
        }
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

function isValidShiSanYao(allTiles) {
    if (allTiles.length !== 17) return false;
    
    // 检查基础13张牌是否齐全
    const requiredTiles = [
        { type: TILE_TYPES.CHARACTERS, value: 1 }, // 1万
        { type: TILE_TYPES.CHARACTERS, value: 9 }, // 9万
        { type: TILE_TYPES.DOTS, value: 1 },       // 1筒
        { type: TILE_TYPES.DOTS, value: 9 },       // 9筒
        { type: TILE_TYPES.BAMBOOS, value: 1 },    // 1索
        { type: TILE_TYPES.BAMBOOS, value: 9 },    // 9索
        { type: TILE_TYPES.HONORS, value: 1 },     // 东
        { type: TILE_TYPES.HONORS, value: 2 },     // 南
        { type: TILE_TYPES.HONORS, value: 3 },     // 西
        { type: TILE_TYPES.HONORS, value: 4 },     // 北
        { type: TILE_TYPES.HONORS, value: 5 },     // 中
        { type: TILE_TYPES.HONORS, value: 6 },     // 发
        { type: TILE_TYPES.HONORS, value: 7 }      // 白
    ];
    
    // 统计每种牌的数量
    const tileCounts = {};
    allTiles.forEach(tile => {
        const key = `${tile.type}-${tile.value}`;
        tileCounts[key] = (tileCounts[key] || 0) + 1;
    });
    
    // 检查基础13张牌是否齐全（每种至少一张）
    for (const reqTile of requiredTiles) {
        const key = `${reqTile.type}-${reqTile.value}`;
        if (!tileCounts[key] || tileCounts[key] < 1) {
            return false; // 缺少必要牌
        }
    }
    
    // 检查是否有且仅有一对将眼
    let pairCount = 0;
    for (const reqTile of requiredTiles) {
        const key = `${reqTile.type}-${reqTile.value}`;
        if (tileCounts[key] == 2) {
            pairCount++;
        }
    }
    
    // 十三么必须有一对将眼
    if (pairCount !== 1) return false;
    
    // 检查额外牌是否形成顺子或刻子
    const extraTiles = allTiles.filter(tile => {
        return !requiredTiles.some(reqTile => 
            reqTile.type === tile.type && reqTile.value === tile.value
        );
    });
    
    // 如果没有额外牌，检查是否有四张相同的牌
    if (extraTiles.length === 0) {
        // 检查是否有四张相同的牌（四归一）
        for (const key in tileCounts) {
            if (tileCounts[key] === 4) {
                return true;
            }
        }
        return false;
    }
    
    // 额外牌必须是3张，且能形成顺子或刻子
    if (extraTiles.length !== 3) return false;
    
    // 检查是否形成刻子
    const firstTile = extraTiles[0];
    const isPung = extraTiles.every(tile => 
        tile.type === firstTile.type && tile.value === firstTile.value
    );
    
    // 检查是否形成顺子
    const values = extraTiles.map(tile => tile.value).sort((a, b) => a - b);
    const isChow = values[1] === values[0] + 1 && values[2] === values[1] + 1;
    
    return isPung || isChow;
}

function analyzeWaitsBeforeWinForShiSanYao(handTiles) {
    const waits = [];
    
    // 检查手牌是否接近和牌（16张牌）
    if (handTiles.length !== 16) return waits;
    
    // 尝试每种可能的和牌
    const allPossibleTiles = [];
    
    // 添加所有可能的牌（19万19筒19索东南西北中发白）
    for (const type of [TILE_TYPES.CHARACTERS, TILE_TYPES.DOTS, TILE_TYPES.BAMBOOS]) {
        allPossibleTiles.push({ type, value: 1 });
        allPossibleTiles.push({ type, value: 9 });
    }
    
    for (let value = 1; value <= 7; value++) {
        allPossibleTiles.push({ type: TILE_TYPES.HONORS, value });
    }
    
    // 检查额外牌型可能需要的牌
    const requiredTiles = [
        { type: TILE_TYPES.CHARACTERS, value: 1 },
        { type: TILE_TYPES.CHARACTERS, value: 9 },
        { type: TILE_TYPES.DOTS, value: 1 },
        { type: TILE_TYPES.DOTS, value: 9 },
        { type: TILE_TYPES.BAMBOOS, value: 1 },
        { type: TILE_TYPES.BAMBOOS, value: 9 },
        { type: TILE_TYPES.HONORS, value: 1 },
        { type: TILE_TYPES.HONORS, value: 2 },
        { type: TILE_TYPES.HONORS, value: 3 },
        { type: TILE_TYPES.HONORS, value: 4 },
        { type: TILE_TYPES.HONORS, value: 5 },
        { type: TILE_TYPES.HONORS, value: 6 },
        { type: TILE_TYPES.HONORS, value: 7 }
    ];
    
    // 找出额外牌
    const extraTiles = handTiles.filter(tile => {
        return !requiredTiles.some(reqTile => 
            reqTile.type === tile.type && reqTile.value === tile.value
        );
    });
    
    // 如果额外牌是顺子的一部分，添加顺子可能需要的牌
    if (extraTiles.length > 0) {
        const firstTile = extraTiles[0];
        
        // 检查是否可能形成顺子
        if (extraTiles.every(tile => tile.type === firstTile.type)) {
            const values = extraTiles.map(tile => tile.value).sort((a, b) => a - b);
            
            // 检查是否是不完整的顺子
            if (values.length === 2) {
                const diff = values[1] - values[0];
                
                // 中洞（如35听4）
                if (diff === 2) {
                    allPossibleTiles.push({ type: firstTile.type, value: values[0] + 1 });
                }
                // 边张（如12听3，89听7）
                else if (diff === 1) {
                    if (values[0] > 1) {
                        allPossibleTiles.push({ type: firstTile.type, value: values[0] - 1 });
                    }
                    if (values[1] < 9) {
                        allPossibleTiles.push({ type: firstTile.type, value: values[1] + 1 });
                    }
                }
            }
            // 检查是否是三张牌但需要形成顺子或刻子
            else if (values.length === 3) {
                // 已经是完整的顺子或刻子，不需要额外牌
            }
        }
    }
    
    // 检查每张可能的牌是否能使手牌和牌
    for (const tile of allPossibleTiles) {
        const testHand = [...handTiles, tile];
        if (isValidShiSanYao(testHand)) {
            // 检查这张牌是否已经在waits中
            const alreadyExists = waits.some(w => 
                w.type === tile.type && w.value === tile.value
            );
            
            if (!alreadyExists) {
                waits.push(tile);
            }
        }
    }
    
    return waits;
}
// 新增龍牌型檢測函數
function detectDragonHandTypes(allTiles) {
    const results = [];
    
    // 檢查清龍（可以多個花色同時有清龍）
    const qingLongResults = detectQingLong(allTiles);
    results.push(...qingLongResults);
    
    // 檢查雜龍（與清龍可以同時存在）
    const zhaLongResults = detectZhaLong(allTiles);
    results.push(...zhaLongResults);
    
    return results;
}


// 檢測清龍（每個花色獨立檢測）
function detectQingLong(allTiles) {
    const results = [];
    const numberTiles = allTiles.filter(tile => tile.type !== TILE_TYPES.HONORS && tile.type !== TILE_TYPES.FLOWERS);

    // 按花色分組並統計手牌中的牌數
    const suits = {};
    numberTiles.forEach(tile => {
        if (!suits[tile.type]) {
            suits[tile.type] = {};
        }
        suits[tile.type][tile.value] = (suits[tile.type][tile.value] || 0) + 1;
    });

    // 檢查每個花色的清龍
    for (const suit in suits) {
        const tileCounts = { ...suits[suit] };
        let qingLongCount = 0;

        // 計算手牌中的 123 和 789 順子數量
        let handChow123Count = Math.min(
            tileCounts[1] || 0,
            tileCounts[2] || 0,
            tileCounts[3] || 0
        );
        let handChow789Count = Math.min(
            tileCounts[7] || 0,
            tileCounts[8] || 0,
            tileCounts[9] || 0
        );
        const has456 = [4, 5, 6].every(i => tileCounts[i] >= 1);

        // 檢查副露的順子（來自 state.chows）
        let exposedChow123Count = 0;
        let exposedChow789Count = 0;

        if (state.chows && state.chows.length > 0) {
            exposedChow123Count = state.chows.filter(chow => 
                chow.type === suit && 
                chow.tiles.every(tile => tile.value === 1 || tile.value === 2 || tile.value === 3)
            ).length;
            exposedChow789Count = state.chows.filter(chow => 
                chow.type === suit && 
                chow.tiles.every(tile => tile.value === 7 || tile.value === 8 || tile.value === 9)
            ).length;
        }

        //allTiles 包括了exposedChow
        handChow123Count = handChow123Count - exposedChow123Count;
        handChow789Count = handChow789Count - exposedChow789Count;

        if (has456) {
            // 總清龍數量為所有可能的 123 和 789 組合
            // 手牌的 123 和 789 組合
            const handQingLongCount = handChow123Count * handChow789Count;
            // 副露的 123 和手牌的 789 組合
            const exposed123QingLongCount = exposedChow123Count * handChow789Count;
            // 手牌的 123 和副露的 789 組合
            const exposed789QingLongCount = handChow123Count * exposedChow789Count;
            // 副露的 123 和副露的 789 組合
            const exposedBothQingLongCount = exposedChow123Count * exposedChow789Count;

            // 總清龍數量
            qingLongCount = handQingLongCount + exposed123QingLongCount + exposed789QingLongCount + exposedBothQingLongCount;

            if (qingLongCount > 0) {
                const isMenQianQing = state.chows.length === 0 && state.pungs.length === 0 && state.openKongs.length === 0;
    
                // 分配明清龍和暗清龍
                let mingQingLongCount = 0;
                let anQingLongCount = 0;
    
                if (isMenQianQing) {
                    // 完全門前清，所有清龍為暗清龍
                    anQingLongCount = qingLongCount;
                } else {
                    // 明清龍：包含副露的 123 或 789
                    mingQingLongCount = exposed123QingLongCount + exposed789QingLongCount + exposedBothQingLongCount;
                    // 暗清龍：僅來自手牌的 123 和 789
                    anQingLongCount = handQingLongCount;
                }
    
                // 添加明清龍
                for (let i = 0; i < mingQingLongCount; i++) {
                    results.push({ name: `明清龍(${suit})`, score: 10 });
                }
                // 添加暗清龍
                for (let i = 0; i < anQingLongCount; i++) {
                    results.push({ name: `暗清龍(${suit})`, score: 20 });
                }
            }
        }
    }

    return results;
}

// 修改 detectZhaLong 函数
function detectZhaLong(allTiles) {
    const results = [];
    const numberTiles = allTiles.filter(tile => 
        tile.type !== TILE_TYPES.HONORS && tile.type !== TILE_TYPES.FLOWERS
    );

    // Group tiles by suit
    const tilesBySuit = {};
    [TILE_TYPES.CHARACTERS, TILE_TYPES.DOTS, TILE_TYPES.BAMBOOS].forEach(suit => {
        tilesBySuit[suit] = numberTiles.filter(tile => tile.type === suit)
            .map(tile => tile.value)
            .sort((a, b) => a - b);
    });

    // Get chows from state
    const chowsBySuit = {};
    state.chows.forEach(chow => {
        if (!chowsBySuit[chow.type]) {
            chowsBySuit[chow.type] = [];
        }
        chowsBySuit[chow.type].push(chow.tiles.map(tile => tile.value).sort((a, b) => a - b));
    });

    // Count occurrences of 123, 456, 789 in each suit
    const setsBySuit = {};
    [TILE_TYPES.CHARACTERS, TILE_TYPES.DOTS, TILE_TYPES.BAMBOOS].forEach(suit => {
        setsBySuit[suit] = { '123': 0, '456': 0, '789': 0, chowCounts: { '123': 0, '456': 0, '789': 0 } };
        const values = tilesBySuit[suit];
        const valueCounts = {};
        values.forEach(v => {
            valueCounts[v] = (valueCounts[v] || 0) + 1;
        });

        const max123 = Math.min(valueCounts[1] || 0, valueCounts[2] || 0, valueCounts[3] || 0);
        const max456 = Math.min(valueCounts[4] || 0, valueCounts[5] || 0, valueCounts[6] || 0);
        const max789 = Math.min(valueCounts[7] || 0, valueCounts[8] || 0, valueCounts[9] || 0);
        setsBySuit[suit]['123'] = max123;
        setsBySuit[suit]['456'] = max456;
        setsBySuit[suit]['789'] = max789;

        const chows = chowsBySuit[suit] || [];
        chows.forEach(chowValues => {
            if (chowValues.join(',') === '1,2,3') setsBySuit[suit].chowCounts['123']++;
            else if (chowValues.join(',') === '4,5,6') setsBySuit[suit].chowCounts['456']++;
            else if (chowValues.join(',') === '7,8,9') setsBySuit[suit].chowCounts['789']++;
        });
    });

    // Find all possible Zha Long combinations
    const allCombinations = [];
    
    // Generate all possible combinations of 123, 456, 789 across different suits
    const setTypes = ['123', '456', '789'];
    const suits = [TILE_TYPES.CHARACTERS, TILE_TYPES.DOTS, TILE_TYPES.BAMBOOS];
    
    // Get all permutations of suits
    const suitPermutations = getPermutations(suits);
    
    // For each permutation of suits, try to assign 123, 456, 789
    for (const suitPerm of suitPermutations) {
        for (const setPerm of getPermutations(setTypes)) {
            let isValid = true;
            let isDark = true;
            const usedSets = [];
            
            for (let i = 0; i < 3; i++) {
                const suit = suitPerm[i];
                const setType = setPerm[i];
                
                if (setsBySuit[suit][setType] <= 0) {
                    isValid = false;
                    break;
                }
                
                // Check if this set is exposed (not dark)
                if (setsBySuit[suit].chowCounts[setType] > 0) {
                    isDark = false;
                }
                
                usedSets.push({ suit, type: setType });
            }
            
            if (isValid) {
                allCombinations.push({ isValid, isDark, usedSets });
            }
        }
    }
    
    // Remove duplicates and count occurrences
    const uniqueCombinations = [];
    const combinationKeys = new Set();
    
    for (const combo of allCombinations) {
        const key = combo.usedSets.map(set => `${set.suit}-${set.type}`).sort().join('|');
        if (!combinationKeys.has(key)) {
            combinationKeys.add(key);
            uniqueCombinations.push(combo);
        }
    }
    
    // For each unique combination, add it to results as many times as it appears
    for (const combo of uniqueCombinations) {
        // Find the minimum count across all sets in this combination
        let minCount = Infinity;
        for (const set of combo.usedSets) {
            const count = setsBySuit[set.suit][set.type];
            if (count < minCount) {
                minCount = count;
            }
        }
        
        // Add the combination multiple times based on availability
        for (let i = 0; i < minCount; i++) {
            results.push({ ...combo });
        }
    }
    
    const returns = [];
    for (const data of results) {
        if (!data.isDark) {
            returns.push({ name: '明雜龍', score: 5 });
        }else {
            returns.push({ name: '暗雜龍', score: 10 });
        }
    }
    return returns;
}

// Helper function to get all permutations of an array
function getPermutations(array) {
    const result = [];
    
    function permute(arr, m = []) {
        if (arr.length === 0) {
            result.push(m);
        } else {
            for (let i = 0; i < arr.length; i++) {
                const curr = arr.slice();
                const next = curr.splice(i, 1);
                permute(curr.slice(), m.concat(next));
            }
        }
    }
    
    permute(array);
    return result;
}

// 新增四歸一相關牌型檢測函數
function detectSiguiHandTypes(allTiles) {
    const results = [];
    const tileCounts = {};
    
    // 統計每種牌的數量
    allTiles.forEach(tile => {
        const key = `${tile.type}-${tile.value}`;
        tileCounts[key] = (tileCounts[key] || 0) + 1;
    });
    
    // 檢查四歸一、四歸二、四歸四
    for (const key in tileCounts) {
        if (tileCounts[key] === 4) {
            const [type, value] = key.split('-');
            
            // 檢查四歸四（順子中使用四張相同的牌）
            if (isSiguiSi(allTiles, type, parseInt(value))) {
                results.push({ name: '四歸四', score: 20 });
            } 
            // 檢查四歸二（兩隻做眼）
            else if (isSiguiEr(allTiles, type, parseInt(value))) {
                results.push({ name: '四歸二', score: 10 });
            }
            // 四歸一
            else {
                results.push({ name: '四歸一', score: 5 });
            }
        }
    }
    
    return results;
}

// 檢查四歸四（順子中使用四張相同的牌）
function isSiguiSi(allTiles, type, value) {
    // 檢查這張牌是否在順子中使用
    const allChows = getAllChows(allTiles);
    
    for (const chow of allChows) {
        if (chow.type === type && chow.values.includes(value)) {
            // 檢查這個順子中是否使用了四張相同的牌
            const countInChow = allTiles.filter(t => 
                t.type === type && t.value === value && 
                isTileInChow(t, chow)
            ).length;
            
            if (countInChow === 4) {
                return true;
            }
        }
    }
    
    return false;
}

// 檢查四歸二（兩隻做眼）
function isSiguiEr(allTiles, type, value) {
    const eye = findEye(allTiles);
    return eye && eye.type === type && eye.value === value;
}

// 檢查牌是否在順子中
function isTileInChow(tile, chow) {
    return chow.type === tile.type && chow.values.includes(tile.value);
}

// 新增全帶X相關牌型檢測函數
function detectQuanDaiXHandTypes(allTiles) {
    const results = [];
        
    // 檢查純全帶X
    const chunQuanDaiX = detectChunQuanDaiX(allTiles);
    if (chunQuanDaiX) {
        results.push({ name: `純全帶${chunQuanDaiX}`, score: 80 });
        return results; // 純全帶X與混全帶X互斥
    }

    // 檢查混全帶X
    const hunQuanDaiX = detectHunQuanDaiX(allTiles);
    if (hunQuanDaiX && Array.isArray(hunQuanDaiX.numbers) && hunQuanDaiX.numbers.length > 0) {
        const { numbers, score } = hunQuanDaiX;
        if (numbers.length === 1) {
            results.push({ name: `混全帶${numbers[0]}`, score: 30 });
        } else if (numbers.length === 2) {
            results.push({ name: `混全帶${numbers.join('')}`, score: 50 });
        } else if (numbers.length === 3) {
            results.push({ name: `混全帶${numbers.join('')}`, score: 60 });
        }
    }

    return results;
}

// 檢查純全帶X（全副牌每一組合都有X，無番子）
function detectChunQuanDaiX(allTiles) {
    // 先檢查是否有番子
    if (allTiles.some(tile => tile.type === TILE_TYPES.HONORS)) return null;
    
    const targetNumbers = findCommonNumbersInAllCombinations(allTiles);
    // 確保確實每個組合都包含這個數字
    if (targetNumbers != undefined && targetNumbers != null && targetNumbers.length === 1 && isAllCombinationsContainNumber(allTiles, targetNumbers[0])) {
        return targetNumbers[0];
    }
    return null;
}

// 檢查混全帶X（全副牌每一組合都有X或番子）
function detectHunQuanDaiX(allTiles) {
    const targetNumbers = findCommonNumbersInAllCombinations(allTiles);
    if (Array.isArray(targetNumbers) && targetNumbers.length > 0) {
        if (isAllCombinationsContainNumbersOrHonors(allTiles, targetNumbers)) {
            return {
                numbers: targetNumbers,
                score: targetNumbers.length === 1 ? 30 : targetNumbers.length === 2 ? 50 : 60
            };
        }
    }
    
    return null;
}

// 找出所有組合中都包含的數字
function findCommonNumbersInAllCombinations(allTiles) {
    // 獲取所有組合：順子、刻子、槓
    const allMelds = [
        ...state.chows.map(chow => ({
            type: chow.type,
            values: chow.tiles.map(tile => tile.value).sort((a, b) => a - b)
        })),
        ...state.pungs.map(pung => ({
            type: pung.type,
            value: pung.value
        })),
        ...state.openKongs.map(kong => ({
            type: kong.type,
            value: kong.value
        })),
        ...state.concealedKongs.map(kong => ({
            type: kong.type,
            value: kong.value
        })),
        ...getAllPungs(allTiles),
        ...getAllChows(allTiles).filter(chow => !state.chows.some(schow => 
            schow.type === chow.type && 
            schow.tiles.map(tile => tile.value).sort().join() === chow.values.sort().join()
        ))
    ];

    const eye = findEye(allTiles);
    
    // 如果組合數不足，無法形成混全帶
    if (allMelds.length < 4) return []; // 需要至少4組組合（不包括將眼）

    // 收集所有數牌組合中的數字
    let candidateNumbers = null;
    for (const meld of allMelds) {
        if (meld.type !== TILE_TYPES.HONORS) { // 只考慮數牌
            const numbers = getNumbersFromMeld(meld);
            if (numbers.length > 0) {
                if (candidateNumbers === null) {
                    candidateNumbers = new Set(numbers);
                } else {
                    candidateNumbers = new Set(
                        [...candidateNumbers].filter(num => numbers.includes(num))
                    );
                }
            }
        }
        if (candidateNumbers && candidateNumbers.size === 0) {
            return [];
        }
    }

    // 如果沒有找到任何數牌組合的共同數字，返回空
    if (!candidateNumbers || candidateNumbers.size === 0) {
        return [];
    }

    // 檢查將眼是否包含候選數字（如果將眼是數牌）
    if (eye && eye.type !== TILE_TYPES.HONORS) {
        if (!candidateNumbers.has(eye.value)) {
            return [];
        }
    }

    // 返回最多3個共同數字（混全帶123）
    const result = [...candidateNumbers].sort((a, b) => a - b);
    return result.slice(0, 3); // 最多取123
}

// 從組合中獲取數字
function getNumbersFromMeld(meld) {
    if (!meld) return [];
    if (meld.type === TILE_TYPES.HONORS) {
        return []; // 字牌不返回數字
    }
    if (meld.values) {
        // 順子：返回所有數字
        return [...new Set(meld.values)];
    }
    // 刻子或將眼：返回單個數字
    return [meld.value];
}

// 新增么九相關牌型檢測函數
function detectYaojiuHandTypes(allTiles) {
    const results = [];
    
    // 1. 檢查樓梯（五款漸進式順子）
    if (isLouTi(allTiles)) {
        results.push({ name: '樓梯', score: 30 });
    }
    
    // 檢查老少上（允許重複計數）
    const laoShaoShangCount = countLaoShaoShang(allTiles);
    if (laoShaoShangCount > 0) {
        results.push({ name: `老少上x${laoShaoShangCount}`, score: 3 * laoShaoShangCount });
    }
    
    // 檢查老少碰（允許重複計數）
    const laoShaoPengCount = countLaoShaoPeng(allTiles);
    if (laoShaoPengCount > 0) {
        results.push({ name: `老少碰x${laoShaoPengCount}`, score: 5 * laoShaoPengCount });
    }
    
    // 5. 檢查斷么（優先檢查，因為其他么九牌型會排除這個）
    if (isDuanYao(allTiles)) {
        results.push({ name: '斷么', score: 5 });
    }
    
    // 6. 檢查清么碰（清老頭）
    if (isQingYaoPeng(allTiles)) {
        results.push({ name: '清么碰', score: 200 });
    }else if (isHunYaoPeng(allTiles)) {
        results.push({ name: '混么碰', score: 60 });
    }else if (isChunQuanDaiYaoJiu(allTiles)) {
        results.push({ name: '純全帶么九', score: 80 });
    }else if (isHunQuanDaiYaoJiu(allTiles)) {
        results.push({ name: '混全帶么九', score: 40 });
    }
    
    return results;
}

// 1. 檢查樓梯（五款漸進式順子）
function isLouTi(allTiles) {
    const allChows = getAllChows(allTiles);
    if (allChows.length < 5) return false;
    
    // 按起始數值排序所有順子
    const sortedChows = [...allChows].sort((a, b) => a.startValue - b.startValue);
    
    // 檢查是否有連續5個漸進式順子
    for (let i = 0; i < sortedChows.length - 4; i++) {
        if (sortedChows[i].startValue + 1 === sortedChows[i + 1].startValue &&
            sortedChows[i + 1].startValue + 1 === sortedChows[i + 2].startValue &&
            sortedChows[i + 2].startValue + 1 === sortedChows[i + 3].startValue &&
            sortedChows[i + 3].startValue + 1 === sortedChows[i + 4].startValue) {
            return true;
        }
    }
    
    return false;
}

// 2. 檢查老少上（同一款式 一,二,三及七,八,九）
function isLaoShaoShang(allTiles) {
    // 先檢查是否有清龍，如果有清龍就不計算老少上
    const qingLongResults = detectQingLong(allTiles);
    if (qingLongResults.length > 0) {
        return false;
    }
    
    const allChows = getAllChows(allTiles);
    const chowGroups = {};
    
    // 按花色分組順子
    allChows.forEach(chow => {
        if (!chowGroups[chow.type]) {
            chowGroups[chow.type] = [];
        }
        chowGroups[chow.type].push(chow.startValue);
    });
    
    // 檢查每個花色是否有123和789順子
    for (const suit in chowGroups) {
        const has123 = chowGroups[suit].includes(1);
        const has789 = chowGroups[suit].includes(7);
        
        if (has123 && has789) {
            return true;
        }
    }
    
    return false;
}

// 3. 檢查老少碰（同一款式一,一,一及九,九,九）
function isLaoShaoPeng(allTiles) {
    const allPungs = getAllPungs(allTiles);
    const pungGroups = {};
    
    // 按花色分組刻子
    allPungs.forEach(pung => {
        if (!pungGroups[pung.type]) {
            pungGroups[pung.type] = [];
        }
        pungGroups[pung.type].push(pung.value);
    });
    
    // 檢查每個花色是否有1和9刻子
    for (const suit in pungGroups) {
        const has1 = pungGroups[suit].includes(1);
        const has9 = pungGroups[suit].includes(9);
        
        if (has1 && has9) {
            return true;
        }
    }
    
    return false;
}

// 4. 檢查嚦咕嚦咕（七對子 + 1組刻子）
function isLiguligu(allTiles) {
    // 檢查是否為七對子
    if (!isEightPairs(allTiles)) return false;
    
    // 檢查是否有至少一組刻子
    const allPungs = getAllPungs(allTiles);
    return allPungs.length >= 1;
}

// 檢查是否為七對子
function isEightPairs(allTiles) {
    if (allTiles.length !== 16) return false;
    
    const counts = {};
    allTiles.forEach(tile => {
        const key = `${tile.type}-${tile.value}`;
        counts[key] = (counts[key] || 0) + 1;
    });
    
    let pairCount = 0;
    for (const key in counts) {
        if (counts[key] === 2) {
            pairCount++;
        } else if (counts[key] === 4) {
            pairCount += 2; // 四張相同算兩對
        } else {
            return false; // 有不是2或4張的牌
        }
    }
    
    return pairCount === 7;
}

// 5. 檢查斷么（全副牌沒有么九及番子）
function isDuanYao(allTiles) {
    return allTiles.every(tile => {
        if (tile.type === TILE_TYPES.HONORS) return false; // 有番子
        if (tile.value === 1 || tile.value === 9) return false; // 有么九
        return true;
    });
}

// 6. 檢查純全帶么九（全副牌每一組合都有么九，無番子）
function isChunQuanDaiYaoJiu(allTiles) {
    // 先檢查是否有字牌
    if (allTiles.some(tile => tile.type === TILE_TYPES.HONORS)) return false;

    // 複製牌組以便操作
    const tiles = [...allTiles];

    // 嘗試找到將眼（一對）
    for (let i = 0; i < tiles.length; i++) {
        for (let j = i + 1; j < tiles.length; j++) {
            if (tiles[i].type === tiles[j].type && tiles[i].value === tiles[j].value) {
                // 將眼必須是1或9
                if (tiles[i].value !== 1 && tiles[i].value !== 9) continue;

                // 移除將眼後檢查剩餘牌是否能組成順子或刻子，且每組包含么九
                const remainingTiles = tiles.filter((_, index) => index !== i && index !== j);
                if (canFormValidMeldsForChunQuanDaiYaoJiu(remainingTiles)) {
                    return true;
                }
            }
        }
    }

    return false;
}

// 7. 檢查混全帶么九（全副牌每一組合都有么九或番子）
function isHunQuanDaiYaoJiu(allTiles) {
    const allMelds = [
        ...state.chows.map(chow => ({
            type: chow.type,
            values: chow.tiles.map(tile => tile.value).sort((a, b) => a - b)
        })),
        ...state.pungs.map(pung => ({
            type: pung.type,
            value: pung.value
        })),
        ...state.openKongs.map(kong => ({
            type: kong.type,
            value: kong.value
        })),
        ...state.concealedKongs.map(kong => ({
            type: kong.type,
            value: kong.value
        })),
        ...getAllPungs(allTiles),
        ...getAllChows(allTiles).filter(chow => !state.chows.some(schow => 
            schow.type === chow.type && 
            schow.tiles.map(tile => tile.value).sort().join() === chow.values.sort().join()
        ))
    ];
    const eye = findEye(allTiles);
    
    // 如果沒有組合，直接返回false
    if (allMelds.length === 0) return false;
    
    // 檢查每個組合是否包含么九或番子
    for (const meld of allMelds) {
        let containsYaoJiuOrHonor = false;
        
        if (meld.type === TILE_TYPES.HONORS) {
            containsYaoJiuOrHonor = true; // 番子組合
        } else if (meld.values) {
            // 順子：必須包含1或9
            containsYaoJiuOrHonor = meld.values.includes(1) || meld.values.includes(9);
        } else {
            // 刻子：必須是1或9
            containsYaoJiuOrHonor = meld.value === 1 || meld.value === 9;
        }
        
        if (!containsYaoJiuOrHonor) return false;
    }
    
    // 檢查將眼是否為么九或番子
    if (eye) {
        const isYaoJiuOrHonorEye = eye.type === TILE_TYPES.HONORS || eye.value === 1 || eye.value === 9;
        if (!isYaoJiuOrHonorEye) return false;
    }
    
    return true;
}

// 檢查所有組合是否都包含么九或番子
function isAllCombinationsContainYaoJiu(allTiles) {   
    const allMelds = [
        ...state.chows.map(chow => ({
            type: chow.type,
            values: chow.tiles.map(tile => tile.value).sort((a, b) => a - b)
        })),
        ...state.pungs.map(pung => ({
            type: pung.type,
            value: pung.value
        })),
        ...state.openKongs.map(kong => ({
            type: kong.type,
            value: kong.value
        })),
        ...state.concealedKongs.map(kong => ({
            type: kong.type,
            value: kong.value
        })),
        ...getAllPungs(allTiles),
        ...getAllChows(allTiles).filter(chow => !state.chows.some(schow => 
            schow.type === chow.type && 
            schow.tiles.map(tile => tile.value).sort().join() === chow.values.sort().join()
        ))
    ];
    const eye = findEye(allTiles);
    
    // 檢查每個組合是否包含么九或番子
    for (const meld of allMelds) {
        let containsYaoJiu = false;
        
        if (meld.type === TILE_TYPES.HONORS) {
            containsYaoJiu = false;
        } else if (meld.values) {
            // 順子
            containsYaoJiu = meld.values.includes(1) || meld.values.includes(9);
        } else {
            // 刻子
            containsYaoJiu = meld.value === 1 || meld.value === 9;
        }
        
        if (!containsYaoJiu) return false;
    }
    
    // 檢查將眼是否為么九
    if (eye) {
        const isYaoJiuEye = eye.value === 1 || eye.value === 9;
        if (!isYaoJiuEye) return false;
    }
    
    return true;
}

// 8. 檢查混么碰（混老頭）
function isHunYaoPeng(allTiles) {
    return allTiles.every(tile => {
        if (tile.type === TILE_TYPES.HONORS) return true; // 番子
        return tile.value === 1 || tile.value === 9; // 么九
    });
}

// 9. 檢查清么碰（清老頭）
function isQingYaoPeng(allTiles) {
    // 不能有番子
    if (allTiles.some(tile => tile.type === TILE_TYPES.HONORS)) return false;
    
    // 所有牌都是么九
    return allTiles.every(tile => tile.value === 1 || tile.value === 9);
}

// 輔助函數：找出將眼
function findEye(allTiles) {
    const counts = {};
    allTiles.forEach(tile => {
        const key = `${tile.type}-${tile.value}`;
        counts[key] = (counts[key] || 0) + 1;
    });
    
    for (const key in counts) {
        if (counts[key] === 2) {
            const [type, value] = key.split('-');
            return { type, value: parseInt(value) };
        }
    }
    
    return null;
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
    
    // 添加玩家標記的順子
    state.chows.forEach(chow => {
        chows.push({
            type: chow.type,
            values: chow.tiles.map(tile => tile.value).sort((a, b) => a - b),
            startValue: Math.min(...chow.tiles.map(tile => tile.value))
        });
    });

    // 從手牌中找出順子（排除已標記的牌）
    const handTiles = allTiles.filter(tile => 
        !state.chows.some(chow => chow.tiles.some(ct => ct.type === tile.type && ct.value === tile.value))
    );
    const handChows = findChowsInHand(handTiles);
    chows.push(...handChows);

    return chows;
}

function findChowsInHand(allTiles) {
    const chows = [];
    const tiles = [...allTiles].filter(tile => tile.type !== TILE_TYPES.HONORS);

    // 按花色和數值排序
    tiles.sort((a, b) => {
        if (a.type !== b.type) return a.type.localeCompare(b.type);
        return a.value - b.value;
    });

    // 嘗試找出所有可能的順子
    for (let i = 0; i < tiles.length - 2; i++) {
        const tile1 = tiles[i];
        for (let j = i + 1; j < tiles.length - 1; j++) {
            const tile2 = tiles[j];
            if (tile2.type !== tile1.type || tile2.value !== tile1.value + 1) continue;

            for (let k = j + 1; k < tiles.length; k++) {
                const tile3 = tiles[k];
                if (tile3.type !== tile1.type || tile3.value !== tile1.value + 2) continue;

                chows.push({
                    type: tile1.type,
                    values: [tile1.value, tile2.value, tile3.value],
                    startValue: tile1.value
                });

                // 移除已使用的牌並繼續尋找其他順子
                const remainingTiles = tiles.filter((_, index) => index !== i && index !== j && index !== k);
                chows.push(...findChowsInHand(remainingTiles));
                return chows; // 只需要一種分解方式即可
            }
        }
    }

    return chows;
}

// 檢測相逢牌型
function detectXiangfeng(allChows) {
    const results = [];
    const chowCountsByValueAndSuit = {};
    
    // 統計每個數值起始點和花色的順子數量
    allChows.forEach(chow => {
        const key = chow.startValue.toString();
        if (!chowCountsByValueAndSuit[key]) {
            chowCountsByValueAndSuit[key] = {};
        }
        if (!chowCountsByValueAndSuit[key][chow.type]) {
            chowCountsByValueAndSuit[key][chow.type] = 0;
        }
        chowCountsByValueAndSuit[key][chow.type]++;
    });
    
    // 計算每個數值起始點的相逢組合次數
    for (const startValue in chowCountsByValueAndSuit) {
        const suitCounts = chowCountsByValueAndSuit[startValue];
        const suits = Object.keys(suitCounts);
        const counts = Object.values(suitCounts);
        
        if (suits.length >= 3) {
            // 先計算三相逢組合次數
            let sanxiangfengCount = 0;
            
            // 計算所有可能的三花色組合
            for (let i = 0; i < suits.length - 2; i++) {
                for (let j = i + 1; j < suits.length - 1; j++) {
                    for (let k = j + 1; k < suits.length; k++) {
                        sanxiangfengCount += counts[i] * counts[j] * counts[k];
                    }
                }
            }
            
            if (sanxiangfengCount > 0) {
                results.push({ name: `三相逢x${sanxiangfengCount}`, score: 10 * sanxiangfengCount });
                
                // 已經計算了三相逢，不再計算二相逢（避免重複計算）
                continue; // 跳過這個數值起始點的後續計算
            }
        }
        
        if (suits.length >= 2) {
            // 計算二相逢組合次數（只有在沒有三相逢的情況下）
            let erxiangfengCount = 0;
            for (let i = 0; i < suits.length - 1; i++) {
                for (let j = i + 1; j < suits.length; j++) {
                    erxiangfengCount += counts[i] * counts[j];
                }
            }
            
            if (erxiangfengCount > 0) {
                results.push({ name: `二相逢x${erxiangfengCount}`, score: 3 * erxiangfengCount });
            }
        }
    }
    
    return results;
}

// 修改檢測般高牌型函數，避免重複計算
function detectGaoxiang(allChows) {
    const results = [];
    const chowGroups = {};
    
    // 按花色和起始數值分組順子
    allChows.forEach(chow => {
        const key = `${chow.type}-${chow.startValue}`;
        if (!chowGroups[key]) {
            chowGroups[key] = 0;
        }
        chowGroups[key]++;
    });
    
    // 計算每個組的數量
    const gaoxiangCounts = {};
    for (const key in chowGroups) {
        const count = chowGroups[key];
        if (count >= 2) {
            const [type, startValue] = key.split('-');
            if (!gaoxiangCounts[type]) {
                gaoxiangCounts[type] = {};
            }
            gaoxiangCounts[type][startValue] = count;
        }
    }
    
    // 計算般高組合次數
    let yibangaoTotal = 0; // 一般高總次數
    let shuangbangaoTotal = 0; // 雙般高總次數
    let sanbangaoFound = false; // 三般高
    let sibangaoFound = false; // 四般高
    
    for (const type in gaoxiangCounts) {
        for (const startValue in gaoxiangCounts[type]) {
            const count = gaoxiangCounts[type][startValue];
            
            // 計算組合數：C(n,2) = n*(n-1)/2
            const combinations = count * (count - 1) / 2;
            yibangaoTotal += combinations;
            
            if (count === 4) {
                sibangaoFound = true;
                // 四般高包含6個一般高組合，但我們只算最高番的
                shuangbangaoTotal += 3; // C(4,2)=6，但雙般高是2個一般高組合
            } else if (count === 3) {
                sanbangaoFound = true;
                // 三般高包含3個一般高組合
                shuangbangaoTotal += 1; // C(3,2)=3，但雙般高是2個一般高組合
            }
        }
    }
    
    // 添加牌型（按最高番優先）
    if (sibangaoFound) {
        results.push({ name: '四般高', score: 30 });
    } else if (sanbangaoFound) {
        results.push({ name: '三般高', score: 15 });
    } else if (shuangbangaoTotal >= 1) {
        results.push({ name: '雙般高', score: 10 });
    } else if (yibangaoTotal >= 1) {
        results.push({ name: '一般高', score: 5 });
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
        if (tile.type !== TILE_TYPES.FLOWERS) {
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
// 修改独独检测函数
// 檢查獨獨: 食糊的必需是單吊/卡窿/偏章，而且不能變成叫多口的形狀
function isSingleWait(allTiles) {
    if (!state.winningTile) return false;

    // 获取实际手牌（不包括副露和和牌）
    const handTiles = state.handTiles;

    // 分析和牌前的手牌听牌情况
    const waitsBeforeWin = analyzeWaitsBeforeWin(handTiles, state.chows, state.pungs, state.openKongs, state.concealedKongs);

    // 獨獨必须只听一张牌，且这张牌就是和牌的那张
    if (waitsBeforeWin.length !== 1) return false;
    if (!waitsBeforeWin.some(wait => wait.type === state.winningTile.type && wait.value === state.winningTile.value)) {
        return false;
    }

    // 确认是单吊、卡窿或边张形式
    return isSingleWaitForm(state.winningTile, handTiles);
}

// 檢查假獨: 形狀雖然是聽多口但可以砌成獨獨的樣子
function isFakeSingleWait(allTiles) {
    if (!state.winningTile) return false;

    // 获取实际手牌（不包括副露和和牌）
    const handTiles = state.handTiles;

    // 分析和牌前的手牌听牌情况
    const waitsBeforeWin = analyzeWaitsBeforeWin(handTiles, state.chows, state.pungs, state.openKongs, state.concealedKongs);

    // 假獨必须听多于一张牌
    if (waitsBeforeWin.length <= 1) return false;

    // 确认和牌形式是单吊、卡窿或边张
    return isSingleWaitForm(state.winningTile, handTiles);
}

// 检查和牌形式是否是单吊、卡窿或边张
function isSingleWaitForm(winningTile, handTiles) {
    const winningValue = winningTile.value;
    const winningType = winningTile.type;

    // 字牌只能是单吊
    if (winningType === TILE_TYPES.HONORS) {
        const count = handTiles.filter(t => t.type === winningType && t.value === winningValue).length;
        return count === 1; // 单吊形式
    }

    // 数牌可以是单吊、卡窿或边张
    const count = handTiles.filter(t => t.type === winningType && t.value === winningValue).length;

    // 单吊形式
    if (count === 1) {
        return true;
    }

    // 卡窿形式（79听8）
    const hasPrev = handTiles.some(t => t.type === winningType && t.value === winningValue - 1);
    const hasNext = handTiles.some(t => t.type === winningType && t.value === winningValue + 1);
    if (hasPrev && hasNext && winningValue >= 2 && winningValue <= 8) {
        return true;
    }

    // 边张形式（12听3 或 89听7）
    if (winningValue === 3 && handTiles.some(t => t.type === winningType && t.value === 1) &&
        handTiles.some(t => t.type === winningType && t.value === 2)) {
        return true;
    }
    if (winningValue === 7 && handTiles.some(t => t.type === winningType && t.value === 8) &&
        handTiles.some(t => t.type === winningType && t.value === 9)) {
        return true;
    }

    return false;
}

// 尋找可能的叫牌
function findPotentialWaits(allTiles, winningTile) {
    const waits = new Set();
    const winningValue = winningTile.value;
    const winningType = winningTile.type;
    
    // 如果是字牌，只能是单吊
    if (winningType === TILE_TYPES.HONORS) {
        waits.add(winningValue);
        return Array.from(waits);
    }
    
    // 分析手牌结构，找出所有可能的听牌
    // 这里需要实现一个完整的听牌分析算法
    // 简化版：检查所有可能形成顺子或刻子的牌
    
    // 检查单吊
    waits.add(winningValue);
    
    // 检查顺子可能性
    for (let i = Math.max(1, winningValue - 2); i <= Math.min(9, winningValue + 2); i++) {
        if (i === winningValue) continue;
        
        // 检查是否能形成顺子
        if (canFormChowWithTile(allTiles, winningType, i)) {
            waits.add(i);
        }
    }
    
    // 检查刻子可能性
    if (canFormPungWithTile(allTiles, winningType, winningValue)) {
        waits.add(winningValue);
    }
    
    return Array.from(waits);
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
    
    return pairCount >= 3;
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

// 新增輔助函數：檢查所有組合是否包含特定數字
function isAllCombinationsContainNumber(allTiles, number) {
    const allMelds = [
        ...state.chows.map(chow => ({
            type: chow.type,
            values: chow.tiles.map(tile => tile.value).sort((a, b) => a - b)
        })),
        ...state.pungs.map(pung => ({
            type: pung.type,
            value: pung.value
        })),
        ...state.openKongs.map(kong => ({
            type: kong.type,
            value: kong.value
        })),
        ...state.concealedKongs.map(kong => ({
            type: kong.type,
            value: kong.value
        })),
        ...getAllPungs(allTiles),
        ...getAllChows(allTiles).filter(chow => !state.chows.some(schow => 
            schow.type === chow.type && 
            schow.tiles.map(tile => tile.value).sort().join() === chow.values.sort().join()
        ))
    ];
    const eye = findEye(allTiles);
    
    for (const meld of allMelds) {
        let containsNumber = false;
        
        if (meld.values) {
            // 順子
            containsNumber = meld.values.includes(number);
        } else {
            // 刻子
            containsNumber = meld.value === number;
        }
        
        if (!containsNumber) return false;
    }
    
    // 檢查將眼
    if (eye) {
        return eye.value === number;
    }
    
    return true;
}

// 新增輔助函數：檢查所有組合是否包含目標數字或番子
function isAllCombinationsContainNumbersOrHonors(allTiles, targetNumbers) {
    const allMelds = [
        ...state.chows.map(chow => ({
            type: chow.type,
            values: chow.tiles.map(tile => tile.value).sort((a, b) => a - b)
        })),
        ...state.pungs.map(pung => ({
            type: pung.type,
            value: pung.value
        })),
        ...state.openKongs.map(kong => ({
            type: kong.type,
            value: kong.value
        })),
        ...state.concealedKongs.map(kong => ({
            type: kong.type,
            value: kong.value
        })),
        ...getAllPungs(allTiles),
        ...getAllChows(allTiles).filter(chow => !state.chows.some(schow => 
            schow.type === chow.type && 
            schow.tiles.map(tile => tile.value).sort().join() === chow.values.sort().join()
        ))
    ];
    const eye = findEye(allTiles);

    // 檢查每個組合是否包含目標數字或字牌
    for (const meld of allMelds) {
        let containsTargetOrHonor = false;

        if (meld.type === TILE_TYPES.HONORS) {
            containsTargetOrHonor = true; // 字牌算通過
        } else if (meld.values) {
            // 順子：檢查是否包含任一目標數字
            containsTargetOrHonor = meld.values.some(value => targetNumbers.includes(value));
        } else {
            // 刻子：檢查是否為目標數字
            containsTargetOrHonor = targetNumbers.includes(meld.value);
        }

        if (!containsTargetOrHonor) return false;
    }

    // 檢查將眼是否為目標數字或字牌
    if (eye) {
        const isTargetOrHonorEye = eye.type === TILE_TYPES.HONORS || targetNumbers.includes(eye.value);
        if (!isTargetOrHonorEye) return false;
    }

    return true;
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

function canFormValidMeldsForChunQuanDaiYaoJiu(tiles) {
    if (tiles.length === 0) return true;
    if (tiles.length % 3 !== 0) return false;

    // 按花色和數值排序
    const sortedTiles = [...tiles].sort((a, b) => {
        if (a.type !== b.type) return a.type.localeCompare(b.type);
        return a.value - b.value;
    });

    // 嘗試將牌分解為順子或刻子
    return tryFormMelds(sortedTiles);
}

function tryFormMelds(tiles) {
    if (tiles.length === 0) return true;

    // 嘗試形成刻子
    for (let i = 0; i < tiles.length - 2; i++) {
        if (tiles[i].type === tiles[i + 1].type && tiles[i].value === tiles[i + 1].value &&
            tiles[i].type === tiles[i + 2].type && tiles[i].value === tiles[i + 2].value) {
            // 刻子必須是1或9
            if (tiles[i].value !== 1 && tiles[i].value !== 9) continue;

            const remainingTiles = tiles.filter((_, index) => index !== i && index !== i + 1 && index !== i + 2);
            if (tryFormMelds(remainingTiles)) {
                return true;
            }
        }
    }

    // 嘗試形成順子
    for (let i = 0; i < tiles.length - 2; i++) {
        const tile1 = tiles[i];
        if (tile1.type === TILE_TYPES.HONORS) continue;

        for (let j = i + 1; j < tiles.length; j++) {
            const tile2 = tiles[j];
            if (tile2.type !== tile1.type || tile2.value !== tile1.value + 1) continue;

            for (let k = j + 1; k < tiles.length; k++) {
                const tile3 = tiles[k];
                if (tile3.type !== tile1.type || tile3.value !== tile1.value + 2) continue;

                // 順子必須包含1或9
                const values = [tile1.value, tile2.value, tile3.value];
                if (!values.includes(1) && !values.includes(9)) continue;

                const remainingTiles = tiles.filter((_, index) => index !== i && index !== j && index !== k);
                if (tryFormMelds(remainingTiles)) {
                    return true;
                }
            }
        }
    }

    return false;
}

function getAllPungs(allTiles) {
    const pungs = [];
    const tileCounts = {};

    // 統計每張牌的出現次數
    allTiles.forEach(tile => {
        const key = `${tile.type}-${tile.value}`;
        tileCounts[key] = (tileCounts[key] || 0) + 1;
    });

    // 找出刻子（三張相同的牌）
    for (const key in tileCounts) {
        if (tileCounts[key] >= 3) {
            const [type, value] = key.split('-');
            pungs.push({
                type,
                value: parseInt(value)
            });
        }
    }

    // 過濾掉已標記的刻子和槓
    return pungs.filter(pung => 
        !state.pungs.some(spung => spung.type === pung.type && spung.value === pung.value) &&
        !state.openKongs.some(kong => kong.type === pung.type && kong.value === pung.value) &&
        !state.concealedKongs.some(kong => kong.type === pung.type && kong.value === pung.value)
    );
}

// 新增計數老少上
function countLaoShaoShang(allTiles) {
    let laoShaoCount = 0;
    const numberTiles = allTiles.filter(tile => 
        tile.type !== TILE_TYPES.HONORS && tile.type !== TILE_TYPES.FLOWERS
    );

    // Group tiles by suit
    const tilesBySuit = {};
    [TILE_TYPES.CHARACTERS, TILE_TYPES.DOTS, TILE_TYPES.BAMBOOS].forEach(suit => {
        tilesBySuit[suit] = numberTiles.filter(tile => tile.type === suit)
            .map(tile => tile.value)
            .sort((a, b) => a - b);
    });

    // Check for 清龍 and 老少 in each suit
    [TILE_TYPES.CHARACTERS, TILE_TYPES.DOTS, TILE_TYPES.BAMBOOS].forEach(suit => {
        const values = tilesBySuit[suit];
        const valueCounts = {};
        values.forEach(v => {
            valueCounts[v] = (valueCounts[v] || 0) + 1;
        });

        // Check for 清龍 (123456789 in one suit)
        const hasPureDragon = [1, 2, 3, 4, 5, 6, 7, 8, 9].every(v => (valueCounts[v] || 0) >= 1);
        if (hasPureDragon) {
            return; // Skip 老少 for suits with 清龍
        }

        // Count 123 and 789 sets
        const max123 = Math.min(valueCounts[1] || 0, valueCounts[2] || 0, valueCounts[3] || 0);
        const max789 = Math.min(valueCounts[7] || 0, valueCounts[8] || 0, valueCounts[9] || 0);

        // Count one Lao Shao per suit (prefer 123 if available)
        if (max123 > 0) {
            laoShaoCount += 1;
        } else if (max789 > 0) {
            laoShaoCount += 1;
        }
    });

    return laoShaoCount;
}

// 新增計數老少碰
function countLaoShaoPeng(allTiles) {
    const allPungs = [
        ...state.pungs,
        ...state.openKongs,
        ...state.concealedKongs,
        ...getAllPungs(allTiles)
    ];

    // 按花色分組刻子
    const pungsByType = {};
    allPungs.forEach(pung => {
        if (!pungsByType[pung.type]) {
            pungsByType[pung.type] = [];
        }
        pungsByType[pung.type].push(pung.value);
    });

    let count = 0;
    // 檢查每個花色是否有111和999刻子
    for (const type in pungsByType) {
        const values = pungsByType[type];
        if (values.includes(1) && values.includes(9)) {
            // 計算該花色中111和999的對數（取最小值）
            const count1 = values.filter(v => v === 1).length;
            const count9 = values.filter(v => v === 9).length;
            count += Math.min(count1, count9);
        }
    }

    return count;
}

// 新增：檢查五門齊（小）
function isSmallFiveDoors(allTiles) {
    // 五門：東南西北為一門，中發白為一門，筒索萬各三門
    const doors = {
        wind: false,    // 風牌門（東南西北）
        dragon: false,  // 元牌門（中發白）
        characters: false, // 萬子門
        bamboos: false,   // 索子門
        dots: false      // 筒子門
    };
    
    // 檢查每種門類是否有牌
    allTiles.forEach(tile => {
        if (tile.type === TILE_TYPES.HONORS) {
            if (tile.value >= 1 && tile.value <= 4) {
                doors.wind = true; // 風牌
            } else if (tile.value >= 5 && tile.value <= 7) {
                doors.dragon = true; // 元牌
            }
        } else if (tile.type === TILE_TYPES.CHARACTERS) {
            doors.characters = true;
        } else if (tile.type === TILE_TYPES.BAMBOOS) {
            doors.bamboos = true;
        } else if (tile.type === TILE_TYPES.DOTS) {
            doors.dots = true;
        }
    });
    
    // 五門都有齊
    return doors.wind && doors.dragon && doors.characters && doors.bamboos && doors.dots;
}

// 新增：檢查五門齊（大）
function isBigFiveDoors(allTiles) {
    // 必需風牌元牌各齊一坎（刻子或槓）
    if (!hasWindPung(allTiles) || !hasDragonPung(allTiles)) {
        return false;
    }
    
    // 同時滿足五門齊（小）的條件
    return isSmallFiveDoors(allTiles);
}

// 新增：檢查七門齊（小）
function isSmallSevenDoors(allTiles) {
    // 七門：東南西北為一門，中發白為一門，筒索萬各三門，花為兩門
    const doors = {
        wind: false,    // 風牌門
        dragon: false,  // 元牌門
        characters: false, // 萬子門
        bamboos: false,   // 索子門
        dots: false,      // 筒子門
        season: false,    // 季節花門
        flower: false     // 花草花門
    };
    
    // 檢查普通牌門類
    allTiles.forEach(tile => {
        if (tile.type === TILE_TYPES.HONORS) {
            if (tile.value >= 1 && tile.value <= 4) {
                doors.wind = true;
            } else if (tile.value >= 5 && tile.value <= 7) {
                doors.dragon = true;
            }
        } else if (tile.type === TILE_TYPES.CHARACTERS) {
            doors.characters = true;
        } else if (tile.type === TILE_TYPES.BAMBOOS) {
            doors.bamboos = true;
        } else if (tile.type === TILE_TYPES.DOTS) {
            doors.dots = true;
        }
    });
    
    // 檢查花牌門類
    state.flowers.forEach(flower => {
        if (flower.value == 1 || flower.value == 2 || flower.value == 3 || flower.value == 4) {
            doors.season = true;
        } else if (flower.value == 5 || flower.value == 6 || flower.value == 7 || flower.value == 8) {
            doors.flower = true;
        }
    });
    
    // 七門都有齊
    return doors.wind && doors.dragon && doors.characters && 
           doors.bamboos && doors.dots && doors.season && doors.flower;
}

// 新增：檢查大七門（大）
function isBigSevenDoors(allTiles) {
    // 必需風牌元牌各齊一坎（刻子或槓）
    if (!hasWindPung(allTiles) || !hasDragonPung(allTiles)) {
        return false;
    }
    
    // 同時滿足七門齊（小）的條件
    return isSmallSevenDoors(allTiles);
}

// 輔助函數：檢查是否有風牌刻子/槓
function hasWindPung(allTiles) {
    const windCounts = { 東: 0, 南: 0, 西: 0, 北: 0 };
    
    allTiles.forEach(tile => {
        if (tile.type === TILE_TYPES.HONORS && tile.value >= 1 && tile.value <= 4) {
            const windName = ['東', '南', '西', '北'][tile.value - 1];
            windCounts[windName]++;
        }
    });
    
    // 檢查是否有至少一種風牌達到3張或以上（刻子或槓）
    return Object.values(windCounts).some(count => count >= 3);
}

// 輔助函數：檢查是否有元牌刻子/槓
function hasDragonPung(allTiles) {
    const dragonCounts = { 中: 0, 發: 0, 白: 0 };
    
    allTiles.forEach(tile => {
        if (tile.type === TILE_TYPES.HONORS && tile.value >= 5 && tile.value <= 7) {
            const dragonName = ['中', '發', '白'][tile.value - 5];
            dragonCounts[dragonName]++;
        }
    });
    
    // 檢查是否有至少一種元牌達到3張或以上（刻子或槓）
    return Object.values(dragonCounts).some(count => count >= 3);
}

// 新增：檢查十三么
function isShiSanYao(allTiles) {
    // 十六张牌十三么需要17張牌（包括糊牌）
    // 包含所有么九牌各一張，再加任意顺子或刻子
    const totalTiles = allTiles.length;
    if (totalTiles !== 17) {
        return false;
    }
    
    // 十三么的基本牌型：一九萬、一九筒、一九索、東南西北中發白
    const requiredTiles = [
        { type: TILE_TYPES.CHARACTERS, value: 1 }, // 1萬
        { type: TILE_TYPES.CHARACTERS, value: 9 }, // 9萬
        { type: TILE_TYPES.DOTS, value: 1 },       // 1筒
        { type: TILE_TYPES.DOTS, value: 9 },       // 9筒
        { type: TILE_TYPES.BAMBOOS, value: 1 },    // 1索
        { type: TILE_TYPES.BAMBOOS, value: 9 },    // 9索
        { type: TILE_TYPES.HONORS, value: 1 },     // 東
        { type: TILE_TYPES.HONORS, value: 2 },     // 南
        { type: TILE_TYPES.HONORS, value: 3 },     // 西
        { type: TILE_TYPES.HONORS, value: 4 },     // 北
        { type: TILE_TYPES.HONORS, value: 5 },     // 中
        { type: TILE_TYPES.HONORS, value: 6 },     // 發
        { type: TILE_TYPES.HONORS, value: 7 }      // 白
    ];
    
    const tileCounts = {};
    allTiles.forEach(tile => {
        const key = `${tile.type}-${tile.value}`;
        tileCounts[key] = (tileCounts[key] || 0) + 1;
    });
    
    // 檢查是否包含所有么九牌各至少一張
    for (const reqTile of requiredTiles) {
        const key = `${reqTile.type}-${reqTile.value}`;
        const count = tileCounts[key] || 0;
        if (count < 1) {
            return false; // 缺少必要牌
        }
    }
    
    // 檢查是否有將眼（其中一張牌有兩張）
    let pairFound = false;
    let pairTile = null;
    for (const reqTile of requiredTiles) {
        const key = `${reqTile.type}-${reqTile.value}`;
        const count = tileCounts[key] || 0;
        if (count == 2) {
            pairFound = true;
            pairTile = reqTile;
            break;
        }
    }

    if (!pairFound) {
        return false; // 沒有將眼
    }
    
    // 先統計每種牌需要排除的數量
    const excludeCounts = {};
    requiredTiles.forEach(reqTile => {
        const key = `${reqTile.type}-${reqTile.value}`;
        excludeCounts[key] = 1; // 每種牌保留一張
    });
    
    // 將眼的牌多保留一張（總共保留兩張）
    if (pairTile) {
        const pairKey = `${pairTile.type}-${pairTile.value}`;
        excludeCounts[pairKey] = 2;
    }
    
    // 收集額外的牌（3張牌）
    const extraTiles = [];
    const usedCounts = {};
    
    allTiles.forEach(tile => {
        const key = `${tile.type}-${tile.value}`;
        usedCounts[key] = (usedCounts[key] || 0) + 1;
        
        // 如果這個牌型需要排除的數量還沒達到，就跳過
        if (excludeCounts[key] && usedCounts[key] <= excludeCounts[key]) {
            return;
        }
        
        // 否則加入額外牌
        extraTiles.push(tile);
    });
    
    // 額外的牌必須能組成順子或刻子
    if (extraTiles.length !== 3) {
        return false;
    }
    
    // 檢查是否能組成順子或刻子
    return canFormMeld(extraTiles);
}

// 檢查是否能組成順子或刻子
function canFormMeld(tiles) {
    if (tiles.length !== 3) return false;
    
    // 檢查是否為刻子（三張相同）
    if (tiles.every(tile => 
        tile.type === tiles[0].type && tile.value === tiles[0].value
    )) {
        return true;
    }
    
    // 檢查是否為順子（三張連續）
    const sortedTiles = [...tiles].sort((a, b) => a.value - b.value);
    
    const isChow = sortedTiles[0].value + 1 === sortedTiles[1].value && 
                  sortedTiles[1].value + 1 === sortedTiles[2].value &&
                  sortedTiles[0].type === sortedTiles[1].type && 
                  sortedTiles[1].type === sortedTiles[2].type;
    
    return isChow;
}

function canFormMelds(tiles, neededMelds) {
    if (tiles.length !== neededMelds * 3) return false;
    if (tiles.length === 0) return true;

    // 按花色和数值排序
    const sortedTiles = [...tiles].sort((a, b) => {
        if (a.type !== b.type) return a.type.localeCompare(b.type);
        return a.value - b.value;
    });

    // 尝试形成刻子
    for (let i = 0; i < sortedTiles.length - 2; i++) {
        if (sortedTiles[i].type === sortedTiles[i + 1].type &&
            sortedTiles[i].type === sortedTiles[i + 2].type &&
            sortedTiles[i].value === sortedTiles[i + 1].value &&
            sortedTiles[i].value === sortedTiles[i + 2].value) {
            // 找到刻子
            const remainingTiles = sortedTiles.filter((t, index) =>
                index !== i && index !== i + 1 && index !== i + 2
            );
            if (canFormMelds(remainingTiles, neededMelds - 1)) {
                return true;
            }
        }
    }

    // 尝试形成顺子（仅限数牌）
    for (let i = 0; i < sortedTiles.length - 2; i++) {
        if (sortedTiles[i].type !== TILE_TYPES.HONORS &&
            sortedTiles[i].type === sortedTiles[i + 1].type &&
            sortedTiles[i].type === sortedTiles[i + 2].type &&
            sortedTiles[i].value + 1 === sortedTiles[i + 1].value &&
            sortedTiles[i].value + 2 === sortedTiles[i + 2].value) {
            // 找到顺子
            const remainingTiles = sortedTiles.filter((t, index) =>
                index !== i && index !== i + 1 && index !== i + 2
            );
            if (canFormMelds(remainingTiles, neededMelds - 1)) {
                return true;
            }
        }
    }

    return false;
}

// 檢查十六不搭
function isShiLiuBuDa(allTiles) {
    if (allTiles.length !== 17) return false;

    const tileCounts = {};
    allTiles.forEach(tile => {
        const key = `${tile.type}-${tile.value}`;
        tileCounts[key] = (tileCounts[key] || 0) + 1;
    });

    let pairCount = 0;
    let pairTile = null;
    for (const key in tileCounts) {
        if (tileCounts[key] > 2) return false; // 不能有刻子或槓
        if (tileCounts[key] === 2) {
            pairCount++;
            pairTile = key;
        }
    }

    if (pairCount !== 1) return false; // 必須只有一對將眼

    const tilesBySuit = {};
    allTiles.forEach(tile => {
        if (tile.type !== TILE_TYPES.HONORS && tile.type !== TILE_TYPES.FLOWERS) {
            if (!tilesBySuit[tile.type]) tilesBySuit[tile.type] = [];
            tilesBySuit[tile.type].push(tile.value);
        }
    });

    for (const suit in tilesBySuit) {
        const values = tilesBySuit[suit].sort((a, b) => a - b);
        for (let i = 0; i < values.length - 2; i++) {
            if (values[i + 1] === values[i] + 1 && values[i + 2] === values[i] + 2) {
                return false; // 不能有順子
            }
        }
    }

    // 檢查數牌數量（必須為9張）
    const numberTiles = allTiles.filter(tile => 
        tile.type === TILE_TYPES.CHARACTERS || 
        tile.type === TILE_TYPES.BAMBOOS || 
        tile.type === TILE_TYPES.DOTS
    );
    if (numberTiles.length !== 9) return false;

    // 檢查字牌數量（必須為8張）
    const honorTiles = allTiles.filter(tile => tile.type === TILE_TYPES.HONORS);
    if (honorTiles.length !== 8) return false;

    // 檢查是否為十六飛（和牌張是否為將眼）
    let isShiLiuFei = false;
    if (state.winningTile && pairTile) {
        const [pairType, pairValue] = pairTile.split('-');
        if (state.winningTile.type === pairType && state.winningTile.value === parseInt(pairValue)) {
            isShiLiuFei = true;
        }
    }

    return { isValid: true, pairTile, isShiLiuFei };
}

function isShiSanYaoDuDu(handTiles, winningTile) {
    // 确保是16张手牌和1张和牌
    if (handTiles.length !== 16 || !winningTile) return false;
    
    // 合并所有牌以便分析
    const allTiles = [...handTiles, winningTile];
    
    // 检查是否是有效的十三么
    if (!isValidShiSanYao(allTiles)) return false;
    
    // 分析和牌前的听牌情况
    const waitsBeforeWin = analyzeWaitsBeforeWinForShiSanYao(handTiles);
    
    // 独独必须只听一张牌
    return waitsBeforeWin.length === 1;
}

// 檢查十六不搭獨獨
function isShiLiuBuDaDuDu(allTiles) {
    const shiLiuBuDaResult = isShiLiuBuDa(allTiles);
    if (!shiLiuBuDaResult.isValid) return false;

    if (!state.winningTile) return false;

    const pairTile = shiLiuBuDaResult.pairTile;
    const [pairType, pairValue] = pairTile.split('-');

    // 獲取數牌和字牌
    const numberTiles = allTiles.filter(tile => 
        tile.type === TILE_TYPES.CHARACTERS || 
        tile.type === TILE_TYPES.BAMBOOS || 
        tile.type === TILE_TYPES.DOTS
    );
    const honorTiles = allTiles.filter(tile => tile.type === TILE_TYPES.HONORS);

    // 按花色分組數牌
    const tilesBySuit = {
        [TILE_TYPES.CHARACTERS]: [],
        [TILE_TYPES.BAMBOOS]: [],
        [TILE_TYPES.DOTS]: []
    };
    numberTiles.forEach(tile => {
        tilesBySuit[tile.type].push(tile.value);
    });

    // 如果和牌張是字牌，檢查是否為獨聽
    if (state.winningTile.type === TILE_TYPES.HONORS) {
        // 獲取現有字牌
        const honorValues = honorTiles.map(tile => tile.value);
        const winningHonorValue = state.winningTile.value;

        // 定義所有可能的字牌值（1:東, 2:南, 3:西, 4:北, 5:中, 6:發, 7:白）
        const allHonors = [1, 2, 3, 4, 5, 6, 7];

        // 檢查和牌張是否形成合法十六不搭
        const currentTiles = [...allTiles];
        const tileCounts = {};
        currentTiles.forEach(tile => {
            const key = `${tile.type}-${tile.value}`;
            tileCounts[key] = (tileCounts[key] || 0) + 1;
        });

        let pairCount = 0;
        let currentPairTile = null;
        for (const key in tileCounts) {
            if (tileCounts[key] > 2) return false; // 不能有刻子
            if (tileCounts[key] === 2) {
                pairCount++;
                currentPairTile = key;
            }
        }
        if (pairCount !== 1) return false; // 必須只有一對將眼

        // 檢查數牌無順子
        let hasSequence = false;
        for (const suit in tilesBySuit) {
            const values = tilesBySuit[suit].sort((a, b) => a - b);
            for (let i = 0; i < values.length - 2; i++) {
                if (values[i + 1] === values[i] + 1 && values[i + 2] === values[i] + 2) {
                    hasSequence = true;
                    break;
                }
            }
            if (hasSequence) break;
        }
        if (hasSequence) return false; // 和牌張形成順子，無效

        // 檢查其他字牌是否可和牌
        let validWinningHonors = [];
        for (const honor of allHonors) {
            if (honor === winningHonorValue || honorValues.includes(honor)) continue;

            // 模擬用其他字牌替換和牌張
            const newHonorTiles = [...honorTiles.filter(tile => tile.value !== winningHonorValue), 
                                 { type: TILE_TYPES.HONORS, value: honor }];
            const newAllTiles = [
                ...numberTiles,
                ...newHonorTiles
            ];

            // 檢查新牌組是否滿足十六不搭（無順子、無刻子除將眼外）
            const newTileCounts = {};
            newAllTiles.forEach(tile => {
                const key = `${tile.type}-${tile.value}`;
                newTileCounts[key] = (newTileCounts[key] || 0) + 1;
            });

            let newPairCount = 0;
            let newPairTile = null;
            for (const key in newTileCounts) {
                if (newTileCounts[key] > 2) continue; // 不能有刻子
                if (newTileCounts[key] === 2) {
                    newPairCount++;
                    newPairTile = key;
                }
            }

            // 必須有且僅有一對將眼，且無順子
            if (newPairCount === 1) {
                const newTilesBySuit = {};
                newAllTiles.forEach(tile => {
                    if (tile.type !== TILE_TYPES.HONORS && tile.type !== TILE_TYPES.FLOWERS) {
                        if (!newTilesBySuit[tile.type]) newTilesBySuit[tile.type] = [];
                        newTilesBySuit[tile.type].push(tile.value);
                    }
                });

                let newHasSequence = false;
                for (const suit in newTilesBySuit) {
                    const values = newTilesBySuit[suit].sort((a, b) => a - b);
                    for (let i = 0; i < values.length - 2; i++) {
                        if (values[i + 1] === values[i] + 1 && values[i + 2] === values[i] + 2) {
                            newHasSequence = true;
                            break;
                        }
                    }
                    if (newHasSequence) break;
                }

                if (!newHasSequence) {
                    validWinningHonors.push(honor);
                }
            }
        }

        // 獨聽要求只有和牌張本身可和
        return validWinningHonors.length === 0;
    }

    // 如果和牌張是數牌，檢查是否為獨聽
    if (state.winningTile.type === TILE_TYPES.CHARACTERS || 
        state.winningTile.type === TILE_TYPES.BAMBOOS || 
        state.winningTile.type === TILE_TYPES.DOTS) {
        // 將眼必須是字牌
        if (pairType !== TILE_TYPES.HONORS) {
            return false;
        }

        const winningSuit = state.winningTile.type;
        const winningValue = state.winningTile.value;
        const suitValues = tilesBySuit[winningSuit].filter(val => val !== winningValue).sort((a, b) => a - b);

        // 檢查和牌張是否形成順子
        let winningFormsSequence = false;
        const testWinningValues = [...suitValues, winningValue].sort((a, b) => a - b);
        for (let j = 0; j < testWinningValues.length - 2; j++) {
            if (testWinningValues[j + 1] === testWinningValues[j] + 1 && 
                testWinningValues[j + 2] === testWinningValues[j] + 2) {
                winningFormsSequence = true;
                break;
            }
        }
        if (winningFormsSequence) return false; // 和牌張形成順子，非獨聽

        // 檢查其他數牌（1~9，排除已有牌和和牌張）
        let validWinningValues = [];
        for (let i = 1; i <= 9; i++) {
            if (i === winningValue || suitValues.includes(i)) continue;

            // 模擬用其他數牌替換和牌張
            const newNumberTiles = [
                ...numberTiles.filter(tile => tile.type !== winningSuit || tile.value !== winningValue),
                { type: winningSuit, value: i }
            ];
            const newAllTiles = [...newNumberTiles, ...honorTiles];

            // 檢查新牌組是否滿足十六不搭
            const newTileCounts = {};
            newAllTiles.forEach(tile => {
                const key = `${tile.type}-${tile.value}`;
                newTileCounts[key] = (newTileCounts[key] || 0) + 1;
            });

            let newPairCount = 0;
            let newPairTile = null;
            for (const key in newTileCounts) {
                if (newTileCounts[key] > 2) continue; // 不能有刻子
                if (newTileCounts[key] === 2) {
                    newPairCount++;
                    newPairTile = key;
                }
            }

            // 必須有且僅有一對將眼，且無順子
            if (newPairCount === 1) {
                const newTilesBySuit = {};
                newAllTiles.forEach(tile => {
                    if (tile.type !== TILE_TYPES.HONORS && tile.type !== TILE_TYPES.FLOWERS) {
                        if (!newTilesBySuit[tile.type]) newTilesBySuit[tile.type] = [];
                        newTilesBySuit[tile.type].push(tile.value);
                    }
                });

                let newHasSequence = false;
                for (const suit in newTilesBySuit) {
                    const values = newTilesBySuit[suit].sort((a, b) => a - b);
                    for (let j = 0; j < values.length - 2; j++) {
                        if (values[j + 1] === values[j] + 1 && values[j + 2] === values[j] + 2) {
                            newHasSequence = true;
                            break;
                        }
                    }
                    if (newHasSequence) break;
                }

                if (!newHasSequence) {
                    validWinningValues.push(i);
                }
            }
        }

        // 獨聽要求只有和牌張本身可和
        return validWinningValues.length === 0;
    }

    return false;
}

// 檢查十六不搭三相逢（任意三個數字）
function isShiLiuBuDaSanXiangFeng(allTiles) {
    const shiLiuBuDaResult = isShiLiuBuDa(allTiles);
    if (!shiLiuBuDaResult.isValid) return false;

    const numberTiles = allTiles.filter(tile => 
        tile.type === TILE_TYPES.CHARACTERS || 
        tile.type === TILE_TYPES.BAMBOOS || 
        tile.type === TILE_TYPES.DOTS
    );

    if (numberTiles.length !== 9) return false;

    const suits = {
        [TILE_TYPES.CHARACTERS]: [],
        [TILE_TYPES.BAMBOOS]: [],
        [TILE_TYPES.DOTS]: []
    };

    numberTiles.forEach(tile => {
        suits[tile.type].push(tile.value);
    });

    // 檢查三花色是否具有相同的三個數字
    const charValues = suits[TILE_TYPES.CHARACTERS].sort((a, b) => a - b);
    const bambooValues = suits[TILE_TYPES.BAMBOOS].sort((a, b) => a - b);
    const dotValues = suits[TILE_TYPES.DOTS].sort((a, b) => a - b);

    if (charValues.length !== 3 || bambooValues.length !== 3 || dotValues.length !== 3) {
        return false;
    }

    // 確認三花色的數字完全相同
    for (let i = 0; i < 3; i++) {
        if (charValues[i] !== bambooValues[i] || bambooValues[i] !== dotValues[i]) {
            return false;
        }
    }

    // 獲取三相逢的數字
    const sanXiangFengValues = charValues;

    // 檢查將眼是否包含三相逢的數字
    if (shiLiuBuDaResult.pairTile) {
        const [pairType, pairValue] = shiLiuBuDaResult.pairTile.split('-');
        if (pairType !== TILE_TYPES.HONORS && pairType !== TILE_TYPES.FLOWERS && 
            sanXiangFengValues.includes(parseInt(pairValue))) {
            return false; // 將眼包含三相逢的數字，無效
        }
    }

    // 檢查和牌張是否屬於三相逢的數字
    let isDark = true;
    if (state.winningTile && 
        state.winningTile.type !== TILE_TYPES.HONORS && 
        state.winningTile.type !== TILE_TYPES.FLOWERS &&
        sanXiangFengValues.includes(state.winningTile.value)) {
        isDark = false;
    }

    return { isValid: true, isDark, values: sanXiangFengValues };
}

// 檢查十六不搭雜龍
function isShiLiuBuDaZhaLong(allTiles) {
    const shiLiuBuDaResult = isShiLiuBuDa(allTiles);
    if (!shiLiuBuDaResult.isValid) return false;

    const numberTiles = allTiles.filter(tile => 
        tile.type === TILE_TYPES.CHARACTERS || 
        tile.type === TILE_TYPES.BAMBOOS || 
        tile.type === TILE_TYPES.DOTS
    );

    if (numberTiles.length !== 9) return false;

    // 按數字分組，檢查1~9是否各有三花色
    const values = {};
    for (let i = 1; i <= 9; i++) {
        values[i] = [];
    }

    numberTiles.forEach(tile => {
        if (tile.value >= 1 && tile.value <= 9) {
            values[tile.value].push(tile.type);
        }
    });

    for (let i = 1; i <= 9; i++) {
        if (values[i].length !== 1 || // 每個數字應恰好有一張牌
            !values[i].includes(TILE_TYPES.CHARACTERS) &&
            !values[i].includes(TILE_TYPES.BAMBOOS) &&
            !values[i].includes(TILE_TYPES.DOTS)) {
            return false;
        }
    }

    // 確保每個花色各有3張數牌
    const suitCounts = {
        [TILE_TYPES.CHARACTERS]: 0,
        [TILE_TYPES.BAMBOOS]: 0,
        [TILE_TYPES.DOTS]: 0
    };
    numberTiles.forEach(tile => {
        suitCounts[tile.type]++;
    });
    if (suitCounts[TILE_TYPES.CHARACTERS] !== 3 ||
        suitCounts[TILE_TYPES.BAMBOOS] !== 3 ||
        suitCounts[TILE_TYPES.DOTS] !== 3) {
        return false;
    }

    // 檢查和牌張是否為1~9
    let isDark = true;
    if (state.winningTile && 
        state.winningTile.type !== TILE_TYPES.HONORS && 
        state.winningTile.type !== TILE_TYPES.FLOWERS &&
        state.winningTile.value >= 1 && state.winningTile.value <= 9) {
        isDark = false;
    }

    return { isValid: true, isDark };
}

// 新增：檢查大於五（全副牌每一組合都大過"五"，不能有五及番子）
function isGreaterThanFive(allTiles) {
    // 檢查是否有番子
    if (allTiles.some(tile => tile.type === TILE_TYPES.HONORS)) {
        return false;
    }
    
    // 檢查是否有"五"或小於五的牌
    if (allTiles.some(tile => tile.value <= 5)) {
        return false;
    }
    
    // 檢查所有組合是否都大於五
    return isAllCombinationsGreaterThanFive(allTiles);
}

// 新增：檢查小於五（全副牌每一組合都小過"五"，不能有五及番子）
function isLessThanFive(allTiles) {
    // 檢查是否有番子
    if (allTiles.some(tile => tile.type === TILE_TYPES.HONORS)) {
        return false;
    }
    
    // 檢查是否有"五"或大於五的牌
    if (allTiles.some(tile => tile.value >= 5)) {
        return false;
    }
    
    // 檢查所有組合是否都小於五
    return isAllCombinationsLessThanFive(allTiles);
}

// 新增：檢查缺五（全副牌每一組合都無"五"，不能有番子）
function isMissingFive(allTiles) {
    // 檢查是否有番子
    if (allTiles.some(tile => tile.type === TILE_TYPES.HONORS)) {
        return false;
    }
    
    // 檢查是否有"五"
    if (allTiles.some(tile => tile.value === 5)) {
        return false;
    }
    
    // 檢查所有組合是否都沒有五
    return isAllCombinationsMissingFive(allTiles);
}

// 輔助函數：檢查所有組合是否都大於五
function isAllCombinationsGreaterThanFive(allTiles) {
    const allMelds = getAllMelds(allTiles);
    const eye = findEye(allTiles);
    
    // 檢查每個組合是否都大於五
    for (const meld of allMelds) {
        if (meld.type === TILE_TYPES.HONORS) {
            return false; // 不應該有番子
        }
        
        if (meld.values) {
            // 順子：檢查所有數字是否都大於五
            if (meld.values.some(value => value <= 5)) {
                return false;
            }
        } else {
            // 刻子：檢查數字是否大於五
            if (meld.value <= 5) {
                return false;
            }
        }
    }
    
    // 檢查將眼是否大於五
    if (eye && eye.type !== TILE_TYPES.HONORS && eye.value <= 5) {
        return false;
    }
    
    return true;
}

// 輔助函數：檢查所有組合是否都小於五
function isAllCombinationsLessThanFive(allTiles) {
    const allMelds = getAllMelds(allTiles);
    const eye = findEye(allTiles);
    
    // 檢查每個組合是否都小於五
    for (const meld of allMelds) {
        if (meld.type === TILE_TYPES.HONORS) {
            return false; // 不應該有番子
        }
        
        if (meld.values) {
            // 順子：檢查所有數字是否都小於五
            if (meld.values.some(value => value >= 5)) {
                return false;
            }
        } else {
            // 刻子：檢查數字是否小於五
            if (meld.value >= 5) {
                return false;
            }
        }
    }
    
    // 檢查將眼是否小於五
    if (eye && eye.type !== TILE_TYPES.HONORS && eye.value >= 5) {
        return false;
    }
    
    return true;
}

// 輔助函數：檢查所有組合是否都沒有五
function isAllCombinationsMissingFive(allTiles) {
    const allMelds = getAllMelds(allTiles);
    const eye = findEye(allTiles);
    
    // 檢查每個組合是否都沒有五
    for (const meld of allMelds) {
        if (meld.type === TILE_TYPES.HONORS) {
            return false; // 不應該有番子
        }
        
        if (meld.values) {
            // 順子：檢查所有數字是否都不等於五
            if (meld.values.some(value => value === 5)) {
                return false;
            }
        } else {
            // 刻子：檢查數字是否不等於五
            if (meld.value === 5) {
                return false;
            }
        }
    }
    
    // 檢查將眼是否不等於五
    if (eye && eye.type !== TILE_TYPES.HONORS && eye.value === 5) {
        return false;
    }
    
    return true;
}

// 輔助函數：獲取所有組合（順子、刻子、槓）
function getAllMelds(allTiles) {
    return [
        ...state.chows.map(chow => ({
            type: chow.type,
            values: chow.tiles.map(tile => tile.value).sort((a, b) => a - b)
        })),
        ...state.pungs.map(pung => ({
            type: pung.type,
            value: pung.value
        })),
        ...state.openKongs.map(kong => ({
            type: kong.type,
            value: kong.value
        })),
        ...state.concealedKongs.map(kong => ({
            type: kong.type,
            value: kong.value
        })),
        ...getAllPungs(allTiles),
        ...getAllChows(allTiles).filter(chow => !state.chows.some(schow => 
            schow.type === chow.type && 
            schow.tiles.map(tile => tile.value).sort().join() === chow.values.sort().join()
        ))
    ];
}

// 辅助函数：检查是否能与某张牌形成顺子
function canFormChowWithTile(allTiles, type, value) {
    // 实现顺子形成检查逻辑
    // 简化版：检查是否有相邻的牌
    const hasPrev = allTiles.some(t => t.type === type && t.value === value - 1);
    const hasNext = allTiles.some(t => t.type === type && t.value === value + 1);
    const hasPrev2 = allTiles.some(t => t.type === type && t.value === value - 2);
    const hasNext2 = allTiles.some(t => t.type === type && t.value === value + 2);
    
    return (hasPrev && hasNext) || (hasPrev && hasPrev2) || (hasNext && hasNext2);
}

// 辅助函数：检查是否能与某张牌形成刻子
function canFormPungWithTile(allTiles, type, value) {
    const count = allTiles.filter(t => t.type === type && t.value === value).length;
    return count >= 2; // 已经有2张，再来一张就能形成刻子
}

function analyzeRealWaits(allTiles) {
    const waits = [];
    const tiles = [...allTiles];
    
    // 移除花牌
    const filteredTiles = tiles.filter(tile => tile.type !== TILE_TYPES.FLOWERS);
    
    // 分析所有可能的听牌
    // 这里需要实现完整的麻将听牌分析算法
    
    // 简化版：分析单吊、对碰、边张、卡窿、多面听等情况
    const tileCounts = {};
    filteredTiles.forEach(tile => {
        const key = `${tile.type}-${tile.value}`;
        tileCounts[key] = (tileCounts[key] || 0) + 1;
    });
    
    // 分析刻子听牌
    for (const key in tileCounts) {
        if (tileCounts[key] === 2) {
            const [type, value] = key.split('-');
            waits.push({ type, value: parseInt(value) }); // 对碰听牌
        }
    }
    
    // 分析顺子听牌（数牌）
    const numberTiles = filteredTiles.filter(tile => 
        tile.type !== TILE_TYPES.HONORS && tile.type !== TILE_TYPES.FLOWERS
    );
    
    const tilesBySuit = {};
    numberTiles.forEach(tile => {
        if (!tilesBySuit[tile.type]) {
            tilesBySuit[tile.type] = [];
        }
        tilesBySuit[tile.type].push(tile.value);
    });
    
    // 分析每个花色的听牌
    for (const suit in tilesBySuit) {
        const values = [...new Set(tilesBySuit[suit])].sort((a, b) => a - b);
        
        for (let i = 0; i < values.length; i++) {
            const value = values[i];
            
            // 检查边张听牌（12听3，89听7）
            if (value === 1 && values.includes(2) && !values.includes(3)) {
                waits.push({ type: suit, value: 3 });
            }
            if (value === 2 && values.includes(1) && !values.includes(3)) {
                waits.push({ type: suit, value: 3 });
            }
            if (value === 8 && values.includes(9) && !values.includes(7)) {
                waits.push({ type: suit, value: 7 });
            }
            if (value === 9 && values.includes(8) && !values.includes(7)) {
                waits.push({ type: suit, value: 7 });
            }
            
            // 检查卡窿听牌（13听2，24听3，35听4，46听5，57听6，68听7，79听8）
            if (i < values.length - 1 && values[i + 1] === value + 2) {
                waits.push({ type: suit, value: value + 1 });
            }
            
            // 检查多面听牌（如4567听3、5、8）
            if (i < values.length - 2) {
                // 连续三张牌（如456）
                if (values[i + 1] === value + 1 && values[i + 2] === value + 2) {
                    // 可以听value-1或value+3
                    if (value > 1) waits.push({ type: suit, value: value - 1 });
                    if (value < 7) waits.push({ type: suit, value: value + 3 });
                }
            }
            
            // 检查四连牌（如4567）
            if (i < values.length - 3 && 
                values[i + 1] === value + 1 && 
                values[i + 2] === value + 2 && 
                values[i + 3] === value + 3) {
                // 听3、5、8
                if (value > 1) waits.push({ type: suit, value: value - 1 });
                waits.push({ type: suit, value: value + 1 });
                if (value < 6) waits.push({ type: suit, value: value + 4 });
            }
        }
    }
    
    // 去重
    const uniqueWaits = [];
    const seen = new Set();
    
    waits.forEach(wait => {
        const key = `${wait.type}-${wait.value}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueWaits.push(wait);
        }
    });

    return uniqueWaits;
}

// 改进分析和牌前的手牌听牌情况
function analyzeWaitsBeforeWin(handTiles, chows, pungs, openKongs, concealedKongs) {
    const waits = [];
    const tiles = [...handTiles];
    

    // 移除花牌
    const filteredTiles = tiles.filter(tile => tile.type !== TILE_TYPES.FLOWERS);

    // 获取所有已暴露的牌（吃、碰、明槓、暗槓）
    const meldedTiles = [];
    chows.forEach(chow => meldedTiles.push(...chow.tiles));
    pungs.forEach(pung => meldedTiles.push(...Array(3).fill({ type: pung.type, value: pung.value })));
    openKongs.forEach(kong => meldedTiles.push(...Array(4).fill({ type: kong.type, value: kong.value })));
    concealedKongs.forEach(kong => meldedTiles.push(...Array(4).fill({ type: kong.type, value: kong.value })));

    // 检查手牌是否接近和牌（16张牌）
    if (filteredTiles.length !== 16) return waits;

    // 尝试每种可能的和牌
    const allPossibleTiles = [];
    for (const type of [TILE_TYPES.CHARACTERS, TILE_TYPES.DOTS, TILE_TYPES.BAMBOOS, TILE_TYPES.HONORS]) {
        const maxValue = type === TILE_TYPES.HONORS ? 7 : 9;
        for (let value = 1; value <= maxValue; value++) {
            allPossibleTiles.push({ type, value });
        }
    }

    // 检查每张可能的牌是否能使手牌和牌
    for (const tile of allPossibleTiles) {
        const testHand = [...filteredTiles, tile];
        if (canWin(testHand, chows, pungs, openKongs, concealedKongs)) {
            waits.push(tile);
        }
    }

    // 去重
    const uniqueWaits = [];
    const seen = new Set();
    waits.forEach(wait => {
        const key = `${wait.type}-${wait.value}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueWaits.push(wait);
        }
    });
    
    return uniqueWaits;
}

// 检查和牌
function canWin(tiles, chows, pungs, openKongs, concealedKongs) {
    if (tiles.length !== 17) return false;

    // 检查是否能组成4组（顺子/刻子/槓）加一对
    const sortedTiles = [...tiles].sort((a, b) => {
        if (a.type !== b.type) return a.type.localeCompare(b.type);
        return a.value - b.value;
    });

    // 获取所有已暴露的组合
    const melds = [
        ...chows.map(chow => ({ type: chow.type, values: chow.tiles.map(t => t.value).sort((a, b) => a - b) })),
        ...pungs.map(pung => ({ type: pung.type, value: pung.value })),
        ...openKongs.map(kong => ({ type: kong.type, value: kong.value })),
        ...concealedKongs.map(kong => ({ type: kong.type, value: kong.value }))
    ];

    const meldCount = melds.length;

    // 计算还需要的手牌组合数
    const neededMelds = 5 - meldCount; // 5个组合加一对
    const neededTilesForMelds = neededMelds * 3;
    const remainingTiles = sortedTiles.filter(tile =>
        !melds.some(meld =>
            (meld.values && meld.type === tile.type && meld.values.includes(tile.value)) ||
            (meld.value && meld.type === tile.type && meld.value === tile.value)
        )
    );

    // 检查剩余牌是否能组成需要的组合数加一对
    if (remainingTiles.length !== neededTilesForMelds + 2) return false;

    // 尝试找出将牌
    for (let i = 0; i < remainingTiles.length - 1; i++) {
        if (remainingTiles[i].type === remainingTiles[i + 1].type &&
            remainingTiles[i].value === remainingTiles[i + 1].value) {
            // 找到一对将牌
            const pair = [remainingTiles[i], remainingTiles[i + 1]];
            const restTiles = remainingTiles.filter((t, index) => index !== i && index !== i + 1);

            // 检查剩余牌是否能组成需要的顺子或刻子
            if (canFormMelds(restTiles, neededMelds)) {
                return true;
            }
        }
    }

    return false;
}