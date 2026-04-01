# ============================================
# Quick Tunnel Starter for Training Management Tools
# ============================================
# This script starts two Cloudflare quick tunnels:
#   1. PocketBase API (port 8090)
#   2. React Frontend (port 3000)
#
# USAGE:
#   1. Make sure PocketBase is running on port 8090
#   2. Make sure React app is running on port 3000 (npm start)
#   3. Run this script: .\start-tunnel.ps1
#   4. Copy the PocketBase tunnel URL and set it in .env file
#   5. Restart npm start to pick up the new .env
#   6. Share the React tunnel URL with others!
# ============================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Starting Cloudflare Quick Tunnels" -ForegroundColor Cyan  
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Start PocketBase tunnel
Write-Host "[1/2] Starting PocketBase tunnel (port 8090)..." -ForegroundColor Yellow
$pbJob = Start-Job -ScriptBlock {
    cloudflared tunnel --url http://localhost:8090 2>&1
}

Start-Sleep -Seconds 10

# Get PocketBase tunnel URL
$pbOutput = Receive-Job -Job $pbJob
$pbUrl = ($pbOutput | Select-String -Pattern "https://.*\.trycloudflare\.com").Matches.Value

if ($pbUrl) {
    Write-Host "[OK] PocketBase tunnel: $pbUrl" -ForegroundColor Green
} else {
    Write-Host "[!] Could not get PocketBase tunnel URL. Check if PocketBase is running." -ForegroundColor Red
    Write-Host "    Raw output:" -ForegroundColor Gray
    $pbOutput | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
}

# Start React frontend tunnel
Write-Host ""
Write-Host "[2/2] Starting React frontend tunnel (port 3000)..." -ForegroundColor Yellow
$reactJob = Start-Job -ScriptBlock {
    cloudflared tunnel --url http://localhost:3000 2>&1
}

Start-Sleep -Seconds 10

# Get React tunnel URL
$reactOutput = Receive-Job -Job $reactJob
$reactUrl = ($reactOutput | Select-String -Pattern "https://.*\.trycloudflare\.com").Matches.Value

if ($reactUrl) {
    Write-Host "[OK] React frontend tunnel: $reactUrl" -ForegroundColor Green
} else {
    Write-Host "[!] Could not get React tunnel URL. Check if React app is running." -ForegroundColor Red
    Write-Host "    Raw output:" -ForegroundColor Gray
    $reactOutput | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " SETUP INSTRUCTIONS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Create a .env file with:" -ForegroundColor White
Write-Host "   REACT_APP_POCKETBASE_URL=$pbUrl" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. Restart your React app (npm start)" -ForegroundColor White
Write-Host ""
Write-Host "3. Share this URL with others:" -ForegroundColor White
Write-Host "   $reactUrl" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop the tunnels." -ForegroundColor Gray
Write-Host ""

# Keep the script running
try {
    while ($true) {
        Start-Sleep -Seconds 60
        # Check if jobs are still running
        if ($pbJob.State -ne "Running") {
            Write-Host "[!] PocketBase tunnel stopped. Restarting..." -ForegroundColor Red
            $pbJob = Start-Job -ScriptBlock { cloudflared tunnel --url http://localhost:8090 2>&1 }
        }
        if ($reactJob.State -ne "Running") {
            Write-Host "[!] React tunnel stopped. Restarting..." -ForegroundColor Red
            $reactJob = Start-Job -ScriptBlock { cloudflared tunnel --url http://localhost:3000 2>&1 }
        }
    }
} finally {
    Write-Host "Stopping tunnels..." -ForegroundColor Yellow
    Stop-Job -Job $pbJob -ErrorAction SilentlyContinue
    Stop-Job -Job $reactJob -ErrorAction SilentlyContinue
    Remove-Job -Job $pbJob -ErrorAction SilentlyContinue
    Remove-Job -Job $reactJob -ErrorAction SilentlyContinue
    Write-Host "Tunnels stopped." -ForegroundColor Green
}
