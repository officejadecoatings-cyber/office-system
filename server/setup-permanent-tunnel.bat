@echo off
:: Check for admin permissions
net session >nul 2>&1
if %errorLevel% == 0 (
    goto :gotAdmin
) else (
    echo Requesting administrative privileges...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

:gotAdmin
title Office System - Cloudflare Permanent Tunnel Service Installer
color 0A
echo ========================================================
echo   Cloudflare Permanent Tunnel Service Setup
echo ========================================================
echo.
echo If you have a Cloudflare account and want a permanent domain
echo (e.g. office.yourcompany.com), create a Tunnel in:
echo https://one.dash.cloudflare.com -> Networks -> Tunnels
echo.
echo Copy the Tunnel Token provided by Cloudflare and paste it here:
echo.
set /p TUNNEL_TOKEN="Enter Cloudflare Tunnel Token: "
if "%TUNNEL_TOKEN%"=="" (
    echo No token entered. Exiting...
    pause
    exit /b
)

echo.
echo Installing Cloudflare Tunnel as a Windows Background Service...
"%~dp0cloudflared.exe" service install %TUNNEL_TOKEN%
echo.
echo Cloudflare Tunnel service installed successfully!
echo It will now run automatically on Windows boot.
echo.
pause
