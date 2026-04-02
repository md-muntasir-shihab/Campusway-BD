@echo off
setlocal enabledelayedexpansion

echo.
echo ============================================
echo   CampusWay Health Check Utility
echo ============================================
echo.

set "BACKEND_URL=http://localhost:5003"
set "FRONTEND_URL=http://localhost:5175"
set "ADMIN_URL=http://localhost:5175/__cw_admin__/login"

echo [%date% %time%] Starting health checks...
echo.

echo 1. Checking Backend Health Endpoint...
echo    Testing: %BACKEND_URL%/api/health
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$result = $null; try { $response = Invoke-WebRequest -Uri '%BACKEND_URL%/api/health' -UseBasicParsing -TimeoutSec 5; $result = 'OK (HTTP ' + $response.StatusCode + ')' } catch { $result = 'FAILED: ' + $_.Exception.Message }; Write-Host '    Result: ' $result"

echo.
echo 2. Checking Backend API Status...
echo    Testing: %BACKEND_URL%/api/settings/public
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$result = $null; try { $response = Invoke-WebRequest -Uri '%BACKEND_URL%/api/settings/public' -UseBasicParsing -TimeoutSec 5; $result = 'OK (HTTP ' + $response.StatusCode + ')' } catch { $result = 'FAILED: ' + $_.Exception.Message }; Write-Host '    Result: ' $result"

echo.
echo 3. Checking Frontend Access...
echo    Testing: %FRONTEND_URL%
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$result = $null; try { $response = Invoke-WebRequest -Uri '%FRONTEND_URL%' -UseBasicParsing -TimeoutSec 5; $result = 'OK (HTTP ' + $response.StatusCode + ')' } catch { $result = 'FAILED: ' + $_.Exception.Message }; Write-Host '    Result: ' $result"

echo.
echo 4. Checking Admin Login Page...
echo    Testing: %ADMIN_URL%
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$result = $null; try { $response = Invoke-WebRequest -Uri '%ADMIN_URL%' -UseBasicParsing -TimeoutSec 5; $result = 'OK (HTTP ' + $response.StatusCode + ')' } catch { $result = 'FAILED: ' + $_.Exception.Message }; Write-Host '    Result: ' $result"

echo.
echo 5. Checking Port Status (Port 5003)...
echo    Looking for Backend listening on port 5003...
netstat -ano | findstr ":5003" > nul
if !errorlevel! equ 0 (
    echo    Result: Port 5003 is LISTENING
) else (
    echo    Result: Port 5003 is NOT LISTENING
)

echo.
echo 6. Checking Port Status (Port 5175)...
echo    Looking for Frontend listening on port 5175...
netstat -ano | findstr ":5175" > nul
if !errorlevel! equ 0 (
    echo    Result: Port 5175 is LISTENING
) else (
    echo    Result: Port 5175 is NOT LISTENING
)

echo.
echo ============================================
echo Health check complete - [%date% %time%]
echo ============================================
echo.
pause
