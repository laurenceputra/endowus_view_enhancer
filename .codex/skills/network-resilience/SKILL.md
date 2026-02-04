---
name: network-resilience
description: "Improve reliability for network calls, sync, or remote endpoints with timeouts, retries, offline handling, and user feedback."
---

# Network Resilience

## Checklist
1. **Timeouts**
   - Use AbortController or equivalent timeouts for fetch calls.

2. **Retries & backoff**
   - Retry transient failures with exponential backoff and limits.

3. **Offline handling**
   - Detect offline states and fail gracefully.

4. **User feedback**
   - Provide clear error messages for network failures.

5. **Idempotency**
   - Ensure retries do not duplicate side effects.

## Output Format
- Resilience gaps
- Recommended improvements
