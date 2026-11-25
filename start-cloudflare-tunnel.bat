@echo off
title Office System - Cloudflare Tunnel Launcher
color 0B
echo ========================================================
echo   Office System - Cloudflare Tunnel Launcher
echo ========================================================
echo.
echo Starting secure encrypted tunnel to local port 3000...
echo.
echo Once started, Cloudflare will display a public HTTPS link:
echo Example: https://xxxx-xxxx-xxxx.trycloudflare.com
echo.
echo You can use that HTTPS link on phones, laptops, or the
echo Desktop App anywhere in the world without any port forwarding!
echo.
echo Keep this window open while you need remote access.
echo ========================================================
echo.
server\cloudflared.exe tunnel --url http://localhost:3000
pause
