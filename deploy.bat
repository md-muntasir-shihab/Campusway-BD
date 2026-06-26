@echo off
color 0A
echo ==================================================
echo     CampusWay Automated Deployment Script
echo ==================================================
echo.

:: Get commit message from user
set /p commitMsg="Enter commit message (or press Enter for default 'Auto deploy update'): "
if "%commitMsg%"=="" set commitMsg=Auto deploy update

echo.
echo [1/4] Staging and pushing changes to GitHub...
git add .
git commit -m "%commitMsg%"
git push origin main
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Failed to push to GitHub. Please check your connection or resolve conflicts.
    pause
    exit /b %errorlevel%
)

echo.
echo [2/4] Changing to frontend directory...
cd frontend
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Could not find the 'frontend' directory.
    pause
    exit /b %errorlevel%
)

echo.
echo [3/4] Building the React/Vite application...
call npm run build
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Build failed! Check the errors above.
    cd ..
    pause
    exit /b %errorlevel%
)

echo.
echo [4/4] Deploying to Firebase Hosting...
call npx firebase deploy --only hosting
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Firebase deployment failed! Make sure you are logged in.
    cd ..
    pause
    exit /b %errorlevel%
)

echo.
color 0A
echo ==================================================
echo   Deployment Completed Successfully!
echo   Your changes are now live at:
echo   https://campuswaybd.web.app/
echo ==================================================
cd ..
pause
