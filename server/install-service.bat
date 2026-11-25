@echo off
setlocal

echo ========================================================
echo   Office System Server - Windows Service Installer
echo ========================================================
echo.

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Administrator privileges are required.
    echo Please right-click this file and choose "Run as administrator".
    pause
    exit /b 1
)

set SCRIPT_DIR=%~dp0
set NODE_EXE=%SCRIPT_DIR%node.exe
if not exist "%NODE_EXE%" (
    for %%X in (node.exe) do (set NODE_EXE=%%~$PATH:X)
)

if not exist "%NODE_EXE%" (
    echo [ERROR] Node.js executable not found in %SCRIPT_DIR% or system PATH.
    pause
    exit /b 1
)

echo [1/3] Configuring Windows Firewall rule for Port 3000...
netsh advfirewall firewall delete rule name="OfficeSystemServer" >nul 2>&1
netsh advfirewall firewall add rule name="OfficeSystemServer" dir=in action=allow protocol=TCP localport=3000 profile=any description="Allows office LAN client desktop apps to connect to Office System Server on port 3000" >nul
if %errorlevel% equ 0 (
    echo   [OK] Firewall rule added: TCP 3000 ALLOWED.
) else (
    echo   [!] Warning: Could not add firewall rule automatically.
)

echo.
echo [2/3] Registering Office System Server as Automatic Windows Startup Service...
schtasks /delete /tn "OfficeSystemServer" /f >nul 2>&1
schtasks /create /tn "OfficeSystemServer" /tr "powershell -WindowStyle Hidden -Command \"Set-Location '%SCRIPT_DIR%'; & '%NODE_EXE%' server.js\"" /sc onstart /ru SYSTEM /rl HIGHEST /f >nul

if %errorlevel% equ 0 (
    echo   [OK] Windows Startup Service "OfficeSystemServer" created successfully.
) else (
    echo   [!] Falling back to current user startup task...
    schtasks /create /tn "OfficeSystemServer" /tr "powershell -WindowStyle Hidden -Command \"Set-Location '%SCRIPT_DIR%'; & '%NODE_EXE%' server.js\"" /sc onlogon /rl HIGHEST /f >nul
)

echo.
echo [3/3] Starting Server Service now...
schtasks /run /tn "OfficeSystemServer" >nul 2>&1

timeout /t 2 /nobreak >nul
powershell -Command "try { $r = Invoke-RestMethod -Uri 'http://localhost:3000/api/ping' -TimeoutSec 3; Write-Host '  [OK] Server is ACTIVE and responding to requests!' -ForegroundColor Green } catch { Write-Host '  [!] Server task triggered. Check ServerControl.bat for live status.' -ForegroundColor Yellow }"

echo.
echo ========================================================
echo   Installation Completed Successfully!
echo   The server will start silently on Windows boot.
echo ========================================================
echo.
