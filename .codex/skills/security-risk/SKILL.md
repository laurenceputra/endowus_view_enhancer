---
name: security-risk
description: "Combined security scanning and threat modeling guidance for security/privacy-sensitive changes."
---

# Security Risk

Use this skill when changes involve data handling, API interception, sync, storage, or authentication.

## Section A: Security Scanning Checklist
- Check for injection risks (XSS, HTML injection, unsafe DOM updates).
- Validate input/output encoding and sanitization.
- Review token handling and session management.
- Ensure sensitive data is not logged.
- Confirm encryption key handling is safe.
- Verify no external API calls are added.

## Section B: Threat Modeling Prompts
- **Data flows:** What data moves where? Any new storage/transfer?
- **Trust boundaries:** Where does untrusted input enter?
- **Secrets handling:** How are tokens/keys stored and rotated?
- **Failure modes:** What happens on auth failure, timeout, or partial sync?

## Output Format
- Risks identified
- Mitigations
- Residual risk (if any)
