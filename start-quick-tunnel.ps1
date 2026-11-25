$ErrorActionPreference = 'SilentlyContinue'

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   Office System - Cloudflare Free Quick Tunnel" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Connecting local port 3000 to Cloudflare secure network..." -ForegroundColor Yellow

$cloudflared = Join-Path $PSScriptRoot "server\cloudflared.exe"
if (-not (Test-Path $cloudflared)) {
    $cloudflared = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
}
if (-not (Test-Path $cloudflared)) {
    $cloudflared = "cloudflared.exe"
}

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = $cloudflared
$psi.Arguments = "tunnel --url http://localhost:3000"
$psi.RedirectStandardError = $true
$psi.UseShellExecute = $false
$psi.CreateNoWindow = $false

$proc = [System.Diagnostics.Process]::Start($psi)

$tunnelUrl = $null
$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

while (-not $proc.HasExited -and $stopwatch.ElapsedMilliseconds -lt 15000) {
    $line = $proc.StandardError.ReadLine()
    if ($line) {
        if ($line -match "https://[a-zA-Z0-9-]+\.trycloudflare\.com") {
            $tunnelUrl = $matches[0]
            break
        }
    }
}

if ($tunnelUrl) {
    Clear-Host
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host "  OFFICE SYSTEM IS NOW LIVE ON SECURE CLOUDFLARE URL! " -ForegroundColor Green
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Public Link: " -NoNewline -ForegroundColor Yellow
    Write-Host " $tunnelUrl " -ForegroundColor White -BackgroundColor DarkGreen
    Write-Host ""
    Write-Host "  You can open this link on:" -ForegroundColor Cyan
    Write-Host "   - Any Mobile Phone / Tablet Browser anywhere" -ForegroundColor Gray
    Write-Host "   - Desktop App on remote laptops (Paste into Server Address)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  (Link copied to Clipboard automatically)" -ForegroundColor Yellow
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host "Keep this window open to maintain the online connection." -ForegroundColor DarkYellow

    try { Set-Clipboard -Value $tunnelUrl } catch {}
} else {
    Write-Host "Failed to capture tunnel URL. Checking logs..." -ForegroundColor Red
}

$proc.WaitForExit()
