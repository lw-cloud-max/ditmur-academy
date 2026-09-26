# Ditmur Academy: temporarily disable Lesson Plan and Scheme of Work.
# Run with Windows PowerShell 5.1+ from the extracted ZIP folder.
# This edits only the named feature directories, navigation links, and tsconfig.json.
param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectPath
)

$ErrorActionPreference = 'Stop'
# Windows PowerShell's Set-Content -Encoding UTF8 adds a BOM. Turbopack in
# Next.js 16 rejects a BOM in tsconfig.json and then reports many false
# 'Module not found' errors. Always write UTF-8 WITHOUT BOM.
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
function Test-Utf8Bom([string]$path) {
    $bytes = [System.IO.File]::ReadAllBytes($path)
    return ($bytes.Length -ge 3 -and $bytes[0] -eq 239 -and $bytes[1] -eq 187 -and $bytes[2] -eq 191)
}
$root = (Resolve-Path -LiteralPath $ProjectPath).Path
if (-not (Test-Path -LiteralPath (Join-Path $root 'package.json') -PathType Leaf) -or
    -not (Test-Path -LiteralPath (Join-Path $root 'src/app') -PathType Container) -or
    -not (Test-Path -LiteralPath (Join-Path $root '.git'))) {
    throw 'ProjectPath must be the ROOT of your Git checkout (with package.json, src/app and .git). No changes made.'
}

$backupRoot = Join-Path (Split-Path -Parent $root) ('ditmur-fix-backup-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
$featureDirs = @(
    'src/app/api/ai/lesson-plan',
    'src/app/api/lesson-plans',
    'src/app/api/schemes',
    'src/app/lesson-plan',
    'src/app/schemes',
    'school-app (25)/src/app/api/ai/lesson-plan',
    'school-app (25)/src/app/api/lesson-plans',
    'school-app (25)/src/app/api/schemes',
    'school-app (25)/src/app/lesson-plan',
    'school-app (25)/src/app/schemes'
)
$editableFiles = @(
    'src/components/Sidebar.tsx',
    'src/components/MobileNav.tsx',
    'src/components/MobileMenuPortal.tsx',
    'tsconfig.json'
)

# Back up ONLY the paths this fix may touch, OUTSIDE the Git checkout.
$toBackUp = @($featureDirs + $editableFiles)
foreach ($relative in $toBackUp) {
    $source = Join-Path $root $relative
    if (Test-Path -LiteralPath $source) {
        $destination = Join-Path $backupRoot $relative
        New-Item -ItemType Directory -Path (Split-Path -Parent $destination) -Force | Out-Null
        Copy-Item -LiteralPath $source -Destination $destination -Recurse -Force
    }
}
Write-Host "Backup (outside the repo): $backupRoot"

foreach ($relative in $featureDirs) {
    $target = Join-Path $root $relative
    if (Test-Path -LiteralPath $target) {
        Remove-Item -LiteralPath $target -Recurse -Force
        Write-Host "Removed: $relative"
    }
}

# Edit menu entries by their exact route. Do NOT replace the entire menu files:
# your other local menu changes are preserved.
$removedEntry = '(?m)^[^\r\n]*\bpath:\s*[''"]/(?:lesson-plan|schemes)[''"][^\r\n]*(?:\r?\n|$)'
foreach ($relative in $editableFiles) {
    if ($relative -eq 'tsconfig.json') { continue }
    $target = Join-Path $root $relative
    if (-not (Test-Path -LiteralPath $target -PathType Leaf)) { continue }
    $original = (Get-Content -LiteralPath $target -Raw -Encoding UTF8).TrimStart([char]0xFEFF)
    $updated = [regex]::Replace($original, $removedEntry, '')
    if ($updated -cne $original -or (Test-Utf8Bom $target)) {
        [System.IO.File]::WriteAllText($target, $updated, $utf8NoBom)
        Write-Host "Updated menu links / encoding: $relative"
    }
}

# Keep old, unrelated backup projects out of the TypeScript build. Retain any
# existing tsconfig excludes; do not overwrite the rest of tsconfig.json.
$tsconfig = Join-Path $root 'tsconfig.json'
if (-not (Test-Path -LiteralPath $tsconfig -PathType Leaf)) {
    throw 'tsconfig.json is missing. See backup path above.'
}
$original = (Get-Content -LiteralPath $tsconfig -Raw -Encoding UTF8).TrimStart([char]0xFEFF)
$excludePattern = '(?s)("exclude"\s*:\s*)\[([^\]]*)\]'
$match = [regex]::Match($original, $excludePattern)
if (-not $match.Success) {
    throw 'Cannot find a simple "exclude": [...] in tsconfig.json. The feature files and menu links were removed, but update tsconfig manually after reviewing the backup.'
}
$existing = @(('[{0}]' -f $match.Groups[2].Value) | ConvertFrom-Json)
$new = New-Object System.Collections.Generic.List[string]
foreach ($item in $existing) { if ($null -ne $item) { $new.Add([string]$item) } }
foreach ($item in @('school-app (25)', 'school-app-auth-update', 'school-website')) {
    if (-not $new.Contains($item)) { $new.Add($item) }
}
$formatted = '[' + (($new | ForEach-Object { '"' + $_ + '"' }) -join ', ') + ']'
$replacement = $match.Groups[1].Value + $formatted
$updated = $original.Substring(0, $match.Index) + $replacement + $original.Substring($match.Index + $match.Length)
if ($updated -cne $original -or (Test-Utf8Bom $tsconfig)) {
    [System.IO.File]::WriteAllText($tsconfig, $updated, $utf8NoBom)
    Write-Host 'Updated tsconfig.json excludes / removed UTF-8 BOM.'
}

Write-Host ''
Write-Host 'Fix applied. Review git status and run npm run build from your project root BEFORE committing.'
Write-Host 'Your unrelated working-tree changes have not been replaced by this script.'
Write-Host "If needed, original affected files are backed up at: $backupRoot"
