@echo off
setlocal

echo ========================================================
echo   Building Office System Client Desktop App Installer
echo ========================================================
echo.

set SCRIPT_DIR=%~dp0
set CLIENT_DIR=%SCRIPT_DIR%client-desktop
set INSTALLERS_DIR=%SCRIPT_DIR%installers

if not exist "%INSTALLERS_DIR%" mkdir "%INSTALLERS_DIR%"

echo [1/3] Bundling latest frontend application for desktop...
python "%SCRIPT_DIR%build_client_bundle.py"
if %errorlevel% neq 0 (
    echo [ERROR] Failed to build client renderer bundle.
    exit /b 1
)

echo.
echo [2/3] Building Electron Desktop Executable and Windows Installer...
cd /d "%CLIENT_DIR%"
call npx electron-builder --win

if %errorlevel% equ 0 (
    echo.
    echo [3/3] Copying installer to /installers directory...
    if exist "%CLIENT_DIR%\dist\OfficeSystem-Client-Setup.exe" (
        copy /y "%CLIENT_DIR%\dist\OfficeSystem-Client-Setup.exe" "%INSTALLERS_DIR%\OfficeSystem-Client-Setup.exe" >nul
        echo.
        echo ========================================================
        echo   SUCCESS: Client installer built successfully!
        echo   Output: %INSTALLERS_DIR%\OfficeSystem-Client-Setup.exe
        echo ========================================================
    ) else (
        echo   Built files located in %CLIENT_DIR%\dist\
    )
) else (
    echo.
    echo [ERROR] Electron Builder encountered an error.
)

echo.
