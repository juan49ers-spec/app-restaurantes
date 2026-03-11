param(
    [Parameter(Mandatory=$true)]
    [string]$TaskID
)

$ErrorActionPreference = "Stop"

$workspaceRoot = (Get-Item $PSScriptRoot).Parent.Parent.FullName
$templatePath = Join-Path $workspaceRoot ".worktrees\.template"
$worktreePath = Join-Path $workspaceRoot ".worktrees\$TaskID"

if (Test-Path $worktreePath) {
    Write-Error "Worktree $TaskID already exists."
    exit 1
}

Write-Host "Creating isolated agent worktree for '$TaskID'..." -ForegroundColor Cyan
Set-Location $workspaceRoot
git worktree add $worktreePath -b $TaskID

$templateNodeModules = Join-Path $templatePath "node_modules"
if (Test-Path $templateNodeModules) {
    Write-Host "Fast Spin-up: Using pre-warmed node_modules template..." -ForegroundColor Green
    Copy-Item -Path $templateNodeModules -Destination $worktreePath -Recurse -Force
} else {
    Write-Host "Cold Start: No template found. Doing fresh npm install (slower)..." -ForegroundColor Yellow
    Push-Location $worktreePath
    npm install --prefer-offline --no-audit
    
    # Save as template for next time
    Write-Host "Saving as template for future sub-agents..." -ForegroundColor Cyan
    New-Item -ItemType Directory -Force -Path $templatePath | Out-Null
    Copy-Item -Path (Join-Path $worktreePath "node_modules") -Destination $templatePath -Recurse -Force
    Pop-Location
}

Write-Host "Agent environment ready at: .worktrees/$TaskID" -ForegroundColor Green
