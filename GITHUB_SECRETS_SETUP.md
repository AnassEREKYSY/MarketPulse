# GitHub Secrets Setup Guide

## Required GitHub Secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add the following secrets (DO NOT include the quotes when adding):

### 1. OVH_SSH_PRIVATE_KEY
**Name:** `OVH_SSH_PRIVATE_KEY`  
**Value:** Your complete SSH private key (including BEGIN and END lines)

Copy the entire SSH private key including:
```
-----BEGIN OPENSSH PRIVATE KEY-----
... (all the key content) ...
-----END OPENSSH PRIVATE KEY-----
```

### 2. OVH_HOST
**Name:** `OVH_HOST`  
**Value:** `146.59.225.42`

### 3. OVH_USER
**Name:** `OVH_USER`  
**Value:** `ubuntu`

### 4. GHCR_TOKEN
**Name:** `GHCR_TOKEN`  
**Value:** Your GitHub Personal Access Token (starts with `ghp_`)

**Note:** The token you provided will work, but for security, consider creating a new token with minimal permissions:
- Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
- Create a new token with only `write:packages` and `read:packages` scopes
- Use that token instead

## Summary

You need to add these 4 secrets:
1. ✅ `OVH_SSH_PRIVATE_KEY` - Your SSH private key
2. ✅ `OVH_HOST` - `146.59.225.42`
3. ✅ `OVH_USER` - `ubuntu`
4. ✅ `GHCR_TOKEN` - Your GitHub token

**Important Notes:**
- The `GUSERNAME` secret is NOT needed - it's automatically set from `github.repository_owner` (AnassEREKYSY)
- Never commit these secrets to your repository
- The SSH key should be the complete key including BEGIN/END markers
- Make sure there are no extra spaces or line breaks when copying

## Verification

After adding the secrets, you can verify by:
1. Going to Actions tab
2. Running the workflow manually (if workflow_dispatch is enabled)
3. Or push to main/master branch to trigger automatically
