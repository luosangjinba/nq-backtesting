@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

set "BUNDLE_DIR=%SCRIPT_DIR%windows_bundle"

if exist "%BUNDLE_DIR%" rmdir /s /q "%BUNDLE_DIR%"
mkdir "%BUNDLE_DIR%"

copy /y "%SCRIPT_DIR%yaml_panel.html" "%BUNDLE_DIR%\" >nul
copy /y "%SCRIPT_DIR%vendor-tailwind.js" "%BUNDLE_DIR%\" >nul
copy /y "%SCRIPT_DIR%vendor-react.production.min.js" "%BUNDLE_DIR%\" >nul
copy /y "%SCRIPT_DIR%vendor-react-dom.production.min.js" "%BUNDLE_DIR%\" >nul
copy /y "%SCRIPT_DIR%price_lookup_api.py" "%BUNDLE_DIR%\" >nul
copy /y "%SCRIPT_DIR%duckdb_import_nq_1m.py" "%BUNDLE_DIR%\" >nul
copy /y "%SCRIPT_DIR%duckdb_schema.sql" "%BUNDLE_DIR%\" >nul
copy /y "%SCRIPT_DIR%trading_data.duckdb" "%BUNDLE_DIR%\" >nul
copy /y "%SCRIPT_DIR%start_api.bat" "%BUNDLE_DIR%\" >nul
copy /y "%SCRIPT_DIR%restart_api.bat" "%BUNDLE_DIR%\" >nul
copy /y "%SCRIPT_DIR%start_ui.bat" "%BUNDLE_DIR%\" >nul
copy /y "%SCRIPT_DIR%start_all.bat" "%BUNDLE_DIR%\" >nul
copy /y "%SCRIPT_DIR%WINDOWS_SETUP.md" "%BUNDLE_DIR%\" >nul
copy /y "%SCRIPT_DIR%readme.md" "%BUNDLE_DIR%\" >nul

if exist "%SCRIPT_DIR%backtesting-images" (
  xcopy "%SCRIPT_DIR%backtesting-images" "%BUNDLE_DIR%\backtesting-images\" /E /I /Y >nul
)

echo Windows bundle created:
echo   %BUNDLE_DIR%
echo.
echo Included files:
dir /b "%BUNDLE_DIR%"
echo.
echo You can now copy this folder to your Windows machine.

endlocal
