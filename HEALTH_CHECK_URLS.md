# CampusWay Health Check URLs and Testing Reference

## Quick Access URLs (After Servers Start)

### Frontend
- **Main Application**: http://localhost:5175
- **Admin Dashboard**: http://localhost:5175/__cw_admin__/login
- **Home Page**: http://localhost:5175/
- **Student Portal**: http://localhost:5175/student (varies)
- **Universities**: http://localhost:5175/universities
- **News**: http://localhost:5175/news
- **Resources**: http://localhost:5175/resources
- **Exams**: http://localhost:5175/exams (varies)

### Backend API (Public)
- **API Root**: http://localhost:5003/api
- **Health Check**: http://localhost:5003/api/health
- **Settings (Public)**: http://localhost:5003/api/settings/public
- **Auth Me**: http://localhost:5003/api/auth/me (requires login)
- **Home**: http://localhost:5003/api/home/stream (requires login)

### Backend API (Admin - Secure)
- **Admin Root**: http://localhost:5003/api/campusway-secure-admin
- **Finance Center**: http://localhost:5003/api/campusway-secure-admin/fc
- **Team Members**: http://localhost:5003/api/admin/team/members
- **Team Roles**: http://localhost:5003/api/admin/team/roles

---

## Automated Health Check Script

Run: `HEALTH_CHECK.bat`

This checks:
1. ✅ Backend Health Endpoint (GET /api/health)
2. ✅ Backend API Status (GET /api/settings/public)
3. ✅ Frontend HTTP Access (GET /)
4. ✅ Admin Login Page (GET /__cw_admin__/login)
5. ✅ Port 5003 Listening
6. ✅ Port 5175 Listening

---

## Manual Testing Commands

### Using cURL (if installed)

**Backend Health**:
```bash
curl http://localhost:5003/api/health
```

**Frontend Status**:
```bash
curl http://localhost:5175
```

**Backend Settings**:
```bash
curl http://localhost:5003/api/settings/public
```

### Using PowerShell

**Backend Health**:
```powershell
Invoke-WebRequest -Uri "http://localhost:5003/api/health" -UseBasicParsing
```

**Frontend Status**:
```powershell
Invoke-WebRequest -Uri "http://localhost:5175" -UseBasicParsing
```

### Using cmd (Windows)

**Check port status**:
```batch
netstat -ano | findstr ":5003"
netstat -ano | findstr ":5175"
netstat -ano | findstr ":27017"
```

---

## Expected HTTP Status Codes

### Successful Responses
- **200 OK**: Request successful, content returned
- **304 Not Modified**: Cached content (still good)
- **302 Redirect**: Following auth redirects (normal)

### Error Responses (Diagnose)
- **Connection refused**: Service not running
- **404 Not Found**: Endpoint doesn't exist
- **503 Service Unavailable**: Service is overloaded
- **Timeout**: Server taking too long to respond

---

## Browser Developer Tools (F12)

### To check frontend health:
1. Open http://localhost:5175
2. Press F12 (Developer Tools)
3. Go to Console tab
4. Look for red errors (there should be none)
5. Go to Network tab
6. Check that API calls to localhost:5003 are successful
7. Status should be 200 or 304 (not 404 or 5xx)

### Common Issues to Look For
- CORS errors: Backend CORS not configured correctly
- 404 errors: Endpoint doesn't exist on backend
- Timeout errors: Backend not responding in time
- Mixed content warning: HTTPS/HTTP mismatch

---

## Authentication Testing (Optional)

### Default Credentials
Check `INITIAL_ACCESS_INFO.txt` in backend directory for first-time credentials

### Test Flow
1. Go to http://localhost:5175/__cw_admin__/login
2. Enter credentials
3. Should redirect to http://localhost:5175/admin (or similar)
4. Frontend should make API calls to backend
5. Backend responds with user data

---

## Database Connection Test

### Check MongoDB Running
```batch
netstat -ano | findstr ":27017"
```

Should show active listening connection

### If MongoDB Not Running
```batch
"C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe" --bind_ip 127.0.0.1 --port 27017
```

### Backend Database Connection
Monitor backend logs for:
```
[db] MongoDB connected successfully
[db] All critical indexes ensured
```

---

## Performance Baseline

### Expected Response Times
- **Frontend page load**: 2-5 seconds (first time, slower)
- **API health check**: <100ms
- **Settings endpoint**: <200ms
- **Home stream**: <500ms (depends on data)

### Expected Resource Usage
- **Backend**: 150-200 MB RAM, 5-10% CPU
- **Frontend**: 200-300 MB RAM, 5-10% CPU
- **MongoDB**: 50-100 MB RAM (varies)

---

## Continuous Monitoring

### Keep Running While Developing
```bash
# Terminal 1: Watch backend logs
cd backend && npm run dev

# Terminal 2: Watch frontend build
cd frontend && npm run dev

# Terminal 3 (optional): Watch MongoDB
# Ensure mongod.exe is running separately
```

### Real-time Health Checks
Run HEALTH_CHECK.bat periodically to ensure:
- No port conflicts
- Services still responsive
- No silent failures

---

## Endpoint Categories

### Public Endpoints (No Auth)
- /api/health
- /api/settings/public
- /api/universities (browsing)
- /api/news (reading)
- /api/contact (form submission)

### Authenticated Endpoints (Require Login)
- /api/auth/me
- /api/home/stream
- /api/exams (viewing, taking)
- /api/profile
- /api/subscription (user's subscriptions)

### Admin Endpoints (Require Admin Role)
- /api/campusway-secure-admin/* (all admin APIs)
- /api/admin/* (some admin functionality)

---

## Service Dependency Chain

```
Frontend (5175)
    ↓ (HTTP calls)
Backend (5003)
    ↓ (Database queries)
MongoDB (27017)
    ↓
    Data Storage
```

If any level fails:
- Level 1 fails: Frontend doesn't load
- Level 2 fails: Frontend loads but can't fetch data
- Level 3 fails: Backend runs but can't save data

---

## Quick Diagnostic Flowchart

```
Is Frontend Loading?
├─ YES → Go to step 2
└─ NO → Check port 5175 is listening
        netstat -ano | findstr ":5175"

Is Backend Responding?
├─ YES → Go to step 3
└─ NO → Check port 5003 is listening
        netstat -ano | findstr ":5003"

Can Backend Reach Database?
├─ YES → System is operational ✅
└─ NO → Check MongoDB on port 27017
        netstat -ano | findstr ":27017"
```

---

## Testing Checklist

- [ ] Frontend loads at http://localhost:5175
- [ ] Browser console has no red errors (F12)
- [ ] Admin page loads at http://localhost:5175/__cw_admin__/login
- [ ] API responds to GET http://localhost:5003/api/health
- [ ] Port 5003 shows LISTENING in netstat
- [ ] Port 5175 shows LISTENING in netstat
- [ ] Port 27017 shows LISTENING in netstat
- [ ] Backend logs show "running on port 5003"
- [ ] Frontend logs show "VITE ready"
- [ ] HEALTH_CHECK.bat shows all 6 checks passing
- [ ] Can access at least one API endpoint
- [ ] No connection timeouts
- [ ] No CORS errors in browser console

---

## Next Phase After Health Check

Once all URLs are accessible and responding correctly:
1. Proceed to Phase D (Full Health Verification)
2. Run comprehensive endpoint tests
3. Validate authentication flows
4. Test database operations
5. Generate health report

---

**Last Updated**: March 11, 2025
**URLs Valid After**: Both servers started
**Health Check Duration**: ~1 minute per check
**Refresh Rate**: Check periodically while developing
