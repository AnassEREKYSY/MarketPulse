# How to Run MarketPulse Jobs

## 🎯 Quickest Way (Recommended)

### 1. Make sure Docker Desktop is running
- Look for the Docker whale icon in your system tray
- If it's not there, open Docker Desktop application

### 2. Open PowerShell in the project folder
```powershell
cd "D:\My Data\Projects\MarketPulse\MarketPulse"
```

### 3. Use the run script
```powershell
.\run.ps1
```

Or manually run:
```powershell
docker-compose up -d
```

### 4. Access the application
- **Frontend**: Open http://localhost:4200 in your browser
- **API Documentation**: Open http://localhost:5190/swagger

---

## 📋 Step-by-Step Instructions

### Prerequisites Check
Before running, ensure you have:
- ✅ Docker Desktop installed and running
- ✅ `.env` file configured with your API keys
- ✅ At least 4GB free RAM (for Docker containers)

### Step 1: Verify Docker is Running
```powershell
docker --version
docker info
```

If Docker is not running, you'll see an error. Start Docker Desktop first.

### Step 2: Check Environment Variables
```powershell
# Verify .env file exists
Test-Path .env

# If it doesn't exist, create it
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

### Step 3: Edit .env File
Open `.env` in your editor and ensure it has:
```env
ADZUNA_APP_ID=9458251d
ADZUNA_APP_KEY=c65f490744ca0fbe87ce7724a9ca5e71
JSEARCH_API_KEY=d398f7a12bmsha6ff9034e6f1f1ap1a7c6djsn4e36e89fe083
```

### Step 4: Start the Application
```powershell
# Start all services in the background
docker-compose up -d

# Or start and see logs
docker-compose up
```

### Step 5: Verify Services are Running
```powershell
docker-compose ps
```

You should see 4 services running:
- marketpulse-postgres
- marketpulse-redis
- marketpulse-api
- marketpulse-client

### Step 6: Check Logs (if needed)
```powershell
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f api
```

---

## 🛠️ Alternative: Run Without Docker

If you prefer to run services locally:

### Backend (Terminal 1)
```powershell
cd server/src/MarketPulse.API
dotnet restore
dotnet run
```

### Frontend (Terminal 2)
```powershell
cd client
npm install
npm start
```

**Note:** You'll need PostgreSQL and Redis running locally for this approach.

---

## 🐛 Troubleshooting

### "Cannot connect to Docker daemon"
- **Fix:** Start Docker Desktop application

### "Port already in use"
- **Fix:** Stop the service using the port, or change ports in `docker-compose.yml`

### "Service keeps restarting"
- **Fix:** Check logs: `docker-compose logs [service-name]`
- Common causes: Missing environment variables, database connection issues

### "API returns 500 errors"
- **Fix:** Check API logs: `docker-compose logs api`
- Verify API keys in `.env` are correct
- Check database connection

### "Frontend shows CORS errors"
- **Fix:** Ensure API is running and CORS is configured correctly
- Check API URL in frontend service configuration

---

## 📊 Monitoring

### View Running Containers
```powershell
docker-compose ps
```

### View Resource Usage
```powershell
docker stats
```

### Stop All Services
```powershell
docker-compose down
```

### Stop and Remove Everything (Clean Reset)
```powershell
docker-compose down -v
```

---

## 🎓 First Time Setup

If this is your first time running:

1. **Install Docker Desktop** (if not installed)
   - Download from: https://www.docker.com/products/docker-desktop

2. **Create .env file**
   ```powershell
   Copy-Item .env.example .env
   ```

3. **Add your API keys to .env**
   - Get Adzuna keys from: https://developer.adzuna.com/
   - Get JSearch key from: https://rapidapi.com/

4. **Start services**
   ```powershell
   docker-compose up -d
   ```

5. **Wait for services to be ready** (30-60 seconds)
   - Check logs: `docker-compose logs -f`
   - Look for "Now listening on" messages

6. **Access the application**
   - Frontend: http://localhost:4200
   - Swagger: http://localhost:5190/swagger

---

## ✅ Success Checklist

After running, you should be able to:
- [ ] Access http://localhost:4200 (frontend loads)
- [ ] Access http://localhost:5190/swagger (API docs load)
- [ ] Search for jobs in the frontend
- [ ] See statistics on the dashboard
- [ ] View charts and analytics

If all checkboxes are ✅, you're ready to go! 🎉
