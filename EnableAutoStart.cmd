@echo off
title EATmi POS - Enable Windows Auto-Start
cd /d "%~dp0"

echo ========================================================
echo   EATmi Bakery ^& Cafe - Windows Auto-Start Setup
echo ========================================================
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\setup-autostart.ps1 -Action enable

echo.
echo ========================================================
echo   Every time you turn on the computer, EATmi POS will:
echo   1. Start silently in the background (no black CMD window)
echo   2. Automatically launch the POS register in Google Chrome
echo   3. Keep your local SQLite and Turso Cloud 100%% synchronized
echo ========================================================
echo.
pause
