# ================================
# NGKsSystems Header Enforcer
# ================================

$root = "src"
$extensions = @("*.js", "*.jsx")
$logFile = "header_apply_log.txt"

Clear-Content -ErrorAction SilentlyContinue $logFile

Get-ChildItem -Path $root -Recurse -Include $extensions | ForEach-Object {

    $file = $_.FullName
    $content = Get-Content $file -Raw

    # Skip if header already exists
    if ($content -match "NGKsSystems") {
        return
    }

    $filename = $_.Name

    $header = @"
/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: $filename
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
"@

    # Insert header
    $newContent = $header + "`n" + $content
    Set-Content -Path $file -Value $newContent -Encoding UTF8

    Add-Content $logFile "HEADER ADDED: $file"
}

Write-Host "Header application complete."
Write-Host "See $logFile for details."
