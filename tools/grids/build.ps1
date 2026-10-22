param([string]$GodotBin = 'godot')
$ErrorActionPreference = 'Stop'
$gridsOutput = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\grids'))
New-Item -ItemType Directory -Force -Path $gridsOutput | Out-Null
& $GodotBin --headless --path (Join-Path $PSScriptRoot 'godot') --export-release Web (Join-Path $gridsOutput 'index.html')
if ($LASTEXITCODE -ne 0) { throw 'Godot Web export failed.' }
python (Join-Path $PSScriptRoot 'scripts\package_browser.py') $gridsOutput
if ($LASTEXITCODE -ne 0) { throw 'Python engine packaging failed.' }
