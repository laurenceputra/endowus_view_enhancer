const DEFAULT_ORIGIN = 'https://app.sg.endowus.com';
const ALLOWED_METHODS = 'GET, POST, DELETE, OPTIONS';
const ALLOWED_HEADERS = 'Content-Type, Authorization, X-Password-Hash, X-User-Id';

export function buildCorsHeaders(env) {
	return {
		'Access-Control-Allow-Origin': env?.CORS_ORIGINS || DEFAULT_ORIGIN,
		'Access-Control-Allow-Methods': ALLOWED_METHODS,
		'Access-Control-Allow-Headers': ALLOWED_HEADERS
	};
}

export function applyCorsHeaders(env, headers = {}) {
	const corsHeaders = buildCorsHeaders(env);
	const merged = {
		...corsHeaders,
		...headers
	};
	if (Object.prototype.hasOwnProperty.call(headers, 'Access-Control-Allow-Origin') && headers['Access-Control-Allow-Origin'] == null) {
		delete merged['Access-Control-Allow-Origin'];
	}
	return merged;
}
