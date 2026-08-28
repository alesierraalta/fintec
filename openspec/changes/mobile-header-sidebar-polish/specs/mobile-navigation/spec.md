# Mobile Navigation Specification

## Purpose

Provide one predictable, accessible mobile navigation model without changing desktop behavior, route semantics, download behavior, or data/auth behavior.

## Requirements

### Requirement: Five primary routes remain available in BottomNav

The mobile primary navigation MUST expose exactly five primary routes: Inicio, Cuentas, Transacciones, Transferir, and Metas. Each item MUST provide a readable label, an active-page state, and a touch target of at least 44×44 CSS pixels. The Transacciones label MUST be used for `/transactions` and MUST wrap or fit rather than truncate or change to “Gastos”.

#### Scenario: Primary route access

- GIVEN a mobile viewport at 320, 360, 390, or 430px wide
- WHEN a user views or activates BottomNav
- THEN all five labels and links are present, readable, non-overlapping, and each target is at least 44×44px

#### Scenario: Transactions route identity

- GIVEN the current route is `/transactions`
- WHEN the primary navigation renders
- THEN the visible label is “Transacciones” and the item has the active-page state

### Requirement: Header controls have distinct roles and no collision

The mobile header MUST place Downloads on the left next to the menu trigger, keep account and notification controls on the right, and preserve a non-overlapping brand/header presentation. Downloads MUST remain discoverable in both native and non-native environments with their existing visibility semantics.

#### Scenario: Narrow header

- GIVEN a 320px-wide mobile viewport
- WHEN the header renders with menu, downloads, brand, notifications, and user controls
- THEN controls remain usable, do not overlap, and no horizontal overflow is present

#### Scenario: Download environment parity

- GIVEN either native or non-native runtime state
- WHEN the mobile header renders
- THEN download visibility and behavior match the existing runtime-specific rules

### Requirement: The header owns one dedicated secondary navigation surface

The mobile menu trigger MUST open a dedicated mobile drawer containing every secondary route not assigned to BottomNav. The mobile drawer MUST be a side navigation surface distinct from the desktop Sidebar and MUST NOT be presented as a BottomSheet. The FinTec logo FAB MUST NOT provide a second navigation entry point.

#### Scenario: Secondary route inventory

- GIVEN a mobile user opens the header menu
- WHEN the drawer is visible
- THEN every secondary route has one clear, reachable link and no route is duplicated with another navigation role

#### Scenario: Drawer dismissal and focus

- GIVEN the dedicated drawer is open
- WHEN the user selects a route, dismisses it, or presses Escape
- THEN the drawer closes and focus returns to the control that opened it when dismissal occurs

### Requirement: Account surface contains status and theme controls

The user account surface or its settings destination MUST contain account controls, theme control, and a slim “Premium Activo” status badge. Premium status MUST NOT consume a large drawer section or approximately one-third of the drawer.

#### Scenario: Account controls

- GIVEN a mobile user opens the user account surface
- WHEN account options are displayed
- THEN theme and account controls are available there and the Premium Activo badge is compact and readable

### Requirement: Add action is the only bottom-right floating action

The bottom-right floating action control MUST remain exclusively the +Nueva action. No logo or navigation FAB MAY appear in the bottom-left or elsewhere as a duplicate drawer trigger.

#### Scenario: Add action separation

- GIVEN any mobile route
- WHEN the shell renders floating actions
- THEN exactly one bottom-right +Nueva action is available and the header menu is the sole secondary-navigation trigger

### Requirement: Mobile chrome respects device and desktop boundaries

Mobile header, drawer, BottomNav, and floating action controls MUST respect safe-area insets, retain at least 44px interactive targets, and avoid horizontal overflow at 320/360/390/430px. At desktop breakpoints, existing header, Sidebar, navigation roles, and layout behavior MUST remain unchanged.

#### Scenario: Safe-area and desktop regression

- GIVEN a device with non-zero notch or home-indicator insets, or a desktop viewport
- WHEN the application shell renders
- THEN mobile controls are inset from unsafe edges, while desktop navigation and layout remain behaviorally unchanged
