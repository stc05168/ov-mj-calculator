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
    setupDragAndDrop();
    updateUI();
}

// 设置拖放事件监听
function setupDragAndDrop() {
    // 設置所有牌的拖拽屬性
    const allTiles = document.querySelectorAll('.tile');
    allTiles.forEach(tile => {
        tile.setAttribute('draggable', 'true');
        setupDragEvents(tile);
    });
    
    // 設置放置區域
    const handTilesArea = document.getElementById('hand-tiles');
    const winningTileArea = document.getElementById('winning-tile');
    const trashIcon = document.getElementById('trash-icon');
    
    // 設置放置區域事件
    setupDropZone(handTilesArea, handleHandTilesDrop);
    setupDropZone(winningTileArea, handleWinningTileDrop);
    setupDropZone(trashIcon, handleTrashDrop);
    
    // 為已存在的牌添加拖拽屬性
    updateDraggableTiles();
}

function setupDragEvents(element) {
    // 移除舊的事件監聽器，避免重複綁定
    element.removeEventListener('dragstart', handleDragStart);
    element.removeEventListener('dragend', handleDragEnd);
    element.removeEventListener('touchstart', handleTouchStart);
    element.removeEventListener('touchmove', handleTouchMove);
    element.removeEventListener('touchend', handleTouchEnd);
    element.removeEventListener('touchcancel', handleTouchEnd);
    element.removeEventListener('click', handleTileClick);

    // 添加滑鼠事件
    element.addEventListener('dragstart', handleDragStart);
    element.addEventListener('dragend', handleDragEnd);

    // 添加觸摸事件
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });
    element.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    // 添加點擊事件（僅適用於選擇區的牌）
    if (element.classList.contains('tile') && !element.classList.contains('selected-tile')) {
        element.addEventListener('click', handleTileClick);
    }

    console.log('Drag and click events set up for element:', element, 'Classes:', element.className, 'Source:', element.dataset.source);
}

function setupDropZone(zone, dropHandler) {
    // 移除舊的事件監聽器
    zone.removeEventListener('dragover', handleDragOver);
    zone.removeEventListener('drop', dropHandler);
    zone.removeEventListener('dragenter', handleDragEnter);
    zone.removeEventListener('dragleave', handleDragLeave);
    zone.removeEventListener('touchmove', handleTouchMoveDropZone);
    zone.removeEventListener('touchend', handleTouchEndDropZone);

    // 添加滑鼠事件
    zone.addEventListener('dragover', handleDragOver);
    zone.addEventListener('drop', dropHandler);
    zone.addEventListener('dragenter', handleDragEnter);
    zone.addEventListener('dragleave', handleDragLeave);

    // 添加觸摸事件
    zone.addEventListener('touchstart', (e) => {
        if (e.target.classList.contains('selected-tile')) {
            e.stopPropagation();
        }
    }, { passive: false });
    zone.addEventListener('touchmove', handleTouchMoveDropZone, { passive: false });
    zone.addEventListener('touchend', (e) => handleTouchEndDropZone(e, dropHandler, zone), { passive: false });

    console.log('Drop zone events set up for:', zone.id);
}

let dropZonesInitialized = false;
document.addEventListener('DOMContentLoaded', () => {
    initializeTiles();

    if (dropZonesInitialized) {
        console.log('Drop zones already initialized, skipping');
        return;
    }
    dropZonesInitialized = true;

    const handTilesZone = document.getElementById('hand-tiles');
    const winningTileZone = document.getElementById('winning-tile');
    const trashZone = document.getElementById('trash-icon');

    if (handTilesZone) {
        setupDropZone(handTilesZone, handleHandTilesDrop);
    } else {
        console.error('Hand tiles element not found');
    }

    if (winningTileZone) {
        setupDropZone(winningTileZone, handleWinningTileDrop);
    } else {
        console.error('Winning tile element not found');
    }

    if (trashZone) {
        setupDropZone(trashZone, handleTrashDrop);
    } else {
        console.error('Trash icon element not found');
    }
});

// 點擊選擇牌到手牌區
function handleTileClick(e) {
    const element = e.target;
    if (!element.classList.contains('tile') || element.classList.contains('selected-tile')) {
        return;
    }

    const type = element.dataset.type;
    const value = parseInt(element.dataset.value);
    const source = element.dataset.source;
    const display = element.textContent;

    if (source === 'flowers-container') {
        const tile = FLOWER_TILES.find(t => t.type === type && t.value === value);
        if (tile) {
            state.flowers.push({ ...tile });
            showStatusMessage('花牌已加入', 'info');
        }
    } else {
        const tile = ALL_TILES.find(t => t.type === type && t.value === value);
        if (tile) {
            state.handTiles.push({ ...tile });
            showStatusMessage('牌已加入手牌', 'info');
        }
    }

    updateUI();
}

// 触摸开始事件处理
function handleTouchStart(e) {
    if (e.cancelable) {
        e.preventDefault();
    } else {
        console.warn('touchstart event is not cancelable');
    }

    const touch = e.touches[0];
    let element = e.target;

    // 確保找到正確的牌元素
    if (!element.classList.contains('tile') && !element.classList.contains('selected-tile')) {
        element = element.closest('.tile, .selected-tile');
        if (!element) {
            console.warn('No valid drag element found:', e.target);
            return;
        }
    }

    if (!element.dataset.source) {
        console.warn('Element missing data-source:', element.outerHTML);
        element.dataset.source = element.closest('[id]')?.id || 'unknown';
    }

    element._dragData = {
        type: element.dataset.type,
        value: parseInt(element.dataset.value),
        source: element.dataset.source,
        display: element.textContent,
        startX: touch.clientX,
        startY: touch.clientY,
        isDragging: false,
        touchStartTime: Date.now() // 記錄觸摸開始時間
    };

    console.log('Touch start:', element._dragData, 'Element:', element.outerHTML);
    element.classList.add('touch-active');

    // 設置定時器以檢測長按
    element._longPressTimeout = setTimeout(() => {
        if (element._dragData) {
            element._dragData.isDragging = true;
            const dragImage = element.cloneNode(true);
            dragImage.style.position = 'fixed';
            dragImage.style.zIndex = '10000';
            dragImage.style.opacity = '0.8';
            dragImage.style.transform = 'scale(1.2)';
            dragImage.classList.add('dragging');
            document.body.appendChild(dragImage);
            element._dragImage = dragImage;
            console.log('Long press detected, drag started:', dragImage);
        }
    }, 300); // 300ms 為長按閾值
}

function handleTouchMove(e) {
    if (e.cancelable) {
        e.preventDefault();
    } else {
        console.warn('touchmove event is not cancelable');
    }

    const touch = e.touches[0];
    const element = e.target;

    console.log('Touch move triggered:', touch.clientX, touch.clientY);

    if (!element._dragData) {
        console.warn('No drag data found during touch move');
        return;
    }

    const dragData = element._dragData;
    const deltaX = Math.abs(touch.clientX - dragData.startX);
    const deltaY = Math.abs(touch.clientY - dragData.startY);

    if (!dragData.isDragging && (deltaX > 3 || deltaY > 3)) {
        dragData.isDragging = true;
        clearTimeout(element._longPressTimeout); // 清除長按定時器
        const dragImage = element.cloneNode(true);
        dragImage.style.position = 'fixed';
        dragImage.style.zIndex = '10000';
        dragImage.style.opacity = '0.8';
        dragImage.style.transform = 'scale(1.2)';
        dragImage.classList.add('dragging');
        document.body.appendChild(dragImage);
        element._dragImage = dragImage;
        console.log('Drag image created:', dragImage);
    }

    if (dragData.isDragging) {
        updateDragImagePosition(touch.clientX, touch.clientY, element._dragImage);
    }
}

// 触摸结束事件处理
function handleTouchEnd(e) {
    const element = e.target;
    console.log('Touch end triggered for element:', element);

    // 清除長按定時器
    if (element._longPressTimeout) {
        clearTimeout(element._longPressTimeout);
        delete element._longPressTimeout;
    }

    if (element._dragData && element._dragData.isDragging) {
        console.log('Calling handleTouchEndDropZone');
        const touch = e.changedTouches[0];
        if (touch) {
            const targetZone = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('#hand-tiles, #winning-tile, #trash-icon');
            if (targetZone) {
                const dropHandler = targetZone.id === 'hand-tiles' ? handleHandTilesDrop :
                                 targetZone.id === 'winning-tile' ? handleWinningTileDrop :
                                 handleTrashDrop;
                handleTouchEndDropZone(e, dropHandler, targetZone);
            } else {
                console.warn('No valid drop zone found at touch end');
            }
        }
    } else if (element._dragData && !element.classList.contains('selected-tile')) {
        // 快速觸碰（非拖曳）模擬點擊
        const touchDuration = Date.now() - element._dragData.touchStartTime;
        if (touchDuration < 300) {
            handleTileClick({ target: element });
        }
    }

    // 清理拖曳圖像和狀態
    if (element._dragImage && element._dragImage.parentNode) {
        element._dragImage.parentNode.removeChild(element._dragImage);
    }
    element.classList.remove('touch-active');
    delete element._dragData;
    delete element._dragImage;
}

function handleTouchMoveDropZone(e) {
    const draggingElement = document.querySelector('.dragging');
    if (draggingElement) {
        e.preventDefault();
    }
}

function handleTouchEndDropZone(e, dropHandler, targetZone) {
    if (e.cancelable) {
        e.preventDefault();
    } else {
        console.warn('touchend event is not cancelable, possible scrolling interference');
    }

    const draggingElement = document.querySelector('.dragging');
    if (!draggingElement) {
        console.warn('No dragging element found');
        return;
    }

    const touch = e.changedTouches[0];
    if (!touch) {
        console.warn('No touch data found');
        return;
    }

    console.log('Touch end drop zone:', touch.clientX, touch.clientY);

    const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!targetElement) {
        console.warn('No element found at touch point:', touch.clientX, touch.clientY);
        return;
    }

    if (!targetZone) {
        targetZone = targetElement.closest('#hand-tiles, #winning-tile, #trash-icon');
    }
    if (!targetZone) {
        console.warn('No valid drop zone found at:', touch.clientX, touch.clientY);
        return;
    }

    console.log('Target zone:', targetZone.id);

    const originalElement = document.querySelector('.tile.touch-active, .selected-tile.touch-active');
    if (!originalElement || !originalElement._dragData) {
        console.warn('No active drag element or drag data found');
        return;
    }

    const dragData = originalElement._dragData;
    console.log('Dropping to zone:', targetZone.id, 'with data:', dragData);

    const dropEvent = new CustomEvent('drop', { bubbles: true });
    dropEvent.dataTransfer = {
        getData: () => JSON.stringify(dragData)
    };
    dropEvent.currentTarget = targetZone;

    try {
        dropHandler.call(targetZone, dropEvent);
    } catch (error) {
        console.error('Error in drop handler:', error);
        showStatusMessage('放置失敗', 'error');
    }
}

function updateDragImagePosition(x, y, dragImage) {
    if (dragImage) {
        dragImage.style.left = (x - 15) + 'px';
        dragImage.style.top = (y - 20) + 'px';
    }
}

function preventScrollDuringDrag(e) {
    const draggingElement = document.querySelector('.dragging');
    if (draggingElement) {
        e.preventDefault();
    }
}

function handleDragStart(e) {
    const tileElement = e.target;
    const type = tileElement.dataset.type;
    const value = parseInt(tileElement.dataset.value);
    const source = tileElement.dataset.source || tileElement.parentElement.id;
    const display = tileElement.textContent;
    
    e.dataTransfer.setData('application/json', JSON.stringify({
        type: type,
        value: value,
        source: source,
        display: display
    }));
    
    e.dataTransfer.effectAllowed = 'move';
    
    setTimeout(() => {
        tileElement.classList.add('dragging');
    }, 0);
}

function handleDragEnd(e) {
    const draggingElements = document.querySelectorAll('.dragging');
    draggingElements.forEach(el => {
        el.classList.remove('dragging');
    });
}

document.addEventListener('dragend', (e) => {
    const draggingElements = document.querySelectorAll('.dragging');
    draggingElements.forEach(el => {
        el.classList.remove('dragging');
    });
});

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
    e.preventDefault();
    if (e.currentTarget.id === 'trash-icon' || 
        e.currentTarget.id === 'hand-tiles' || 
        e.currentTarget.id === 'winning-tile') {
        e.currentTarget.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    e.preventDefault();
    if (e.currentTarget.id === 'trash-icon' || 
        e.currentTarget.id === 'hand-tiles' || 
        e.currentTarget.id === 'winning-tile') {
        e.currentTarget.classList.remove('drag-over');
    }
}

function showStatusMessage(message, type = 'info') {
    const statusMessage = document.getElementById('status-message');
    statusMessage.innerHTML = `<div class="status-message">${message}</div>`;
}

function handleHandTilesDrop(e) {
    e.preventDefault();
    const data = JSON.parse(e.dataTransfer.getData('application/json'));
    console.log('Dropped to hand tiles:', data);

    if (data.source === 'hand-tiles') {
        console.log('Tile already in hand, no action needed');
        return;
    }

    if (data.source === 'winning-tile') {
        state.winningTile = null;
        state.handTiles.push({
            type: data.type,
            value: data.value,
            display: data.display,
            cssClass: getTileCssClass(data.type)
        });
    } else {
        const tile = ALL_TILES.find(t => t.type === data.type && t.value === data.value) ||
                     FLOWER_TILES.find(t => t.type === data.type && t.value === data.value);
        if (tile) {
            state.handTiles.push({ ...tile });
        }
    }

    updateUI();
}

function handleWinningTileDrop(e) {
    e.preventDefault();
    const data = JSON.parse(e.dataTransfer.getData('application/json'));
    console.log('Dropped to winning tile:', data);

    if (state.winningTile) {
        console.log('Winning tile already set, moving existing to hand');
        state.handTiles.push(state.winningTile);
        state.winningTile = null;
    }

    if (data.source !== 'winning-tile') {
        state.winningTile = {
            type: data.type,
            value: data.value,
            display: data.display,
            cssClass: getTileCssClass(data.type)
        };

        if (data.source === 'hand-tiles') {
            const index = state.handTiles.findIndex(t => 
                t.type === data.type && t.value === data.value
            );
            if (index !== -1) {
                state.handTiles.splice(index, 1);
            }
        }
    }

    updateUI();
}

function handleTrashDrop(e) {
    e.preventDefault();
    const data = JSON.parse(e.dataTransfer.getData('application/json'));
    console.log('Dropped to trash:', data);

    if (data.source === 'hand-tiles') {
        const index = state.handTiles.findIndex(t => 
            t.type === data.type && t.value === data.value
        );
        if (index !== -1) {
            state.handTiles.splice(index, 1);
        }
    } else if (data.source === 'winning-tile') {
        state.winningTile = null;
    }

    updateUI();
}

function getTileCssClass(type) {
    switch(type) {
        case TILE_TYPES.CHARACTERS: return 'character';
        case TILE_TYPES.BAMBOOS: return 'bamboo';
        case TILE_TYPES.DOTS: return 'dot';
        case TILE_TYPES.HONORS: return 'honor';
        case TILE_TYPES.FLOWERS: return 'flower';
        default: return '';
    }
}

function renderTiles() {
    const containers = {
        'characters-container': ALL_TILES.filter(t => t.type === TILE_TYPES.CHARACTERS),
        'bamboos-container': ALL_TILES.filter(t => t.type === TILE_TYPES.BAMBOOS),
        'dots-container': ALL_TILES.filter(t => t.type === TILE_TYPES.DOTS),
        'honors-container': ALL_TILES.filter(t => t.type === TILE_TYPES.HONORS)
    };

    for (const [containerId, tiles] of Object.entries(containers)) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = '';
            tiles.forEach(tile => {
                const tileElement = document.createElement('div');
                tileElement.className = `tile ${tile.cssClass}`;
                tileElement.textContent = tile.display;
                tileElement.dataset.type = tile.type;
                tileElement.dataset.value = tile.value;
                tileElement.dataset.source = containerId;
                tileElement.setAttribute('draggable', 'true');
                container.appendChild(tileElement);
                setupDragEvents(tileElement);
            });
        }
    }
}

function renderFlowers() {
    const container = document.getElementById('flowers-container');
    if (container) {
        container.innerHTML = '';
        FLOWER_TILES.forEach(tile => {
            const tileElement = document.createElement('div');
            tileElement.className = `tile ${tile.cssClass}`;
            tileElement.textContent = tile.display;
            tileElement.dataset.type = tile.type;
            tileElement.dataset.value = tile.value;
            tileElement.dataset.source = 'flowers-container';
            tileElement.setAttribute('draggable', 'true');
            container.appendChild(tileElement);
            setupDragEvents(tileElement);
        });
    }
}

function setupEventListeners() {
    document.getElementById('chow-btn').addEventListener('click', addChow);
    document.getElementById('pung-btn').addEventListener('click', addPung);
    document.getElementById('open-kong-btn').addEventListener('click', addOpenKong);
    document.getElementById('concealed-kong-btn').addEventListener('click', addConcealedKong);
    document.getElementById('undo-btn').addEventListener('click', undoLastAction);
    document.getElementById('clear-btn').addEventListener('click', clearSelection);

    document.getElementById('seat-wind').addEventListener('change', (e) => {
        state.seatWind = e.target.value;
        calculateScore();
    });

    document.getElementById('round-wind').addEventListener('change', (e) => {
        state.roundWind = e.target.value;
        calculateScore();
    });

    document.getElementById('is-dealer').addEventListener('change', (e) => {
        state.isDealer = e.target.checked;
        calculateScore();
    });

    document.getElementById('dealer-count').addEventListener('change', (e) => {
        state.dealerCount = parseInt(e.target.value);
        calculateScore();
    });

    document.getElementById('is-self-draw').addEventListener('change', (e) => {
        state.isSelfDraw = e.target.checked;
        calculateScore();
    });
}

function updateDraggableTiles() {
    const selectedTiles = document.querySelectorAll('.selected-tile');
    selectedTiles.forEach(tile => {
        tile.setAttribute('draggable', 'true');
        setupDragEvents(tile);
    });
}

function addChow() {
    const selectedTiles = getSelectedTilesForChow();
    if (selectedTiles.length !== 3) {
        showStatusMessage('請選擇三張連續的牌進行吃牌', 'error');
        return;
    }

    const firstTile = selectedTiles[0];
    const isSameType = selectedTiles.every(t => t.type === firstTile.type);
    const values = selectedTiles.map(t => t.value).sort((a, b) => a - b);
    const isSequential = (values[1] === values[0] + 1) && (values[2] === values[1] + 1);

    if (!isSameType || !isSequential) {
        showStatusMessage('選擇的牌不符合吃的條件', 'error');
        return;
    }

    saveStateToHistory();

    state.chows.push({
        tiles: selectedTiles,
        type: firstTile.type,
        value: firstTile.value
    });

    selectedTiles.forEach(tile => {
        const index = state.handTiles.findIndex(t => 
            t.type === tile.type && t.value === tile.value
        );
        if (index !== -1) {
            state.handTiles.splice(index, 1);
        }
    });

    updateUI();
}

function addPung() {
    const selectedTiles = getSelectedTiles();
    if (selectedTiles.length < 3) {
        showStatusMessage('請選擇至少三張相同的牌進行碰', 'error');
        return;
    }

    saveStateToHistory();

    state.pungs.push({
        tiles: selectedTiles.slice(0, 3),
        type: selectedTiles[0].type,
        value: selectedTiles[0].value
    });

    selectedTiles.slice(0, 3).forEach(tile => {
        const index = state.handTiles.findIndex(t => 
            t.type === tile.type && t.value === tile.value
        );
        if (index !== -1) {
            state.handTiles.splice(index, 1);
        }
    });

    updateUI();
}

function addOpenKong() {
    const selectedTiles = getSelectedTiles();
    if (selectedTiles.length !== 4) {
        showStatusMessage('請選擇四張相同的牌進行明槓', 'error');
        return;
    }

    saveStateToHistory();

    state.openKongs.push({
        tiles: selectedTiles,
        type: selectedTiles[0].type,
        value: selectedTiles[0].value
    });

    selectedTiles.forEach(tile => {
        const index = state.handTiles.findIndex(t => 
            t.type === tile.type && t.value === tile.value
        );
        if (index !== -1) {
            state.handTiles.splice(index, 1);
        }
    });

    updateUI();
}

function addConcealedKong() {
    const selectedTiles = getSelectedTiles();
    if (selectedTiles.length !== 4) {
        showStatusMessage('請選擇四張相同的牌進行暗槓', 'error');
        return;
    }

    saveStateToHistory();

    state.concealedKongs.push({
        tiles: selectedTiles,
        type: selectedTiles[0].type,
        value: selectedTiles[0].value
    });

    selectedTiles.forEach(tile => {
        const index = state.handTiles.findIndex(t => 
            t.type === tile.type && t.value === tile.value
        );
        if (index !== -1) {
            state.handTiles.splice(index, 1);
        }
    });

    updateUI();
}

function getSelectedTiles() {
    const counts = {};
    const handTiles = [...state.handTiles];
    
    handTiles.forEach(tile => {
        const key = `${tile.type}-${tile.value}`;
        counts[key] = (counts[key] || 0) + 1;
    });
    
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

function getSelectedTilesForChow() {
    return state.handTiles.slice(-3);
}

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
    
    if (state.history.length > 50) {
        state.history.shift();
    }
}

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

function updateUI() {
    updateTileCount();
    updateHandTilesDisplay();
    updateFlowersDisplay();
    updateExposedTilesDisplay();
    updateWinningTileDisplay();
    updateButtonStates();
    calculateScore();
}

function updateTileCount() {
    const exposedGroups = state.chows.length + state.pungs.length + state.openKongs.length + state.concealedKongs.length;
    const maxHandTiles = 16 - (exposedGroups * 3);
    document.getElementById('tile-count').textContent = 
        `(${state.handTiles.length}/${maxHandTiles})`;
}

function updateHandTilesDisplay() {
    const container = document.getElementById('hand-tiles');
    container.innerHTML = '';

    state.handTiles.forEach(tile => {
        const tileElement = document.createElement('div');
        tileElement.className = `selected-tile ${tile.cssClass}`;
        tileElement.textContent = tile.display;
        tileElement.dataset.type = tile.type;
        tileElement.dataset.value = tile.value;
        tileElement.dataset.source = 'hand-tiles';
        tileElement.setAttribute('draggable', 'true');
        container.appendChild(tileElement);

        setupDragEvents(tileElement);
    });
    console.log('Hand tiles display updated:', state.handTiles);
}

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

function updateExposedTilesDisplay() {
    const container = document.getElementById('exposed-tiles');
    container.innerHTML = '';
    
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

function updateWinningTileDisplay() {
    const container = document.getElementById('winning-tile');
    container.innerHTML = '';
    
    if (state.winningTile) {
        const tileElement = document.createElement('div');
        tileElement.className = `selected-tile winning-tile ${state.winningTile.cssClass}`;
        tileElement.textContent = state.winningTile.display;
        tileElement.dataset.type = state.winningTile.type;
        tileElement.dataset.value = state.winningTile.value;
        tileElement.dataset.source = 'winning-tile';
        tileElement.setAttribute('draggable', 'true');
        container.appendChild(tileElement);
        setupDragEvents(tileElement);
    }
}

function updateButtonStates() {
    const selectedTiles = getSelectedTiles();
    const selectedTilesForChow = getSelectedTilesForChow();
    const chowBtn = document.getElementById('chow-btn');
    const pungBtn = document.getElementById('pung-btn');
    const openKongBtn = document.getElementById('open-kong-btn');
    const concealedKongBtn = document.getElementById('concealed-kong-btn');
    
    let canChow = false;
    if (selectedTilesForChow.length === 3) {
        const firstTile = selectedTilesForChow[0];
        const isSameType = selectedTilesForChow.every(t => t.type === firstTile.type);
        const values = selectedTilesForChow.map(t => t.value).sort((a, b) => a - b);
        const isSequential = (values[1] === values[0] + 1) && (values[2] === values[1] + 1);
        const allSame = selectedTilesForChow.every(t => t.value === firstTile.value);
        
        canChow = isSameType && isSequential && !allSame;
    }
    
    let canPung = selectedTiles.length >= 3;
    let canKong = selectedTiles.length === 4;
    
    chowBtn.disabled = !canChow;
    pungBtn.disabled = !canPung;
    openKongBtn.disabled = !canKong;
    concealedKongBtn.disabled = !canKong;
}

function calculateScore() {
    const statusMessage = document.getElementById('status-message');
    statusMessage.innerHTML = '';
    
    const kongCount = state.openKongs.length + state.concealedKongs.length;
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
    
    const handTypesContainer = document.getElementById('hand-types');
    handTypesContainer.innerHTML = '';
    
    handTypes.forEach(hand => {
        totalScore += hand.score;
        
        const handElement = document.createElement('div');
        handElement.className = 'hand-type';
        handElement.textContent = `${hand.name} (${hand.score}番)`;
        handTypesContainer.appendChild(handElement);
    });
        
    if (state.isDealer && state.dealerCount > 0) {
        const dealerScore = 2 * state.dealerCount + 1;
        totalScore += dealerScore;
        const dealerElement = document.createElement('div');
        dealerElement.className = 'hand-type';
        dealerElement.textContent = `連莊${state.dealerCount}次 (${dealerScore}番)`;
        handTypesContainer.appendChild(dealerElement);
    }
    
    document.getElementById('score-display').textContent = 
        `總番數: ${totalScore}`;
}

function getAllTiles() {
    const allTiles = [...state.handTiles];
    
    state.chows.forEach(chow => {
        allTiles.push(...chow.tiles);
    });
    
    state.pungs.forEach(pung => {
        allTiles.push(...pung.tiles);
    });
    
    state.openKongs.forEach(kong => {
        allTiles.push(...kong.tiles);
    });
    
    state.concealedKongs.forEach(kong => {
        allTiles.push(...kong.tiles);
    });
    
    if (state.winningTile) {
        allTiles.push(state.winningTile);
    }
    
    return allTiles;
}

function initializeTiles() {
    const containers = ['characters-container', 'bamboos-container', 'dots-container', 'honors-container', 'flowers-container'];
    containers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (container) {
            const tiles = container.querySelectorAll('.tile');
            tiles.forEach(tile => {
                tile.dataset.source = containerId;
                tile.setAttribute('draggable', 'true');
                setupDragEvents(tile);
                console.log('Tile initialized:', tile.outerHTML, 'Source:', tile.dataset.source);
            });
        }
    });
}

window.addEventListener('DOMContentLoaded', initApp);