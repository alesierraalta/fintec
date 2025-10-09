# LemonSqueezy Checkout 404 Error - Diagnosis and Fix

## Problem Summary
The `/api/lemonsqueezy/checkout` endpoint returns a 404 error when accessed on the Vercel deployment (`fintec-six.vercel.app/pricing`) but works correctly in local development.

## Investigation Results

### ✅ Confirmed Working Locally
- The API route file exists at: `app/api/lemonsqueezy/checkout/route.ts`
- The file structure follows Next.js 13+ App Router conventions
- Build process completes successfully: `npm run build` ✅
- Route is correctly generated in the build output

### 🔍 Root Cause Analysis
The 404 error on Vercel can be caused by:

1. **Vercel Deployment Cache Issue** - Old build cached, new route not deployed
2. **Environment Variables Missing** - Required Supabase or LemonSqueezy env vars not set on Vercel
3. **Runtime Error** - Route crashes during initialization, preventing registration
4. **Build Configuration** - Vercel build settings exclude or mishandle the route

## Solution Implemented

### 1. Enhanced Error Logging
Added comprehensive console logging to the checkout route to help diagnose issues on Vercel:

```typescript
// app/api/lemonsqueezy/checkout/route.ts
export async function POST(request: NextRequest) {
  try {
    console.log('[LemonSqueezy Checkout] POST request received');
    // ... detailed logging for each step
  } catch (error: any) {
    console.error('[LemonSqueezy Checkout] Unexpected error:', {
      message: error?.message,
      stack: error?.stack,
      error
    });
    // Return error details in response
  }
}
```

### 2. Added GET Health Check Endpoint
Added a GET endpoint to verify the route is accessible:

```typescript
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    message: 'LemonSqueezy checkout endpoint is accessible',
    timestamp: new Date().toISOString(),
  });
}
```

### 3. Created Test Endpoint
Added a test route at `/api/lemonsqueezy/checkout/test` to verify path accessibility.

## Deployment Steps

### Step 1: Verify Environment Variables on Vercel
Ensure these environment variables are set in your Vercel project settings:

**Supabase Variables:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**LemonSqueezy Variables:**
- `LEMONSQUEEZY_API_KEY`
- `LEMONSQUEEZY_STORE_ID`
- `LEMONSQUEEZY_WEBHOOK_SECRET`
- `LEMONSQUEEZY_PRODUCT_ID_BASE`
- `LEMONSQUEEZY_PRODUCT_ID_PREMIUM`
- `LEMONSQUEEZY_VARIANT_ID_BASE`
- `LEMONSQUEEZY_VARIANT_ID_PREMIUM`

**App Variables:**
- `NEXT_PUBLIC_APP_URL` (e.g., `https://fintec-six.vercel.app`)

### Step 2: Clear Vercel Build Cache
1. Go to Vercel Dashboard → Your Project → Settings
2. Navigate to "Data" tab
3. Click "Clear Build Cache"
4. Redeploy the application

### Step 3: Force Redeploy
```bash
# Commit the changes
git add .
git commit -m "fix: enhance lemonsqueezy checkout route with logging and health check"
git push origin main
```

### Step 4: Test the Endpoints
Once deployed, test these URLs:

1. **Health Check (GET):**
   ```
   GET https://fintec-six.vercel.app/api/lemonsqueezy/checkout
   ```
   Expected: `{ "status": "ok", "message": "...", "timestamp": "..." }`

2. **Test Endpoint (GET/POST):**
   ```
   GET https://fintec-six.vercel.app/api/lemonsqueezy/checkout/test
   ```
   Expected: `{ "status": "ok", ... }`

3. **Actual Checkout (POST):**
   ```
   POST https://fintec-six.vercel.app/api/lemonsqueezy/checkout
   Content-Type: application/json
   
   {
     "userId": "your-user-id",
     "tier": "base"
   }
   ```

### Step 5: Check Vercel Logs
1. Go to Vercel Dashboard → Your Project → Deployments
2. Click on the latest deployment
3. Go to "Functions" tab
4. Find `/api/lemonsqueezy/checkout`
5. Check the logs for:
   - `[LemonSqueezy Checkout] POST request received`
   - Any error messages
   - Stack traces

## Debugging Commands

### Local Testing
```bash
# Build the application
npm run build

# Start production server
npm start

# Test the endpoint locally
curl -X POST http://localhost:3000/api/lemonsqueezy/checkout \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user-id","tier":"base"}'
```

### Verify Route Generation
```bash
# Check if route is in build output
npm run build | grep "lemonsqueezy"
```

## Common Issues and Solutions

### Issue 1: Environment Variables Not Set
**Symptom:** 500 error, logs show "Missing env variables"
**Solution:** Add all required env vars in Vercel dashboard

### Issue 2: Supabase Connection Error
**Symptom:** 500 error, logs show "Failed to fetch user data"
**Solution:** Verify Supabase credentials and user exists

### Issue 3: LemonSqueezy Config Missing
**Symptom:** Empty checkout URL or config errors
**Solution:** Verify LemonSqueezy variant IDs are set correctly

### Issue 4: Vercel Cache
**Symptom:** 404 error persists after fix
**Solution:** Clear build cache and force redeploy

## Next Steps

1. ✅ Enhanced logging added
2. ✅ Health check endpoint added
3. ✅ Test endpoint added
4. ⏳ Deploy to Vercel
5. ⏳ Verify environment variables
6. ⏳ Test endpoints on production
7. ⏳ Check Vercel logs for any errors
8. ⏳ Remove test endpoint after confirming fix

## Files Modified

- `app/api/lemonsqueezy/checkout/route.ts` - Added logging, error handling, and GET endpoint
- `app/api/lemonsqueezy/checkout/test/route.ts` - Added test endpoint (temporary)
- `docs/LEMONSQUEEZY_CHECKOUT_404_FIX.md` - This documentation

## References

- [Next.js App Router API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Vercel Deployment Documentation](https://vercel.com/docs/deployments/overview)
- [LemonSqueezy API Documentation](https://docs.lemonsqueezy.com/api)



