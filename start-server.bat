@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0server-control.ps1" -Action start
exit /b %ERRORLEVEL%
