@echo off
title EATmi POS - Disable Windows Auto-Start
cd /d "%~dp0"

echo ========================================================
echo   EATmi Bakery ^& Cafe - Disable Windows Auto-Start
echo ========================================================
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\setup-autostart.ps1 -Action disable

echo.
pause
