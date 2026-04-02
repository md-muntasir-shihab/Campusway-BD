# CampusWay Deployment Guide

## Overview

This guide covers deploying CampusWay to production:
- **Frontend**: Firebase Hosting (already configured)
- **Backend**: Azure Container Apps

---

## Prerequisites

### Required Tools
```bash
# Azure CLI
winget install Microsoft.AzureCLI

# Azure Developer CLI (azd)
winget install Microsoft.Azd

# Docker Desktop (for local testing)
winget install Docker.DockerDesktop

# Firebase CLI
npm install -g firebase-tools
```

### Required Accounts
- ✅ Azure subscription
- ✅ Firebase project (`campuswaybd`)
- ✅ MongoDB database (external)

---

## Step 1: Delete render.yaml (Manual)

Since you're using Azure for the backend, delete the Render.com configuration:

```cmd
cd F:\CampusWay\CampusWay
del render.yaml
```

---

## Step 2: Prepare Secrets

You'll need these secrets ready:

### MongoDB
- `MONGO_URI` - Your MongoDB connection string

### Firebase
- `FIREBASE_PRIVATE_KEY` - Service account private key from Firebase Console

Get Firebase private key from:
1. Firebase Console → Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Save the JSON file securely

---

## Step 3: Deploy Backend to Azure

### 3.1 Login to Azure

```bash
# Login to Azure
az login

# Set subscription (if you have multiple)
az account set --subscription "YOUR_SUBSCRIPTION_ID"

# Login to Azure Developer CLI
azd auth login
```

### 3.2 Initialize Azure Deployment

```bash
cd F:\CampusWay\CampusWay

# Initialize azd (already configured in azure.yaml)
azd init

# Select environment name (e.g., "prod")
# Select region (e.g., "Southeast Asia")
```

### 3.3 Deploy to Azure

```bash
# This will:
# 1. Provision Azure resources (Container Apps, ACR, Key Vault, etc.)
# 2. Build Docker image
# 3. Push to Azure Container Registry
# 4. Deploy container to Container Apps

azd up
```

**Deployment time**: ~10-15 minutes

### 3.4 Configure Secrets in Key Vault

After deployment, you need to add secrets to Azure Key Vault:

```bash
# Get Key Vault name from azd output
azd env get-values | findstr AZURE_KEY_VAULT_NAME

# Add MongoDB URI
az keyvault secret set --vault-name <YOUR_VAULT_NAME> --name "MONGO-URI" --value "<YOUR_MONGODB_CONNECTION_STRING>"

# Add Firebase Private Key
az keyvault secret set --vault-name <YOUR_VAULT_NAME> --name "FIREBASE-PRIVATE-KEY" --value '<YOUR_FIREBASE_PRIVATE_KEY_JSON>'

# Generate JWT secrets (or use your own)
az keyvault secret set --vault-name <YOUR_VAULT_NAME> --name "JWT-SECRET" --value "<GENERATE_RANDOM_32_CHAR_STRING>"
az keyvault secret set --vault-name <YOUR_VAULT_NAME> --name "JWT-REFRESH-SECRET" --value "<GENERATE_RANDOM_32_CHAR_STRING>"
```

### 3.5 Update Backend to Use Key Vault Secrets

Edit `infra/modules/backend.bicep` and add secret references to the container app environment variables:

```bicep
env: [
  // ... existing env vars ...
  {
    name: 'MONGO_URI'
    secretRef: 'mongo-uri'
  }
  {
    name: 'FIREBASE_PRIVATE_KEY'
    secretRef: 'firebase-private-key'
  }
  {
    name: 'JWT_SECRET'
    secretRef: 'jwt-secret'
  }
  {
    name: 'JWT_REFRESH_SECRET'
    secretRef: 'jwt-refresh-secret'
  }
]
secrets: [
  {
    name: 'mongo-uri'
    keyVaultUrl: '${keyVault.properties.vaultUri}secrets/MONGO-URI'
    identity: backendIdentity.id
  }
  {
    name: 'firebase-private-key'
    keyVaultUrl: '${keyVault.properties.vaultUri}secrets/FIREBASE-PRIVATE-KEY'
    identity: backendIdentity.id
  }
  {
    name: 'jwt-secret'
    keyVaultUrl: '${keyVault.properties.vaultUri}secrets/JWT-SECRET'
    identity: backendIdentity.id
  }
  {
    name: 'jwt-refresh-secret'
    keyVaultUrl: '${keyVault.properties.vaultUri}secrets/JWT-REFRESH-SECRET'
    identity: backendIdentity.id
  }
]
```

Then redeploy:

```bash
azd deploy
```

### 3.6 Get Backend URL

```bash
azd env get-values | findstr BACKEND_URI
```

Example output: `https://ca-backend-abc123.northeurope.azurecontainerapps.io`

---

## Step 4: Deploy Frontend to Firebase

### 4.1 Update Frontend Environment

Update `frontend/.env.production` with your Azure backend URL:

```env
VITE_API_BASE_URL=https://ca-backend-abc123.northeurope.azurecontainerapps.io
```

### 4.2 Deploy to Firebase

```bash
cd frontend

# Login to Firebase
firebase login

# Deploy
firebase deploy --only hosting
```

**Deployment time**: ~2-3 minutes

Your frontend will be live at: `https://campuswaybd.web.app`

---

## Step 5: Verify Deployment

### 5.1 Test Backend

```bash
# Test health endpoint
curl https://YOUR_BACKEND_URL/api/health

# Should return: {"status":"healthy"}
```

### 5.2 Test Frontend

1. Open https://campuswaybd.web.app
2. Check browser console for errors
3. Try logging in
4. Navigate to admin panel
5. Test student portal

### 5.3 Check Logs

```bash
# View backend logs
azd monitor

# Or use Azure Portal:
# 1. Go to Azure Portal
# 2. Find your Container App
# 3. Go to "Log stream" or "Logs"
```

---

## Step 6: Configure MongoDB Firewall

Ensure MongoDB allows connections from Azure:

1. Get Azure Container Apps outbound IPs:
   ```bash
   az containerapp show --name <YOUR_CONTAINER_APP_NAME> --resource-group <YOUR_RESOURCE_GROUP> --query "properties.outboundIpAddresses" -o table
   ```

2. Add these IPs to MongoDB Atlas IP whitelist (or use 0.0.0.0/0 for testing)

---

## Troubleshooting

### Backend Not Starting

```bash
# Check container logs
az containerapp logs show --name <YOUR_CONTAINER_APP_NAME> --resource-group <YOUR_RESOURCE_GROUP> --follow

# Common issues:
# - MongoDB connection failed: Check MONGO_URI and firewall
# - Secrets not loading: Verify Key Vault access
# - Port issues: Ensure PORT=8080 in code
```

### Frontend Can't Connect to Backend

1. Check CORS configuration in `infra/modules/backend.bicep`
2. Verify `VITE_API_BASE_URL` in frontend `.env.production`
3. Check browser network tab for errors

### "Forbidden" or 403 Errors

- Key Vault access issue
- Check managed identity has "Key Vault Secrets User" role
- Wait 5-10 minutes for RBAC propagation

---

## Production Checklist

Before going live:

- [ ] MongoDB firewall configured
- [ ] All secrets in Key Vault
- [ ] Backend health endpoint responding
- [ ] Frontend loads without errors
- [ ] Login/authentication works
- [ ] Admin panel accessible
- [ ] Student portal functional
- [ ] Application Insights collecting data
- [ ] Custom domain configured (optional)
- [ ] SSL certificate valid
- [ ] Backup strategy in place

---

## Monitoring

### Application Insights

View metrics in Azure Portal:
1. Go to Application Insights resource
2. View dashboards for:
   - Request rates
   - Response times
   - Failure rates
   - Dependencies (MongoDB calls)

### Set Up Alerts

```bash
# Create alert for high error rate
az monitor metrics alert create \
  --name "Backend High Error Rate" \
  --resource-group <YOUR_RESOURCE_GROUP> \
  --scopes <YOUR_CONTAINER_APP_ID> \
  --condition "avg Percentage CPU > 80" \
  --description "Alert when CPU usage exceeds 80%"
```

---

## Updating Deployment

### Update Backend Code

```bash
cd F:\CampusWay\CampusWay

# Make code changes
# ...

# Deploy updated version
azd deploy backend
```

### Update Frontend

```bash
cd frontend

# Make code changes
# ...

# Build and deploy
npm run build
firebase deploy --only hosting
```

---

## Cost Optimization

Current setup is optimized for cost:
- ✅ Container Apps scales to zero (no traffic = $0)
- ✅ Basic tier ACR (~$5/month)
- ✅ Key Vault Standard tier (~$1/month)
- ✅ Application Insights pay-as-you-go

**Estimated monthly cost**: $6-25 depending on traffic

---

## Next Steps

1. Set up CI/CD with GitHub Actions
2. Configure custom domain
3. Add staging environment
4. Set up automated backups
5. Performance optimization

---

## Support

For issues:
1. Check Application Insights logs
2. Review Container App logs
3. Verify all environment variables
4. Check MongoDB connection
5. Test locally with Docker

---

**Deployment Complete! 🎉**

Your application is now live:
- Frontend: https://campuswaybd.web.app
- Backend: https://YOUR_BACKEND_URL.azurecontainerapps.io
