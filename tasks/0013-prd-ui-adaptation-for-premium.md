# Product Requirements Document: Premium UI Adaptation

## 1. Introduction
This document outlines the requirements to adapt the user interface (UI) to reflect the user's subscription tier (`tier`). Although the backend now correctly returns the subscription status, the frontend (Sidebar, Profile Menu, Settings) still displays generic "Upgrade" prompts or fails to highlight the user's Premium status.

## 2. Goals
*   **Contextual UI:** Display UI elements relevant to the user's actual tier (Free, Base, Premium).
*   **Remove Upsell Noise:** Eliminate "Upgrade to Premium" call-to-actions (CTAs) for users who are already on the highest tier.
*   **Visual Recognition:** Clearly indicate the user's status with visual cues (badges, colors).

## 3. User Stories
*   As a **Premium user**, I expect the sidebar not to ask me to upgrade, but instead show me relevant info (usage/management) so I feel the value of my subscription.
*   As a **user**, I want to see a clear badge in my profile menu indicating my current plan.
*   As a **Premium user** in Settings, I want to see my current plan highlighted and active, rather than being asked to "Select" it again.

## 4. Functional Requirements

### 4.1. Sidebar Adaptation
*   **Component:** `components/layout/sidebar.tsx` (or equivalent).
*   **Logic:**
    *   **Free/Base User:** Show the current "Upgrade to Premium" banner/card.
    *   **Premium User:** 
        *   **Hide** the upgrade banner.
        *   **Show** a "Subscription Summary" or "Manage Subscription" block (compact).
        *   Include a brief usage summary if available (e.g., AI Credits used) or just a link to settings.

### 4.2. Profile Menu (UserNav)
*   **Component:** `components/layout/user-nav.tsx` (or where the avatar/dropdown is).
*   **Logic:**
    *   Add a **Badge** next to or below the user's name/email.
    *   **Styles:**
        *   **Premium:** Gold/Yellow badge with "Premium" text/icon.
        *   **Base:** Blue/Standard badge with "Pro" or "Base".
        *   **Free:** Gray/Ghost badge (or no badge).

### 4.3. Subscription Settings Page
*   **Component:** `app/settings/subscription/page.tsx` and `components/subscription/pricing-cards.tsx`.
*   **Logic:**
    *   Pass the current `tier` to the pricing cards.
    *   If the card matches the user's tier:
        *   Change button text to "Plan Actual" (Current Plan).
        *   Disable the button.
        *   Highlight the card border.
    *   Ensure the visual hierarchy makes it obvious which plan is active.

### 4.4. Feature Gates (Cleanup)
*   Ensure that any remaining "Upgrade" buttons scattered in specific feature pages (e.g., AI Chat) are hidden if `isPremium` is true.

## 5. Non-Goals
*   Changing the underlying pricing logic (handled in previous task).
*   Implementing a new billing portal (just linking to the placeholder/support for now).

## 6. Design Guidelines
*   **Colors:**
    *   Premium: `text-yellow-500`, `bg-yellow-500/10`, `border-yellow-500/50`.
    *   Upgrade CTA: Primary app color (Purple/Blue).
*   **Icons:** Use `Crown` (Lucide) for Premium indicators.

## 7. Success Metrics
*   Premium users do not see "Upgrade" prompts in the sidebar.
*   Profile dropdown clearly states "Premium".
*   Settings page accurately reflects the active subscription.
