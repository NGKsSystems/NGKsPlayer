# ProDJsession Splash Screen Setup

## ✅ Splash Screen Installed!

### What was added:
1. **SplashScreen.jsx** - Main splash component
2. **SplashScreen.css** - Styling with gradient animations
3. **AppWithSplash.jsx** - Wrapper to show splash on first load
4. **Updated main.jsx** - Integrated splash into app startup

### Features:
- ✅ 3-second display time
- ✅ Smooth fade-in/fade-out animations
- ✅ Gradient text effect (orange/red)
- ✅ Loading bar animation
- ✅ Blurred background image with overlay
- ✅ Shows only once per session (uses sessionStorage)
- ✅ Responsive design

### To complete setup:

**Add the background image:**
Save your DJ setup image as:
```
public/splash-background.jpg
```

The image should be:
- High resolution (1920x1080 or higher)
- Professional DJ setup with equipment
- Will be automatically blurred and darkened

### Testing:
1. Run `npm run dev`
2. Open the app - you'll see the splash screen
3. Refresh the page - splash won't show again this session
4. Close and reopen browser - splash shows again

### Customization:

**Change duration:**
Edit line 9 in `SplashScreen.jsx`:
```javascript
}, 3000); // Change to 2000 for 2 seconds, etc.
```

**Change tagline:**
Edit line 25 in `SplashScreen.jsx`:
```jsx
<p className="splash-tagline">Where Professionals Mix</p>
```

**Change colors:**
Edit the gradient in `SplashScreen.css` line 60:
```css
background: linear-gradient(
  135deg,
  #ff4500 0%,    /* Change these colors */
  #ff6b35 25%,
  #ff8c42 50%,
  #ff4500 75%,
  #ff6b35 100%
);
```

### File Structure:
```
src/
├── components/
│   ├── SplashScreen.jsx
│   └── SplashScreen.css
├── AppWithSplash.jsx
└── main.jsx (updated)

public/
└── splash-background.jpg (you need to add this)
```

## 🎉 ProDJsession is ready to rock!
