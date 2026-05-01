@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

echo Starting Trading YAML tools...
echo.
echo This will open:
echo   1. Price lookup API window
echo   2. UI static server window
echo.

start "Price Lookup API" cmd /k ""%SCRIPT_DIR%start_api.bat""
start "YAML UI Server" cmd /k ""%SCRIPT_DIR%start_ui.bat""

echo Open this in your browser after both windows finish starting:
echo   http://127.0.0.1:8000/v2/docs/layer2_recorder_v2.html
echo   http://127.0.0.1:8000/v2/docs/pda_review.html
echo.

endlocal
