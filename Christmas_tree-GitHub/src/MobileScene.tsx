import { useEffect, useMemo, useRef } from 'react';
import type { MouseEvent } from 'react';
import type { MemoryPhoto } from './memories';

type Props = {
  scattered: boolean;
  rotating: boolean;
  glow: number;
  photos: MemoryPhoto[];
  onPhoto: (photo: MemoryPhoto) => void;
  reducedMotion: boolean;
};
type Particle = { t: number; a: number; r: number; chaosX: number; chaosY: number; gold: boolean; size: number };
type HitArea = { x: number; y: number; size: number; photo: MemoryPhoto };

function random(seed: number) {
  let n = seed;
  return () => { n = (n * 1664525 + 1013904223) >>> 0; return n / 4294967296; };
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, outer: number, inner: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + i * Math.PI / 5;
    const radius = i % 2 === 0 ? outer : inner;
    if (i === 0) ctx.moveTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
    else ctx.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
  }
  ctx.closePath();
}

export default function MobileScene({ scattered, rotating, glow, photos, onPhoto, reducedMotion }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const hitAreas = useRef<HitArea[]>([]);
  const rotation = useRef(0);
  const morphState = useRef(0);
  const drag = useRef<number | null>(null);
  const particles = useMemo(() => {
    const rng = random(1225);
    return Array.from({ length: 4200 }, (): Particle => ({
      t: rng(), a: rng() * Math.PI * 2, r: Math.sqrt(rng()),
      chaosX: rng() * 2 - 1, chaosY: rng() * 2 - 1,
      gold: rng() > .69, size: .65 + rng() * 1.7,
    }));
  }, []);
  const images = useMemo(() => photos.map(photo => {
    const image = new Image(); image.src = photo.src;
    return image;
  }), [photos]);

  useEffect(() => {
    const element = canvas.current;
    const ctx = element?.getContext('2d', { alpha: false });
    if (!element || !ctx) return;
    let width = 0, height = 0, frame = 0, last = 0;
    const resize = () => {
      const bounds = element.getBoundingClientRect();
      width = bounds.width; height = bounds.height;
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      element.width = Math.max(1, Math.round(width * dpr));
      element.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const draw = (time: number) => {
      frame = requestAnimationFrame(draw);
      if (time - last < 30) return;
      const dt = Math.min((time - last) / 1000 || .033, .08); last = time;
      morphState.current += (Number(scattered) - morphState.current) * (1 - Math.exp(-(reducedMotion ? 20 : 2.6) * dt));
      const morph = morphState.current;
      if (rotating && !reducedMotion) rotation.current += dt * .18;
      const cx = width / 2, top = height * .13, bottom = height * .88;
      const radius = Math.min(width * .39, height * .33);
      ctx.fillStyle = '#061a15'; ctx.fillRect(0, 0, width, height);
      const halo = ctx.createRadialGradient(cx, height * .53, 0, cx, height * .53, radius * 1.8);
      halo.addColorStop(0, `rgba(177,133,56,${.19 * glow})`);
      halo.addColorStop(.55, 'rgba(60,100,68,.10)'); halo.addColorStop(1, 'rgba(6,26,21,0)');
      ctx.fillStyle = halo; ctx.fillRect(0, 0, width, height);
      for (let i = 0; i < 4; i++) {
        ctx.strokeStyle = `rgba(193,157,93,${.19 - i * .035})`;
        ctx.lineWidth = 1; ctx.beginPath();
        ctx.ellipse(cx, bottom + 7, radius * (1.1 + i * .12), 13 + i * 4, 0, 0, Math.PI * 2); ctx.stroke();
      }
      for (const p of particles) {
        const tier = .88 + .12 * Math.sin(p.t * 66);
        const treeR = radius * Math.pow(1 - p.t, .88) * p.r * tier;
        const angle = p.a + rotation.current;
        const x = cx + Math.cos(angle) * treeR * (Math.sin(angle) > 0 ? 1 : .83);
        const y = bottom - p.t * (bottom - top) + Math.sin(angle) * treeR * .12;
        const px = x + (cx + p.chaosX * width * .55 - x) * morph;
        const py = y + (height * (.5 + p.chaosY * .47) - y) * morph;
        ctx.fillStyle = p.gold ? 'rgba(255,220,157,.96)' : 'rgba(100,191,132,.86)';
        ctx.fillRect(px, py, p.size, p.size);
      }
      // The luminous spiral is drawn in one pass so older mobile GPUs only see a 2D canvas.
      ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.shadowColor = '#ffd58d'; ctx.shadowBlur = 10 * glow;
      for (let i = 0; i < 220; i++) {
        const t = i / 220, angle = t * Math.PI * 2 * 6.7 + rotation.current;
        const r = radius * Math.pow(1 - t, .88) * 1.02;
        const x = cx + Math.sin(angle) * r;
        const y = bottom - t * (bottom - top) + Math.cos(angle) * r * .12;
        const px = x + (cx + Math.sin(i * 7.17) * width * .49 - x) * morph;
        const py = y + (height * (.15 + (i * 41 % 97) / 100) - y) * morph;
        ctx.fillStyle = i % 4 === 0 ? '#fff5c8' : '#e6bb6d';
        ctx.beginPath(); ctx.arc(px, py, i % 9 === 0 ? 2.2 : 1.15, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      const ornamentRng = random(77);
      for (let i = 0; i < 86; i++) {
        const t = ornamentRng() * .89, angle = ornamentRng() * 6.28 + rotation.current;
        const r = radius * Math.pow(1 - t, .88) * (.75 + ornamentRng() * .3);
        const treeX = cx + Math.sin(angle) * r, treeY = bottom - t * (bottom - top);
        const x = treeX + (cx + (ornamentRng() * 2 - 1) * width * .49 - treeX) * morph;
        const y = treeY + (height * ornamentRng() - treeY) * morph;
        const size = 2 + ornamentRng() * 3.6;
        ctx.fillStyle = ['#e5c281', '#b8924f', '#a73f39', '#286d50'][i % 4];
        ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff6d6bb'; ctx.beginPath(); ctx.arc(x - size * .32, y - size * .32, size * .27, 0, 7); ctx.fill();
      }
      for (let i = 0; i < 9; i++) {
        const x = cx + Math.sin(i * 2.4) * radius * (.42 + i % 3 * .18);
        const y = bottom - (i % 3) * 8;
        const px = x + (cx + Math.sin(i * 6.1) * width * .4 - x) * morph;
        const py = y + (height * (.22 + i * .075) - y) * morph;
        const size = 10 + i % 4 * 4;
        ctx.fillStyle = i % 3 === 0 ? '#b58751' : '#14573f'; ctx.fillRect(px - size / 2, py - size / 2, size, size);
        ctx.fillStyle = '#e2bd77'; ctx.fillRect(px - 2, py - size / 2, 4, size); ctx.fillRect(px - size / 2, py - 2, size, 4);
      }
      ctx.save(); ctx.shadowColor = '#ffe29d'; ctx.shadowBlur = 25 * glow;
      const starY = top - 7 - morph * 25;
      star(ctx, cx, starY, 13, 6); ctx.fillStyle = '#fff2bd'; ctx.fill(); ctx.restore();
      hitAreas.current = [];
      photos.forEach((photo, i) => {
        const t = .27 + i / Math.max(photos.length - 1, 1) * .46;
        const angle = i * 2.4 + .8 + rotation.current;
        const r = radius * Math.pow(1 - t, .87) * .87;
        const tx = cx + Math.sin(angle) * r, ty = bottom - t * (bottom - top);
        const x = tx + (cx + Math.sin(i * 3.8) * width * .43 - tx) * morph;
        const y = ty + (height * (.19 + (i * .23) % .62) - ty) * morph;
        const size = Math.max(23, Math.min(38, width * .09));
        ctx.fillStyle = '#f4eee0'; ctx.fillRect(x - size / 2, y - size / 2, size, size * 1.2);
        const image = images[i];
        if (image?.complete && image.naturalWidth) {
          const side = Math.min(image.naturalWidth, image.naturalHeight);
          ctx.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, x - size / 2 + 3, y - size / 2 + 3, size - 6, size - 8);
        }
        hitAreas.current.push({ x, y, size: size * 1.3, photo });
      });
    };
    resize(); frame = requestAnimationFrame(draw);
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize); };
  }, [particles, images, photos, scattered, rotating, glow, reducedMotion]);

  const onClick = (event: MouseEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left, y = event.clientY - rect.top;
    const hit = hitAreas.current.find(area => Math.abs(x - area.x) < area.size / 2 && Math.abs(y - area.y) < area.size / 2);
    if (hit) onPhoto(hit.photo);
  };
  return <canvas ref={canvas} className="mobile-scene" aria-label="互动粒子圣诞树" onClick={onClick}
    onPointerDown={e => { drag.current = e.clientX; }}
    onPointerMove={e => { if (drag.current !== null) { rotation.current += (e.clientX - drag.current) * .008; drag.current = e.clientX; } }}
    onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} />;
}
