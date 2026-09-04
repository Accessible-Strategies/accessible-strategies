'use client';

import { useEffect, useRef, useState } from 'react';

interface VideoPlayerProps {
  src:        string;
  isHls:      boolean;
  alt:        string;
  thumbnail?: string;
}

/**
 * Plays either a direct video file (Mastodon) or an HLS stream
 * (Bluesky) using the same <video controls> element. No autoplay —
 * playback only starts on explicit user action (clicking play), so
 * this respects prefers-reduced-motion by construction without needing
 * a media query check.
 *
 * <video> has no native alt attribute — aria-label carries the
 * author-provided description through for screen reader users instead.
 *
 * hls.js failures used to be silent — a segment could 404 or fail to
 * decode and all you'd see was a frozen poster with working-looking
 * controls. Every error now logs to the console with hls.js's own
 * type/details, and fatal ones surface as an inline message so it's
 * obvious playback broke rather than just "isn't starting yet."
 */
export default function VideoPlayer({ src, isHls, alt, thumbnail }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setErrorMsg(null);
    const video = videoRef.current;
    if (!video || !isHls) return;

    // Safari supports HLS natively — no library needed there
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      return;
    }

    // Everywhere else: hls.js
    let hls: any;
    let cancelled = false;

    import('hls.js').then(({ default: Hls }) => {
      if (cancelled) return;
      if (!Hls.isSupported()) {
        setErrorMsg('This browser can’t play HLS video and hls.js isn’t supported either.');
        console.error('VideoPlayer: Hls.isSupported() is false in this browser.');
        return;
      }

      hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.ERROR, (_event: string, data: any) => {
        console.error('VideoPlayer hls.js error:', {
          type: data.type,
          details: data.details,
          fatal: data.fatal,
          src,
          raw: data,
        });

        if (!data.fatal) return;

        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            // Transient — a segment/manifest fetch failed. Retry once.
            hls.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            // Decode/buffer corruption — hls.js can often recover in place.
            hls.recoverMediaError();
            break;
          default:
            setErrorMsg(`Video failed to load (${data.details || 'unknown error'}).`);
            hls.destroy();
        }
      });
    }).catch(err => {
      console.error('VideoPlayer: failed to load hls.js module:', err);
      setErrorMsg('Video player failed to load.');
    });

    return () => {
      cancelled = true;
      hls?.destroy();
    };
  }, [src, isHls]);

  return (
    <div>
      <video
        ref={videoRef}
        src={isHls ? undefined : src}
        poster={thumbnail}
        controls
        preload="none"
        aria-label={alt || 'Video (no description provided)'}
        onError={e => {
          const el = e.currentTarget;
          // For HLS sources, `src` is intentionally left unset until
          // hls.js attaches the stream — some browsers fire a spurious
          // empty error against that not-yet-real source before
          // attachMedia() runs. el.error's fields are non-enumerable
          // getters (hence logging the raw object shows `{}`), and
          // el.currentSrc is empty for that spurious case, so use it to
          // filter out the noise. hls.js's own Hls.Events.ERROR handler
          // (above) is the real signal for HLS playback failures.
          if (isHls && !el.currentSrc) return;
          const mediaError = el.error;
          console.error('VideoPlayer <video> element error:', {
            code: mediaError?.code,
            message: mediaError?.message,
          });
          setErrorMsg(mediaError?.message || 'Video failed to load.');
        }}
        style={{ width: '100%', maxHeight: '480px', borderRadius: 'var(--as-radius-md)', background: '#000' }}
      />
      {errorMsg && (
        <p role="status" style={{ color: 'var(--as-error)', fontSize: 'var(--as-text-xs)', margin: '4px 0 0' }}>
          {errorMsg}
        </p>
      )}
    </div>
  );
}