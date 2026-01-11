# Environment Variables Setup Guide

## Quick Start

1. **Create your `.env` file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` with your actual credentials:**
   ```env
   ADZUNA_APP_ID=your-actual-app-id
   ADZUNA_APP_KEY=your-actual-app-key
   JSEARCH_API_KEY=your-actual-api-key
   ```

3. **The `.env` file is automatically loaded** when you run the application.

## How It Works

### For Local Development (.NET)

The application uses the `DotNetEnv` package to load environment variables from the `.env` file. **All sensitive values (API keys, credentials) MUST come from environment variables** - there is no fallback to `appsettings.json` for security reasons.

**Security Model:**
- ✅ Environment variables (from `.env` file or system) - **REQUIRED for API keys**
- ✅ `appsettings.json` - Only contains placeholders like `${ADZUNA_APP_ID}` (not actual values)

### For Docker

Docker Compose automatically loads the `.env` file and passes variables to containers via the `env_file` directive.

## Environment Variables

### Required for API Functionality

- `ADZUNA_APP_ID` - **REQUIRED** - Get from https://developer.adzuna.com/
- `ADZUNA_APP_KEY` - **REQUIRED** - Get from https://developer.adzuna.com/
- `ADZUNA_COUNTRY` - Optional (defaults to "fr") - Country code for Adzuna API
- `JSEARCH_API_KEY` - **REQUIRED** - Get from https://rapidapi.com/ (used as fallback if Adzuna fails)

### Database (Optional - defaults provided)

- `POSTGRES_HOST` - Default: `localhost`
- `POSTGRES_PORT` - Default: `5432`
- `POSTGRES_DB` - Default: `marketpulse`
- `POSTGRES_USER` - Default: `postgres`
- `POSTGRES_PASSWORD` - Default: `postgres`

### Redis (Optional - defaults provided)

- `REDIS_HOST` - Default: `localhost`
- `REDIS_PORT` - Default: `6379`

## Security Notes

✅ **DO:**
- Keep `.env` file local and never commit it
- Use `.env.example` as a template
- Rotate API keys regularly
- Use different keys for dev/staging/production

❌ **DON'T:**
- Commit `.env` to Git (it's in `.gitignore`)
- Share `.env` files via email or chat
- Hardcode credentials in source code
- Use production keys in development

## Verification

After setting up your `.env` file, verify it's working:

1. Start the application
2. Check the logs - you should see no errors about missing API keys
3. Try making a job search request
4. If you see API errors, verify your keys are correct

## Troubleshooting

**Problem:** API calls fail with authentication errors
- **Solution:** Check that your API keys in `.env` are correct and active

**Problem:** Database connection fails
- **Solution:** Verify PostgreSQL is running and credentials in `.env` match your database

**Problem:** Environment variables not loading
- **Solution:** Ensure `.env` file is in the project root (same level as `docker-compose.yml`)
