# Electrical Survey App

A Progressive Web App (PWA) for creating electrical surveys and system maps.

## Features

✅ **Cross-platform** - Works on desktop, tablet, and mobile  
✅ **Offline-first** - Works without internet connection (after first visit)  
✅ **Installable** - Install as native app on home screen  
✅ **LocalStorage** - Automatically saves surveys locally  
✅ **Undo/Redo** - Full history support  
✅ **Touch-friendly** - Optimized for mobile field use  

## Quick Start

### Run Locally

1. **Using Python (recommended):**
   ```bash
   cd electrical-survey-app
   python -m http.server 8000
   ```
   Then visit: `http://localhost:8000`

2. **Using Node.js:**
   ```bash
   npm install -g http-server
   http-server
   ```

### Using the App

**Tools:**
- **Pole** - Add electrical poles (circles)
- **Transformer** - Add transformers (rectangles)
- **Connect** - Draw connections between components
- **Delete** - Remove objects or connections
- **Undo/Redo** - Navigate history
- **Save** - Save survey to local storage
- **Load** - Load previously saved survey
- **New** - Start fresh survey

**Workflow:**
1. Click **Pole** or **Transformer** button
2. Click canvas to place components
3. Click **Connect** to draw lines between components
4. Click **Save** to save your work
5. Click **Load** anytime to restore your survey

## Installation as App

1. **Desktop (Chrome/Edge):**
   - Visit app in browser
   - Click install button in address bar
   - Opens in fullscreen window

2. **Mobile (Android):**
   - Visit app in Chrome
   - Tap menu → "Install app"
   - App appears on home screen

3. **iOS (Safari):**
   - Tap share icon → "Add to Home Screen"
   - Appears as home screen shortcut

## PWA Setup

⚠️ **Icons needed for full PWA support:**
- Create `icon-192.png` (192x192)
- Create `icon-512.png` (512x512)

See `PWA_SETUP.md` for detailed icon setup instructions.

## Deployment

To deploy online:

1. Get hosting with **HTTPS** (required for PWA):
   - Vercel, Netlify, GitHub Pages
   - AWS, Firebase, or traditional hosting

2. Upload files to server

3. Enable HTTPS certificate (usually automatic)

4. Test installation in browser

## File Structure

```
electrical-survey-app/
├── index.html              - Main app page
├── app.js                  - App logic (836 lines)
├── style.css               - Styling + mobile optimization
├── manifest.json           - PWA metadata
├── service-worker.js       - Offline caching
├── icon-192.png           - App icon (192x192) [TODO]
├── icon-512.png           - App icon (512x512) [TODO]
├── PWA_SETUP.md           - Detailed PWA guide
└── README.md              - This file
```

## Data Storage

All data is stored locally:
- **Surveys** - Stored in browser's localStorage
- **Cache** - Static files cached by service worker
- **Nothing** - Sent to servers (privacy-first!)

Clear browser data to remove:
- Settings > Privacy > Clear browsing data
- Select "Cookies and other site data"

## Browser Support

✅ Chrome 51+  
✅ Edge 79+  
✅ Firefox 44+  
✅ Safari 14+ (limited)  
✅ Android Chrome  
✅ Mobile Safari (partial)  

## Troubleshooting

**Service Worker not registering?**
- Clear cache: Settings > Privacy > Clear all
- Reload page (Ctrl+F5)
- Check Console (F12) for errors

**App won't install?**
- Must use HTTPS (except localhost)
- Icons must exist (icon-192.png, icon-512.png)
- manifest.json must be valid

**Offline mode not working?**
- First visit must be online  
- Wait 5 seconds after page loads for caching
- Check Application tab for Service Worker status

## Development

Made with:
- **Konva.js** - Canvas drawing library
- **Service Workers** - Offline support
- **LocalStorage API** - Persistent data

All code is vanilla JavaScript (no build tools needed).

## License

Free to use, modify, and distribute.

## Next Steps

1. ✅ Create app icons (icon-192.png, icon-512.png)
2. ✅ Test locally with Python server
3. ✅ Deploy to HTTPS hosting
4. ✅ Test PWA installation
5. ✅ Gather feedback and improve

---

**Built with ❤️ for field electrical survey work**
