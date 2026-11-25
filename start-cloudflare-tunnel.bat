@echo off
title Office System - Cloudflare Free Quick Tunnel
color 0A

:: Search for cloudflared.exe in known locations
set "CF_EXE="
if exist "C:\Program Files (x86)\cloudflared\cloudflared.exe" set "CF_EXE=C:\Program Files (x86)\cloudflared\cloudflared.exe"
if not defined CF_EXE if exist "C:\Program Files\cloudflared\cloudflared.exe" set "CF_EXE=C:\Program Files\cloudflared\cloudflared.exe"
if not defined CF_EXE if exist "%~dp0server\cloudflared.exe" set "CF_EXE=%~dp0server\cloudflared.exe"
if not defined CF_EXE if exist "%~dp0cloudflared.exe" set "CF_EXE=%~dp0cloudflared.exe"
if not defined CF_EXE set "CF_EXE=cloudflared.exe"

echo ========================================================
echo    Office System - Cloudflare Free Quick Tunnel
echo ========================================================
echo.
echo Connecting local port 3000 to Cloudflare secure network...
echo.
echo Once started, Cloudflare will display a link below:
echo (Look for the line: https://xxxx.trycloudflare.com)
echo.
echo ========================================================
echo.

"%CF_EXE%" tunnel --url http://localhost:3000

echo.
pause
