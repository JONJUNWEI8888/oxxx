'use client'

import { Environment, Lightformer } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

type LogoSpec = { src: string; selector: string }

const LOGOS: LogoSpec[] = [
  { src: '/logos/bitcoin.svg', selector: '#btc-e' },
  { src: '/logos/tesla.svg', selector: 'path' },
  { src: '/logos/nvidia.svg', selector: 'path' },
]

const COIN_COUNT = 26
const FACE_SIZE = 512

async function loadLogo({ src, selector }: LogoSpec) {
  const text = await fetch(src).then((r) => r.text())
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml')
  const svg = doc.querySelector('svg')
  const [, , vw, vh] = (svg?.getAttribute('viewBox') ?? '0 0 24 24').split(/[\s,]+/).map(Number)
  const paths = Array.from(doc.querySelectorAll(selector)).map((p) => new Path2D(p.getAttribute('d') ?? ''))
  return { paths, vw, vh }
}

function paintFace(logo: Awaited<ReturnType<typeof loadLogo>>) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = FACE_SIZE
  const ctx = canvas.getContext('2d')!
  const c = FACE_SIZE / 2

  const base = ctx.createRadialGradient(c * 0.7, c * 0.6, 10, c, c, c)
  base.addColorStop(0, '#f4f4f6')
  base.addColorStop(0.55, '#b9b9c0')
  base.addColorStop(1, '#6f6f78')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, FACE_SIZE, FACE_SIZE)

  ctx.strokeStyle = 'rgba(40,40,48,0.55)'
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.arc(c, c, c - 34, 0, Math.PI * 2)
  ctx.stroke()

  ctx.strokeStyle = 'rgba(255,255,255,0.5)'
  ctx.lineWidth = 3
  for (let i = 0; i < 120; i++) {
    const a = (i / 120) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(c + Math.cos(a) * (c - 22), c + Math.sin(a) * (c - 22))
    ctx.lineTo(c + Math.cos(a) * (c - 12), c + Math.sin(a) * (c - 12))
    ctx.stroke()
  }

  const target = FACE_SIZE * 0.5
  const scale = target / Math.max(logo.vw, logo.vh)
  const drawLogo = (dx: number, dy: number, color: string) => {
    ctx.save()
    ctx.translate(c - (logo.vw * scale) / 2 + dx, c - (logo.vh * scale) / 2 + dy)
    ctx.scale(scale, scale)
    ctx.fillStyle = color
    for (const p of logo.paths) ctx.fill(p)
    ctx.restore()
  }
  drawLogo(-4, -4, 'rgba(255,255,255,0.85)')
  drawLogo(4, 4, 'rgba(20,20,26,0.7)')
  drawLogo(0, 0, '#9d9da6')

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

type CoinState = {
  x: number
  y: number
  z: number
  speed: number
  spin: THREE.Vector3
  rot: THREE.Euler
  scale: number
  kind: number
}

function randomCoin(height: number, width: number, startAbove: boolean): CoinState {
  return {
    x: (Math.random() - 0.5) * width,
    y: startAbove ? height / 2 + 1 + Math.random() * height : (Math.random() - 0.5) * height,
    z: -Math.random() * 6,
    speed: 0.6 + Math.random() * 0.9,
    spin: new THREE.Vector3((Math.random() - 0.5) * 2.2, (Math.random() - 0.5) * 2.6, (Math.random() - 0.5) * 1.2),
    rot: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI),
    scale: 0.55 + Math.random() * 0.55,
    kind: Math.floor(Math.random() * LOGOS.length),
  }
}

function Coins({ faces, reducedMotion }: { faces: THREE.Texture[]; reducedMotion: boolean }) {
  const { viewport } = useThree()
  const meshes = useRef<(THREE.Mesh | null)[]>([])
  const states = useMemo(
    () => Array.from({ length: COIN_COUNT }, () => randomCoin(viewport.height, viewport.width, false)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const geometry = useMemo(() => {
    const g = new THREE.CylinderGeometry(1, 1, 0.14, 64)
    g.rotateX(Math.PI / 2)
    return g
  }, [])

  const rim = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#e4dde3',
        metalness: 0.9,
        roughness: 0.22,
        emissive: '#d77fb8',
        emissiveIntensity: 0.18,
        envMapIntensity: 1.4,
      }),
    [],
  )

  const faceMaterials = useMemo(
    () =>
      faces.map(
        (map) => new THREE.MeshStandardMaterial({ map, metalness: 0.45, roughness: 0.32, envMapIntensity: 1.6 }),
      ),
    [faces],
  )

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05) * (reducedMotion ? 0.15 : 1)
    states.forEach((s, i) => {
      s.y -= s.speed * dt * 1.6
      s.rot.x += s.spin.x * dt
      s.rot.y += s.spin.y * dt
      s.rot.z += s.spin.z * dt
      if (s.y < -viewport.height / 2 - 2) Object.assign(s, randomCoin(viewport.height, viewport.width, true))
      const m = meshes.current[i]
      if (!m) return
      m.position.set(s.x, s.y, s.z)
      m.rotation.copy(s.rot)
      m.scale.setScalar(s.scale)
      const face = faceMaterials[s.kind]
      if (m.material instanceof Array && m.material[1] !== face) m.material = [rim, face, face]
    })
  })

  return (
    <>
      {states.map((s, i) => (
        <mesh
          key={i}
          ref={(el) => {
            meshes.current[i] = el
          }}
          geometry={geometry}
          material={[rim, faceMaterials[s.kind], faceMaterials[s.kind]]}
        />
      ))}
    </>
  )
}

export function FallingCoins() {
  const [faces, setFaces] = useState<THREE.Texture[] | null>(null)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    let cancelled = false
    let textures: THREE.Texture[] = []
    Promise.all(LOGOS.map(loadLogo)).then((logos) => {
      textures = logos.map(paintFace)
      if (cancelled) textures.forEach((t) => t.dispose())
      else setFaces(textures)
    })
    return () => {
      cancelled = true
      textures.forEach((t) => t.dispose())
    }
  }, [])

  return (
    <Canvas
      camera={{ position: [0, 0, 9], fov: 45 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true }}
      className="!absolute inset-0"
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 5, 6]} intensity={1.4} />
      <pointLight position={[-4, -2, 4]} intensity={18} color="#e58bc4" />
      <Environment resolution={128}>
        <Lightformer form="rect" intensity={3} position={[0, 4, 4]} scale={[10, 2, 1]} />
        <Lightformer form="rect" intensity={1.5} color="#f2a6d4" position={[-5, 0, 2]} scale={[2, 8, 1]} />
        <Lightformer form="rect" intensity={1} position={[5, -2, 3]} scale={[3, 6, 1]} />
      </Environment>
      {faces && <Coins faces={faces} reducedMotion={reducedMotion} />}
    </Canvas>
  )
}
