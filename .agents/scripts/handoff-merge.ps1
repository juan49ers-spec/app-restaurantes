param(
    [Parameter(Mandatory=$true)]
    [string]$TaskID,
    
    [string]$Model = "ollama/qwen2.5-coder:7b",
    
    [int]$MaxRetries = 3
)

$ErrorActionPreference = "Continue"

$workspaceRoot = (Get-Item $PSScriptRoot).Parent.Parent.FullName
$worktreePath = Join-Path $workspaceRoot ".worktrees\$TaskID"

if (-not (Test-Path $worktreePath)) {
    Write-Error "Worktree $TaskID not found."
    exit 1
}

Push-Location $worktreePath

$retryCount = 0
$success = $false

while ($retryCount -le $MaxRetries) {
    if ($retryCount -gt 0) {
        Write-Host "--- Verification Attempt $($retryCount + 1) ---" -ForegroundColor Cyan
    } else {
        Write-Host "--- Initial Verification ---" -ForegroundColor Cyan
    }
    
    $lintFailed = $false
    $tscFailed = $false
    $testFailed = $false
    $errorOutput = ""

    # 1. Lint
    Write-Host "Running Linter..." -ForegroundColor Cyan
    $lintOutput = npm run lint 2>&1 | Out-String
    if ($LASTEXITCODE -ne 0) {
        $lintFailed = $true
        $errorOutput += "Lint Error:`n$lintOutput`n`n"
    }

    # 2. Type Check
    if (-not $lintFailed) {
        Write-Host "Running Type Check (tsc)..." -ForegroundColor Cyan
        $tscOutput = npx tsc --noEmit 2>&1 | Out-String
        if ($LASTEXITCODE -ne 0) {
            $tscFailed = $true
            $errorOutput += "TypeScript Error:`n$tscOutput`n`n"
        }
    }

    # 3. Tests
    if (-not ($lintFailed -or $tscFailed)) {
        $pkg = Get-Content package.json -Raw | ConvertFrom-Json
        if ($null -ne $pkg.scripts."test:ai") {
            Write-Host "Running Tests..." -ForegroundColor Cyan
            $testOutput = npm run test:ai 2>&1 | Out-String
            if ($LASTEXITCODE -ne 0) {
                $testFailed = $true
                $errorOutput += "Test Error:`n$testOutput`n`n"
            }
        }
    }

    if (-not ($lintFailed -or $tscFailed -or $testFailed)) {
        $success = $true
        break
    }

    if ($retryCount -lt $MaxRetries) {
        Write-Host "Errors detected. Auto-healing with OpenCode (Attempt $($retryCount + 1)/$MaxRetries)..." -ForegroundColor Yellow
        $prompt = "El código actual tiene errores críticos de validación. Por favor, analízalos y arréglalos sin alterar la arquitectura general:`n$errorOutput"
        
        $promptFile = ".agents/logs/healing_prompt_$retryCount.txt"
        $prompt | Out-File -FilePath "$promptFile" -Encoding utf8
        
        $opencodeLog = ".agents/logs/opencode_healing_$retryCount.log"
        Write-Host "Delegating to $Model for auto-fix..." -ForegroundColor DarkGray
        
        # Call opencode synchronously for the fix
        opencode run -m "$Model" "Lee el archivo $promptFile y soluciona los errores descritos en él modificando los archivos correctos de este worktree." > $opencodeLog 2>&1
    }

    $retryCount++
}

Pop-Location

if (-not $success) {
    # Leave the worktree untouched so the developer can inspect it
    Write-Error "Fallaron todas las comprobaciones tras $MaxRetries intentos de auto-sanación. Abortando auto-merge."
    exit 1
}

Write-Host "All verification checks passed. Merging into base branch and cleaning up..." -ForegroundColor Green
Set-Location $workspaceRoot
git merge $TaskID
if ($LASTEXITCODE -ne 0) {
    Write-Error "Git merge encountered conflicts. Aborting cleanup."
    exit 1
}

git worktree remove ".worktrees/$TaskID" --force
git branch -D $TaskID

Write-Host "Auto-merge and cleanup completed successfully." -ForegroundColor Green
