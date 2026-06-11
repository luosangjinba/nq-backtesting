@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

if "%~1"=="" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%start_windows.ps1" -Action start
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%start_windows.ps1" %*
)

endlocal
