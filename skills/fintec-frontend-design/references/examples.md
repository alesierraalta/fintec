# FinTec Frontend Design — Component Templates

Relocated from SKILL.md. All classes exist in `tailwind.config.ts` / `app/globals.css`. Valid tokens only: `primary-500` exists; `destructive` has DEFAULT + `destructive-foreground` only (no `-500`); success/warning/error have `text-success`/`text-warning`/`text-error` utilities (no `-foreground`).

## Button Variants

Use `components/ui/button.tsx` (variants: primary/secondary/success/warning/danger/ghost/outline; sizes sm/md/lg). Raw example for reference:

```tsx
<button className="
  glass-light
  bg-primary-500
  text-white
  active:scale-[0.98]
  hover:scale-105
  transition-smooth
  min-h-[44px]
  px-4 py-2
  rounded-lg
  shadow-ios-sm
">
  Primary Action
</button>

<button className="
  text-gray-300
  hover:bg-white/5
  active:scale-[0.98]
  transition-smooth
  min-h-[44px]
  px-4 py-2
  rounded-lg
">
  Secondary
</button>

<button className="
  bg-destructive
  text-destructive-foreground
  active:scale-[0.98]
  hover:scale-105
  transition-smooth
  min-h-[44px]
  px-4 py-2
  rounded-lg
">
  Delete
</button>
```

## Card

```tsx
<div className="glass-card rounded-2xl p-4 shadow-ios-md">
  <div className="mb-4 flex items-center justify-between">
    <h3 className="text-ios-headline">Card Title</h3>
    <Badge variant="success">Active</Badge>
  </div>
  <p className="text-ios-body text-gray-300">Card content goes here</p>
  <div className="mt-4 border-t border-white/10 pt-4">
    <span className="amount-positive">+$1,234.56</span>
  </div>
</div>
```

## Input

```tsx
<input
  className="transition-smooth min-h-[44px] w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-ios-body text-white placeholder:text-gray-500 focus:border-transparent focus:ring-2 focus:ring-primary-500 active:scale-[0.99]"
  type="text"
  placeholder="Enter amount..."
/>
```

## Modal

```tsx
const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="glass-card relative mx-4 w-full max-w-lg rounded-2xl p-6 shadow-ios-lg">
        {children}
      </div>
    </div>,
    document.getElementById('modal-root')!
  );
};
```

## Amount Display

```tsx
<span className="amount-positive">+$1,234.56</span>
<span className="amount-negative">-$567.89</span>
<span className="amount-emphasis-white">$12,345.67</span>
<span className="amount-strong">1,234.56</span>
```

## Commands

```bash
npm run lint
npm run type-check
npm run build
```
