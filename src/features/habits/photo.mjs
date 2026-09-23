export const MAX_PHOTO_LENGTH = 100000;
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

// Only our small, re-encoded JPEG thumbnails may be persisted or rendered.
export function normalizePhoto(value) {
  return typeof value === 'string' && value.length <= MAX_PHOTO_LENGTH &&
    /^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]+={0,2}$/.test(value) ? value : null;
}

export async function prepareProfilePhoto(file) {
  if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw Error('JPEG・PNG・WebPの写真を選んでください。HEICの写真はJPEGに変換してから選択してください。');
  }
  if (file.size > MAX_PHOTO_BYTES) throw Error('10MB以下の写真を選んでください。');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve; image.onerror = () => reject(Error('写真を読み込めませんでした。別の写真を選んでください。')); image.src = url;
    });
    if (!image.naturalWidth || !image.naturalHeight) throw Error('写真のサイズを読み取れませんでした。');
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw Error('このブラウザでは写真を加工できませんでした。');
    ctx.fillStyle = '#f2f4f6'; ctx.fillRect(0, 0, 256, 256);
    const size = Math.min(image.naturalWidth, image.naturalHeight);
    ctx.drawImage(image, (image.naturalWidth - size) / 2, (image.naturalHeight - size) / 2, size, size, 0, 0, 256, 256);
    for (const quality of [0.85, 0.65, 0.45]) {
      const photo = normalizePhoto(canvas.toDataURL('image/jpeg', quality));
      if (photo) return photo;
    }
    throw Error('写真を小さくできませんでした。別の写真を選んでください。');
  } finally { URL.revokeObjectURL(url); }
}

export function renderAvatar(container, profile) {
  container.replaceChildren(); container.classList.add('profile-avatar'); container.removeAttribute('aria-label');
  const name = profile.name || '冒険者';
  const initials = document.createElement('span'); initials.textContent = Array.from(name.trim())[0] || 'R';
  const photo = normalizePhoto(profile.photo);
  if (photo) {
    const img = document.createElement('img'); img.alt = `${name}のプロフィール写真`;
    img.width = img.height = 256; img.decoding = 'async';
    img.addEventListener('error', () => container.replaceChildren(initials), {once: true});
    img.src = photo; container.append(img);
  } else { container.setAttribute('aria-label', `${name}のプロフィール`); container.append(initials); }
  return container;
}
