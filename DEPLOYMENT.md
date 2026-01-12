# Deployment Guide

This guide explains how to set up CI/CD for MarketPulse using GitHub Actions and deploy to OVH VM.

## Prerequisites

1. **GitHub Repository**: Your code should be in a GitHub repository
2. **OVH VM**: A virtual machine on OVH with:
   - Docker installed
   - Docker Compose installed
   - SSH access configured
   - Ports 4200 (client) and 5190 (API) open

## Setup Instructions

### 1. GitHub Secrets Configuration

Go to your GitHub repository → Settings → Secrets and variables → Actions, and add the following secrets:

#### Required Secrets:
- `OVH_SSH_PRIVATE_KEY`: Your private SSH key for accessing the OVH VM
- `OVH_HOST`: The IP address or hostname of your OVH VM
- `OVH_USER`: The SSH username for your OVH VM (usually `root` or `ubuntu`)
- `GUSERNAME`: Your GitHub username (for GHCR authentication)
- `GHCR_TOKEN`: A GitHub Personal Access Token with `write:packages` permission

#### Creating a GitHub Personal Access Token:
1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Select scopes: `write:packages`, `read:packages`
4. Generate and copy the token
5. Add it as `GHCR_TOKEN` secret

### 2. OVH VM Setup

#### Install Docker and Docker Compose:
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group (if not root)
sudo usermod -aG docker $USER
```

#### Configure Firewall:
```bash
# Allow ports 4200 (client) and 5190 (API)
sudo ufw allow 4200/tcp
sudo ufw allow 5190/tcp
sudo ufw allow 22/tcp  # SSH
sudo ufw enable
```

#### Create Deployment Directory:
```bash
mkdir -p ~/marketpulse
cd ~/marketpulse
```

### 3. Initial Deployment

#### Option A: Manual Deployment (First Time)

1. **Copy deployment files to OVH VM:**
```bash
scp deploy.sh docker-compose.prod.yml your-user@your-ovh-vm:~/marketpulse/
```

2. **SSH into OVH VM:**
```bash
ssh your-user@your-ovh-vm
cd ~/marketpulse
```

3. **Set environment variables:**
```bash
export GITHUB_OWNER="your-github-username"
export GUSERNAME="your-github-username"
export GHCR_TOKEN="your-github-token"
```

4. **Create .env file:**
```bash
cat > .env << EOF
ASPNETCORE_ENVIRONMENT=Production
REDIS_HOST=redis
REDIS_PORT=6379
ADZUNA_APP_ID=your_app_id_here
ADZUNA_APP_KEY=your_app_key_here
GITHUB_OWNER=your-github-username
EOF
```

5. **Run deployment:**
```bash
chmod +x deploy.sh
./deploy.sh
```

#### Option B: Automated Deployment via GitHub Actions

Once secrets are configured, the deployment will happen automatically on push to `main` or `master` branch.

### 4. CI/CD Workflow

The CI/CD pipeline consists of two workflows:

#### `ci-cd.yml` (Build and Push)
- Triggers on push to `main`, `master`, or `develop`
- Builds Docker images for API and Client
- Pushes images to GitHub Container Registry (GHCR)
- Tags images with branch name, SHA, and `latest` (for main branch)

#### `deploy-ovh.yml` (Deploy)
- Triggers on push to `main` or `master`
- Copies deployment files to OVH VM
- Runs deployment script on OVH VM
- Pulls latest images from GHCR
- Starts containers using docker-compose

### 5. Image Naming Convention

Images are pushed to GHCR with the following naming:
- API: `ghcr.io/OWNER/marketpulse-api:latest`
- Client: `ghcr.io/OWNER/marketpulse-client:latest`

Replace `OWNER` with your GitHub username or organization name.

### 6. Updating docker-compose.prod.yml

Make sure to update the `GITHUB_OWNER` variable in `docker-compose.prod.yml`:

```yaml
api:
  image: ghcr.io/YOUR_USERNAME/marketpulse-api:latest
```

Or use environment variable:
```yaml
api:
  image: ghcr.io/${GITHUB_OWNER}/marketpulse-api:latest
```

### 7. Monitoring Deployment

After deployment, check container status:
```bash
docker ps --filter "name=marketpulse"
```

View logs:
```bash
docker logs marketpulse-api
docker logs marketpulse-client
docker logs marketpulse-redis
```

### 8. Troubleshooting

#### Images not found:
- Check if images are public or if you're authenticated to GHCR
- Verify `GHCR_TOKEN` has correct permissions
- Check image names match your GitHub username/organization

#### Deployment fails:
- Check SSH connection: `ssh your-user@your-ovh-vm`
- Verify Docker is running: `docker ps`
- Check disk space: `df -h`
- View deployment logs on GitHub Actions

#### Containers not starting:
- Check logs: `docker logs marketpulse-api`
- Verify .env file has correct values
- Check port conflicts: `netstat -tulpn | grep -E '4200|5190'`

### 9. Manual Deployment Commands

If you need to manually deploy:

```bash
# Pull latest images
docker pull ghcr.io/YOUR_USERNAME/marketpulse-api:latest
docker pull ghcr.io/YOUR_USERNAME/marketpulse-client:latest

# Stop existing containers
docker-compose -f docker-compose.prod.yml down

# Start containers
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### 10. Rollback

To rollback to a previous version:

```bash
# Pull specific tag
docker pull ghcr.io/YOUR_USERNAME/marketpulse-api:previous-tag

# Update docker-compose.prod.yml with specific tag
# Then restart
docker-compose -f docker-compose.prod.yml up -d
```

## Security Notes

1. **Never commit secrets**: All sensitive data should be in GitHub Secrets
2. **Use SSH keys**: Always use SSH keys, never passwords
3. **Restrict access**: Limit who can access the OVH VM
4. **Keep updated**: Regularly update Docker images and system packages
5. **Monitor logs**: Regularly check application and system logs

## Support

For issues or questions:
1. Check GitHub Actions logs
2. Review container logs on OVH VM
3. Verify all secrets are correctly configured
