@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 22.13 or later, then run Start again.
  pause
  exit /b 1
)
echo ========================================================
echo   EATmi Online Cloud POS ^& Remote Supervision
echo   Cashier Terminal: http://localhost:8787
echo ========================================================
npm run dev
pause
