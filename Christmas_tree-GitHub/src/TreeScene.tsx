import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, OrbitControls, Sparkles } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { MemoryPhoto } from './memories';

type SceneProps = { scattered: boolean; rotating: boolean; glow: number; photos: MemoryPhoto[]; onPhoto: (photo: MemoryPhoto) => void; reducedMotion: boolean };
function random(seed: number) { let n = seed; return () => { n = (n * 1664525 + 1013904223) >>> 0; return n / 4294967296; }; }
const vertexShader = `
  attribute vec3 aChaos; attribute vec3 aColor; attribute float aSize;
  uniform float uMorph; uniform float uTime; uniform float uPixelRatio;
  varying vec3 vColor;
  void main() {
    vec3 p = mix(position, aChaos, uMorph);
    p.x += sin(uTime * .35 + position.y * 3.0) * .035;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = min(14.0, aSize * uPixelRatio * (38.0 / -mv.z));
    vColor = aColor * (.8 + .2 * sin(uTime * 1.2 + position.x * 13.0 + position.y * 7.0));
  }`;
const fragmentShader = `varying vec3 vColor;
  void main() { float d = length(gl_PointCoord - .5) * 2.0; if(d > 1.0) discard;
    float alpha = pow(1.0 - d, 1.5); gl_FragColor = vec4(vColor, alpha); }`;

function Foliage({ scattered, reducedMotion }: Pick<SceneProps, 'scattered' | 'reducedMotion'>) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const { geometry, uniforms } = useMemo(() => {
    const rng = random(1225), count = 18000;
    const position = new Float32Array(count * 3), chaos = new Float32Array(count * 3), colors = new Float32Array(count * 3), sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const t = rng(), angle = rng() * Math.PI * 2;
      const tier = .83 + .17 * Math.sin(t * 68);
      const radius = 2.2 * Math.pow(1 - t, .87) * Math.sqrt(rng()) * tier;
      position.set([Math.cos(angle) * radius, t * 6.1 - 2.65, Math.sin(angle) * radius], i * 3);
      const a = rng() * Math.PI * 2, v = rng() * 2 - 1, r = 3.6 + rng() * 2.2;
      chaos.set([Math.cos(a) * Math.sqrt(1 - v * v) * r, v * r * .75 + .4, Math.sin(a) * Math.sqrt(1 - v * v) * r], i * 3);
      const gold = rng() > .77;
      colors.set(gold ? [1.3 + rng() * .65, .85 + rng() * .4, .28] : [.08 + rng() * .12, .48 + rng() * .55, .28 + rng() * .25], i * 3);
      sizes[i] = gold ? .65 + rng() * .8 : .45 + rng() * .6;
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
    geometry.setAttribute('aChaos', new THREE.BufferAttribute(chaos, 3)); geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3)); geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 9);
    return { geometry, uniforms: { uMorph: { value: 0 }, uTime: { value: 0 }, uPixelRatio: { value: Math.min(window.devicePixelRatio, 1.75) } } };
  }, []);
  useFrame(({ clock }, delta) => { if (material.current) { material.current.uniforms.uMorph.value = THREE.MathUtils.damp(material.current.uniforms.uMorph.value, scattered ? 1 : 0, reducedMotion ? 20 : 2.2, delta); material.current.uniforms.uTime.value = reducedMotion ? 0 : clock.elapsedTime; } });
  return <points geometry={geometry}><shaderMaterial ref={material} uniforms={uniforms} vertexShader={vertexShader} fragmentShader={fragmentShader} transparent depthWrite={false} blending={THREE.AdditiveBlending} /></points>;
}

type Kind = 'ball' | 'light' | 'gift';
function Ornaments({ kind, scattered, reducedMotion }: { kind: Kind; scattered: boolean; reducedMotion: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null), ribbonA = useRef<THREE.InstancedMesh>(null), ribbonB = useRef<THREE.InstancedMesh>(null);
  const morph = useRef(0);
  const { data, dummy } = useMemo(() => {
    const rng = random(kind === 'ball' ? 77 : kind === 'gift' ? 65 : 91), count = kind === 'ball' ? 170 : kind === 'light' ? 460 : 30;
    return { dummy: new THREE.Object3D(), data: Array.from({ length: count }, (_, i) => {
      const t = kind === 'light' ? i / count : rng() * .91;
      const angle = kind === 'light' ? t * Math.PI * 2 * 7.1 : rng() * Math.PI * 2;
      const r = 2.24 * Math.pow(1 - t, .88) + .04;
      const ground = kind === 'gift' && i < 10;
      const radius = ground ? 1.1 + rng() * 1.5 : r;
      const scale = kind === 'ball' ? .045 + rng() * .085 : kind === 'light' ? .018 + rng() * .014 : ground ? .26 + rng() * .19 : .10 + rng() * .08;
      const a = rng() * 6.28, y = rng() * 2 - 1, cr = 3.5 + rng() * 1.8;
      return { tree: new THREE.Vector3(Math.cos(angle) * radius, ground ? -2.85 + scale / 2 : t * 6.1 - 2.6, Math.sin(angle) * radius), chaos: new THREE.Vector3(Math.cos(a) * cr, y * 3.8 + .3, Math.sin(a) * cr), scale, rotation: rng() * Math.PI, color: new THREE.Color(kind === 'light' ? '#ffe0a0' : ['#c9a55b', '#e0c68c', '#1c644b', '#872e30'][i % 4]) };
    }) };
  }, [kind]);
  useFrame((_, dt) => {
    if (!mesh.current) return;
    morph.current = THREE.MathUtils.damp(morph.current, scattered ? 1 : 0, reducedMotion ? 20 : 2.2, dt);
    data.forEach((item, i) => {
      dummy.position.lerpVectors(item.tree, item.chaos, morph.current); dummy.rotation.set(morph.current * item.rotation, item.rotation, morph.current * .7);
      dummy.scale.setScalar(item.scale); dummy.updateMatrix(); mesh.current!.setMatrixAt(i, dummy.matrix);
      if (!mesh.current!.instanceColor) mesh.current!.setColorAt(i, item.color);
      if (kind === 'gift') {
        dummy.scale.set(item.scale * 1.025, item.scale * 1.025, item.scale * .17); dummy.updateMatrix(); ribbonA.current?.setMatrixAt(i, dummy.matrix);
        dummy.scale.set(item.scale * .17, item.scale * 1.03, item.scale * 1.03); dummy.updateMatrix(); ribbonB.current?.setMatrixAt(i, dummy.matrix);
      }
    });
    // Color initialization is done once; matrices alone change during morphing.
    if (mesh.current.userData.colored !== true) { data.forEach((item, i) => mesh.current!.setColorAt(i, item.color)); mesh.current.instanceColor!.needsUpdate = true; mesh.current.userData.colored = true; }
    mesh.current.instanceMatrix.needsUpdate = true;
    if (ribbonA.current) ribbonA.current.instanceMatrix.needsUpdate = true;
    if (ribbonB.current) ribbonB.current.instanceMatrix.needsUpdate = true;
  });
  return <>
    <instancedMesh ref={mesh} args={[undefined, undefined, data.length]} frustumCulled={false}>
      {kind === 'gift' ? <boxGeometry /> : <sphereGeometry args={[1, kind === 'ball' ? 16 : 6, kind === 'ball' ? 12 : 5]} />}
      {kind === 'light' ? <meshBasicMaterial color={[4, 2.5, .8]} toneMapped={false} /> : <meshStandardMaterial metalness={kind === 'ball' ? .85 : .5} roughness={kind === 'ball' ? .2 : .36} />}
    </instancedMesh>
    {kind === 'gift' && <>{[ribbonA, ribbonB].map((ref, i) => <instancedMesh key={i} ref={ref} args={[undefined, undefined, data.length]} frustumCulled={false}><boxGeometry /><meshStandardMaterial color="#e8cc89" metalness={.8} roughness={.26} /></instancedMesh>)}</>}
  </>;
}

function Polaroid({ photo, index, total, scattered, onPhoto, reducedMotion }: { photo: MemoryPhoto; index: number; total: number } & Pick<SceneProps, 'scattered' | 'onPhoto' | 'reducedMotion'>) {
  const group = useRef<THREE.Group>(null), morph = useRef(0);
  const parentRotation = useMemo(() => new THREE.Quaternion(), []);
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 400; canvas.height = 490;
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#f1ecde'; ctx.fillRect(0, 0, 400, 490);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const image = new Image(); image.onload = () => {
      const side = Math.min(image.width, image.height);
      ctx.drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, 23, 23, 354, 365);
      ctx.fillStyle = '#645c49'; ctx.font = '18px Georgia'; ctx.textAlign = 'center'; ctx.fillText(photo.caption.slice(0, 25), 200, 441, 350); texture.needsUpdate = true;
    }; image.src = photo.src;
    return texture;
  }, [photo]);
  const positions = useMemo(() => {
    const t = .22 + (index / Math.max(total - 1, 1)) * .49;
    const a = total <= 3 ? [-.85, .68, -.28][index] : index * 2.4;
    const r = 2.28 * Math.pow(1 - t, .87) + .12;
    return { tree: new THREE.Vector3(Math.sin(a) * r, t * 6.1 - 2.6, Math.cos(a) * r), chaos: new THREE.Vector3(Math.sin(index * 2.4 + .7) * 4.3, Math.cos(index * 1.7) * 2.3, Math.cos(index * 2.4 + .7) * 3.8) };
  }, [index, total]);
  useFrame(({ clock, camera }, dt) => { if (group.current) { morph.current = THREE.MathUtils.damp(morph.current, scattered ? 1 : 0, reducedMotion ? 20 : 2.2, dt); group.current.position.lerpVectors(positions.tree, positions.chaos, morph.current); group.current.parent?.getWorldQuaternion(parentRotation); group.current.quaternion.copy(parentRotation.invert()).multiply(camera.quaternion); group.current.rotateZ(Math.sin((reducedMotion ? 0 : clock.elapsedTime * .5) + index * 2) * .07); } });
  return <group ref={group}>
    <mesh position={[0, .48, 0]}><cylinderGeometry args={[.004, .004, .3, 6]} /><meshBasicMaterial color="#bfa25e" /></mesh>
    <mesh onClick={(e) => { e.stopPropagation(); onPhoto(photo); }} onPointerOver={() => { document.body.style.cursor = 'pointer'; }} onPointerOut={() => { document.body.style.cursor = ''; }}>
      <boxGeometry args={[.56, .69, .018]} /><meshBasicMaterial map={texture} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  </group>;
}

function Star({ scattered, reducedMotion }: Pick<SceneProps, 'scattered' | 'reducedMotion'>) {
  const ref = useRef<THREE.Group>(null);
  const shape = useMemo(() => { const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 === 0 ? .31 : .135; if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r); else s.lineTo(Math.cos(a) * r, Math.sin(a) * r); } s.closePath(); return s; }, []);
  useFrame((state, dt) => { if (ref.current) { ref.current.position.y = THREE.MathUtils.damp(ref.current.position.y, scattered ? 4.65 : 3.68, reducedMotion ? 20 : 2.2, dt); ref.current.rotation.y = reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * .4) * .25; } });
  return <group ref={ref} position={[0, 3.68, 0]}><mesh><extrudeGeometry args={[shape, { depth: .075, bevelEnabled: true, bevelSize: .025, bevelThickness: .02, bevelSegments: 2, steps: 1 }]} /><meshStandardMaterial color="#ffe0a0" emissive="#ffd57e" emissiveIntensity={2.3} metalness={.65} roughness={.18} /></mesh><pointLight color="#ffd587" intensity={8} distance={4} /></group>;
}

function World(props: SceneProps) {
  const tree = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (tree.current && props.rotating && !props.reducedMotion) tree.current.rotation.y += dt * .075; });
  return <>
    <color attach="background" args={['#061a15']} /><fog attach="fog" args={['#061a15', 14, 30]} />
    <ambientLight intensity={.6} /><directionalLight position={[4, 6, 5]} color="#ffe0ad" intensity={3} /><pointLight position={[-4, 1, 3]} color="#54b08b" intensity={20} />
    <Suspense fallback={null}><Environment files={`${import.meta.env.BASE_URL}environment/lobby.hdr`} environmentIntensity={.65} /></Suspense>
    <group ref={tree}>
      <Foliage {...props} /><Ornaments kind="ball" {...props} /><Ornaments kind="light" {...props} /><Ornaments kind="gift" {...props} />
      {props.photos.map((photo, index) => <Polaroid key={photo.id} photo={photo} index={index} total={props.photos.length} {...props} />)}
      <mesh position={[0, -2.55, 0]}><cylinderGeometry args={[.09, .15, .9, 12]} /><meshStandardMaterial color="#59452a" /></mesh>
    </group>
    <Star {...props} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.95, 0]}><circleGeometry args={[12, 96]} /><meshBasicMaterial color="#061a15" /></mesh>
    {[2.75, 2.85, 3.5].map((r, i) => <mesh key={r} rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.93, 0]}><ringGeometry args={[r, r + (i === 2 ? .006 : .012), 160]} /><meshBasicMaterial color={i === 2 ? '#345c45' : '#967846'} transparent opacity={.5} /></mesh>)}
    <Sparkles count={180} scale={[16, 11, 10]} position={[0, 1, -2]} size={1.8} speed={props.reducedMotion ? 0 : .18} opacity={.55} color="#e4c98c" />
    <OrbitControls makeDefault enablePan={false} minDistance={9} maxDistance={19} minPolarAngle={Math.PI * .28} maxPolarAngle={Math.PI * .57} target={[0, .5, 0]} enableDamping dampingFactor={.06} />
    <EffectComposer multisampling={0}><Bloom intensity={props.glow} luminanceThreshold={1} luminanceSmoothing={.45} mipmapBlur /><Vignette eskil={false} offset={.12} darkness={.45} /></EffectComposer>
  </>;
}
export default function TreeScene(props: SceneProps) {
  return <Canvas camera={{ position: [0, 1.2, 12.8], fov: 43 }} dpr={[1, 1.75]} gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }}><World {...props} /></Canvas>;
}
