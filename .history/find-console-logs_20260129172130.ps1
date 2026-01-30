# find-console-logs.ps1 - Find remaining console.log statements in the codebase

Write-Host "`n🔍 Searching for console.log statements...`n" -ForegroundColor Cyan

# Exclude certain directories
$excludeDirs = @(
    'node_modules',
    'dist',
    'build',
    '.git',
    'archived',
    'test_music',
    'analysis_results',
    'snapshots'
)

# Find all console.log statements
$results = Get-ChildItem -Recurse -Include *.js,*.cjs,*.jsx,*.mjs -Exclude *.min.js |
    Where-Object { 
        $exclude = $false
        foreach ($dir in $excludeDirs) {
            if ($_.FullName -match [regex]::Escape($dir)) {
                $exclude = $true
                break
            }
        }
        -not $exclude
    } |
    Select-String -Pattern "console\.(log|info|warn|debug)" |
    Where-Object { $_.Line -notmatch "^\s*//" } # Exclude commented lines

# Group by file
$grouped = $results | Group-Object Path

Write-Host "Found console statements in $($grouped.Count) files:`n" -ForegroundColor Yellow

# Show top offenders
$topFiles = $grouped | Sort-Object Count -Descending | Select-Object -First 10

foreach ($file in $topFiles) {
    $relativePath = $file.Name -replace [regex]::Escape($PWD.Path), '.'
    Write-Host "  📄 $relativePath" -ForegroundColor White
    Write-Host "     $($file.Count) console statements`n" -ForegroundColor Gray
}

Write-Host "`n💡 Recommendations:`n" -ForegroundColor Cyan

# Identify high-priority files to clean
$highPriority = @()
foreach ($file in $grouped) {
    if ($file.Count -gt 20) {
        $highPriority += $file.Name
    }
}

if ($highPriority.Count -gt 0) {
    Write-Host "High Priority - Files with 20+ console statements:" -ForegroundColor Yellow
    foreach ($file in $highPriority) {
        $relativePath = $file -replace [regex]::Escape($PWD.Path), '.'
        Write-Host "  • $relativePath" -ForegroundColor Red
    }
    Write-Host ""
}

Write-Host "🛠️  To reduce logging further, consider:" -ForegroundColor Cyan
Write-Host "  1. Run the app with: pnpm dev:quiet (only warnings)" -ForegroundColor White
Write-Host "  2. Run the app with: pnpm dev:silent (only errors)" -ForegroundColor White
Write-Host "  3. Update electron/logger.cjs to disable specific modules" -ForegroundColor White
Write-Host "  4. Replace console.log with logger calls in high-priority files" -ForegroundColor White

Write-Host "`n✅ Use the logger.cjs module for cleaner, controllable logging!`n" -ForegroundColor Green
