import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { usePlane } from '@react-three/cannon'
import { useGameStore } from '../store/gameStore'
import * as THREE from 'three'

export default function Ground() {
  const { gameSpeed, updateScore } = useGameStore()
  
  const groundSegments = useRef([])
  const lastScoreUpdate = useRef(0)

  // Create physics plane for collision
  const [ref] = usePlane(() => ({
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, 0, 0],
    material: {
      friction: 0.4,
      restitution: 0.3
    }
  }))

  // Generate ground segments
  const createGroundSegments = () => {
    const segments = []
    for (let i = 0; i < 20; i++) {
      segments.push({
        position: [0, 0, -i * 10],
        key: i
      })
    }
    return segments
  }

  if (groundSegments.current.length === 0) {
    groundSegments.current = createGroundSegments()
  }

  useFrame((state, delta) => {
    // Move ground segments forward
    groundSegments.current = groundSegments.current.map(segment => ({
      ...segment,
      position: [
        segment.position[0],
        segment.position[1],
        segment.position[2] + gameSpeed * 60 * delta
      ]
    }))

    // Remove segments that are too far behind and add new ones ahead
    groundSegments.current = groundSegments.current.filter(segment => 
      segment.position[2] < 30
    )

    while (groundSegments.current.length < 20) {
      const lastSegment = groundSegments.current[groundSegments.current.length - 1]
      const newZ = lastSegment ? lastSegment.position[2] - 10 : -190
      groundSegments.current.push({
        position: [0, 0, newZ],
        key: Date.now() + Math.random()
      })
    }

    // Update score based on distance traveled
    const currentTime = state.clock.elapsedTime
    if (currentTime - lastScoreUpdate.current > 0.1) {
      updateScore()
      lastScoreUpdate.current = currentTime
    }
  })

  return (
    <group>
      {/* Physics collision plane */}
      <mesh ref={ref} receiveShadow>
        <planeGeometry args={[1000, 1000]} />
        <meshLambertMaterial transparent opacity={0} />
      </mesh>

      {/* Visual ground segments */}
      {groundSegments.current.map((segment, index) => (
        <Ground3D key={segment.key} position={segment.position} />
      ))}
    </group>
  )
}

function Ground3D({ position }) {
  return (
    <group position={position}>
      {/* Main ground platform */}
      <mesh receiveShadow position={[0, -0.1, 0]}>
        <boxGeometry args={[8, 0.2, 10]} />
        <meshLambertMaterial color="#8b5a3c" />
      </mesh>

      {/* Lane dividers */}
      <mesh position={[-2, 0.01, 0]}>
        <boxGeometry args={[0.1, 0.02, 10]} />
        <meshLambertMaterial color="#ffeb3b" />
      </mesh>
      <mesh position={[2, 0.01, 0]}>
        <boxGeometry args={[0.1, 0.02, 10]} />
        <meshLambertMaterial color="#ffeb3b" />
      </mesh>

      {/* Side barriers */}
      <mesh position={[-4.5, 0.5, 0]}>
        <boxGeometry args={[1, 1, 10]} />
        <meshLambertMaterial color="#795548" />
      </mesh>
      <mesh position={[4.5, 0.5, 0]}>
        <boxGeometry args={[1, 1, 10]} />
        <meshLambertMaterial color="#795548" />
      </mesh>

      {/* Decorative elements */}
      {Array.from({ length: 3 }, (_, i) => (
        <mesh key={i} position={[6 + Math.random() * 4, 0.2, -8 + i * 8]}>
          <cylinderGeometry args={[0.1, 0.3, 0.4]} />
          <meshLambertMaterial color="#4caf50" />
        </mesh>
      ))}
    </group>
  )
}