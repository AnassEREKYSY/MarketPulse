# Security Guidelines

## Environment Variables

This project uses environment variables to store sensitive credentials. **Never commit actual credentials to version control.**

## Setup

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` with your actual credentials:**
   - Adzuna API credentials from https://developer.adzuna.com/
   - JSearch/RapidAPI key from https://rapidapi.com/
   - Database credentials (if not using Docker defaults)

3. **Verify `.env` is in `.gitignore`:**
   The `.env` file should never be committed to Git.

## Environment Variables Reference

### API Credentials
- `ADZUNA_APP_ID` - Your Adzuna API Application ID
- `ADZUNA_APP_KEY` - Your Adzuna API Key
- `ADZUNA_COUNTRY` - Country code (default: "fr")
- `JSEARCH_API_KEY` - Your RapidAPI key for JSearch

### Database
- `POSTGRES_HOST` - PostgreSQL host (default: "localhost")
- `POSTGRES_PORT` - PostgreSQL port (default: "5432")
- `POSTGRES_DB` - Database name (default: "marketpulse")
- `POSTGRES_USER` - Database user (default: "postgres")
- `POSTGRES_PASSWORD` - Database password (default: "postgres")

### Redis
- `REDIS_HOST` - Redis host (default: "localhost")
- `REDIS_PORT` - Redis port (default: "6379")

## Production Deployment

For production deployments:

1. Use a secrets management service (Azure Key Vault, AWS Secrets Manager, etc.)
2. Set environment variables directly in your hosting platform
3. Never hardcode credentials in source code
4. Use different credentials for each environment (dev, staging, production)
5. Rotate credentials regularly
6. Use strong, unique passwords for databases

## Docker

When using Docker Compose, the `.env` file is automatically loaded. Make sure to:
- Keep `.env` file secure on the server
- Use Docker secrets for production deployments
- Restrict file permissions: `chmod 600 .env`
