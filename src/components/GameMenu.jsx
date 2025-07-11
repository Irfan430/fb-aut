import React from 'react'
import { useGameStore } from '../store/gameStore'

export default function GameMenu() {
  const { 
    gameStarted, 
    gameOver, 
    score, 
    highScore, 
    startGame, 
    resetGame 
  } = useGameStore()

  const handleStart = () => {
    if (gameOver) {
      resetGame()
    }
    startGame()
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center z-20 bg-black bg-opacity-50">
      <div className="bg-gradient-to-br from-indigo-900 to-purple-900 text-white p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4">
        {!gameStarted && !gameOver ? (
          // Start Screen
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              Endless Runner 3D
            </h1>
            <p className="text-gray-300 mb-6">
              Run, jump, and dodge obstacles in this thrilling 3D adventure!
            </p>
            
            <div className="mb-6">
              <div className="text-sm text-gray-400 mb-2">High Score</div>
              <div className="text-2xl font-bold text-yellow-400">
                {highScore.toLocaleString()}
              </div>
            </div>

            <div className="mb-6 text-left space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-blue-400">🏃‍♂️</span>
                <span>A/← Arrow: Move Left</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-blue-400">🏃‍♂️</span>
                <span>D/→ Arrow: Move Right</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">🦘</span>
                <span>W/↑ Arrow/Space: Jump</span>
              </div>
            </div>

            <button
              onClick={handleStart}
              className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-bold py-3 px-8 rounded-lg transform transition-all duration-200 hover:scale-105 pointer-events-auto"
            >
              Start Game
            </button>
          </div>
        ) : (
          // Game Over Screen
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4 text-red-400">
              Game Over!
            </h2>
            
            <div className="mb-6">
              <div className="text-sm text-gray-400 mb-1">Final Score</div>
              <div className="text-3xl font-bold text-yellow-400 mb-4">
                {score.toLocaleString()}
              </div>
              
              {score > highScore ? (
                <div className="bg-yellow-500 text-black px-3 py-1 rounded-full text-sm font-bold mb-2">
                  🎉 NEW HIGH SCORE! 🎉
                </div>
              ) : (
                <div className="text-sm text-gray-400 mb-2">
                  High Score: {highScore.toLocaleString()}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <button
                onClick={handleStart}
                className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-bold py-3 px-6 rounded-lg transform transition-all duration-200 hover:scale-105 pointer-events-auto"
              >
                Play Again
              </button>
              
              <div className="text-xs text-gray-500">
                Press any key to restart
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}