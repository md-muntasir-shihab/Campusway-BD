# PHASE C: RUNTIME STARTUP AND HEALTH CHECK
## Document Index and Navigation Guide

**Phase Status**: ✅ ANALYSIS COMPLETE - READY FOR IMPLEMENTATION  
**Date**: March 11, 2025  
**Location**: F:\CampusWay\CampusWay  

---

## 📋 Quick Navigation

### 🚀 **START HERE** (Choose One)

1. **If you want to start servers immediately:**
   - Open `START_SERVERS.bat` (double-click)
   - This is the fastest way - two windows will open

2. **If you want quick instructions:**
   - Read `PHASE_C_README.txt` (plain text, 5 minutes)
   - Contains essential info and URLs

3. **If you want complete documentation:**
   - Read `PHASE_C_COMPLETE_REPORT.md` (comprehensive, 15 minutes)
   - Contains everything: configs, troubleshooting, reference

---

## 📁 Document Overview

### Essential Files (Use These)

| File | Purpose | Read Time | When to Use |
|------|---------|-----------|------------|
| `START_SERVERS.bat` | **Launch both servers** | 30 sec execution | Immediately |
| `HEALTH_CHECK.bat` | **Verify services running** | 1 min execution | After servers start |
| `PHASE_C_README.txt` | Quick reference | 5 min | First time setup |
| `PHASE_C_COMPLETE_REPORT.md` | Full documentation | 15 min | Reference guide |

### Reference Files (For Lookup)

| File | Purpose | Content |
|------|---------|---------|
| `PHASE_C_STARTUP_REPORT.md` | Configuration details | Port configs, dependencies, env vars |
| `PHASE_C_EXECUTION_SUMMARY.md` | Procedures & troubleshooting | Manual startup steps, problem solving |
| `PHASE_C_INDEX.md` | This file | Navigation and overview |

---

## 🎯 Quick Decision Tree

```
Want to START SERVERS?
├─ YES, NOW → Double-click START_SERVERS.bat
└─ YES, MANUALLY → Go to "Manual Startup" section below

Want to VERIFY SERVERS?
├─ Automated → Double-click HEALTH_CHECK.bat
└─ Manual → See "Health Check URLs" below

Want QUICK REFERENCE?
├─ 5-minute read → PHASE_C_README.txt
├─ 15-minute read → PHASE_C_COMPLETE_REPORT.md
└─ Command lookup → PHASE_C_EXECUTION_SUMMARY.md

Need HELP?
├─ Ports in use? → See "Troubleshooting" section
├─ Can't connect? → See "Health Check URLs" section
└─ Want details? → PHASE_C_COMPLETE_REPORT.md
```

---

## 🔧 One-Click Operations

### Operation 1: START ALL SERVERS
**File**: `START_SERVERS.bat`  
**Action**: Double-click  
**Result**: Two command windows open (backend + frontend)  
**Wait time**: 20-25 seconds  
**Success indicator**: 
```
Backend: 🚀 CampusWay Backend running on port 5003
Frontend: VITE ... ready in XXX ms
```

### Operation 2: VERIFY ALL SERVICES
**File**: `HEALTH_CHECK.bat`  
**Action**: Double-click (after servers are running)  
**Result**: 6 health checks performed  
**Success indicator**: All checks show "OK"

---

## 🌐 Access Points (Once Running)

### Frontend Application
- **Main App**: http://localhost:5175
- **Admin Login**: http://localhost:5175/__cw_admin__/login
- **Status**: Should load React app in browser

### Backend API
- **API Root**: http://localhost:5003/api
- **Health Check**: http://localhost:5003/api/health
- **Settings**: http://localhost:5003/api/settings/public

### Database
- **MongoDB**: Port 27017 (localhost)
- **Database**: campusway
- **Status**: Must already be running

---

## 📝 Manual Startup (If Needed)

### Terminal 1: Backend Server
```batch
cd F:\CampusWay\CampusWay\backend
set PORT=5003
npm run dev
```
Wait for: `🚀 CampusWay Backend running on port 5003`

### Terminal 2: Frontend Server
```batch
cd F:\CampusWay\CampusWay\frontend
npm run dev -- --host 127.0.0.1 --port 5175
```
Wait for: `VITE ... ready in XXX ms`

---

## ⚠️ Troubleshooting Quick Links

### Port Already in Use
```batch
# Check what's using the port
netstat -ano | findstr ":5003"

# Kill process on that port
taskkill /PID [PID_NUMBER] /F
```
See `PHASE_C_COMPLETE_REPORT.md` section 5 for details.

### Dependencies Issue
```batch
cd F:\CampusWay\CampusWay\backend
npm install

cd F:\CampusWay\CampusWay\frontend
npm install
```

### MongoDB Connection Failed
Ensure MongoDB is running on port 27017:
```batch
netstat -ano | findstr ":27017"
```

### Frontend Can't Connect to Backend
1. Verify backend running on 5003
2. Check backend .env has CORS_ORIGIN=http://localhost:5175
3. Check frontend .env has VITE_API_BASE_URL=http://localhost:5003/api

For more help: See `PHASE_C_COMPLETE_REPORT.md` section 5 (Troubleshooting).

---

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────┐
│              BROWSER (http://localhost:5175)        │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │  Frontend Application (React + Vite)         │   │
│  │  - Port: 5175                                │   │
│  │  - Framework: React 19.0.0                   │   │
│  │  - API calls: http://localhost:5003/api      │   │
│  │  - Status: Development mode                  │   │
│  └──────────────────────────────────────────────┘   │
│                       │                             │
│                       │ HTTP/API Calls              │
│                       ▼                             │
└─────────────────────────────────────────────────────┘
                        │
        ┌───────────────┴────────────────┐
        │                                │
        ▼                                ▼
┌──────────────────────────┐    ┌──────────────────────────┐
│   Backend Server (5003)  │    │   MongoDB (27017)        │
│                          │    │                          │
│  - Framework: Express.js │    │  - Database: campusway   │
│  - Language: TypeScript  │    │  - Collections: Multiple │
│  - Port: 5003            │    │  - Status: Must run      │
│  - Dev tool: tsx (watch) │    │  - Config: localhost     │
│  - JWT Auth: Enabled     │    │    connection string:    │
│  - CORS: Configured      │    │    27017                 │
└──────────────────────────┘    └──────────────────────────┘
```

---

## 📋 File Structure in Project Root

```
F:\CampusWay\CampusWay\
├── START_SERVERS.bat                    ⭐ QUICK START
├── HEALTH_CHECK.bat                     ⭐ VERIFY
├── PHASE_C_README.txt                   📖 5-min read
├── PHASE_C_COMPLETE_REPORT.md           📖 15-min read
├── PHASE_C_EXECUTION_SUMMARY.md         📖 Reference
├── PHASE_C_STARTUP_REPORT.md            📖 Reference
├── PHASE_C_INDEX.md                     📖 THIS FILE
│
├── backend/                             🔧 API Server
│   ├── src/server.ts
│   ├── .env                             (configured)
│   └── node_modules/                    (installed)
│
├── frontend/                            🔧 React App
│   ├── src/main.tsx
│   ├── vite.config.ts
│   ├── .env                             (configured)
│   └── node_modules/                    (installed)
│
└── [other project files...]
```

---

## ✅ Verification Checklist

Before reporting the phase complete:

- [ ] Read `PHASE_C_README.txt` (understand what's happening)
- [ ] Double-click `START_SERVERS.bat` (launch both servers)
- [ ] Wait 20-25 seconds (let servers initialize)
- [ ] See both success messages (Backend + Frontend)
- [ ] Double-click `HEALTH_CHECK.bat` (verify all services)
- [ ] All 6 health checks pass
- [ ] Access http://localhost:5175 in browser (React app loads)
- [ ] Access http://localhost:5175/__cw_admin__/login (admin page loads)
- [ ] Backend API accessible at http://localhost:5003/api

---

## 🎓 Learning Path

**New to CampusWay?** Follow this order:

1. **Understand the setup** → Read `PHASE_C_README.txt` (5 min)
2. **Start the servers** → Run `START_SERVERS.bat` (30 sec)
3. **Verify they work** → Run `HEALTH_CHECK.bat` (1 min)
4. **Access the app** → Open http://localhost:5175 (instant)
5. **Learn more** → Read `PHASE_C_COMPLETE_REPORT.md` (15 min)
6. **Troubleshoot issues** → Reference sections in complete report

---

## 🔄 What Happens When Servers Start

### Backend Initialization Sequence (10-15 seconds)
1. Node.js process starts
2. TypeScript files compiled by tsx
3. Express server instantiated
4. Environment variables loaded
5. MongoDB connection established
6. Database indexes verified
7. Default setup checked
8. Cron jobs initialized
9. **Server ready on port 5003** ✅
10. Logs show: `🚀 CampusWay Backend running on port 5003`

### Frontend Initialization Sequence (8-10 seconds)
1. Node.js process starts
2. Vite dev server initialized
3. React dependencies loaded
4. TypeScript components compiled
5. HMR (Hot Module Replacement) enabled
6. **Server ready on port 5175** ✅
7. Logs show: `VITE ... ready in XXX ms`

### Database (Already running, no startup needed)
- MongoDB on port 27017
- Connection pool established
- Indexes verified by backend
- Ready to receive queries

---

## 💡 Pro Tips

**Tip 1**: Keep both terminal windows visible while developing
- Backend shows API logs in real-time
- Frontend shows compilation errors immediately
- Easy to spot issues

**Tip 2**: Use HEALTH_CHECK.bat periodically
- Verify no drift in service availability
- Quick way to validate system state
- Takes ~30 seconds

**Tip 3**: Check logs for errors
- Backend logs: Shows in backend terminal
- Frontend logs: Shows in frontend terminal + browser console (F12)
- Database logs: Check MongoDB startup terminal

**Tip 4**: Keep MongoDB running in a separate window
- Don't close the MongoDB terminal
- It's required for both backend and frontend
- If it crashes, backend loses database access

---

## 🎯 Next Phase (Phase D)

Once Phase C is complete:
1. ✅ Servers running and healthy
2. ✅ All endpoints accessible
3. ✅ Database connected

**Proceed to Phase D**: Full Health Verification and Testing
- Run comprehensive endpoint tests
- Validate authentication flows
- Test database operations
- Generate detailed health report

---

## 📞 Quick Support

**Problem**: "I don't know where to start"
→ Read this file, then run `START_SERVERS.bat`

**Problem**: "Something isn't working"
→ Run `HEALTH_CHECK.bat` to see what's broken

**Problem**: "I need help with a specific issue"
→ Go to `PHASE_C_COMPLETE_REPORT.md` section 5 (Troubleshooting)

**Problem**: "I need complete details"
→ Read `PHASE_C_COMPLETE_REPORT.md` (all answers there)

---

## 📊 Phase Progress

```
Phase A: Environment Setup     ✅ COMPLETE
Phase B: Build & Validation    ✅ COMPLETE
Phase C: Runtime Startup       🔄 CURRENT
  ├─ Documentation generation  ✅ COMPLETE
  ├─ Configuration verification ✅ COMPLETE
  └─ Ready for implementation   ✅ READY
Phase D: Health Checks         ⏭️ NEXT
Phase E: Integration Tests     ⏭️ NEXT
Phase F: Deployment            ⏭️ NEXT
```

---

## 📖 Document Summary Table

| Document | Purpose | Length | Audience |
|----------|---------|--------|----------|
| PHASE_C_README.txt | Quick start guide | 8 KB | Everyone |
| PHASE_C_COMPLETE_REPORT.md | Full reference | 15 KB | Developers |
| PHASE_C_STARTUP_REPORT.md | Configuration details | 6 KB | Admins |
| PHASE_C_EXECUTION_SUMMARY.md | Procedures & troubleshooting | 6 KB | Troubleshooters |
| PHASE_C_INDEX.md | Navigation guide | 5 KB | First-time users |

---

## ✨ Summary

**Status**: ✅ Phase C Ready for Implementation

**What to do now**:
1. Double-click `START_SERVERS.bat`
2. Wait for success messages
3. Double-click `HEALTH_CHECK.bat`
4. Verify all checks pass

**Time to completion**: ~5 minutes

**Result**: Both servers running, fully operational, ready for Phase D

---

**Last Updated**: March 11, 2025  
**Status**: READY FOR PRODUCTION STARTUP
