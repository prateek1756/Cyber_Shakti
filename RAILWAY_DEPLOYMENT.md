# CyberShakti - Railway Deployment Guide

Complete step-by-step guide for deploying the CyberShakti cybersecurity platform to Railway.

## 🎯 Overview

This guide will help you deploy the complete CyberShakti application to Railway, including:
- ✅ Node.js Express backend
- ✅ React frontend (Vite)
- ✅ Python AI/ML services (fraud detection + deepfake detection)
- ✅ MySQL database
- ✅ Persistent file storage for uploads

**Deployment Time**: ~10-15 minutes  
**Cost**: ~$10-20/month (includes MySQL + compute)

---

## 📋 Prerequisites

Before you begin, ensure you have:

1. **GitHub Account** - Your code must be in a GitHub repository
2. **Railway Account** - Sign up at [railway.app](https://railway.app) (free to start)
3. **Git** - Code committed and pushed to GitHub
4. **Python requirements.txt** - Located in `python/requirements.txt`

---

## 🚀 Deployment Steps

### Step 1: Prepare Your Repository

1. **Ensure all configuration files are committed**:
   ```bash
   git add railway.json nixpacks.toml Procfile .env.railway
   git commit -m "Add Railway deployment configuration"
   git push origin main
   ```

2. **Verify these files exist in your repo**:
   - ✅ `railway.json` - Railway service configuration
   - ✅ `nixpacks.toml` - Build configuration
   - ✅ `Procfile` - Process definition
   - ✅ `.env.railway` - Environment variables template
   - ✅ `python/requirements.txt` - Python dependencies

### Step 2: Create Railway Project

1. Go to [railway.app](https://railway.app) and sign in
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your **CyberShakti repository**
5. Railway will automatically detect your configuration

### Step 3: Add MySQL Database

1. In your Railway project dashboard, click **"New"**
2. Select **"Database"** → **"Add MySQL"**
3. Railway will automatically:
   - Provision a MySQL 8.0 database
   - Inject connection variables (`MYSQLHOST`, `MYSQLPORT`, etc.)
   - Link the database to your service

### Step 4: Add Persistent Volume

1. In your Railway project dashboard, click **"New"**
2. Select **"Volume"**
3. Configure the volume:
   - **Name**: `uploads-volume`
   - **Mount Path**: `/app/uploads`
   - **Size**: `1GB` (minimum, can increase later)
4. Click **"Add Volume"**

### Step 5: Configure Environment Variables

1. Click on your **service** (not the database)
2. Go to the **"Variables"** tab
3. Click **"New Variable"** and add each variable below

#### Required Variables

```bash
# Database Mapping (use Railway's variable reference syntax)
DB_HOST=${{MYSQLHOST}}
DB_PORT=${{MYSQLPORT}}
DB_USER=${{MYSQLUSER}}
DB_PASSWORD=${{MYSQLPASSWORD}}
DB_NAME=${{MYSQLDATABASE}}

# Node Environment
NODE_ENV=production

# Python Services
FLASK_PORT=5001
FLASK_HOST=0.0.0.0
FRAUD_API_URL=http://localhost:8000
```

#### Optional Variables (API Keys)

```bash
# Only add these if you're using the respective features
VIRUSTOTAL_API_KEY=your_key_here
URLVOID_API_KEY=your_key_here
GOOGLE_SAFE_BROWSING_API_KEY=your_key_here
```

**💡 Tip**: Use the **"Raw Editor"** in Railway to paste all variables at once.

### Step 6: Deploy

1. Railway will automatically start building your application
2. Watch the **build logs** in real-time
3. Build process will:
   - Install Node.js dependencies (`pnpm install`)
   - Install Python dependencies (`pip install -r python/requirements.txt`)
   - Build frontend (`pnpm run build:client`)
   - Build backend (`pnpm run build:server`)
4. Once build completes, Railway will deploy and start your service

### Step 7: Verify Deployment

1. **Get your public URL**:
   - In Railway dashboard, click on your service
   - Go to **"Settings"** tab
   - Find **"Public Networking"** section
   - Click **"Generate Domain"**
   - Your app will be available at: `https://your-project.up.railway.app`

2. **Check service health**:
   ```bash
   curl https://your-project.up.railway.app/api/ping
   ```
   Should return: `{"message":"CyberGuard API is running","timestamp":"..."}`

3. **Verify database connection**:
   - Check the **logs** for: `[Migration] ✓ Schema migration complete`
   - Or: `[Migration] ✓ Database schema already exists`

4. **Test Python services**:
   - Check logs for: `[Python] Flask server is ready!`
   - Test deepfake endpoint: `https://your-project.up.railway.app/api/deepfake/stats`

---

## 🔍 Monitoring and Logs

### Viewing Logs

1. In Railway dashboard, click on your service
2. Go to the **"Deployments"** tab
3. Click on the latest deployment
4. View real-time logs

### Log Prefixes

- `[Server]` - Express server logs
- `[Python]` - Python service logs
- `[Migration]` - Database migration logs
- `[Database]` - Database connection logs

### Health Checks

Railway automatically monitors your service using the `/api/ping` endpoint:
- **Timeout**: 300 seconds (5 minutes)
- **Restart Policy**: ON_FAILURE
- **Max Retries**: 10

---

## 🛠️ Troubleshooting

### Build Failures

#### Error: "pnpm: command not found"
**Solution**: Railway should auto-detect pnpm from `package.json`. If not, add to `nixpacks.toml`:
```toml
[phases.setup]
nixPkgs = ["nodejs_20", "python311", "python311Packages.pip", "pnpm"]
```

#### Error: "No module named 'cv2'" (opencv-python)
**Solution**: System libraries missing. Verify `nixpacks.toml` has:
```toml
[phases.setup]
nixLibs = ["libGL", "glib"]
```

#### Error: "Build failed: Out of memory"
**Solution**: 
1. Go to service **Settings** → **Resources**
2. Increase memory limit (requires paid plan)
3. Or optimize build by removing unused dependencies

### Runtime Failures

#### Error: "Database connection failed"
**Cause**: MySQL service not linked or environment variables not set

**Solution**:
1. Verify MySQL service is running (green status in dashboard)
2. Check environment variables are set correctly
3. Ensure variable references use `${{VARIABLE}}` syntax
4. Restart the service

#### Error: "Python services not responding"
**Cause**: Python dependencies not installed or import errors

**Solution**:
1. Check build logs for Python installation errors
2. Verify `python/requirements.txt` exists
3. Check for missing system libraries in logs
4. Redeploy to trigger fresh build

#### Error: "File uploads not persisting"
**Cause**: Volume not mounted or incorrect mount path

**Solution**:
1. Verify volume is created and linked to service
2. Check mount path is `/app/uploads`
3. Restart service after adding volume

### Health Check Failures

#### Service keeps restarting
**Cause**: Health check endpoint not responding

**Solution**:
1. Check logs for startup errors
2. Verify `/api/ping` endpoint exists
3. Ensure Python services start successfully
4. Increase `healthcheckTimeout` in `railway.json` if needed

---

## 🔄 Updates and Redeployment

### Automatic Deployments

Railway automatically deploys when you push to GitHub:
```bash
git add .
git commit -m "Update feature"
git push origin main
```

Railway will:
1. Detect the push via webhook
2. Start a new build
3. Deploy if build succeeds
4. Keep old deployment running if build fails (zero-downtime)

### Manual Redeployment

1. Go to Railway dashboard
2. Click on your service
3. Go to **"Deployments"** tab
4. Click **"Redeploy"** on any previous deployment

### Rollback

If a deployment breaks something:
1. Go to **"Deployments"** tab
2. Find the last working deployment
3. Click **"Redeploy"** on that deployment

---

## 📊 Database Management

### Accessing the Database

**Option 1: Railway CLI**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Connect to MySQL
railway run mysql -u $MYSQLUSER -p$MYSQLPASSWORD -h $MYSQLHOST $MYSQLDATABASE
```

**Option 2: MySQL Client**
Get connection details from Railway dashboard:
- Go to MySQL service → **"Connect"** tab
- Use the provided connection string

### Running Migrations

Migrations run automatically on first deployment. To manually trigger:
1. Restart the service (migrations run on startup)
2. Or use Railway CLI:
   ```bash
   railway run node -e "require('./dist/server/db/migrations').runMigrations()"
   ```

### Backup Database

**Option 1: Railway Dashboard**
1. Go to MySQL service
2. Click **"Backups"** tab
3. Click **"Create Backup"**

**Option 2: Manual Export**
```bash
railway run mysqldump -u $MYSQLUSER -p$MYSQLPASSWORD -h $MYSQLHOST $MYSQLDATABASE > backup.sql
```

---

## 💰 Cost Optimization

### Free Tier Limits
- **$5 free credit** per month
- Suitable for development/testing
- May need to upgrade for production traffic

### Paid Plans
- **Hobby**: $5/month + usage
- **Pro**: $20/month + usage
- **Team**: Custom pricing

### Cost Breakdown (Estimated)
- **MySQL Database**: ~$5-10/month
- **Compute (Node + Python)**: ~$5-10/month
- **Volume (1GB)**: ~$0.10/GB/month
- **Total**: ~$10-20/month

### Optimization Tips
1. **Use volume snapshots** instead of keeping old deployments
2. **Monitor resource usage** in Railway dashboard
3. **Scale down** during low-traffic periods
4. **Remove unused services** (old deployments, test databases)

---

## 🔐 Security Best Practices

### Environment Variables
- ✅ Never commit `.env` files to Git
- ✅ Use Railway's variable management
- ✅ Rotate API keys regularly
- ✅ Use different keys for staging/production

### Database
- ✅ Railway provides automatic SSL for MySQL
- ✅ Database is not publicly accessible
- ✅ Enable backups in Railway dashboard
- ✅ Use strong passwords (Railway auto-generates)

### Application
- ✅ Railway provides automatic HTTPS
- ✅ Keep dependencies updated
- ✅ Monitor logs for suspicious activity
- ✅ Use rate limiting (already configured)

---

## 📞 Support and Resources

### Railway Resources
- **Documentation**: [docs.railway.app](https://docs.railway.app)
- **Discord**: [discord.gg/railway](https://discord.gg/railway)
- **Status**: [status.railway.app](https://status.railway.app)

### CyberShakti Resources
- **GitHub Issues**: Report bugs and request features
- **API Documentation**: See `API_REFERENCE.md`
- **Integration Docs**: See `INTEGRATION_SUMMARY.md`

### Common Commands

```bash
# View logs
railway logs

# Run commands in Railway environment
railway run <command>

# Open Railway dashboard
railway open

# Check service status
railway status

# Connect to database
railway connect mysql
```

---

## ✅ Deployment Checklist

Before going live, verify:

- [ ] All configuration files committed to Git
- [ ] MySQL database provisioned and linked
- [ ] Persistent volume created and mounted
- [ ] All environment variables configured
- [ ] Build completed successfully
- [ ] Health check endpoint responding
- [ ] Database migrations ran successfully
- [ ] Python services started successfully
- [ ] File uploads working
- [ ] All API endpoints responding
- [ ] Custom domain configured (optional)
- [ ] Monitoring and alerts set up
- [ ] Backup strategy in place

---

## 🎉 Success!

Your CyberShakti application is now live on Railway!

**Next Steps**:
1. Test all features thoroughly
2. Set up monitoring and alerts
3. Configure custom domain (optional)
4. Share your deployment URL
5. Monitor logs and performance

**Your Application URLs**:
- **Frontend**: `https://your-project.up.railway.app`
- **API**: `https://your-project.up.railway.app/api`
- **Health Check**: `https://your-project.up.railway.app/api/ping`

---

**Need Help?** Check the troubleshooting section above or reach out via GitHub issues.
