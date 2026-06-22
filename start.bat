@echo off
setlocal enabledelayedexpansion
title CampusWay Launcher
chcp 65001 >nul 2>&1
color 0A

:: Resolve script directory (always absolute, trailing backslash)
set "ROOT=%~dp0"
set "BACKEND_DIR=%ROOT%backend"
set "FRONTEND_DIR=%ROOT%frontend"

echo.
echo ==========================================
echo        CampusWay Project Launcher
echo ==========================================
echo.

:: ─── STEP 1: CHECK REQUIRED TOOLS ────────────────────────────────────────────
echo [STEP 1/5] Checking required tools...
echo.

set "MISSING_NODE="
set "NEEDS_UPDATE="

:: --- Node.js ---
where node >nul 2>&1
if !errorlevel! neq 0 (
    echo   [X] Node.js    - NOT FOUND
    set "MISSING_NODE=1"
) else (
    for /f "tokens=*" %%v in ('node --version 2^>nul') do set "NODE_VER=%%v"
    for /f "tokens=1 delims=." %%m in ("!NODE_VER:~1!") do set "NODE_MAJOR=%%m"
    if !NODE_MAJOR! LSS 18 (
        echo   [!] Node.js    - !NODE_VER! ^(needs v18+^)
        set "NEEDS_UPDATE=1"
    ) else (
        echo   [OK] Node.js   - !NODE_VER!
    )
)

:: --- npm ---
where npm >nul 2>&1
if !errorlevel! neq 0 (
    echo   [X] npm        - NOT FOUND
    set "MISSING_NODE=1"
) else (
    for /f "tokens=*" %%v in ('npm --version 2^>nul') do set "NPM_VER=%%v"
    echo   [OK] npm       - v!NPM_VER!
)

:: --- MongoDB (Atlas used — local check is informational only) ---
netstat -ano 2>nul | findstr ":27017 " >nul
if !errorlevel! equ 0 (
    echo   [OK] MongoDB   - Local instance running on port 27017
) else (
    echo   [i] MongoDB    - No local instance ^(using Atlas cloud - OK^)
)

:: --- Git (optional) ---
where git >nul 2>&1
if !errorlevel! neq 0 (
    echo   [i] Git        - Not found ^(optional^)
) else (
    for /f "tokens=1,2,3" %%a in ('git --version 2^>nul') do set "GIT_VER=%%a %%b %%c"
    echo   [OK] Git       - !GIT_VER!
)

echo.

:: ─── HANDLE MISSING CRITICAL TOOLS ───────────────────────────────────────────
if defined MISSING_NODE (
    echo ==========================================
    echo  Node.js is required but NOT installed!
    echo ==========================================
    echo.
    echo  Download and install Node.js v18+ from:
    echo    https://nodejs.org/en/download
    echo.
    echo  After installing, re-run this script.
    echo.
    pause
    exit /b 1
)

:: ─── STEP 2: BACKEND .env CHECK ───────────────────────────────────────────────
echo [STEP 2/5] Checking configuration...
echo.

if exist "!BACKEND_DIR!\.env" (
    echo   [OK] Backend   - .env found
) else (
    echo   [!] Backend    - .env missing!
    if exist "!BACKEND_DIR!\.env.example" (
        echo        Copying .env.example to .env...
        copy "!BACKEND_DIR!\.env.example" "!BACKEND_DIR!\.env" >nul
        echo   [OK] Backend   - .env created from example ^(edit it before using^)
    ) else (
        echo   [X] No .env.example found either. Backend may fail.
    )
)

if exist "!FRONTEND_DIR!\.env" (
    echo   [OK] Frontend  - .env found
) else (
    echo   [!] Frontend   - .env missing!
    if exist "!FRONTEND_DIR!\.env.example" (
        echo        Copying .env.example to .env...
        copy "!FRONTEND_DIR!\.env.example" "!FRONTEND_DIR!\.env" >nul
        echo   [OK] Frontend  - .env created from example
    )
)

echo.

:: ─── STEP 3: DEPENDENCY OPTIONS ──────────────────────────────────────────────
echo [STEP 3/5] Dependency setup...
echo.

if defined NEEDS_UPDATE (
    echo   [!] Node.js version is below v18. Consider upgrading.
    echo.
)

echo   Choose how to proceed:
echo.
echo   [1] Fresh install  - Delete node_modules ^& reinstall (fixes broken installs)
echo   [2] Update         - Run npm install to sync missing/changed packages
echo   [3] Skip           - Use existing node_modules as-is (fastest)
echo.
choice /c 123 /m "Your choice [1/2/3]"
set "INSTALL_CHOICE=!errorlevel!"
echo.

:: ─── STEP 4: INSTALL / UPDATE DEPENDENCIES ───────────────────────────────────
echo [STEP 4/5] Preparing dependencies...
echo.

call :setup_deps "!BACKEND_DIR!" "Backend"
if !errorlevel! neq 0 goto :install_error

call :setup_deps "!FRONTEND_DIR!" "Frontend"
if !errorlevel! neq 0 goto :install_error

echo.
goto :start_servers

:: ─── SUB: setup_deps <dir> <label> ──────────────────────────────────────────
:setup_deps
set "TARGET_DIR=%~1"
set "LABEL=%~2"

if "!INSTALL_CHOICE!"=="1" (
    if exist "!TARGET_DIR!\node_modules" (
        echo   [!LABEL!] Removing old node_modules...
        rmdir /s /q "!TARGET_DIR!\node_modules" 2>nul
    )
    if exist "!TARGET_DIR!\package-lock.json" del /q "!TARGET_DIR!\package-lock.json" 2>nul
)

set "DO_INSTALL=0"
if "!INSTALL_CHOICE!"=="1" set "DO_INSTALL=1"
if "!INSTALL_CHOICE!"=="2" set "DO_INSTALL=1"
if not exist "!TARGET_DIR!\node_modules" set "DO_INSTALL=1"

if "!DO_INSTALL!"=="1" (
    if "!INSTALL_CHOICE!"=="3" (
        echo   [!LABEL!] node_modules missing, must install...
    ) else if "!INSTALL_CHOICE!"=="1" (
        echo   [!LABEL!] Running fresh npm install...
    ) else (
        echo   [!LABEL!] Updating packages...
    )
    pushd "!TARGET_DIR!"
    call npm install
    set "NPM_ERR=!errorlevel!"
    popd
    if !NPM_ERR! neq 0 (
        echo   [ERROR] !LABEL! npm install failed!
        exit /b 1
    )
    echo   [OK] !LABEL! dependencies ready.
) else (
    echo   [!LABEL!] Using existing node_modules ^(skipped^).
)
exit /b 0

:install_error
echo.
echo ==========================================
echo   Dependency install failed!
echo   Check internet connection and try again.
echo ==========================================
pause
exit /b 1

:: ─── STEP 5: START SERVERS ───────────────────────────────────────────────────
:start_servers
echo [STEP 5/5] Starting CampusWay servers...
echo.

:: Kill stale processes on project ports
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr ":5003 " ^| findstr "LISTENING"') do (
    echo   [INFO] Freeing port 5003 ^(PID %%p^)...
    taskkill /PID %%p /F >nul 2>&1
)
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr ":5175 " ^| findstr "LISTENING"') do (
    echo   [INFO] Freeing port 5175 ^(PID %%p^)...
    taskkill /PID %%p /F >nul 2>&1
)

:: Start Backend — /D sets the working directory cleanly (no nested-quote issues)
echo   Starting Backend  (port 5003)...
start "CampusWay Backend" /D "%BACKEND_DIR%" cmd /k "npm run dev"

timeout /t 3 /nobreak >nul

:: Start Frontend
echo   Starting Frontend (port 5175)...
start "CampusWay Frontend" /D "%FRONTEND_DIR%" cmd /k "npm run dev"

echo.
echo   Waiting for servers to start up...
timeout /t 8 /nobreak >nul

:: Open browser
start "" "http://localhost:5175"

echo.
echo ==========================================
echo   CampusWay is running!
echo ==========================================
echo.
echo   Frontend   :  http://localhost:5175
echo   Backend API:  http://localhost:5003/api
echo   Admin Panel:  http://localhost:5175/campusway-secure-admin
echo.
echo   Close the Backend / Frontend windows to stop servers.
echo ==========================================
echo.
pause
