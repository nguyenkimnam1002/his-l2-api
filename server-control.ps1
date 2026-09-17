param(
  [ValidateSet('start', 'stop')]
  [string]$Action
)

$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$entryPoint = Join-Path $projectDir 'src\server.js'
$pidFile = Join-Path $projectDir '.server.pid'
$port = if ($env:PORT) { [int]$env:PORT } else { 8090 }
$configFile = Join-Path $projectDir 'config.json'
if (-not $env:PORT -and (Test-Path -LiteralPath $configFile)) {
  $configuredPort = (Get-Content -LiteralPath $configFile -Raw | ConvertFrom-Json).port
  if ($configuredPort) { $port = [int]$configuredPort }
}

function Get-ManagedProcess {
  if (-not (Test-Path -LiteralPath $pidFile)) { return $null }
  $savedPid = 0
  if (-not [int]::TryParse((Get-Content -LiteralPath $pidFile -Raw).Trim(), [ref]$savedPid)) { return $null }
  $process = Get-CimInstance Win32_Process -Filter "ProcessId = $savedPid" -ErrorAction SilentlyContinue
  if (-not $process) { return $null }
  if ($process.Name -notin @('node.exe', 'node')) { return $null }
  if ($process.CommandLine -notlike "*$entryPoint*") { return $null }
  return $process
}

if ($Action -eq 'stop') {
  $managed = Get-ManagedProcess
  if (-not $managed) {
    Write-Host 'Server do start-server.bat tao khong chay.'
    exit 0
  }
  Stop-Process -Id $managed.ProcessId -ErrorAction Stop
  Remove-Item -LiteralPath $pidFile -ErrorAction SilentlyContinue
  Write-Host "Da dung HIS L2 API (PID $($managed.ProcessId))."
  exit 0
}

$managed = Get-ManagedProcess
if ($managed) {
  Write-Host "HIS L2 API da chay (PID $($managed.ProcessId))."
  exit 0
}

$listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if ($listener) {
  Write-Error "Cong $port da co server khac su dung. Khong start them va khong dung server do."
  exit 1
}

$nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
if (-not $nodeCommand) {
  Write-Error 'Khong tim thay Node.js. Hay cai Node.js va them node.exe vao PATH.'
  exit 1
}

$nodeProcess = Start-Process -FilePath $nodeCommand.Source -ArgumentList ('"' + $entryPoint + '"') -WorkingDirectory $projectDir -WindowStyle Hidden -PassThru
Start-Sleep -Seconds 1
if ($nodeProcess.HasExited) {
  Write-Error "Server thoat ngay khi khoi dong (exit code $($nodeProcess.ExitCode)). Kiem tra cau hinh va cong dang su dung."
  exit 1
}

Set-Content -LiteralPath $pidFile -Value $nodeProcess.Id -NoNewline
Write-Host "Da start HIS L2 API (PID $($nodeProcess.Id)). Mo http://localhost:$port"
