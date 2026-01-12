#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
GITHUB_OWNER="${GITHUB_OWNER:-your-username}"
# Convert to lowercase for Docker image names (Docker requires lowercase)
GITHUB_OWNER_LOWER=$(echo "$GITHUB_OWNER" | tr '[:upper:]' '[:lower:]')
GUSERNAME="${GUSERNAME:-${GITHUB_OWNER}}"
REGISTRY="ghcr.io"
API_IMAGE="${REGISTRY}/${GITHUB_OWNER_LOWER}/marketpulse-api:latest"
CLIENT_IMAGE="${REGISTRY}/${GITHUB_OWNER_LOWER}/marketpulse-client:latest"
DEPLOY_DIR="${DEPLOY_DIR:-$HOME/marketpulse}"

# Validate configuration
if [ -z "$GITHUB_OWNER" ] || [ "$GITHUB_OWNER" == "your-username" ]; then
    echo -e "${RED}Error: GITHUB_OWNER is not set. Please set it as an environment variable.${NC}"
    echo -e "${YELLOW}Example: export GITHUB_OWNER=your-github-username${NC}"
    echo -e "${YELLOW}Current value: GITHUB_OWNER=${GITHUB_OWNER}${NC}"
    exit 1
fi

echo -e "${GREEN}Starting deployment...${NC}"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed${NC}"
    exit 1
fi

# Function to get all ports in use by Docker containers
get_used_ports() {
    # Get all ports from running Docker containers
    # Handles formats like: 0.0.0.0:PORT->..., :::PORT->..., PORT/tcp
    docker ps --format "{{.Ports}}" 2>/dev/null | \
        grep -oE '(0\.0\.0\.0|:::)?:?[0-9]+->' | \
        sed 's/.*:\([0-9]*\)->.*/\1/' | \
        grep -v '^$' | \
        sort -u || echo ""
}

# Function to check if a port is available
check_port_available() {
    local port=$1
    
    # Get all ports currently in use by Docker
    local used_ports=$(get_used_ports)
    
    # Check if port is in use by Docker containers
    if echo "$used_ports" | grep -q "^${port}$"; then
        return 1  # Port is in use
    fi
    
    # Also check Docker port format (0.0.0.0:PORT->...)
    if docker ps --format "{{.Ports}}" 2>/dev/null | grep -qE "0\.0\.0\.0:${port}->|:::${port}->"; then
        return 1  # Port is in use
    fi
    
    # Check if port is in use by system processes
    if command -v ss &> /dev/null; then
        if ss -lntu 2>/dev/null | grep -qE ":${port} "; then
            return 1  # Port is in use
        fi
    elif command -v netstat &> /dev/null; then
        if netstat -lntu 2>/dev/null | grep -qE ":${port} "; then
            return 1  # Port is in use
        fi
    fi
    
    return 0  # Port is available
}

# Function to find an available port starting from a base port
find_available_port() {
    local base_port=$1
    local port=$base_port
    local max_attempts=10
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if check_port_available $port; then
            echo $port
            return 0
        fi
        port=$((port + 1))
        attempt=$((attempt + 1))
    done
    
    echo $base_port  # Fallback to base port if none found
    return 1
}

# Check and assign ports
echo -e "${YELLOW}Checking port availability...${NC}"

# Get list of currently used ports
USED_PORTS=$(get_used_ports)
echo -e "${YELLOW}Currently used ports: ${USED_PORTS}${NC}"

CLIENT_PORT=4200
API_PORT=5190

# Check client port (4200 is used by skinet-client)
if ! check_port_available $CLIENT_PORT; then
    echo -e "${YELLOW}Port $CLIENT_PORT is in use, finding alternative...${NC}"
    # Start from 4201 and skip known used ports
    CLIENT_PORT=$(find_available_port 4201)
    echo -e "${GREEN}Using port $CLIENT_PORT for client${NC}"
else
    echo -e "${GREEN}Port $CLIENT_PORT is available for client${NC}"
fi

# Check API port (5190 might be used by existing marketpulse-api)
if ! check_port_available $API_PORT; then
    echo -e "${YELLOW}Port $API_PORT is in use, finding alternative...${NC}"
    # Start from 5191 and skip known used ports
    API_PORT=$(find_available_port 5191)
    echo -e "${GREEN}Using port $API_PORT for API${NC}"
else
    echo -e "${GREEN}Port $API_PORT is available for API${NC}"
fi

export CLIENT_PORT
export API_PORT

echo -e "${GREEN}Selected ports - Client: $CLIENT_PORT, API: $API_PORT${NC}"

# Navigate to deployment directory
cd "$DEPLOY_DIR" || {
    echo -e "${YELLOW}Creating deployment directory: $DEPLOY_DIR${NC}"
    mkdir -p "$DEPLOY_DIR"
    cd "$DEPLOY_DIR"
}

# Login to GHCR (if not already logged in)
if [ -n "$GHCR_TOKEN" ] && [ -n "$GUSERNAME" ]; then
    echo -e "${YELLOW}Logging in to GitHub Container Registry...${NC}"
    echo "$GHCR_TOKEN" | docker login "$REGISTRY" -u "$GUSERNAME" --password-stdin || {
        echo -e "${YELLOW}Warning: Could not login to GHCR. Make sure GHCR_TOKEN and GUSERNAME are set.${NC}"
        echo -e "${YELLOW}Continuing with public images...${NC}"
    }
else
    echo -e "${YELLOW}Warning: GHCR_TOKEN or GUSERNAME not set. Attempting to pull public images...${NC}"
fi

# Pull latest images
echo -e "${GREEN}Pulling latest images...${NC}"
docker pull "$API_IMAGE" || {
    echo -e "${RED}Error: Failed to pull API image${NC}"
    exit 1
}

docker pull "$CLIENT_IMAGE" || {
    echo -e "${RED}Error: Failed to pull Client image${NC}"
    exit 1
}

# Pull Redis image (if not already present)
docker pull redis:7-alpine || true

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file from template...${NC}"
    cat > .env << EOF
# API Configuration
ASPNETCORE_ENVIRONMENT=Production
REDIS_HOST=redis
REDIS_PORT=6379

# Adzuna API (required)
ADZUNA_APP_ID=your_app_id_here
ADZUNA_APP_KEY=your_app_key_here

# GitHub Container Registry
GITHUB_OWNER=${GITHUB_OWNER}
EOF
    echo -e "${YELLOW}Please edit .env file with your actual configuration${NC}"
fi

    # Create docker-compose.prod.yml if it doesn't exist
    if [ ! -f docker-compose.prod.yml ]; then
        echo -e "${YELLOW}Creating docker-compose.prod.yml...${NC}"
        cat > docker-compose.prod.yml << EOF
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    container_name: marketpulse-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - marketpulse-network

  api:
    image: ghcr.io/${GITHUB_OWNER_LOWER}/marketpulse-api:latest
    container_name: marketpulse-api
    restart: unless-stopped
    ports:
      - "${API_PORT}:8080"
    env_file:
      - .env
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on:
      redis:
        condition: service_healthy
    networks:
      - marketpulse-network
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:8080/api/jobs/statistics || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 60s

  client:
    image: ghcr.io/${GITHUB_OWNER_LOWER}/marketpulse-client:latest
    container_name: marketpulse-client
    restart: unless-stopped
    ports:
      - "${CLIENT_PORT}:80"
    depends_on:
      api:
        condition: service_started
    environment:
      - API_URL=http://localhost:${API_PORT}
    networks:
      - marketpulse-network

volumes:
  redis_data:
    driver: local

networks:
  marketpulse-network:
    driver: bridge
EOF
    else
        # Update existing docker-compose.prod.yml with lowercase owner and dynamic ports
        echo -e "${YELLOW}Updating docker-compose.prod.yml with lowercase image names and ports...${NC}"
        sed -i "s|ghcr.io/\${GITHUB_OWNER}/|ghcr.io/${GITHUB_OWNER_LOWER}/|g" docker-compose.prod.yml
        sed -i "s|ghcr.io/\${GITHUB_OWNER_LOWER}/|ghcr.io/${GITHUB_OWNER_LOWER}/|g" docker-compose.prod.yml
        # Update ports
        sed -i "s|\"4200:80\"|\"${CLIENT_PORT}:80\"|g" docker-compose.prod.yml
        sed -i "s|\"5190:8080\"|\"${API_PORT}:8080\"|g" docker-compose.prod.yml
        sed -i "s|API_URL=http://localhost:5190|API_URL=http://localhost:${API_PORT}|g" docker-compose.prod.yml
        sed -i "s|API_URL=http://\${OVH_HOST:-localhost}:5190|API_URL=http://\${OVH_HOST:-localhost}:${API_PORT}|g" docker-compose.prod.yml
    fi

# Stop existing containers
echo -e "${YELLOW}Stopping existing containers...${NC}"
if command -v docker-compose &> /dev/null; then
    docker-compose -f docker-compose.prod.yml down --remove-orphans || true
else
    docker compose -f docker-compose.prod.yml down --remove-orphans || true
fi

# Remove any containers with marketpulse in the name
echo -e "${YELLOW}Removing any remaining marketpulse containers...${NC}"
docker ps -a --filter "name=marketpulse" --format "{{.ID}}" 2>/dev/null | while read -r container_id; do
    if [ -n "$container_id" ]; then
        docker stop "$container_id" 2>/dev/null || true
        docker rm -f "$container_id" 2>/dev/null || true
    fi
done

# Wait a moment for cleanup to complete
sleep 2

# Remove old images (optional, to save space)
echo -e "${YELLOW}Cleaning up old images...${NC}"
docker image prune -f || true

# Start containers
echo -e "${GREEN}Starting containers...${NC}"
if command -v docker-compose &> /dev/null; then
    docker-compose -f docker-compose.prod.yml up -d
else
    docker compose -f docker-compose.prod.yml up -d
fi

# Wait for services to start
echo -e "${YELLOW}Waiting for services to start...${NC}"
sleep 15

# Check API logs if it's not healthy
echo -e "${YELLOW}Checking API container logs...${NC}"
if docker logs marketpulse-api --tail 50 2>&1 | grep -i "error\|exception\|fail" > /dev/null; then
    echo -e "${RED}API container has errors. Showing last 50 lines:${NC}"
    docker logs marketpulse-api --tail 50
fi

# Check container status
echo -e "${GREEN}Container status:${NC}"
docker ps --filter "name=marketpulse" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Health check
echo -e "${YELLOW}Performing health checks...${NC}"

# Check Redis
if docker exec marketpulse-redis redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Redis is healthy${NC}"
else
    echo -e "${RED}✗ Redis is not responding${NC}"
fi

# Check API
echo -e "${YELLOW}Checking API health...${NC}"
if curl -f http://localhost:5190/api/jobs/statistics > /dev/null 2>&1; then
    echo -e "${GREEN}✓ API is healthy${NC}"
else
    echo -e "${YELLOW}⚠ API health check failed${NC}"
    echo -e "${YELLOW}Checking API container status...${NC}"
    docker ps -a --filter "name=marketpulse-api" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo -e "${YELLOW}API logs (last 30 lines):${NC}"
    docker logs marketpulse-api --tail 30 || true
fi

# Check Client
if curl -f http://localhost:4200 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Client is healthy${NC}"
else
    echo -e "${YELLOW}⚠ Client health check failed (might still be starting)${NC}"
fi

echo -e "${GREEN}Deployment completed!${NC}"
echo -e "${GREEN}API: http://localhost:5190${NC}"
echo -e "${GREEN}Client: http://localhost:4200${NC}"
