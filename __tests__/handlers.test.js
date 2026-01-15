const { JSDOM } = require('jsdom');

describe('handlers and cache', () => {
    let exportsModule;
    let storage;
    const originalDateNow = Date.now;
    let baseFetchMock;

    beforeEach(() => {
        jest.resetModules();
        const dom = new JSDOM('<!doctype html><html><body></body></html>', {
            url: 'https://app.sg.endowus.com/dashboard'
        });
        global.window = dom.window;
        global.document = dom.window.document;
        global.MutationObserver = dom.window.MutationObserver;
        global.HTMLElement = dom.window.HTMLElement;
        global.Node = dom.window.Node;
        window.__GPV_DISABLE_AUTO_INIT = true;

        storage = new Map();
        global.GM_setValue = (key, value) => storage.set(key, value);
        global.GM_getValue = (key, fallback = null) => storage.has(key) ? storage.get(key) : fallback;
        global.GM_deleteValue = key => storage.delete(key);
        global.GM_cookie = { list: jest.fn((_, cb) => cb ? cb([]) : []) };

        const responseFactory = body => ({
            clone: () => responseFactory(body),
            json: () => Promise.resolve(body),
            ok: true,
            status: 200
        });

        baseFetchMock = jest.fn(() => Promise.resolve(responseFactory({})));
        global.fetch = baseFetchMock;
        window.fetch = baseFetchMock;

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

        exportsModule = require('../tampermonkey/goal_portfolio_viewer.user.js');
    });

    afterEach(() => {
        delete global.window;
        delete global.document;
        delete global.MutationObserver;
        delete global.HTMLElement;
        delete global.Node;
        delete global.GM_setValue;
        delete global.GM_getValue;
        delete global.GM_deleteValue;
        delete global.GM_cookie;
        delete global.XMLHttpRequest;
        Date.now = originalDateNow;
    });

    function createTypeSection(goalId) {
        const typeSection = document.createElement('div');
        const table = document.createElement('table');
        table.className = 'gpv-table gpv-goal-table';
        const tbody = document.createElement('tbody');
        const tr = document.createElement('tr');
        const diff = document.createElement('td');
        diff.className = 'gpv-diff-cell';
        const targetTd = document.createElement('td');
        const targetInput = document.createElement('input');
        targetInput.className = 'gpv-target-input';
        targetInput.dataset.goalId = goalId;
        targetInput.dataset.fixed = 'false';
        targetTd.appendChild(targetInput);
        tr.appendChild(targetTd);
        tr.appendChild(diff);
        tbody.appendChild(tr);
        table.appendChild(tbody);
        typeSection.appendChild(table);
        return { typeSection, targetInput, diffCell: diff };
    }

    test('handleGoalTargetChange stores target and updates diff', () => {
        const { handleGoalTargetChange } = exportsModule;
        if (typeof handleGoalTargetChange !== 'function') return;

        const bucket = 'Retirement';
        const goalType = 'GENERAL_WEALTH_ACCUMULATION';
        const goalId = 'g1';
        const mergedInvestmentDataState = {
            [bucket]: {
                _meta: { endingBalanceTotal: 1000 },
                [goalType]: {
                    endingBalanceAmount: 1000,
                    totalCumulativeReturn: 0,
                    goals: [{
                        goalId,
                        goalName: 'Retirement - Core',
                        endingBalanceAmount: 600,
                        totalCumulativeReturn: 0,
                        simpleRateOfReturnPercent: 0
                    }]
                }
            }
        };
        const projectedInvestmentsState = {};
        const { typeSection, targetInput, diffCell } = createTypeSection(goalId);
        targetInput.value = '50';

        handleGoalTargetChange({
            input: targetInput,
            goalId,
            currentEndingBalance: 600,
            totalTypeEndingBalance: 1000,
            bucket,
            goalType,
            typeSection,
            mergedInvestmentDataState,
            projectedInvestmentsState
        });

        expect(storage.get('goal_target_pct_g1')).toBe(50);
        expect(diffCell.textContent).toMatch(/100\.00/);
        expect(diffCell.className).toContain('gpv-diff-cell');
    });

    test('GoalTargetStore.setTarget returns null for non-finite values', () => {
        const { GoalTargetStore } = exportsModule;
        if (!GoalTargetStore) return;

        const result = GoalTargetStore.setTarget('g-nonfinite', Infinity);
        expect(result).toBeNull();
        expect(storage.has('goal_target_pct_g-nonfinite')).toBe(false);
    });

    test('handleGoalFixedToggle disables target input and stores flag', () => {
        const { handleGoalFixedToggle } = exportsModule;
        if (typeof handleGoalFixedToggle !== 'function') return;

        const bucket = 'Retirement';
        const goalType = 'GENERAL_WEALTH_ACCUMULATION';
        const goalId = 'g1';
        const mergedInvestmentDataState = {
            [bucket]: {
                _meta: { endingBalanceTotal: 1000 },
                [goalType]: {
                    endingBalanceAmount: 1000,
                    totalCumulativeReturn: 0,
                    goals: [{
                        goalId,
                        goalName: 'Retirement - Core',
                        endingBalanceAmount: 600,
                        totalCumulativeReturn: 0,
                        simpleRateOfReturnPercent: 0
                    }]
                }
            }
        };
        const projectedInvestmentsState = {};
        const { typeSection, targetInput } = createTypeSection(goalId);
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = true;
        checkbox.dataset.goalId = goalId;

        handleGoalFixedToggle({
            input: checkbox,
            goalId,
            bucket,
            goalType,
            typeSection,
            mergedInvestmentDataState,
            projectedInvestmentsState
        });

        expect(storage.get('goal_fixed_g1')).toBe(true);
        expect(targetInput.disabled).toBe(true);
    });

    test('handleProjectedInvestmentChange stores and clears projected investment', () => {
        const { handleProjectedInvestmentChange } = exportsModule;
        if (typeof handleProjectedInvestmentChange !== 'function') return;

        const bucket = 'Retirement';
        const goalType = 'GENERAL_WEALTH_ACCUMULATION';
        const mergedInvestmentDataState = {
            [bucket]: {
                _meta: { endingBalanceTotal: 1000 },
                [goalType]: {
                    endingBalanceAmount: 1000,
                    totalCumulativeReturn: 0,
                    goals: []
                }
            }
        };
        const projectedInvestmentsState = {};
        const typeSection = document.createElement('div');
        const input = document.createElement('input');
        input.className = 'gpv-projected-input';
        input.value = '200';

        handleProjectedInvestmentChange({
            input,
            bucket,
            goalType,
            typeSection,
            mergedInvestmentDataState,
            projectedInvestmentsState
        });
        expect(projectedInvestmentsState[`${bucket}|${goalType}`]).toBe(200);

        input.value = '';
        handleProjectedInvestmentChange({
            input,
            bucket,
            goalType,
            typeSection,
            mergedInvestmentDataState,
            projectedInvestmentsState
        });
        expect(projectedInvestmentsState[`${bucket}|${goalType}`]).toBeUndefined();
    });

    test('performance cache read/write honors TTL', () => {
        const {
            writePerformanceCache,
            readPerformanceCache,
            getCachedPerformanceResponse
        } = exportsModule;
        if (!writePerformanceCache || !readPerformanceCache || !getCachedPerformanceResponse) return;

        Date.now = () => 1_000;
        writePerformanceCache('goal-x', { foo: 'bar' });
        const fresh = readPerformanceCache('goal-x');
        expect(fresh.response.foo).toBe('bar');
        expect(getCachedPerformanceResponse('goal-x').foo).toBe('bar');

        // Make entry stale (>7 days)
        Date.now = () => 8 * 24 * 60 * 60 * 1000;
        const stale = readPerformanceCache('goal-x');
        expect(stale).toBeNull();
        expect(storage.has('gpv_performance_goal-x')).toBe(false);
    });

    test('fetch interception stores performance data', async () => {
        const body = { performance: true };
        const responseFactory = data => ({
            clone: () => responseFactory(data),
            json: () => Promise.resolve(data),
            ok: true,
            status: 200
        });
        baseFetchMock.mockResolvedValueOnce(responseFactory(body));

        await window.fetch('/v1/goals/performance');
        const stored = storage.get('api_performance');
        expect(stored).toBeDefined();
        expect(JSON.parse(stored).performance).toBe(true);
    });

    test('createSequentialRequestQueue processes items sequentially', async () => {
        const { createSequentialRequestQueue } = exportsModule;
        const waitSpy = jest.fn(() => Promise.resolve());
        const queue = createSequentialRequestQueue({ delayMs: 10, waitFn: waitSpy });

        let calls = 0;
        const requestFn = async item => {
            calls += 1;
            if (item === 2) {
                throw new Error('fail');
            }
            return item * 2;
        };

        const results = await queue([1, 2], requestFn);
        expect(calls).toBe(2);
        expect(waitSpy).toHaveBeenCalledTimes(1);
        expect(results[0]).toMatchObject({ status: 'fulfilled', value: 2, item: 1 });
        expect(results[1].status).toBe('rejected');
    });
});
