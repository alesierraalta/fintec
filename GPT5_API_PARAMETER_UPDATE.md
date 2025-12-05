# GPT-5 API Parameter Compatibility Update

## Summary
Updated all OpenAI API calls to use `max_completion_tokens` instead of `max_tokens` for GPT-5 API compatibility. This change ensures that the codebase is compatible with the new GPT-5 API parameter requirements.

## Changes Made

### Configuration Updates
- **File**: `lib/ai/config.ts`
  - Renamed constant: `AI_MAX_TOKENS` → `AI_MAX_COMPLETION_TOKENS`
  - Updated comment to clarify GPT-5 API parameter usage

### API Call Updates
All OpenAI `chat.completions.create()` calls have been updated to use `max_completion_tokens` instead of `max_tokens`:

1. **File**: `lib/ai/agent/core/response-generator.ts`
   - Updated import: `AI_MAX_TOKENS` → `AI_MAX_COMPLETION_TOKENS`
   - Updated parameter: `max_tokens: AI_MAX_TOKENS` → `max_completion_tokens: AI_MAX_COMPLETION_TOKENS`

2. **File**: `lib/ai/categorization.ts`
   - Updated import: `AI_MAX_TOKENS` → `AI_MAX_COMPLETION_TOKENS`
   - Updated parameter: `max_tokens: AI_MAX_TOKENS` → `max_completion_tokens: AI_MAX_COMPLETION_TOKENS`

3. **File**: `lib/ai/anomaly-detection.ts`
   - Updated import: `AI_MAX_TOKENS` → `AI_MAX_COMPLETION_TOKENS`
   - Updated parameter: `max_tokens: AI_MAX_TOKENS` → `max_completion_tokens: AI_MAX_COMPLETION_TOKENS`

4. **File**: `lib/ai/budget-optimizer.ts`
   - Updated import: `AI_MAX_TOKENS` → `AI_MAX_COMPLETION_TOKENS`
   - Updated parameter: `max_tokens: AI_MAX_TOKENS` → `max_completion_tokens: AI_MAX_COMPLETION_TOKENS`

5. **File**: `lib/ai/predictions.ts`
   - Updated import: `AI_MAX_TOKENS` → `AI_MAX_COMPLETION_TOKENS`
   - Updated parameter: `max_tokens: AI_MAX_TOKENS` → `max_completion_tokens: AI_MAX_COMPLETION_TOKENS`

6. **File**: `lib/ai/memory/memory-extractor.ts`
   - Updated parameter: `max_tokens: 2000` → `max_completion_tokens: 2000`

7. **File**: `lib/ai/memory/short-term-memory.ts`
   - Updated parameter: `max_tokens: 150` → `max_completion_tokens: 150`

8. **File**: `lib/ai/advisor.ts`
   - Updated parameter: `max_tokens: 800` → `max_completion_tokens: 800`

## Verification

✅ All files updated successfully
✅ TypeScript build completed without errors (`npm run build`)
✅ All imports updated correctly
✅ No remaining `max_tokens` or `AI_MAX_TOKENS` references in updated files

## Files Changed (9 files total)
- `lib/ai/config.ts`
- `lib/ai/agent/core/response-generator.ts`
- `lib/ai/categorization.ts`
- `lib/ai/anomaly-detection.ts`
- `lib/ai/budget-optimizer.ts`
- `lib/ai/predictions.ts`
- `lib/ai/memory/memory-extractor.ts`
- `lib/ai/memory/short-term-memory.ts`
- `lib/ai/advisor.ts`

## Commit
Changes have been committed with message:
```
fix: Update GPT-5 API parameter from max_tokens to max_completion_tokens
```

## Testing Recommendations
- Test conversational queries to verify API calls work correctly
- Test financial queries (e.g., income distribution) to ensure no 400 errors
- Verify that all AI features continue to function as expected
