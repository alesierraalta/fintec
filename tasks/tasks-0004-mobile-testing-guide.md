# Mobile Viewport Fix - Testing Guide

## Overview
This guide provides step-by-step instructions to test the mobile viewport fix on actual devices.

## Prerequisites
- Deploy the application or run it on a local server accessible from mobile devices
- Test on multiple devices/browsers for comprehensive coverage

## Test Devices & Browsers

### Priority Test Matrix
| Device | Browser | Priority |
|--------|---------|----------|
| iPhone (iOS Safari) | Safari | **HIGH** |
| Android (Chrome) | Chrome | **HIGH** |
| Android (Samsung) | Samsung Internet | MEDIUM |
| iPad (iOS Safari) | Safari | MEDIUM |
| Android (Firefox) | Firefox | LOW |

## Test Scenarios

### Scenario 1: Login Page - Keyboard Interaction

**Steps:**
1. Open the login page on mobile device
2. Observe the initial viewport (should fill screen completely)
3. Tap on the "Email" input field
4. **Expected:** 
   - Keyboard opens smoothly
   - Form scrolls to keep input visible
   - No layout jumping
5. Type some text in the email field
6. Tap "Done" or tap outside the input to close keyboard
7. **Expected:**
   - Keyboard closes smoothly
   - Viewport returns to full height
   - **No white/black space at bottom**
   - **No content stuck in wrong position**
   - Form remains accessible
8. Repeat steps 3-7 for the "Password" field

**Pass Criteria:**
- ✅ No dead space after keyboard closes
- ✅ Viewport returns to full height (100% screen)
- ✅ Content positions correctly
- ✅ Form remains scrollable

**Failure Signs:**
- ❌ White or black space at bottom
- ❌ Content displaced upward or downward
- ❌ Form cut off or inaccessible
- ❌ Unable to scroll to see all content

---

### Scenario 2: Add Transaction Page - Long Form Interaction

**Steps:**
1. Navigate to "Add Transaction" page (mobile view)
2. Scroll through the entire form to verify all sections are visible
3. Tap on "Description" input field
4. **Expected:**
   - Keyboard opens
   - Form scrolls to keep input visible
   - Can scroll to other fields while keyboard is open
5. Type a description
6. Tap on "Amount" calculator buttons
7. Enter an amount using the visual calculator
8. Tap on "Date" field
9. **Expected:**
   - Date picker opens correctly
   - No layout issues
10. Select a date and close picker
11. Tap on "Note" textarea
12. **Expected:**
    - Keyboard opens
    - Textarea is fully accessible
13. Type a long note (multiple lines)
14. Scroll to verify other fields are still accessible
15. Tap "Done" to close keyboard
16. **Expected:**
    - Keyboard closes smoothly
    - Viewport returns to full height
    - **No white/black space**
    - Can scroll through entire form normally

**Pass Criteria:**
- ✅ No dead space after any keyboard interaction
- ✅ All form fields remain accessible
- ✅ Scrolling works smoothly throughout
- ✅ Visual calculator works correctly
- ✅ Bottom action buttons remain accessible

---

### Scenario 3: Orientation Change with Keyboard Open

**Steps:**
1. Open login page in portrait orientation
2. Tap on email input (keyboard opens)
3. Rotate device to landscape
4. **Expected:**
   - Layout adjusts to landscape
   - Keyboard remains open
   - Form is scrollable
   - No layout breaking
5. Close keyboard
6. **Expected:**
   - Viewport adjusts correctly
   - No dead space
7. Rotate back to portrait
8. **Expected:**
   - Layout returns to portrait correctly
   - No dead space
   - Form accessible

**Pass Criteria:**
- ✅ Smooth orientation transitions
- ✅ No dead space in any orientation
- ✅ Content remains accessible

---

### Scenario 4: Rapid Keyboard Open/Close

**Steps:**
1. Open login page
2. Tap email field (keyboard opens)
3. Immediately tap outside (keyboard closes)
4. Immediately tap password field (keyboard opens)
5. Immediately tap outside (keyboard closes)
6. Repeat 3-4 times rapidly
7. **Expected:**
   - Viewport handles rapid changes smoothly
   - No accumulated dead space
   - No stuck content
   - Layout recovers properly

**Pass Criteria:**
- ✅ No accumulated layout issues
- ✅ Viewport returns to correct state after each cycle
- ✅ No memory leaks or performance degradation

---

### Scenario 5: Form Submission with Keyboard Open

**Steps:**
1. Open add transaction page
2. Fill out the form with keyboard operations
3. With keyboard still open, tap "Finalizar" button
4. **Expected:**
   - Form submits successfully
   - Keyboard closes
   - Redirect happens smoothly
   - No layout issues on destination page

**Pass Criteria:**
- ✅ Successful form submission
- ✅ Smooth transition to next page
- ✅ No viewport issues on destination

---

## Debugging Issues

### If You See White/Black Space

**Check:**
1. Open browser console on device (if possible)
2. Check for JavaScript errors
3. Verify `--app-height` CSS variable is being set
   - In browser DevTools: `getComputedStyle(document.documentElement).getPropertyValue('--app-height')`
4. Verify viewport height in hook
   - Should update when keyboard opens/closes

**Try:**
1. Force refresh the page (Clear cache)
2. Check if issue persists after app restart
3. Test in different browser on same device
4. Compare behavior on different device

### If Content is Displaced

**Check:**
1. Verify `overflow-y: auto` is applied to containers
2. Check if `overflow: hidden` is preventing scroll recovery
3. Verify CSS variable fallback is working

**Try:**
1. Disable browser extensions
2. Test in incognito/private mode
3. Check if specific to certain input types

### If Scrolling Doesn't Work

**Check:**
1. Verify container has `overflow-y: auto`
2. Check for conflicting CSS preventing scroll
3. Verify content height exceeds container height

---

## iOS Safari Specific Tests

### Additional iOS Checks

1. **Bounce Scroll Behavior**
   - Attempt to "pull down" at top of page
   - Should bounce back naturally
   - No white space should persist

2. **Address Bar Auto-Hide**
   - Scroll down to hide Safari address bar
   - Open keyboard
   - Close keyboard
   - Verify viewport recovers correctly

3. **Tab Switching**
   - With keyboard open, switch to another Safari tab
   - Return to app tab
   - Verify viewport state is correct

---

## Android Specific Tests

### Additional Android Checks

1. **System Back Button**
   - With keyboard open, press system back button
   - Verify keyboard closes (not app)
   - Check viewport recovery

2. **Recent Apps Multitasking**
   - With keyboard open, open recent apps
   - Return to app
   - Verify viewport state

---

## Report Template

Use this template to report test results:

```markdown
## Test Report: [Date]

**Device:** [iPhone 13, Samsung Galaxy S21, etc.]
**OS Version:** [iOS 17.1, Android 13, etc.]
**Browser:** [Safari, Chrome, etc.]
**App Version/Commit:** [version or git commit hash]

### Scenario 1: Login Page
- [ ] Pass
- [ ] Fail
**Notes:** [Any observations]

### Scenario 2: Add Transaction
- [ ] Pass
- [ ] Fail
**Notes:** [Any observations]

### Scenario 3: Orientation Change
- [ ] Pass
- [ ] Fail
**Notes:** [Any observations]

### Scenario 4: Rapid Keyboard Interaction
- [ ] Pass
- [ ] Fail
**Notes:** [Any observations]

### Scenario 5: Form Submission
- [ ] Pass
- [ ] Fail
**Notes:** [Any observations]

### Screenshots/Videos
[Attach screenshots showing issues or successful tests]

### Overall Result
- [ ] All tests passed
- [ ] Some tests failed (see notes)
- [ ] Major issues found

### Recommendations
[Any suggestions for improvement]
```

---

## Success Criteria Summary

The mobile viewport fix is considered successful if:

1. ✅ **No Dead Space**: No white or black space appears after keyboard closes on any device
2. ✅ **Smooth Transitions**: Keyboard open/close animations are smooth without layout jumping
3. ✅ **Content Accessibility**: All form content remains accessible and scrollable
4. ✅ **Orientation Handling**: Landscape/portrait changes work correctly
5. ✅ **Consistent Behavior**: Fix works consistently across iOS Safari and Android Chrome
6. ✅ **No Regressions**: Desktop and tablet views remain unaffected

---

## Quick Test Checklist

For rapid verification:

- [ ] Open login page on iPhone Safari
- [ ] Tap email field, keyboard opens
- [ ] Tap outside to close keyboard
- [ ] **Verify no white space at bottom**
- [ ] Tap password field, keyboard opens  
- [ ] Tap outside to close keyboard
- [ ] **Verify no white space at bottom**
- [ ] Open add transaction page
- [ ] Tap description field
- [ ] Enter text and close keyboard
- [ ] **Verify no dead space**
- [ ] Scroll through entire form
- [ ] **Verify all content accessible**

If all items above pass, the fix is likely working correctly!

---

## Continuous Monitoring

### Post-Deployment Checks

1. Monitor analytics for:
   - Bounce rate on login/form pages (mobile)
   - Form abandonment rate (mobile)
   - User feedback mentioning "stuck" or "white space"

2. Set up automated tests using:
   - BrowserStack or similar for cross-device testing
   - Playwright mobile device emulation
   - Visual regression testing

3. Collect feedback:
   - In-app feedback specifically about mobile UX
   - User testing sessions
   - Support ticket trends
