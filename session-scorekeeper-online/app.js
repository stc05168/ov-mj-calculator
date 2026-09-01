(function () {
    'use strict';

    document.documentElement.dataset.onlineApp = 'loading';
    document.documentElement.dataset.accountState = 'guest';
    document.documentElement.dataset.workspaceLoaded = 'false';
    document.documentElement.dataset.workspaceDirty = 'false';

    const $ = (selector) => document.querySelector(selector);
    const SEATS = ['東', '南', '西', '北'];
    const publicConfig = window.OVMJ_APP_CONFIG || {};
    const appFrame = $('#scorekeeper');
    const workspace = $('#account-workspace');
    const pageLayout = $('#page-layout');
    const shellTest = new URLSearchParams(location.search).get('shellTest') === '1';
    const configuredTimeout = Math.trunc(Number(publicConfig.requestTimeoutMs));
    const requestTimeoutMs = Number.isFinite(configuredTimeout) && configuredTimeout >= 1000 && configuredTimeout <= 120000
        ? configuredTimeout
        : 15000;
    const state = {
        token: sessionStorage.getItem('ovmj.api.token') || '',
        api: sessionStorage.getItem('ovmj.api.url') || publicConfig.apiBaseUrl || $('#api-url').value,
        listSessionVersions: new Map(),
        workspaceVersions: new Map(),
        workspaceLoaded: false,
        workspaceGeneration: 0,
        authenticating: false,
        saving: false,
        transitioning: false,
        activeSave: null,
        activeTransition: null,
        operationSequence: 0,
        statusTimer: null,
        lastStatusKey: '',
        allowDirtyUnloadOnce: false
    };

    function message(text, error = false) {
        $('#message').textContent = text || '';
        $('#message').classList.toggle('is-error', Boolean(error));
    }

    function setAuthenticating(active) {
        state.authenticating = active;
        $('#login').disabled = active;
        $('#register').disabled = active;
        $('#login').textContent = active ? '連線中…' : '登入';
    }

    function isWorkspaceBusy() {
        return state.saving || state.transitioning;
    }

    function syncWorkspaceBusyUi() {
        const busy = isWorkspaceBusy();
        const saveButton = $('#save-current');
        saveButton.disabled = busy;
        saveButton.textContent = state.saving
            ? '正在儲存…'
            : state.transitioning ? '工作區切換中…' : '儲存目前牌局到 DB';
        $('#new-session').disabled = busy;
        if (busy) {
            workspace.setAttribute('aria-busy', 'true');
            appFrame.blur();
        } else {
            workspace.removeAttribute('aria-busy');
        }
        appFrame.toggleAttribute('inert', busy);
        document.querySelectorAll('#sessions button, #players button, #player-form button').forEach((button) => {
            button.disabled = busy;
        });
    }

    function setSaving(active) {
        state.saving = active;
        syncWorkspaceBusyUi();
    }

    function setTransitioning(active) {
        state.transitioning = active;
        syncWorkspaceBusyUi();
    }

    function beginWorkspaceTransition() {
        if (isWorkspaceBusy()) return null;
        const operationId = ++state.operationSequence;
        state.activeTransition = operationId;
        setTransitioning(true);
        return operationId;
    }

    function finishWorkspaceTransition(operationId) {
        if (state.activeTransition !== operationId) return;
        state.activeTransition = null;
        setTransitioning(false);
    }

    function validateApiUrl(value) {
        const candidate = String(value || '').trim();
        if (!candidate) throw new Error('請設定 Java API 網址。');

        if (candidate.startsWith('/') && !candidate.startsWith('//')) {
            const relativeUrl = new URL(candidate, location.origin);
            if (relativeUrl.search || relativeUrl.hash) throw new Error('Java API 網址不可包含查詢參數或錨點。');
            return relativeUrl.pathname.replace(/\/+$/, '') || '/';
        }

        let url;
        try { url = new URL(candidate); } catch (_error) {
            throw new Error('Java API 網址必須是 /api、HTTPS 網址或本機 HTTP 網址。');
        }
        const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
        if (url.protocol !== 'https:' && !(loopback && url.protocol === 'http:')) {
            throw new Error('非本機 Java API 必須使用 HTTPS。');
        }
        if (url.username || url.password || url.search || url.hash) {
            throw new Error('Java API 網址不可包含帳密、查詢參數或錨點。');
        }
        return url.href.replace(/\/+$/, '');
    }

    async function fetchWithTimeout(resource, options = {}) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
        try {
            return await globalThis.fetch(resource, { ...options, signal: controller.signal });
        } catch (error) {
            if (error.name === 'AbortError') {
                const timeoutError = new Error(`Java API 連線超過 ${Math.round(requestTimeoutMs / 1000)} 秒，請檢查服務狀態。`);
                timeoutError.code = 'API_TIMEOUT';
                throw timeoutError;
            }
            throw error;
        } finally {
            clearTimeout(timeout);
        }
    }

    function stopWorkspaceStatusPolling() {
        if (state.statusTimer !== null) {
            clearInterval(state.statusTimer);
            state.statusTimer = null;
        }
    }

    function captureWorkspaceEpoch() {
        return { token: state.token, generation: state.workspaceGeneration };
    }

    function isCurrentWorkspaceEpoch(epoch) {
        return Boolean(epoch?.token)
            && state.token === epoch.token
            && state.workspaceGeneration === epoch.generation
            && state.workspaceLoaded;
    }

    function cancelledWorkspaceError() {
        const error = new Error('工作區操作已取消。');
        error.cancelled = true;
        return error;
    }

    function requireCurrentWorkspaceEpoch(epoch) {
        if (!isCurrentWorkspaceEpoch(epoch)) throw cancelledWorkspaceError();
    }

    async function awaitInWorkspaceEpoch(promise, epoch) {
        try {
            const value = await promise;
            requireCurrentWorkspaceEpoch(epoch);
            return value;
        } catch (error) {
            if (!isCurrentWorkspaceEpoch(epoch)) throw cancelledWorkspaceError();
            throw error;
        }
    }

    function readWorkspaceStatus() {
        if (!state.workspaceLoaded) return null;
        try {
            const host = appFrame.contentWindow && appFrame.contentWindow.OVMJSessionHost;
            if (!host) return null;
            const value = typeof host.getSessionStatus === 'function'
                ? host.getSessionStatus()
                : typeof host.getSession === 'function' ? host.getSession() : null;
            if (!value || !value.id) return null;
            return {
                id: String(value.id),
                title: String(value.title || '未命名牌局'),
                dirty: Boolean(value.dirty)
            };
        } catch (_error) {
            return null;
        }
    }

    function renderCurrentSessionMarkers(currentId) {
        document.querySelectorAll('#sessions .session').forEach((row) => {
            const current = Boolean(currentId) && row.dataset.sessionId === currentId;
            row.classList.toggle('is-current', current);
            if (current) row.setAttribute('aria-current', 'true');
            else row.removeAttribute('aria-current');
            const marker = row.querySelector('.current-marker');
            if (marker) marker.hidden = !current;
        });
    }

    function renderWorkspaceStatus() {
        const status = readWorkspaceStatus();
        const boundVersion = status ? state.workspaceVersions.get(status.id) : undefined;
        const existsInList = status ? state.listSessionVersions.has(status.id) : false;
        const statusKey = status
            ? JSON.stringify([status.id, status.title, status.dirty, boundVersion ?? null, existsInList])
            : `empty:${state.workspaceLoaded}`;
        if (statusKey === state.lastStatusKey) return status;
        state.lastStatusKey = statusKey;

        const title = $('#current-session-title');
        const detail = $('#current-session-state');
        if (!status) {
            title.textContent = state.workspaceLoaded ? '正在讀取目前牌局…' : '工作區尚未載入';
            detail.textContent = state.workspaceLoaded ? '請稍候' : '登入後顯示';
            detail.className = 'current-session-state';
            document.documentElement.dataset.workspaceDirty = 'false';
            renderCurrentSessionMarkers('');
            return null;
        }

        let stateClass = 'is-new';
        let stateText = status.dirty ? '新增未儲存 · 有未儲存變更' : '新增未儲存';
        if (boundVersion !== undefined) {
            stateClass = status.dirty ? 'is-dirty' : 'is-saved';
            stateText = status.dirty
                ? `有未儲存變更 · DB 基準版本 ${boundVersion}`
                : `已儲存 · DB 版本 ${boundVersion}`;
        } else if (existsInList) {
            stateClass = 'is-blocked';
            stateText = status.dirty
                ? '有未儲存變更 · 未綁定 DB 版本，請先載入'
                : '未綁定 DB 版本 · 請先載入此牌局';
        }

        title.textContent = status.title;
        detail.textContent = stateText;
        detail.className = `current-session-state ${stateClass}`;
        document.documentElement.dataset.workspaceDirty = String(status.dirty);
        renderCurrentSessionMarkers(status.id);
        return status;
    }

    function startWorkspaceStatusPolling() {
        stopWorkspaceStatusPolling();
        renderWorkspaceStatus();
        state.statusTimer = setInterval(renderWorkspaceStatus, 600);
    }

    function confirmDirtyDiscard(actionText) {
        const status = readWorkspaceStatus();
        if (!status?.dirty) return true;
        return confirm(`「${status.title}」有未儲存變更。確定${actionText}？`);
    }

    function unloadWorkspace() {
        state.workspaceGeneration += 1;
        state.workspaceLoaded = false;
        state.listSessionVersions.clear();
        state.workspaceVersions.clear();
        state.activeSave = null;
        state.activeTransition = null;
        state.saving = false;
        state.transitioning = false;
        state.lastStatusKey = '';
        state.allowDirtyUnloadOnce = false;
        stopWorkspaceStatusPolling();
        syncWorkspaceBusyUi();
        document.documentElement.dataset.workspaceLoaded = 'false';
        document.documentElement.dataset.workspaceDirty = 'false';
        workspace.hidden = true;
        pageLayout.classList.remove('account-active');

        if (appFrame.getAttribute('src')) {
            appFrame.src = 'about:blank';
            appFrame.removeAttribute('src');
        }
    }

    function clearAccountUi() {
        $('#account-name').textContent = '—';
        $('#account-email').textContent = '';
        $('#sessions').textContent = '';
        $('#players').textContent = '';
        $('#sessions-empty').hidden = false;
        $('#current-session-title').textContent = '工作區尚未載入';
        $('#current-session-state').textContent = '登入後顯示';
        $('#current-session-state').className = 'current-session-state';
    }

    function showGuestLogin(statusText = '尚未登入') {
        unloadWorkspace();
        clearAccountUi();
        $('#auth-panel').hidden = false;
        $('#cloud-panel').hidden = true;
        $('#status').textContent = statusText;
        document.documentElement.dataset.accountState = 'guest';
        document.documentElement.dataset.onlineApp = 'ready';
    }

    function clearAuthentication(statusText = '尚未登入', notice = '') {
        state.token = '';
        sessionStorage.removeItem('ovmj.api.token');
        showGuestLogin(statusText);
        if (notice) message(notice, true);
    }

    async function request(path, options = {}) {
        const tokenAtStart = state.token;
        const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
        if (tokenAtStart) headers.Authorization = `Bearer ${tokenAtStart}`;
        const response = await fetchWithTimeout(state.api + path, { ...options, headers });
        if (!response.ok) {
            let body = {};
            try { body = await response.json(); } catch (_error) { /* Keep HTTP fallback. */ }
            const error = new Error(body.message || `HTTP ${response.status}`);
            error.status = response.status;
            if (response.status === 401 && !path.startsWith('/auth/') && state.token === tokenAtStart) {
                clearAuthentication('登入已逾時', '登入狀態已過期，私人工作區已安全卸載，請重新登入。');
            }
            throw error;
        }
        if (response.status === 204) return null;
        return response.json();
    }

    function embeddedHost() {
        if (!state.workspaceLoaded) throw new Error('私人工作區尚未完成啟動。');
        const host = appFrame.contentWindow && appFrame.contentWindow.OVMJSessionHost;
        if (!host) throw new Error('麻將整合助手尚未完成啟動。');
        return host;
    }

    function credentials(includeName) {
        const value = {
            email: $('#email').value.trim(),
            password: $('#password').value
        };
        if (includeName) value.displayName = $('#display-name').value.trim();
        return value;
    }

    function validateCredentials(register) {
        if (!$('#email').reportValidity() || !$('#password').reportValidity()) return false;
        if (register && !$('#display-name').value.trim()) {
            $('#display-name').setCustomValidity('建立戶口時請輸入顯示名稱。');
            $('#display-name').reportValidity();
            $('#display-name').setCustomValidity('');
            return false;
        }
        return true;
    }

    async function authenticate(register) {
        if (state.authenticating || !validateCredentials(register)) return;
        setAuthenticating(true);
        message('正在安全連接 Java API…');
        try {
            state.api = validateApiUrl($('#api-url').value.trim());
            sessionStorage.setItem('ovmj.api.url', state.api);
            const result = await request(register ? '/auth/register' : '/auth/login', {
                method: 'POST',
                body: JSON.stringify(credentials(register))
            });
            if (!result || !result.token) throw new Error('Java API 未傳回登入 token。');
            state.token = result.token;
            sessionStorage.setItem('ovmj.api.token', state.token);
            const connected = await refresh();
            if (connected) message(register ? '戶口已建立，私人工作區已載入。' : '登入成功，私人工作區已載入。');
        } catch (error) {
            if (error.status === 401) clearAuthentication('登入失敗');
            message(error.message, true);
        } finally {
            setAuthenticating(false);
        }
    }

    async function ensureWorkspace() {
        if (state.workspaceLoaded) return;

        workspace.hidden = false;
        pageLayout.classList.add('account-active');
        document.documentElement.dataset.accountState = 'loading-workspace';
        const generation = ++state.workspaceGeneration;

        if (shellTest) {
            state.workspaceLoaded = true;
            document.documentElement.dataset.workspaceLoaded = 'test';
            document.documentElement.dataset.onlineApp = 'ready';
            startWorkspaceStatusPolling();
            return;
        }

        document.documentElement.dataset.onlineApp = 'loading-workspace';
        await new Promise((resolve, reject) => {
            const onLoad = () => {
                if (generation !== state.workspaceGeneration || !state.token) {
                    const error = new Error('工作區載入已取消。');
                    error.cancelled = true;
                    reject(error);
                    return;
                }
                resolve();
            };
            appFrame.addEventListener('load', onLoad, { once: true });
            appFrame.src = appFrame.dataset.src;
        });

        const host = appFrame.contentWindow && appFrame.contentWindow.OVMJSessionHost;
        if (!host) throw new Error('麻將整合助手尚未完成啟動。');
        await host.ready;
        if (generation !== state.workspaceGeneration || !state.token) {
            const error = new Error('工作區載入已取消。');
            error.cancelled = true;
            throw error;
        }

        state.workspaceLoaded = true;
        document.documentElement.dataset.workspaceLoaded = 'true';
        document.documentElement.dataset.onlineApp = 'ready';
        startWorkspaceStatusPolling();
    }

    async function refresh() {
        if (!state.token) {
            showGuestLogin();
            return false;
        }

        const tokenAtStart = state.token;
        try {
            const [me, sessions, players] = await Promise.all([
                request('/me'), request('/sessions'), request('/players')
            ]);
            if (!state.token || tokenAtStart !== state.token) return false;

            $('#account-name').textContent = me.displayName;
            $('#account-email').textContent = me.email;
            renderSessions(sessions);
            renderPlayers(players);
            await ensureWorkspace();
            if (!state.token || tokenAtStart !== state.token) return false;

            $('#auth-panel').hidden = true;
            $('#cloud-panel').hidden = false;
            $('#status').textContent = '已連接 Java DB';
            document.documentElement.dataset.accountState = 'authenticated';
            renderWorkspaceStatus();
            return true;
        } catch (error) {
            if (error.cancelled || !state.token || tokenAtStart !== state.token) return false;
            if (error.status === 401) {
                clearAuthentication('登入已逾時', '登入狀態已過期，請重新登入。');
                return false;
            }
            if (!state.workspaceLoaded) {
                workspace.hidden = true;
                pageLayout.classList.remove('account-active');
            }
            $('#status').textContent = 'Java DB 暫時離線';
            message(error.message, true);
            return false;
        }
    }

    function renderSessions(items) {
        state.listSessionVersions = new Map(items.map((item) => [item.id, item.version]));
        const root = $('#sessions');
        root.textContent = '';
        $('#sessions-empty').hidden = items.length > 0;
        items.forEach((item) => {
            const row = document.createElement('div');
            row.className = 'session';
            row.dataset.sessionId = item.id;

            const info = document.createElement('div');
            const titleLine = document.createElement('div');
            titleLine.className = 'session-title-line';
            const title = document.createElement('strong');
            const marker = document.createElement('span');
            const updated = document.createElement('small');
            title.textContent = item.title;
            marker.className = 'current-marker';
            marker.textContent = '目前';
            marker.hidden = true;
            updated.textContent = `${new Date(item.updatedAt).toLocaleString('zh-TW')} · 版本 ${item.version}`;
            titleLine.append(title, marker);
            info.append(titleLine, updated);

            const actions = document.createElement('div');
            [['載入', 'load'], ['TXT', 'txt'], ['JSON', 'json'], ['刪除', 'delete']].forEach(([label, action]) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = `mini${action === 'delete' ? ' danger' : ''}`;
                button.textContent = label;
                button.disabled = isWorkspaceBusy();
                button.setAttribute('aria-label', `${label}「${item.title}」`);
                button.addEventListener('click', () => sessionAction(action, item.id));
                actions.append(button);
            });
            row.append(info, actions);
            root.append(row);
        });
        renderCurrentSessionMarkers(readWorkspaceStatus()?.id || '');
    }

    function renderPlayers(items) {
        const root = $('#players');
        root.textContent = '';
        items.forEach((item) => {
            const row = document.createElement('div');
            row.className = 'player';

            const name = document.createElement('span');
            name.className = 'player-name';
            name.textContent = item.name;
            name.style.borderLeft = `5px solid ${item.color}`;

            const controls = document.createElement('div');
            controls.className = 'player-actions';
            const seat = document.createElement('select');
            seat.className = 'seat-select';
            seat.setAttribute('aria-label', `選擇「${item.name}」要套用的座位`);
            SEATS.forEach((value) => seat.append(new Option(value, value)));

            const apply = document.createElement('button');
            apply.type = 'button';
            apply.className = 'mini profile-apply';
            apply.textContent = '套用';
            apply.disabled = isWorkspaceBusy();
            apply.setAttribute('aria-label', `將「${item.name}」套用到所選座位`);
            apply.addEventListener('click', () => applyPlayerProfile(item, seat.value));

            const remove = document.createElement('button');
            remove.type = 'button';
            remove.className = 'mini danger';
            remove.textContent = '刪除';
            remove.disabled = isWorkspaceBusy();
            remove.setAttribute('aria-label', `刪除常用玩家「${item.name}」`);
            remove.addEventListener('click', async () => {
                if (isWorkspaceBusy()) return;
                const epoch = captureWorkspaceEpoch();
                try {
                    await awaitInWorkspaceEpoch(request(`/players/${encodeURIComponent(item.id)}`, { method: 'DELETE' }), epoch);
                    await awaitInWorkspaceEpoch(refresh(), epoch);
                    message('常用玩家已刪除；已套用到牌局的名稱不受影響。');
                } catch (error) {
                    if (!error.cancelled && error.status !== 401) message(error.message, true);
                }
            });
            controls.append(seat, apply, remove);
            row.append(name, controls);
            root.append(row);
        });
    }

    async function applyPlayerProfile(item, seat) {
        if (isWorkspaceBusy()) return;
        const epoch = captureWorkspaceEpoch();
        try {
            const host = embeddedHost();
            await awaitInWorkspaceEpoch(host.ready, epoch);
            if (typeof host.applyPlayerName !== 'function') throw new Error('目前工作區不支援套用常用玩家，請重新載入頁面。');
            host.applyPlayerName(seat, item.name);
            requireCurrentWorkspaceEpoch(epoch);
            renderWorkspaceStatus();
            message(`已把「${item.name}」複製到${seat}家；固定座位顏色不會改變。`);
        } catch (error) {
            if (!error.cancelled) message(error.message, true);
        }
    }

    async function currentSession() {
        const host = embeddedHost();
        await host.ready;
        if (host.hasStorageConflict()) throw new Error('工作區資料狀態不一致，請重新載入後再同步。');
        const value = host.normalizeSession(host.getSession());

        // The existing shell harness predates payload-bound host status. Keep its
        // compatibility binding isolated from every production workspace.
        if (shellTest
            && typeof host.getSessionStatus !== 'function'
            && !state.workspaceVersions.has(value.id)
            && state.listSessionVersions.has(value.id)) {
            state.workspaceVersions.set(value.id, state.listSessionVersions.get(value.id));
        }
        return value;
    }

    function requireSessionView(item, expectedId) {
        const version = item?.version;
        if (!item || String(item.id || '') !== String(expectedId)
            || version === null || version === '' || !Number.isFinite(Number(version)) || Number(version) < 0) {
            throw new Error('Java API 未傳回有效的牌局版本。');
        }
        if (Object.prototype.hasOwnProperty.call(item, 'payload')
            && (!item.payload || String(item.payload.id || '') !== String(expectedId))) {
            throw new Error('Java API 傳回的 payload 牌局 ID 與路徑不一致。');
        }
        return Number(version);
    }

    async function saveCurrent() {
        if (isWorkspaceBusy()) return;
        const epoch = captureWorkspaceEpoch();
        const operationId = ++state.operationSequence;
        state.activeSave = operationId;
        setSaving(true);
        try {
            const value = await awaitInWorkspaceEpoch(currentSession(), epoch);
            const hasWorkspaceBinding = state.workspaceVersions.has(value.id);
            if (!hasWorkspaceBinding && state.listSessionVersions.has(value.id)) {
                throw new Error('此牌局已存在於 DB，但目前工作區沒有與 payload 綁定的版本。請先從清單載入，再保存變更。');
            }

            const expectedVersion = hasWorkspaceBinding ? state.workspaceVersions.get(value.id) : null;
            const created = expectedVersion === null;
            const saved = await awaitInWorkspaceEpoch(request(`/sessions/${encodeURIComponent(value.id)}`, {
                method: 'PUT',
                body: JSON.stringify({
                    title: value.title,
                    expectedVersion,
                    payload: value
                })
            }), epoch);
            const savedVersion = requireSessionView(saved, value.id);
            state.workspaceVersions.set(value.id, savedVersion);

            const host = embeddedHost();
            await awaitInWorkspaceEpoch(host.ready, epoch);
            if (typeof host.markSaved === 'function') host.markSaved();
            requireCurrentWorkspaceEpoch(epoch);
            renderWorkspaceStatus();

            const refreshed = await awaitInWorkspaceEpoch(refresh(), epoch);
            renderWorkspaceStatus();
            const success = created
                ? `新牌局已建立並保存到資料庫（版本 ${savedVersion}）。`
                : `目前牌局已更新並保存到資料庫（版本 ${savedVersion}）。`;
            message(refreshed ? success : `${success} 牌局清單暫時未能重新整理。`, !refreshed);
        } catch (error) {
            if (error.cancelled) return;
            if (error.status === 409) {
                message('DB 版本衝突；目前頁面的變更仍然保留。請先載入最新 DB 牌局，再重新套用需要的修改。', true);
            } else if (error.status !== 401) {
                message(error.message, true);
            }
        } finally {
            if (state.activeSave === operationId) {
                state.activeSave = null;
                setSaving(false);
                if (isCurrentWorkspaceEpoch(epoch)) renderWorkspaceStatus();
            }
        }
    }

    function defaultSessionTitle() {
        const timestamp = new Intl.DateTimeFormat('zh-TW', {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }).format(new Date());
        return `${timestamp} 牌局`;
    }

    async function newIndependentSession() {
        if (isWorkspaceBusy()) return;
        if (!confirmDirtyDiscard('捨棄這些變更並新增獨立牌局')) return;
        const title = prompt('請輸入新牌局名稱：', defaultSessionTitle());
        if (title === null) return;
        const normalizedTitle = title.trim();
        if (!normalizedTitle) return message('牌局名稱不可空白。', true);

        const epoch = captureWorkspaceEpoch();
        try {
            const host = embeddedHost();
            await awaitInWorkspaceEpoch(host.ready, epoch);
            if (typeof host.createSession !== 'function') throw new Error('目前工作區不支援新增獨立牌局，請重新載入頁面。');
            host.createSession(normalizedTitle, { clearHistory: true });
            requireCurrentWorkspaceEpoch(epoch);
            state.workspaceVersions.clear();
            renderWorkspaceStatus();
            message('已建立新的獨立牌局；目前仍未保存到 DB。');
        } catch (error) {
            if (!error.cancelled) message(error.message, true);
        }
    }

    async function loadSession(id) {
        if (isWorkspaceBusy()) return;
        if (!confirmDirtyDiscard('捨棄這些變更並載入 DB 牌局')) return;
        const operationId = beginWorkspaceTransition();
        if (operationId === null) return;
        const epoch = captureWorkspaceEpoch();
        try {
            const item = await awaitInWorkspaceEpoch(request(`/sessions/${encodeURIComponent(id)}`), epoch);
            const version = requireSessionView(item, id);
            const host = embeddedHost();
            await awaitInWorkspaceEpoch(host.ready, epoch);
            host.replaceSession(item.payload);
            requireCurrentWorkspaceEpoch(epoch);
            state.workspaceVersions.set(id, version);
            if (typeof host.markSaved === 'function') host.markSaved();
            renderWorkspaceStatus();
            message(`已驗證並從資料庫載入牌局（版本 ${version}）。`);
        } finally {
            finishWorkspaceTransition(operationId);
        }
    }

    async function deleteSession(id) {
        if (isWorkspaceBusy()) return;
        const version = state.listSessionVersions.get(id);
        if (version === undefined) throw new Error('找不到牌局清單版本，請重新整理。');

        const current = readWorkspaceStatus();
        const deletingCurrent = current?.id === id;
        const warning = deletingCurrent && current.dirty
            ? `確定刪除此雲端牌局？「${current.title}」的未儲存頁面變更也會被捨棄；此操作不能復原。`
            : '確定刪除此雲端牌局？此操作不能復原。';
        if (!confirm(warning)) return;

        const operationId = beginWorkspaceTransition();
        if (operationId === null) return;
        const epoch = captureWorkspaceEpoch();
        try {
            await awaitInWorkspaceEpoch(request(`/sessions/${encodeURIComponent(id)}?expectedVersion=${encodeURIComponent(version)}`, { method: 'DELETE' }), epoch);
            state.listSessionVersions.delete(id);
            document.querySelectorAll('#sessions .session').forEach((row) => {
                if (row.dataset.sessionId === id) row.remove();
            });
            $('#sessions-empty').hidden = $('#sessions').childElementCount > 0;
            if (deletingCurrent) {
                const host = embeddedHost();
                await awaitInWorkspaceEpoch(host.ready, epoch);
                if (typeof host.createSession !== 'function') throw new Error('牌局已刪除，但工作區無法安全重設；請重新登入。');
                host.createSession(defaultSessionTitle(), { clearHistory: true });
                requireCurrentWorkspaceEpoch(epoch);
                if (typeof host.markSaved === 'function') host.markSaved();
                state.workspaceVersions.clear();
                renderWorkspaceStatus();
            }

            const refreshed = await awaitInWorkspaceEpoch(refresh(), epoch);
            const success = deletingCurrent
                ? '雲端牌局已刪除；工作區已重設為乾淨的新牌局，尚未保存到 DB。'
                : '雲端牌局已刪除。';
            message(refreshed ? success : `${success} 牌局清單暫時未能重新整理。`, !refreshed);
        } finally {
            finishWorkspaceTransition(operationId);
        }
    }

    async function exportSession(action, id) {
        const epoch = captureWorkspaceEpoch();
        const response = await awaitInWorkspaceEpoch(fetchWithTimeout(`${state.api}/sessions/${encodeURIComponent(id)}/export.${action}`, {
            headers: { Authorization: `Bearer ${epoch.token}` }
        }), epoch);
        if (response.status === 401) {
            clearAuthentication('登入已逾時', '登入狀態已過期，私人工作區已安全卸載，請重新登入。');
            return;
        }
        if (!response.ok) throw new Error('匯出失敗');
        const blob = await awaitInWorkspaceEpoch(response.blob(), epoch);
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `mahjong-session.${action}`;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    async function sessionAction(action, id) {
        if (isWorkspaceBusy()) return;
        try {
            if (action === 'load') return await loadSession(id);
            if (action === 'delete') return await deleteSession(id);
            await exportSession(action, id);
        } catch (error) {
            if (!error.cancelled && error.status !== 401) message(error.message, true);
        }
    }

    async function logout(revoke) {
        const hadToken = Boolean(state.token);
        if (hadToken && !confirmDirtyDiscard('捨棄這些變更並安全登出')) return;

        const revocation = revoke && hadToken
            ? request('/auth/logout', { method: 'POST' })
            : null;

        clearAuthentication('尚未登入');
        message(hadToken ? '已安全登出，私人工作區資料已從此頁清除。' : '');

        if (revocation) {
            try { await revocation; } catch (_error) { /* Local logout remains complete. */ }
        }
    }

    function wireGuestLinks() {
        document.querySelectorAll('#guest-home, #auth-panel .guest-link, #cloud-panel .account-guest-link')
            .forEach((link) => link.addEventListener('click', (event) => {
                if (event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
                const status = readWorkspaceStatus();
                if (!status?.dirty) return;
                event.preventDefault();
                if (!confirmDirtyDiscard('捨棄這些變更並前往免登入版')) return;
                state.allowDirtyUnloadOnce = true;
                location.assign(link.href);
                setTimeout(() => { state.allowDirtyUnloadOnce = false; }, 0);
            }));
    }

    $('#auth-form').addEventListener('submit', (event) => {
        event.preventDefault();
        authenticate(false);
    });
    $('#register').addEventListener('click', () => authenticate(true));
    $('#logout').addEventListener('click', () => logout(true));
    $('#new-session').addEventListener('click', newIndependentSession);
    $('#save-current').addEventListener('click', saveCurrent);
    $('#player-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        if (isWorkspaceBusy()) return;
        const epoch = captureWorkspaceEpoch();
        try {
            await awaitInWorkspaceEpoch(request('/players', {
                method: 'POST',
                body: JSON.stringify({ name: $('#player-name').value.trim(), color: $('#player-color').value })
            }), epoch);
            $('#player-name').value = '';
            await awaitInWorkspaceEpoch(refresh(), epoch);
            message('常用玩家已新增。');
        } catch (error) {
            if (!error.cancelled && error.status !== 401) message(error.message, true);
        }
    });

    window.addEventListener('beforeunload', (event) => {
        if (state.allowDirtyUnloadOnce || !readWorkspaceStatus()?.dirty) return;
        event.preventDefault();
        event.returnValue = '';
    });

    function configurePublicSettings() {
        if (publicConfig.guestEntryUrl) {
            document.querySelectorAll('#guest-home, #auth-panel .guest-link, #cloud-panel .account-guest-link')
                .forEach((link) => { link.href = publicConfig.guestEntryUrl; });

            const suiteUrl = new URL(publicConfig.guestEntryUrl, location.href);
            if (suiteUrl.origin === location.origin) {
                suiteUrl.searchParams.set('embedded', '1');
                suiteUrl.searchParams.set('account', '1');
                appFrame.dataset.src = suiteUrl.href;
            }
        }
    }

    function initializeApiUrl() {
        try {
            state.api = validateApiUrl(state.api);
            return '';
        } catch (_error) {
            state.token = '';
            sessionStorage.removeItem('ovmj.api.token');
            sessionStorage.removeItem('ovmj.api.url');
            const fallback = publicConfig.apiBaseUrl || $('#api-url').defaultValue;
            state.api = validateApiUrl(fallback);
            return '已忽略不安全或無效的分頁 API 設定，並清除原有登入狀態。';
        }
    }

    configurePublicSettings();
    wireGuestLinks();
    const apiWarning = initializeApiUrl();

    window.OVMJOnlineTest = Object.freeze({
        validateApiUrl,
        isWorkspaceLoaded: () => state.workspaceLoaded && !workspace.hidden,
        isWorkspaceRequested: () => Boolean(appFrame.getAttribute('src')),
        getWorkspaceSrc: () => appFrame.getAttribute('src') || '',
        getApiBaseUrl: () => state.api,
        requestTimeoutMs
    });

    $('#api-url').value = state.api;
    showGuestLogin();
    if (apiWarning) message(apiWarning, true);
    if (state.token) refresh();
}());
