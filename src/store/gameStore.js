import { create } from 'zustand'

export const useGameStore = create((set, get) => ({
  // Game state
  gameStarted: false,
  gameOver: false,
  score: 0,
  highScore: parseInt(localStorage.getItem('highScore')) || 0,
  
  // Player state
  playerPosition: [0, 0, 0],
  playerLane: 0, // -1 left, 0 center, 1 right
  isJumping: false,
  
  // Game settings
  gameSpeed: 0.1,
  difficulty: 1,
  
  // Actions
  startGame: () => set({ 
    gameStarted: true, 
    gameOver: false, 
    score: 0,
    playerLane: 0,
    isJumping: false,
    gameSpeed: 0.1,
    difficulty: 1
  }),
  
  endGame: () => {
    const { score, highScore } = get()
    const newHighScore = Math.max(score, highScore)
    localStorage.setItem('highScore', newHighScore.toString())
    set({ 
      gameOver: true,
      gameStarted: false,
      highScore: newHighScore
    })
  },
  
  resetGame: () => set({ 
    gameStarted: false,
    gameOver: false,
    score: 0,
    playerLane: 0,
    isJumping: false,
    gameSpeed: 0.1,
    difficulty: 1
  }),
  
  updateScore: () => set((state) => {
    const newScore = state.score + 1
    const newDifficulty = Math.floor(newScore / 100) + 1
    const newSpeed = Math.min(0.1 + (newDifficulty - 1) * 0.02, 0.3)
    
    return {
      score: newScore,
      difficulty: newDifficulty,
      gameSpeed: newSpeed
    }
  }),
  
  movePlayer: (direction) => set((state) => {
    if (state.gameOver || !state.gameStarted) return state
    
    let newLane = state.playerLane
    if (direction === 'left' && newLane > -1) {
      newLane -= 1
    } else if (direction === 'right' && newLane < 1) {
      newLane += 1
    }
    
    return {
      playerLane: newLane,
      playerPosition: [newLane * 2, state.playerPosition[1], state.playerPosition[2]]
    }
  }),
  
  jump: () => set((state) => {
    if (state.gameOver || !state.gameStarted || state.isJumping) return state
    return { isJumping: true }
  }),
  
  landJump: () => set({ isJumping: false }),
  
  updatePlayerPosition: (position) => set({ playerPosition: position })
}))