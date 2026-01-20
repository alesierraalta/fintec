<#
.SYNOPSIS
    Syncs skill metadata to AGENTS.md Auto-invoke sections.

.DESCRIPTION
    Reads all .agent/skills/*/SKILL.md files, extracts metadata.auto_invoke,
    and updates the Auto-invoke Skills table in AGENTS.md.

.EXAMPLE
    .\sync.ps1
    Syncs all skills to AGENTS.md
#>

$ErrorActionPreference = "Stop"

# Paths - go up from assets -> skill-sync -> skills -> .agent -> repo root
$RepoRoot = $PSScriptRoot | Split-Path -Parent | Split-Path -Parent | Split-Path -Parent | Split-Path -Parent
$AgentsFile = Join-Path $RepoRoot "AGENTS.md"
$SkillsDir = Join-Path $RepoRoot ".agent\skills"

Write-Host "Syncing skills to AGENTS.md..." -ForegroundColor Cyan
Write-Host "Repo Root: $RepoRoot"
Write-Host "Skills Dir: $SkillsDir"

if (-not (Test-Path $AgentsFile)) {
    Write-Error "AGENTS.md not found at $AgentsFile"
    exit 1
}

if (-not (Test-Path $SkillsDir)) {
    Write-Error "Skills directory not found at $SkillsDir"
    exit 1
}

$AutoInvokeEntries = @()
$SkillFiles = Get-ChildItem -Path $SkillsDir -Recurse -Filter "SKILL.md" -ErrorAction SilentlyContinue

foreach ($File in $SkillFiles) {
    $Content = Get-Content $File.FullName -Raw
    
    # Extract Name
    if ($Content -match "name:\s*([a-zA-Z0-9_-]+)") {
        $SkillName = $Matches[1].Trim()
    }
    else { 
        Write-Warning "Skipping $($File.Name) - No name found"
        continue 
    }

    # Extract Auto Invoke - supports both single string and list format
    if ($Content -match "(?ms)auto_invoke:\s*(.+?)(?=\n[a-z]|\nallowed|\n---|\z)") {
        $RawInvoke = $Matches[1]
        
        # Check if it's a list format (starts with -)
        if ($RawInvoke -match "^\s*-\s*") {
            # List format - extract each line starting with -
            $Lines = $RawInvoke -split "`n"
            foreach ($Line in $Lines) {
                if ($Line -match "^\s*-\s*[`"']?(.+?)[`"']?\s*$") {
                    $Item = $Matches[1].Trim()
                    if (-not [string]::IsNullOrWhiteSpace($Item)) {
                        $AutoInvokeEntries += [PSCustomObject]@{ Action = $Item; Skill = $SkillName }
                    }
                }
            }
        }
        else {
            # Single line format - remove quotes
            $Item = $RawInvoke.Trim()
            $Item = $Item -replace "^[`"']", "" -replace "[`"']$", ""
            if (-not [string]::IsNullOrWhiteSpace($Item)) {
                $AutoInvokeEntries += [PSCustomObject]@{ Action = $Item; Skill = $SkillName }
            }
        }
    }
}

# Sort by Action
$AutoInvokeEntries = $AutoInvokeEntries | Sort-Object Action

Write-Host "Found $($AutoInvokeEntries.Count) auto-invoke triggers" -ForegroundColor Blue

# Build Table
$TableLines = @()
$TableLines += "| Action | Skill |"
$TableLines += "| -------------------------------------------------------------- | --------------- |"

foreach ($Entry in $AutoInvokeEntries) {
    $ActionCell = $Entry.Action
    $SkillCell = "``$($Entry.Skill)``"
    $TableLines += "| $ActionCell | $SkillCell |"
}

$TableString = $TableLines -join "`n"

# Update AGENTS.md
$AgentsContent = Get-Content $AgentsFile -Raw

# Find and replace the Auto-invoke Skills table
# Pattern: finds the section header, intro text, and table
$Pattern = "(?ms)(### Auto-invoke Skills\s+When performing these actions.*?:\s*)\| Action.*?(?=\n\n---|\n\n##|\z)"

if ($AgentsContent -match $Pattern) {
    $NewContent = $AgentsContent -replace $Pattern, ('$1' + $TableString)
    
    # Write back with UTF8 encoding (no BOM)
    $Utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($AgentsFile, $NewContent, $Utf8NoBom)
    
    Write-Host "[SUCCESS] Updated AGENTS.md with $($AutoInvokeEntries.Count) auto-invoke triggers." -ForegroundColor Green
}
else {
    Write-Warning "Could not find '### Auto-invoke Skills' section with expected format in AGENTS.md"
    Write-Host "Make sure AGENTS.md has a section like:"
    Write-Host "### Auto-invoke Skills"
    Write-Host ""
    Write-Host "When performing these actions, ALWAYS invoke the corresponding skill FIRST:"
    Write-Host ""
    Write-Host "| Action | Skill |"
    Write-Host "| --- | --- |"
}
