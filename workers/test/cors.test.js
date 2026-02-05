import test from 'node:test';
import assert from 'node:assert/strict';

import { buildCorsHeaders, applyCorsHeaders } from '../src/cors.js';

test('buildCorsHeaders uses default origin when env is missing', () => {
  const headers = buildCorsHeaders();
  assert.equal(headers['Access-Control-Allow-Origin'], 'https://app.sg.endowus.com');
  assert.equal(headers['Access-Control-Allow-Methods'], 'GET, POST, DELETE, OPTIONS');
});

test('buildCorsHeaders prefers env CORS_ORIGINS', () => {
  const headers = buildCorsHeaders({ CORS_ORIGINS: 'https://example.com' });
  assert.equal(headers['Access-Control-Allow-Origin'], 'https://example.com');
});

test('applyCorsHeaders merges cors and additional headers', () => {
  const headers = applyCorsHeaders(
    { CORS_ORIGINS: 'https://example.com' },
    { 'Content-Type': 'application/json' }
  );

  assert.equal(headers['Access-Control-Allow-Origin'], 'https://example.com');
  assert.equal(headers['Content-Type'], 'application/json');
});

test('applyCorsHeaders removes allow-origin when explicitly null', () => {
  const headers = applyCorsHeaders(
    { CORS_ORIGINS: 'https://example.com' },
    { 'Access-Control-Allow-Origin': null }
  );

  assert.equal(headers['Access-Control-Allow-Origin'], undefined);
});
