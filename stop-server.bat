@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0server-control.ps1" -Action stop
exit /b %ERRORLEVEL%
