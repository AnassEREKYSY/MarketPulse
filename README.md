# MarketPulse Jobs – Job Market Intelligence Platform

A production-ready full-stack application that aggregates public job market data from external APIs, processes and normalizes the data, caches results with Redis, and presents high-quality analytics, charts, and interactive maps through a modern professional UI.

## 🏗️ Architecture

### Backend (.NET 8 - Clean Architecture)

The backend follows Clean Architecture principles with clear separation of concerns:

- **Domain Layer**: Pure business logic with entities, value objects, and enums
- **Application Layer**: CQRS pattern with MediatR, DTOs, and query handlers
- **Infrastructure Layer**: External API integrations, Redis caching, PostgreSQL database
- **API Layer**: RESTful endpoints with Swagger documentation

### Frontend (Angular 19)

Modern Angular application with:
- Standalone components
- Feature-based architecture
- Angular Material for professional UI
- ECharts for data visualization
- Leaflet for interactive maps

## 🚀 Quick Start

### Prerequisites

- .NET 8 SDK
- Node.js 20+
- Docker and Docker Compose
- PostgreSQL 15+ (or use Docker)
- Redis 7+ (or use Docker)

### Using Docker Compose (Recommended)

1. Clone the repository:
```bash
git clone <repository-url>
cd MarketPulse
```

2. Configure API keys and credentials:
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Edit `.env` and fill in your actual credentials:
     ```env
     ADZUNA_APP_ID=your-adzuna-app-id
     ADZUNA_APP_KEY=your-adzuna-app-key
     JSEARCH_API_KEY=your-rapidapi-key
     ```
   - **Important**: The `.env` file is gitignored and will not be committed to version control.

3. Start all services:
```bash
docker-compose up -d
```

4. Access the application:
- Frontend: http://localhost:4200
- API: http://localhost:5000
- Swagger: http://localhost:5000/swagger

### Manual Setup

#### Backend

1. Navigate to the server directory:
```bash
cd server
```

2. Restore dependencies:
```bash
dotnet restore
```

3. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Fill in your API keys and database credentials in `.env`

4. Run database migrations:
```bash
cd src/MarketPulse.API
dotnet ef database update
```

5. Run the API:
```bash
dotnet run --project src/MarketPulse.API
```

#### Frontend

1. Navigate to the client directory:
```bash
cd client
```

2. Install dependencies:
```bash
npm install
```

3. Update API URL in `src/app/core/services/jobs.service.ts` if needed

4. Run the development server:
```bash
npm start
```

## 📊 Features

### Dashboard
- Real-time job market statistics
- Visual breakdowns by employment type, work mode, and experience level
- Top companies and locations

### Job Search
- Advanced filtering (location, employment type, work mode, experience, salary)
- Paginated results
- Direct links to job postings

### Analytics
- Salary analytics by experience level and location
- Hiring trends over time
- Salary trends visualization

### Heat Maps
- Interactive job density heatmap
- Salary heatmap by location
- Geographic visualization with Leaflet

## 🔌 External APIs

The application integrates with the following free/limited APIs:

1. **Adzuna Jobs API** (Primary)
   - Free tier available
   - Sign up at: https://developer.adzuna.com/

2. **JSearch API (RapidAPI)** (Fallback)
   - Free tier available
   - Sign up at: https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch

3. **OpenStreetMap Nominatim** (Geocoding)
   - Free and open-source
   - No API key required

## 🗄️ Database Schema

- **JobOffers**: Normalized job postings
- **Companies**: Company information
- **Locations**: Geographic data with coordinates

## 🔄 Caching Strategy

- **Job Search Results**: 6 hours TTL
- **Analytics & Statistics**: 24 hours TTL
- **Heatmap Data**: 24 hours TTL

## 📁 Project Structure

```
/marketpulse-jobs
├── server/
│   └── src/
│       ├── MarketPulse.API/
│       ├── MarketPulse.Application/
│       ├── MarketPulse.Domain/
│       └── MarketPulse.Infrastructure/
├── client/
│   └── src/
│       └── app/
│           ├── core/
│           ├── features/
│           ├── shared/
│           └── layout/
├── docker-compose.yml
└── README.md
```

## 🛠️ Technology Stack

### Backend
- .NET 8
- Entity Framework Core
- PostgreSQL
- Redis
- MediatR (CQRS)
- AutoMapper
- Swagger/OpenAPI

### Frontend
- Angular 19
- Angular Material
- ECharts (via ngx-echarts)
- Leaflet
- RxJS
- TypeScript

## 📝 API Endpoints

- `GET /api/jobs/search` - Search jobs with filters
- `GET /api/jobs/statistics` - Get job market statistics
- `GET /api/jobs/salaries` - Get salary analytics
- `GET /api/jobs/heatmap` - Get heatmap data
- `GET /api/jobs/trends` - Get hiring and salary trends

## 🎨 Design Principles

- **Clean Architecture**: Separation of concerns, dependency inversion
- **CQRS**: Command Query Responsibility Segregation
- **Repository Pattern**: Data access abstraction
- **Dependency Injection**: Loose coupling
- **Professional UI**: Enterprise-grade design, not experimental

## 🔒 Security Considerations

- API keys stored in configuration (use environment variables in production)
- CORS configured for Angular frontend
- Input validation on all endpoints
- SQL injection protection via EF Core parameterized queries

## 🚧 Future Enhancements

- User authentication and personalized dashboards
- Job alerts and notifications
- Export data to CSV/PDF
- Advanced filtering and saved searches
- Real-time updates via SignalR
- Machine learning for salary predictions

## 📄 License

This project is for portfolio/demonstration purposes.

## 👤 Author

Built as a portfolio project demonstrating enterprise-level full-stack development skills.

---

**Note**: This application uses free-tier APIs with rate limits. For production use, consider upgrading to paid tiers or implementing additional data sources.
