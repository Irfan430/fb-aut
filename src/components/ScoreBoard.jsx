import React from 'react'
import { useGameStore } from '../store/gameStore'

export default function ScoreBoard() {
  const { score, difficulty, gameSpeed } = useGameStore()

  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 pointer-events-none">
      <div className="bg-black bg-opacity-70 text-white px-6 py-3 rounded-lg shadow-lg">
        <div className="text-center">
          <div className="text-3xl font-bold text-yellow-400 mb-1">
            {score.toLocaleString()}
          </div>
          <div className="text-sm text-gray-300">
            Score
          </div>
        </div>
        
        {/* Additional stats */}
        <div className="flex justify-between gap-4 mt-2 text-xs text-gray-400">
          <div className="text-center">
            <div className="text-orange-400 font-semibold">Lv.{difficulty}</div>
            <div>Level</div>
          </div>
          <div className="text-center">
            <div className="text-blue-400 font-semibold">{(gameSpeed * 100).toFixed(0)}</div>
            <div>Speed</div>
          </div>
        </div>
      </div>
    </div>
  )
}