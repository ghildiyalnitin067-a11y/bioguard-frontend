/**
 * NotificationManager
 * ─────────────────────────────────────────────────────────────
 * • Requests browser notification permission when user logs in
 * • Polls for new alerts every 30 seconds and fires browser
 *   notifications for any that appeared since last check
 * • Shows an in-app toast bar for critical alerts
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  requestPermission, notifyAlert, notifyReport, hasPermission
} from '../services/notifications';

const POLL_MS = 30_000;

/* ── In-app toast (for critical alerts even without browser permission) ── */
let _showToast = null;
export function registerToastFn(fn) { _showToast = fn; }

export function useToast() {
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((t) => {
    const id = Date.now();
    setToasts(p => [...p, { ...t, id }]);
    setTimeout(() => setToasts(p => p.filter(x => x.id !== id)), 6000);
  }, []);
  return { toasts, addToast };
}

export default function NotificationManager() {
  const { user } = useAuth();
  const lastAlertIdRef = useRef(null);
  const pollingRef     = useRef(null);

  /* ── 1. Request permission whenever a user logs in ── */
  useEffect(() => {
    if (!user) return;
    requestPermission().then(granted => {
      if (granted) console.log('[Notif] Browser notifications enabled ✅');
    });
  }, [user]);

  /* ── 2. Poll for new alerts while user is logged in ── */
  const pollAlerts = useCallback(async () => {
    if (!user) return;
    try {
      const API = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');
      const token = localStorage.getItem('bioguard-jwt') || '';
      const res = await fetch(`${API}/api/alerts?limit=5`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return;
      const { alerts } = await res.json();
      if (!alerts?.length) return;

      const newest = alerts[0];
      // First poll — just record the latest ID, don't fire notification
      if (!lastAlertIdRef.current) {
        lastAlertIdRef.current = newest._id;
        return;
      }
      // Fire a notification for every alert newer than lastAlertId
      const newAlerts = [];
      for (const a of alerts) {
        if (a._id === lastAlertIdRef.current) break;
        newAlerts.push(a);
      }
      if (newAlerts.length) {
        lastAlertIdRef.current = alerts[0]._id;
        newAlerts.forEach(a => {
          if (hasPermission()) notifyAlert(a);
          // Also fire in-app toast
          if (_showToast) _showToast({
            severity: a.severity,
            text: `${a.headline || a.type + ' Alert'} — ${a.location}`,
          });
        });
      }
    } catch (_) { /* silent */ }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    pollAlerts(); // fallback initial fetch
    pollingRef.current = setInterval(pollAlerts, POLL_MS);
    
    // Connect to WebSocket for instant cross-role side pop-ups
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    const WS_URL  = API_URL.replace(/^http/, 'ws');
    let ws;
    try {
      ws = new WebSocket(WS_URL);
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.event === 'new_alert') {
            const a = msg.data;
            // Prevent duplicate toast if poll already caught it
            if (lastAlertIdRef.current === a._id) return;
            lastAlertIdRef.current = a._id;
            
            if (hasPermission()) notifyAlert(a);
            if (_showToast) _showToast({
               severity: a.severity,
               text: `${a.reportedBy?.role === 'admin' ? 'Admin' : 'Field Worker'} Alert: ${a.headline || a.type} — ${a.location}`,
               solutions: a.villageAdvisory?.solutions || a.solutions,
            });
          }
        } catch (_) {}
      };
    } catch (_) {}

    return () => {
      clearInterval(pollingRef.current);
      if (ws) ws.close();
    };
  }, [user, pollAlerts]);

  return null; // no UI
}
