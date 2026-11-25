@echo off
title Office System - ngrok Permanent Tunnel Setup
color 0B
echo ========================================================
echo    Office System - ngrok Permanent Tunnel Setup
echo ========================================================
echo.
echo 1. Sign up for free at: https://dashboard.ngrok.com/signup
echo 2. Copy your Auth Token from the dashboard.
echo.
set /p NGROK_TOKEN="Enter your ngrok Auth Token: "
if "%NGROK_TOKEN%"=="" (
    echo No token entered. Exiting...
    pause
    exit /b
)

"%~dp0server\ngrok.exe" config add-authtoken %NGROK_TOKEN%
echo.
echo Auth token configured successfully!
echo.
set /p STATIC_DOMAIN="Enter your free ngrok domain (e.g. something.ngrok-free.app): "
if "%STATIC_DOMAIN%"=="" (
    "%~dp0server\ngrok.exe" http 3000
) else (
    "%~dp0server\ngrok.exe" http --url=%STATIC_DOMAIN% 3000
)
pause
