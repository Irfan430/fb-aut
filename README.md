# Endless Runner 3D 🏃‍♂️

A thrilling 3D endless runner game built with React, Three.js, and modern web technologies. Run, jump, and dodge obstacles in this Temple Run-inspired adventure!

![Game Preview](https://via.placeholder.com/800x400/4338ca/ffffff?text=Endless+Runner+3D)

## ✨ Features

- **🎮 3D Gameplay**: Immersive 3D graphics powered by Three.js and React Three Fiber
- **🏃‍♂️ Smooth Controls**: Responsive keyboard controls for running, jumping, and lane switching
- **🎯 Dynamic Obstacles**: Randomly generated obstacles with increasing difficulty
- **🏆 Score System**: Track your progress with real-time scoring and high score persistence
- **📱 Responsive Design**: Beautiful UI with Tailwind CSS that works on all devices
- **⚡ Physics Engine**: Realistic physics simulation using Cannon.js
- **🎨 Modern Graphics**: Stunning visual effects with shadows, lighting, and particle systems

## 🚀 Tech Stack

- **Frontend Framework**: React 18
- **3D Graphics**: Three.js + @react-three/fiber + @react-three/drei
- **Physics**: @react-three/cannon
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Deployment**: Render (Static Site)

## 🎮 Game Controls

| Key | Action |
|-----|--------|
| `A` or `←` | Move Left |
| `D` or `→` | Move Right |
| `W` or `↑` or `Space` | Jump |

## 🏗️ Project Structure

```
endless-runner-3d/
│
├── src/
│   ├── App.jsx                 # Main application component
│   ├── main.jsx               # React entry point
│   ├── index.css              # Global styles and Tailwind imports
│   ├── store/
│   │   └── gameStore.js       # Zustand game state management
│   ├── components/
│   │   ├── Runner.jsx         # Player character component
│   │   ├── Obstacles.jsx      # Obstacle generation and management
│   │   ├── Ground.jsx         # Infinite ground/track component
│   │   ├── ScoreBoard.jsx     # Score display component
│   │   └── GameMenu.jsx       # Start screen and game over menu
│   └── assets/
│       └── models/            # Directory for 3D model files (GLTF/GLB)
│
├── public/                    # Static assets directory
├── index.html                 # HTML template (Vite entry point)
├── package.json               # Dependencies and scripts
├── vite.config.js             # Vite configuration
├── tailwind.config.js         # Tailwind CSS configuration
├── postcss.config.js          # PostCSS configuration
├── render.yaml                # Render deployment configuration
├── .gitignore                 # Git ignore file
└── README.md                  # This file
```

## 🛠️ Local Development

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn package manager

### Installation & Setup

1. **Clone or download the project files**
   ```bash
   # If using git
   git clone <repository-url>
   cd endless-runner-3d
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   - Navigate to `http://localhost:5173`
   - The game should load automatically

### Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview
```

## 🏗️ Building for Production

To create an optimized production build:

```bash
npm run build
```

This will:
- Create a `dist/` directory with optimized static files
- Minify and bundle all assets
- Generate source maps for debugging
- Optimize images and other assets

The build output in the `dist/` folder can be served by any static file server.

## 🚀 Deployment

### Deploy to Render (Recommended)

This project is configured for easy deployment on Render as a static site:

1. **Push your code to a Git repository** (GitHub, GitLab, or Bitbucket)

2. **Create a new Static Site on Render**:
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New" → "Static Site"
   - Connect your Git repository

3. **Configure deployment settings**:
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
   - **Node Version**: Use the latest stable version

4. **Deploy**: Render will automatically build and deploy your site

The included `render.yaml` file provides additional configuration for:
- Automatic builds on push
- Pull request previews
- Security headers
- SPA routing support

### Alternative Deployment Options

The built static files in `dist/` can be deployed to any static hosting service:

- **Netlify**: Drag and drop the `dist` folder
- **Vercel**: Connect your Git repository
- **GitHub Pages**: Use GitHub Actions for automated deployment
- **Firebase Hosting**: Use Firebase CLI
- **AWS S3**: Upload files and configure for static website hosting

## 🎯 Gameplay Mechanics

### Objective
Run as far as possible while avoiding obstacles to achieve the highest score.

### Scoring System
- **Distance**: Earn points continuously based on distance traveled
- **Difficulty Scaling**: Game speed and obstacle frequency increase every 100 points
- **High Score**: Best score is automatically saved to local storage

### Obstacles
- **Red Boxes**: Solid barriers that require jumping or lane switching
- **Purple Spikes**: Tall obstacles best avoided by switching lanes
- **Orange Barriers**: Wide obstacles that may require jumping

### Game Over Conditions
- Collision with any obstacle
- Falling off the track

## 🛠️ Customization

### Adding New Obstacle Types

Edit `src/components/Obstacles.jsx`:

```jsx
const obstacleTypes = ['box', 'spike', 'barrier', 'yourNewType']

// Add rendering logic in renderObstacle()
case 'yourNewType':
  return (
    <mesh castShadow>
      <sphereGeometry args={[1]} />
      <meshLambertMaterial color="#your-color" />
    </mesh>
  )
```

### Modifying Game Physics

Adjust physics settings in `src/components/Runner.jsx`:

```jsx
const [ref, api] = useBox(() => ({
  mass: 1,              // Player weight
  material: {
    friction: 0.1,      // Surface friction
    restitution: 0.3    // Bounciness
  }
}))
```

### Changing Visual Themes

Update colors in `tailwind.config.js`:

```jsx
theme: {
  extend: {
    colors: {
      'game-primary': '#your-primary-color',
      'game-secondary': '#your-secondary-color',
    }
  }
}
```

## 🐛 Troubleshooting

### Common Issues

**Game not loading / White screen**
- Check browser console for JavaScript errors
- Ensure all dependencies are installed: `npm install`
- Try clearing browser cache

**Poor performance**
- Close other browser tabs
- Lower graphics quality by reducing shadow resolution in `src/App.jsx`
- Ensure hardware acceleration is enabled in your browser

**Build errors**
- Delete `node_modules` and run `npm install` again
- Ensure you're using Node.js version 16 or higher
- Check for any TypeScript errors if using `.ts` files

### Browser Compatibility

This game requires a modern browser with WebGL support:
- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests
- Improve documentation

## 🎮 Have Fun!

Enjoy playing Endless Runner 3D! Try to beat your high score and challenge your friends!

---

**Built with ❤️ using React, Three.js, and modern web technologies**