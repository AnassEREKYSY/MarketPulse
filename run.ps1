# MarketPulse Jobs - Quick Run Script
# This script helps you run the application easily

Write-Host "=== MarketPulse Jobs - Quick Start ===" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
$dockerRunning = docker info 2>$null
if (-not $dockerRunning) {
    Write-Host "❌ Docker is not running!" -ForegroundColor Red
    Write-Host "Please start Docker Desktop first." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Docker is running" -ForegroundColor Green

# Check if .env exists
if (-not (Test-Path .env)) {
    Write-Host "⚠️  .env file not found" -ForegroundColor Yellow
    if (Test-Path .env.example) {
        Write-Host "Creating .env from .env.example..." -ForegroundColor Yellow
        Copy-Item .env.example .env
        Write-Host "✅ .env file created. Please edit it with your API keys!" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Press any key to continue after editing .env..." -ForegroundColor Cyan
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    } else {
        Write-Host "❌ .env.example not found! Cannot create .env" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ .env file found" -ForegroundColor Green
Write-Host ""

# Ask user what they want to do
Write-Host "What would you like to do?" -ForegroundColor Cyan
Write-Host "1. Start all services with Docker Compose (Recommended)"
Write-Host "2. Start only database services (PostgreSQL + Redis)"
Write-Host "3. Stop all services"
Write-Host "4. View logs"
Write-Host "5. Exit"
Write-Host ""
$choice = Read-Host "Enter your choice (1-5)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "🚀 Starting all services..." -ForegroundColor Cyan
        docker-compose up -d
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "✅ Services started successfully!" -ForegroundColor Green
            Write-Host ""
            Write-Host "📍 Access your application:" -ForegroundColor Cyan
            Write-Host "   Frontend: http://localhost:4200" -ForegroundColor White
            Write-Host "   API/Swagger: http://localhost:5190/swagger" -ForegroundColor White
            Write-Host ""
            Write-Host "To view logs, run: docker-compose logs -f" -ForegroundColor Yellow
        } else {
            Write-Host "❌ Failed to start services. Check logs with: docker-compose logs" -ForegroundColor Red
        }
    }
    "2" {
        Write-Host ""
        Write-Host "🚀 Starting database services only..." -ForegroundColor Cyan
        docker-compose up -d postgres redis
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Database services started!" -ForegroundColor Green
            Write-Host "   PostgreSQL: localhost:5432" -ForegroundColor White
            Write-Host "   Redis: localhost:6379" -ForegroundColor White
            Write-Host ""
            Write-Host "You can now run the API and Frontend manually." -ForegroundColor Yellow
        }
    }
    "3" {
        Write-Host ""
        Write-Host "🛑 Stopping all services..." -ForegroundColor Cyan
        docker-compose down
        Write-Host "✅ Services stopped" -ForegroundColor Green
    }
    "4" {
        Write-Host ""
        Write-Host "Which service logs do you want to view?" -ForegroundColor Cyan
        Write-Host "1. API"
        Write-Host "2. Client (Frontend)"
        Write-Host "3. PostgreSQL"
        Write-Host "4. Redis"
        Write-Host "5. All services"
        $logChoice = Read-Host "Enter your choice (1-5)"
        
        switch ($logChoice) {
            "1" { docker-compose logs -f api }
            "2" { docker-compose logs -f client }
            "3" { docker-compose logs -f postgres }
            "4" { docker-compose logs -f redis }
            "5" { docker-compose logs -f }
        }
    }
    "5" {
        Write-Host "Goodbye!" -ForegroundColor Cyan
        exit 0
    }
    default {
        Write-Host "❌ Invalid choice" -ForegroundColor Red
    }
}
