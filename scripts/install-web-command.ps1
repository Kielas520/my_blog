$ErrorActionPreference = 'Stop'

$scriptDir = [System.IO.Path]::GetFullPath((Split-Path -Parent $MyInvocation.MyCommand.Path))
$projectRoot = Split-Path -Parent $scriptDir

[Environment]::SetEnvironmentVariable('KIELAS_WEB_ROOT', $projectRoot, 'User')

$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
$entries = @($userPath -split ';' | Where-Object { $_ })
if ($entries -notcontains $scriptDir) {
    $newPath = (@($entries) + $scriptDir) -join ';'
    [Environment]::SetEnvironmentVariable('Path', $newPath, 'User')
}

$env:KIELAS_WEB_ROOT = $projectRoot
if (($env:Path -split ';') -notcontains $scriptDir) { $env:Path += ";$scriptDir" }

Write-Host "Installed web command for the current user."
Write-Host "KIELAS_WEB_ROOT=$projectRoot"
Write-Host 'Open a new terminal, then use: web start | web check | web stop'
