import test from 'node:test';
import assert from 'node:assert/strict';

import { buildCorsHeaders, applyCorsHeaders } from '../src/cors.js';

test('buildCorsHeaders handles defaults and env overrides', () => {
  const cases = [
    {
      name: 'default',
      env: undefined,
      expectedOrigin: 'https://app.sg.endowus.com',
      expectedMethods: 'GET, POST, DELETE, OPTIONS'
    },
    {
      name: 'env override',
      env: { CORS_ORIGINS: 'https://example.com' },
      expectedOrigin: 'https://example.com'
    }
  ];

  cases.forEach(({ env, expectedOrigin, expectedMethods }) => {
    const headers = buildCorsHeaders(env);
    assert.equal(headers['Access-Control-Allow-Origin'], expectedOrigin);
    if (expectedMethods) {
      assert.equal(headers['Access-Control-Allow-Methods'], expectedMethods);
    }
  });
});

test('applyCorsHeaders merges headers and honors null overrides', () => {
  const cases = [
    {
      name: 'merge',
      env: { CORS_ORIGINS: 'https://example.com' },
      extra: { 'Content-Type': 'application/json' },
      expectedOrigin: 'https://example.com',
      expectedContentType: 'application/json'
    },
    {
      name: 'null override',
      env: { CORS_ORIGINS: 'https://example.com' },
      extra: { 'Access-Control-Allow-Origin': null },
      expectedOrigin: undefined
    }
  ];

  cases.forEach(({ env, extra, expectedOrigin, expectedContentType }) => {
    const headers = applyCorsHeaders(env, extra);
    assert.equal(headers['Access-Control-Allow-Origin'], expectedOrigin);
    if (expectedContentType) {
      assert.equal(headers['Content-Type'], expectedContentType);
    }
  });
});
