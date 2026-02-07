import test from 'node:test';
import assert from 'node:assert/strict';

import {
  cleanupStaleData,
  deleteFromKV,
  getFromKV,
  listUsers,
  putToKV
} from '../src/storage.js';

function createKvMock(initial = {}) {
  const store = new Map(Object.entries(initial));

  return {
    store,
    async get(key, type) {
      if (!store.has(key)) {
        return null;
      }
      const value = store.get(key);
      if (type === 'json') {
        return JSON.parse(value);
      }
      return value;
    },
    async put(key, value) {
      store.set(key, value);
    },
    async delete(key) {
      store.delete(key);
    },
    async list({ prefix }) {
      const keys = [...store.keys()]
        .filter((name) => name.startsWith(prefix))
        .map((name) => ({ name }));
      return { keys };
    }
  };
}

test('putToKV adds serverTimestamp metadata', async () => {
  const env = { SYNC_KV: createKvMock() };
  const originalNow = Date.now;
  Date.now = () => 1234567890;

  try {
    await putToKV(env, 'user-1', { encryptedData: 'cipher', timestamp: 100, version: 1 });
  } finally {
    Date.now = originalNow;
  }

  const stored = JSON.parse(env.SYNC_KV.store.get('sync_user:user-1'));
  assert.equal(stored.encryptedData, 'cipher');
  assert.equal(stored.serverTimestamp, 1234567890);
});

test('getFromKV returns parsed JSON data', async () => {
  const env = {
    SYNC_KV: createKvMock({
      'sync_user:user-1': JSON.stringify({ encryptedData: 'value', timestamp: 50 })
    })
  };

  const result = await getFromKV(env, 'user-1');
  assert.deepEqual(result, { encryptedData: 'value', timestamp: 50 });
});

test('deleteFromKV removes stored keys', async () => {
  const env = {
    SYNC_KV: createKvMock({
      'sync_user:user-1': JSON.stringify({ encryptedData: 'value' })
    })
  };

  await deleteFromKV(env, 'user-1');
  assert.equal(env.SYNC_KV.store.has('sync_user:user-1'), false);
});

test('listUsers strips sync prefix from keys', async () => {
  const env = {
    SYNC_KV: createKvMock({
      'sync_user:user-1': JSON.stringify({}),
      'sync_user:user-2': JSON.stringify({}),
      'other:key': JSON.stringify({})
    })
  };

  const users = await listUsers(env);
  assert.deepEqual(users.sort(), ['user-1', 'user-2']);
});

test('cleanupStaleData removes entries older than maxAgeMs', async () => {
  const originalNow = Date.now;
  Date.now = () => 10_000;

  const env = {
    SYNC_KV: createKvMock({
      'sync_user:stale': JSON.stringify({ serverTimestamp: 7_000 }),
      'sync_user:fresh': JSON.stringify({ serverTimestamp: 9_500 })
    })
  };

  try {
    const result = await cleanupStaleData(env, 2_000);
    assert.equal(result.scanned, 2);
    assert.equal(result.deleted, 1);
  } finally {
    Date.now = originalNow;
  }

  assert.equal(env.SYNC_KV.store.has('sync_user:stale'), false);
  assert.equal(env.SYNC_KV.store.has('sync_user:fresh'), true);
});
