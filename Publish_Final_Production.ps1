param(
  [string]$RepoPath = ".",
  [switch]$Push,
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$script = Join-Path $PSScriptRoot "apply_final_production.py"

$argsList = @($script, "--repo", $RepoPath)
if ($Push) { $argsList += "--push" }
if ($SkipBuild) { $argsList += "--skip-build" }

python @argsList
