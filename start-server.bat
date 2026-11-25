@echo off
title Office System Server (Port 3000)
cd /d "%~dp0server"

if exist "node.exe" (
    set NODE_CMD=node.exe
) else (
    set NODE_CMD=node
)

echo ========================================================
echo   Starting Office System Server on Port 3000...
echo ========================================================
echo.
"%NODE_CMD%" server.js
pause
