# Electrical Survey App - PWA Setup Guide

## Overview
This is now a Progressive Web App (PWA) that works offline and can be installed on devices.

## Files Added
- `manifest.json` - PWA metadata and app configuration
- `service-worker.js` - Caching and offline support
- Updated `index.html` - Links manifest and adds PWA meta tags
- Updated `app.js` - Registers service worker

## Icons Setup

You need to create two icon files:
- `icon-192.png` - 192x192 pixels (for home screen)
- `icon-512.png` - 512x512 pixels (for splash screen)

### Quick Icon Generation (Option 1 - Using Online Tools)
1. Visit: https://www.favicon-generator.org/
2. Upload your icon/logo
3. Generate PNG icons
4. Download 192px and 512px versions
5. Place in project root as `icon-192.png` and `icon-512.png`

### Quick Icon Generation (Option 2 - Using ImageMagick)
```bash
# If you have an SVG or larger image:
convert icon.svg -resize 192x192 icon-192.png
convert icon.svg -resize 512x512 icon-512.png
```

### Temporary Solution (Option 3)
For testing without icons:
1. Create simple placeholder images using any image editor
2. Or use 1x1 transparent PNG temporarily
3. App will still work, just won't have proper icons

## Testing Locally

### 1. Using Python (Simple HTTP Server)
```bash
cd c:\Users\hpadmin\electrical-survey-app
python -m http.server 8000
```
Then visit: `http://localhost:8000`

### 2. Using Node.js http-server
```bash
npm install -g http-server
http-server
```

### 3. Chrome DevTools Testing
1. Open DevTools (F12)
2. Go to Application tab
3. Click "Service Workers" to see registration
4. Click "Manifest" to verify manifest.json is loaded
5. Look for "Install app" button in browser URL bar

## Deployment for Production

PWA features require **HTTPS**. To deploy:

1. **Choose a hosting service:**
   - Vercel, Netlify, GitHub Pages, Firebase Hosting
   - AWS S3 + CloudFront
   - Traditional web hosting with SSL

2. **Deploy with Git (Recommended - GitHub Pages + custom domain):**
   ```bash
   git add .
   git commit -m "PWA setup"
   git push origin main
   ```

3. **Enable HTTPS:**
   - Most modern hosting providers offer free HTTPS
   - Get SSL certificate from Let's Encrypt (free)

4. **Verify PWA Installation:**
   - Open app in Chrome
   - Look for "Install" button in address bar
   - Click to install as app
   - Test offline functionality

## Features After Installation

✅ Install as app on mobile and desktop
✅ Works offline (after first visit)
✅ App icon on home screen
✅ Standalone fullscreen mode
✅ Fast loading with caching
✅ Automatic updates when online

## Offline Data Persistence

The app already handles offline data via:
- `localStorage` - Saves surveys locally
- `indexedDB` (already used implicitly)
- Service Worker cache - Caches all static files

Your surveys are automatically saved offline!

## Troubleshooting

### Service Worker not registering?
- Check browser console (F12) for errors
- Ensure app is served over HTTPS in production
- Clear browser cache and reload

### Icons not showing?
- Create the icon-192.png and icon-512.png files
- Ensure they're in the root directory
- Clear cache and reload

### App not installing?
- Must be served over HTTPS (except localhost)
- manifest.json must be linked in HTML
- Check DevTools > Application > Manifest for errors

### Offline mode not working?
- First visit must be online to cache assets
- Check Service Worker cache in DevTools
- Konva library must be downloaded on first visit

## File Structure
```
electrical-survey-app/
├── index.html          (updated with PWA meta tags)
├── app.js              (updated with SW registration)
├── style.css
├── manifest.json       (NEW)
├── service-worker.js   (NEW)
├── icon-192.png        (TODO: Create)
├── icon-512.png        (TODO: Create)
└── README.md
```

## Next Steps

1. ✅ Icons created → Place `icon-192.png` and `icon-512.png` in project root
2. ✅ Test locally with Python server
3. ✅ Deploy to HTTPS hosting
4. ✅ Test installation in Chrome/Edge
5. ✅ Test offline functionality

## Additional PWA Features (Future)

Consider adding later:
- Web App Shell architecture
- Background sync
- Push notifications
- Install prompts
- Share target API
