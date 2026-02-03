/**
 * KV Storage operations
 * 
 * Wrapper around Cloudflare KV for sync data persistence
 */

const KEY_PREFIX = 'sync_user:';

function getKvBinding(env) {
	const bindingName = env?.SYNC_KV_BINDING || 'SYNC_KV';
	const binding = env?.[bindingName];
	if (!binding) {
		throw new Error(`KV binding "${bindingName}" is not configured`);
	}
	return binding;
}

/**
 * Get user config from KV
 * @param {Object} env - Environment with KV binding
 * @param {string} userId - User identifier
 * @returns {Promise<Object|null>} Config data or null if not found
 */
export async function getFromKV(env, userId) {
	const key = KEY_PREFIX + userId;
	const kv = getKvBinding(env);
	const value = await kv.get(key, 'json');
	return value;
}

/**
 * Store user config in KV
 * @param {Object} env - Environment with KV binding
 * @param {string} userId - User identifier
 * @param {Object} data - Config data to store
 */
export async function putToKV(env, userId, data) {
	const key = KEY_PREFIX + userId;
	
	// Add server-side metadata
	const valueWithMetadata = {
		...data,
		serverTimestamp: Date.now()
	};

	// Store in KV (no expiration - data persists until deleted)
	const kv = getKvBinding(env);
	await kv.put(key, JSON.stringify(valueWithMetadata));
}

/**
 * Delete user config from KV
 * @param {Object} env - Environment with KV binding
 * @param {string} userId - User identifier
 */
export async function deleteFromKV(env, userId) {
	const key = KEY_PREFIX + userId;
	const kv = getKvBinding(env);
	await kv.delete(key);
}

/**
 * List all user IDs (for admin/maintenance)
 * @param {Object} env - Environment with KV binding
 * @returns {Promise<string[]>} Array of user IDs
 */
export async function listUsers(env) {
	const kv = getKvBinding(env);
	const list = await kv.list({ prefix: KEY_PREFIX });
	return list.keys.map(k => k.name.substring(KEY_PREFIX.length));
}

/**
 * Get storage statistics (for monitoring)
 * @param {Object} env - Environment with KV binding
 * @returns {Promise<Object>} Storage stats
 */
export async function getStorageStats(env) {
	const kv = getKvBinding(env);
	const list = await kv.list({ prefix: KEY_PREFIX });
	
	// Note: KV doesn't provide size info per key, so we estimate
	const userCount = list.keys.length;
	
	return {
		totalUsers: userCount,
		averageDataSize: '~1KB', // Estimate based on design
		totalStorageEstimate: `~${userCount}KB`
	};
}

/**
 * Cleanup stale data (optional maintenance task)
 * 
 * Deletes configs not updated in X days
 * Run this as a scheduled Cron Trigger
 */
export async function cleanupStaleData(env, maxAgeMs = 90 * 24 * 60 * 60 * 1000) {
	const kv = getKvBinding(env);
	const list = await kv.list({ prefix: KEY_PREFIX });
	const now = Date.now();
	let deletedCount = 0;

	for (const key of list.keys) {
		const data = await kv.get(key.name, 'json');
		if (data && data.serverTimestamp) {
			const age = now - data.serverTimestamp;
			if (age > maxAgeMs) {
				await kv.delete(key.name);
				deletedCount++;
			}
		}
	}

	return {
		scanned: list.keys.length,
		deleted: deletedCount
	};
}
