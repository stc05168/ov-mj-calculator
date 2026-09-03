(function () {
    'use strict';

    document.documentElement.dataset.suiteApp = 'loading';
    const RESULT_SCHEMA = 'ov-mj-calculation-result/v1';
    const params = new URLSearchParams(location.search);
    const accountMode = params.get('account') === '1' || params.get('mode') === 'account';
    const embeddedMode = params.get('embedded') === '1';
    const shellTest = params.get('shellTest') === '1';
    const $ = (selector, root = document) => root.querySelector(selector);
    const calculatorFrame = $('#suite-calculator');
    const scorekeeperFrame = $('#suite-scorekeeper');
    const applyButton = $('#suite-apply');
    const tray = $('#suite-transfer');
    let latestResult = null;
    let calculatorListener = null;
    let calculatorListenerWindow = null;
    let calculatorEventName = '';
    let calculatorConnectTimer = null;
    let calculatorReady = false;
    let scorekeeperReady = false;
    let applying = false;
    let toastTimer = null;
    let resolveHostReady;
    let rejectHostReady;
    let hostReadySettled = false;
    let scorekeeperStartupTimer = null;
    const hostReady = new Promise((resolve, reject) => {
        resolveHostReady = resolve;
        rejectHostReady = reject;
    });
    hostReady.catch(() => {});

    function markHostReady() {
        if (hostReadySettled) return;
        hostReadySettled = true;
        clearTimeout(scorekeeperStartupTimer);
        resolveHostReady();
    }

    function markHostFailed(error) {
        if (hostReadySettled) return;
        hostReadySettled = true;
        clearTimeout(scorekeeperStartupTimer);
        rejectHostReady(error instanceof Error ? error : new Error('整場記分器啟動失敗。'));
    }

    function clone(value) { return JSON.parse(JSON.stringify(value)); }

    function validResult(value) {
        return Boolean(value
            && value.schemaVersion === RESULT_SCHEMA
            && value.valid
            && Number.isFinite(Number(value.handTai))
            && Array.isArray(value.handTypes));
    }

    function buildRoundDraft(value) {
        if (!validResult(value)) throw new Error('計番結果尚未完成。');
        const note = value.handTypes.map((item) => `${String(item.name)} (${Number(item.score)}番)`).join('、');
        return {
            tai: Math.max(0, Math.min(999, Math.trunc(Number(value.handTai)))),
            note: note.slice(0, 120),
            isSelfDraw: Boolean(value.isSelfDraw)
        };
    }

    function scorekeeperHost() {
        const host = scorekeeperFrame.contentWindow && scorekeeperFrame.contentWindow.OVMJSessionHost;
        if (!host) throw new Error('整場記分器尚未完成啟動。');
        return host;
    }

    function configureMode() {
        document.documentElement.dataset.suiteMode = accountMode ? 'account' : 'guest';
        document.documentElement.dataset.embedded = String(embeddedMode);
        const loginLink = $('#suite-login');
        if (window.OVMJ_APP_CONFIG?.accountEntryUrl) {
            loginLink.href = window.OVMJ_APP_CONFIG.accountEntryUrl;
        }
        loginLink.hidden = accountMode;
        $('#suite-account-badge').hidden = !accountMode;
    }

    function switchView(name, options = {}) {
        document.documentElement.dataset.suiteView = name;
        document.querySelectorAll('[data-suite-panel]').forEach((panel) => {
            const active = panel.dataset.suitePanel === name;
            panel.classList.toggle('is-active', active);
            panel.hidden = !active;
        });
        document.querySelectorAll('[data-suite-view]').forEach((button) => {
            const active = button.dataset.suiteView === name;
            button.classList.toggle('is-active', active);
            button.setAttribute('aria-pressed', String(active));
        });
        tray.hidden = name !== 'calculator';
        if (name === 'scorekeeper') refreshSessionSummary();
        if (options.scroll) {
            requestAnimationFrame(() => {
                $('.suite-workspace').scrollIntoView({ block: 'start', behavior: 'smooth' });
            });
        }
    }

    function showToast(text) {
        clearTimeout(toastTimer);
        const toast = $('#suite-toast');
        toast.textContent = text;
        toast.hidden = false;
        toastTimer = setTimeout(() => { toast.hidden = true; }, 3600);
    }

    function updateTransferState() {
        applyButton.disabled = applying || !latestResult || !scorekeeperReady;
        if (!latestResult) {
            $('#suite-result-label').textContent = calculatorReady ? '等待完成計番' : '計番器連線中';
            $('#suite-result-title').textContent = calculatorReady ? '輸入完整手牌後可帶入本局' : '完成牌型後可帶入本局';
            return;
        }
        if (!scorekeeperReady) {
            $('#suite-result-label').textContent = '計番已完成 · 本局表單載入中';
            $('#suite-result-title').textContent = `已算出 ${latestResult.handTai} 番，正在連接整場記分器`;
            return;
        }
        $('#suite-result-label').textContent = latestResult.isSelfDraw ? '已完成 · 自摸' : '已完成 · 食糊';
        $('#suite-result-title').textContent = `${latestResult.handTypes.length} 個牌型，可帶入 ${latestResult.handTai} 番`;
    }

    function renderResult(value) {
        latestResult = validResult(value) ? clone(value) : null;
        tray.classList.toggle('has-result', Boolean(latestResult));
        $('#suite-result-numbers').hidden = !latestResult;
        $('#suite-hand-types').hidden = !latestResult;
        if (!latestResult) {
            $('#suite-hand-types').textContent = '';
            updateTransferState();
            return;
        }
        $('#suite-hand-tai').textContent = latestResult.handTai;
        $('#suite-dealer-tai').textContent = latestResult.dealerBonusTai;
        $('#suite-total-tai').textContent = latestResult.totalTai;
        const types = $('#suite-hand-types');
        types.textContent = '';
        latestResult.handTypes.forEach((item) => {
            const tag = document.createElement('span');
            tag.textContent = `${item.name} ${item.score}番`;
            types.append(tag);
        });
        updateTransferState();
    }

    async function refreshSessionSummary() {
        try {
            const host = scorekeeperHost();
            await host.ready;
            const session = host.getSession();
            const mode = accountMode ? '戶口模式' : '訪客暫存';
            $('#suite-session-summary').textContent = `${mode} · ${session.title} · ${session.entries.length} 筆紀錄`;
        } catch (_error) {
            $('#suite-session-summary').textContent = '整場記分器載入中';
        }
    }

    async function applyLatest() {
        if (applying) return;
        applying = true;
        updateTransferState();
        try {
            const draft = buildRoundDraft(latestResult);
            const host = scorekeeperHost();
            await host.ready;
            scorekeeperReady = true;
            switchView('scorekeeper', { scroll: true });
            const applied = host.fillRoundDraft(draft);
            if (!applied || Number(applied.tai) !== draft.tai) {
                throw new Error('番數未能確認帶入，請重試或直接輸入。');
            }
            showToast(`已確認帶入 ${draft.tai} 番${draft.isSelfDraw ? '及自摸狀態' : ''}；請選玩家後記錄本局。`);
        } catch (error) {
            showToast(error.message || '未能帶入本局，請直接輸入番數。');
        } finally {
            applying = false;
            updateTransferState();
        }
    }

    function connectCalculator() {
        const win = calculatorFrame.contentWindow;
        const api = win && win.OVMJCalculator;
        if (!api || typeof api.getLastResult !== 'function' || typeof api.eventName !== 'string') return false;
        if (calculatorListener && calculatorListenerWindow) {
            calculatorListenerWindow.removeEventListener(calculatorEventName, calculatorListener);
        }
        calculatorListener = (event) => renderResult(event.detail);
        calculatorListenerWindow = win;
        calculatorEventName = api.eventName;
        win.addEventListener(api.eventName, calculatorListener);
        calculatorReady = true;
        document.documentElement.dataset.calculatorBridge = 'ready';
        renderResult(api.getLastResult());
        return true;
    }

    function waitForCalculator() {
        clearTimeout(calculatorConnectTimer);
        const deadline = Date.now() + 6000;
        const attempt = () => {
            if (connectCalculator()) return;
            if (Date.now() < deadline) {
                calculatorConnectTimer = setTimeout(attempt, 100);
                return;
            }
            calculatorReady = false;
            document.documentElement.dataset.calculatorBridge = 'error';
            $('#suite-result-label').textContent = '計番器連線失敗';
            $('#suite-result-title').textContent = '請重新整理；也可返回直接記分手動輸入番數';
            applyButton.disabled = true;
        };
        attempt();
    }

    function delegatedHost() {
        return Object.freeze({
            ready: hostReady,
            getSession: () => scorekeeperHost().getSession(),
            getSessionStatus: () => scorekeeperHost().getSessionStatus(),
            normalizeSession: (value) => scorekeeperHost().normalizeSession(value),
            hasStorageConflict: () => scorekeeperHost().hasStorageConflict(),
            markSaved: () => scorekeeperHost().markSaved(),
            createSession: (title, options) => scorekeeperHost().createSession(title, options),
            applyPlayerName: (playerId, name) => scorekeeperHost().applyPlayerName(playerId, name),
            fillRoundDraft: (value) => scorekeeperHost().fillRoundDraft(value),
            replaceSession: (value) => scorekeeperHost().replaceSession(value)
        });
    }

    configureMode();
    switchView('scorekeeper');
    document.querySelectorAll('[data-suite-view]').forEach((button) => {
        button.addEventListener('click', () => switchView(button.dataset.suiteView, { scroll: true }));
    });
    applyButton.addEventListener('click', applyLatest);
    window.OVMJSuiteTest = Object.freeze({ validResult, buildRoundDraft, resultSchema: RESULT_SCHEMA, accountMode });
    window.OVMJSessionHost = delegatedHost();

    if (shellTest) {
        document.documentElement.dataset.suiteApp = 'test-ready';
        markHostReady();
    } else {
        calculatorFrame.addEventListener('load', waitForCalculator);
        scorekeeperFrame.addEventListener('error', () => {
            scorekeeperReady = false;
            document.documentElement.dataset.suiteApp = 'scorekeeper-error';
            markHostFailed(new Error('整場記分器載入失敗，請重新整理後再試。'));
        });
        scorekeeperFrame.addEventListener('load', async () => {
            try {
                await scorekeeperHost().ready;
                scorekeeperReady = true;
                updateTransferState();
                markHostReady();
                refreshSessionSummary();
                document.documentElement.dataset.suiteApp = 'ready';
            } catch (error) {
                scorekeeperReady = false;
                updateTransferState();
                document.documentElement.dataset.suiteApp = 'scorekeeper-error';
                markHostFailed(error);
            }
        });
        scorekeeperStartupTimer = setTimeout(() => {
            scorekeeperReady = false;
            document.documentElement.dataset.suiteApp = 'scorekeeper-timeout';
            markHostFailed(new Error('整場記分器啟動逾時，請重新整理後再試。'));
        }, 10000);
        calculatorFrame.src = calculatorFrame.dataset.src;
        scorekeeperFrame.src = scorekeeperFrame.dataset.src;
    }
}());
