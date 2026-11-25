@echo off
setlocal

echo ========================================================
echo   Office System Server - Windows Service Uninstaller
echo ========================================================
echo.

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Administrator privileges are required.
    echo Please right-click this file and choose "Run as administrator".
    pause
    exit /b 1
)

echo Removing "OfficeSystemServer" background task...
schtasks /end /tn "OfficeSystemServer" >nul 2>&1
schtasks /delete /tn "OfficeSystemServer" /f >nul 2>&1
echo   [OK] Background service removed.

echo Removing Firewall rule...
netsh advfirewall firewall delete rule name="OfficeSystemServer" >nul 2>&1
echo   [OK] Firewall rule removed.

echo.
echo Uninstallation completed.
