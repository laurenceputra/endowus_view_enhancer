import { applyCorsHeaders } from './cors.js';

export function jsonResponse(data, status = 200, additionalHeaders = {}, env = {}) {
	return new Response(JSON.stringify(data), {
		status,
		headers: applyCorsHeaders(env, {
			'Content-Type': 'application/json',
			...additionalHeaders
		})
	});
}
