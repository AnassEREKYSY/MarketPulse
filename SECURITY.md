# Security

- Secrets (Adzuna keys, SSH key, registry token) live in GitHub Actions secrets and in `~/marketpulse/.env` on the VM (mode 600). Never commit them; `.env` files are ignored by git.
- The Adzuna key is only used server-side and is never written to logs (request URLs are not logged).
- The API is read-only (`GET` only). In production the app and the API share one origin; CORS is only enabled for local development origins.
- Report a problem privately to the repository owner rather than in a public issue.
