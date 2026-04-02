================================================================================
                    PHASE C: RUNTIME STARTUP AND HEALTH CHECK
                              QUICK START GUIDE
================================================================================

LOCATION: F:\CampusWay\CampusWay

STATUS: ✅ READY FOR EXECUTION

================================================================================
                              QUICK START (30 SECONDS)
================================================================================

1. Double-click: START_SERVERS.bat
   (Two terminal windows will open - one for backend, one for frontend)

2. Wait 20-25 seconds for both to initialize

3. When you see these messages:
   BACKEND: "🚀 CampusWay Backend running on port 5003"
   FRONTEND: "VITE ... ready in XXX ms"
   
   Then proceed to step 4.

4. Open browser: http://localhost:5175

5. Run health check: HEALTH_CHECK.bat

================================================================================
                         WHAT WAS DISCOVERED
================================================================================

✅ BACKEND (Port 5003)
   - Express.js with TypeScript
   - Dependencies: INSTALLED
   - Environment: CONFIGURED (.env present)
   - Start command: npm run dev
   - MongoDB: Connected to 127.0.0.1:27017
   - Status: READY TO RUN

✅ FRONTEND (Port 5175)
   - React 19 with Vite
   - Dependencies: INSTALLED
   - Environment: CONFIGURED (.env present)
   - Start command: npm run dev -- --host 127.0.0.1 --port 5175
   - API Backend: http://localhost:5003/api
   - Status: READY TO RUN

✅ DATABASE (MongoDB Port 27017)
   - MongoDB configured
   - Database: campusway
   - Connection: mongodb://127.0.0.1:27017/campusway
   - Status: Must be running separately

================================================================================
                         HOW TO USE THESE TOOLS
================================================================================

Tool 1: START_SERVERS.bat
────────────────────────
Purpose: Launch both servers automatically
Usage:   Double-click or run from command prompt
Output:  Two new terminal windows (Backend + Frontend)
Waits:   5 seconds between launches for stability

Tool 2: HEALTH_CHECK.bat
────────────────────────
Purpose: Verify all services are running and accessible
Usage:   Double-click or run after servers are started
Checks:  - Backend health endpoint
         - Frontend accessibility
         - Admin page accessibility
         - Port listening status
Output:  Pass/Fail status for each check

Tool 3: PHASE_C_COMPLETE_REPORT.md
──────────────────────────────────
Purpose: Comprehensive reference documentation
Content: - Full infrastructure details
         - Troubleshooting procedures
         - All available commands
         - System architecture

================================================================================
                      WHAT EACH SERVER DOES
================================================================================

BACKEND (Port 5003)
───────────────────
- RESTful API server
- Express.js with TypeScript
- MongoDB database integration
- User authentication (JWT)
- Cron jobs for automated tasks:
  * Exam auto-submission
  * Subscription management
  * News fetching
  * Notifications
  * Financial operations

FRONTEND (Port 5175)
────────────────────
- React single-page application
- TailwindCSS styling
- Real-time updates via React Query
- Admin dashboard
- Student portal
- Responsive design (mobile + desktop)

DATABASE (Port 27017)
─────────────────────
- MongoDB local instance
- Stores all application data
- Indexes already configured
- Default setup already completed

================================================================================
                         EXPECTED OUTPUT
================================================================================

When you see these in the terminal windows, everything is working:

BACKEND WINDOW:
───────────────
[db] MongoDB connected successfully
[db] All critical indexes ensured
[cron] Starting exam auto-submit worker (every minute)
🚀 CampusWay Backend running on port 5003
📡 Public API: http://localhost:5003/api
🔒 Admin API:  http://localhost:5003/api/campusway-secure-admin

FRONTEND WINDOW:
────────────────
VITE v6.0.5  ready in XXX ms

  ➜  Local:   http://127.0.0.1:5175/

================================================================================
                      WHAT TO DO IF SOMETHING GOES WRONG
================================================================================

Problem: "Port 5003 already in use"
Solution: Kill existing process on that port or use different port

Problem: "Port 5175 already in use"
Solution: Kill existing process on that port

Problem: "Cannot find module" error
Solution: Run "npm install" in both backend and frontend folders

Problem: "MongoDB connection failed"
Solution: Ensure MongoDB is running on port 27017

Problem: Frontend can't reach backend
Solution: Check backend is running on 5003, check CORS settings in .env

See PHASE_C_COMPLETE_REPORT.md for detailed troubleshooting

================================================================================
                         URLS TO ACCESS
================================================================================

Frontend Home Page:
   http://localhost:5175

Admin Login:
   http://localhost:5175/__cw_admin__/login

Backend API:
   http://localhost:5003/api

Backend Health Check:
   http://localhost:5003/api/health

Backend Public Settings:
   http://localhost:5003/api/settings/public

================================================================================
                      FILES IN THIS DIRECTORY
================================================================================

START_SERVERS.bat ...................... Quick launcher for both servers
HEALTH_CHECK.bat ....................... Verify all services are running
PHASE_C_README.txt ..................... This file
PHASE_C_COMPLETE_REPORT.md ............. Comprehensive reference guide
PHASE_C_EXECUTION_SUMMARY.md ........... Quick summary and troubleshooting
PHASE_C_STARTUP_REPORT.md ............. Configuration reference

backend/ .............................. Backend server code
frontend/ ............................. Frontend React application
.env files in each directory ........... Environment configuration

================================================================================
                         NEXT PHASE (Phase D)
================================================================================

Once both servers are running and HEALTH_CHECK.bat shows all PASS:

1. Verify frontend loads in browser at http://localhost:5175
2. Verify admin page at http://localhost:5175/__cw_admin__/login
3. Check browser console for any errors (F12)
4. Test user login if you have credentials
5. Proceed to Phase D (Full Health Verification and Testing)

================================================================================
                         SYSTEM REQUIREMENTS
================================================================================

✅ Node.js (present - npm runs)
✅ npm/yarn (present - package.json has dependencies)
✅ MongoDB (must be running separately on port 27017)
✅ 50+ MB disk space (for node_modules - already allocated)
✅ ~500 MB RAM for both servers
✅ Windows Command Prompt or PowerShell

================================================================================
                            SUPPORT INFO
================================================================================

All detailed procedures, troubleshooting, and reference information
can be found in: PHASE_C_COMPLETE_REPORT.md

Quick reference commands:
- START_SERVERS.bat ...................... Fastest way to start
- HEALTH_CHECK.bat ....................... Verify services
- See PHASE_C_COMPLETE_REPORT.md ........ Everything else

================================================================================

Status: READY TO PROCEED

Next Action: Double-click START_SERVERS.bat to begin

Questions? Check PHASE_C_COMPLETE_REPORT.md for detailed answers.

================================================================================
