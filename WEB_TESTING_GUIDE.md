# CampusWay Local Web Testing Guide

**Date**: 2026-04-01  
**Purpose**: Test the application locally in a web browser

---

## Quick Start - Local Testing

### Step 1: Start Backend Server

```cmd
cd F:\CampusWay\CampusWay\backend
npm run dev
```

**Expected output**:
```
Server running on http://localhost:5003
MongoDB connected successfully
```

### Step 2: Start Frontend Server (New Terminal)

```cmd
cd F:\CampusWay\CampusWay\frontend
npm run dev
```

**Expected output**:
```
  VITE v6.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5175/
  ➜  Network: http://127.0.0.1:5175/
```

### Step 3: Open in Browser

Open your browser and navigate to:
- **Frontend**: http://localhost:5175
- **Backend Health**: http://localhost:5003/api/health

---

## Manual Testing Checklist

### ✅ Public Site (http://localhost:5175)

Test these pages:
- [ ] **Homepage** (/) - Hero, CTAs, featured universities
- [ ] **Universities** (/universities) - University listing
- [ ] **News** (/news) - News articles
- [ ] **Subscription Plans** (/subscription-plans) - Pricing tiers
- [ ] **Services** (/services) - Service offerings
- [ ] **Exam Portal** (/exam-portal) - Exam browsing
- [ ] **Resources** (/resources) - Educational resources
- [ ] **Contact** (/contact) - Contact form

### ✅ Authentication

- [ ] **Student Login** (/login) - Firebase auth works
- [ ] **Chairman Login** (/chairman/login) - Firebase auth works
- [ ] **Admin Login** (/__cw_admin__/login) - Firebase auth works

### ✅ Admin Panel (/__cw_admin__)

After logging in as admin:
- [ ] **Dashboard** - Loads without errors
- [ ] **News Management** - Create/edit/delete news
- [ ] **University Management** - Manage universities
- [ ] **Exam Management** - Create/manage exams
- [ ] **User Management** - View/edit users
- [ ] **Settings** - Security Center, team access

### ✅ Student Portal

After logging in as student:
- [ ] **Dashboard** - Profile cards load
- [ ] **Profile** - View/edit profile
- [ ] **Exams** - Browse available exams
- [ ] **Results** - View exam results (if any)
- [ ] **Subscription** - View subscription status

### ✅ Theme Testing

- [ ] Switch to **Dark Mode** - UI adapts correctly
- [ ] Switch to **Light Mode** - UI adapts correctly
- [ ] Theme persists after page reload

### ✅ Responsive Testing

Test at different viewport sizes:
- [ ] **Mobile** (360×640) - DevTools mobile view
- [ ] **Tablet** (768×1024) - DevTools tablet view
- [ ] **Desktop** (1280×900+) - Full screen

---

## Browser DevTools Checks

### Console Errors

Open DevTools (F12) → Console tab:
- [ ] **No critical errors** (red)
- [ ] **No authentication failures**
- [ ] **No CORS errors**
- [ ] **No 404/500 API errors**

### Network Tab

- [ ] API calls to http://localhost:5003/api/* succeed
- [ ] All requests return 200 OK (except expected 401/403)
- [ ] No failed resource loads

### Application Tab

- [ ] **Local Storage** - Firebase auth token present
- [ ] **Session Storage** - Theme preference stored
- [ ] **Cookies** - Session cookies set (if any)

---

## Common Issues & Solutions

### Backend Won't Start

**Error**: `MongoDB connection failed`
- **Fix**: Ensure MongoDB is running
- Check `MONGO_URI` in backend/.env

**Error**: `Port 5003 already in use`
- **Fix**: Stop other processes using port 5003
- Or change PORT in backend/.env

### Frontend Can't Connect to Backend

**Error**: `Network Error` or `CORS Error`
- **Fix**: Ensure backend is running on port 5003
- Check CORS configuration in backend/src/server.ts
- Verify VITE_API_BASE_URL in frontend/.env

### Authentication Not Working

**Error**: `Firebase auth error`
- **Fix**: Check Firebase configuration in frontend/.env
- Verify FIREBASE_PROJECT_ID, FIREBASE_API_KEY

### Theme Not Switching

- **Fix**: Clear browser cache
- Check theme toggle implementation
- Verify Tailwind dark mode configuration

---

## Automated Browser Testing

If you prefer automated testing instead of manual:

### Run Playwright E2E Tests

```cmd
cd F:\CampusWay\CampusWay\frontend

# Start servers and run all smoke tests (40-50 min)
npm run e2e:smoke

# Or run specific test file
npx playwright test e2e/public-smoke.spec.ts

# Run with visible browser (headed mode)
npx playwright test --headed

# Run and debug
npx playwright test --debug
```

### View Test Results

After tests complete:
```cmd
# Open HTML report
npx playwright show-report
```

---

## Performance Testing

### Check Page Load Times

1. Open DevTools → Network tab
2. Reload page
3. Check:
   - [ ] DOMContentLoaded < 2s
   - [ ] Page fully loaded < 5s
   - [ ] API responses < 500ms

### Check Memory Usage

1. Open DevTools → Performance tab
2. Record page interaction
3. Check:
   - [ ] No memory leaks
   - [ ] Smooth 60fps scrolling
   - [ ] No jank during interactions

---

## Test Data

### Test Admin Account
- Email: (get from backend/INITIAL_ACCESS_INFO.txt)
- Password: (get from backend/INITIAL_ACCESS_INFO.txt)

### Test Student Account
- Email: e2e_student_desktop@campusway.local
- Password: E2E_Student#12345
- (Created by e2e:prepare script)

---

## Next Steps After Local Testing

Once local testing passes:

1. **Fix any issues found**
2. **Document any bugs**
3. **Deploy to staging** (Azure/Firebase)
4. **Test staging environment**
5. **Deploy to production**

---

## Quick Commands Reference

```cmd
# Start both servers (use two terminals)
cd F:\CampusWay\CampusWay\backend && npm run dev
cd F:\CampusWay\CampusWay\frontend && npm run dev

# Run E2E tests
cd F:\CampusWay\CampusWay\frontend && npm run e2e:smoke

# Build for production
cd F:\CampusWay\CampusWay\frontend && npm run build
cd F:\CampusWay\CampusWay\backend && npm run build

# Deploy
cd F:\CampusWay\CampusWay && azd up
cd F:\CampusWay\CampusWay\frontend && firebase deploy
```

---

**Happy Testing! 🧪**
