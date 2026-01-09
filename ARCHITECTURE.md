# MarketPulse Jobs - Architecture Documentation

## Overview

MarketPulse Jobs is built using Clean Architecture principles, ensuring separation of concerns, testability, and maintainability. The application consists of a .NET 8 backend and an Angular 19 frontend.

## Backend Architecture

### Clean Architecture Layers

#### 1. Domain Layer (`MarketPulse.Domain`)
**Purpose**: Pure business logic with no external dependencies

**Components**:
- **Entities**: `JobOffer`, `Company`, `Location`
- **Value Objects**: `SalaryRange`, `ContractType`, `ExperienceLevel`
- **Enums**: `EmploymentType`, `WorkMode`

**Key Principles**:
- No dependencies on other layers
- Pure C# classes
- Business rules and domain logic

#### 2. Application Layer (`MarketPulse.Application`)
**Purpose**: Application-specific business logic and use cases

**Components**:
- **CQRS Pattern**: Queries and handlers using MediatR
- **DTOs**: Data transfer objects for API responses
- **Interfaces**: Contracts for infrastructure services
- **Handlers**: Query handlers implementing business logic

**Key Features**:
- CQRS for separation of read/write operations
- MediatR for mediator pattern implementation
- AutoMapper for object mapping
- Dependency inversion (depends on Domain, not Infrastructure)

#### 3. Infrastructure Layer (`MarketPulse.Infrastructure`)
**Purpose**: External concerns and implementations

**Components**:
- **External APIs**: Adzuna, JSearch providers
- **Data Access**: Entity Framework Core, PostgreSQL
- **Caching**: Redis implementation
- **Services**: Geocoding, salary normalization
- **Repositories**: Data access implementations

**Key Features**:
- Implements interfaces from Application layer
- Handles external API integrations
- Database context and migrations
- Redis caching with fallback to in-memory

#### 4. API Layer (`MarketPulse.API`)
**Purpose**: HTTP endpoints and application entry point

**Components**:
- **Controllers**: RESTful API endpoints
- **Program.cs**: Application configuration
- **Middleware**: CORS, Swagger, error handling

**Key Features**:
- RESTful API design
- Swagger/OpenAPI documentation
- CORS configuration for Angular frontend
- Dependency injection setup

## Frontend Architecture

### Angular 19 Structure

#### Core Module
- **Services**: HTTP services, API communication
- **Interceptors**: HTTP interceptors for error handling
- **Models**: TypeScript interfaces and types
- **Guards**: Route guards (if needed)

#### Features Module
- **Dashboard**: Main statistics and overview
- **Search**: Job search with filters
- **Analytics**: Salary and trend analytics
- **Maps**: Interactive heatmaps

#### Shared Module
- **Components**: Reusable UI components
- **Charts**: Chart components using ECharts
- **Filters**: Filter components
- **UI**: Common UI elements

#### Layout Module
- **Navbar**: Top navigation
- **Sidebar**: Side navigation
- **Shell**: Main layout wrapper

## Data Flow

### Request Flow
1. **Frontend** → HTTP Request → **API Controller**
2. **API Controller** → MediatR → **Query Handler**
3. **Query Handler** → **Repository/Service** → **Database/External API**
4. **Response** flows back through the same path

### Caching Strategy
- **Redis** for production (with in-memory fallback)
- **TTL Strategy**:
  - Job searches: 6 hours
  - Analytics: 24 hours
  - Heatmap data: 24 hours

## Technology Decisions

### Backend
- **.NET 8**: Latest LTS version, performance improvements
- **PostgreSQL**: Robust relational database
- **Redis**: High-performance caching
- **MediatR**: Clean CQRS implementation
- **EF Core**: ORM with code-first migrations

### Frontend
- **Angular 19**: Latest version with standalone components
- **Angular Material**: Professional UI components
- **ECharts**: Powerful charting library
- **Leaflet**: Lightweight mapping library
- **RxJS**: Reactive programming

## Design Patterns

1. **Repository Pattern**: Data access abstraction
2. **CQRS**: Command Query Responsibility Segregation
3. **Dependency Injection**: Loose coupling
4. **Mediator Pattern**: Via MediatR
5. **Strategy Pattern**: Multiple job providers
6. **Factory Pattern**: Service registration

## Security Considerations

- API keys in configuration (use environment variables in production)
- CORS configured for specific origins
- Input validation on all endpoints
- SQL injection protection via EF Core
- HTTPS in production

## Scalability

- **Horizontal Scaling**: Stateless API, can scale horizontally
- **Caching**: Redis reduces database load
- **Database**: PostgreSQL supports high concurrency
- **CDN**: Frontend can be served via CDN

## Testing Strategy (Future)

- **Unit Tests**: Domain and Application layers
- **Integration Tests**: API endpoints
- **E2E Tests**: Frontend user flows
- **Load Tests**: Performance under load

## Deployment

- **Docker**: Containerized for easy deployment
- **Docker Compose**: Local development setup
- **Production**: Can deploy to Azure, AWS, or any container platform


