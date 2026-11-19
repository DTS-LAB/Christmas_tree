export type MemoryPhoto = { id: string; src: string; caption: string; demo?: boolean };

// Local illustrations keep the first visit independent of third-party image services.
export function makeMemories(): MemoryPhoto[] {
  return ['WINTER IN THE ALPS', 'A CHRISTMAS WISH', 'HOME FOR THE HOLIDAYS'].map((caption, i) => {
    const canvas = document.createElement('canvas'); canvas.width = 480; canvas.height = 540;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 540);
    gradient.addColorStop(0, ['#9bb0a8', '#122d2b', '#555650'][i]);
    gradient.addColorStop(1, ['#e1ded1', '#b19c72', '#ccad81'][i]);
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 480, 540);
    if (i === 0) {
      for (let n = 0; n < 5; n++) {
        ctx.fillStyle = ['#617f7b', '#839b94', '#c2ccc3', '#e5e6dc', '#f0ece0'][n];
        ctx.beginPath(); ctx.moveTo(-100, 480 + n * 12); ctx.lineTo(65 + n * 90, 100 + n * 30); ctx.lineTo(550, 500 + n * 20); ctx.fill();
      }
    } else if (i === 1) {
      ctx.fillStyle = '#17382c'; ctx.beginPath(); ctx.moveTo(240, 70); ctx.lineTo(65, 450); ctx.lineTo(415, 450); ctx.fill();
      for (let n = 0; n < 45; n++) {
        const y = 130 + n * 7; const x = 240 + Math.sin(n * 2.1) * (y - 60) * .36;
        ctx.fillStyle = '#ffe5a3'; ctx.shadowColor = '#ffce71'; ctx.shadowBlur = 15;
        ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
      } ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = '#293c32'; ctx.fillRect(90, 230, 300, 230);
      ctx.beginPath(); ctx.moveTo(45, 240); ctx.lineTo(240, 95); ctx.lineTo(435, 240); ctx.fill();
      ctx.fillStyle = '#e8cd93'; ctx.fillRect(140, 280, 65, 80); ctx.fillRect(275, 280, 65, 80);
      ctx.fillStyle = '#25352d'; ctx.fillRect(170, 280, 5, 80); ctx.fillRect(305, 280, 5, 80);
      ctx.fillStyle = '#e4ded0'; ctx.fillRect(0, 450, 480, 90);
    }
    for (let n = 0; n < 90; n++) { ctx.fillStyle = '#ffffff88'; ctx.beginPath(); ctx.arc((n * 137.5) % 480, (n * 71.3) % 540, n % 3 + .5, 0, 7); ctx.fill(); }
    return { id: `demo-${i}`, src: canvas.toDataURL('image/jpeg', .85), caption, demo: true };
  });
}

export async function readPhoto(file: File): Promise<MemoryPhoto> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('请选择 JPG、PNG 或 WebP 图片');
  if (file.size > 20 * 1024 * 1024) throw new Error('单张照片请小于 20 MB');
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('照片无法读取，请换一张试试'));
      element.src = url;
    });
    const scale = Math.min(1, 900 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height);
    return { id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`, src: canvas.toDataURL('image/jpeg', .83), caption: file.name.replace(/\.[^.]+$/, '').slice(0, 40) };
  } finally {
    URL.revokeObjectURL(url);
  }
}
