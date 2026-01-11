# 🚀 START HERE - How to Run MarketPulse Jobs

## Quick Start (3 Steps!)

### Step 1: Start Docker Desktop 🐳
- Open **Docker Desktop** application
- Wait until it's fully started (green icon in system tray)

### Step 2: Run This Command 💻
Open PowerShell in the project folder and run:
```powershell
docker-compose up -d
```

### Step 3: Open Your Browser 🌐
- **Frontend (Dashboard)**: http://localhost:4200
- **API Documentation**: http://localhost:5190/swagger

**That's it!** ✨

---

## What Happens When You Run `docker-compose up -d`?

1. **PostgreSQL** database starts (for storing job data)
2. **Redis** cache starts (for faster responses)
3. **.NET API** builds and starts (backend server)
4. **Angular Frontend** builds and starts (user interface)

All services start automatically and communicate with each other.

---

## Quick Commands Reference

```powershell
# Start everything
docker-compose up -d

# Stop everything
docker-compose down

# View logs (see what's happening)
docker-compose logs -f

# Check if services are running
docker-compose ps

# Restart if something goes wrong
docker-compose restart
```

---

## Troubleshooting

### ❌ "Cannot connect to Docker daemon"
**Fix:** Start Docker Desktop first, then wait 30 seconds

### ❌ "Port 4200 already in use"
**Fix:** Stop the service using port 4200, or change the port in `docker-compose.yml`

### ❌ Services keep restarting
**Fix:** Check logs: `docker-compose logs api`
- Usually means: Missing API keys in `.env` file
- Solution: Edit `.env` and add your API keys

### ❌ Frontend shows "Cannot connect to API"
**Fix:** 
- Wait 1-2 minutes for API to fully start
- Check API logs: `docker-compose logs api`
- Verify API is running: http://localhost:5190/swagger

---

## Using the Run Script (Optional)

For easier management, use the provided script:

```powershell
.\run.ps1
```

This will:
- Check if Docker is running
- Verify `.env` file exists
- Give you a menu to start/stop/view logs

---

## Need More Help?

- See `QUICKSTART.md` for detailed instructions
- See `RUN.md` for step-by-step guide
- See `SECURITY.md` for environment variables info
- Check Docker logs: `docker-compose logs -f`

---

## First Time Setup?

1. ✅ Ensure Docker Desktop is installed
2. ✅ Edit `.env` file with your API keys (if needed)
3. ✅ Run `docker-compose up -d`
4. ✅ Wait 1-2 minutes for everything to start
5. ✅ Open http://localhost:4200

**Done!** 🎉
