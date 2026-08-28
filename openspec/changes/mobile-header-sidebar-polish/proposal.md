# Proposal: Mobile Header and Sidebar Polish

## Intent

Fix mobile-only navigation collisions and ambiguity: download/notifications/user crowd the centered logo; a `w-64` Sidebar drawer and logo FAB duplicate navigation; `/transactions` appears as “Gastos” and truncates, while status/theme consume drawer space.

## Proposal question round

Answer these six product questions before specs; users may answer, skip, correct framing, or request another round. Recommendations are provisional.

1. **Downloads:** left by menu — **Rec:** balances width and keeps APK discoverable; uses left space. Right with spacing — minimal change; remains tight. Menu-only — cleanest; less discoverable.
2. **Logo FAB:** remove; header opens secondary drawer — **Rec:** one trigger, no duplicate branding; depends on drawer. Keep — familiar; duplicates. Fuse into header — fewer controls; new affordance.
3. **Drawer:** dedicated mobile drawer — **Rec:** correct hierarchy and touch targets; extra mapping. BottomSheet — familiar/current; can grow tall and disconnect from menu. Reuse `Sidebar` `w-64` — cheap; simulates desktop.
4. **Premium/theme:** slim “Premium Activo” badge; theme in user menu/settings — **Rec:** retains status without one-third-height cost; less parity. Keep full — discoverable; cluttered. Move both to Settings — lean; hides common controls.
5. **Transactions:** `Transacciones` with wrap/fit — **Rec:** matches route/header; needs label sizing. Flex/truncate only — smallest; retains misleading `Gastos`. Redesign nav — roomier; broader scope.
6. **Roles:** BottomNav=5 primary, header=secondary drawer, user=account/theme, bottom-right FAB=add — **Rec:** one route source and predictable roles; secondary routes need one extra tap. Multiple surfaces — discovery; conflicts. Header-only — simple; weak primary access.

## Scope

### In Scope
- Mobile header placement, one secondary drawer, compact status/theme, and clear bottom-nav labels.
- Responsive, accessibility, and route regression coverage.

### Out of Scope
- Desktop behavior, backend/data/auth, new routes, download semantics, or unrelated page redesign.

## Capabilities

### New Capabilities
- `mobile-navigation`: coherent mobile header, primary nav, secondary drawer, and account controls.

### Modified Capabilities
- None; no relevant capability spec exists here.

## Approach

After decisions, share one route model across desktop/mobile but use an explicit mobile drawer. Preserve portals, safe areas, semantic tokens, 44px targets, and desktop behavior. Verify 320/360/390/430px and native/non-native download visibility.

## Affected Areas

| Area | Impact |
|---|---|
| `components/layout/{header,main-layout,sidebar}.tsx` | Mobile shell and drawer. |
| `components/layout/{mobile-menu-fab,mobile-nav}.tsx` | Trigger, labels, and roles. |
| `tests/components/**`, `tests/e2e/**` | Responsive, route, and accessibility regressions. |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Removing FAB hides routes | Med | Header drawer plus route inventory and E2E. |
| Width, safe-area, or status discoverability regresses | Med | Test 320/360/390/430px, 44px targets, and native/non-native states. |

## Rollback Plan

Revert layout components and focused tests; no data rollback is required.

## Dependencies

`SidebarProvider`, portal root, `useIsNative`, and strict-TDD OpenSpec rules.

## Success Criteria

- [ ] No header overlap or horizontal overflow at 320/360/390/430px.
- [ ] Five primary and every secondary route have clear, non-duplicated access; `Transacciones` is readable.
- [ ] Controls remain at least 44px; desktop and native download behavior are unchanged.
- [ ] Focused component/E2E responsive and accessibility tests pass.
