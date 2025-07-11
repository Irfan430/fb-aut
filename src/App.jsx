import React, { useEffect, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/cannon'
import { OrbitControls, Sky } from '@react-three/drei'
import { useGameStore } from './store/gameStore'
import Runner from './components/Runner'
import Ground from './components/Ground'
import Obstacles from './components/Obstacles'
import ScoreBoard from './components/ScoreBoard'
import GameMenu from './components/GameMenu'

function App() {
  const { 
    gameStarted, 
    gameOver, 
    movePlayer, 
    jump, 
    startGame,
    resetGame 
  } = useGameStore()

  // Handle keyboard controls
  const handleKeyPress = useCallback((event) => {
    if (!gameStarted || gameOver) return

    switch (event.key.toLowerCase()) {
      case 'a':
      case 'arrowleft':
        movePlayer('left')
        break
      case 'd':
      case 'arrowright':
        movePlayer('right')
        break
      case 'w':
      case 'arrowup':
      case ' ':
        event.preventDefault()
        jump()
        break
      default:
        break
    }
  }, [gameStarted, gameOver, movePlayer, jump])

  // Add event listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [handleKeyPress])

  return (
    <div className="w-full h-screen overflow-hidden relative">
      {/* 3D Canvas */}
      <Canvas 
        camera={{ 
          position: [0, 5, 8], 
          fov: 60,
          near: 0.1,
          far: 1000
        }}
        shadows
        className="bg-gradient-to-b from-sky-400 to-sky-200"
      >
        {/* Lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight 
          position={[10, 10, 5]} 
          intensity={1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={50}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />
        
        {/* Sky */}
        <Sky sunPosition={[100, 20, 100]} />
        
        {/* Physics World */}
        <Physics gravity={[0, -30, 0]}>
          {gameStarted && !gameOver && (
            <>
              <Runner />
              <Ground />
              <Obstacles />
            </>
          )}
        </Physics>

        {/* Camera Controls (disabled during gameplay) */}
        {(!gameStarted || gameOver) && (
          <OrbitControls 
            enablePan={false}
            enableZoom={false}
            enableRotate={true}
            autoRotate={true}
            autoRotateSpeed={0.5}
          />
        )}
      </Canvas>

      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Score Board */}
        {gameStarted && !gameOver && (
          <ScoreBoard />
        )}

        {/* Game Menu */}
        {(!gameStarted || gameOver) && (
          <GameMenu />
        )}

        {/* Controls Instructions */}
        {gameStarted && !gameOver && (
          <div className="absolute bottom-4 left-4 text-white text-sm bg-black bg-opacity-50 p-3 rounded-lg pointer-events-none">
            <div className="space-y-1">
              <div>🏃‍♂️ A/← : Move Left</div>
              <div>🏃‍♂️ D/→ : Move Right</div>
              <div>🦘 W/↑/Space : Jump</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App