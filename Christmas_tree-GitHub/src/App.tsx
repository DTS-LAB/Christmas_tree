import { Component, Suspense, lazy, useEffect, useRef, useState } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { ArrowUpRight, Check, ChevronRight, Expand, ImagePlus, Maximize2, Minus, Pause, Play, Plus, RotateCcw, Sparkles, WandSparkles, X } from 'lucide-react';
import { makeMemories, readPhoto } from './memories';
import type { MemoryPhoto } from './memories';
import MobileScene from './MobileScene';
const TreeScene = lazy(() => import('./TreeScene'));
const STORAGE_KEY = 'evergreen-memories-v1';

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Scene error', error, info); }
  render() { return this.state.failed ? <div className="scene-loading"><Sparkles size={36} /><p>3D 场景暂时无法加载</p><span>请启用浏览器硬件加速后刷新页面。</span><button className="outline-button" onClick={() => window.location.reload()}>重新加载</button></div> : this.props.children; }
}
function loadPhotos() { try { const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); if (Array.isArray(stored)) return stored.filter((p): p is MemoryPhoto => p && typeof p.id === 'string' && typeof p.caption === 'string' && typeof p.src === 'string' && p.src.startsWith('data:image/')).slice(0, 12); } catch { /* Storage is optional. */ } return []; }
export default function App() {
  const [scattered, setScattered] = useState(false), [rotating, setRotating] = useState(true), [glow, setGlow] = useState(1.25);
  const [photos, setPhotos] = useState<MemoryPhoto[]>(loadPhotos), [demos] = useState(makeMemories);
  const [gallery, setGallery] = useState(false), [selected, setSelected] = useState<MemoryPhoto | null>(null), [toast, setToast] = useState('');
  const [uploading, setUploading] = useState(false), [fullscreen, setFullscreen] = useState(false), [sceneKey, setSceneKey] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [mobileScene, setMobileScene] = useState(() => window.matchMedia('(max-width: 760px)').matches || /iPhone|iPad|iPod|Android|MicroMessenger/i.test(navigator.userAgent));
  const fileInput = useRef<HTMLInputElement>(null), galleryButton = useRef<HTMLButtonElement>(null), modal = useRef<HTMLDivElement>(null), previousFocus = useRef<HTMLElement | null>(null);
  const displayPhotos = photos.length ? photos : demos;
  useEffect(() => { const media = window.matchMedia('(prefers-reduced-motion: reduce)'); const change = () => setReducedMotion(media.matches); media.addEventListener('change', change); return () => media.removeEventListener('change', change); }, []);
  useEffect(() => { const media = window.matchMedia('(max-width: 760px)'); const change = () => setMobileScene(media.matches || /iPhone|iPad|iPod|Android|MicroMessenger/i.test(navigator.userAgent)); media.addEventListener('change', change); return () => media.removeEventListener('change', change); }, []);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 4200); return () => window.clearTimeout(timer); }, [toast]);
  useEffect(() => { const change = () => setFullscreen(Boolean(document.fullscreenElement)); document.addEventListener('fullscreenchange', change); return () => document.removeEventListener('fullscreenchange', change); }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { const target = e.target as HTMLElement; if (e.code === 'Space' && !['INPUT', 'BUTTON', 'TEXTAREA'].includes(target.tagName) && !gallery && !selected) { e.preventDefault(); setScattered(s => !s); } if (e.key === 'Escape') { setGallery(false); setSelected(null); } };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, [gallery, selected]);
  useEffect(() => {
    if (!gallery && !selected) return;
    previousFocus.current = document.activeElement as HTMLElement;
    const previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    modal.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const trap = (event: KeyboardEvent) => { if (event.key !== 'Tab') return; const items = modal.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, [tabindex="0"]'); if (!items?.length) return; const first = items[0], last = items[items.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } };
    document.addEventListener('keydown', trap);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', trap); previousFocus.current?.focus(); };
  }, [gallery, selected]);
  const persist = (items: MemoryPhoto[]) => { setPhotos(items); try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); return true; } catch { setToast('照片已挂上树，但浏览器空间不足，刷新后可能丢失'); return false; } };
  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    const remaining = 12 - photos.length;
    if (remaining <= 0) { setToast('最多可以珍藏 12 张照片，请先移除一张'); return; }
    setUploading(true);
    try {
      const results = await Promise.allSettled(Array.from(files).slice(0, remaining).map(readPhoto));
      const added = results.flatMap(result => result.status === 'fulfilled' ? [result.value] : []);
      const errors = results.filter(result => result.status === 'rejected');
      if (added.length) { const saved = persist([...photos, ...added]); if (saved) setToast(`已挂上 ${added.length} 张回忆${files.length > remaining ? '，已达到 12 张上限' : ''}${errors.length ? '，部分文件格式不支持或过大' : ''}`); }
      else setToast(errors[0]?.status === 'rejected' ? String(errors[0].reason?.message || '照片无法读取，请换一张试试') : '没有可添加的照片');
    } finally { setUploading(false); if (fileInput.current) fileInput.current.value = ''; }
  };
  const toggleFullscreen = async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch { setToast('当前浏览器不支持全屏，请使用浏览器的全屏功能'); } };
  const reset = () => { setScattered(false); setRotating(true); setGlow(1.25); setSceneKey(k => k + 1); setToast('已回到最初的圣诞时刻'); };
  return <main className="app-shell">
    <header className="site-header flex items-center justify-between">
      <a href="#" className="brand" aria-label="Evergreen 首页"><span className="brand-symbol">✳</span><span>EVERGREEN<span className="brand-sub">A LITTLE CHRISTMAS MAGIC</span></span></a>
      <div className="header-right flex items-center"><span className="edition">THE CHRISTMAS COLLECTION <span> / </span> 2026</span><button className="icon-button fullscreen-button" onClick={toggleFullscreen} aria-label={fullscreen ? '退出全屏' : '进入全屏'} title={fullscreen ? '退出全屏' : '进入全屏'}><Maximize2 size={17} /></button></div>
    </header>
    <section className="experience" aria-label="互动圣诞树">
      <div className="scene-container" role="img" aria-label="由祖母绿粒子、金色彩球、礼物与拍立得照片组成的可旋转三维圣诞树">
        {mobileScene ? <MobileScene key={sceneKey} scattered={scattered} rotating={rotating} glow={glow} photos={displayPhotos} onPhoto={p => { setSelected(p); setRotating(false); }} reducedMotion={reducedMotion} /> :
          <SceneBoundary><Suspense fallback={<div className="scene-loading"><Sparkles className="loading-star" size={30} /><p>正在点亮你的圣诞树…</p></div>}><TreeScene key={sceneKey} scattered={scattered} rotating={rotating} glow={glow} photos={displayPhotos} onPhoto={p => { setSelected(p); setRotating(false); }} reducedMotion={reducedMotion} /></Suspense></SceneBoundary>}
      </div>
      <div className="scene-vignette" />
      <div className="hero-copy">
        <div className="eyebrow"><span /> MAKE ROOM FOR WONDER</div>
        <h1>A little magic.<br />A lasting <em>memory.</em></h1>
        <div className="gold-divider"><span /><Sparkles size={15} /></div>
        <h2>把回忆，挂上圣诞树。</h2>
        <p className="intro">让散落的星光，为你聚成一棵树。<br />收藏这一年的温暖，点亮属于你的圣诞。</p>
        <button className="primary-button group" onClick={() => setScattered(s => !s)}><WandSparkles size={18} /><span>{scattered ? '让星光聚成树' : '让星光散落'}</span><ArrowUpRight size={18} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></button>
        <div className="keyboard-hint">一点小魔法 <span>·</span> 也可以按 <kbd>SPACE</kbd></div>
        <div className="memory-card">
          <div className="memory-card-heading"><span className="tiny-label">MADE OF YOUR MOMENTS</span><span className="mini-star">✧</span></div>
          <div className="memory-content"><div className="photo-stack" aria-hidden="true">{displayPhotos.slice(0, 3).map((p, i) => <div key={p.id} style={{ transform: `rotate(${[-13, 4, 17][i]}deg)`, left: i * 23 }}><img src={p.src} alt="" /></div>)}</div><div><h3>每一张照片，都是礼物</h3><p>{photos.length ? `${photos.length} / 12 张专属回忆已点亮` : '上传照片，装点你的专属圣诞树'}</p></div></div>
          <button ref={galleryButton} className="memory-link" onClick={() => setGallery(true)}><span><ImagePlus size={15} />{photos.length ? '管理我的回忆' : '添加我的回忆'}</span><Plus size={17} /></button>
        </div>
      </div>
      <div className="scene-caption"><span className="status-dot" /><span>{scattered ? 'STARDUST / 星光漫游' : 'EVERGREEN / 星光成树'}</span></div>
      <div className="tree-note"><span>✦</span><p>May your days<br /><em>be merry & bright.</em></p></div>
      <div className="scene-instructions"><span className="mouse-icon" /> {mobileScene ? '拖动转动' : '拖动旋转 · 滚轮缩放'} <span>·</span> 点击照片查看</div>
      <div className="control-dock">
        <div className="state-control" role="group" aria-label="树的形态"><button className={!scattered ? 'active' : ''} aria-pressed={!scattered} onClick={() => setScattered(false)}><Sparkles size={15} /> 聚合成树</button><button className={scattered ? 'active' : ''} aria-pressed={scattered} onClick={() => setScattered(true)}><Expand size={15} /> 混沌散落</button></div>
        <span className="dock-divider" />
        <button className="rotation-button" onClick={() => setRotating(r => !r)} aria-pressed={rotating} title={reducedMotion ? '系统减少动态效果已启用' : undefined}>{rotating && !reducedMotion ? <Pause size={14} /> : <Play size={14} />}<span>{rotating && !reducedMotion ? '暂停旋转' : '自动旋转'}</span></button>
        <span className="dock-divider glow-divider" />
        <label className="glow-control"><span>辉光</span><input type="range" aria-label="辉光强度" min="0" max="2.5" step="0.05" value={glow} onChange={e => setGlow(Number(e.target.value))} /><span className="glow-value">{Math.round(glow * 40)}%</span></label>
        <button className="icon-button reset-button" onClick={reset} aria-label="重置视角与效果" title="重置视角与效果"><RotateCcw size={15} /></button>
      </div>
    </section>
    <footer className="site-footer"><span>A SEASON OF LIGHT. A WORLD OF MEMORIES.</span><span>为每一个值得珍藏的瞬间 <span className="footer-star">✦</span></span></footer>
    <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" tabIndex={-1} onChange={e => void upload(e.target.files)} />
    {toast && <div className="toast" role="status"><Check size={16} />{toast}</div>}
    {(gallery || selected) && <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) { setGallery(false); setSelected(null); } }}><div ref={modal} className={`modal ${selected ? 'photo-modal' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <button className="icon-button modal-close" aria-label="关闭" onClick={() => { setGallery(false); setSelected(null); }}><X size={20} /></button>
      {selected ? <><div className="enlarged-polaroid"><img src={selected.src} alt={selected.caption} /><h2 id="modal-title">{selected.caption}</h2></div><p className="photo-message">A little moment. A forever memory.</p></> : <>
        <span className="tiny-label">YOUR CHRISTMAS, YOUR STORIES</span><h2 id="modal-title">把美好，留在树上。</h2><p className="modal-intro">选择喜欢的照片，让这一年的回忆闪闪发光。</p>
        <button className="upload-zone" disabled={uploading || photos.length >= 12} onClick={() => fileInput.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (!uploading) void upload(e.dataTransfer.files); }}><ImagePlus size={28} /><strong>{uploading ? '正在装裱你的回忆…' : photos.length >= 12 ? '回忆已满 · 请先移除一张' : '点击选择，或将照片拖到这里'}</strong><span>JPG / PNG / WebP · 每张不超过 20 MB · 最多 12 张</span></button>
        <div className="gallery-title"><span>{photos.length ? '我的回忆' : '灵感预览'}</span><span>{photos.length} / 12</span></div>
        <div className="gallery-grid">{displayPhotos.map(p => <div className="gallery-photo" key={p.id}><button className="photo-preview" onClick={() => { setGallery(false); setSelected(p); }} aria-label={`查看 ${p.caption}`}><img src={p.src} alt={p.caption} /><span>{p.caption}</span></button>{!p.demo && <button className="remove-photo" aria-label={`移除 ${p.caption}`} onClick={() => { persist(photos.filter(item => item.id !== p.id)); setToast('照片已从树上取下'); }}><Minus size={14} /></button>}</div>)}</div>
        <p className="privacy-note">照片仅保存在当前浏览器，不会上传到服务器。<br />{photos.length === 0 && '当前树上展示的是示例插画，上传后将替换为你的照片。'}</p>
        <button className="outline-button" onClick={() => setGallery(false)}>回到我的圣诞树 <ChevronRight size={15} /></button>
      </>}
    </div></div>}
  </main>;
}
