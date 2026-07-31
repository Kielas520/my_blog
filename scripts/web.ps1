[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet('start', 'check', 'stop')]
    [string]$Action = 'check'
)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$defaultRoot = Split-Path -Parent $scriptDir
$projectRoot = if ($env:KIELAS_WEB_ROOT) { $env:KIELAS_WEB_ROOT } else { $defaultRoot }
$projectRoot = [System.IO.Path]::GetFullPath($projectRoot)
$pidFile = Join-Path $projectRoot '.web-service.pid'
$logFile = Join-Path $projectRoot '.web-service.log'
$errorLogFile = Join-Path $projectRoot '.web-service.error.log'
$hostName = if ($env:KIELAS_WEB_HOST) { $env:KIELAS_WEB_HOST } else { '127.0.0.1' }
$port = if ($env:KIELAS_WEB_PORT) { [int]$env:KIELAS_WEB_PORT } else { 1314 }
$url = "http://${hostName}:$port/"

function Get-WebProcess {
    if (-not (Test-Path -LiteralPath $pidFile)) { return $null }

    $savedPid = (Get-Content -LiteralPath $pidFile -Raw).Trim()
    if ($savedPid -notmatch '^\d+$') { return $null }
    return Get-Process -Id ([int]$savedPid) -ErrorAction SilentlyContinue
}

function Stop-WebService {
    $process = Get-WebProcess
    if (-not $process) {
        Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
        Write-Host 'Web service is not running.'
        return
    }

    Stop-Process -Id $process.Id -Force
    $process.WaitForExit()
    Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
    Write-Host "Web service stopped (PID $($process.Id))."
}

function Test-WebService {
    $process = Get-WebProcess
    if (-not $process) {
        Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
        Write-Host 'Web service is stopped.'
        return $false
    }

    try {
        $response = Invoke-WebRequest -Uri $url -Method Head -TimeoutSec 3 -UseBasicParsing
        Write-Host "Web service is running (PID $($process.Id), HTTP $($response.StatusCode), $url)."
        return $true
    }
    catch {
        Write-Host "Web process exists (PID $($process.Id)), but $url is not responding."
        return $false
    }
}

function Start-WebService {
    if (Get-WebProcess) { Stop-WebService }

    Push-Location $projectRoot
    try {
        Write-Host 'Building website...'
        & npm.cmd run build
        if ($LASTEXITCODE -ne 0) { throw "Build failed with exit code $LASTEXITCODE." }

        $node = (Get-Command node.exe -ErrorAction Stop).Source
        $sirv = Join-Path $projectRoot 'node_modules\sirv-cli\bin.js'
        if (-not (Test-Path -LiteralPath $sirv)) {
            throw 'sirv-cli is missing. Run npm install first.'
        }

        $arguments = @($sirv, 'dist', '--host', $hostName, '--port', "$port", '--quiet', '--etag')
        $process = Start-Process -FilePath $node -ArgumentList $arguments -WorkingDirectory $projectRoot `
            -RedirectStandardOutput $logFile -RedirectStandardError $errorLogFile -WindowStyle Hidden -PassThru
        Set-Content -LiteralPath $pidFile -Value $process.Id -NoNewline

        Start-Sleep -Milliseconds 800
        if (-not (Test-WebService)) {
            throw "Service failed to start. See $logFile"
        }
    }
    finally {
        Pop-Location
    }
}

switch ($Action) {
    'start' { Start-WebService }
    'check' { if (-not (Test-WebService)) { exit 1 } }
    'stop'  { Stop-WebService }
}
