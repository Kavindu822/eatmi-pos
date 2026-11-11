@echo off
cd /d "%~dp0"
title EATmi POS - Remote Supervisor Cloudflare Tunnel

echo ========================================================
echo   EATmi Bakery and Cafe - Remote Supervision Tunnel
echo ========================================================
echo.
echo Connecting to Cloudflare Tunnel...
echo Please wait 5 seconds for your supervisor link...
echo.

if not exist cloudflared.exe (
    echo Downloading cloudflared...
    curl.exe -L -o cloudflared.exe "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
)

echo ========================================================
echo   Look below for your supervisor link:
echo   It starts with: https://...trycloudflare.com
echo ========================================================
echo.

cloudflared.exe tunnel --url http://127.0.0.1:8787 --http-host-header localhost:8787 --protocol http2
pause
