/**
 * Cloudflare Workers Sync API
 * 
 * Privacy-first sync backend for Goal Portfolio Viewer
 * Server never sees plaintext data - all encryption happens client-side
 */

import { handleSync, handleGetSync, handleDeleteSync } from './handlers';
import { validatePassword, registerUser, loginUser, issueTokens, verifyAccessToken, verifyRefreshToken } from './auth';
import { rateLimit } from './ratelimit';

// Configuration
const CONFIG = {
	MAX_PAYLOAD_SIZE: 10 * 1024, // 10KB
	CORS_ORIGINS: 'https://app.sg.endowus.com',
	SYNC_KV_BINDING: 'SYNC_KV',
	VERSION: '1.0.0'
};

// CORS headers
const CORS_HEADERS = {
	'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Password-Hash, X-User-Id',
	'Access-Control-Max-Age': '86400' // 24 hours
};

function getBearerToken(request) {
	const authHeader = request.headers.get('Authorization');
	if (!authHeader) {
		return null;
	}
	const match = authHeader.match(/^Bearer\s+(.+)$/i);
	return match ? match[1] : null;
}

/**
 * Main request handler
 */
export default {
	async fetch(request, env, ctx) {
		const resolvedEnv = {
			...env,
			CORS_ORIGINS: env.CORS_ORIGINS || CONFIG.CORS_ORIGINS,
			SYNC_KV_BINDING: env.SYNC_KV_BINDING || CONFIG.SYNC_KV_BINDING
		};
		const url = new URL(request.url);
		const method = request.method;

		// Handle CORS preflight
		if (method === 'OPTIONS') {
			return new Response(null, {
				status: 204,
				headers: {
					...CORS_HEADERS,
					'Access-Control-Allow-Origin': resolvedEnv.CORS_ORIGINS
				}
			});
		}

		// Health check endpoint (no auth required)
		if (url.pathname === '/health') {
			return jsonResponse({
				status: 'ok',
				version: CONFIG.VERSION,
				timestamp: Date.now()
			}, 200, { 'Access-Control-Allow-Origin': resolvedEnv.CORS_ORIGINS });
		}

		// Auth endpoints (rate limited but no auth required)
		if (method === 'POST' && url.pathname === '/auth/register') {
			// Rate limit registration attempts
			const rateLimitResult = await rateLimit(request, resolvedEnv, url.pathname);
			if (!rateLimitResult.allowed) {
				return jsonResponse({
					success: false,
					error: 'RATE_LIMIT_EXCEEDED',
					retryAfter: rateLimitResult.retryAfter
				}, 429, {
					'Retry-After': String(rateLimitResult.retryAfter)
				});
			}

			try {
				const body = await request.json();
				const { userId, passwordHash } = body;
				const result = await registerUser(userId, passwordHash, resolvedEnv);
				return jsonResponse(result, result.success ? 200 : 400, { 'Access-Control-Allow-Origin': resolvedEnv.CORS_ORIGINS });
			} catch (error) {
				return jsonResponse({
					success: false,
					error: 'BAD_REQUEST',
					message: 'Invalid JSON in request body'
				}, 400, { 'Access-Control-Allow-Origin': resolvedEnv.CORS_ORIGINS });
			}
		}

		if (method === 'POST' && url.pathname === '/auth/login') {
			// Rate limit login attempts
			const rateLimitResult = await rateLimit(request, resolvedEnv, url.pathname);
			if (!rateLimitResult.allowed) {
				return jsonResponse({
					success: false,
					error: 'RATE_LIMIT_EXCEEDED',
					retryAfter: rateLimitResult.retryAfter
				}, 429, {
					'Retry-After': String(rateLimitResult.retryAfter)
				});
			}

			let body;
			try {
				body = await request.json();
			} catch (_error) {
				return jsonResponse({
					success: false,
					error: 'BAD_REQUEST',
					message: 'Invalid JSON in request body'
				}, 400, { 'Access-Control-Allow-Origin': resolvedEnv.CORS_ORIGINS });
			}

			try {
				const { userId, passwordHash } = body;
				const result = await loginUser(userId, passwordHash, resolvedEnv);
				if (!result.success) {
					return jsonResponse(result, 401, { 'Access-Control-Allow-Origin': resolvedEnv.CORS_ORIGINS });
				}
				const tokens = await issueTokens(userId, resolvedEnv);
				return jsonResponse({
					...result,
					tokens
				}, 200, { 'Access-Control-Allow-Origin': resolvedEnv.CORS_ORIGINS });
			} catch (error) {
				return jsonResponse({
					success: false,
					error: 'INTERNAL_ERROR',
					message: resolvedEnv.ENVIRONMENT === 'production' ? 'Internal server error' : error.message
				}, 500, { 'Access-Control-Allow-Origin': resolvedEnv.CORS_ORIGINS });
			}
		}

		if (method === 'POST' && url.pathname === '/auth/refresh') {
			// Rate limit refresh attempts
			const rateLimitResult = await rateLimit(request, resolvedEnv, url.pathname);
			if (!rateLimitResult.allowed) {
				return jsonResponse({
					success: false,
					error: 'RATE_LIMIT_EXCEEDED',
					retryAfter: rateLimitResult.retryAfter
				}, 429, {
					'Retry-After': String(rateLimitResult.retryAfter)
				});
			}

			try {
				const refreshToken = getBearerToken(request);
				if (!refreshToken) {
					return jsonResponse({
						success: false,
						error: 'UNAUTHORIZED',
						message: 'Missing refresh token'
					}, 401, { 'Access-Control-Allow-Origin': resolvedEnv.CORS_ORIGINS });
				}

				const payload = await verifyRefreshToken(refreshToken, resolvedEnv);
				if (!payload) {
					return jsonResponse({
						success: false,
						error: 'UNAUTHORIZED',
						message: 'Invalid refresh token'
					}, 401, { 'Access-Control-Allow-Origin': resolvedEnv.CORS_ORIGINS });
				}

				const tokens = await issueTokens(payload.sub, resolvedEnv);
				return jsonResponse({
					success: true,
					tokens
				}, 200, { 'Access-Control-Allow-Origin': resolvedEnv.CORS_ORIGINS });
			} catch (error) {
				return jsonResponse({
					success: false,
					error: 'INTERNAL_ERROR',
					message: resolvedEnv.ENVIRONMENT === 'production' ? 'Internal server error' : error.message
				}, 500, { 'Access-Control-Allow-Origin': resolvedEnv.CORS_ORIGINS });
			}
		}

		// All other endpoints require authentication (access token preferred)
		let authenticated = false;
		let authenticatedUserId = null; // Track which user is authenticated

		// Token-based authentication (preferred)
		const accessToken = getBearerToken(request);
		if (accessToken) {
			const payload = await verifyAccessToken(accessToken, resolvedEnv);
			if (payload) {
				authenticated = true;
				authenticatedUserId = payload.sub;
			}
		}

		// Password-based authentication (legacy fallback)
		if (!authenticated) {
			const passwordHash = request.headers.get('X-Password-Hash');
			const headerUserId = request.headers.get('X-User-Id');
			if (passwordHash && headerUserId) {
				authenticated = await validatePassword(headerUserId, passwordHash, resolvedEnv);
				if (authenticated) {
					authenticatedUserId = headerUserId;
				}
			}
		}
		
		if (!authenticated) {
			return jsonResponse({
				success: false,
				error: 'UNAUTHORIZED',
				message: 'Invalid credentials'
			}, 401, { 'Access-Control-Allow-Origin': resolvedEnv.CORS_ORIGINS });
		}

		// Rate limiting
		const rateLimitResult = await rateLimit(request, resolvedEnv, url.pathname, authenticatedUserId);
		if (!rateLimitResult.allowed) {
			return jsonResponse({
				success: false,
				error: 'RATE_LIMIT_EXCEEDED',
				retryAfter: rateLimitResult.retryAfter
			}, 429, {
				'Retry-After': String(rateLimitResult.retryAfter),
				'Access-Control-Allow-Origin': resolvedEnv.CORS_ORIGINS
			});
		}

		// Route handling
		try {
			// POST /sync - Upload config
			if (method === 'POST' && url.pathname === '/sync') {
				// Check payload size
				const contentLength = request.headers.get('Content-Length');
				if (contentLength && parseInt(contentLength) > CONFIG.MAX_PAYLOAD_SIZE) {
					return jsonResponse({
						success: false,
						error: 'PAYLOAD_TOO_LARGE',
						maxSize: CONFIG.MAX_PAYLOAD_SIZE
					}, 413, { 'Access-Control-Allow-Origin': resolvedEnv.CORS_ORIGINS });
				}

				const body = await request.json();
				
				// Authorization check: ensure authenticated user matches body.userId
				if (authenticatedUserId && body.userId && body.userId !== authenticatedUserId) {
					return jsonResponse({
						success: false,
						error: 'FORBIDDEN',
						message: 'Cannot upload data for another user'
					}, 403, { 'Access-Control-Allow-Origin': resolvedEnv.CORS_ORIGINS });
				}
				
				return await handleSync(body, resolvedEnv);
			}

			// GET /sync/:userId - Download config
			if (method === 'GET' && url.pathname.startsWith('/sync/')) {
				const userId = url.pathname.substring('/sync/'.length);
				if (!userId) {
					return jsonResponse({
						success: false,
						error: 'BAD_REQUEST',
						message: 'userId required'
					}, 400, { 'Access-Control-Allow-Origin': resolvedEnv.CORS_ORIGINS });
				}
				
				// Authorization check: ensure authenticated user matches requested userId
				if (authenticatedUserId && userId !== authenticatedUserId) {
					return jsonResponse({
						success: false,
						error: 'FORBIDDEN',
						message: 'Cannot access another user\'s data'
					}, 403, { 'Access-Control-Allow-Origin': resolvedEnv.CORS_ORIGINS });
				}
				
				return await handleGetSync(userId, resolvedEnv);
			}

			// DELETE /sync/:userId - Delete config
			if (method === 'DELETE' && url.pathname.startsWith('/sync/')) {
				const userId = url.pathname.substring('/sync/'.length);
				if (!userId) {
					return jsonResponse({
						success: false,
						error: 'BAD_REQUEST',
						message: 'userId required'
					}, 400, { 'Access-Control-Allow-Origin': resolvedEnv.CORS_ORIGINS });
				}
				
				// Authorization check: ensure authenticated user matches requested userId
				if (authenticatedUserId && userId !== authenticatedUserId) {
					return jsonResponse({
						success: false,
						error: 'FORBIDDEN',
						message: 'Cannot delete another user\'s data'
					}, 403, { 'Access-Control-Allow-Origin': resolvedEnv.CORS_ORIGINS });
				}
				
				return await handleDeleteSync(userId, resolvedEnv);
			}

			// Route not found
			return jsonResponse({
				success: false,
				error: 'NOT_FOUND',
				message: 'Endpoint not found'
			}, 404, { 'Access-Control-Allow-Origin': resolvedEnv.CORS_ORIGINS });

		} catch (error) {
			console.error('Request error:', error);
			return jsonResponse({
				success: false,
				error: 'INTERNAL_ERROR',
				message: resolvedEnv.ENVIRONMENT === 'production' ? 'Internal server error' : error.message
			}, 500, { 'Access-Control-Allow-Origin': resolvedEnv.CORS_ORIGINS });
		}
	}
};

/**
 * Helper to create JSON responses with CORS headers
 */
function jsonResponse(data, status = 200, additionalHeaders = {}) {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			'Content-Type': 'application/json',
			...CORS_HEADERS,
			...additionalHeaders
		}
	});
}
