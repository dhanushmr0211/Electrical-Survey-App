# Mobile Debug Testing Guide

## Changes Made to Fix Mobile Touch Issues

### 1. Enhanced Touch Target Areas
- **Poles**: Added `hitStrokeWidth: 20` - creates 20px invisible touch area around 10px circle
- **Lines**: Added `hitStrokeWidth: 20` - makes 3px wide lines much easier to tap (20px hit area)
- **All shapes**: Added `listening: true` - explicitly enables event listeners

### 2. Drag vs Tap Disambiguation
- Set `Konva.dragDistance = 10` - requires 10px movement before drag starts
- This prevents taps from being mistaken for drag starts on mobile

### 3. Stage Configuration
- Set `draggable: false` - prevents accidental stage dragging
- Set `listening: true` - ensures stage listens to events
- Added `touch-action: none` to stage container

### 4. Event Handling
- Changed from `stage.on('click')` to `stage.on('tap click')`
- `tap` = mobile touch events
- `click` = desktop mouse events

### 5. Added Comprehensive Console Logging
All major actions now log to browser console for debugging

## Testing Steps (Mobile Device)

### Prerequisites
1. Deploy app to HTTPS server (required for PWA features)
2. Open app on mobile device
3. Open browser console (if possible) or use remote debugging

### Test Connect Mode

1. **Activate Connect Mode**
   - Tap "Connect" button
   - Button should turn green
   - Console should log: `"Connect button clicked"` and `"Connect mode activated"`

2. **Create Test Objects**
   - Switch to "Pole" mode, tap canvas 2 times to create 2 poles
   - Switch back to "Connect" mode

3. **Test Connection**
   - Tap first pole
   - Console should log: `"Tap/Click event triggered"`, `"Connect mode active"`, `"Selecting first object"`
   - First pole should get red outline (highlight)
   - Tap second pole
   - Console should log: `"Creating connection"`
   - Black line should appear between poles
   - Red highlight should disappear

4. **Verify Console Logs**
   Expected logs when tapping a pole:
   ```
   Tap/Click event triggered: {currentTool: "connect", targetType: "Circle", targetId: "pole-0", isStage: false}
   Connect mode active
   Clicked object: {id: 0, x: ..., y: ..., type: "pole"}
   Selecting first object
   ```

### Test Delete Mode

1. **Activate Delete Mode**
   - Tap "Delete" button
   - Button should turn green
   - Console should log: `"Delete button clicked"` and `"Delete mode activated"`

2. **Delete an Object**
   - Tap any pole or transformer
   - Console should log: `"Delete mode active"`, `"Deleting object: X"`
   - Object should disappear
   - Any connected lines should also disappear

3. **Delete a Line**
   - Create a connection first (switch to Connect mode)
   - Switch back to Delete mode
   - Tap on the line (try tapping in the middle)
   - Console should log: `"Delete mode active"`, `"Deleting connection: X"`
   - Line should disappear

4. **Verify Console Logs**
   Expected logs when tapping a line:
   ```
   Tap/Click event triggered: {currentTool: "delete", targetType: "Line", targetId: "line-0", isStage: false}
   Delete mode active
   Clicked element ID: line-0
   Deleting connection: 0
   ```

## Debugging Common Issues

### Issue: Buttons Don't Change to Green
**Problem**: Button click events not working
**Check**:
- Open browser console
- Tap button - do you see `"XXX button clicked"` logs?
- If no logs → button event listeners not attaching (JavaScript error?)
- Check for JavaScript errors in console

### Issue: Button Changes to Green But Nothing Happens When Tapping Canvas
**Problem**: Stage tap events not firing
**Check Console Logs**:
- Should see: `"Tap/Click event triggered: {currentTool: 'xxx', ...}"`
- If you see this → events ARE working, check target identification
- If you DON'T see this → tap events not working

**If tap events not working**:
1. Check if Konva is loaded (open console: `typeof Konva`)
2. Check stage initialization errors in console
3. Try tapping directly on empty canvas (not on objects)
4. Check CSS `touch-action` property isn't being overridden

### Issue: Tap Events Fire But Target is Wrong
**Problem**: Event target identification
**Check Console**: 
```
targetType: "Stage"  // Should be "Circle", "Rect", or "Line"
targetId: "no-id"    // Should be "pole-X", "transformer-X", or "line-X"
```

**If targetType is always "Stage"**:
- Shapes aren't being hit
- Try tapping more directly on shape center
- Check if `hitStrokeWidth` is working
- Try increasing POLE_RADIUS or line visibility

### Issue: Objects Can't Be Dragged (Bonus Test)
**Problem**: Drag distance too high
**Solution**: Tap and hold, wait 100ms, then drag (10px threshold must be crossed)

## Remote Debugging Mobile Devices

### Chrome on Android
1. Connect Android device to computer via USB
2. Enable USB debugging on Android
3. Open Chrome on computer
4. Go to `chrome://inspect`
5. Select your device and the page
6. Full DevTools will open

### Safari on iOS
1. Connect iOS device to Mac
2. Enable Web Inspector: Settings → Safari → Advanced → Web Inspector
3. Open Safari on Mac
4. Develop menu → select your device → select the page
5. Web Inspector opens

## Expected Console Output (Working Example)

```
// User taps Connect button
Connect button clicked, current tool: null
Connect mode activated

// User taps first pole
Tap/Click event triggered: {currentTool: "connect", targetType: "Circle", targetId: "pole-0", isStage: false}
Connect mode active
Clicked object: {id: 0, x: 150, y: 200, type: "pole"}
Selecting first object

// User taps second pole
Tap/Click event triggered: {currentTool: "connect", targetType: "Circle", targetId: "pole-1", isStage: false}
Connect mode active
Clicked object: {id: 1, x: 300, y: 250, type: "pole"}
Creating connection

// User taps Delete button
Delete button clicked, current tool: connect
Delete mode activated

// User taps a line
Tap/Click event triggered: {currentTool: "delete", targetType: "Line", targetId: "line-0", isStage: false}
Delete mode active
Clicked element ID: line-0
Deleting connection: 0
```

## If Nothing Works

### Nuclear Option: Simplify for Testing
1. Create ONE pole manually (add to Connect mode handler temporarily)
2. Log everything in the stage.on('tap click') handler
3. Tap directly on the pole
4. Check console - are ANY events firing?

### Check These Files
- [app.js](app.js) - lines 753-859 (stage event handler)
- [style.css](style.css) - line 30 (#container touch-action)
- [style.css](style.css) - lines 61-85 (button touch-action)
- [index.html](index.html) - line 5 (viewport meta tag)

### Verify Deployed Version
- Clear browser cache
- Hard reload (Ctrl+Shift+R or Cmd+Shift+R)
- Check if service worker is using old cached version
- Unregister service worker in DevTools → Application → Service Workers

---

**Deploy, test, and share console logs if issues persist!**
