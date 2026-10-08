# MarketPulse: one container serves the Angular app and the .NET API on port 8080.

# 1. Angular app
FROM node:20-alpine AS client
WORKDIR /src/client
COPY client/package.json client/package-lock.json ./
RUN npm ci --ignore-scripts
COPY client/ ./
RUN npx ng build --configuration production

# 2. .NET API (no NuGet packages: restores from the shared framework only)
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS server
WORKDIR /src
COPY server/src/ src/
RUN dotnet publish src/MarketPulse.Api/MarketPulse.Api.csproj -c Release -o /app /p:UseAppHost=false

# 3. Runtime
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
ENV ASPNETCORE_ENVIRONMENT=Production \
    PORT=8080 \
    CACHE_DIR=/data/cache \
    DOTNET_gcServer=0
COPY --from=server /app ./
COPY --from=client /src/client/dist/client/browser ./wwwroot
RUN mkdir -p /data/cache && chown -R app:app /data
USER app
VOLUME /data
EXPOSE 8080
ENTRYPOINT ["dotnet", "MarketPulse.Api.dll"]
