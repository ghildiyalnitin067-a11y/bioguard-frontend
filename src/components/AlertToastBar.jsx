/**
 * AlertToastBar — in-app popup notification toasts
 * Handles three kinds:
 *   • alert toasts        (kind undefined / severity-based) – red/orange/blue
 *   • report toasts       (kind === 'report')               – green/amber with inline image
 *   • report_update toasts(kind === 'report_update')        – teal pill
 * Images: if previewImage (base64 DataURL) is present, shows thumbnail
 *         clicking thumbnail opens a full-screen lightbox
 */
import React, { useState, useCallback, useEffect } from 'react';
import { registerToastFn } from './NotificationManager';

/* ── Alert severity colours ── */
const SEV_COLOR = {
  critical: '#ff1744',
  high:     '#ff6d00',
  warning:  '#ff9100',
  medium:   '#ffc107',
  low:      '#4caf50',
  info:     '#29b6f6',
};

/* ── Urgency colour map for reports ── */
const URGENCY_COLOR = {
  critical: '#ff1744',
  high:     '#ff6d00',
  medium:   '#ffc107',
  low:      '#66bb6a',
};

function getReportColor(urgency = '') {
  return URGENCY_COLOR[urgency?.toLowerCase()] || '#43a047';
}

/* ──────────────────────────────────────────
   Full-screen image lightbox
─────────────────────────────────────────── */
function Lightbox({ src, alt, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'lbFadeIn 0.2s ease',
        cursor: 'zoom-out',
      }}
    >
      <img
        src={src}
        alt={alt || 'Report evidence'}
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '90vw', maxHeight: '90vh',
          borderRadius: 12,
          boxShadow: '0 8px 40px rgba(0,0,0,0.9)',
          cursor: 'default',
          animation: 'lbZoomIn 0.25s cubic-bezier(0.16,1,0.3,1)',
        }}
      />
      <button
        onClick={onClose}
        style={{
          position: 'fixed', top: 20, right: 24,
          background: 'rgba(255,255,255,0.12)', border: 'none',
          borderRadius: '50%', width: 40, height: 40,
          color: '#fff', fontSize: 20, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(8px)',
        }}
        aria-label="Close image"
      >✕</button>
      <style>{`
        @keyframes lbFadeIn { from{opacity:0} to{opacity:1} }
        @keyframes lbZoomIn { from{transform:scale(0.88)} to{transform:scale(1)} }
      `}</style>
    </div>
  );
}

/* ──────────────────────────────────────────
   Individual toast card
─────────────────────────────────────────── */
function Toast({ t, onClose }) {
  const [lightbox, setLightbox] = useState(null);

  const isReport       = t.kind === 'report';
  const isReportUpdate = t.kind === 'report_update';
  const isReportKind   = isReport || isReportUpdate;

  const accentColor = isReportKind
    ? getReportColor(t.urgency)
    : SEV_COLOR[t.severity] || '#4CAF50';

  const badge = isReport
    ? '📋 NEW REPORT'
    : isReportUpdate
      ? '🔄 REPORT UPDATE'
      : `${t.severity === 'critical' ? '🔴' : t.severity === 'warning' ? '🟠' : '🔵'} ${(t.severity || 'info').toUpperCase()} ALERT`;

  return (
    <>
      {lightbox && (
        <Lightbox
          src={lightbox}
          alt={t.text}
          onClose={() => setLightbox(null)}
        />
      )}

      <div style={{
        background: '#0d1117f2',
        border: `1px solid ${accentColor}44`,
        borderLeft: `4px solid ${accentColor}`,
        borderRadius: 14,
        padding: isReport && t.previewImage ? '12px 14px 12px 16px' : '12px 14px 12px 16px',
        backdropFilter: 'blur(16px)',
        boxShadow: `0 6px 28px ${accentColor}20, 0 2px 10px rgba(0,0,0,0.75)`,
        animation: 'rptSlideIn 0.35s cubic-bezier(0.16,1,0.3,1)',
        display: 'flex',
        flexDirection: 'column',
        gap: 5,
        minWidth: 290,
        maxWidth: 370,
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* Close button */}
        <button
          onClick={() => onClose(t.id)}
          style={{
            position: 'absolute', top: 8, right: 8,
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#666', fontSize: 14, lineHeight: 1, padding: 2,
            zIndex: 2,
          }}
          aria-label="Dismiss"
        >✕</button>

        {/* Badge row */}
        <div style={{
          fontSize: '0.7rem', fontWeight: 800,
          color: accentColor, letterSpacing: '0.6px',
          textTransform: 'uppercase',
        }}>
          {badge}
          {isReport && t.imageCount > 0 && (
            <span style={{
              marginLeft: 6, background: `${accentColor}22`,
              borderRadius: 100, padding: '1px 7px',
              fontSize: '0.65rem', fontWeight: 700,
            }}>
              📷 {t.imageCount} image{t.imageCount > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Main content row — text + image thumbnail side by side */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', paddingRight: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Main text */}
            <div style={{ fontSize: '0.84rem', color: '#e8eaed', lineHeight: 1.45 }}>
              {t.text}
            </div>

            {/* Description / subtext */}
            {t.subtext && (
              <div style={{ fontSize: '0.73rem', color: '#9aa0a6', lineHeight: 1.35, marginTop: 3 }}>
                {t.subtext}
              </div>
            )}

            {/* Ref ID chip */}
            {t.refId && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                marginTop: 5, padding: '2px 8px',
                background: `${accentColor}22`, borderRadius: 100,
                color: accentColor, fontSize: '0.68rem', fontWeight: 700,
              }}>
                🔖 {t.refId}
              </div>
            )}

            {/* Alert solutions */}
            {t.solutions?.slice(0, 2).map((s, i) => (
              <div key={i} style={{ fontSize: '0.73rem', color: '#a5d6a7', marginTop: 3 }}>
                ✅ {s}
              </div>
            ))}
          </div>

          {/* Image thumbnail (reports only) */}
          {isReport && t.previewImage && (
            <button
              onClick={() => setLightbox(t.previewImage)}
              title="Click to view full image"
              style={{
                flexShrink: 0,
                width: 70, height: 70,
                borderRadius: 10,
                overflow: 'hidden',
                border: `2px solid ${accentColor}55`,
                cursor: 'zoom-in',
                padding: 0,
                background: 'none',
                position: 'relative',
              }}
            >
              <img
                src={t.previewImage}
                alt="Evidence"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              {/* Zoom overlay */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,0,0,0)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, opacity: 0,
                transition: 'all 0.2s',
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(0,0,0,0.45)';
                  e.currentTarget.style.opacity = '1';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(0,0,0,0)';
                  e.currentTarget.style.opacity = '0';
                }}
              >🔍</div>
            </button>
          )}
        </div>

        {/* Progress bar auto-dismiss indicator */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
          background: `${accentColor}22`, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', background: accentColor,
            animation: 'rptProgress 6.5s linear forwards',
          }} />
        </div>
      </div>
    </>
  );
}

/* ──────────────────────────────────────────
   Toast container (fixed top-right)
─────────────────────────────────────────── */
export default function AlertToastBar() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((t) => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p.slice(-4), { ...t, id }]);   // max 5 toasts visible
    setTimeout(() => setToasts(p => p.filter(x => x.id !== id)), 6500);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(p => p.filter(x => x.id !== id));
  }, []);

  useEffect(() => { registerToastFn(addToast); }, [addToast]);

  if (!toasts.length) return null;

  return (
    <>
      <style>{`
        @keyframes rptSlideIn {
          from { opacity: 0; transform: translateX(52px) scale(0.94); }
          to   { opacity: 1; transform: translateX(0)    scale(1);    }
        }
        @keyframes rptProgress {
          from { width: 100%; }
          to   { width: 0%;   }
        }
      `}</style>

      <div style={{
        position: 'fixed', top: 72, right: 16, zIndex: 9998,
        display: 'flex', flexDirection: 'column', gap: 10,
        pointerEvents: 'none',
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{ pointerEvents: 'auto' }}>
            <Toast t={t} onClose={removeToast} />
          </div>
        ))}
      </div>
    </>
  );
}
