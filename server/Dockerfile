FROM mcr.microsoft.com/dotnet/aspnet:8.0@sha256:4b8f0b08534833b39bb662fb19a65e78cb086f5ca8dd35de3f87026de8885be4 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:8.0@sha256:aa05b91be697b83229cb000b90120f0783604ad74ed92a0b45cdf3d1a9c873de AS build
WORKDIR /src

# Copy project files first (for better layer caching)
COPY ["src/MarketPulse.API/MarketPulse.API.csproj", "src/MarketPulse.API/"]
COPY ["src/MarketPulse.Application/MarketPulse.Application.csproj", "src/MarketPulse.Application/"]
COPY ["src/MarketPulse.Domain/MarketPulse.Domain.csproj", "src/MarketPulse.Domain/"]
COPY ["src/MarketPulse.Infrastructure/MarketPulse.Infrastructure.csproj", "src/MarketPulse.Infrastructure/"]

RUN dotnet restore "src/MarketPulse.API/MarketPulse.API.csproj"

# Copy everything else
COPY src/ src/
WORKDIR "/src/src/MarketPulse.API"
RUN dotnet build "MarketPulse.API.csproj" -c Release -o /app/build

FROM build AS publish
WORKDIR "/src/src/MarketPulse.API"
RUN dotnet publish "MarketPulse.API.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app

# Install curl for health checks
RUN apt-get update && \
    apt-get install -y curl && \
    rm -rf /var/lib/apt/lists/*

COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "MarketPulse.API.dll"]
