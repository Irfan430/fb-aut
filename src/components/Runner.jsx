import React, { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useBox } from '@react-three/cannon'
import { useGameStore } from '../store/gameStore'
import * as THREE from 'three'

export default function Runner() {
  const { 
    playerLane, 
    isJumping, 
    landJump, 
    updatePlayerPosition,
    endGame,
    gameSpeed
  } = useGameStore()

  const [ref, api] = useBox(() => ({
    mass: 1,
    position: [0, 1, 0],
    args: [0.8, 1.6, 0.8],
    material: {
      friction: 0.1,
      restitution: 0.3
    }
  }))

  const velocity = useRef([0, 0, 0])
  const position = useRef([0, 1, 0])

  // Subscribe to physics updates
  useEffect(() => {
    const unsubscribeVel = api.velocity.subscribe((v) => velocity.current = v)
    const unsubscribePos = api.position.subscribe((p) => {
      position.current = p
      updatePlayerPosition(p)
    })
    
    return () => {
      unsubscribeVel()
      unsubscribePos()
    }
  }, [api, updatePlayerPosition])

  // Handle lane changes and jumping
  useFrame((state, delta) => {
    const targetX = playerLane * 2
    const currentX = position.current[0]
    const diffX = targetX - currentX
    
    // Smooth lane transition
    if (Math.abs(diffX) > 0.1) {
      api.velocity.set(diffX * 8, velocity.current[1], velocity.current[2])
    } else {
      api.velocity.set(0, velocity.current[1], velocity.current[2])
    }

    // Handle jumping
    if (isJumping && Math.abs(velocity.current[1]) < 1) {
      api.velocity.set(velocity.current[0], 12, velocity.current[2])
    }

    // Check if landed from jump
    if (isJumping && position.current[1] <= 1.1 && velocity.current[1] <= 0) {
      landJump()
    }

    // Check if fallen off the world
    if (position.current[1] < -5) {
      endGame()
    }
  })

  return (
    <mesh ref={ref} castShadow receiveShadow>
      {/* Body */}
      <boxGeometry args={[0.8, 1.6, 0.8]} />
      <meshLambertMaterial color="#4f46e5" />
      
      {/* Head */}
      <mesh position={[0, 1, 0]}>
        <sphereGeometry args={[0.3]} />
        <meshLambertMaterial color="#fbbf24" />
      </mesh>
      
      {/* Arms */}
      <mesh position={[-0.6, 0.3, 0]}>
        <boxGeometry args={[0.2, 0.8, 0.2]} />
        <meshLambertMaterial color="#4f46e5" />
      </mesh>
      <mesh position={[0.6, 0.3, 0]}>
        <boxGeometry args={[0.2, 0.8, 0.2]} />
        <meshLambertMaterial color="#4f46e5" />
      </mesh>
      
      {/* Legs */}
      <mesh position={[-0.2, -1.2, 0]}>
        <boxGeometry args={[0.25, 0.8, 0.25]} />
        <meshLambertMaterial color="#1e40af" />
      </mesh>
      <mesh position={[0.2, -1.2, 0]}>
        <boxGeometry args={[0.25, 0.8, 0.25]} />
        <meshLambertMaterial color="#1e40af" />
      </mesh>
    </mesh>
  )
}