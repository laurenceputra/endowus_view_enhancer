const { setupDom, teardownDom } = require('./helpers/domSetup');

describe('SyncManager', () => {
    let exportsModule;
    let storage;
    let fetchMock;
    const originalDateNow = Date.now;

    beforeEach(() => {
        jest.resetModules();
        setupDom();

        storage = new Map();
        global.GM_setValue = (key, value) => storage.set(key, value);
        global.GM_getValue = (key, fallback = null) => storage.has(key) ? storage.get(key) : fallback;
        global.GM_deleteValue = key => storage.delete(key);
        global.GM_listValues = () => [];
        global.GM_cookie = { list: jest.fn((_, cb) => cb ? cb([]) : []) };

        fetchMock = jest.fn((url, options = {}) => {
            if (url.includes('/sync/') && options.method === 'GET') {
                return Promise.resolve({
                    status: 404,
                    ok: false,
                    json: () => Promise.resolve({})
                });
            }
            if (url.includes('/sync') && options.method === 'POST') {
                return Promise.resolve({
                    status: 200,
                    ok: true,
                    json: () => Promise.resolve({ success: true })
                });
            }
            if (url.includes('/auth/refresh')) {
                return Promise.resolve({
                    status: 200,
                    ok: true,
                    json: () => Promise.resolve({
                        success: true,
                        tokens: {
                            accessToken: 'access-token',
                            refreshToken: 'refresh-token',
                            accessExpiresAt: Date.now() + 60_000,
                            refreshExpiresAt: Date.now() + 120_000
                        }
                    })
                });
            }
            return Promise.resolve({
                status: 200,
                ok: true,
                json: () => Promise.resolve({})
            });
        });
        global.fetch = fetchMock;
        window.fetch = fetchMock;

        class FakeXHR {
            constructor() {
                this._headers = {};
                this.responseText = '{}';
            }
            open(method, url) {
                this._url = url;
                return true;
            }
            setRequestHeader(header, value) {
                this._headers[header] = value;
            }
            addEventListener() {}
            send() {}
        }
        global.XMLHttpRequest = FakeXHR;

    });

    afterEach(() => {
        teardownDom();
        delete global.GM_setValue;
        delete global.GM_getValue;
        delete global.GM_deleteValue;
        delete global.GM_listValues;
        delete global.GM_cookie;
        delete global.XMLHttpRequest;
        Date.now = originalDateNow;
        jest.useRealTimers();
    });

    function loadModule() {
        exportsModule = require('../tampermonkey/goal_portfolio_viewer.user.js');
        return exportsModule;
    }

    function seedRememberedKey() {
        storage.set('sync_remember_key', true);
        storage.set('sync_master_key', btoa(String.fromCharCode(1, 2, 3, 4)));
    }

    function seedConfiguredState() {
        storage.set('sync_enabled', true);
        storage.set('sync_server_url', 'https://sync.example.com');
        storage.set('sync_user_id', 'user@example.com');
        storage.set('sync_refresh_token', 'refresh-token');
        storage.set('sync_refresh_token_expiry', Date.now() + 120_000);
        storage.set('sync_access_token', 'access-token');
        storage.set('sync_access_token_expiry', Date.now() + 120_000);
    }

    test('startAutoSync does not schedule when auto-sync disabled', () => {
        jest.spyOn(global, 'setInterval');
        seedConfiguredState();
        seedRememberedKey();
        storage.set('sync_auto_sync', false);
        const { SyncManager } = loadModule();

        SyncManager.startAutoSync();

        expect(global.setInterval).not.toHaveBeenCalled();
    });

    test('scheduleSyncOnChange schedules a buffered sync', () => {
        jest.useFakeTimers();
        seedRememberedKey();
        const { SyncManager } = loadModule();
        seedConfiguredState();
        storage.set('sync_auto_sync', true);

        jest.spyOn(global, 'setTimeout');
        SyncManager.scheduleSyncOnChange('target-update');

        expect(global.setTimeout).toHaveBeenCalled();
    });
});
