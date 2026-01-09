FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY ["src/MarketPulse.API/MarketPulse.API.csproj", "src/MarketPulse.API/"]
COPY ["src/MarketPulse.Application/MarketPulse.Application.csproj", "src/MarketPulse.Application/"]
COPY ["src/MarketPulse.Domain/MarketPulse.Domain.csproj", "src/MarketPulse.Domain/"]
COPY ["src/MarketPulse.Infrastructure/MarketPulse.Infrastructure.csproj", "src/MarketPulse.Infrastructure/"]

RUN dotnet restore "src/MarketPulse.API/MarketPulse.API.csproj"

COPY . .
WORKDIR "/src/src/MarketPulse.API"
RUN dotnet build "MarketPulse.API.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "MarketPulse.API.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "MarketPulse.API.dll"]


