# ================================
# NGKsSystems Header Enforcer
# ================================
# Behavior:
# - Targets: src/**/*.js, src/**/*.jsx
# - Always inserts the NGKs header at the very top unless already present
# - If an existing descriptive header comment exists at the top, it is preserved
#   but pushed BELOW the NGKs header (with spacing).
# - Does NOT skip just because "NGKsSystems" appears somewhere in the file.
# - Uses a timestamped log to avoid file locks.
# - Writes UTF-8 (no BOM).
# ================================

$ErrorActionPreference = "Stop"

$root = Join-Path $PSScriptRoot "src"
$extensions = @("*.js", "*.jsx")

$logFile = Join-Path $PSScriptRoot ("header_apply_log_{0}.txt" -f (Get-Date -Format "yyyyMMdd_HHmmss"))
[IO.File]::WriteAllText($logFile, "")

function Write-Log {
    param([string]$line)
    [IO.File]::AppendAllText($logFile, $line + "`r`n")
}

function Normalize-Newlines {
    param([string]$text)
    return ($text -replace "`r`n", "`n")
}

function To-WindowsNewlines {
    param([string]$text)
    return ($text -replace "`n", "`r`n")
}

function Get-TopHeaderBlock {
    param([string]$text)

    $t = Normalize-Newlines $text

    # 1) Top block comment /* ... */ or /** ... */ (allow leading whitespace/newlines)
    if ($t -match '^(?<hdr>\s*/\*[\s\S]*?\*/\s*)') {
        return $Matches['hdr']
    }

    # 2) Top run of // line comments (allow leading whitespace)
    if ($t -match '^(?<hdr>(\s*//.*\n)+)') {
        return $Matches['hdr']
    }

    return $null
}

function Remove-TopHeaderBlock {
    param([string]$text, [string]$header)

    if ([string]::IsNullOrEmpty($header)) { return $text }

    $t = Normalize-Newlines $text
    $h = Normalize-Newlines $header

    if ($t.StartsWith($h)) {
        return $t.Substring($h.Length)
    }

    return $text
}

function Has-NGKsHeader {
    param([string]$text)

    # Detect OUR header only if it starts the file (ignoring whitespace)
    # Looks for:
    # /**
    #  * NGKsSystems
    #  * NGKsPlayer
    $t = Normalize-Newlines $text
    return ($t -match '^\s*/\*\*\s*\n\s*\*\s*NGKsSystems\s*\n\s*\*\s*NGKsPlayer\b')
}

if (-not (Test-Path $root)) {
    throw "Root path not found: $root"
}

$files = Get-ChildItem -Path $root -Recurse -File -Include $extensions

$changed = 0
$skipped = 0
$errors = 0

foreach ($f in $files) {
    try {
        $path = $f.FullName
        $contentRaw = Get-Content -LiteralPath $path -Raw

        if (Has-NGKsHeader $contentRaw) {
            $skipped++
            Write-Log ("SKIP (already has NGKs header): {0}" -f $path)
            continue
        }

        $existingHdr = Get-TopHeaderBlock $contentRaw
        $rest = Remove-TopHeaderBlock $contentRaw $existingHdr

        # Build header (10 lines inside the comment block, adjust as you want)
        # NOTE: Keep this stable—this is what Has-NGKsHeader detects.
        $rel = $path.Replace($PSScriptRoot + "\", "")
        $filename = $f.Name

        $header = @"
/**
 * NGKsSystems
 * NGKsPlayer
 *
 * File: $filename
 * Path: $rel
 * Purpose: TODO – describe responsibility
 * Design: Modular, reusable, shared core > copy/paste
 * Owner: Gene
 * Updated: $(Get-Date -Format "yyyy-MM-dd")
 */
"@

        $new = $header.TrimEnd() + "`n`n"

        if ($existingHdr) {
            # Preserve original header but push it down
            $new += ($existingHdr.TrimEnd() + "`n`n")
        }

        $new += $rest.TrimStart()

        # Write back with Windows newlines for consistency
        $newWin = To-WindowsNewlines (Normalize-Newlines $new)

        # Write UTF-8 without BOM
        $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
        [System.IO.File]::WriteAllText($path, $newWin, $utf8NoBom)

        $changed++
        Write-Log ("HEADER ADDED: {0}" -f $path)
    }
    catch {
        $errors++
        Write-Log ("ERROR: {0} :: {1}" -f $f.FullName, $_.Exception.Message)
    }
}

Write-Host "Header application complete."
Write-Host ("Changed={0}  Skipped={1}  Errors={2}" -f $changed, $skipped, $errors)
Write-Host ("Log: {0}" -f $logFile)
