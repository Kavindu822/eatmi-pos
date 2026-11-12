@echo off
title EATmi POS - Stop Background Server
cd /d "%~dp0"

echo ========================================================
echo   EATmi Bakery ^& Cafe - Stop POS Server
echo ========================================================
echo.
echo Stopping any running POS processes on port 8787...

powershell -NoProfile -Command ^
  "$conns = Get-NetTCPConnection -LocalPort 8787 -ErrorAction SilentlyContinue; " ^
  "if ($conns) { " ^
  "  $conns | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }; " ^
  "  Write-Host 'SUCCESS: POS server on port 8787 has been stopped.' -ForegroundColor Green " ^
  "} else { " ^
  "  Write-Host 'No POS server is currently running on port 8787.' -ForegroundColor Yellow " ^
  "}"

echo.
timeout /t 3 >nul

