param(
  [ValidateSet("setup", "start", "stop", "restart", "status", "log")]
  [string]$Action = "start",
  [string]$Python = "python",
  [string]$HostName = "127.0.0.1",
  [int]$ApiPort = 8766,
  [int]$WebPort = 8001,
  [switch]$InstallDeps,
  [switch]$OpenBrowser
)

$ErrorActionPreference = "Stop"

$V4Dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ApiScript = Join-Path $V4Dir "v4_api.py"
$DefaultDbFile = Join-Path $V4Dir "data\trading_data.duckdb"
$ApiPidFile = Join-Path $V4Dir ".api.win.pid"
$WebPidFile = Join-Path $V4Dir ".web.win.pid"
$ApiOutLog = Join-Path $V4Dir ".api.win.out.log"
$ApiErrLog = Join-Path $V4Dir ".api.win.err.log"
$WebOutLog = Join-Path $V4Dir ".web.win.out.log"
$WebErrLog = Join-Path $V4Dir ".web.win.err.log"
$LocalEnvFile = Join-Path $V4Dir ".env.local"

function Write-Step($Message) {
  Write-Host "[v4-windows] $Message"
}

function Import-LocalEnvFile {
  if (-not (Test-Path $LocalEnvFile)) {
    return
  }
  Write-Step "Loading local environment: $LocalEnvFile"
  foreach ($line in Get-Content $LocalEnvFile) {
    $trimmed = $line.Trim()
    if ($trimmed.Length -eq 0 -or $trimmed.StartsWith("#")) {
      continue
    }
    if ($trimmed -notmatch "^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$") {
      continue
    }
    $name = $Matches[1]
    $value = $Matches[2].Trim()
    if (
      ($value.StartsWith('"') -and $value.EndsWith('"')) -or
      ($value.StartsWith("'") -and $value.EndsWith("'"))
    ) {
      $value = $value.Substring(1, $value.Length - 2)
    }
    [Environment]::SetEnvironmentVariable($name, $value, "Process")
  }
}

function Test-HttpOk($Url) {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 2
    return $response.StatusCode -ge 200 -and $response.StatusCode -lt 300
  } catch {
    return $false
  }
}

function Invoke-Python($Arguments) {
  & $Python @Arguments
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

function Stop-V4Processes {
  Stop-ProcessByPidFile $ApiPidFile "API"
  Stop-ProcessByPidFile $WebPidFile "Web"
}

function Assert-Layout {
  if (-not (Test-Path $ApiScript)) {
    throw "Missing API script: $ApiScript"
  }
  if (-not (Test-Path (Join-Path $V4Dir "index.html"))) {
    throw "Missing index.html in V4 folder: $V4Dir"
  }
}

function Get-ConfiguredDbPath {
  if ($env:V4_TRADING_DB) {
    return $env:V4_TRADING_DB
  }
  return $DefaultDbFile
}

function Setup-V4 {
  Assert-Layout
  if (-not (Get-Command $Python -ErrorAction SilentlyContinue)) {
    throw "Python command not found: $Python. Install Python 3.11+ and add it to PATH, or pass -Python C:\Path\python.exe"
  }

  Write-Step "Python version:"
  Invoke-Python @("--version")

  if ($InstallDeps) {
    Write-Step "Installing Python packages: duckdb PyYAML"
    Invoke-Python @("-m", "pip", "install", "--upgrade", "pip")
    Invoke-Python @("-m", "pip", "install", "duckdb", "PyYAML")
  }

  Write-Step "Checking Python packages"
  Invoke-Python @("-c", "import duckdb, yaml; print('duckdb/yaml ok')")

  $dbPath = Get-ConfiguredDbPath
  if (Test-Path $dbPath) {
    Write-Step "Database found: $dbPath"
  } else {
    Write-Warning "Database not found: $dbPath"
    Write-Warning "Copy trading_data.duckdb to data\trading_data.duckdb, or set V4_TRADING_DB."
  }
}

function Start-Api {
  if (Test-HttpOk "http://$HostName`:$ApiPort/v4/health") {
    Write-Step "API already running: http://$HostName`:$ApiPort"
    return
  }

  Write-Step "Starting API on port $ApiPort"
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
  if (-not (Test-HttpOk "http://$HostName`:$ApiPort/v4/health")) {
    Write-Warning "API did not answer health check. Last log lines:"
    if (Test-Path $ApiOutLog) { Get-Content $ApiOutLog -Tail 30 }
    if (Test-Path $ApiErrLog) { Get-Content $ApiErrLog -Tail 30 }
    throw "API startup failed"
  }
  Write-Step "API running: http://$HostName`:$ApiPort"
}

function Start-Web {
  $url = "http://$HostName`:$WebPort/index.html"
  if (Test-HttpOk $url) {
    Write-Step "Web already running: $url"
    return
  }

  Write-Step "Starting Web server on port $WebPort"
  $process = Start-Process `
    -FilePath $Python `
    -ArgumentList @("-m", "http.server", "$WebPort", "--bind", "$HostName") `
    -WorkingDirectory $V4Dir `
    -RedirectStandardOutput $WebOutLog `
    -RedirectStandardError $WebErrLog `
    -WindowStyle Minimized `
    -PassThru
  Set-Content -Path $WebPidFile -Value $process.Id

  Start-Sleep -Seconds 2
  if (-not (Test-HttpOk $url)) {
    Write-Warning "Web server did not answer. Last log lines:"
    if (Test-Path $WebOutLog) { Get-Content $WebOutLog -Tail 30 }
    if (Test-Path $WebErrLog) { Get-Content $WebErrLog -Tail 30 }
    throw "Web startup failed"
  }
  Write-Step "Web running: $url"
}

function Start-V4 {
  Setup-V4
  Start-Api
  Start-Web
  $url = "http://$HostName`:$WebPort/index.html"
  Write-Step "Open: $url"
  if ($OpenBrowser) {
    Start-Process $url
  }
}

function Show-Status {
  $apiOk = Test-HttpOk "http://$HostName`:$ApiPort/v4/health"
  $webOk = Test-HttpOk "http://$HostName`:$WebPort/index.html"
  $dbPath = Get-ConfiguredDbPath
  Write-Step ("API: " + $(if ($apiOk) { "running" } else { "stopped" }) + " http://$HostName`:$ApiPort")
  Write-Step ("Web: " + $(if ($webOk) { "running" } else { "stopped" }) + " http://$HostName`:$WebPort/index.html")
  Write-Step ("Database: " + $(if (Test-Path $dbPath) { "found " } else { "missing " }) + $dbPath)
}

function Show-Logs {
  foreach ($log in @($ApiOutLog, $ApiErrLog, $WebOutLog, $WebErrLog)) {
    if (Test-Path $log) {
      Write-Step $log
      Get-Content $log -Tail 40
    }
  }
}

Import-LocalEnvFile

switch ($Action) {
  "setup" { Setup-V4 }
  "start" { Start-V4 }
  "stop" {
    Stop-V4Processes
    Write-Step "Stopped"
  }
  "restart" {
    Stop-V4Processes
    Start-V4
  }
  "status" { Show-Status }
  "log" { Show-Logs }
}
