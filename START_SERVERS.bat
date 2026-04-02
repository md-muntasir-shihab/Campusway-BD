@echo off
setlocal enabledelayedexpansion

echo.
echo ============================================
echo   CampusWay Local Development Server Launcher
echo ============================================
echo.

REM Get the directory where this script is located
set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%ROOT_DIR%backend"
set "FRONTEND_DIR=%ROOT_DIR%frontend"

echo Starting Backend Server on port 5003...
cd /d "%BACKEND_DIR%"
start "CampusWay Backend - Port 5003" cmd /k "set PORT=5003 && npm run dev"

echo Waiting 5 seconds for backend to initialize...
timeout /t 5 /nobreak

echo Starting Frontend Server on port 5175...
cd /d "%FRONTEND_DIR%"
start "CampusWay Frontend - Port 5175" cmd /k "npm run dev -- --host 127.0.0.1 --port 5175"

echo.
echo ============================================
echo Servers launching in separate windows...
echo.
echo Frontend:   http://localhost:5175
echo Backend:    http://localhost:5003/api
echo Admin:      http://localhost:5175/__cw_admin__/login
echo.
echo Press any key to return to this window...
echo ============================================
echo.
pause
