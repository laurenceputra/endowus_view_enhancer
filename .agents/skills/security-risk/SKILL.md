---
name: security-risk
description: "Combine security scanning and threat modeling for changes involving data handling, API interception, sync, storage, authentication, or encryption."
license: MIT
tags:
  - security
  - privacy
  - threat-modeling
allowed-tools:
  - bash
  - git
  - markdown
metadata:
  author: laurenceputra
  version: 1.0.0
---

# Security Risk

## Section A: Security Scanning Checklist
- Check for injection risks (XSS, HTML injection, unsafe DOM updates).
- Validate input/output encoding and sanitization.
- Review token handling and session management.
- Ensure sensitive data is not logged.
- Verify encryption key handling is safe.
- Confirm no external API calls are added.

## Section B: Threat Modeling Prompts
- Map data flows and identify any new storage/transfer.
- Identify trust boundaries and untrusted inputs.
- Review secrets handling (tokens/keys) and rotation.
- Evaluate failure modes for auth, timeout, partial sync.

## Output Format
- Risks identified
- Mitigations
- Residual risk (if any)
