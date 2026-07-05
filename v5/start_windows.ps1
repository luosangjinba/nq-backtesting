param(
  [ValidateSet("setup", "install-deps", "start", "stop", "restart", "status", "log")]
  [string]$Action = "start",
  [string]$Python = "python",
  [string]$HostName = "127.0.0.1",
  [int]$ApiPort = 8766,
  [int]$WebPort = 8010,
  [string]$TradingDb = "",
  [switch]$OpenBrowser,
  [switch]$InstallDeps
)

$ErrorActionPreference = "Stop"

$V5Dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $V5Dir
$V4Dir = Join-Path $RepoRoot "v4"
$ApiScript = Join-Path $V4Dir "v4_api.py"
$V5Index = Join-Path $V5Dir "index.html"
$DefaultDbFile = Join-Path $V4Dir "data\trading_data.duckdb"
$RuntimeDir = Join-Path $RepoRoot "tmp\windows-v5"
$ApiPidFile = Join-Path $RuntimeDir "v4-api.pid"
$WebPidFile = Join-Path $RuntimeDir "v5-web.pid"
$ApiOutLog = Join-Path $RuntimeDir "v4-api.out.log"
$ApiErrLog = Join-Path $RuntimeDir "v4-api.err.log"
$WebOutLog = Join-Path $RuntimeDir "v5-web.out.log"
$WebErrLog = Join-Path $RuntimeDir "v5-web.err.log"

function Write-Step($Message) {
  Write-Host "[v5-windows] $Message"
}

function Ensure-RuntimeDir {
  New-Item -ItemType Directory -Force -Path $RuntimeDir | Out-Null
}

function Test-HttpOk($Url) {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 2
    return $response.StatusCode -ge 200 -and $response.StatusCode -lt 400
  } catch {
    return $false
  }
}

function Invoke-Python($Arguments) {
  & $Python @Arguments
}

function Assert-Layout {
  if (-not (Test-Path $ApiScript)) {
    throw "Missing API script: $ApiScript"
  }
  if (-not (Test-Path $V5Index)) {
    throw "Missing V5 index: $V5Index"
  }
}

function Get-DbPath {
  if ($TradingDb.Trim()) {
    return $TradingDb.Trim()
  }
  if ($env:V4_TRADING_DB) {
    return $env:V4_TRADING_DB
  }
  return $DefaultDbFile
}

function Configure-Environment {
  $dbPath = Get-DbPath
  if ($dbPath) {
    [Environment]::SetEnvironmentVariable("V4_TRADING_DB", $dbPath, "Process")
  }
  [Environment]::SetEnvironmentVariable("V4_API_HOST", $HostName, "Process")

  $origins = @(
    "http://127.0.0.1:$WebPort",
    "http://localhost:$WebPort"
  )
  if ($HostName -ne "127.0.0.1" -and $HostName -ne "localhost") {
    $origins += "http://$HostName`:$WebPort"
  }
  if ($env:V4_ALLOWED_WEB_ORIGINS) {
    $origins += $env:V4_ALLOWED_WEB_ORIGINS.Split(",") | ForEach-Object { $_.Trim() } | Where-Object { $_ }
  }
  [Environment]::SetEnvironmentVariable(
    "V4_ALLOWED_WEB_ORIGINS",
    (($origins | Select-Object -Unique) -join ","),
    "Process"
  )
}

function Install-Dependencies {
  Assert-Layout
  if (-not (Get-Command $Python -ErrorAction SilentlyContinue)) {
    throw "Python command not found: $Python. Install Python 3.11+ and add it to PATH, or pass -Python C:\Path\python.exe"
  }

  Write-Step "Python version"
  Invoke-Python @("--version")

  Write-Step "Installing Python dependencies from v4\requirements-data.txt"
  Invoke-Python @("-m", "pip", "install", "--upgrade", "pip")
  Invoke-Python @("-m", "pip", "install", "-r", (Join-Path $V4Dir "requirements-data.txt"))
}

function Setup-V5 {
  Assert-Layout
  if (-not (Get-Command $Python -ErrorAction SilentlyContinue)) {
    throw "Python command not found: $Python. Install Python 3.11+ and add it to PATH, or pass -Python C:\Path\python.exe"
  }

  Write-Step "Python version"
  Invoke-Python @("--version")

  if ($InstallDeps) {
    Install-Dependencies
  } else {
    Write-Step "Checking required Python packages"
    Invoke-Python @("-c", "import duckdb, yaml; print('duckdb/yaml ok')")
  }

  $dbPath = Get-DbPath
  if (Test-Path $dbPath) {
    Write-Step "Database found: $dbPath"
  } else {
    Write-Warning "Database not found: $dbPath"
    Write-Warning "Copy trading_data.duckdb to v4\data\trading_data.duckdb, or pass -TradingDb C:\path\trading_data.duckdb"
  }
}

function Stop-ProcessByPidFile($PidFile, $Label) {
  if (-not (Test-Path $PidFile)) {
    return
  }
  $pidText = Get-Content $PidFile -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($pidText -match "^\d+$") {
    $process = Get-Process -Id ([int]$pidText) -ErrorAction SilentlyContinue
    if ($process) {
      Write-Step "Stopping $Label PID $pidText"
      Stop-Process -Id ([int]$pidText) -Force -ErrorAction SilentlyContinue
    }
  }
  Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
}

function Stop-V5 {
  Stop-ProcessByPidFile $ApiPidFile "V4 API"
  Stop-ProcessByPidFile $WebPidFile "V5 Web"
}

function Start-Api {
  $healthUrl = "http://$HostName`:$ApiPort/v4/health"
  if (Test-HttpOk $healthUrl) {
    Write-Step "API already running: $healthUrl"
    return
  }

  Write-Step "Starting V4 API on $healthUrl"
  $process = Start-Process `
    -FilePath $Python `
    -ArgumentList @("v4_api.py") `
    -WorkingDirectory $V4Dir `
    -RedirectStandardOutput $ApiOutLog `
    -RedirectStandardError $ApiErrLog `
    -WindowStyle Minimized `
    -PassThru
  Set-Content -Path $ApiPidFile -Value $process.Id

  Start-Sleep -Seconds 2
  if (-not (Test-HttpOk $healthUrl)) {
    Write-Warning "API did not pass health check. Last log lines:"
    if (Test-Path $ApiOutLog) { Get-Content $ApiOutLog -Tail 40 }
    if (Test-Path $ApiErrLog) { Get-Content $ApiErrLog -Tail 40 }
    throw "API startup failed"
  }
  Write-Step "API running: $healthUrl"
}

function Start-Web {
  $url = "http://$HostName`:$WebPort/v5/index.html"
  if (Test-HttpOk $url) {
    Write-Step "Web already running: $url"
    return
  }

  Write-Step "Starting V5 static web server on $url"
  $process = Start-Process `
    -FilePath $Python `
    -ArgumentList @("-m", "http.server", "$WebPort", "--bind", "$HostName") `
    -WorkingDirectory $RepoRoot `
    -RedirectStandardOutput $WebOutLog `
    -RedirectStandardError $WebErrLog `
    -WindowStyle Minimized `
    -PassThru
  Set-Content -Path $WebPidFile -Value $process.Id

  Start-Sleep -Seconds 2
  if (-not (Test-HttpOk $url)) {
    Write-Warning "Web server did not answer. Last log lines:"
    if (Test-Path $WebOutLog) { Get-Content $WebOutLog -Tail 40 }
    if (Test-Path $WebErrLog) { Get-Content $WebErrLog -Tail 40 }
    throw "Web startup failed"
  }
  Write-Step "Web running: $url"
}

function Start-V5 {
  Ensure-RuntimeDir
  Configure-Environment
  Setup-V5
  Start-Api
  Start-Web
  $url = "http://$HostName`:$WebPort/v5/index.html"
  Write-Step "Open: $url"
  Write-Step "API:  http://$HostName`:$ApiPort/v4/health"
  Write-Step "Logs: $RuntimeDir"
  if ($OpenBrowser) {
    Start-Process $url
  }
}

function Show-Status {
  Configure-Environment
  $apiUrl = "http://$HostName`:$ApiPort/v4/health"
  $webUrl = "http://$HostName`:$WebPort/v5/index.html"
  $dbPath = Get-DbPath
  Write-Step ("API: " + $(if (Test-HttpOk $apiUrl) { "running" } else { "stopped" }) + " $apiUrl")
  Write-Step ("Web: " + $(if (Test-HttpOk $webUrl) { "running" } else { "stopped" }) + " $webUrl")
  Write-Step ("Database: " + $(if (Test-Path $dbPath) { "found " } else { "missing " }) + $dbPath)
}

function Show-Logs {
  foreach ($log in @($ApiOutLog, $ApiErrLog, $WebOutLog, $WebErrLog)) {
    if (Test-Path $log) {
      Write-Step $log
      Get-Content $log -Tail 80
    }
  }
}

switch ($Action) {
  "install-deps" {
    Ensure-RuntimeDir
    Install-Dependencies
  }
  "setup" {
    Ensure-RuntimeDir
    Configure-Environment
    Setup-V5
  }
  "start" { Start-V5 }
  "stop" {
    Ensure-RuntimeDir
    Stop-V5
    Write-Step "Stopped"
  }
  "restart" {
    Ensure-RuntimeDir
    Stop-V5
    Start-V5
  }
  "status" {
    Ensure-RuntimeDir
    Show-Status
  }
  "log" {
    Ensure-RuntimeDir
    Show-Logs
  }
}
