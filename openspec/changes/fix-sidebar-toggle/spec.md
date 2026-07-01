# Spec: Fix Sidebar Toggle

## Overview

Add a toggle button to the desktop header to allow users to open and close the sidebar manually, resolving the issue where the sidebar gets stuck in an unexpected state.

## Scenarios

### Scenario 1: Desktop user toggles sidebar

- **Given** the user is viewing the application on a desktop (`isMobile` is false)
- **When** the user clicks the menu button on the left side of the header
- **Then** the sidebar toggles between expanded (`w-64`) and minimized (`w-16`) states

### Scenario 2: Mobile user toggles sidebar

- **Given** the user is viewing the application on a mobile device
- **When** the user clicks the menu button on the left side of the header
- **Then** the sidebar toggles its overlay visibility as before (no regression)
