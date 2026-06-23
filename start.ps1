# ============================================================
#  CampusWay Project Launcher (PowerShell)
#  Run:  Right-click -> "Run with PowerShell"
#  Or:   powershell -ExecutionPolicy Bypass -File .\start.ps1
# ============================================================

$ErrorActionPreference = 'Stop'

# --- Paths (always relative to this script) ---
$Root        = $PSScriptRoot
$BackendDir  = Join-Path $Root 'backend'
$FrontendDir = Join-Path $Root 'frontend'

function Write-Head($text) {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "   $text" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
}

function Test-Command($name) {
    return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

function Test-PortListening($port) {
    try {
        $c = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue
        return [bool]$c
    } catch {
        $line = netstat -ano 2>$null | Select-String ":$port\s"
        return [bool]$line
    }
}

function Wait-ForHttp($url, $label, $timeoutSeconds) {
    Write-Host "  Waiting for $label at $url" -ForegroundColor DarkGray
    $deadline = (Get-Date).AddSeconds($timeoutSeconds)
    $lastError = ''

    while ((Get-Date) -lt $deadline) {
        try {
            $res = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
            if ($res.StatusCode -ge 200 -and $res.StatusCode -lt 500) {
                Write-Host "  [OK] $label is ready." -ForegroundColor Green
                return $true
            }
            $lastError = "HTTP $($res.StatusCode)"
        } catch {
            $lastError = $_.Exception.Message
        }

        Write-Host "." -NoNewline -ForegroundColor DarkGray
        Start-Sleep -Seconds 2
    }

    Write-Host ""
    Write-Host "  [ERROR] $label did not become ready within $timeoutSeconds seconds." -ForegroundColor Red
    if ($lastError) {
        Write-Host "          Last check: $lastError" -ForegroundColor DarkGray
    }
    return $false
}

function Wait-ForPort($port, $label, $timeoutSeconds) {
    Write-Host "  Waiting for $label on port $port" -ForegroundColor DarkGray
    $deadline = (Get-Date).AddSeconds($timeoutSeconds)

    while ((Get-Date) -lt $deadline) {
        if (Test-PortListening $port) {
            Write-Host "  [OK] $label is listening on port $port." -ForegroundColor Green
            return $true
        }

        Write-Host "." -NoNewline -ForegroundColor DarkGray
        Start-Sleep -Seconds 2
    }

    Write-Host ""
    Write-Host "  [ERROR] $label did not open port $port within $timeoutSeconds seconds." -ForegroundColor Red
    return $false
}

function Escape-PowerShellSingleQuote($text) {
    return [string]$text -replace "'", "''"
}

function Start-DevWindow($title, $dir) {
    $safeTitle = Escape-PowerShellSingleQuote $title
    $safeDir = Escape-PowerShellSingleQuote $dir
    $command = @"
`$host.UI.RawUI.WindowTitle = '$safeTitle'
Set-Location -LiteralPath '$safeDir'
Write-Host 'Starting $safeTitle...' -ForegroundColor Cyan
& npm.cmd run dev
Write-Host ''
Write-Host '$safeTitle stopped. Read the error above, then press Enter to close this window.' -ForegroundColor Yellow
Read-Host
"@

    return Start-Process -FilePath 'powershell.exe' -ArgumentList @(
        '-NoExit',
        '-ExecutionPolicy', 'Bypass',
        '-Command', $command
    ) -PassThru
}

Write-Head "CampusWay Project Launcher"

# ===================================================================
#  STEP 1: CHECK REQUIRED TOOLS
# ===================================================================
Write-Host "[STEP 1/5] Checking required tools..." -ForegroundColor Yellow
Write-Host ""

$missingNode = $false
$needsUpdate = $false

# --- Node.js ---
if (-not (Test-Command 'node')) {
    Write-Host "  [X] Node.js    - NOT FOUND" -ForegroundColor Red
    $missingNode = $true
} else {
    $nodeVer = (node --version) 2>$null
    $nodeMajor = 0
    if ($nodeVer -match 'v(\d+)\.') { $nodeMajor = [int]$Matches[1] }
    if ($nodeMajor -lt 18) {
        Write-Host "  [!] Node.js    - $nodeVer (needs v18+)" -ForegroundColor Yellow
        $needsUpdate = $true
    } else {
        Write-Host "  [OK] Node.js   - $nodeVer" -ForegroundColor Green
    }
}

# --- npm ---
if (-not (Test-Command 'npm')) {
    Write-Host "  [X] npm        - NOT FOUND" -ForegroundColor Red
    $missingNode = $true
} else {
    $npmVer = (npm --version) 2>$null
    Write-Host "  [OK] npm       - v$npmVer" -ForegroundColor Green
}

# --- MongoDB (Atlas cloud is used; local is informational only) ---
if (Test-PortListening 27017) {
    Write-Host "  [OK] MongoDB   - Local instance running on port 27017" -ForegroundColor Green
} else {
    Write-Host "  [i] MongoDB    - No local instance (using Atlas cloud - OK)" -ForegroundColor DarkGray
}

# --- Git (optional) ---
if (Test-Command 'git') {
    $gitVer = (git --version) 2>$null
    Write-Host "  [OK] Git       - $gitVer" -ForegroundColor Green
} else {
    Write-Host "  [i] Git        - Not found (optional)" -ForegroundColor DarkGray
}

Write-Host ""

if ($missingNode) {
    Write-Head "Node.js is required but NOT installed!"
    Write-Host "  Download and install Node.js v18+ from:" -ForegroundColor White
    Write-Host "    https://nodejs.org/en/download" -ForegroundColor White
    Write-Host ""
    Write-Host "  After installing, re-run this script." -ForegroundColor White
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# ===================================================================
#  STEP 2: CONFIGURATION (.env) CHECK
# ===================================================================
Write-Host "[STEP 2/5] Checking configuration..." -ForegroundColor Yellow
Write-Host ""

function Ensure-Env($dir, $label) {
    $env  = Join-Path $dir '.env'
    $samp = Join-Path $dir '.env.example'
    if (Test-Path $env) {
        Write-Host "  [OK] $label .env found" -ForegroundColor Green
    } elseif (Test-Path $samp) {
        Copy-Item $samp $env
        Write-Host "  [!] $label .env was missing - created from .env.example (edit it!)" -ForegroundColor Yellow
    } else {
        Write-Host "  [X] $label .env missing and no .env.example found" -ForegroundColor Red
    }
}

Ensure-Env $BackendDir  "Backend "
Ensure-Env $FrontendDir "Frontend"
Write-Host ""

# ===================================================================
#  STEP 3: DEPENDENCY OPTIONS (user chooses)
# ===================================================================
Write-Host "[STEP 3/5] Dependency setup..." -ForegroundColor Yellow
Write-Host ""

if ($needsUpdate) {
    Write-Host "  [!] Node.js is below v18. Consider upgrading." -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "  Choose how to proceed:" -ForegroundColor White
Write-Host ""
Write-Host "   [1] Fresh install  - Delete node_modules & reinstall (fixes broken installs)"
Write-Host "   [2] Update         - Run npm install to sync missing/changed packages"
Write-Host "   [3] Skip           - Use existing node_modules as-is (fastest)"
Write-Host ""

$choice = ''
while ($choice -notin @('1','2','3')) {
    $choice = Read-Host "  Your choice [1/2/3]"
}
Write-Host ""

# ===================================================================
#  STEP 4: INSTALL / UPDATE DEPENDENCIES
# ===================================================================
Write-Host "[STEP 4/5] Preparing dependencies..." -ForegroundColor Yellow
Write-Host ""

function Setup-Deps($dir, $label, $choice) {
    $nm   = Join-Path $dir 'node_modules'
    $lock = Join-Path $dir 'package-lock.json'

    if ($choice -eq '1') {
        if (Test-Path $nm) {
            Write-Host "  [$label] Removing old node_modules..." -ForegroundColor DarkGray
            Remove-Item $nm -Recurse -Force -ErrorAction SilentlyContinue
        }
        if (Test-Path $lock) { Remove-Item $lock -Force -ErrorAction SilentlyContinue }
    }

    $doInstall = ($choice -eq '1') -or ($choice -eq '2') -or (-not (Test-Path $nm))

    if ($doInstall) {
        if ($choice -eq '3') {
            Write-Host "  [$label] node_modules missing, installing..." -ForegroundColor DarkGray
        } elseif ($choice -eq '1') {
            Write-Host "  [$label] Running fresh npm install..." -ForegroundColor DarkGray
        } else {
            Write-Host "  [$label] Updating packages..." -ForegroundColor DarkGray
        }
        Push-Location $dir
        & npm.cmd install
        $code = $LASTEXITCODE
        Pop-Location
        if ($code -ne 0) {
            Write-Host "  [ERROR] $label npm install failed!" -ForegroundColor Red
            return $false
        }
        Write-Host "  [OK] $label dependencies ready." -ForegroundColor Green
    } else {
        Write-Host "  [$label] Using existing node_modules (skipped)." -ForegroundColor DarkGray
    }
    return $true
}

if (-not (Setup-Deps $BackendDir  "Backend"  $choice)) {
    Write-Head "Dependency install failed! Check internet and retry."
    Read-Host "Press Enter to exit"; exit 1
}
if (-not (Setup-Deps $FrontendDir "Frontend" $choice)) {
    Write-Head "Dependency install failed! Check internet and retry."
    Read-Host "Press Enter to exit"; exit 1
}
Write-Host ""

# ===================================================================
#  STEP 5: START SERVERS
# ===================================================================
Write-Host "[STEP 5/5] Starting CampusWay servers..." -ForegroundColor Yellow
Write-Host ""

function Free-Port($port) {
    try {
        $conns = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue
        foreach ($c in $conns) {
            Write-Host "  [INFO] Freeing port $port (PID $($c.OwningProcess))..." -ForegroundColor DarkGray
            Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    } catch { }
}

Free-Port 5003
Free-Port 5175

Write-Host "  Starting Backend  (port 5003)..." -ForegroundColor White
$backendProcess = Start-DevWindow 'CampusWay Backend' $BackendDir

if (-not (Wait-ForHttp 'http://127.0.0.1:5003/api/health' 'Backend API' 180)) {
    Write-Host ""
    Write-Host "  Backend did not become ready. Check the 'CampusWay Backend' window for the real error." -ForegroundColor Red
    Write-Host "  Backend launcher process id: $($backendProcess.Id)" -ForegroundColor DarkGray
    Write-Host ""
    Read-Host "Press Enter to close this launcher window"
    exit 1
}

Write-Host "  Starting Frontend (port 5175)..." -ForegroundColor White
$frontendProcess = Start-DevWindow 'CampusWay Frontend' $FrontendDir

Write-Host ""
if (-not (Wait-ForPort 5175 'Frontend dev server' 90)) {
    Write-Host ""
    Write-Host "  Frontend did not become ready. Check the 'CampusWay Frontend' window for the real error." -ForegroundColor Red
    Write-Host "  Frontend launcher process id: $($frontendProcess.Id)" -ForegroundColor DarkGray
    Write-Host ""
    Read-Host "Press Enter to close this launcher window"
    exit 1
}

Start-Process "http://localhost:5175"

Write-Head "CampusWay is running!"
Write-Host "  Frontend   :  http://localhost:5175" -ForegroundColor White
Write-Host "  Backend API:  http://localhost:5003/api" -ForegroundColor White
Write-Host "  Admin Panel:  http://localhost:5175/campusway-secure-admin" -ForegroundColor White
Write-Host ""
Write-Host "  Close the Backend / Frontend windows to stop servers." -ForegroundColor White
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Read-Host "Press Enter to close this launcher window"
