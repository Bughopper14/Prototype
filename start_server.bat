@echo off
title LiugongApps Core Server
echo ===================================================
echo Starting LiugongApps Clean Server (Login & User Management)...
echo ===================================================
cd /d "%~dp0"
python server.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Server stopped with error.
    pause
)
