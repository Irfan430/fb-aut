import React, { useRef, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useBox } from '@react-three/cannon'
import { useGameStore } from '../store/gameStore'

export default function Obstacles() {
  const { gameSpeed, endGame, difficulty } = useGameStore()
  const [obstacles, setObstacles] = useState([])
  const lastSpawnTime = useRef(0)

  const spawnObstacle = () => {
    const lanes = [-2, 0, 2] // Left, center, right lanes
    const randomLane = lanes[Math.floor(Math.random() * lanes.length)]
    const obstacleTypes = ['box', 'spike', 'barrier']
    const randomType = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)]
    
    const newObstacle = {
      id: Date.now() + Math.random(),
      position: [randomLane, 1, -50],
      type: randomType,
      lane: randomLane
    }
    
    setObstacles(prev => [...prev, newObstacle])
  }

  useFrame((state, delta) => {
    const currentTime = state.clock.elapsedTime
    
    // Spawn obstacles at regular intervals (adjusted by difficulty)
    const spawnInterval = Math.max(1.5 - difficulty * 0.1, 0.8)
    if (currentTime - lastSpawnTime.current > spawnInterval) {
      spawnObstacle()
      lastSpawnTime.current = currentTime
    }

    // Move obstacles forward and remove ones that are too far behind
    setObstacles(prev => 
      prev.map(obstacle => ({
        ...obstacle,
        position: [
          obstacle.position[0],
          obstacle.position[1],
          obstacle.position[2] + gameSpeed * 60 * delta
        ]
      })).filter(obstacle => obstacle.position[2] < 20)
    )
  })

  return (
    <group>
      {obstacles.map(obstacle => (
        <Obstacle 
          key={obstacle.id}
          position={obstacle.position}
          type={obstacle.type}
          onCollision={() => endGame()}
        />
      ))}
    </group>
  )
}

function Obstacle({ position, type, onCollision }) {
  const [ref, api] = useBox(() => ({
    position,
    args: getObstacleSize(type),
    type: 'Static',
    isTrigger: true,
    onCollide: (e) => {
      // Check if collision is with the player (has mass)
      if (e.body && e.body.mass > 0) {
        onCollision()
      }
    }
  }))

  useEffect(() => {
    api.position.set(...position)
  }, [position, api])

  const renderObstacle = () => {
    switch (type) {
      case 'box':
        return (
          <mesh castShadow>
            <boxGeometry args={[1.5, 1.5, 1.5]} />
            <meshLambertMaterial color="#f44336" />
          </mesh>
        )
      case 'spike':
        return (
          <mesh castShadow>
            <coneGeometry args={[0.8, 2, 8]} />
            <meshLambertMaterial color="#9c27b0" />
          </mesh>
        )
      case 'barrier':
        return (
          <group>
            <mesh castShadow position={[0, 0.5, 0]}>
              <boxGeometry args={[2, 1, 0.3]} />
              <meshLambertMaterial color="#ff9800" />
            </mesh>
            <mesh castShadow position={[-0.8, 0.5, 0]}>
              <cylinderGeometry args={[0.1, 0.1, 1]} />
              <meshLambertMaterial color="#424242" />
            </mesh>
            <mesh castShadow position={[0.8, 0.5, 0]}>
              <cylinderGeometry args={[0.1, 0.1, 1]} />
              <meshLambertMaterial color="#424242" />
            </mesh>
          </group>
        )
      default:
        return (
          <mesh castShadow>
            <boxGeometry args={[1, 1, 1]} />
            <meshLambertMaterial color="#666666" />
          </mesh>
        )
    }
  }

  return (
    <mesh ref={ref} position={position}>
      {renderObstacle()}
    </mesh>
  )
}

function getObstacleSize(type) {
  switch (type) {
    case 'box':
      return [1.5, 1.5, 1.5]
    case 'spike':
      return [1.6, 2, 1.6]
    case 'barrier':
      return [2, 1, 0.3]
    default:
      return [1, 1, 1]
  }
}