/**
 * AlertToastBar — in-app notification toasts
 * Appears at the top-right corner for every new alert.
 */
import React, { useState, useCallback, useEffect } from 'react';
import { registerToastFn } from './NotificationManager';

const SEV_COLOR = {
  critical: '#ff1744',
  warning:  '#ff9100',
  info:     '#29b6f6',
};

export default function AlertToastBar() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((t) => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p.slice(-4), { ...t, id }]);  // max 5 toasts
    setTimeout(() => setToasts(p => p.filter(x => x.id !== id)), 6500);
  }, []);

  // Register so NotificationManager can call us
  useEffect(() => { registerToastFn(addToast); }, [addToast]);

  if (!toasts.length) return null;

  return (
    <div style={{
      position: 'fixed', top: 72, right: 16, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 8,
      maxWidth: 360, pointerEvents: 'none',
    }}>
      {toasts.map(t => {
        const c = SEV_COLOR[t.severity] || '#4CAF50';
        return (
          <div key={t.id} style={{
            background: '#161b22ee',
            border: `1px solid ${c}55`,
            borderLeft: `4px solid ${c}`,
            borderRadius: 12,
            padding: '12px 16px',
            backdropFilter: 'blur(12px)',
            boxShadow: `0 4px 20px ${c}33, 0 2px 8px rgba(0,0,0,0.6)`,
            animation: 'slideInRight 0.3s ease',
            pointerEvents: 'auto',
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800,
              color: c, letterSpacing: '0.5px', marginBottom: 4,
              textTransform: 'uppercase' }}>
              {t.severity === 'critical' ? '🔴' : t.severity === 'warning' ? '🟠' : '🔵'} {t.severity || 'info'} ALERT
            </div>
            <div style={{ fontSize: '0.82rem', color: '#e0e0e0', lineHeight: 1.4 }}>
              {t.text}
            </div>
            {t.solutions?.slice(0,2).map((s, i) => (
              <div key={i} style={{ fontSize: '0.73rem', color: '#a5d6a7', marginTop: 4 }}>
                ✅ {s}
              </div>
            ))}
          </div>
        );
      })}
      <style>{`
        @keyframes slideInRight {
          from { opacity:0; transform: translateX(40px); }
          to   { opacity:1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
