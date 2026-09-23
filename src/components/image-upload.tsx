"use client";
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { uploadImage, withImageTimeout } from '@/lib/image-upload-request.mjs';

export default function ImageUpload({ destination, profile = false, onSaved, disabled = false, onBusyChange }: {
  destination: string; profile?: boolean; onSaved: (url: string) => void; disabled?: boolean; onBusyChange?: (busy: boolean) => void;
}) {
  const router = useRouter();
  const [preview, setPreview] = useState('');
  const [prepared, setPrepared] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState('');
  const [message, setMessage] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const generation = useRef(0);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);
  return <fieldset disabled={busy || disabled} className="form-stack">
    <label>Choose {profile ? 'a profile photo' : 'a team image'}
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" onChange={async event => {
        const file = event.target.files?.[0];
        const current = ++generation.current;
        setPrepared(null); setPreview(''); setMessage('');
        if (!file) return;
        if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > (profile ? 2 : 5) * 1024 * 1024) {
          setMessage(`Choose a JPEG, PNG, or WebP smaller than ${profile ? 2 : 5} MB.`); return;
        }
        setBusy(true); setStage('Preparing preview…');
        let expired = false;
        try {
          const bitmap = await withImageTimeout(createImageBitmap(file).then(bitmap => {
            if (expired) bitmap.close();
            return bitmap;
          }), 15000, 'This image is taking too long to open. Try a smaller photo or choose it again.', () => { expired = true; });
          try {
            if (bitmap.width * bitmap.height > 25_000_000) throw new Error('Choose an image under 25 megapixels.');
            const canvas = document.createElement('canvas');
            const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
            canvas.width = profile ? 512 : Math.max(1, Math.round(bitmap.width * scale));
            canvas.height = profile ? 512 : Math.max(1, Math.round(bitmap.height * scale));
            const context = canvas.getContext('2d');
            if (!context) throw new Error('Image preview is unavailable in this browser.');
            if (profile) {
              const side = Math.min(bitmap.width, bitmap.height);
              context.drawImage(bitmap, (bitmap.width-side)/2, (bitmap.height-side)/2, side, side, 0, 0, 512, 512);
            } else context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
            const blob = await withImageTimeout(new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', 0.85)), 15000, 'This image is taking too long to prepare. Try a smaller photo or choose it again.');
            if (!blob || blob.size > 2 * 1024 * 1024) throw new Error('Choose a smaller image.');
            if (current === generation.current) { setPrepared(blob); setPreview(URL.createObjectURL(blob)); }
          } finally { bitmap.close(); }
        } catch (error) { setMessage(error instanceof Error ? error.message : 'This image could not be read.'); }
        finally { setBusy(false); }
      }} />
    </label>
    <p className="muted">JPEG, PNG, or WebP · up to {profile ? '2' : '5'} MB. {profile ? 'Preview shows the centered square crop.' : 'Large images are resized automatically.'}</p>
    {preview && <div>{/* Local object URL, revoked when replaced or unmounted. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={preview} alt="Selected image preview" style={{ maxWidth: 200, maxHeight: 200, objectFit: 'contain' }} />
    </div>}
    <button className="button secondary" type="button" disabled={!prepared || busy} onClick={async () => {
      if (!prepared || busy) return;
      setBusy(true); setStage('Saving image…'); setMessage('');
      try {
        const result = await uploadImage(destination, prepared);
        onSaved(result.url); setMessage(result.message); setPrepared(null); setPreview('');
        if (input.current) input.current.value = '';
        router.refresh();
      } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to confirm the upload. Refresh and check before retrying.'); }
      finally { setBusy(false); }
    }}>{busy ? stage : 'Upload and save image'}</button>
    <p role="status" aria-live="polite">{message}</p>
  </fieldset>;
}
