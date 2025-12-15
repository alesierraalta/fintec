# Task List: Premium UI Adaptation (PRD-0013)

This task list outlines the steps to adapt the UI (Sidebar, Header, Settings) to correctly reflect the user's subscription tier, hiding upsells for Premium users and highlighting their status.

## Relevant Files
- `components/layout/sidebar.tsx` - Main sidebar, needs verification/update to hide upgrade banner for Premium.
- `components/layout/header.tsx` - Contains user profile menu, needs update to show tier badge.
- `components/subscription/pricing-cards.tsx` - Displays plans, needs to correctly mark current plan.
- `app/settings/page.tsx` - Main settings, needs a Subscription section.
- `hooks/use-subscription.ts` - Source of truth for tier data.

## Tasks
- [x] 1.0 Sidebar Adaptation
  - [x] 1.1 Verify `components/layout/sidebar.tsx`:
    - [x] 1.1.1 Ensure it imports `useSubscription`.
    - [x] 1.1.2 Check logic: If `tier === 'premium'`, the "Upgrade" banner/card must be HIDDEN.
    - [x] 1.1.3 If hidden, optionally show a small "Premium Active" indicator or usage summary (e.g., "AI Credits").

- [x] 2.0 Profile Menu (Header) Adaptation
  - [x] 2.1 Refactor `components/layout/header.tsx`:
    - [x] 2.1.1 Import `useSubscription`.
    - [x] 2.1.2 Retrieve `tier` and `loading` state.
    - [x] 2.1.3 In the user dropdown trigger (Avatar area), add a badge or border indicating status (Gold for Premium).
    - [x] 2.1.4 In the dropdown menu content, add a label "Plan: [Tier Name]" (e.g., "Plan: Premium").

- [x] 3.0 Settings Page Update
  - [x] 3.1 Update `app/settings/page.tsx`:
    - [x] 3.1.1 Add a "Suscripción" section or card.
    - [x] 3.1.2 Display current plan name and status (Active).
    - [x] 3.1.3 Add a button "Ver Planes" or "Gestionar" linking to `/pricing` (or disable if no portal).

- [x] 4.0 Pricing Cards & Page Logic
  - [x] 4.1 Update `components/subscription/pricing-cards.tsx`:
    - [x] 4.1.1 Ensure it accepts `currentTier` prop or fetches it.
    - [x] 4.1.2 For the card matching `currentTier`:
      - [x] Change button text to "Plan Actual".
      - [x] Disable the button.
      - [x] Add a visual highlight (border/badge).

- [ ] 5.0 Final Verification
  - [ ] 5.1 **User Check:** Log in as the Premium user (alesierraalta).
  - [ ] 5.2 **Sidebar:** Confirm Upgrade banner is GONE.
  - [ ] 5.3 **Header:** Confirm Premium badge/icon is visible.
  - [ ] 5.4 **Settings:** Confirm Subscription section shows "Premium".
  - [ ] 5.5 **Pricing:** Confirm Premium card says "Plan Actual".
