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
// 修改 setupDragAndDrop 函數
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
    // 鼠标事件
    element.addEventListener('dragstart', handleDragStart);
    element.addEventListener('dragend', handleDragEnd);
    
    // 触摸事件
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd);
    element.addEventListener('touchcancel', handleTouchEnd);
}

function setupDropZone(zone, dropHandler) {
    // 鼠标事件
    zone.addEventListener('dragover', handleDragOver);
    zone.addEventListener('drop', dropHandler);
    zone.addEventListener('dragenter', handleDragEnter);
    zone.addEventListener('dragleave', handleDragLeave);
    
    // 触摸事件
    zone.addEventListener('touchmove', handleTouchMoveDropZone, { passive: false });
    zone.addEventListener('touchend', (e) => handleTouchEndDropZone(e, dropHandler));
}

// 触摸开始事件处理
function handleTouchStart(e) {
    e.preventDefault(); // 防止默認行為（如頁面滾動）

    const touch = e.touches[0];
    const element = e.target;

    // 檢查元素是否可拖曳
    if (!element.classList.contains('tile') && !element.classList.contains('selected-tile')) {
        console.warn('Invalid drag element:', element);
        return;
    }

    // 設置拖曳資料
    element._dragData = {
        type: element.dataset.type,
        value: parseInt(element.dataset.value),
        source: element.dataset.source || element.closest('[id]').id,
        display: element.textContent,
        startX: touch.clientX,
        startY: touch.clientY,
        isDragging: false
    };

    console.log('Touch start:', element._dragData);

    // 添加觸摸激活樣式
    element.classList.add('touch-active');
}

// 触摸移动事件处理
function handleTouchMove(e) {
    e.preventDefault(); // 防止頁面滾動

    const touch = e.touches[0];
    const element = e.target;

    if (!element._dragData) {
        console.warn('No drag data found during touch move');
        return;
    }

    const dragData = element._dragData;
    const deltaX = Math.abs(touch.clientX - dragData.startX);
    const deltaY = Math.abs(touch.clientY - dragData.startY);

    // 開始拖曳的閾值檢查
    if (!dragData.isDragging && (deltaX > 10 || deltaY > 10)) {
        dragData.isDragging = true;

        // 創建拖曳圖像
        const dragImage = element.cloneNode(true);
        dragImage.style.position = 'fixed';
        dragImage.style.zIndex = '10000';
        dragImage.style.opacity = '0.8';
        dragImage.style.transform = 'scale(1.2)';
        dragImage.classList.add('dragging');
        document.body.appendChild(dragImage);

        element._dragImage = dragImage;
    }

    if (dragData.isDragging) {
        // 更新拖曳圖像位置
        updateDragImagePosition(touch.clientX, touch.clientY, element._dragImage);
    }
}

// 触摸结束事件处理
function handleTouchEnd(e) {
    const element = e.target;
    
    if (element._dragData && element._dragData.isDragging) {
        // 移除拖拽图像
        if (element._dragImage && element._dragImage.parentNode) {
            element._dragImage.parentNode.removeChild(element._dragImage);
        }
        
        // 处理放置逻辑（在handleTouchEndDropZone中处理）
    }
    
    // 清理数据
    delete element._dragData;
    delete element._dragImage;
    element.classList.remove('touch-active');
}

function handleTouchMoveDropZone(e) {
    // 如果有拖拽操作在进行，阻止滚动
    const draggingElement = document.querySelector('.dragging');
    if (draggingElement) {
        e.preventDefault();
    }
}

// 放置区域的触摸移动处理
function handleTouchEndDropZone(e, dropHandler) {
    e.preventDefault(); // 防止默認行為
    const draggingElement = document.querySelector('.dragging');
    if (!draggingElement) return;

    const touch = e.changedTouches[0];
    if (!touch) return; // 確保 touch 物件存在

    // 使用 clientX 和 clientY 獲取觸摸結束位置
    const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!targetElement) {
        console.warn('No element found at touch point:', touch.clientX, touch.clientY);
        return;
    }

    // 查找最近的放置區域
    const targetZone = targetElement.closest('#hand-tiles, #winning-tile, #trash-icon');
    if (!targetZone) {
        console.warn('No valid drop zone found at:', touch.clientX, touch.clientY);
        return;
    }

    // 找到原始拖曳元素
    const originalElement = document.querySelector('.tile.touch-active, .selected-tile.touch-active');
    if (!originalElement || !originalElement._dragData) {
        console.warn('No active drag element or drag data found');
        return;
    }

    const dragData = originalElement._dragData;

    // 創建模擬的 drop 事件
    const dropEvent = new Event('drop', { bubbles: true });
    dropEvent.dataTransfer = {
        getData: () => JSON.stringify(dragData)
    };

    // 調用對應的 drop 處理函數
    console.log('Dropping to zone:', targetZone.id, 'with data:', dragData);
    dropHandler.call(targetZone, dropEvent);

    // 清理拖曳圖像和狀態
    if (draggingElement && draggingElement.parentNode) {
        draggingElement.parentNode.removeChild(draggingElement);
    }
    originalElement.classList.remove('touch-active');
    delete originalElement._dragData;
    delete originalElement._dragImage;
}

// 更新拖拽图像位置
function updateDragImagePosition(x, y, dragImage) {
    if (dragImage) {
        // 調整偏移以確保圖像跟隨觸摸點
        dragImage.style.left = (x - 15) + 'px';
        dragImage.style.top = (y - 20) + 'px';
    }
}

// 阻止拖拽时的页面滚动
function preventScrollDuringDrag(e) {
    const draggingElement = document.querySelector('.dragging');
    if (draggingElement) {
        e.preventDefault();
    }
}

// 拖拽开始事件处理
function handleDragStart(e) {
    const tileElement = e.target;
    const type = tileElement.dataset.type;
    const value = parseInt(tileElement.dataset.value);
    const source = tileElement.dataset.source || tileElement.parentElement.id;
    const display = tileElement.textContent;
    
    // 保存拖拽数据
    e.dataTransfer.setData('application/json', JSON.stringify({
        type: type,
        value: value,
        source: source,
        display: display
    }));
    
    // 设置拖拽图像
    e.dataTransfer.effectAllowed = 'move';
    
    // 设置拖拽图像为牌本身
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

// 拖拽经过事件处理
function handleDragOver(e) {
    e.preventDefault();
    // 允许放置
    e.dataTransfer.dropEffect = 'move';
}

// 修改拖拽进入事件处理
function handleDragEnter(e) {
    e.preventDefault();
    // 确保我们只处理垃圾筒元素的dragenter事件
    if (e.currentTarget.id === 'trash-icon' || 
        e.currentTarget.id === 'hand-tiles' || 
        e.currentTarget.id === 'winning-tile') {
        e.currentTarget.classList.add('drag-over');
    }
}

// 拖拽离开事件处理
function handleDragLeave(e) {
    e.preventDefault();
    // 确保我们只处理垃圾筒元素的dragleave事件
    if (e.currentTarget.id === 'trash-icon' || 
        e.currentTarget.id === 'hand-tiles' || 
        e.currentTarget.id === 'winning-tile') {
        e.currentTarget.classList.remove('drag-over');
    }
}

// 手牌区放置事件处理
function handleTrashDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // 移除拖拽视觉效果
    const trashIcon = document.getElementById('trash-icon');
    trashIcon.classList.remove('drag-over');
    
    try {
        // 获取拖拽数据
        const data = JSON.parse(e.dataTransfer.getData('application/json'));
        console.log('Trash drop data:', data);
        
        // 保存状态到历史记录
        saveStateToHistory();
        
        // 根据来源删除相应的牌
        if (data.source === 'hand-tiles') {
            // 从手牌中删除
            const index = state.handTiles.findIndex(t => 
                t.type === data.type && parseInt(t.value) === parseInt(data.value)
            );
            
            if (index !== -1) {
                state.handTiles.splice(index, 1);
                console.log('Removed from hand tiles:', data.display);
            }
        } else if (data.source === 'winning-tile') {
            // 删除糊牌
            if (state.winningTile && 
                state.winningTile.type === data.type && 
                parseInt(state.winningTile.value) === parseInt(data.value)) {
                state.winningTile = null;
                console.log('Removed winning tile:', data.display);
            }
        } else if (data.source.includes('container')) {
            // 从选择区拖拽到垃圾筒，不做任何操作
            console.log('Dropped from selection area to trash, ignoring');
            return;
        }
        
        updateUI();
        
        // 显示删除成功的提示
        showStatusMessage(`已刪除: ${data.display}`, 'success');
        
    } catch (error) {
        console.error('Error handling trash drop:', error);
        showStatusMessage('刪除失敗', 'error');
    }
}

function showStatusMessage(message, type = 'info') {
    const statusDiv = document.createElement('div');
    statusDiv.className = `status-message ${type}`;
    statusDiv.textContent = message;
    statusDiv.style.position = 'fixed';
    statusDiv.style.top = '20px';
    statusDiv.style.right = '20px';
    statusDiv.style.padding = '10px 15px';
    statusDiv.style.borderRadius = '5px';
    statusDiv.style.zIndex = '1000';
    
    if (type === 'success') {
        statusDiv.style.backgroundColor = '#4caf50';
        statusDiv.style.color = 'white';
    } else if (type === 'error') {
        statusDiv.style.backgroundColor = '#f44336';
        statusDiv.style.color = 'white';
    } else {
        statusDiv.style.backgroundColor = '#2196f3';
        statusDiv.style.color = 'white';
    }
    
    document.body.appendChild(statusDiv);
    
    // 3秒后自动消失
    setTimeout(() => {
        if (statusDiv.parentNode) {
            statusDiv.parentNode.removeChild(statusDiv);
        }
    }, 3000);
}

function updateDraggableTiles() {
    // 为手牌添加拖拽属性
    const handTiles = document.querySelectorAll('#hand-tiles .selected-tile');
    handTiles.forEach(tile => {
        tile.setAttribute('draggable', 'true');
        tile.dataset.source = 'hand-tiles';
        // 移除旧的事件监听器（避免重复添加）
        tile.removeEventListener('dragstart', handleDragStart);
        tile.removeEventListener('touchstart', handleTouchStart);
        tile.removeEventListener('touchmove', handleTouchMove);
        tile.removeEventListener('touchend', handleTouchEnd);
        
        // 添加新的事件监听器
        setupDragEvents(tile);
    });
    
    // 为糊牌添加拖拽属性
    const winningTiles = document.querySelectorAll('#winning-tile .selected-tile');
    winningTiles.forEach(tile => {
        tile.setAttribute('draggable', 'true');
        tile.dataset.source = 'winning-tile';
        // 移除旧的事件监听器（避免重复添加）
        tile.removeEventListener('dragstart', handleDragStart);
        tile.removeEventListener('touchstart', handleTouchStart);
        tile.removeEventListener('touchmove', handleTouchMove);
        tile.removeEventListener('touchend', handleTouchEnd);
        
        // 添加新的事件监听器
        setupDragEvents(tile);
    });
}

function handleHandTilesDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');

    try {
        const data = JSON.parse(e.dataTransfer.getData('application/json'));
        console.log('Hand tiles drop data:', data);

        const tile = findTileByTypeAndValue(data.type, data.value);
        if (!tile) {
            console.error('Tile not found:', data);
            showStatusMessage('無效的牌', 'error');
            return;
        }

        saveStateToHistory();

        if (data.source === 'winning-tile' && state.winningTile &&
            state.winningTile.type === data.type && state.winningTile.value === data.value) {
            state.winningTile = null;
            selectTile(tile);
        } else if (data.source.includes('container')) {
            selectTile(tile);
        } else {
            console.warn('Invalid drop source:', data.source);
            showStatusMessage('無效的拖曳來源', 'error');
            return;
        }

        updateUI();
        showStatusMessage(`已添加: ${tile.display}`, 'success');
    } catch (error) {
        console.error('Error handling hand tiles drop:', error);
        showStatusMessage('放置失敗', 'error');
    }
}

// 糊牌区放置事件处理
function handleWinningTileDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');

    try {
        // 獲取拖曳資料
        const data = JSON.parse(e.dataTransfer.getData('application/json'));
        const tile = findTileByTypeAndValue(data.type, data.value);

        if (!tile) {
            console.error('Tile not found:', data);
            showStatusMessage('無效的牌', 'error');
            return;
        }

        // 檢查糊牌區是否已有牌
        if (state.winningTile) {
            showStatusMessage('糊牌區已有一張牌，請先移除', 'error');
            return;
        }

        saveStateToHistory();

        // 從手牌區移除（如果適用）
        if (data.source === 'hand-tiles') {
            const index = state.handTiles.findIndex(t =>
                t.type === data.type && t.value === data.value
            );
            if (index !== -1) {
                state.handTiles.splice(index, 1);
            }
        }

        // 設置糊牌
        state.winningTile = { ...tile };
        updateUI();
    } catch (error) {
        console.error('Error handling winning tile drop:', error);
        showStatusMessage('放置失敗', 'error');
    }
}

// 垃圾筒放置事件处理
function handleTrashDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    // 获取拖拽数据
    const data = JSON.parse(e.dataTransfer.getData('application/json'));
    
    // 根据来源删除相应的牌
    if (data.source === 'hand-tiles') {
        // 从手牌中删除
        const index = state.handTiles.findIndex(t => 
            t.type === data.type && t.value === data.value
        );
        
        if (index !== -1) {
            state.handTiles.splice(index, 1);
        }
    } else if (data.source === 'winning-tile' && state.winningTile && 
               state.winningTile.type === data.type && state.winningTile.value === data.value) {
        // 删除糊牌
        state.winningTile = null;
    }
    
    updateUI();
}

// 辅助函数：根据类型和值查找牌
function findTileByTypeAndValue(type, value) {
    // 將值轉換為數字
    const numericValue = parseInt(value);

    // 在 ALL_TILES 中查找
    let foundTile = ALL_TILES.find(t =>
        t.type === type && t.value === numericValue
    );

    if (foundTile) return { ...foundTile };

    // 在 FLOWER_TILES 中查找
    foundTile = FLOWER_TILES.find(t =>
        t.type === type && t.value === numericValue
    );

    if (foundTile) return { ...foundTile };

    console.warn(`Tile not found: type=${type}, value=${numericValue}`);
    return null;
}

// 修改updateUI函数，为已选牌添加拖拽属性
function updateUI() {
    updateTileCount();
    updateHandTilesDisplay();
    updateFlowersDisplay();
    updateExposedTilesDisplay();
    updateWinningTileDisplay();
    updateButtonStates();
    calculateScore();
    updateDraggableTiles(); // 確保在每次 UI 更新後設置拖曳屬性
}

// 修改updateHandTilesDisplay函数，添加data-source属性
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
        tileElement.setAttribute('draggable', 'true'); // 設置可拖曳
        container.appendChild(tileElement);

        // 添加拖曳事件
        setupDragEvents(tileElement);
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
        tileElement.setAttribute('draggable', 'true'); // 設置可拖曳
        container.appendChild(tileElement);

        // 添加拖曳事件
        setupDragEvents(tileElement);
    }
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

    const exposedGroups = state.chows.length + state.pungs.length + state.openKongs.length + state.concealedKongs.length;
    const maxHandTiles = 16 - (exposedGroups * 3);

    if (state.handTiles.length >= maxHandTiles) {
        const totalTiles = state.handTiles.length +
            (state.chows.length * 3) +
            (state.pungs.length * 3) +
            (state.openKongs.length * 4) +
            (state.concealedKongs.length * 4);

        if (state.winningTile === null && totalTiles === maxHandTiles) {
            state.winningTile = { ...tile };
            showStatusMessage(`已自動設為糊牌: ${tile.display}`, 'success');
            updateUI();
            return;
        }

        showStatusMessage(`手牌已達上限 (${maxHandTiles} 張)`, 'error');
        return;
    }

    state.handTiles.push({ ...tile });
    console.log('Tile added to hand:', tile);
    showStatusMessage(`已添加: ${tile.display}`, 'success');
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
