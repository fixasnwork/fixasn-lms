## Device Session Security Notes

- Copying only the NextAuth session/JWT cookie is blocked because non-admin requests must also include the matching `fxns_state` device secret cookie.
- The `fxns_state` cookie name is neutral by design, but naming is obfuscation only. Security depends on high-entropy secret generation, HttpOnly cookie handling, and server-side hash validation.
- Copying all relevant cookies (session + `fxns_state`) can still replay the same session. Stronger defenses require additional device-attestation or risk controls.

