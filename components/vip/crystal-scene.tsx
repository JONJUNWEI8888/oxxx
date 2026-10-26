'use client'

import {
  Edges,
  Environment,
  Float,
  Lightformer,
  MeshTransmissionMaterial,
  Sparkles,
} from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

const PINK = '#ee9ac4'
const PINK_LIGHT = '#ffd9ec'

function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

function useCrystalGeometry() {
  return useMemo(() => {
    const rand = seeded(7)
    const base = mergeVertices(new THREE.IcosahedronGeometry(0.95, 1))
    const pos = base.attributes.position
    const v = new THREE.Vector3()
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i)
      v.multiplyScalar(0.82 + rand() * 0.36)
      v.y *= 1.32
      pos.setXYZ(i, v.x, v.y, v.z)
    }
    const faceted = base.toNonIndexed()
    faceted.computeVertexNormals()
    return faceted
  }, [])
}

function Crystal({ unlocked }: { unlocked: boolean }) {
  const group = useRef<THREE.Group>(null)
  const geometry = useCrystalGeometry()

  useFrame((state, delta) => {
    const g = group.current
    if (!g) return
    g.rotation.y += delta * (unlocked ? 0.55 : 0.16)
    g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, state.pointer.y * -0.35, 0.04)
    g.rotation.z = THREE.MathUtils.lerp(g.rotation.z, state.pointer.x * -0.18, 0.04)
    const target = unlocked ? 1.12 : 1
    g.scale.setScalar(THREE.MathUtils.lerp(g.scale.x, target, 0.05))
  })

  return (
    <group ref={group}>
      <mesh geometry={geometry}>
        <MeshTransmissionMaterial
          backside
          samples={6}
          resolution={512}
          thickness={0.9}
          roughness={0.02}
          transmission={1}
          ior={1.55}
          chromaticAberration={0.04}
          anisotropicBlur={0.2}
          distortion={0.04}
          distortionScale={0.2}
          temporalDistortion={0.02}
          color="#8a7a84"
          attenuationColor="#3a2632"
          attenuationDistance={1.6}
        />
        <Edges threshold={12} color={PINK_LIGHT} transparent opacity={0.28} />
      </mesh>
    </group>
  )
}

function OrbitRing({ radius, tilt, speed }: { radius: number; tilt: [number, number]; speed: number }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.z += delta * speed
  })
  return (
    <mesh ref={ref} rotation={[tilt[0], tilt[1], 0]}>
      <torusGeometry args={[radius, 0.007, 16, 220]} />
      <meshStandardMaterial color={PINK_LIGHT} metalness={1} roughness={0.2} emissive={PINK} emissiveIntensity={0.12} transparent opacity={0.55} />
    </mesh>
  )
}

function Shards() {
  const shards = useMemo(() => {
    const rand = seeded(42)
    return Array.from({ length: 14 }, (_, i) => {
      const angle = (i / 14) * Math.PI * 2 + rand() * 0.4
      const r = 2.8 + rand() * 1.8
      return {
        position: [Math.cos(angle) * r, (rand() - 0.5) * 3.6, Math.sin(angle) * r * 0.6 - 0.8] as [number, number, number],
        rotation: [rand() * Math.PI, rand() * Math.PI, 0] as [number, number, number],
        scale: 0.06 + rand() * 0.14,
        speed: 0.8 + rand() * 1.6,
      }
    })
  }, [])

  return (
    <>
      {shards.map((s, i) => (
        <Float key={i} speed={s.speed} rotationIntensity={2.2} floatIntensity={1.4}>
          <mesh position={s.position} rotation={s.rotation} scale={s.scale}>
            <tetrahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={PINK_LIGHT} metalness={1} roughness={0.08} flatShading />
          </mesh>
        </Float>
      ))}
    </>
  )
}

function Rig() {
  useFrame((state) => {
    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, state.pointer.x * 0.6, 0.03)
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, state.pointer.y * 0.4, 0.03)
    state.camera.lookAt(0, 0, 0)
  })
  return null
}

export function CrystalScene({ unlocked }: { unlocked: boolean }) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 7], fov: 35 }}
      gl={{ antialias: true, powerPreference: 'high-performance', toneMappingExposure: 0.7 }}
      aria-hidden="true"
    >
      <color attach="background" args={['#000000']} />
      <fog attach="fog" args={['#000000', 6, 12]} />
      <ambientLight intensity={0.12} />
      <directionalLight position={[3, 4, 5]} intensity={0.7} color={PINK_LIGHT} />

      <Float speed={1.2} rotationIntensity={0.2} floatIntensity={0.6}>
        <Crystal unlocked={unlocked} />
      </Float>

      <OrbitRing radius={2.25} tilt={[Math.PI / 2.3, 0.2]} speed={0.12} />
      <OrbitRing radius={2.75} tilt={[Math.PI / 1.8, -0.35]} speed={-0.08} />

      <Shards />
      <Sparkles count={70} scale={[9, 6, 4]} size={2} speed={0.35} opacity={0.4} color={PINK_LIGHT} />

      <Environment resolution={256}>
        <Lightformer form="ring" intensity={0.6} color={PINK} position={[0, 3, -6]} scale={6} />
        <Lightformer form="rect" intensity={1.4} color="#ffffff" position={[-5, 1, 2]} rotation-y={Math.PI / 2} scale={[8, 2, 1]} />
        <Lightformer form="rect" intensity={1} color={PINK_LIGHT} position={[5, -1, 1]} rotation-y={-Math.PI / 2} scale={[6, 3, 1]} />
        <Lightformer form="circle" intensity={0.8} color="#ffffff" position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={3} />
      </Environment>

      <Rig />
    </Canvas>
  )
}
