@echo off
cd /d "%~dp0"
title EATmi POS - Remote Supervisor Cloudflare Tunnel

echo ========================================================
echo   EATmi Bakery & Cafe - Remote Supervision Tunnel
echo ========================================================
echo.

if not exist cloudflared.exe (
    echo [Setup] Downloading Cloudflare Tunnel (One-time download)...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe', 'cloudflared.exe')"
    if not exist cloudflared.exe (
        echo [Error] Download failed. Please check your internet connection.
        pause
        exit /b 1
    )
    echo [Setup] Download complete!
    echo.
)

echo --------------------------------------------------------
echo  1. Make sure Start.cmd is running on this Cashier PC
echo  2. Look below for your free public supervisor link:
echo     It looks like: https://xxxx-xxxx-xxxx.trycloudflare.com
echo  3. Copy that link and open it on your phone or laptop!
echo --------------------------------------------------------
echo.

cloudflared.exe tunnel --url http://localhost:8787
pause
