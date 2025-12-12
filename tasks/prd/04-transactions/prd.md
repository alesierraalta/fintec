# PRD: Transactions UX (Desktop + Mobile)

## Goals
- Fast filtering/search with clear feedback.
- Detail panel that works on mobile (slide-over) and desktop (side panel).
- Reduce cognitive load: emphasize type (income/expense/transfer), category, and date.

## Key surfaces
- `app/transactions/page.tsx`
- `components/filters/transaction-filters` (and related)
- `components/transactions/*`

## Success metrics
- Filter interactions feel instant (<100ms UI response for typical datasets).
- Detail panel never blocks navigation; always easy to dismiss.

