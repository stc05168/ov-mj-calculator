// 應用狀態
const state = {
    handTiles: [], // 手牌
    flowers: [], // 花牌
    chows: [], // 吃的牌組
    pungs: [], // 碰的牌組
    openKongs: [], // 明槓的牌組
    concealedKongs: [], // 暗槓的牌組
    winningTile: null, // 糊牌
    seatWind: '東', // 座位風位
    roundWind: '東', // 圈風
    isDealer: false, // 是否莊家
    dealerCount: 0, // 連莊次數
    isSelfDraw: false, // 是否自摸
    history: [] // 操作歷史
};

// 初始化應用
function initApp() {
    renderTiles();
    renderFlowers();
    setupEventListeners();
    updateUI();
}

// 渲染普通牌型選擇區（按類型分組）
function renderTiles() {
    const charactersContainer = document.getElementById('characters-container');
    const bamboosContainer = document.getElementById('bamboos-container');
    const dotsContainer = document.getElementById('dots-container');
    const honorsContainer = document.getElementById('honors-container');
    
    charactersContainer.innerHTML = '';
    bamboosContainer.innerHTML = '';
    dotsContainer.innerHTML = '';
    honorsContainer.innerHTML = '';
    
    ALL_TILES.forEach(tile => {
        const tileElement = document.createElement('div');
        tileElement.className = `tile ${tile.cssClass}`;
        tileElement.textContent = tile.display;
        tileElement.dataset.type = tile.type;
        tileElement.dataset.value = tile.value;
        
        tileElement.addEventListener('click', () => selectTile(tile));
        
        switch(tile.type) {
            case TILE_TYPES.CHARACTERS:
                charactersContainer.appendChild(tileElement);
                break;
            case TILE_TYPES.BAMBOOS:
                bamboosContainer.appendChild(tileElement);
                break;
            case TILE_TYPES.DOTS:
                dotsContainer.appendChild(tileElement);
                break;
            case TILE_TYPES.HONORS:
                honorsContainer.appendChild(tileElement);
                break;
        }
    });
}

// 渲染花牌選擇區
function renderFlowers() {
    const container = document.getElementById('flowers-container');
    container.innerHTML = '';
    
    FLOWER_TILES.forEach(tile => {
        const tileElement = document.createElement('div');
        tileElement.className = `tile ${tile.cssClass}`;
        tileElement.textContent = tile.display;
        tileElement.dataset.type = tile.type;
        tileElement.dataset.value = tile.value;
        
        tileElement.addEventListener('click', () => selectFlower(tile));
        container.appendChild(tileElement);
    });
}

// 設置事件監聽器
function setupEventListeners() {
    document.getElementById('chow-btn').addEventListener('click', markAsChow);
    document.getElementById('pung-btn').addEventListener('click', markAsPung);
    document.getElementById('open-kong-btn').addEventListener('click', markAsOpenKong);
    document.getElementById('concealed-kong-btn').addEventListener('click', markAsConcealedKong);
    document.getElementById('undo-btn').addEventListener('click', undoLastAction);
    document.getElementById('clear-btn').addEventListener('click', clearSelection);
    document.getElementById('seat-wind').addEventListener('change', updateSeatWind);
    document.getElementById('round-wind').addEventListener('change', updateRoundWind);
    document.getElementById('is-dealer').addEventListener('change', toggleDealerSetting);
    document.getElementById('dealer-count').addEventListener('change', updateDealerCount);
    document.getElementById('is-self-draw').addEventListener('change', updateSelfDraw);
    
    // 添加鍵盤快捷鍵
    document.addEventListener('keydown', handleKeyDown);
}

// 處理鍵盤事件
function handleKeyDown(e) {
    if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        undoLastAction();
    }
}

// 更新座位風位
function updateSeatWind(e) {
    saveStateToHistory();
    state.seatWind = e.target.value;
    calculateScore();
}

// 更新圈風
function updateRoundWind(e) {
    saveStateToHistory();
    state.roundWind = e.target.value;
    calculateScore();
}

// 切換莊家設定顯示
function toggleDealerSetting(e) {
    saveStateToHistory();
    state.isDealer = e.target.checked;
    const dealerCountContainer = document.getElementById('dealer-count-container');
    dealerCountContainer.style.display = state.isDealer ? 'block' : 'none';
    
    if (!state.isDealer) {
        state.dealerCount = 0;
    }
    
    calculateScore();
}

// 更新連莊次數
function updateDealerCount(e) {
    saveStateToHistory();
    state.dealerCount = parseInt(e.target.value);
    calculateScore();
}

// 更新自摸設定
function updateSelfDraw(e) {
    saveStateToHistory();
    state.isSelfDraw = e.target.checked;
    calculateScore();
}

// 選擇普通牌
function selectTile(tile) {
    saveStateToHistory();
    
    // 檢查是否已達到最大數量 (4張)
    const count = state.handTiles.filter(t => 
        t.type === tile.type && t.value === tile.value
    ).length;
    
    if (count >= 4) {
        alert('每種牌最多只能選擇4張');
        return;
    }
    
    // 檢查總牌數是否已達上限
    const exposedGroups = state.chows.length + state.pungs.length + state.openKongs.length + state.concealedKongs.length;
    const maxHandTiles = 16 - (exposedGroups * 3);
    
    if (state.handTiles.length >= maxHandTiles) {
        // 如果已經達到16張，自動設為糊牌
        let maxLength = state.handTiles.length + 
        (state.chows.length * 3) + 
        (state.pungs.length * 3) + 
        (state.openKongs.length * 4) + 
        (state.concealedKongs.length * 4);

        if (state.winningTile === null && getAllTiles().length === maxLength) {
            state.winningTile = {...tile};
            updateUI();
            return;
        }
        
        alert(`已有${exposedGroups}組副露，手牌最多只能有${maxHandTiles}張`);
        return;
    }
    
    // 添加牌到手牌列表
    state.handTiles.push({...tile});
    updateUI();
}

// 選擇花牌
function selectFlower(tile) {
    saveStateToHistory();
    
    // 檢查是否已經選擇了該花牌
    const alreadySelected = state.flowers.some(f => 
        f.type === tile.type && f.value === tile.value
    );
    
    if (alreadySelected) {
        alert('每種花牌只能選擇1張');
        return;
    }
    
    // 添加花牌到選擇列表
    state.flowers.push({...tile});
    updateUI();
}

// 標記為吃
function markAsChow() {
    saveStateToHistory();
    
    // 獲取選中的牌
    const selectedTiles = getSelectedTilesForChow();
    
    if (selectedTiles.length !== 3) {
        alert('請選擇3張連續的數牌進行吃');
        return;
    }
    
    // 檢查是否都是同一種花色且連續
    const firstTile = selectedTiles[0];
    const isSameType = selectedTiles.every(t => t.type === firstTile.type);
    const values = selectedTiles.map(t => t.value).sort((a, b) => a - b);
    const isSequential = (values[1] === values[0] + 1) && (values[2] === values[1] + 1);
    
    if (!isSameType || !isSequential) {
        alert('吃必須是3張同一花色且連續的牌');
        return;
    }
    
    // 檢查是否三張相同（不應該是吃）
    const allSame = selectedTiles.every(t => t.value === firstTile.value);
    if (allSame) {
        alert('三張相同的牌應該使用碰或槓');
        return;
    }
    
    // 從手牌中移除這些牌
    selectedTiles.forEach(tile => {
        const index = state.handTiles.findIndex(t => 
            t.type === tile.type && t.value === tile.value
        );
        if (index !== -1) {
            state.handTiles.splice(index, 1);
        }
    });
    
    // 添加到吃的列表
    state.chows.push({
        tiles: selectedTiles,
        type: firstTile.type
    });
    
    updateUI();
}

// 標記為碰
function markAsPung() {
    saveStateToHistory();
    
    // 獲取選中的牌
    const selectedTiles = getSelectedTiles();
    
    if (selectedTiles.length < 3) {
        alert('請選擇至少3張相同的牌進行碰');
        return;
    }
    
    // 檢查是否都是同一種牌
    const firstTile = selectedTiles[0];
    const allSame = selectedTiles.every(t => 
        t.type === firstTile.type && t.value === firstTile.value
    );
    
    if (!allSame) {
        alert('碰必須是3張相同的牌');
        return;
    }
    
    // 從手牌中移除這些牌
    selectedTiles.slice(0, 3).forEach(tile => {
        const index = state.handTiles.findIndex(t => 
            t.type === tile.type && t.value === tile.value
        );
        if (index !== -1) {
            state.handTiles.splice(index, 1);
        }
    });
    
    // 添加到碰的列表
    state.pungs.push({
        tiles: selectedTiles.slice(0, 3),
        type: firstTile.type,
        value: firstTile.value
    });
    
    updateUI();
}

// 標記為明槓
function markAsOpenKong() {
    saveStateToHistory();
    
    // 獲取選中的牌
    const selectedTiles = getSelectedTiles();
    
    if (selectedTiles.length !== 4) {
        alert('請選擇4張相同的牌進行明槓');
        return;
    }
    
    // 檢查是否都是同一種牌
    const firstTile = selectedTiles[0];
    const allSame = selectedTiles.every(t => 
        t.type === firstTile.type && t.value === firstTile.value
    );
    
    if (!allSame) {
        alert('槓必須是4張相同的牌');
        return;
    }
    
    // 從手牌中移除這些牌
    selectedTiles.forEach(tile => {
        const index = state.handTiles.findIndex(t => 
            t.type === tile.type && t.value === tile.value
        );
        if (index !== -1) {
            state.handTiles.splice(index, 1);
        }
    });
    
    // 添加到明槓的列表
    state.openKongs.push({
        tiles: selectedTiles,
        type: firstTile.type,
        value: firstTile.value
    });
    
    updateUI();
}

// 標記為暗槓
function markAsConcealedKong() {
    saveStateToHistory();
    
    // 獲取選中的牌
    const selectedTiles = getSelectedTiles();
    
    if (selectedTiles.length !== 4) {
        alert('請選擇4張相同的牌進行暗槓');
        return;
    }
    
    // 檢查是否都是同一種牌
    const firstTile = selectedTiles[0];
    const allSame = selectedTiles.every(t => 
        t.type === firstTile.type && t.value === firstTile.value
    );
    
    if (!allSame) {
        alert('槓必須是4張相同的牌');
        return;
    }
    
    // 從手牌中移除這些牌
    selectedTiles.forEach(tile => {
        const index = state.handTiles.findIndex(t => 
            t.type === tile.type && t.value === tile.value
        );
        if (index !== -1) {
            state.handTiles.splice(index, 1);
        }
    });
    
    // 添加到暗槓的列表
    state.concealedKongs.push({
        tiles: selectedTiles,
        type: firstTile.type,
        value: firstTile.value
    });
    
    updateUI();
}

// 獲取選中的牌（用於碰、槓）
function getSelectedTiles() {
    const counts = {};
    const handTiles = [...state.handTiles];
    
    // 統計手牌中每種牌的數量
    handTiles.forEach(tile => {
        const key = `${tile.type}-${tile.value}`;
        counts[key] = (counts[key] || 0) + 1;
    });
    
    // 尋找最多張的相同牌
    let maxCount = 0;
    let selectedKey = null;
    
    for (const key in counts) {
        if (counts[key] >= 3 && counts[key] > maxCount) {
            maxCount = counts[key];
            selectedKey = key;
        }
    }
    
    if (selectedKey) {
        const [type, value] = selectedKey.split('-');
        return handTiles.filter(t => 
            t.type === type && t.value === parseInt(value)
        ).slice(0, maxCount);
    }
    
    return [];
}

// 獲取選中的牌（用於吃）
function getSelectedTilesForChow() {
    // 返回最近添加的3張牌
    return state.handTiles.slice(-3);
}

// 保存當前狀態到歷史記錄
function saveStateToHistory() {
    state.history.push(JSON.parse(JSON.stringify({
        handTiles: state.handTiles,
        flowers: state.flowers,
        chows: state.chows,
        pungs: state.pungs,
        openKongs: state.openKongs,
        concealedKongs: state.concealedKongs,
        winningTile: state.winningTile
    })));
    
    // 限制歷史記錄長度
    if (state.history.length > 50) {
        state.history.shift();
    }
}

// 復原上一次操作
function undoLastAction() {
    if (state.history.length > 0) {
        const previousState = state.history.pop();
        
        state.handTiles = previousState.handTiles;
        state.flowers = previousState.flowers;
        state.chows = previousState.chows;
        state.pungs = previousState.pungs;
        state.openKongs = previousState.openKongs;
        state.concealedKongs = previousState.concealedKongs;
        state.winningTile = previousState.winningTile;
        
        updateUI();
    }
}

// 清除選擇
function clearSelection() {
    saveStateToHistory();
    
    state.handTiles = [];
    state.flowers = [];
    state.chows = [];
    state.pungs = [];
    state.openKongs = [];
    state.concealedKongs = [];
    state.winningTile = null;
    updateUI();
}

// 更新UI
function updateUI() {
    updateTileCount();
    updateHandTilesDisplay();
    updateFlowersDisplay();
    updateExposedTilesDisplay();
    updateWinningTileDisplay();
    updateButtonStates();
    calculateScore();
}

// 更新牌數顯示
function updateTileCount() {
    const exposedGroups = state.chows.length + state.pungs.length + state.openKongs.length + state.concealedKongs.length;
    const maxHandTiles = 16 - (exposedGroups * 3);
    document.getElementById('tile-count').textContent = 
        `(${state.handTiles.length}/${maxHandTiles})`;
}

// 更新手牌顯示
function updateHandTilesDisplay() {
    const container = document.getElementById('hand-tiles');
    container.innerHTML = '';
    
    state.handTiles.forEach(tile => {
        const tileElement = document.createElement('div');
        tileElement.className = `selected-tile ${tile.cssClass}`;
        tileElement.textContent = tile.display;
        container.appendChild(tileElement);
    });
}

// 更新花牌顯示
function updateFlowersDisplay() {
    const container = document.getElementById('selected-flowers');
    container.innerHTML = '';
    
    state.flowers.forEach(tile => {
        const tileElement = document.createElement('div');
        tileElement.className = `selected-tile ${tile.cssClass}`;
        tileElement.textContent = tile.display;
        container.appendChild(tileElement);
    });
}

// 更新副露區顯示
function updateExposedTilesDisplay() {
    const container = document.getElementById('exposed-tiles');
    container.innerHTML = '';
    
    // 顯示吃的牌
    state.chows.forEach(chow => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'exposed-tile-group';
        
        const label = document.createElement('span');
        label.className = 'exposed-label';
        label.textContent = '吃:';
        groupDiv.appendChild(label);
        
        chow.tiles.forEach(tile => {
            const tileElement = document.createElement('div');
            tileElement.className = `exposed-tile ${tile.cssClass}`;
            tileElement.textContent = tile.display;
            groupDiv.appendChild(tileElement);
        });
        
        container.appendChild(groupDiv);
    });
    
    // 顯示碰的牌
    state.pungs.forEach(pung => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'exposed-tile-group';
        
        const label = document.createElement('span');
        label.className = 'exposed-label';
        label.textContent = '碰:';
        groupDiv.appendChild(label);
        
        pung.tiles.forEach(tile => {
            const tileElement = document.createElement('div');
            tileElement.className = `exposed-tile ${tile.cssClass}`;
            tileElement.textContent = tile.display;
            groupDiv.appendChild(tileElement);
        });
        
        container.appendChild(groupDiv);
    });
    
    // 顯示明槓的牌
    state.openKongs.forEach(kong => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'exposed-tile-group';
        
        const label = document.createElement('span');
        label.className = 'exposed-label';
        label.textContent = '明槓:';
        groupDiv.appendChild(label);
        
        kong.tiles.forEach(tile => {
            const tileElement = document.createElement('div');
            tileElement.className = `exposed-tile ${tile.cssClass}`;
            tileElement.textContent = tile.display;
            groupDiv.appendChild(tileElement);
        });
        
        container.appendChild(groupDiv);
    });
    
    // 顯示暗槓的牌
    state.concealedKongs.forEach(kong => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'exposed-tile-group';
        
        const label = document.createElement('span');
        label.className = 'exposed-label';
        label.textContent = '暗槓:';
        groupDiv.appendChild(label);
        
        kong.tiles.forEach(tile => {
            const tileElement = document.createElement('div');
            tileElement.className = `exposed-tile ${tile.cssClass}`;
            tileElement.textContent = tile.display;
            groupDiv.appendChild(tileElement);
        });
        
        container.appendChild(groupDiv);
    });
}

// 更新糊牌顯示
function updateWinningTileDisplay() {
    const container = document.getElementById('winning-tile');
    container.innerHTML = '';
    
    if (state.winningTile) {
        const tileElement = document.createElement('div');
        tileElement.className = `selected-tile winning-tile ${state.winningTile.cssClass}`;
        tileElement.textContent = state.winningTile.display;
        container.appendChild(tileElement);
    }
}

// 更新按鈕狀態
function updateButtonStates() {
    const selectedTiles = getSelectedTiles();
    const selectedTilesForChow = getSelectedTilesForChow();
    const chowBtn = document.getElementById('chow-btn');
    const pungBtn = document.getElementById('pung-btn');
    const openKongBtn = document.getElementById('open-kong-btn');
    const concealedKongBtn = document.getElementById('concealed-kong-btn');
    
    // 檢查是否可以吃（三張連續的數牌，且不是三張相同的）
    let canChow = false;
    if (selectedTilesForChow.length === 3) {
        const firstTile = selectedTilesForChow[0];
        const isSameType = selectedTilesForChow.every(t => t.type === firstTile.type);
        const values = selectedTilesForChow.map(t => t.value).sort((a, b) => a - b);
        const isSequential = (values[1] === values[0] + 1) && (values[2] === values[1] + 1);
        const allSame = selectedTilesForChow.every(t => t.value === firstTile.value);
        
        canChow = isSameType && isSequential && !allSame;
    }
    
    // 檢查是否可以碰或槓
    let canPung = selectedTiles.length >= 3;
    let canKong = selectedTiles.length === 4;
    
    chowBtn.disabled = !canChow;
    pungBtn.disabled = !canPung;
    openKongBtn.disabled = !canKong;
    concealedKongBtn.disabled = !canKong;
}

// 計算番數
function calculateScore() {
    const statusMessage = document.getElementById('status-message');
    statusMessage.innerHTML = '';
    
    // 檢查總牌數是否達到要求
    // 计算杠的数量
    const kongCount = state.openKongs.length + state.concealedKongs.length;
    
    // 检查总牌数是否达到要求 (17张基本牌 + 杠的数量)
    const totalTiles = state.handTiles.length + 
                      (state.chows.length * 3) + 
                      (state.pungs.length * 3) + 
                      (state.openKongs.length * 4) + 
                      (state.concealedKongs.length * 4) + 
                      (state.winningTile ? 1 : 0);
    
    const requiredTiles = 17 + kongCount;

    if (totalTiles !== requiredTiles) {
        statusMessage.innerHTML = `<div class="status-message">請選擇足夠的牌（目前: ${totalTiles}/${requiredTiles}）</div>`;
        document.getElementById('hand-types').innerHTML = '';
        document.getElementById('score-display').textContent = '總番數: 0';
        return;
    }
    
    const handTypes = detectHandTypes();
    let totalScore = 0;
    
    // 顯示檢測到的牌型
    const handTypesContainer = document.getElementById('hand-types');
    handTypesContainer.innerHTML = '';
    
    handTypes.forEach(hand => {
        totalScore += hand.score;
        
        const handElement = document.createElement('div');
        handElement.className = 'hand-type';
        handElement.textContent = `${hand.name} (${hand.score}番)`;
        handTypesContainer.appendChild(handElement);
    });
        
    // 連莊番數
    if (state.isDealer && state.dealerCount > 0) {
        const dealerScore = 2 * state.dealerCount + 1;
        totalScore += dealerScore;
        const dealerElement = document.createElement('div');
        dealerElement.className = 'hand-type';
        dealerElement.textContent = `連莊${state.dealerCount}次 (${dealerScore}番)`;
        handTypesContainer.appendChild(dealerElement);
    }
    
    // 顯示總番數
    document.getElementById('score-display').textContent = 
        `總番數: ${totalScore}`;
}

// 獲取所有牌（包括手牌、吃、碰、槓和糊牌）
function getAllTiles() {
    const allTiles = [...state.handTiles];
    
    // 添加吃的牌
    state.chows.forEach(chow => {
        allTiles.push(...chow.tiles);
    });
    
    // 添加碰的牌
    state.pungs.forEach(pung => {
        allTiles.push(...pung.tiles);
    });
    
    // 添加明槓的牌
    state.openKongs.forEach(kong => {
        allTiles.push(...kong.tiles);
    });
    
    // 添加暗槓的牌
    state.concealedKongs.forEach(kong => {
        allTiles.push(...kong.tiles);
    });
    
    // 添加糊牌
    if (state.winningTile) {
        allTiles.push(state.winningTile);
    }
    
    return allTiles;
}

// 初始化應用
window.addEventListener('DOMContentLoaded', initApp);