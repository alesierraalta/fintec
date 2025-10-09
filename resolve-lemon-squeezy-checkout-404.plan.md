<!-- f1ed62c7-245a-4342-9606-be9a686bf005 f779c038-7a4d-4155-ba72-c5b80d1e6f6a -->
# Plan to Resolve Lemon Squeezy Checkout 404

## Overview

The objective is to identify and fix the 404 (Not Found) error when accessing the `/api/lemonsqueezy/checkout` endpoint on the Vercel deployed environment. The error points to a potential misconfiguration in the Vercel deployment or Next.js routing, as the API route exists and works locally.

## Investigation Results

### ✅ Completed Investigations

1. **File Structure Verification** - ✅ PASSED
   - The API route file exists at `app/api/lemonsqueezy/checkout/route.ts`
   - File structure follows Next.js 13+ App Router conventions correctly
   - Route is properly located and named

2. **Build Process Verification** - ✅ PASSED
   - `npm run build` completes successfully
   - Route is generated in build output: `ƒ /api/lemonsqueezy/checkout`
   - No build errors related to this route

3. **Configuration Review** - ✅ PASSED
   - `next.config.js` has no custom routing that would interfere
   - No `.vercelignore` or `vercel.json` files affecting the route
   - `.gitignore` does not exclude the route

4. **Dependencies Check** - ✅ PASSED
   - All imports are valid: `@/lib/lemonsqueezy/checkout`, `@/repositories/supabase/client`
   - No TypeScript or import errors

## Root Cause Hypothesis

The 404 error on Vercel is most likely caused by ONE of these issues:

1. **Vercel Build Cache** - Old build is cached, new route not deployed
2. **Runtime Error** - Route crashes during initialization before responding (most likely)
3. **Environment Variables** - Missing Supabase/LemonSqueezy env vars on Vercel
4. **Vercel Routing** - Edge case in Vercel's routing layer

## Solutions Implemented

### 1. ✅ Enhanced Error Logging and Diagnostics

**File:** `app/api/lemonsqueezy/checkout/route.ts`

**Changes:**
- Added comprehensive console logging at every step
- Improved error handling with detailed error messages
- Added stack traces to error responses
- Better Supabase error reporting

**Benefits:**
- Can now see exactly where the route fails in Vercel logs
- Easier to identify if it's a Supabase connection issue, config issue, or something else

### 2. ✅ Added GET Health Check Endpoint

**File:** `app/api/lemonsqueezy/checkout/route.ts`

**Changes:**
- Added `GET` method handler for health checks
- Returns simple JSON with status and timestamp

**Benefits:**
- Can quickly verify if the route is accessible at all
- Eliminates client-side issues from testing

### 3. ✅ Created Test Endpoint

**File:** `app/api/lemonsqueezy/checkout/test/route.ts`

**Changes:**
- Created separate test endpoint at `/api/lemonsqueezy/checkout/test`
- Supports both GET and POST methods

**Benefits:**
- Confirms the path structure works on Vercel
- Isolates routing issues from logic issues

### 4. ✅ Created Test Script

**File:** `scripts/test-checkout-endpoint.ts`

**Changes:**
- Comprehensive test script for all endpoint scenarios
- Tests health check, missing params, invalid tier, etc.
- Can test against localhost or deployed URL

**Benefits:**
- Automated testing of all endpoint scenarios
- Easy to verify fixes before and after deployment

### 5. ✅ Created Documentation

**File:** `docs/LEMONSQUEEZY_CHECKOUT_404_FIX.md`

**Changes:**
- Complete diagnosis and troubleshooting guide
- Step-by-step deployment instructions
- Common issues and solutions
- Environment variable checklist

## Next Steps for User

### PRIORITY 1: Verify Environment Variables on Vercel

Go to Vercel Dashboard → Project Settings → Environment Variables and ensure ALL of these are set:

**Supabase (CRITICAL):**
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**LemonSqueezy:**
- ✅ `LEMONSQUEEZY_API_KEY`
- ✅ `LEMONSQUEEZY_STORE_ID`
- ✅ `LEMONSQUEEZY_WEBHOOK_SECRET`
- ✅ `LEMONSQUEEZY_VARIANT_ID_BASE`
- ✅ `LEMONSQUEEZY_VARIANT_ID_PREMIUM`

**App:**
- ✅ `NEXT_PUBLIC_APP_URL` (e.g., `https://fintec-six.vercel.app`)

### PRIORITY 2: Clear Vercel Cache and Redeploy

1. Push changes to Git:
   ```bash
   git add .
   git commit -m "fix: enhance lemonsqueezy checkout route with logging and diagnostics"
   git push origin main
   ```

2. In Vercel Dashboard:
   - Go to Settings → Data
   - Click "Clear Build Cache"
   - Redeploy from Deployments tab

### PRIORITY 3: Test the Endpoints

Once deployed, test in this order:

1. **Test Endpoint (simplest):**
   ```
   https://fintec-six.vercel.app/api/lemonsqueezy/checkout/test
   ```
   Expected: `{ "status": "ok", ... }`

2. **Health Check:**
   ```
   https://fintec-six.vercel.app/api/lemonsqueezy/checkout
   ```
   Expected: `{ "status": "ok", ... }`

3. **Actual Checkout (from pricing page):**
   - Go to https://fintec-six.vercel.app/pricing
   - Click "Actualizar" button
   - Check browser console for errors
   - Check Network tab for response

### PRIORITY 4: Check Vercel Function Logs

1. Go to Vercel Dashboard → Project → Deployments
2. Click latest deployment
3. Go to "Functions" tab
4. Find `/api/lemonsqueezy/checkout`
5. Look for logs starting with `[LemonSqueezy Checkout]`

**What to look for:**
- ✅ `POST request received` - Route is working
- ❌ No logs at all - Route not deployed or crashed on init
- ❌ Supabase errors - Connection issues
- ❌ Missing config - LemonSqueezy env vars not set

### PRIORITY 5: If Still 404, Check These

1. **Verify file was deployed:**
   - In Vercel deployment logs, search for "lemonsqueezy"
   - Should see the file being built

2. **Check for build errors:**
   - Look for TypeScript or import errors in build logs

3. **Verify route in Vercel:**
   - In Functions tab, confirm `/api/lemonsqueezy/checkout` is listed

## Expected Outcome

After following these steps, you should see:

1. ✅ Test endpoint returns 200 OK
2. ✅ Health check endpoint returns 200 OK
3. ✅ Actual checkout works from pricing page
4. ✅ Logs appear in Vercel Functions showing the flow
5. ✅ User gets redirected to LemonSqueezy checkout

## Rollback Plan

If issues persist, you can temporarily:

1. Check if the issue is specific to this route or all API routes
2. Compare with a working route like `/api/lemonsqueezy/products`
3. Create a minimal reproduction case
4. Contact Vercel support with the logs

## Files Modified

- ✅ `app/api/lemonsqueezy/checkout/route.ts` - Enhanced with logging
- ✅ `app/api/lemonsqueezy/checkout/test/route.ts` - New test endpoint
- ✅ `scripts/test-checkout-endpoint.ts` - New test script
- ✅ `docs/LEMONSQUEEZY_CHECKOUT_404_FIX.md` - Documentation
- ✅ `resolve-lemon-squeezy-checkout-404.plan.md` - This file

## Testing Commands

### Local Testing
```bash
# Build
npm run build

# Start production server
npm start

# Run test script (in another terminal)
npx tsx scripts/test-checkout-endpoint.ts

# Test against deployed environment
TEST_URL=https://fintec-six.vercel.app npx tsx scripts/test-checkout-endpoint.ts
```

### Manual curl Tests
```bash
# Health check
curl https://fintec-six.vercel.app/api/lemonsqueezy/checkout

# Test endpoint
curl https://fintec-six.vercel.app/api/lemonsqueezy/checkout/test

# Actual checkout (requires valid user ID)
curl -X POST https://fintec-six.vercel.app/api/lemonsqueezy/checkout \
  -H "Content-Type: application/json" \
  -d '{"userId":"your-user-id","tier":"base"}'
```

## Status

- [x] Investigate file structure
- [x] Verify build process
- [x] Review configuration files
- [x] Check dependencies
- [x] Add enhanced logging
- [x] Add health check endpoint
- [x] Create test endpoint
- [x] Create test script
- [x] Document findings and solutions
- [ ] User: Verify environment variables on Vercel
- [ ] User: Clear cache and redeploy
- [ ] User: Test endpoints on production
- [ ] User: Check Vercel logs
- [ ] User: Confirm fix working
- [ ] Clean up: Remove test endpoint after confirmation



