[SECURITY INSTRUCTIONS – Apply to ALL Code Generation]

- Never hardcode secrets, API keys, or credentials in code.
- Use secure environment variable access for configuration and tokens.
- Always hash passwords using bcrypt with a safe salt. Never store or log plain text passwords.
- Validate and sanitize all user inputs to prevent injection attacks.
- Use HTTPS and avoid exposing internal system details or stack traces in error responses.
- Implement role-based access control (RBAC) for APIs, infrastructure, and admin features.
- Use least-privilege principles for access to databases, cloud resources, and infrastructure.
- Do not use deprecated or vulnerable packages; prefer secure, well-maintained libraries.
- Ensure secrets are never sent to the frontend or exposed in logs or responses.
