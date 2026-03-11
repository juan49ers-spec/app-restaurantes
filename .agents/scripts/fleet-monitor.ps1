param(
    [switch]$RunOnce
)

$ErrorActionPreference = "SilentlyContinue"
$projectRoot = Split-Path -Parent $PSScriptRoot
$worktreesDir = Join-Path $projectRoot ".worktrees"

function Show-Dashboard {
    Clear-Host
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host " 🚀 ANTIGRAVITY FLEET MONITOR" -ForegroundColor Cyan
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host "Time: $(Get-Date -Format 'HH:mm:ss')"
    Write-Host ""
    
    if (-not (Test-Path $worktreesDir)) {
        Write-Host "No active worktrees found (0 agents running)." -ForegroundColor Green
    } else {
        $worktrees = Get-ChildItem -Path $worktreesDir -Directory
        
        if ($worktrees.Count -eq 0) {
            Write-Host "0 active agents running." -ForegroundColor Green
        } else {
            Write-Host "$($worktrees.Count) active agent(s) running." -ForegroundColor Yellow
            Write-Host ""
            
            foreach ($wt in $worktrees) {
                Write-Host "-----------------------------------------"
                Write-Host "=> Agent Worker: $($wt.Name)" -ForegroundColor Magenta
                
                $logsDir = Join-Path $wt.FullName ".agents\logs"
                if (Test-Path $logsDir) {
                    $latestLog = Get-ChildItem -Path $logsDir -Filter "*.log" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
                    
                    if ($latestLog) {
                        Write-Host "Status: " -NoNewline
                        # Basic heuristic to check if done based on log content
                        $tail = Get-Content $latestLog.FullName -Tail 20
                        if ($tail -match "Exit code: 0" -or $tail -match "Done") {
                            Write-Host "COMPLETED" -ForegroundColor Green
                        } elseif ($tail -match "Error" -or $tail -match "Exception") {
                            Write-Host "ERROR/FAILED" -ForegroundColor Red
                        } else {
                            Write-Host "RUNNING" -ForegroundColor Cyan
                        }

                        Write-Host "Log File: $($latestLog.Name)"
                        Write-Host "Last Update: $($latestLog.LastWriteTime)"
                        Write-Host "--- Output Tail (Last 5 lines) ---" -ForegroundColor DarkGray
                        $tailLog = Get-Content $latestLog.FullName -Tail 5
                        if ($tailLog) {
                            $tailLog | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
                        }
                    } else {
                        Write-Host "Status: Initializing OpenCode..." -ForegroundColor Yellow
                    }
                } else {
                    Write-Host "Status: Setting up environment (npm install)..." -ForegroundColor Yellow
                }
            }
            Write-Host "-----------------------------------------"
        }
    }
    
    Write-Host ""
    Write-Host "Press Ctrl+C to exit dashboard." -ForegroundColor DarkGray
}

if ($RunOnce) {
    Show-Dashboard
} else {
    while ($true) {
        Show-Dashboard
        Start-Sleep -Seconds 2
    }
}