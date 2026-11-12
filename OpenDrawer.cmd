@echo off
title EATmi POS - Cash Drawer Kick
cd /d "%~dp0"
echo ========================================================
echo   EATmi Bakery ^& Cafe - Cash Drawer Kick
echo   Sending ESC/POS pulse to POS-80C (copy 1)...
echo ========================================================
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\open-drawer.ps1
echo.
pause
