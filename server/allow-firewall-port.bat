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
echo ========================================================
echo  Opening Windows Firewall Port 3000 for Office System
echo ========================================================
echo.
netsh advfirewall firewall delete rule name="Office System Server (Port 3000)" >nul 2>&1
netsh advfirewall firewall add rule name="Office System Server (Port 3000)" dir=in action=allow protocol=TCP localport=3000 profile=any
echo.
echo Firewall rule added successfully! Other computers on LAN can now connect to Port 3000.
echo.
pause
