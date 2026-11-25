@echo off
setlocal

echo ========================================================
echo   Building Office System Server Installer
echo ========================================================
echo.

set SCRIPT_DIR=%~dp0
set SERVER_DIR=%SCRIPT_DIR%server
set INSTALLERS_DIR=%SCRIPT_DIR%installers

if not exist "%INSTALLERS_DIR%" mkdir "%INSTALLERS_DIR%"

echo [1/4] Checking and bundling standalone Node.js runtime...
if not exist "%SERVER_DIR%\node.exe" (
    if exist "C:\Program Files\nodejs\node.exe" (
        copy /y "C:\Program Files\nodejs\node.exe" "%SERVER_DIR%\node.exe" >nul
        echo   [OK] Copied node.exe from C:\Program Files\nodejs\
    ) else (
        echo   [!] Warning: node.exe could not be copied automatically.
    )
) else (
    echo   [OK] Bundled node.exe already present in server directory.
)

echo.
echo [2/4] Verifying server dependencies...
cd /d "%SERVER_DIR%"
if not exist "node_modules\better-sqlite3" (
    echo   Installing server production dependencies...
    call npm install --omit=dev
) else (
    echo   [OK] Server node_modules verified.
)

echo.
echo [3/4] Preparing Inno Setup compiler...
set ISCC_PATH=
if exist "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" set ISCC_PATH=C:\Program Files (x86)\Inno Setup 6\ISCC.exe
if exist "C:\Program Files\Inno Setup 6\ISCC.exe" set ISCC_PATH=C:\Program Files\Inno Setup 6\ISCC.exe

if not "%ISCC_PATH%"=="" (
    echo   [OK] Found Inno Setup Compiler at: "%ISCC_PATH%"
    echo.
    echo [4/4] Compiling OfficeSystem-Server-Setup.exe...
    "%ISCC_PATH%" "%SERVER_DIR%\server-installer.iss"
    if %errorlevel% equ 0 (
        echo.
        echo ========================================================
        echo   SUCCESS: Server installer built successfully!
        echo   File: %INSTALLERS_DIR%\OfficeSystem-Server-Setup.exe
        echo ========================================================
    ) else (
        echo   [!] Compilation failed.
    )
) else (
    echo   [!] Inno Setup 6 is not installed on this machine.
    echo.
    echo [4/4] Packaging Standalone Server Archive...
    powershell -Command "Compress-Archive -Path '%SERVER_DIR%\*' -DestinationPath '%INSTALLERS_DIR%\OfficeSystem-Server-Standalone.zip' -Force"
    echo   [OK] Created: %INSTALLERS_DIR%\OfficeSystem-Server-Standalone.zip
    echo.
    echo   Note: To compile the final single-file OfficeSystem-Server-Setup.exe installer:
    echo     1. Download and install Inno Setup 6: https://jrsoftware.org/isdl.php
    echo     2. Re-run this build script (build-server-installer.bat)
)

echo.
