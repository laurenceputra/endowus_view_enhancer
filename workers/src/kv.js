export function getKvBinding(env, bindingNameOverride) {
	const bindingName = bindingNameOverride || env?.SYNC_KV_BINDING || 'SYNC_KV';
	const binding = env?.[bindingName];
	if (!binding) {
		throw new Error(`KV binding "${bindingName}" is not configured`);
	}
	return binding;
}
