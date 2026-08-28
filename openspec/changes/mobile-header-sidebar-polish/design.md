# Design: Mobile Header and Sidebar Polish

## Technical Approach

Retain `SidebarProvider`, the desktop `Sidebar`, and desktop `Header` behavior. On mobile, the provider's `isOpen` state drives a new `MobileDrawer`; `Header` remains its only trigger. Remove the mobile `Sidebar` wrapper and `MobileMenuFAB`. Share typed route metadata so BottomNav has exactly five primaries and the drawer has the complementary secondary inventory. Preserve existing portals, semantic tokens, `useMobileChromeGeometry`, native-download condition, and safe-area utilities.

## Architecture Decisions

| Decision | Choice and rationale |
|---|---|
| Mobile drawer | Create `MobileDrawer` as a portaled fixed left `aside`/dialog with an overlay, titled header, 44px close button, scrollable secondary navigation, and `pt-safe-top pb-safe-bottom pl-safe-left`. Use `min(20rem, calc(100vw - 1rem))`, never `w-64`, and never a BottomSheet. This isolates mobile hierarchy from desktop Sidebar spacing and controls. |
| State/accessibility | `MainLayout` passes `open={isOpen}` and `onClose={closeSidebar}`. The drawer handles overlay, route selection, Escape, focus restoration to the opener, and one `useNativeBackNavigation` entry (`mobile-drawer`, priority 95). This replaces the main-layout/FAB duplication. |
| Route roles | Add typed `navigation.ts` metadata for `mobilePrimaryNavigation` and `mobileSecondaryNavigation`. Secondary is Recurrentes, Categorías, Presupuestos, Reportes, Calculadora, Deudas, Ofertas P2P, Respaldos, Chat (premium), and Ajustes; Admin is conditional. Keep `/pricing` as the existing conditional `UpgradeButton`, not a duplicate nav item; do not duplicate `/goals`. `desktopLabel` may retain current desktop wording. |
| Header groups | Mobile header uses a shrink-safe left flex group (menu, then existing download link) and right group (notifications, user), with a bounded absolute centered logo. Keep the exact `!isNative`, `/download`, and `aria-label` behavior. The user portal remains the account surface: theme stays there and receives a readable `isCompact` Premium badge; desktop preferences remain unchanged. |
| BottomNav | Consume the five-item metadata, label `/transactions` `Transacciones`, remove `truncate`/clipping, and use `min-w-[44px]`, `min-h-[52px]`, `whitespace-normal break-words`, and fit-safe gaps. The long label may occupy two lines; no ellipsis or hidden overflow. |

## Data Flow

`Header menu → SidebarProvider.isOpen → MobileDrawer portal → secondary Link → close`

`Header user → account portal → ThemeToggle + compact PremiumStatusCard`

## File Changes

| File | Action | Description |
|---|---|---|
| `components/layout/mobile-drawer.tsx` | Create | Side drawer, overlay, header, filtered route links, focus/Escape/native-back handling. |
| `components/layout/navigation.ts` | Create | Typed primary/secondary route source. |
| `components/layout/header.tsx` | Modify | Left/right mobile groups and compact status in user portal; desktop/download branch unchanged. |
| `components/layout/main-layout.tsx` | Modify | Render drawer; remove mobile Sidebar/backdrop and FAB; retain desktop shell and `+Nueva`. |
| `components/layout/mobile-nav.tsx` | Modify | Five labels, wrap/fit classes, 44px minimums. |
| `components/layout/sidebar.tsx` | Modify | Consume shared metadata without changing desktop presentation. |
| `components/subscription/premium-status-card.tsx` | Modify | Add readable compact badge variant; preserve desktop variants. |
| `components/layout/mobile-menu-fab.tsx` | Delete | Remove duplicate logo/navigation trigger. |
| `tests/components/**`, `tests/integration/components/transient-back-adapters.test.tsx`, `components/testing/**`, `app/dev/**`, `tests/e2e/**`, `tests/app/app-shell-scroll-contract.test.tsx` | Modify/Create/Delete | Replace FAB fixtures/assertions with drawer, shell, responsive, and route-role coverage. |

## Interfaces / Contracts

```ts
type MobileDrawerProps = { open: boolean; onClose: () => void };
type NavigationItem = {
  href: string; mobileLabel: string; desktopLabel?: string;
  icon: LucideIcon; premium?: boolean;
};
```

The trigger exposes `aria-controls`/`aria-expanded`; the drawer has `role="dialog"`, `aria-modal`, a labelled close control, `aria-current` links, and all interactive targets are at least 44px.

## Testing Strategy

Under `strict_tdd`, write RED behavioral tests first. Jest covers five-link order, `Transacciones`, non-truncating/wrapping classes, drawer route inventory and premium/Admin filtering, overlay/Escape/focus restoration, compact badge/theme placement, native-back registration, and absence of `MobileMenuFAB`. Playwright mobile projects exercise 320/360/390/430px, no horizontal overflow, notch/home-indicator spacing, side-drawer geometry, route dismissal, native/non-native download visibility, and exactly one bottom-right `+Nueva` FAB. Add a desktop smoke regression; run type-check, lint, focused Jest, then configured E2E.

## Threat Matrix

N/A for every row: only existing client navigation surfaces change; no route definitions, shell commands, subprocesses, VCS/PR automation, executable classification, or repository selection changes. Existing links, `router.push`, and native-back semantics remain intact.

## Migration / Rollout

No migration or feature flag. Revert the layout, component, and focused test changes; no data rollback is required.

## Open Questions

None.
