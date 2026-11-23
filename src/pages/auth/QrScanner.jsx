import { useEffect, useId, useRef, useState } from 'react';
import useDialog, { dialogProps } from '../../hooks/useDialog.js';
import { codeFromScan } from '../../lib/galleryCode.js';

/*
  Reads QR codes from a video frame or a picture: the browser's own BarcodeDetector where there is one
  (Chrome on Android and macOS), otherwise jsQR, loaded only when the scanner first opens.
*/
let jsqr = null;
async function makeReader() {
  if ('BarcodeDetector' in window) {
    try {
      const formats = await window.BarcodeDetector.getSupportedFormats();
      if (formats.includes('qr_code')) {
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        return async (source) => (await detector.detect(source))[0]?.rawValue ?? null;
      }
    } catch {
      /* fall through to jsQR */
    }
  }
  if (!jsqr) jsqr = (await import('jsqr')).default;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  return async (source) => {
    const w = source.videoWidth || source.naturalWidth || source.width;
    const h = source.videoHeight || source.naturalHeight || source.height;
    if (!w || !h) return null;
    // big pictures are read at up to 1000px across: quicker, and a code still reads
    const scale = Math.min(1, 1000 / Math.max(w, h));
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return jsqr(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' })?.data ?? null;
  };
}

const NOT_OURS = 'That QR code is not a Actionify gallery code. Try the code on your card or in your gallery email.';

/*
  "Scan the QR code": a small window with the camera in a framed viewfinder and a scan line. The first
  gallery code it sees goes back to the form (`onCode`) and the window closes. No camera, or no
  permission: it says so and offers a photo of the code instead, which also works on any computer.
*/
export default function QrScanner({ open, onClose, onCode }) {
  const ref = useDialog(open, 300);
  const uid = useId();
  const videoRef = useRef(null);
  const fileRef = useRef(null);
  const [status, setStatus] = useState('starting'); // starting | scanning | nocamera | denied | reading
  const [note, setNote] = useState('');
  const [found, setFound] = useState('');

  useEffect(() => {
    if (!open) return;
    let stream = null;
    let timer = 0;
    let stopped = false;
    let lastBad = '';
    setStatus('starting');
    setNote('');
    setFound('');

    (async () => {
      const read = await makeReader();
      if (stopped) return;
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('nocamera');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch (err) {
        if (!stopped) setStatus(err?.name === 'NotAllowedError' ? 'denied' : 'nocamera');
        return;
      }
      if (stopped) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const video = videoRef.current;
      video.srcObject = stream;
      await video.play().catch(() => {});
      setStatus('scanning');

      // a frame every 180 ms is quick enough to feel instant and light on a phone
      const tick = async () => {
        if (stopped) return;
        try {
          const text = video.readyState >= 2 ? await read(video) : null;
          if (text) {
            const code = codeFromScan(text);
            if (code) {
              setFound(code);
              setTimeout(() => !stopped && onCode(code), 650);
              return;
            }
            if (text !== lastBad) {
              lastBad = text;
              setNote(NOT_OURS);
            }
          }
        } catch {
          /* a frame that could not be read: try the next */
        }
        timer = setTimeout(tick, 180);
      };
      tick();
    })();

    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // a photo of the code, from the camera roll or the computer
  async function fromPhoto(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setNote('');
    const prev = status;
    setStatus('reading');
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      const read = await makeReader();
      const text = await read(img);
      const code = text && codeFromScan(text);
      if (code) {
        setFound(code);
        setTimeout(() => onCode(code), 650);
      } else {
        setNote(text ? NOT_OURS : 'No QR code found in that picture. Try a sharper, closer photo of the code.');
        setStatus(prev === 'reading' ? 'nocamera' : prev);
      }
    } catch {
      setNote('That picture could not be opened. Try another.');
      setStatus(prev === 'reading' ? 'nocamera' : prev);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  const live = status === 'scanning' || status === 'starting';
  const message = found
    ? `Found ${found}`
    : status === 'starting'
      ? 'Starting the camera…'
      : status === 'scanning'
        ? 'Hold the QR code inside the frame'
        : status === 'reading'
          ? 'Reading the picture…'
          : status === 'denied'
            ? 'The camera is blocked for this site. Allow it in your browser, or use a photo of the code.'
            : 'No camera here. Use a photo of the QR code instead.';

  return (
    <dialog ref={ref} className="au-dialog au-scan" aria-labelledby={`${uid}-t`} {...dialogProps(open, onClose)}>
      <div className="au-dlg-in">
        <button className="glass-btn au-dlg-close" type="button" onClick={onClose} aria-label="Close the scanner">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
          </svg>
        </button>
        <h2 className="au-dlg-title display" id={`${uid}-t`}>
          Scan the QR code
        </h2>
        <p className="au-dlg-note">It is on your table card, your invitation or your gallery email.</p>

        <div className={`au-viewer${found ? ' is-found' : ''}${live ? '' : ' is-off'}`} data-status={status}>
          <video ref={videoRef} muted playsInline aria-hidden="true" />
          {!live && (
            <svg className="au-viewer-idle" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 8h3.5l1.7-2.5h7.6L17.5 8H21v11H3z" />
              <circle cx="12" cy="13.3" r="3.4" />
              {status !== 'reading' && <path d="M4 4l16 16" />}
            </svg>
          )}
          <span className="au-frame" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            {status === 'scanning' && !found && <span className="au-frame-line" />}
          </span>
          {found && (
            <span className="au-found" aria-hidden="true">
              <svg viewBox="0 0 12 12">
                <path d="M2.5 6.3l2.3 2.3L9.5 3.8" />
              </svg>
            </span>
          )}
        </div>

        <p className="au-scan-msg" role="status" aria-live="polite">
          {message}
        </p>
        {note && !found && (
          <p className="au-alert" role="alert">
            {note}
          </p>
        )}

        <div className="au-dlg-actions">
          <button className="glass-btn au-textbtn" type="button" onClick={() => fileRef.current?.click()}>
            <svg className="au-btn-ico" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3" y="4.5" width="18" height="15" rx="2" />
              <path d="M3 16l5-4.5 4 3.5 3-2.5 6 5" />
              <circle cx="16" cy="9" r="1.6" />
            </svg>
            Use a photo instead
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={fromPhoto} />
        </div>
      </div>
    </dialog>
  );
}
