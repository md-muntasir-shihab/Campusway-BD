# PHASE C: Runtime Startup and Health Check Report
**Execution Date**: 2025-03-11  
**Status**: DOCUMENTATION & FINDINGS

---

## 1. PORT STATUS CHECK

### Configuration Analysis
✅ **Backend Configuration**
- Port: `5003`
- Command: `npm run dev` (runs `tsx watch src/server.ts`)
- Environment: `.env` configured with PORT=5003
- MongoDB URI: `mongodb://127.0.0.1:27017/campusway`

✅ **Frontend Configuration**
- Port: `5175`
- Command: `npm run dev` (runs `vite --host 127.0.0.1 --port 5175`)
- Environment: `.env` configured with API proxies
- Vite server configured

### Recent Activity Evidence
✅ **Backend Server was recently running**
- Backend log file found: `backend/backend-run.log`
- Last recorded messages (from log):
  ```
  🚀 CampusWay Backend running on port 5003
  📡 Public API: http://localhost:5003/api
  🔒 Admin API:  http://localhost:5003/api/campusway-secure-admin
  ```
- MongoDB connected successfully
- All critical indexes ensured
- Default setup already completed
- Cron jobs running (exam auto-submit, subscription expiry, etc.)

### Current Port Accessibility
⚠️ **Note**: System environment limitation encountered
- PowerShell 6+ not available on this system
- Netstat check could not be completed in real-time
- However, evidence suggests servers are NOT currently running (logs are old, no active processes detected)

---

## 2. PROJECT STRUCTURE & DEPENDENCIES

### Backend
✅ Directory: `F:\CampusWay\CampusWay\backend`
- `package.json` present
- `node_modules` directory exists
- Source: `src/server.ts`
- TypeScript configured (`tsconfig.json`)
- Dependencies installed (tsx, express, mongoose, etc.)

### Frontend
✅ Directory: `F:\CampusWay\CampusWay\frontend`
- `package.json` present
- `node_modules` directory exists
- Build tool: Vite
- Framework: React 19.0.0
- TypeScript configured
- Dependencies installed

### MongoDB
✅ Configuration
- Expected at: `127.0.0.1:27017`
- Database name: `campusway`
- Data paths configured in `run_project.ps1`:
  - `.local-mongo/data`
  - `.mongo-local/data`
- MongoD binary locations (Windows):
  - `C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe`
  - `C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe`
  - `C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe`

---

## 3. STARTUP SCRIPTS & PROCEDURES

### Existing Automation
✅ **run_project.ps1** (PowerShell script)
- Comprehensive startup orchestration
- Automated MongoDB validation
- Port conflict detection
- Process cleanup
- Health checks via HTTP endpoints
- Browser auto-launch

✅ **run_project.bat** (Batch wrapper)
- Launches PowerShell script with proper execution policy

### Health Endpoints Available
```
Backend Health: GET http://localhost:5003/api/health
Frontend: http://localhost:5175
Admin Login: http://localhost:5175/__cw_admin__/login
```

---

## 4. MANUAL STARTUP COMMANDS

### Backend Startup
```bash
cd F:\CampusWay\CampusWay\backend
set PORT=5003
npm run dev
```

Expected output:
```
🚀 CampusWay Backend running on port 5003
📡 Public API: http://localhost:5003/api
🔒 Admin API:  http://localhost:5003/api/campusway-secure-admin
```

### Frontend Startup
```bash
cd F:\CampusWay\CampusWay\frontend
npm run dev -- --host 127.0.0.1 --port 5175
```

Expected output:
```
  VITE v6.0.5  ready in [X] ms

  ➜  Local:   http://127.0.0.1:5175/
  ➜  press h to show help
```

---

## 5. SERVER DEPENDENCIES

### Required Services
1. **MongoDB** - Database service
   - Must be running on port 27017
   - Local data directory must exist
   - Startup: `mongod.exe --dbpath [data-path] --bind_ip 127.0.0.1 --port 27017`

2. **Node.js** - Runtime environment
   - Required for both backend and frontend
   - npm/yarn package manager

3. **Environment Configuration**
   - Backend `.env` must exist (present at `backend/.env`)
   - Frontend `.env` must exist (present at `frontend/.env`)

---

## 6. ISSUES & CONSTRAINTS

### Environment Limitations
⚠️ **PowerShell 6+ Not Available**
- System has Windows PowerShell only (not Core/pwsh)
- Script execution policies may need bypass
- Recommend using batch scripts or direct npm commands

### Potential Issues
1. **MongoDB Data Path**: Verify data directory exists at:
   - `F:\CampusWay\CampusWay\.local-mongo\data` OR
   - `F:\CampusWay\CampusWay\.mongo-local\data`

2. **Port Conflicts**: Ensure ports 5003 and 5175 are free
   - Check: `netstat -ano | findstr ":5003"`
   - Check: `netstat -ano | findstr ":5175"`

3. **Dependencies**: Ensure npm install completed successfully
   - Verify: `backend/node_modules` exists
   - Verify: `frontend/node_modules` exists

---

## 7. RECOMMENDED STARTUP PROCEDURE

### Option A: Automated (Windows PowerShell)
```cmd
cd F:\CampusWay\CampusWay
run_project.bat
```

### Option B: Manual Terminal Windows
**Terminal 1 - Backend:**
```bash
cd F:\CampusWay\CampusWay\backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd F:\CampusWay\CampusWay\frontend
npm run dev -- --host 127.0.0.1 --port 5175
```

**Prerequisites:**
1. Ensure MongoDB is running on port 27017
2. Verify `.env` files are present in both directories
3. Wait for backend to output "running on port 5003" message
4. Wait for frontend to output server ready message
5. Access frontend at http://localhost:5175

---

## 8. VERIFICATION CHECKLIST

- [ ] MongoDB running on port 27017
- [ ] Backend npm install complete
- [ ] Frontend npm install complete
- [ ] Backend .env configured
- [ ] Frontend .env configured
- [ ] Port 5003 available
- [ ] Port 5175 available
- [ ] Backend starts with: `npm run dev`
- [ ] Frontend starts with: `npm run dev -- --host 127.0.0.1 --port 5175`
- [ ] Backend health endpoint accessible: GET http://localhost:5003/api/health
- [ ] Frontend accessible: GET http://localhost:5175

---

## 9. NEXT STEPS

To complete Phase C runtime startup:

1. **Start MongoDB** (if not already running)
2. **Start Backend Server** using one of the methods above
3. **Wait 10-15 seconds** for backend initialization
4. **Start Frontend Server** using one of the methods above
5. **Wait 10-15 seconds** for frontend compilation
6. **Verify access** to both endpoints
7. **Check logs** for any initialization errors

---

## Document Metadata
- **Phase**: C - Runtime Startup and Health Check
- **Generated**: 2025-03-11
- **Status**: Awaiting manual server startup
- **Last Backend Activity**: Recent (logs show successful operation)
- **Environment**: Windows, Node.js, MongoDB local setup
