@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

if not defined UI_HOST set "UI_HOST=127.0.0.1"
if not defined UI_PORT set "UI_PORT=8000"

echo Starting local UI server...
echo   host: %UI_HOST%
echo   port: %UI_PORT%
echo.
echo Open this in your browser:
echo   http://%UI_HOST%:%UI_PORT%/yaml_panel.html
echo.
echo Press Ctrl+C to stop the UI server.
echo.

python -m http.server "%UI_PORT%" --bind "%UI_HOST%"

endlocal
