<#
.SYNOPSIS
    Setup AI Skills for any project.

.DESCRIPTION
    Configures AI coding assistants that follow agentskills.io standard:
      - Claude Code: .claude/skills/ junction + CLAUDE.md copies
      - Gemini CLI: .gemini/skills/ junction + GEMINI.md copies
      - Codex (OpenAI): .codex/skills/ junction + AGENTS.md (native)
      - GitHub Copilot: .github/copilot-instructions.md copy

.PARAMETER All
    Configure all AI assistants

.PARAMETER Claude
    Configure Claude Code

.PARAMETER Gemini
    Configure Gemini CLI

.PARAMETER Codex
    Configure Codex (OpenAI)

.PARAMETER Copilot
    Configure GitHub Copilot

.EXAMPLE
    .\setup.ps1 -All
    Configures all AI assistants

.EXAMPLE
    .\setup.ps1 -Claude -Gemini
    Configures only Claude and Gemini
#>

[CmdletBinding()]
param(
    [switch]$All,
    [switch]$Claude,
    [switch]$Gemini,
    [switch]$Codex,
    [switch]$Copilot,
    [switch]$Help
)

$ErrorActionPreference = 'Stop'

# Resolve paths
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent (Split-Path -Parent $ScriptDir)
$SkillsSource = $ScriptDir

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

function Show-Help {
    Write-Host "Usage: .\setup.ps1 [OPTIONS]" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Configure AI coding assistants for your project."
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -All       Configure all AI assistants"
    Write-Host "  -Claude    Configure Claude Code"
    Write-Host "  -Gemini    Configure Gemini CLI"
    Write-Host "  -Codex     Configure Codex (OpenAI)"
    Write-Host "  -Copilot   Configure GitHub Copilot"
    Write-Host "  -Help      Show this help message"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\setup.ps1 -All              # All AI assistants"
    Write-Host "  .\setup.ps1 -Claude -Codex    # Only Claude and Codex"
}

function Copy-AgentsMd {
    param([string]$TargetName)
    
    $count = 0
    $agentsFiles = Get-ChildItem -Path $RepoRoot -Filter "AGENTS.md" -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch 'node_modules|\.git' }
    
    foreach ($file in $agentsFiles) {
        $targetPath = Join-Path $file.DirectoryName $TargetName
        Copy-Item $file.FullName $targetPath -Force
        $count++
    }
    
    Write-Host "  [OK] Copied $count AGENTS.md -> $TargetName" -ForegroundColor Green
}

function New-SkillsJunction {
    param(
        [string]$AssistantDir,
        [string]$AssistantName
    )
    
    $targetDir = Join-Path $RepoRoot $AssistantDir
    $skillsLink = Join-Path $targetDir "skills"
    
    # Create assistant directory if needed
    if (-not (Test-Path $targetDir)) {
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    }
    
    # Remove existing skills link/folder
    if (Test-Path $skillsLink) {
        $item = Get-Item $skillsLink -Force
        if ($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) {
            cmd /c rmdir "$skillsLink" 2>$null
        }
        else {
            $backupName = "skills.backup." + (Get-Date -Format 'yyyyMMddHHmmss')
            Rename-Item $skillsLink (Join-Path $targetDir $backupName)
        }
    }
    
    # Create junction (doesn't require admin privileges)
    cmd /c mklink /J "$skillsLink" "$SkillsSource" | Out-Null
    Write-Host "  [OK] $AssistantDir/skills -> .agent/skills/" -ForegroundColor Green
}

function Initialize-ClaudeAssistant {
    New-SkillsJunction -AssistantDir ".claude" -AssistantName "Claude Code"
    Copy-AgentsMd -TargetName "CLAUDE.md"
}

function Initialize-GeminiAssistant {
    New-SkillsJunction -AssistantDir ".gemini" -AssistantName "Gemini CLI"
    Copy-AgentsMd -TargetName "GEMINI.md"
}

function Initialize-CodexAssistant {
    New-SkillsJunction -AssistantDir ".codex" -AssistantName "Codex"
    Write-Host "  [OK] Codex uses AGENTS.md natively" -ForegroundColor Green
}

function Initialize-CopilotAssistant {
    $agentsMd = Join-Path $RepoRoot "AGENTS.md"
    if (Test-Path $agentsMd) {
        $ghDir = Join-Path $RepoRoot ".github"
        if (-not (Test-Path $ghDir)) {
            New-Item -ItemType Directory -Path $ghDir -Force | Out-Null
        }
        Copy-Item $agentsMd (Join-Path $ghDir "copilot-instructions.md") -Force
        Write-Host "  [OK] AGENTS.md -> .github/copilot-instructions.md" -ForegroundColor Green
    }
    else {
        Write-Host "  [WARN] AGENTS.md not found at repo root" -ForegroundColor Yellow
    }
}

# =============================================================================
# MAIN
# =============================================================================

if ($Help) {
    Show-Help
    exit 0
}

# Handle -All flag
if ($All) {
    $Claude = $true
    $Gemini = $true
    $Codex = $true
    $Copilot = $true
}

Write-Host ""
Write-Host "AI Skills Setup" -ForegroundColor Cyan
Write-Host "===============" -ForegroundColor Cyan
Write-Host ""

# Count skills
$skillCount = (Get-ChildItem -Path $SkillsSource -Filter "SKILL.md" -Recurse -ErrorAction SilentlyContinue).Count

if ($skillCount -eq 0) {
    Write-Host "No skills found in $SkillsSource" -ForegroundColor Red
    exit 1
}

Write-Host "Found $skillCount skills to configure" -ForegroundColor Blue
Write-Host ""

# Check if at least one selected
if (-not ($Claude -or $Gemini -or $Codex -or $Copilot)) {
    Write-Host "No AI assistants selected. Use -All or specific flags." -ForegroundColor Yellow
    Write-Host ""
    Show-Help
    exit 0
}

# Count total steps
$total = 0
if ($Claude) { $total++ }
if ($Gemini) { $total++ }
if ($Codex) { $total++ }
if ($Copilot) { $total++ }

$step = 1

# Run selected setups
if ($Claude) {
    Write-Host "[$step/$total] Setting up Claude Code..." -ForegroundColor Yellow
    Initialize-ClaudeAssistant
    $step++
}

if ($Gemini) {
    Write-Host "[$step/$total] Setting up Gemini CLI..." -ForegroundColor Yellow
    Initialize-GeminiAssistant
    $step++
}

if ($Codex) {
    Write-Host "[$step/$total] Setting up Codex (OpenAI)..." -ForegroundColor Yellow
    Initialize-CodexAssistant
    $step++
}

if ($Copilot) {
    Write-Host "[$step/$total] Setting up GitHub Copilot..." -ForegroundColor Yellow
    Initialize-CopilotAssistant
}

# =============================================================================
# SUMMARY
# =============================================================================
Write-Host ""
Write-Host "[SUCCESS] Configured $skillCount AI skills!" -ForegroundColor Green
Write-Host ""
Write-Host "Configured:"
if ($Claude) { Write-Host "  - Claude Code:    .claude/skills/ + CLAUDE.md" }
if ($Codex) { Write-Host "  - Codex (OpenAI): .codex/skills/ + AGENTS.md (native)" }
if ($Gemini) { Write-Host "  - Gemini CLI:     .gemini/skills/ + GEMINI.md" }
if ($Copilot) { Write-Host "  - GitHub Copilot: .github/copilot-instructions.md" }
Write-Host ""
Write-Host "Note: Restart your AI assistant to load the skills." -ForegroundColor Blue
Write-Host "      AGENTS.md is the source of truth - edit it, then re-run this script." -ForegroundColor Blue
