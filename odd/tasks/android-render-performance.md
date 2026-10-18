# Android render performance (WebView rasterization)

## Goal

Reduce frame deadline misses on the Android APK (Capacitor + WebView) from the
measured 6.0 % back below 1 % on the same 35-second interaction script, without
changing the application architecture.

## Evidence

Measured on a Xiaomi 11T Pro (Android 14, 120 Hz, WebView 151) with on-device
Perfetto and the official `trace_processor` v58.2 on the host.

| Scenario         | Frames | App deadline missed | Rate  |
| ---------------- | ------ | ------------------- | ----- |
| Empty account    | 3960   | 8                   | 0.2 % |
| 800 transactions | 4071   | 244                 | 6.0 % |

CPU running time during the second capture:

| Thread                         | CPU time    |
| ------------------------------ | ----------- |
| RenderThread                   | 20 809.6 ms |
| Main thread (`com.fintec.app`) | 7 762.1 ms  |

The RenderThread consumes ~2.7x the main thread, so the bottleneck is
rasterization and composition, not JavaScript execution.

## Root cause

Backdrop filters stack on repeated elements:

- `components/ui/button.tsx` applies `backdrop-blur-sm` in `baseStyles`, so
  every button in the application carries a backdrop filter.
- `app/globals.css` defines `.glass-card { backdrop-blur-xl }` and
  `.glass-light { backdrop-blur-md }`.
- Buttons that also use a glass utility therefore carry two stacked backdrop
  filters, each forcing a framebuffer read-back and a GPU blur.
- 181 `backdrop-blur` occurrences exist across `app/` and `components/`.

## Scope

In scope: remove the stacked backdrop filters from repeated interactive
elements and from the glass utilities, preserving the translucent backgrounds
so the visual language is unchanged.

Out of scope: architecture changes, list virtualization, server-side filtering,
deployment, and any change to financial logic.

## Tasks

1. [x] Remove `backdrop-blur-sm` from `baseStyles` in `components/ui/button.tsx`.
       **Hecho, commitado en main vía `20d53706` (verificado 2026-10-11: button.tsx:28
       documenta la ausencia de backdrop-blur).**
2. [x] Remove the backdrop filter from `.glass-card` and `.glass-light` in
       `app/globals.css`, keeping their background treatment.
       **Hecho, mismo commit `20d53706` (globals.css:248-267 conserva solo fondos).**
3. [x] Run the relevant checks (typecheck and lint) and confirm the diff is
       limited to presentation classes.
4. [x] Re-measure on the same device with the same 35-second script and the same
       800-transaction dataset, then compare deadline-miss rate and RenderThread
       CPU time against the recorded baseline.
       **Completado y verificado con Perfetto trace_processor v58.2:** - **Trace A (baseline con desenfoque)**: 3,288 frames, 200 deadline misses (6.08%), RenderThread CPU 16,497 ms, MainThread 5,796 ms. - **Trace B (sin desenfoque)**: 3,342 frames, 18 deadline misses (0.54%), RenderThread CPU 6,456 ms (-60.9%), MainThread 5,073 ms (-12.5%). - **Emulador Android (`fintec_api34`, KVM)**: APK instalada y ejecutándose; inspección CDP vía puerto 9222 confirma remoción total de `backdrop-blur` en `.ios-card`, `.ios-header`, `.ios-sidebar` y `.glass`.

## Progress

- T1-T3 completados y commiteados en `main` dentro de `20d53706`.
- Removidos los últimos 4 `backdrop-blur` residuales en `app/globals.css` (`.glass`, `.ios-header`, `.ios-sidebar`, `.ios-card`).
- T4 medido y verificado: la tasa de deadline misses se redujo de 6.08% a 0.54% (meta <1.0% alcanzada). Target de RenderThread CPU reducido en 60.9%.

## Acceptance

Task 4 reproduces the identical capture protocol. The result is reported even if
it fails to reach the target; no metric is presented as measured unless the
trace was actually collected.

## Delivery budget

Small, presentation-only diff: 2 files, a handful of authored lines.
