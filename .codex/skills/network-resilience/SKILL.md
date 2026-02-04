---
name: network-resilience
description: "Guidance for robust network behavior: timeouts, retries, offline handling, and user feedback."
---

# Network Resilience

Use this skill when changes involve network calls, sync, or remote endpoints.

## Checklist
1. **Timeouts**
   - Use AbortController or equivalent timeouts for fetch calls.

2. **Retries & Backoff**
   - Retry transient failures with exponential backoff and limits.

3. **Offline Handling**
   - Detect offline states and fail gracefully.

4. **User Feedback**
   - Provide clear error messages for network failures.

5. **Idempotency**
   - Ensure retries do not duplicate side effects.

## Output Format
- Resilience gaps
- Recommended improvements
