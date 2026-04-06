@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

if not defined PRICE_DB_FILE set "PRICE_DB_FILE=trading_data.duckdb"
if not defined PRICE_HOST set "PRICE_HOST=127.0.0.1"
if not defined PRICE_PORT set "PRICE_PORT=8765"
if not defined PRICE_TABLE set "PRICE_TABLE=futures_1m"

echo Stopping existing price lookup API processes...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$procs = Get-CimInstance Win32_Process | Where-Object { $_.Name -match '^python(\\.exe|w\\.exe)?$' -and $_.CommandLine -like '*price_lookup_api.py*' }; if ($procs) { $procs | ForEach-Object { Write-Host ('Stopping PID ' + $_.ProcessId); Stop-Process -Id $_.ProcessId -Force } } else { Write-Host 'No running price_lookup_api.py process found.' }"

echo.
echo Restarting price lookup API...
echo   db file:  %PRICE_DB_FILE%
echo   host:     %PRICE_HOST%
echo   port:     %PRICE_PORT%
echo   table:    %PRICE_TABLE%
echo.
echo If Python or DuckDB is not available, run: python -m pip install duckdb
echo Press Ctrl+C to stop the API.
echo.

python price_lookup_api.py --db-file "%PRICE_DB_FILE%" --host "%PRICE_HOST%" --port "%PRICE_PORT%" --table "%PRICE_TABLE%"

endlocal
