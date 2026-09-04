document.documentElement.dataset.tmsApp = 'loading';
document.documentElement.dataset.embedded = String(new URLSearchParams(location.search).get('embedded') === '1');

const SCHEMA_VERSION = 'ov-mj-session/v1';
const STORAGE_KEY = 'ovmj.session-scorekeeper.v1';
const MAX_ENTRIES = 5000;
const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
const PLAYER_COLORS = ['#b9463f', '#236b5e', '#315fa8', '#8a4d91'];
const SEATS = ['東', '南', '西', '北'];
const DEFAULT_PLAYER_NAMES = ['我', '玩家 2', '玩家 3', '玩家 4'];
const PLAYER_SETTING_LABELS = ['我（記分者）', '玩家 2', '玩家 3', '玩家 4'];
const PHYSICAL_SEAT_KEYS = ['me', 'upper', 'opposite', 'lower'];
const MOVABLE_PHYSICAL_SEATS = ['upper', 'opposite', 'lower'];
const PHYSICAL_SEAT_LABELS = {
    me: '我（記分者）',
    upper: '上家（左）',
    opposite: '對家',
    lower: '下家（右）'
};
const SVG_NS = 'http://www.w3.org/2000/svg';

if (!Element.prototype.replaceChildren) {
    Object.defineProperty(Element.prototype, 'replaceChildren', {
        configurable: true,
        value(...nodes) {
            while (this.firstChild) this.removeChild(this.firstChild);
            this.append(...nodes);
        }
    });
}

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const clone = (value) => typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
const uid = () => globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const finiteNumber = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const boundedInt = (value, min, max, fallback = min) => {
    const number = Math.trunc(finiteNumber(value, fallback));
    return Math.min(max, Math.max(min, number));
};

const refs = {
    subtitle: $('#tms-session-subtitle'),
    storageStatus: $('#tms-storage-status'),
    roundLabel: $('#tms-round-label'),
    scoreGrid: $('#tms-score-grid'),
    quickGrid: $('#tms-quick-ledger-grid'),
    quickRule: $('#tms-quick-rule'),
    quickUndo: $('#tms-quick-undo'),
    adjustSeats: $('#tms-adjust-seats'),
    seatCue: $('#tms-seat-cue'),
    seatCueText: $('#tms-seat-cue-text'),
    seatCueDismiss: $('#tms-seat-cue-dismiss'),
    seatDialog: $('#tms-seat-dialog'),
    seatGrid: $('#tms-seat-grid'),
    seatSummary: $('#tms-seat-summary'),
    seatPendingWarning: $('#tms-seat-pending-warning'),
    seatLive: $('#tms-seat-live'),
    seatCancel: $('#tms-seat-cancel'),
    seatConfirm: $('#tms-seat-confirm'),
    advancedEntry: $('#tms-advanced-entry'),
    dealerName: $('#tms-dealer-name'),
    dealerBonus: $('#tms-dealer-bonus'),
    streak: $('#tms-streak-count'),
    pull: $('#tms-pull-count'),
    bonus: $('#tms-bonus-count'),
    form: $('#tms-round-form'),
    formTitle: $('#tms-form-title'),
    cancelEdit: $('#tms-cancel-edit'),
    outcomePicker: $('#tms-outcome-picker'),
    winnerField: $('#tms-winner-field'),
    winner: $('#tms-winner'),
    multiWinnerField: $('#tms-multi-winner-field'),
    multiWinners: $('#tms-multi-winners'),
    discarderField: $('#tms-discarder-field'),
    discarder: $('#tms-discarder'),
    taiField: $('#tms-tai-field'),
    tai: $('#tms-tai'),
    multiplierField: $('#tms-multiplier-field'),
    multiplier: $('#tms-multiplier'),
    baoField: $('#tms-bao-field'),
    baoPlayer: $('#tms-bao-player'),
    dealerActionField: $('#tms-dealer-action-field'),
    dealerAction: $('#tms-dealer-action'),
    adjustPayerField: $('#tms-adjust-payer-field'),
    adjustPayer: $('#tms-adjust-payer'),
    adjustReceiverField: $('#tms-adjust-receiver-field'),
    adjustReceiver: $('#tms-adjust-receiver'),
    adjustAmountField: $('#tms-adjust-amount-field'),
    adjustAmount: $('#tms-adjust-amount'),
    note: $('#tms-note'),
    preview: $('#tms-preview-content'),
    previewZero: $('#tms-preview-zero-sum'),
    submit: $('#tms-submit-round'),
    chart: $('#tms-score-chart'),
    chartLegend: $('#tms-chart-legend'),
    chartEmpty: $('#tms-chart-empty'),
    titleGrid: $('#tms-title-grid'),
    settlementList: $('#tms-settlement-list'),
    history: $('#tms-history'),
    historyEmpty: $('#tms-history-empty'),
    historyFilter: $('#tms-history-filter'),
    undo: $('#tms-undo'),
    redo: $('#tms-redo'),
    settingsForm: $('#tms-settings-form'),
    sessionTitle: $('#tms-session-title'),
    playerSettings: $('#tms-player-settings'),
    initialDealer: $('#tms-initial-dealer'),
    baseAmount: $('#tms-base-amount'),
    taiValue: $('#tms-tai-value'),
    dealerBaseTai: $('#tms-dealer-base-tai'),
    streakTai: $('#tms-streak-tai'),
    pullTai: $('#tms-pull-tai'),
    currency: $('#tms-currency'),
    drawContinues: $('#tms-draw-continues'),
    drawAddsPull: $('#tms-draw-adds-pull'),
    ruleExample: $('#tms-rule-example'),
    importFile: $('#tms-import-file'),
    toast: $('#tms-toast')
};

let session = createDefaultSession();
let derived = deriveSession(session);
let activeView = 'score';
let outcome = 'discard';
let editingEntryId = null;
let undoStack = [];
let redoStack = [];
let toastTimer = null;
let externalStorageConflict = false;
let sessionDirty = false;
let seatDialogDraft = null;
let seatDialogTrigger = null;
let selectedSeatRelation = null;
let seatPointerDrag = null;
let suppressSeatClick = false;
let visibleSeatCueKey = '';
const dismissedSeatMilestones = new Map();
const quickLedgers = new Map();
const quickUndoStack = [];

function createDefaultSession() {
    const now = new Date().toISOString();
    const players = SEATS.map((seat, index) => ({
        id: `p${index + 1}`,
        seat,
        name: DEFAULT_PLAYER_NAMES[index],
        color: PLAYER_COLORS[index],
        initialScore: 0
    }));

    return {
        schemaVersion: SCHEMA_VERSION,
        id: uid(),
        title: '今晚牌局',
        createdAt: now,
        updatedAt: now,
        players,
        physicalSeats: defaultPhysicalSeats(players),
        initialDealerId: players[0].id,
        config: {
            baseAmount: 5,
            taiValue: 1,
            currency: '$',
            dealerBaseTai: 1,
            streakTai: 1,
            pullTai: 1,
            drawContinues: true,
            drawAddsPull: true
        },
        entries: []
    };
}

function defaultPhysicalSeats(players) {
    return {
        me: players[0].id,
        upper: players[3].id,
        opposite: players[2].id,
        lower: players[1].id
    };
}

function isValidPhysicalSeats(mapping, players) {
    if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping)) return false;
    const keys = Object.keys(mapping);
    if (keys.length !== PHYSICAL_SEAT_KEYS.length
        || !PHYSICAL_SEAT_KEYS.every((key) => Object.prototype.hasOwnProperty.call(mapping, key))) return false;
    const playerIds = players.map((player) => player.id);
    const values = PHYSICAL_SEAT_KEYS.map((key) => mapping[key]);
    return mapping.me === players[0].id
        && new Set(values).size === players.length
        && values.every((id) => playerIds.includes(id));
}

function normalizePhysicalSeats(value, players) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('玩家位置格式無效。');
    }
    const keys = Object.keys(value);
    if (keys.length !== PHYSICAL_SEAT_KEYS.length
        || !PHYSICAL_SEAT_KEYS.every((key) => Object.prototype.hasOwnProperty.call(value, key))) {
        throw new Error('玩家位置必須完整包含我、上家、對家與下家。');
    }
    const mapping = Object.fromEntries(PHYSICAL_SEAT_KEYS.map((key) => [key, String(value[key])]));
    if (!isValidPhysicalSeats(mapping, players)) {
        throw new Error('玩家位置必須包含四位不重複玩家，且記分者必須是第一位玩家。');
    }
    return mapping;
}

function normalizeSession(raw) {
    if (!raw || raw.schemaVersion !== SCHEMA_VERSION) {
        throw new Error(`不支援的資料格式，必須是 ${SCHEMA_VERSION}`);
    }
    if (!Array.isArray(raw.players) || raw.players.length !== 4) {
        throw new Error('牌局必須正好有四個座位。');
    }
    if (!Array.isArray(raw.entries) || raw.entries.length > MAX_ENTRIES) {
        throw new Error(`牌局紀錄必須是陣列，且不可超過 ${MAX_ENTRIES} 筆。`);
    }

    const ids = new Set();
    const players = raw.players.map((player, index) => {
        const id = String(player.id || `p${index + 1}`);
        if (ids.has(id)) throw new Error('玩家 ID 不可重複。');
        ids.add(id);
        return {
            id,
            seat: SEATS[index],
            name: String(player.name || DEFAULT_PLAYER_NAMES[index]).slice(0, 20),
            color: PLAYER_COLORS[index],
            initialScore: boundedInt(player.initialScore, -99999999, 99999999, 0)
        };
    });

    const physicalSeats = Object.prototype.hasOwnProperty.call(raw, 'physicalSeats')
        ? normalizePhysicalSeats(raw.physicalSeats, players)
        : defaultPhysicalSeats(players);
    const initialDealerId = ids.has(String(raw.initialDealerId))
        ? String(raw.initialDealerId)
        : players[0].id;

    const config = {
        baseAmount: boundedInt(raw.config?.baseAmount, 0, 999999, 5),
        taiValue: boundedInt(raw.config?.taiValue, 1, 999999, 1),
        currency: String(raw.config?.currency || '$').slice(0, 4),
        dealerBaseTai: boundedInt(raw.config?.dealerBaseTai, 0, 99, 1),
        streakTai: boundedInt(raw.config?.streakTai, 0, 99, 1),
        pullTai: boundedInt(raw.config?.pullTai, 0, 99, 1),
        drawContinues: Boolean(raw.config?.drawContinues),
        drawAddsPull: Boolean(raw.config?.drawAddsPull)
    };

    const entryIds = new Set();
    const entries = raw.entries.map((entry, index) => {
        if (!entry?.id || entryIds.has(String(entry.id))) throw new Error('紀錄 ID 不可空白或重複。');
        entryIds.add(String(entry.id));
        return normalizeEntry(entry, ids, index);
    });
    const normalized = {
        schemaVersion: SCHEMA_VERSION,
        id: String(raw.id || uid()),
        title: String(raw.title || '今晚牌局').slice(0, 40),
        createdAt: validDate(raw.createdAt) ? raw.createdAt : new Date().toISOString(),
        updatedAt: validDate(raw.updatedAt) ? raw.updatedAt : new Date().toISOString(),
        players,
        physicalSeats,
        initialDealerId,
        config,
        entries
    };

    deriveSession(normalized);
    return normalized;
}

function normalizeEntry(entry, playerIds, index) {
    if (!entry || typeof entry !== 'object') throw new Error(`第 ${index + 1} 筆紀錄無效。`);
    const type = String(entry.type || '');
    const allowed = new Set(['discard', 'selfDraw', 'multiWin', 'draw', 'adjustment', 'breakPull']);
    if (!allowed.has(type)) throw new Error(`第 ${index + 1} 筆紀錄類型無效。`);

    const normalized = {
        id: String(entry.id || uid()),
        type,
        createdAt: validDate(entry.createdAt) ? entry.createdAt : new Date().toISOString(),
        note: String(entry.note || '').slice(0, 120)
    };

    if (['discard', 'selfDraw', 'multiWin', 'draw'].includes(type)) {
        normalized.winnerIds = Array.isArray(entry.winnerIds)
            ? [...new Set(entry.winnerIds.map(String).filter((id) => playerIds.has(id)))]
            : [];
        normalized.discarderId = playerIds.has(String(entry.discarderId)) ? String(entry.discarderId) : '';
        normalized.tai = boundedInt(entry.tai, 0, 999, 0);
        normalized.multiplier = boundedInt(entry.multiplier, 1, 3, 1);
        normalized.baoPlayerId = playerIds.has(String(entry.baoPlayerId)) ? String(entry.baoPlayerId) : '';
        normalized.dealerAction = ['auto', 'continue', 'rotate'].includes(entry.dealerAction)
            ? entry.dealerAction
            : 'auto';
        normalized.breakPullAfter = Boolean(entry.breakPullAfter);
        validateHandInput(normalized, playerIds);
    }

    if (type === 'adjustment') {
        normalized.payerId = String(entry.payerId || '');
        normalized.receiverId = String(entry.receiverId || '');
        normalized.amount = boundedInt(entry.amount, 1, 99999999, 1);
        if (!playerIds.has(normalized.payerId) || !playerIds.has(normalized.receiverId) || normalized.payerId === normalized.receiverId) {
            throw new Error(`第 ${index + 1} 筆賞罰的付款者或收款者無效。`);
        }
    }

    return normalized;
}

function validateHandInput(input, playerIds) {
    const winners = input.winnerIds || [];
    if (input.type === 'discard' && winners.length !== 1) throw new Error('胡牌必須選一位贏家。');
    if (input.type === 'selfDraw' && winners.length !== 1) throw new Error('自摸必須選一位贏家。');
    if (input.type === 'multiWin' && winners.length < 2) throw new Error('一炮多響至少選兩位贏家。');
    if (['discard', 'multiWin'].includes(input.type)) {
        if (!playerIds.has(input.discarderId)) throw new Error('必須選擇放槍者。');
        if (winners.includes(input.discarderId)) throw new Error('放槍者不可同時是贏家。');
    }
    if (input.type === 'selfDraw' && input.baoPlayerId && winners.includes(input.baoPlayerId)) {
        throw new Error('包自摸者不可同時是贏家。');
    }
}

function validDate(value) {
    return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function loadSession() {
    return createDefaultSession();
}

function setSessionDirty(dirty) {
    sessionDirty = Boolean(dirty);
    refs.storageStatus.textContent = '此頁暫存';
    refs.storageStatus.classList.remove('is-error');
}

function getHostedSessionStatus() {
    return { id: session.id, title: session.title, dirty: sessionDirty };
}

function markHostedSessionSaved() {
    setSessionDirty(false);
    return getHostedSessionStatus();
}

function saveSession() {
    session.updatedAt = new Date().toISOString();
    setSessionDirty(true);
    return true;
}

function dealerBonusTai(dealerState, config) {
    return config.dealerBaseTai
        + dealerState.streak * config.streakTai
        + dealerState.pull * config.pullTai;
}

function deriveSession(source) {
    const totals = Object.fromEntries(source.players.map((player) => [player.id, player.initialScore]));
    const stats = Object.fromEntries(source.players.map((player) => [player.id, {
        wins: 0,
        selfDraws: 0,
        discards: 0,
        paid: 0,
        received: 0
    }]));
    let dealerState = { playerId: source.initialDealerId, streak: 0, pull: 0 };
    let handNumber = 0;
    const entries = [];
    const chartPoints = [{ label: '起', totals: { ...totals } }];

    source.entries.forEach((input, index) => {
        const before = { ...dealerState };
        const deltas = Object.fromEntries(source.players.map((player) => [player.id, 0]));
        const transfers = [];
        let summary = '';
        let explanation = '';

        const addTransfer = (fromId, toId, amount, reason) => {
            if (!fromId || !toId || fromId === toId || amount <= 0) return;
            deltas[fromId] -= amount;
            deltas[toId] += amount;
            stats[fromId].paid += amount;
            stats[toId].received += amount;
            transfers.push({ fromId, toId, amount, reason });
        };

        if (['discard', 'selfDraw', 'multiWin', 'draw'].includes(input.type)) {
            handNumber += 1;
            const bonusTai = dealerBonusTai(before, source.config);
            const paymentFor = (fromId, toId) => {
                const involvesDealer = fromId === before.playerId || toId === before.playerId;
                const effectiveTai = input.tai + (involvesDealer ? bonusTai : 0);
                return source.config.baseAmount + effectiveTai * source.config.taiValue * input.multiplier;
            };

            if (input.type === 'discard') {
                const winnerId = input.winnerIds[0];
                addTransfer(input.discarderId, winnerId, paymentFor(input.discarderId, winnerId), '胡牌');
                stats[winnerId].wins += 1;
                stats[input.discarderId].discards += 1;
                summary = `${playerName(source, winnerId)} 胡 ${playerName(source, input.discarderId)}`;
            }

            if (input.type === 'multiWin') {
                input.winnerIds.forEach((winnerId) => {
                    addTransfer(input.discarderId, winnerId, paymentFor(input.discarderId, winnerId), '一炮多響');
                    stats[winnerId].wins += 1;
                });
                stats[input.discarderId].discards += 1;
                summary = `${playerName(source, input.discarderId)} 一炮 ${input.winnerIds.length} 響`;
            }

            if (input.type === 'selfDraw') {
                const winnerId = input.winnerIds[0];
                const obligations = source.players
                    .filter((player) => player.id !== winnerId)
                    .map((player) => ({ fromId: player.id, amount: paymentFor(player.id, winnerId) }));
                if (input.baoPlayerId) {
                    const total = obligations.reduce((sum, item) => sum + item.amount, 0);
                    addTransfer(input.baoPlayerId, winnerId, total, '包自摸');
                } else {
                    obligations.forEach((item) => addTransfer(item.fromId, winnerId, item.amount, '自摸'));
                }
                stats[winnerId].wins += 1;
                stats[winnerId].selfDraws += 1;
                summary = `${playerName(source, winnerId)} 自摸${input.baoPlayerId ? `，${playerName(source, input.baoPlayerId)} 包` : ''}`;
            }

            if (input.type === 'draw') {
                summary = '流局';
            }

            const dealerWon = input.winnerIds.includes(before.playerId);
            let continues = input.type === 'draw' ? source.config.drawContinues : dealerWon;
            if (input.dealerAction === 'continue') continues = true;
            if (input.dealerAction === 'rotate') continues = false;

            if (continues) {
                const addPull = input.type === 'draw' ? source.config.drawAddsPull : true;
                dealerState = {
                    playerId: before.playerId,
                    streak: before.streak + 1,
                    pull: input.breakPullAfter ? 0 : before.pull + (addPull ? 1 : 0)
                };
            } else {
                dealerState = {
                    playerId: nextPlayerId(source, before.playerId),
                    streak: 0,
                    pull: 0
                };
            }

            const amountText = `底 ${source.config.baseAmount}／番 ${source.config.taiValue}／${input.tai} 番${input.multiplier > 1 ? ` ×${input.multiplier}` : ''}`;
            const dealerText = `莊家加 ${bonusTai} 番`;
            explanation = `${amountText}；${dealerText}`;
        }

        if (input.type === 'adjustment') {
            addTransfer(input.payerId, input.receiverId, input.amount, '賞罰');
            summary = `${playerName(source, input.payerId)} 支付 ${playerName(source, input.receiverId)}`;
            explanation = input.note || '手動賞罰／詐胡／罰番調整';
        }

        if (input.type === 'breakPull') {
            dealerState = { ...before, pull: 0 };
            summary = '斷拉（舊紀錄）';
            explanation = `${playerName(source, before.playerId)} 的舊紀錄：拉莊 ${before.pull} → 0，莊家與連莊不變`;
        }

        const deltaSum = Object.values(deltas).reduce((sum, value) => sum + value, 0);
        if (deltaSum !== 0) throw new Error(`第 ${index + 1} 筆紀錄不是零和。`);
        Object.entries(deltas).forEach(([playerId, amount]) => {
            totals[playerId] += amount;
        });

        entries.push({
            input,
            index,
            handNumber: ['discard', 'selfDraw', 'multiWin', 'draw'].includes(input.type) ? handNumber : null,
            dealerBefore: before,
            dealerAfter: { ...dealerState },
            deltas,
            transfers,
            summary,
            explanation
        });
        chartPoints.push({ label: handNumber ? String(handNumber) : '調', totals: { ...totals } });
    });

    return { totals, stats, dealerState, entries, chartPoints, handCount: handNumber };
}

function nextPlayerId(source, currentId) {
    const index = source.players.findIndex((player) => player.id === currentId);
    return source.players[(index + 1 + source.players.length) % source.players.length].id;
}

function playerName(source, id) {
    return source.players.find((player) => player.id === id)?.name || '未知玩家';
}

function formatMoney(value, withPlus = false) {
    const prefix = withPlus && value > 0 ? '+' : '';
    return `${prefix}${session.config.currency}${Math.round(value).toLocaleString('zh-TW')}`;
}

function settlementPlan(source, result) {
    const creditors = [];
    const debtors = [];
    source.players.forEach((player) => {
        const net = result.totals[player.id] - player.initialScore;
        if (net > 0) creditors.push({ playerId: player.id, amount: net });
        if (net < 0) debtors.push({ playerId: player.id, amount: -net });
    });
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);
    const transfers = [];
    let creditorIndex = 0;
    let debtorIndex = 0;
    while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
        const amount = Math.min(creditors[creditorIndex].amount, debtors[debtorIndex].amount);
        if (amount > 0) transfers.push({ fromId: debtors[debtorIndex].playerId, toId: creditors[creditorIndex].playerId, amount });
        creditors[creditorIndex].amount -= amount;
        debtors[debtorIndex].amount -= amount;
        if (creditors[creditorIndex].amount === 0) creditorIndex += 1;
        if (debtors[debtorIndex].amount === 0) debtorIndex += 1;
    }
    return transfers;
}

function historyMatchesFilter(entry, filter) {
    if (!filter || filter === 'all') return true;
    if (filter === 'win') return ['discard', 'selfDraw', 'multiWin'].includes(entry.input.type);
    return entry.input.type === filter;
}

function applyRulePreset(baseAmount, taiValue) {
    refs.baseAmount.value = String(boundedInt(baseAmount, 0, 999999, 5));
    refs.taiValue.value = String(boundedInt(taiValue, 1, 999999, 1));
    renderRuleExample();
}

function buildTextExport(source, result) {
    const lines = [
        source.title,
        `建立：${new Date(source.createdAt).toLocaleString('zh-TW')}`,
        `規則：底 ${source.config.baseAmount}／番 ${source.config.taiValue}；莊家 ${source.config.dealerBaseTai} + 連×${source.config.streakTai} + 拉×${source.config.pullTai}`,
        '',
        '牌局紀錄'
    ];
    if (!result.entries.length) lines.push('（尚無紀錄）');
    result.entries.forEach((entry, index) => {
        const changes = source.players
            .filter((player) => entry.deltas[player.id])
            .map((player) => `${player.name} ${entry.deltas[player.id] > 0 ? '+' : ''}${entry.deltas[player.id]}`)
            .join('；');
        const note = entry.input.type !== 'breakPull' && entry.input.note ? `｜備註：${entry.input.note}` : '';
        lines.push(`${index + 1}. ${entry.summary}｜${entry.explanation}${changes ? `｜${changes}` : ''}${note}`);
    });
    lines.push('', '最終結算');
    source.players.forEach((player) => {
        const net = result.totals[player.id] - player.initialScore;
        lines.push(`${player.name}：${result.totals[player.id]}（淨變動 ${net > 0 ? '+' : ''}${net}）`);
    });
    lines.push('', '精簡找數建議');
    const plan = settlementPlan(source, result);
    if (!plan.length) lines.push('四家已平數，毋須轉帳。');
    plan.forEach((transfer) => lines.push(`${playerName(source, transfer.fromId)} → ${playerName(source, transfer.toId)}：${transfer.amount}`));
    return `${lines.join('\r\n')}\r\n`;
}

function mutateSession(mutator, message, { preserveQuickUndo = false } = {}) {
    if (!preserveQuickUndo) quickUndoStack.length = 0;
    undoStack.push(clone(session));
    if (undoStack.length > 30) undoStack.shift();
    redoStack = [];
    mutator(session);
    derived = deriveSession(session);
    saveSession();
    renderAll();
    if (message) showToast(message);
}

function undo() {
    if (!undoStack.length) return showToast('沒有可復原的操作。');
    quickUndoStack.length = 0;
    redoStack.push(clone(session));
    session = undoStack.pop();
    derived = deriveSession(session);
    saveSession();
    cancelEdit();
    renderSettings();
    renderAll();
    showToast('已復原上一個操作。');
}

function redo() {
    if (!redoStack.length) return showToast('沒有可重做的操作。');
    quickUndoStack.length = 0;
    undoStack.push(clone(session));
    session = redoStack.pop();
    derived = deriveSession(session);
    saveSession();
    cancelEdit();
    renderSettings();
    renderAll();
    showToast('已重做操作。');
}

function renderAll() {
    derived = deriveSession(session);
    refs.subtitle.textContent = `${session.title} · 本頁暫存 · ${new Date(session.updatedAt).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
    refs.roundLabel.textContent = `已完成 ${derived.handCount} 局 · 共 ${session.entries.length} 筆紀錄`;
    renderScoreboard();
    renderQuickLedger();
    renderSeatCue();
    renderDealer();
    renderPlayerOptions();
    renderPreview();
    renderHistory();
    renderChart();
    renderStats();
    renderSettlements();
    refs.undo.disabled = undoStack.length === 0;
    refs.redo.disabled = redoStack.length === 0;
}

const QUICK_RELATIONS = [
    { key: 'upper', label: '' },
    { key: 'opposite', label: '' },
    { key: 'lower', label: '' }
];

function quickLedgerFor(playerId) {
    if (!quickLedgers.has(playerId)) quickLedgers.set(playerId, { items: [], breakNext: false });
    return quickLedgers.get(playerId);
}

function quickWeightedItems(ledger) {
    return ledger.items.map((item, index, items) => {
        const segment = Number(item.segment) || 0;
        const laterInSegment = items.slice(index + 1)
            .filter((next) => (Number(next.segment) || 0) === segment)
            .length;
        const multiplier = 1.5 ** laterInSegment;
        return { ...item, segment, multiplier, weightedFan: item.fan * multiplier };
    });
}

function quickLedgerTotals(ledger, { breakLast = false } = {}) {
    const weightedItems = quickWeightedItems(ledger);
    const grouped = new Map();
    weightedItems.forEach((item) => {
        if (!grouped.has(item.segment)) grouped.set(item.segment, []);
        grouped.get(item.segment).push(item);
    });
    const maxSegment = grouped.size ? Math.max(...grouped.keys()) : -1;
    const segmentTotals = [...grouped.entries()].map(([segment, items]) => {
        const fan = items.reduce((sum, item) => sum + item.direction * item.weightedFan, 0);
        const broken = segment < maxSegment || (segment === maxSegment && (ledger.breakNext || breakLast));
        const adjustedFan = broken ? fan / 2 : fan;
        const roundedFan = broken 
            ? Math.floor(Math.abs(adjustedFan))
            : Math.ceil(Math.abs(adjustedFan));
        const finalFan = roundedFan ? Math.sign(adjustedFan) * roundedFan : 0;
        const rawAmount = adjustedFan * session.config.taiValue;
        return {
            segment,
            fan,
            adjustedFan,
            roundedFan: finalFan,
            rawAmount,
            amount: finalFan * session.config.taiValue,
            broken
        };
    });
    return {
        fan: segmentTotals.reduce((sum, segment) => sum + segment.fan, 0),
        rawAmount: segmentTotals.reduce((sum, segment) => sum + segment.rawAmount, 0),
        amount: segmentTotals.reduce((sum, segment) => sum + segment.amount, 0),
        weightedItems,
        segmentTotals
    };
}

function quickBreakdown(ledger, totals = quickLedgerTotals(ledger)) {
    return totals.segmentTotals.map((segmentTotal) => {
        const items = totals.weightedItems
            .filter((item) => item.segment === segmentTotal.segment)
            .map((item) => `${item.direction > 0 ? '+' : '−'}${item.fan}×${Number(item.multiplier.toFixed(4))}`)
            .join('、');
        const fan = Number(segmentTotal.fan.toFixed(3));
        const calculation = segmentTotal.broken
            ? `${fan}÷2→${segmentTotal.roundedFan}`
            : `${fan}→${segmentTotal.roundedFan}`;
        return `${items}（${segmentTotal.broken ? '斷拉↓' : '連拉↑'}${calculation}）`;
    }).join('｜');
}

function applyQuickFanToAllOpponents(fanDelta) {
    pushQuickUndo();
    const me = session.players.find((player) => player.id === session.physicalSeats.me);
    const opponents = QUICK_RELATIONS.map(({ key }) => session.physicalSeats[key])
        .map((playerId) => session.players.find((p) => p.id === playerId));
    
    // fanDelta 是每個對手的番數變動（正數表示對手輸給我，負數表示我輸給對手）
    // 自己的變動 = fanDelta * 3 (因為有三位對手)
    const selfFanDelta = fanDelta * 3;
    
    let totalAmount = 0;
    const affectedOpponents = [];
    
    opponents.forEach((opponent) => {
        if (fanDelta > 0) {
            // 對手輸錢給我：對手是 payer，我是 receiver
            totalAmount += Math.abs(fanDelta) * session.config.taiValue;
            affectedOpponents.push({ opponent, isReceiver: true }); // I am receiver
        } else {
            // 我輸錢給對手：我是 payer，對手是 receiver
            totalAmount -= Math.abs(fanDelta) * session.config.taiValue;
            affectedOpponents.push({ opponent, isReceiver: false }); // opponent is receiver
        }
    });
    
    if (totalAmount === 0) {
        showToast('番數變動為 0，毋須寫入紀錄。');
        return;
    }
    
    const note = `即時結算 ${fanDelta > 0 ? '+' : ''}${fanDelta}番 × 每番${session.config.taiValue}`.slice(0, 120);
    
    mutateSession((draft) => {
        affectedOpponents.forEach(({ opponent, isReceiver }) => {
            const amount = Math.abs(fanDelta) * session.config.taiValue;
            draft.entries.push({
                id: uid(),
                type: 'adjustment',
                createdAt: new Date().toISOString(),
                note: `即時結算 ${fanDelta > 0 ? '+' : ''}${fanDelta}番；每番${session.config.taiValue}`.slice(0, 120),
                payerId: isReceiver ? opponent.id : me.id,
                receiverId: isReceiver ? me.id : opponent.id,
                amount
            });
        });
    }, `已與三位玩家即時結算 ${fanDelta > 0 ? '+' : ''}${fanDelta}番（每人 ${formatMoney(Math.abs(fanDelta) * session.config.taiValue)}，總計 ${formatMoney(Math.abs(selfFanDelta) * session.config.taiValue)}）。`,
    { preserveQuickUndo: true });
}

function cloneQuickLedgers() {
    return [...quickLedgers.entries()].map(([playerId, ledger]) => [playerId, clone(ledger)]);
}

function pushQuickUndo() {
    quickUndoStack.push({
        session: clone(session),
        ledgers: cloneQuickLedgers(),
        dirty: sessionDirty,
        undoLength: undoStack.length
    });
    if (quickUndoStack.length > 30) quickUndoStack.shift();
    refs.quickUndo.disabled = false;
}

function undoQuickAction() {
    const snapshot = quickUndoStack.pop();
    if (!snapshot) return showToast('沒有可復原的快速操作。');
    session = snapshot.session;
    quickLedgers.clear();
    snapshot.ledgers.forEach(([playerId, ledger]) => quickLedgers.set(playerId, ledger));
    derived = deriveSession(session);
    undoStack.length = Math.min(undoStack.length, snapshot.undoLength);
    redoStack = [];
    setSessionDirty(snapshot.dirty);
    renderSettings();
    renderAll();
    refs.quickUndo.disabled = quickUndoStack.length === 0;
    showToast('已復原上一個快速操作。');
}

function renderQuickLedger() {
    if (!refs.quickGrid) return;
    refs.quickRule.textContent = `拉番 × 每番 ${session.config.taiValue}・不另加底`;
    refs.quickUndo.disabled = quickUndoStack.length === 0;
    refs.quickGrid.replaceChildren();
    QUICK_RELATIONS.forEach(({ key, label }) => {
        const playerId = session.physicalSeats[key];
        const player = session.players.find((item) => item.id === playerId);
        const ledger = quickLedgerFor(player.id);
        const totals = quickLedgerTotals(ledger);
        const column = element('article', 'tms-quick-column');
        column.style.setProperty('--player-color', player.color);
        column.dataset.quickPlayer = player.id;

        const relation = element('span', 'tms-quick-relation', label);
        const name = document.createElement('input');
        name.className = 'tms-quick-name';
        name.type = 'text';
        name.maxLength = 20;
        name.value = player.name;
        name.dataset.quickName = player.id;
        name.setAttribute('aria-label', `${label}名稱`);
        const score = element('strong', 'tms-quick-score', `${totals.fan > 0 ? '+' : ''}${Number(totals.fan.toFixed(3))}`);
        column.append(relation, name, score);

        const fanInput = document.createElement('input');
        fanInput.className = 'tms-quick-fan';
        fanInput.type = 'number';
        fanInput.min = '1';
        fanInput.max = '999';
        fanInput.step = '1';
        fanInput.inputMode = 'numeric';
        fanInput.placeholder = '番數';
        fanInput.dataset.quickFan = player.id;
        fanInput.setAttribute('aria-label', `輸入與${player.name}對局的番數`);
        column.append(fanInput);

        const direction = element('div', 'tms-quick-direction');
        const win = element('button', 'tms-quick-add tms-quick-add--win', '我食');
        win.type = 'button';
        win.dataset.quickAction = 'add-win';
        win.dataset.playerId = player.id;
        const lose = element('button', 'tms-quick-add tms-quick-add--lose', '被食');
        lose.type = 'button';
        lose.dataset.quickAction = 'add-lose';
        lose.dataset.playerId = player.id;
        direction.append(win, lose);
        column.append(direction);

        const list = element('div', 'tms-quick-lines');
        if (!ledger.items.length) list.append(element('span', 'tms-quick-empty', '—'));
        totals.weightedItems.forEach((item) => {
            const multiplier = Number(item.multiplier.toFixed(4));
            const weighted = Number(item.weightedFan.toFixed(3));
            list.append(element('div', `tms-quick-line ${item.direction > 0 ? 'is-win' : 'is-lose'}`,
                `${item.direction > 0 ? '+' : '−'} ${item.fan} ×${multiplier} = ${weighted}番`));
        });
        column.append(list);

        const subtotal = element('div', 'tms-quick-subtotal');
        const displayedFan = Number(totals.fan.toFixed(3));
        const segmentInfo = totals.segmentTotals.length 
            ? totals.segmentTotals.map((seg) => 
                `${seg.broken ? '↓' : '↑'}${seg.roundedFan}番`
              ).join('｜')
            : '—';
        subtotal.append(element('span', '', '拉番小計'), element('strong', '', `${displayedFan > 0 ? '+' : ''}${displayedFan}番`));
        subtotal.append(element('span', '', '各段處理'), element('strong', '', segmentInfo));
        subtotal.append(element('span', '', '結算分數'), element('strong', '', formatMoney(totals.amount, true)));
        column.append(subtotal);

        const actions = element('div', 'tms-quick-actions');
        const settle = element('button', 'is-settle', '結算');
        settle.type = 'button';
        settle.dataset.quickAction = 'settle';
        settle.dataset.playerId = player.id;
        settle.disabled = !ledger.items.length;
        settle.setAttribute('aria-label', `與${player.name}結算快速帳`);
        actions.append(settle);
        column.append(actions);
        refs.quickGrid.append(column);
    });
}

function addQuickFan(playerId, direction) {
    const input = $(`[data-quick-fan="${playerId}"]`, refs.quickGrid);
    const fan = boundedInt(input?.value, 1, 999, 0);
    if (!fan) return showToast('請先輸入番數。', true);

    pushQuickUndo();
    let ledger = quickLedgerFor(playerId);
    let previous = ledger.items[ledger.items.length - 1];
    if (previous && previous.direction !== direction) {
        settleQuickLedger(playerId, { capture: false, reason: 'direction-reversal' });
        ledger = quickLedgerFor(playerId);
        previous = null;
    }

    const segment = previous 
        ? (ledger.breakNext ? (Number(previous.segment) || 0) + 1 : Number(previous.segment) || 0) 
        : 0;
    ledger.items.push({ fan, direction, segment });
    ledger.breakNext = false;
    renderQuickLedger();
    const nextInput = $(`[data-quick-fan="${playerId}"]`, refs.quickGrid);
    nextInput?.focus();
}

function settleQuickLedger(playerId, { capture = true, reason = 'explicit' } = {}) {
    const ledger = quickLedgerFor(playerId);
    if (!ledger.items.length) return showToast('此欄尚未輸入番數。', true);
    if (capture) pushQuickUndo();
    const automatic = reason === 'direction-reversal';
    const totals = quickLedgerTotals(ledger, { breakLast: automatic });
    if (!totals.amount) {
        quickLedgers.delete(playerId);
        renderQuickLedger();
        return showToast(totals.fan
            ? '此欄取整後為 0，已清除，毋須寫入紀錄。'
            : '此欄正負結果互相抵銷，已清除，毋須寫入紀錄。');
    }
    const me = session.players.find((player) => player.id === session.physicalSeats.me);
    const opponent = session.players.find((player) => player.id === playerId);
    const note = `快速帳 ${quickBreakdown(ledger, totals)}；拉番${Number(totals.fan.toFixed(3))}；每番${session.config.taiValue}（不另加底）`.slice(0, 120);
    quickLedgers.delete(playerId);
    mutateSession((draft) => {
        draft.entries.push({
            id: uid(), type: 'adjustment', createdAt: new Date().toISOString(), note,
            payerId: totals.amount > 0 ? opponent.id : me.id,
            receiverId: totals.amount > 0 ? me.id : opponent.id,
            amount: Math.abs(totals.amount)
        });
    }, automatic
        ? `方向反轉，已按斷拉規則（÷2後向下取整）先與${opponent.name}結算 ${formatMoney(Math.abs(totals.amount))}。`
        : `已與${opponent.name}結算 ${formatMoney(Math.abs(totals.amount))}。`,
    { preserveQuickUndo: true });
}

function renameQuickPlayer(playerId, value) {
    const name = String(value || '').trim();
    const player = session.players.find((item) => item.id === playerId);
    if (!player || name === player.name) return;
    if (!name) return renderQuickLedger();
    pushQuickUndo();
    mutateSession((draft) => {
        draft.players.find((item) => item.id === playerId).name = name.slice(0, 20);
    }, `已更新${name.slice(0, 20)}的名稱。`, { preserveQuickUndo: true });
    renderSettings();
}

function dismissedMilestonesForSession(sessionId) {
    if (!dismissedSeatMilestones.has(sessionId)) dismissedSeatMilestones.set(sessionId, new Set());
    return dismissedSeatMilestones.get(sessionId);
}

function currentSeatMilestone() {
    return Math.floor(derived.handCount / 4) * 4;
}

function dismissCurrentSeatCue() {
    const milestone = currentSeatMilestone();
    if (milestone >= 4) dismissedMilestonesForSession(session.id).add(milestone);
    visibleSeatCueKey = '';
    if (refs.seatCue) refs.seatCue.hidden = true;
}

function resetSeatCueDismissals(sessionId = session.id) {
    dismissedSeatMilestones.delete(sessionId);
    visibleSeatCueKey = '';
}

function renderSeatCue() {
    if (!refs.seatCue || !refs.seatCueText) return;
    const milestone = currentSeatMilestone();
    const dismissed = milestone >= 4 && dismissedMilestonesForSession(session.id).has(milestone);
    if (milestone < 4 || dismissed) {
        refs.seatCue.hidden = true;
        visibleSeatCueKey = '';
        return;
    }
    const cueKey = `${session.id}:${milestone}`;
    if (visibleSeatCueKey !== cueKey) {
        refs.seatCueText.textContent = `已完成 ${milestone} 局，玩家有換位嗎？`;
        visibleSeatCueKey = cueKey;
    }
    refs.seatCue.hidden = false;
}

function hasPendingQuickRows() {
    return [...quickLedgers.values()].some((ledger) => ledger.items.length > 0);
}

function seatPlayer(relation) {
    const playerId = seatDialogDraft?.[relation];
    return session.players.find((player) => player.id === playerId);
}

function announceSeat(message) {
    if (!refs.seatLive) return;
    refs.seatLive.textContent = '';
    requestAnimationFrame(() => {
        if (refs.seatDialog.open) refs.seatLive.textContent = message;
    });
}

function renderSeatDialog(focusRelation = '') {
    if (!seatDialogDraft || !refs.seatGrid) return;
    refs.seatGrid.replaceChildren();
    PHYSICAL_SEAT_KEYS.forEach((relation) => {
        const player = seatPlayer(relation);
        const fixed = relation === 'me';
        const card = document.createElement(fixed ? 'div' : 'button');
        card.className = 'tms-seat-slot';
        card.dataset.seatRelation = relation;
        card.classList.toggle('is-fixed', fixed);
        card.classList.toggle('is-selected', selectedSeatRelation === relation);
        card.classList.toggle('is-drop-target', seatPointerDrag?.moved && seatPointerDrag.target === relation && seatPointerDrag.source !== relation);
        if (fixed) {
            card.setAttribute('role', 'group');
            card.setAttribute('aria-label', `${PHYSICAL_SEAT_LABELS[relation]}：${player.name}，位置固定`);
        } else {
            card.type = 'button';
            card.draggable = false;
            card.setAttribute('aria-pressed', String(selectedSeatRelation === relation));
            card.setAttribute('aria-label', `${PHYSICAL_SEAT_LABELS[relation]}：${player.name}。按 Enter 或空白鍵選取或交換`);
        }
        card.append(
            element('span', 'tms-seat-slot__label', PHYSICAL_SEAT_LABELS[relation]),
            element('strong', 'tms-seat-slot__player', player.name)
        );
        refs.seatGrid.append(card);
    });

    refs.seatSummary.textContent = `上家：${seatPlayer('upper').name} · 對家：${seatPlayer('opposite').name} · 下家：${seatPlayer('lower').name}`;
    refs.seatPendingWarning.hidden = !hasPendingQuickRows();
    const changed = PHYSICAL_SEAT_KEYS.some((key) => seatDialogDraft[key] !== session.physicalSeats[key]);
    refs.seatConfirm.disabled = !changed || !isValidPhysicalSeats(seatDialogDraft, session.players);

    if (focusRelation) {
        requestAnimationFrame(() => {
            refs.seatGrid.querySelector(`[data-seat-relation="${focusRelation}"]`)?.focus();
        });
    }
}

function openSeatDialog(trigger) {
    seatDialogDraft = clone(session.physicalSeats);
    seatDialogTrigger = trigger || refs.adjustSeats;
    selectedSeatRelation = null;
    seatPointerDrag = null;
    renderSeatDialog();
    if (typeof refs.seatDialog.showModal === 'function') refs.seatDialog.showModal();
    else refs.seatDialog.setAttribute('open', '');
    requestAnimationFrame(() => refs.seatGrid.querySelector('[data-seat-relation="upper"]')?.focus());
}

function restoreSeatDialogFocus() {
    const trigger = seatDialogTrigger;
    seatDialogDraft = null;
    seatDialogTrigger = null;
    selectedSeatRelation = null;
    seatPointerDrag = null;
    const target = trigger?.isConnected && !trigger.closest('[hidden]') ? trigger : refs.adjustSeats;
    requestAnimationFrame(() => target?.focus());
}

function closeSeatDialog(returnValue = 'cancel') {
    if (!refs.seatDialog.open) return;
    if (typeof refs.seatDialog.close === 'function') refs.seatDialog.close(returnValue);
    else {
        refs.seatDialog.removeAttribute('open');
        restoreSeatDialogFocus();
    }
}

function swapSeatDraft(firstRelation, secondRelation) {
    const firstId = seatDialogDraft[firstRelation];
    seatDialogDraft[firstRelation] = seatDialogDraft[secondRelation];
    seatDialogDraft[secondRelation] = firstId;
}

function pickOrSwapSeat(relation) {
    if (!MOVABLE_PHYSICAL_SEATS.includes(relation)) return;
    if (!selectedSeatRelation) {
        selectedSeatRelation = relation;
        const playerNameText = seatPlayer(relation).name;
        renderSeatDialog(relation);
        announceSeat(`已選擇${playerNameText}，請選擇另一個位置交換。`);
        return;
    }
    if (selectedSeatRelation === relation) {
        selectedSeatRelation = null;
        renderSeatDialog(relation);
        announceSeat('已取消選取。');
        return;
    }
    const firstRelation = selectedSeatRelation;
    const firstName = seatPlayer(firstRelation).name;
    const secondName = seatPlayer(relation).name;
    swapSeatDraft(firstRelation, relation);
    selectedSeatRelation = null;
    renderSeatDialog(relation);
    announceSeat(`已交換${firstName}與${secondName}的位置。`);
}

function confirmSeatDialog() {
    if (!seatDialogDraft || !isValidPhysicalSeats(seatDialogDraft, session.players)) return;
    if (PHYSICAL_SEAT_KEYS.every((key) => seatDialogDraft[key] === session.physicalSeats[key])) return;
    const nextPhysicalSeats = Object.fromEntries(PHYSICAL_SEAT_KEYS.map((key) => [key, seatDialogDraft[key]]));
    dismissCurrentSeatCue();
    mutateSession((draft) => {
        draft.physicalSeats = nextPhysicalSeats;
    });
    closeSeatDialog('confirm');
    showToast('已更新快速帳玩家位置；分數、莊家與紀錄維持不變。');
}

function updateSeatDragVisual() {
    $$('[data-seat-relation]', refs.seatGrid).forEach((card) => {
        const relation = card.dataset.seatRelation;
        card.classList.toggle('is-selected', selectedSeatRelation === relation || (seatPointerDrag?.moved && seatPointerDrag.source === relation));
        card.classList.toggle('is-drop-target', Boolean(seatPointerDrag?.moved && seatPointerDrag.target === relation && seatPointerDrag.source !== relation));
    });
}

function beginSeatPointer(event) {
    const card = event.target.closest('button[data-seat-relation]');
    if (!card || !MOVABLE_PHYSICAL_SEATS.includes(card.dataset.seatRelation)) return;
    seatPointerDrag = {
        pointerId: event.pointerId,
        source: card.dataset.seatRelation,
        target: card.dataset.seatRelation,
        startX: event.clientX,
        startY: event.clientY,
        moved: false
    };
    try { card.setPointerCapture(event.pointerId); } catch (_error) { /* Pointer capture may be unavailable in older hosts. */ }
}

function seatDropRelationAt(clientX, clientY) {
    const target = document.elementFromPoint(clientX, clientY)?.closest('button[data-seat-relation]');
    return target && refs.seatGrid.contains(target) && MOVABLE_PHYSICAL_SEATS.includes(target.dataset.seatRelation)
        ? target.dataset.seatRelation
        : null;
}

function moveSeatPointer(event) {
    if (!seatPointerDrag || event.pointerId !== seatPointerDrag.pointerId) return;
    if (Math.hypot(event.clientX - seatPointerDrag.startX, event.clientY - seatPointerDrag.startY) > 8) {
        seatPointerDrag.moved = true;
    }
    if (!seatPointerDrag.moved) return;
    event.preventDefault();
    seatPointerDrag.target = seatDropRelationAt(event.clientX, event.clientY);
    updateSeatDragVisual();
}

function endSeatPointer(event) {
    if (!seatPointerDrag || event.pointerId !== seatPointerDrag.pointerId) return;
    const drag = seatPointerDrag;
    const finalTarget = drag.moved ? seatDropRelationAt(event.clientX, event.clientY) : null;
    const sourceCard = refs.seatGrid.querySelector(`[data-seat-relation="${drag.source}"]`);
    try {
        if (sourceCard?.hasPointerCapture(event.pointerId)) sourceCard.releasePointerCapture(event.pointerId);
    } catch (_error) { /* The pointer may already be released. */ }
    seatPointerDrag = null;
    updateSeatDragVisual();
    if (!drag.moved) return;
    event.preventDefault();
    suppressSeatClick = true;
    setTimeout(() => { suppressSeatClick = false; }, 0);
    if (!finalTarget || drag.source === finalTarget) return;
    const firstName = seatPlayer(drag.source).name;
    const secondName = seatPlayer(finalTarget).name;
    swapSeatDraft(drag.source, finalTarget);
    selectedSeatRelation = null;
    renderSeatDialog(finalTarget);
    announceSeat(`已將${firstName}與${secondName}交換位置。`);
}

function cancelSeatPointer(event) {
    if (!seatPointerDrag || event.pointerId !== seatPointerDrag.pointerId) return;
    seatPointerDrag = null;
    updateSeatDragVisual();
}

function renderScoreboard() {
    refs.scoreGrid.replaceChildren();
    const lastEntry = derived.entries[derived.entries.length - 1];
    const lastDeltas = lastEntry?.deltas || {};
    session.players.forEach((player) => {
        const card = element('article', 'tms-player-score');
        card.style.setProperty('--player-color', player.color);
        if (player.id === derived.dealerState.playerId) card.classList.add('is-dealer');

        const top = element('div', 'tms-player-score__top');
        const identity = element('div', 'tms-player-score__top');
        identity.append(element('span', 'tms-player-score__name', player.name));
        top.append(identity);
        if (player.id === derived.dealerState.playerId) top.append(element('span', 'tms-badge', '莊'));

        const value = element('strong', 'tms-player-score__value', formatMoney(derived.totals[player.id]));
        const meta = element('div', 'tms-player-score__meta');
        meta.append(element('span', '', `${derived.stats[player.id].wins} 胡 · ${derived.stats[player.id].selfDraws} 自摸`));
        const delta = finiteNumber(lastDeltas[player.id], 0);
        const deltaEl = element('span', `tms-player-score__delta ${delta > 0 ? 'is-positive' : delta < 0 ? 'is-negative' : ''}`, delta ? formatMoney(delta, true) : '—');
        meta.append(deltaEl);
        card.append(top, value, meta);
        refs.scoreGrid.append(card);
    });
}

function renderDealer() {
    const state = derived.dealerState;
    const bonus = dealerBonusTai(state, session.config);
    refs.dealerName.textContent = playerName(session, state.playerId);
    refs.dealerBonus.textContent = `莊家 +${bonus} 番`;
    refs.streak.textContent = state.streak;
    refs.pull.textContent = state.pull;
    refs.bonus.textContent = bonus;
}

function renderPlayerOptions() {
    const selects = [refs.winner, refs.discarder, refs.adjustPayer, refs.adjustReceiver, refs.initialDealer];
    selects.forEach((select) => {
        const current = select.value;
        select.replaceChildren();
        session.players.forEach((player) => select.append(new Option(player.name, player.id)));
        if (session.players.some((player) => player.id === current)) select.value = current;
    });

    const baoCurrent = refs.baoPlayer.value;
    refs.baoPlayer.replaceChildren(new Option('不使用', ''));
    session.players.forEach((player) => refs.baoPlayer.append(new Option(player.name, player.id)));
    if (session.players.some((player) => player.id === baoCurrent)) refs.baoPlayer.value = baoCurrent;

    refs.multiWinners.replaceChildren();
    session.players.forEach((player) => {
        const label = element('label', 'tms-check-option');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = player.id;
        input.name = 'multiWinner';
        label.append(input, document.createTextNode(player.name));
        refs.multiWinners.append(label);
    });
}

function setOutcome(nextOutcome) {
    outcome = nextOutcome;
    $$('[data-outcome]', refs.outcomePicker).forEach((button) => {
        const selected = button.dataset.outcome === outcome;
        button.classList.toggle('is-selected', selected);
        button.setAttribute('aria-pressed', String(selected));
    });

    const isAdjustment = outcome === 'adjustment';
    const isDraw = outcome === 'draw';
    const isMulti = outcome === 'multiWin';
    const isSelfDraw = outcome === 'selfDraw';
    refs.winnerField.hidden = isAdjustment || isDraw || isMulti;
    refs.multiWinnerField.hidden = !isMulti;
    refs.discarderField.hidden = !['discard', 'multiWin'].includes(outcome);
    refs.taiField.hidden = isAdjustment || isDraw;
    refs.multiplierField.hidden = isAdjustment || isDraw;
    refs.baoField.hidden = !isSelfDraw;
    refs.dealerActionField.hidden = isAdjustment;
    refs.adjustPayerField.hidden = !isAdjustment;
    refs.adjustReceiverField.hidden = !isAdjustment;
    refs.adjustAmountField.hidden = !isAdjustment;
    renderPreview();
}

function readFormInput({ validate = true } = {}) {
    const base = {
        id: editingEntryId || uid(),
        type: outcome,
        createdAt: editingEntryId
            ? session.entries.find((entry) => entry.id === editingEntryId)?.createdAt || new Date().toISOString()
            : new Date().toISOString(),
        note: refs.note.value.trim().slice(0, 120)
    };

    if (outcome === 'adjustment') {
        const input = {
            ...base,
            payerId: refs.adjustPayer.value,
            receiverId: refs.adjustReceiver.value,
            amount: boundedInt(refs.adjustAmount.value, 1, 99999999, 1)
        };
        if (validate && input.payerId === input.receiverId) throw new Error('賞罰的付款者與收款者不可相同。');
        return input;
    }

    const winnerIds = outcome === 'multiWin'
        ? $$('input[name="multiWinner"]:checked', refs.multiWinners).map((input) => input.value)
        : ['discard', 'selfDraw'].includes(outcome) ? [refs.winner.value] : [];
    const input = {
        ...base,
        winnerIds,
        discarderId: ['discard', 'multiWin'].includes(outcome) ? refs.discarder.value : '',
        tai: boundedInt(refs.tai.value, 0, 999, 0),
        multiplier: boundedInt(refs.multiplier.value, 1, 3, 1),
        baoPlayerId: outcome === 'selfDraw' ? refs.baoPlayer.value : '',
        dealerAction: refs.dealerAction.value,
        breakPullAfter: Boolean(editingEntryId
            && session.entries.find((entry) => entry.id === editingEntryId)?.breakPullAfter)
    };
    if (validate) validateHandInput(input, new Set(session.players.map((player) => player.id)));
    return input;
}

function previewInput(input) {
    const temporary = clone(session);
    const existingIndex = editingEntryId ? temporary.entries.findIndex((entry) => entry.id === editingEntryId) : -1;
    if (existingIndex >= 0) temporary.entries[existingIndex] = input;
    else temporary.entries.push(input);
    const result = deriveSession(temporary);
    return existingIndex >= 0 ? result.entries[existingIndex] : result.entries[result.entries.length - 1];
}

function renderPreview() {
    refs.preview.replaceChildren();
    try {
        const input = readFormInput({ validate: false });
        if (['discard', 'selfDraw'].includes(input.type) && !input.winnerIds[0]) throw new Error('請選擇贏家。');
        if (input.type === 'multiWin' && input.winnerIds.length < 2) throw new Error('請選至少兩位贏家。');
        if (['discard', 'multiWin'].includes(input.type) && input.winnerIds.includes(input.discarderId)) throw new Error('放槍者不可同時是贏家。');
        if (input.type === 'adjustment' && input.payerId === input.receiverId) throw new Error('付款者與收款者必須不同。');
        const preview = previewInput(input);
        if (!preview.transfers.length) {
            refs.preview.append(element('p', 'tms-help', preview.explanation || '本局不產生金額轉移。'));
        } else {
            preview.transfers.forEach((transfer) => {
                const row = element('div', 'tms-transfer-row');
                const text = element('div');
                text.append(element('strong', '', `${playerName(session, transfer.fromId)} → ${playerName(session, transfer.toId)}`));
                text.append(element('small', '', `${transfer.reason} · ${preview.explanation}`));
                row.append(text, element('strong', '', formatMoney(transfer.amount)));
                refs.preview.append(row);
            });
        }
        const sum = Object.values(preview.deltas).reduce((total, amount) => total + amount, 0);
        refs.previewZero.textContent = `四家合計 ${formatMoney(sum)}`;
    } catch (error) {
        refs.preview.append(element('p', 'tms-help', error.message));
        refs.previewZero.textContent = '等待完整輸入';
    }
}

function submitRound(event) {
    event.preventDefault();
    try {
        const input = readFormInput();
        const wasEditing = Boolean(editingEntryId);
        mutateSession((draft) => {
            if (wasEditing) {
                const index = draft.entries.findIndex((entry) => entry.id === editingEntryId);
                if (index < 0) throw new Error('找不到要編輯的紀錄。');
                draft.entries[index] = input;
            } else {
                draft.entries.push(input);
            }
        }, wasEditing ? '已更新紀錄，後續分數已重新計算。' : '已記錄本局。');
        cancelEdit();
        resetRoundForm();
    } catch (error) {
        showToast(error.message, true);
    }
}

function resetRoundForm() {
    refs.form.reset();
    setOutcome('discard');
    refs.tai.value = '0';
    refs.multiplier.value = '1';
    refs.dealerAction.value = 'auto';
    renderPlayerOptions();
    const dealerId = derived.dealerState.playerId;
    refs.winner.value = dealerId;
    refs.discarder.value = session.players.find((player) => player.id !== dealerId)?.id || session.players[0].id;
    refs.adjustPayer.value = session.players[0].id;
    refs.adjustReceiver.value = session.players[1].id;
    renderPreview();
}

function editEntry(id) {
    const input = session.entries.find((entry) => entry.id === id);
    if (!input || input.type === 'breakPull') return;
    editingEntryId = id;
    refs.formTitle.textContent = '編輯紀錄';
    refs.submit.textContent = '更新並重算';
    refs.cancelEdit.hidden = false;
    switchView('score');
    setOutcome(input.type);
    renderPlayerOptions();
    refs.note.value = input.note || '';

    if (input.type === 'adjustment') {
        refs.adjustPayer.value = input.payerId;
        refs.adjustReceiver.value = input.receiverId;
        refs.adjustAmount.value = input.amount;
    } else {
        refs.winner.value = input.winnerIds[0] || session.players[0].id;
        $$('input[name="multiWinner"]', refs.multiWinners).forEach((checkbox) => {
            checkbox.checked = input.winnerIds.includes(checkbox.value);
        });
        refs.discarder.value = input.discarderId || session.players[0].id;
        refs.tai.value = input.tai;
        refs.multiplier.value = input.multiplier;
        refs.baoPlayer.value = input.baoPlayerId || '';
        refs.dealerAction.value = input.dealerAction;
    }
    renderPreview();
    refs.form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function cancelEdit() {
    editingEntryId = null;
    refs.formTitle.textContent = '新增牌局結果';
    refs.submit.textContent = '記錄本局';
    refs.cancelEdit.hidden = true;
}

function renderHistory() {
    refs.history.replaceChildren();
    const filter = refs.historyFilter?.value || 'all';
    const visibleEntries = derived.entries.filter((entry) => historyMatchesFilter(entry, filter));
    refs.historyEmpty.hidden = visibleEntries.length > 0;
    refs.historyEmpty.textContent = derived.entries.length ? '沒有符合此篩選的紀錄。' : '尚未記錄牌局。';
    [...visibleEntries].reverse().forEach((entry) => {
        const item = element('article', 'tms-history-item');
        const numberText = entry.handNumber ? `#${entry.handNumber}` : entry.input.type === 'breakPull' ? '舊' : '調';
        item.append(element('div', 'tms-history-item__number', numberText));
        const body = element('div');
        const head = element('div', 'tms-history-item__head');
        const heading = element('div');
        heading.append(element('h3', '', entry.summary));
        heading.append(element('p', '', entry.explanation));
        head.append(heading, element('span', 'tms-badge', dealerLabel(entry.dealerBefore)));
        body.append(head);
        if (entry.input.type !== 'breakPull' && entry.input.note && entry.input.note !== entry.explanation) {
            body.append(element('p', '', `備註：${entry.input.note}`));
        }

        const deltas = element('div', 'tms-history-item__deltas');
        session.players.forEach((player) => {
            const amount = entry.deltas[player.id];
            if (!amount) return;
            deltas.append(element('span', `tms-delta-chip ${amount > 0 ? 'is-positive' : 'is-negative'}`, `${player.name} ${formatMoney(amount, true)}`));
        });
        body.append(deltas);

        const actions = element('div', 'tms-history-item__actions');
        if (entry.input.type !== 'breakPull') {
            const edit = element('button', 'tms-text-button', '編輯');
            edit.type = 'button';
            edit.addEventListener('click', () => editEntry(entry.input.id));
            actions.append(edit);
        }
        const remove = element('button', 'tms-text-button', '刪除');
        remove.type = 'button';
        remove.addEventListener('click', () => {
            if (!confirm(`確定刪除「${entry.summary}」？後續分數與莊家狀態會全部重算。`)) return;
            mutateSession((draft) => {
                draft.entries = draft.entries.filter((record) => record.id !== entry.input.id);
            }, '已刪除紀錄並重算整場。');
        });
        actions.append(remove);
        body.append(actions);
        item.append(body);
        refs.history.append(item);
    });
}

function dealerLabel(state) {
    return `莊 ${playerName(session, state.playerId)} · 連${state.streak}拉${state.pull}`;
}

function renderChart() {
    refs.chart.replaceChildren();
    refs.chartLegend.replaceChildren();
    session.players.forEach((player) => {
        const item = element('span', 'tms-legend-item');
        const dot = element('span', 'tms-legend-dot');
        dot.style.setProperty('--player-color', player.color);
        item.append(dot, document.createTextNode(player.name));
        refs.chartLegend.append(item);
    });

    const points = derived.chartPoints;
    refs.chartEmpty.hidden = points.length > 1;
    if (points.length <= 1) return;

    const width = 720;
    const height = 320;
    const margin = { top: 22, right: 24, bottom: 42, left: 72 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const values = points.flatMap((point) => Object.values(point.totals));
    let min = Math.min(...values, 0);
    let max = Math.max(...values, 0);
    if (min === max) { min -= 1; max += 1; }
    const pad = Math.max((max - min) * 0.12, 10);
    min -= pad;
    max += pad;
    const x = (index) => margin.left + (points.length === 1 ? 0 : index / (points.length - 1)) * innerWidth;
    const y = (value) => margin.top + (max - value) / (max - min) * innerHeight;

    for (let step = 0; step <= 4; step += 1) {
        const value = min + ((max - min) * step / 4);
        const yPos = y(value);
        refs.chart.append(svgElement('line', { x1: margin.left, y1: yPos, x2: width - margin.right, y2: yPos, stroke: '#dce3dd', 'stroke-width': 1 }));
        const label = svgElement('text', { x: margin.left - 10, y: yPos + 4, 'text-anchor': 'end', fill: '#64706c', 'font-size': 11 });
        label.textContent = compactNumber(value);
        refs.chart.append(label);
    }

    const labelIndexes = [...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])];
    labelIndexes.forEach((index) => {
        const label = svgElement('text', { x: x(index), y: height - 14, 'text-anchor': 'middle', fill: '#64706c', 'font-size': 11 });
        label.textContent = index === 0 ? '開始' : `第 ${index} 筆`;
        refs.chart.append(label);
    });

    session.players.forEach((player) => {
        const coordinates = points.map((point, index) => `${x(index)},${y(point.totals[player.id])}`).join(' ');
        refs.chart.append(svgElement('polyline', {
            points: coordinates,
            fill: 'none',
            stroke: player.color,
            'stroke-width': 3,
            'stroke-linejoin': 'round',
            'stroke-linecap': 'round'
        }));
        const last = points[points.length - 1];
        refs.chart.append(svgElement('circle', { cx: x(points.length - 1), cy: y(last.totals[player.id]), r: 4.5, fill: player.color, stroke: '#fff', 'stroke-width': 2 }));
    });
}

function renderStats() {
    refs.titleGrid.replaceChildren();
    const definitions = [
        ['領先王', (player) => derived.totals[player.id], (value) => formatMoney(value)],
        ['胡牌王', (player) => derived.stats[player.id].wins, (value) => `${value} 次`],
        ['自摸王', (player) => derived.stats[player.id].selfDraws, (value) => `${value} 次`],
        ['放槍王', (player) => derived.stats[player.id].discards, (value) => `${value} 次`]
    ];
    definitions.forEach(([title, getter, formatter]) => {
        const values = session.players.map((player) => ({ player, value: getter(player) }));
        const max = Math.max(...values.map((item) => item.value));
        const leaders = values.filter((item) => item.value === max).map((item) => item.player.name).join('、');
        const card = element('div', 'tms-title-card');
        card.append(element('span', '', title), element('strong', '', leaders), element('small', '', formatter(max)));
        refs.titleGrid.append(card);
    });
}

function renderSettlements() {
    refs.settlementList.replaceChildren();
    const sorted = [...session.players].sort((a, b) => derived.totals[b.id] - derived.totals[a.id]);
    sorted.forEach((player, index) => {
        const row = element('div', 'tms-settlement-row');
        const net = derived.totals[player.id] - player.initialScore;
        row.append(element('span', '', `${index + 1}. ${player.name}`), element('strong', '', formatMoney(net, true)));
        refs.settlementList.append(row);
    });
    const plan = settlementPlan(session, derived);
    refs.settlementList.append(element('h3', 'tms-settlement-subtitle', '精簡找數建議'));
    if (!plan.length) {
        refs.settlementList.append(element('p', 'tms-help', '目前四家已平數，毋須轉帳。'));
    } else {
        plan.forEach((transfer) => {
            const row = element('div', 'tms-settlement-row tms-settlement-row--plan');
            row.append(element('span', '', `${playerName(session, transfer.fromId)} → ${playerName(session, transfer.toId)}`), element('strong', '', formatMoney(transfer.amount)));
            refs.settlementList.append(row);
        });
    }
}

function renderSettings() {
    refs.sessionTitle.value = session.title;
    refs.playerSettings.replaceChildren();
    session.players.forEach((player, index) => {
        const nameLabel = element('label', 'tms-field tms-player-setting');
        nameLabel.append(element('span', '', PLAYER_SETTING_LABELS[index]));
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.maxLength = 20;
        nameInput.value = player.name;
        nameInput.dataset.playerName = player.id;
        nameInput.autocomplete = 'off';
        nameLabel.append(nameInput);
        refs.playerSettings.append(nameLabel);
    });
    renderPlayerOptions();
    refs.initialDealer.value = session.initialDealerId;
    refs.baseAmount.value = session.config.baseAmount;
    refs.taiValue.value = session.config.taiValue;
    refs.dealerBaseTai.value = session.config.dealerBaseTai;
    refs.streakTai.value = session.config.streakTai;
    refs.pullTai.value = session.config.pullTai;
    refs.currency.value = session.config.currency;
    refs.drawContinues.checked = session.config.drawContinues;
    refs.drawAddsPull.checked = session.config.drawAddsPull;
    renderRuleExample();
}

function renderRuleExample() {
    const base = boundedInt(refs.baseAmount.value, 0, 999999, 5);
    const taiValue = boundedInt(refs.taiValue.value, 1, 999999, 1);
    const dealerBase = boundedInt(refs.dealerBaseTai.value, 0, 99, 1);
    const streakTai = boundedInt(refs.streakTai.value, 0, 99, 1);
    const pullTai = boundedInt(refs.pullTai.value, 0, 99, 1);
    const onePullBonus = dealerBase + streakTai + pullTai;
    refs.ruleExample.textContent = `預設公式：涉及莊家的付款，加番 = ${dealerBase} + 連莊次數 × ${streakTai} + 拉莊次數 × ${pullTai}。例如連一拉一時加 ${onePullBonus} 番；若牌型 5 番，付款為底 ${base} + (${5 + onePullBonus} × ${taiValue})。`;
}

function saveSettings(event) {
    event.preventDefault();
    try {
        const names = Object.fromEntries($$('[data-player-name]', refs.playerSettings).map((input) => [input.dataset.playerName, input.value.trim()]));
        if (Object.values(names).some((name) => !name)) throw new Error('玩家名稱不可空白。');
        mutateSession((draft) => {
            draft.title = refs.sessionTitle.value.trim() || '今晚牌局';
            draft.players.forEach((player) => {
                player.name = names[player.id].slice(0, 20);
            });
            draft.initialDealerId = refs.initialDealer.value;
            draft.config = {
                baseAmount: boundedInt(refs.baseAmount.value, 0, 999999, 5),
                taiValue: boundedInt(refs.taiValue.value, 1, 999999, 1),
                currency: refs.currency.value.trim().slice(0, 4) || '$',
                dealerBaseTai: boundedInt(refs.dealerBaseTai.value, 0, 99, 1),
                streakTai: boundedInt(refs.streakTai.value, 0, 99, 1),
                pullTai: boundedInt(refs.pullTai.value, 0, 99, 1),
                drawContinues: refs.drawContinues.checked,
                drawAddsPull: refs.drawAddsPull.checked
            };
        }, '設定已儲存，整場紀錄已重算。');
        renderSettings();
    } catch (error) {
        showToast(error.message, true);
    }
}

function switchView(view) {
    activeView = view;
    $$('.tms-view').forEach((section) => {
        const active = section.dataset.view === view;
        section.classList.toggle('is-active', active);
        section.hidden = !active;
    });
    $$('[data-tab]').forEach((button) => {
        const active = button.dataset.tab === view;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-selected', String(active));
    });
    if (view === 'settings') renderSettings();
    if (view === 'chart') renderChart();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function exportJson() {
    const filename = `${safeFilename(session.title)}-${dateStamp()}.json`;
    downloadBlob(new Blob([JSON.stringify(session, null, 2)], { type: 'application/json;charset=utf-8' }), filename);
    showToast('已匯出牌局 JSON。');
}

function exportCsv() {
    const header = ['筆數', '局數', '類型', '摘要', ...session.players.map((player) => player.name), '備註'];
    const rows = derived.entries.map((entry, index) => [
        index + 1,
        entry.handNumber || '',
        entry.input.type,
        entry.summary,
        ...session.players.map((player) => entry.deltas[player.id]),
        entry.input.note || ''
    ]);
    const totals = ['', '', 'TOTAL', '目前總分', ...session.players.map((player) => derived.totals[player.id]), ''];
    const csv = [header, ...rows, totals].map((row) => row.map(csvCell).join(',')).join('\r\n');
    downloadBlob(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }), `${safeFilename(session.title)}-${dateStamp()}.csv`);
    showToast('已匯出 CSV。');
}

function exportTxt() {
    const text = buildTextExport(session, derived);
    downloadBlob(new Blob([`\uFEFF${text}`], { type: 'text/plain;charset=utf-8' }), `${safeFilename(session.title)}-${dateStamp()}.txt`);
    showToast('已匯出 TXT 牌局紀錄。');
}

async function importJson(file) {
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) return showToast('匯入檔案不可超過 2 MB。', true);
    try {
        const parsed = JSON.parse(await file.text());
        const imported = normalizeSession(parsed);
        if (!confirm(`匯入「${imported.title}」並取代目前牌局？`)) return;
        undoStack.push(clone(session));
        redoStack = [];
        session = imported;
        resetSeatCueDismissals(session.id);
        derived = deriveSession(session);
        saveSession();
        cancelEdit();
        resetRoundForm();
        renderSettings();
        renderAll();
        showToast('牌局匯入完成。');
    } catch (error) {
        showToast(`匯入失敗：${error.message}`, true);
    } finally {
        refs.importFile.value = '';
    }
}

async function shareImage() {
    try {
        const canvas = document.createElement('canvas');
        canvas.width = 1200;
        canvas.height = 630;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#0b2b26';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#d7a83f';
        ctx.fillRect(0, 0, 16, canvas.height);
        ctx.fillStyle = '#fffdf7';
        ctx.font = '700 52px "Microsoft JhengHei", sans-serif';
        ctx.fillText(session.title, 70, 92);
        ctx.fillStyle = '#b9cec7';
        ctx.font = '26px "Microsoft JhengHei", sans-serif';
        ctx.fillText(`${derived.handCount} 局 · ${new Date().toLocaleString('zh-TW')}`, 72, 136);

        session.players.forEach((player, index) => {
            const x = 70 + (index % 2) * 550;
            const y = 210 + Math.floor(index / 2) * 165;
            ctx.fillStyle = 'rgba(255,255,255,0.08)';
            roundRect(ctx, x, y, 510, 130, 24);
            ctx.fill();
            ctx.fillStyle = player.color;
            ctx.fillRect(x, y, 9, 130);
            ctx.fillStyle = '#fffdf7';
            ctx.font = '700 28px "Microsoft JhengHei", sans-serif';
            ctx.fillText(player.name, x + 35, y + 43);
            ctx.font = '800 43px "Microsoft JhengHei", sans-serif';
            ctx.fillText(formatMoney(derived.totals[player.id], true), x + 35, y + 98);
        });
        ctx.fillStyle = '#b9cec7';
        ctx.font = '22px "Microsoft JhengHei", sans-serif';
        ctx.fillText(`目前莊家：${playerName(session, derived.dealerState.playerId)}　連${derived.dealerState.streak}拉${derived.dealerState.pull}`, 72, 585);

        const blob = await new Promise((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('圖片產生失敗。')), 'image/png'));
        const file = new File([blob], `${safeFilename(session.title)}-${dateStamp()}.png`, { type: 'image/png' });
        if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({ title: session.title, text: '台牌整場記分結果', files: [file] });
        } else {
            downloadBlob(blob, file.name);
            showToast('已下載分享圖片。');
        }
    } catch (error) {
        if (error.name !== 'AbortError') showToast(error.message, true);
    }
}

function suggestedSessionTitle() {
    const timestamp = new Intl.DateTimeFormat('zh-TW', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).format(new Date());
    return `${timestamp} 牌局`;
}

function createHostedSession(title, options = {}) {
    const normalizedTitle = String(title ?? '').trim().slice(0, 40);
    if (!normalizedTitle) throw new Error('牌局名稱不可空白。');

    if (options && options.clearHistory) {
        undoStack = [];
    } else {
        undoStack.push(clone(session));
        if (undoStack.length > 30) undoStack.shift();
    }
    redoStack = [];
    quickLedgers.clear();
    quickUndoStack.length = 0;
    session = createDefaultSession();
    session.title = normalizedTitle;
    resetSeatCueDismissals(session.id);
    derived = deriveSession(session);
    saveSession();
    cancelEdit();
    resetRoundForm();
    renderSettings();
    renderAll();
    switchView('score');
    return clone(session);
}

function newSession() {
    if (sessionDirty && !confirm('目前牌局有未儲存變更。確定捨棄並建立新牌局？')) return;
    const title = prompt('請輸入新牌局名稱：', suggestedSessionTitle());
    if (title === null) return;
    try {
        createHostedSession(title);
        showToast('已建立新牌局。');
    } catch (error) {
        showToast(error.message, true);
    }
}

function resetSessionEntries() {
    if (!confirm('確定清除整場紀錄？玩家與規則設定會保留。')) return;
    mutateSession((draft) => { draft.entries = []; }, '整場紀錄已清除。');
    resetSeatCueDismissals();
    cancelEdit();
    resetRoundForm();
}

function element(tag, className = '', text = '') {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== '') node.textContent = text;
    return node;
}

function svgElement(tag, attributes) {
    const node = document.createElementNS(SVG_NS, tag);
    Object.entries(attributes).forEach(([name, value]) => node.setAttribute(name, String(value)));
    return node;
}

function compactNumber(value) {
    return new Intl.NumberFormat('zh-TW', { notation: 'compact', maximumFractionDigits: 1 }).format(Math.round(value));
}

function csvCell(value) {
    const text = String(value ?? '');
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function safeFilename(value) {
    return String(value || 'mahjong-session').replace(/[<>:"/\\|?*\x00-\x1F]/g, '-').slice(0, 60) || 'mahjong-session';
}

function dateStamp() {
    return new Date().toISOString().slice(0, 10);
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function roundRect(ctx, x, y, width, height, radius) {
    const r = Math.min(Math.max(radius, 0), width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function showToast(message, isError = false) {
    clearTimeout(toastTimer);
    refs.toast.textContent = message;
    refs.toast.style.background = isError ? '#842c27' : '#0b2b26';
    refs.toast.hidden = false;
    toastTimer = setTimeout(() => { refs.toast.hidden = true; }, 3600);
}

function wireEvents() {
    refs.form.addEventListener('submit', submitRound);
    refs.settingsForm.addEventListener('submit', saveSettings);
    refs.cancelEdit.addEventListener('click', () => { cancelEdit(); resetRoundForm(); });
    refs.undo.addEventListener('click', undo);
    refs.redo.addEventListener('click', redo);
    refs.quickUndo.addEventListener('click', undoQuickAction);
    $$('[data-open-seat-dialog]').forEach((button) => {
        button.addEventListener('click', () => openSeatDialog(button));
    });
    refs.seatCueDismiss.addEventListener('click', dismissCurrentSeatCue);
    refs.seatCancel.addEventListener('click', () => closeSeatDialog('cancel'));
    refs.seatConfirm.addEventListener('click', confirmSeatDialog);
    refs.seatDialog.addEventListener('cancel', (event) => {
        event.preventDefault();
        closeSeatDialog('cancel');
    });
    refs.seatDialog.addEventListener('close', restoreSeatDialogFocus);
    refs.seatGrid.addEventListener('pointerdown', beginSeatPointer);
    refs.seatGrid.addEventListener('pointermove', moveSeatPointer);
    refs.seatGrid.addEventListener('pointerup', endSeatPointer);
    refs.seatGrid.addEventListener('pointercancel', cancelSeatPointer);
    refs.seatGrid.addEventListener('click', (event) => {
        const card = event.target.closest('button[data-seat-relation]');
        if (!card) return;
        if (suppressSeatClick) {
            event.preventDefault();
            return;
        }
        pickOrSwapSeat(card.dataset.seatRelation);
    });
    refs.seatGrid.addEventListener('keydown', (event) => {
        const card = event.target.closest('button[data-seat-relation]');
        if (!card) return;
        if (event.key === 'Escape') {
            event.preventDefault();
            closeSeatDialog('cancel');
            return;
        }
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            pickOrSwapSeat(card.dataset.seatRelation);
            return;
        }
        const offset = ['ArrowLeft', 'ArrowUp'].includes(event.key)
            ? -1
            : ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : 0;
        if (!offset) return;
        event.preventDefault();
        const cards = $$('button[data-seat-relation]', refs.seatGrid);
        const currentIndex = cards.indexOf(card);
        cards[(currentIndex + offset + cards.length) % cards.length]?.focus();
    });

    refs.quickGrid.addEventListener('click', (event) => {
        const button = event.target.closest('[data-quick-action]');
        if (!button) return;
        const playerId = button.dataset.playerId;
        if (button.dataset.quickAction === 'add-win') addQuickFan(playerId, 1);
        if (button.dataset.quickAction === 'add-lose') addQuickFan(playerId, -1);
        if (button.dataset.quickAction === 'settle') settleQuickLedger(playerId);
    });
    refs.quickGrid.addEventListener('change', (event) => {
        if (event.target.matches('[data-quick-name]')) renameQuickPlayer(event.target.dataset.quickName, event.target.value);
    });
    refs.quickGrid.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        if (event.target.matches('[data-quick-name]')) renameQuickPlayer(event.target.dataset.quickName, event.target.value);
        if (event.target.matches('[data-quick-fan]')) addQuickFan(event.target.dataset.quickFan, 1);
    });

    refs.outcomePicker.addEventListener('click', (event) => {
        const button = event.target.closest('[data-outcome]');
        if (button) setOutcome(button.dataset.outcome);
    });

    document.addEventListener('click', (event) => {
        const preset = event.target.closest('[data-preset-base][data-preset-tai]');
        if (preset) applyRulePreset(preset.dataset.presetBase, preset.dataset.presetTai);
        const stepButton = event.target.closest('[data-step-target]');
        if (stepButton) {
            const input = document.getElementById(stepButton.dataset.stepTarget);
            input.value = boundedInt(finiteNumber(input.value) + finiteNumber(stepButton.dataset.step), finiteNumber(input.min, 0), finiteNumber(input.max, 999), 0);
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
        const quick = event.target.closest('[data-value]');
        if (quick && quick.closest('#tms-quick-tai')) {
            refs.tai.value = quick.dataset.value;
            refs.tai.dispatchEvent(new Event('input', { bubbles: true }));
        }
        const tab = event.target.closest('[data-tab]');
        if (tab) switchView(tab.dataset.tab);
        
        const quickFanButton = event.target.closest('[data-quick-fan-action]');
        if (quickFanButton) {
            const action = quickFanButton.dataset.quickFanAction;
            const fanDelta = parseInt(action, 10);
            if (!isNaN(fanDelta)) {
                applyQuickFanToAllOpponents(fanDelta);
            }
        }
    });

    [refs.winner, refs.discarder, refs.tai, refs.multiplier, refs.baoPlayer, refs.dealerAction,
        refs.adjustPayer, refs.adjustReceiver, refs.adjustAmount, refs.note, refs.multiWinners]
        .forEach((control) => {
            control.addEventListener('input', renderPreview);
            control.addEventListener('change', renderPreview);
        });

    [refs.baseAmount, refs.taiValue, refs.dealerBaseTai, refs.streakTai, refs.pullTai]
        .forEach((control) => control.addEventListener('input', renderRuleExample));

    refs.historyFilter.addEventListener('change', renderHistory);
    $('#tms-new-session').addEventListener('click', newSession);
    $('#tms-reset-session').addEventListener('click', resetSessionEntries);
}

let resolveSessionHostReady;
const sessionHostReady = new Promise((resolve) => {
    resolveSessionHostReady = resolve;
});

const fillRoundDraft = ({ tai = 0, note = '', isSelfDraw = false } = {}) => {
    const applied = {
        tai: boundedInt(tai, 0, 999, 0),
        note: String(note ?? '').trim().slice(0, 120),
        isSelfDraw: Boolean(isSelfDraw)
    };
    refs.advancedEntry.open = true;
    refs.tai.value = String(applied.tai);
    refs.note.value = applied.note;
    setOutcome(applied.isSelfDraw ? 'selfDraw' : 'discard');
    switchView('score');
    renderPreview();
    requestAnimationFrame(() => {
        const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        refs.taiField.scrollIntoView({ block: 'center', behavior: reducedMotion ? 'auto' : 'smooth' });
        try {
            refs.tai.focus({ preventScroll: true });
        } catch (_error) {
            refs.tai.focus();
        }
        refs.tai.select();
    });
    return applied;
};

const applyHostedPlayerName = (playerId, name) => {
    const target = String(playerId ?? '').trim();
    const normalizedName = String(name ?? '').trim();
    let player = session.players.find((item) => item.id === target);
    if (!player && SEATS.includes(target)) {
        player = session.players.find((item) => item.seat === target);
    }
    if (!player) throw new Error('找不到指定玩家。');
    if (!normalizedName) throw new Error('玩家名稱不可空白。');
    if (normalizedName.length > 20) throw new Error('牌局玩家名稱最多 20 個字；請使用較短的常用玩家名稱。');
    const targetId = player.id;

    mutateSession((draft) => {
        const targetPlayer = draft.players.find((item) => item.id === targetId);
        if (!targetPlayer) throw new Error('找不到指定玩家。');
        targetPlayer.name = normalizedName;
    }, `已更新 ${normalizedName} 的名稱。`);
    if (activeView === 'settings') renderSettings();
    return getHostedSessionStatus();
};

const replaceHostedSession = (payload) => {
    const normalized = normalizeSession(clone(payload));
    const nextDerived = deriveSession(normalized);

    undoStack.push(clone(session));
    if (undoStack.length > 30) undoStack.shift();
    redoStack = [];
    quickLedgers.clear();
    quickUndoStack.length = 0;
    session = normalized;
    resetSeatCueDismissals(session.id);
    derived = nextDerived;
    setSessionDirty(true);
    cancelEdit();
    resetRoundForm();
    renderSettings();
    renderAll();
    switchView('score');
    return clone(session);
};

window.OVMJSessionHost = Object.freeze({
    ready: sessionHostReady,
    getSession: () => clone(session),
    getSessionStatus: getHostedSessionStatus,
    normalizeSession: (value) => clone(normalizeSession(clone(value))),
    hasStorageConflict: () => false,
    markSaved: markHostedSessionSaved,
    createSession: createHostedSession,
    applyPlayerName: applyHostedPlayerName,
    fillRoundDraft,
    replaceSession: replaceHostedSession
});

window.OVMJSessionTest = Object.freeze({
    schemaVersion: SCHEMA_VERSION,
    storageKey: STORAGE_KEY,
    createDefaultSession: () => clone(createDefaultSession()),
    normalizeSession: (value) => clone(normalizeSession(clone(value))),
    deriveSession: (value) => clone(deriveSession(normalizeSession(clone(value)))),
    dealerBonusTai: (state, config) => dealerBonusTai(clone(state), clone(config)),
    settlementPlan: (value) => {
        const normalized = normalizeSession(clone(value));
        return clone(settlementPlan(normalized, deriveSession(normalized)));
    },
    historyMatchesFilter: (entry, filter) => historyMatchesFilter(clone(entry), filter),
    buildTextExport: (value) => {
        const normalized = normalizeSession(clone(value));
        return buildTextExport(normalized, deriveSession(normalized));
    },
    hasStorageConflict: () => false,
    getSession: () => clone(session)
});

const accountEntryLink = $('#tms-memory-notice a');
if (accountEntryLink && window.OVMJ_APP_CONFIG?.accountEntryUrl) {
    accountEntryLink.href = window.OVMJ_APP_CONFIG.accountEntryUrl;
}

wireEvents();
renderSettings();
resetRoundForm();
renderAll();
saveSession();
markHostedSessionSaved();
document.documentElement.dataset.tmsApp = 'ready';
resolveSessionHostReady();