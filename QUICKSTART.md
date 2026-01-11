# 🚀 Quick Start Guide - MarketPulse Jobs

## Option 1: Docker Compose (Easiest - Recommended) 🐳

This method runs everything in containers - no need to install PostgreSQL, Redis, or configure them manually.

### Step 1: Ensure Docker Desktop is Running
- Open Docker Desktop application
- Wait for it to fully start (whale icon in system tray should be running)

### Step 2: Configure Environment Variables
```powershell
# Make sure you're in the project root
cd "D:\My Data\Projects\MarketPulse\MarketPulse"

# Copy the example file (if .env doesn't exist)
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

### Step 3: Edit .env File
Open `.env` file and add your API keys:
```env
ADZUNA_APP_ID=9458251d
ADZUNA_APP_KEY=c65f490744ca0fbe87ce7724a9ca5e71
JSEARCH_API_KEY=d398f7a12bmsha6ff9034e6f1f1ap1a7c6djsn4e36e89fe083
```

### Step 4: Start All Services
```powershell
docker-compose up -d
```

This will:
- Start PostgreSQL database
- Start Redis cache
- Build and start the .NET API
- Build and start the Angular frontend

### Step 5: Access the Application
- **Frontend**: http://localhost:4200
- **API/Swagger**: http://localhost:5190/swagger
- **API Base**: http://localhost:5190/api

### View Logs
```powershell
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f api
docker-compose logs -f client
```

### Stop Services
```powershell
docker-compose down
```

### Stop and Remove Volumes (Clean Reset)
```powershell
docker-compose down -v
```

---

## Option 2: Manual Setup (Local Development) 💻

Use this if you prefer to run services locally without Docker.

### Prerequisites
- .NET 8 SDK installed
- Node.js 20+ installed
- PostgreSQL 15+ installed and running
- Redis installed and running (optional - will fallback to in-memory cache)

### Backend Setup

#### Step 1: Navigate to Server
```powershell
cd server
```

#### Step 2: Restore NuGet Packages
```powershell
dotnet restore
```

#### Step 3: Setup Environment Variables
Make sure `.env` file exists in the project root (one level up) with your API keys.

#### Step 4: Update Database Connection
Ensure PostgreSQL is running and update `.env` if needed:
```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=marketpulse
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-password
```

#### Step 5: Create Database
```powershell
cd src/MarketPulse.API
dotnet ef database update
```

If you get an error about `dotnet ef`, install the EF Core tools:
```powershell
dotnet tool install --global dotnet-ef
```

#### Step 6: Run the API
```powershell
dotnet run --project src/MarketPulse.API
```

The API will start at: http://localhost:5190

### Frontend Setup

#### Step 1: Navigate to Client (in a new terminal)
```powershell
cd client
```

#### Step 2: Install Dependencies
```powershell
npm install
```

#### Step 3: Update API URL (if needed)
If your API is running on a different port, update:
`client/src/app/core/services/jobs.service.ts`
```typescript
private apiUrl = 'http://localhost:5190/api/jobs';
```

#### Step 4: Run the Frontend
```powershell
npm start
```

The frontend will start at: http://localhost:4200

---

## Option 3: Hybrid (Docker for Database/Redis, Local for Code) 🔄

Run PostgreSQL and Redis in Docker, but run API and Frontend locally for faster development.

### Step 1: Start Only Database Services
```powershell
docker-compose up -d postgres redis
```

### Step 2: Run Backend Locally
Follow "Backend Setup" steps above (steps 4-6)

### Step 3: Run Frontend Locally
Follow "Frontend Setup" steps above

---

## Troubleshooting

### Docker Issues

**Problem:** `docker-compose up` fails with connection error
- **Solution:** Make sure Docker Desktop is running

**Problem:** Port already in use
- **Solution:** Stop the service using the port, or change ports in `docker-compose.yml`

**Problem:** API container keeps restarting
- **Solution:** Check logs: `docker-compose logs api`
- Common issues: Database connection, missing environment variables

### Backend Issues

**Problem:** `dotnet ef` command not found
- **Solution:** Install EF Core tools: `dotnet tool install --global dotnet-ef`

**Problem:** Database connection fails
- **Solution:** Check PostgreSQL is running: `pg_isready -U postgres`
- Verify connection string in `.env`

**Problem:** API keys not loading
- **Solution:** Ensure `.env` file exists in project root
- Check that `DotNetEnv` package is installed
- Verify environment variable names match exactly

### Frontend Issues

**Problem:** `npm install` fails
- **Solution:** Clear cache: `npm cache clean --force`
- Delete `node_modules` and `package-lock.json`, then try again

**Problem:** CORS errors when calling API
- **Solution:** Verify API is running and CORS is configured for `http://localhost:4200`

**Problem:** Cannot connect to API
- **Solution:** Check API URL in `jobs.service.ts` matches your API address

---

## Quick Reference

### Important URLs
- Frontend: http://localhost:4200
- API: http://localhost:5190
- Swagger: http://localhost:5190/swagger
- PostgreSQL (if exposed): localhost:5432
- Redis (if exposed): localhost:6379

### Important Files
- `.env` - Your credentials (NOT in git)
- `.env.example` - Template for credentials
- `docker-compose.yml` - Docker configuration
- `appsettings.json` - API configuration (uses env vars)

### Common Commands

```powershell
# Docker
docker-compose up -d          # Start all services
docker-compose down           # Stop all services
docker-compose logs -f api    # View API logs
docker-compose restart api    # Restart API service

# Backend
dotnet restore                # Restore packages
dotnet build                  # Build solution
dotnet run                    # Run project
dotnet ef database update     # Update database

# Frontend
npm install                   # Install dependencies
npm start                     # Start dev server
npm run build                 # Build for production
```

---

## Next Steps

1. **Configure API Keys**: Make sure your `.env` file has valid API keys
2. **Test the API**: Visit http://localhost:5190/swagger to test endpoints
3. **Explore the Frontend**: Visit http://localhost:4200 to use the dashboard
4. **Check Logs**: Monitor logs for any errors or issues

Happy coding! 🎉
