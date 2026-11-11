@echo off
cd /d "%~dp0"
title EATmi POS - Complete Database and Images Backup

echo ========================================================
echo   EATmi Bakery and Cafe - System Disaster Backup
echo ========================================================
echo.

if not exist backups mkdir backups

:: Generate timestamp YYYY-MM-DD_HHMM using powershell
for /f %%I in ('powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd_HHmm'"') do set "STAMP=%%I"
set "ZIPNAME=backups\EATmi_Backup_%STAMP%.zip"

echo [1/2] Backing up database (counter.sqlite)...
echo [2/2] Backing up all images (public\uploads)...
echo.
echo Compressing into portable ZIP file: %ZIPNAME%...

tar.exe -a -cf "%ZIPNAME%" counter.sqlite public\uploads

if exist "%ZIPNAME%" (
    echo.
    echo ========================================================
    echo   BACKUP CREATED SUCCESSFULLY!
    echo   Saved to: %ZIPNAME%
    echo ========================================================
    echo.
    echo  Tip: Copy this ZIP to a USB pen drive or Google Drive!
    echo  It contains your full SQLite database and all uploaded images.
    echo  If your PC ever fails, you can restore everything instantly.
) else (
    echo.
    echo [Error] Failed to create backup ZIP.
)

echo.
pause
