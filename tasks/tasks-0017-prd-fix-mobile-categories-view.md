# Task List: Fix Mobile Categories View Toggle

## Relevant Files
- `components/categories/category-card.tsx` - Main component to be updated with `viewMode` logic.
- `app/categories/page.tsx` - Page file where the `viewMode` state lives and needs to be passed down.

### Notes
- Ensure that the "List" mode implementation does not break the existing "Grid" mode layout, which is the default.
- Use `cn()` or template literals for clean conditional class application.

## Tasks
- [x] 1.0 Update CategoryCard Component
  - [x] 1.1 Modify `CategoryCard` props interface to include optional `viewMode: 'grid' | 'list'`.
  - [x] 1.2 Implement the conditional rendering structure within `CategoryCard`. If `viewMode` is 'list', render the new compact row layout. If 'grid', render the existing full card layout.
  - [x] 1.3 Design the "List" view layout:
    - [ ] Container: `flex items-center justify-between p-4 bg-card/90 backdrop-blur-xl border border-border/40 rounded-xl h-[70px]`.
    - [ ] Left side: Small category icon (colored background) + Category Name.
    - [ ] Optional: Add subcategory count badge next to the name if available.
    - [ ] Right side: Total Amount (formatted) + Action Buttons (Edit/Delete - potentially simplified or in a dropdown menu for list view).
  - [x] 1.4 Ensure the "Grid" view renders exactly as it did before (preserve all existing classes and structure for this mode).
  - [x] 1.5 Verify that `onEdit`, `onDelete`, and `onView` handlers are correctly attached to the interactive elements in the new "List" layout.

- [ ] 2.0 Integrate View Mode in Categories Page
  - [x] 2.1 In `app/categories/page.tsx`, locate the mapping of `filteredCategories`.
  - [x] 2.2 Pass the existing `viewMode` state variable as a prop to the `CategoryCard` component: `<CategoryCard viewMode={viewMode} ... />`.
  - [x] 2.3 Update the container's CSS classes in `app/categories/page.tsx`.
    - [ ] Currently, it switches between `grid-cols-...` and `space-y-4`. Ensure `space-y-4` (or `space-y-2`) is active when `viewMode === 'list'` and effectively stacks the new compact cards.

- [ ] 3.0 Mobile UX & Design Refinement
  - [ ] 3.1 Check touch targets in "List" mode. Ensure the "Edit" and "Delete" buttons (or the card click area) are at least 44x44px or have sufficient padding.
  - [ ] 3.2 Verify visual consistency: The list items should share the same "glassmorphism" aesthetic (`bg-card/90`, `backdrop-blur`) as the rest of the app.
  - [ ] 3.3 Test text truncation: Ensure long category names do not break the "List" row layout on small screens.

- [ ] 4.0 Verification & Testing
  - [ ] 4.1 Manual Test: Open the Categories page on a mobile viewport (or simulator).
  - [ ] 4.2 Toggle between "Grid" and "List". Confirm the layout changes instantly.
  - [ ] 4.3 Confirm "List" view shows the compact row and "Grid" shows the full card.
  - [ ] 4.4 Verify that clicking "Edit" in "List" mode opens the modal correctly.
  - [ ] 4.5 Verify that clicking "Delete" in "List" mode triggers the confirmation.
