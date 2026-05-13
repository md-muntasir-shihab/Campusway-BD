@echo off
title CampusWay Launcher
echo ==========================================
echo    CampusWay Local Server Starting...
echo ==========================================
echo.

:: Check MongoDB
echo [1/4] Checking MongoDB...
netstat -ano 2>nul | findstr ":27017 " >nul
if %errorlevel% neq 0 (
    echo [!] MongoDB is not running on port 27017.
    echo     Please start MongoDB first (e.g., run mongod or Docker).
    echo.
    pause
    exit /b 1
)
echo   [OK] MongoDB is running.
echo.

:: Install backend deps if needed
echo [2/4] Checking backend dependencies...
if not exist "backend\node_modules" (
    echo   Installing backend dependencies...
    cd backend
    call npm install
    cd ..
)
echo   [OK] Backend dependencies ready.
echo.

:: Install frontend deps if needed
echo [3/4] Checking frontend dependencies...
if not exist "frontend\node_modules" (
    echo   Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
)
echo   [OK] Frontend dependencies ready.
echo.

:: Start backend
echo [4/4] Starting servers...
echo.
echo   Starting backend (port 5003)...
start "CampusWay Backend" cmd /c "title CampusWay Backend && cd /d "%~dp0backend" && npm run dev"

timeout /t 10 /nobreak >nul

echo   Starting frontend (port 5175)...
start "CampusWay Frontend" cmd /c "title CampusWay Frontend && cd /d "%~dp0frontend" && npm run dev"

echo.
echo ==========================================
echo   CampusWay is starting up!
echo ==========================================
echo.
echo   Frontend   : http://localhost:5175
echo   Backend API: http://localhost:5003/api
echo   Admin      : http://localhost:5175/campusway-secure-admin
echo.
echo   Close this window to stop the servers.
echo ==========================================
echo.

start http://localhost:5175
