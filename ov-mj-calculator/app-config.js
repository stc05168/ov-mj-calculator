(function (global) {
    'use strict';

    // This file is public and is downloaded by every browser. Never put a
    // database username, database password, API token, or other secret here.
    const scriptUrl = document.currentScript?.src || location.href;
    const applicationRoot = new URL('./', scriptUrl);

    global.OVMJ_APP_CONFIG = Object.freeze({
        // Local development default. For same-origin production proxying, use '/api'.
        apiBaseUrl: 'http://127.0.0.1:8080/api',
        guestEntryUrl: new URL('mahjong-suite/index.html', applicationRoot).href,
        accountEntryUrl: new URL('session-scorekeeper-online/index.html', applicationRoot).href,
        requestTimeoutMs: 15000
    });
}(window));
