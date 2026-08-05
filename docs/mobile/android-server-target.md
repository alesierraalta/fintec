# Android shell: server target configuration

The Android and iOS apps are Capacitor shells. They bundle no web assets — `webDir` in
`capacitor.config.ts` points at `public/` purely as a placeholder. Everything the user
sees is loaded from a remote origin over the network.

Static export is not an option for this project: the app ships route handlers under
`app/**/route.ts`, a root `middleware.ts`, and server actions. Remote-origin loading is
the only viable model, which means the released APK follows every web deploy with no
rebuild.

## Environment variables

The origin is resolved by `resolveCapacitorServerTarget` in `lib/mobile/server-target.ts`,
which `capacitor.config.ts` calls at config-load time.

| Variable | Purpose | Precedence |
| --- | --- | --- |
| `CAP_SERVER_URL` | Local development target. Use `http://10.0.2.2:3000` for the Android emulator, or your LAN IP (`http://192.168.x.x:3000`) for a physical device. | Highest — wins when set |
| `NEXT_PUBLIC_APP_URL` | The deployed origin. Already the project-wide name for this value, reused here rather than duplicated. | Fallback |

If neither is set, config loading fails with a message naming both variables. That is
deliberate: a silent default would let a misconfigured environment produce a working
`cap sync` that ships the wrong origin, and the failure would only surface on a user's
phone.

Add these to your `.env.local`:

```dotenv
# Deployed origin the mobile shell loads by default
NEXT_PUBLIC_APP_URL=https://your-deployment.vercel.app

# Optional: override for local device/emulator development
# CAP_SERVER_URL=http://10.0.2.2:3000
```

## `cleartext` is derived, never configured

`server.cleartext` is computed from the resolved protocol: `true` for `http:`, `false` for
`https:`. There is no separate switch, because a separate switch permits the invalid state
this design exists to remove — an HTTPS production target that still ships a plaintext
allowance.

At the native layer, `android:usesCleartextTraffic="true"` lives in
`android/app/src/debug/AndroidManifest.xml`, so Gradle's manifest merger applies it to
debug builds only. Release builds inherit the platform default and deny cleartext.

## Workflows

**Production sync** — build the web app and push config to the native projects:

```bash
NEXT_PUBLIC_APP_URL=https://your-deployment.vercel.app npm run build:mobile
npm run cap:android   # opens Android Studio to build/run
```

The resulting APK then tracks every subsequent web deploy automatically. Rebuild only when
the native layer changes (plugins, permissions, manifest, icons).

**Local development with live reload:**

```bash
npm run dev          # in one terminal
npm run android:dev  # cap run android --live-reload --external
```

**Manual local target** (when you want the shell pinned to a specific host rather than
Capacitor's live-reload address):

```bash
CAP_SERVER_URL=http://10.0.2.2:3000 npx cap sync android
npm run cap:android
```

## Verifying what the native layer actually received

`cap sync`/`cap copy` writes the resolved configuration to a gitignored file. Read it
rather than trusting the source:

```bash
cat android/app/src/main/assets/capacitor.config.json
```

Check `server.url` and `server.cleartext` there before shipping a build.
