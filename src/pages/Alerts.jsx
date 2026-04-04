import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, LayerGroup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  AlertTriangle, ShieldAlert, Info, Search,
  Clock, MapPin, ChevronRight, X, CheckCircle, Siren,
  Copy, Check, MessageSquare, Shield, Lightbulb,
  Users, RefreshCw, Bell, FileText, Plus, Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Alerts.css';

/* grab the global toast emitter set up by AlertToastBar */
function fireToast(t) {
  try { window.__bioguardToast?.(t); } catch (_) {}
}

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});


const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');
const API  = `${BASE}/api`;
const getToken = () => localStorage.getItem('bioguard-jwt') || '';

/* ── Custom advisory marker icon (glowing green bell) ── */
function makeAdvisoryIcon(severity) {
  const colors = { critical:'#ff1744', warning:'#ff9100', info:'#29b6f6' };
  const c = colors[severity] || '#4CAF50';
  return L.divIcon({
    className: '',
    html: `<div style="
      width:28px;height:28px;border-radius:50%;
      background:${c}22;border:2.5px solid ${c};
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 0 0 4px ${c}30,0 0 12px ${c}55;
      animation:pulse-marker 1.8s ease-in-out infinite;
      font-size:14px;">
      🔔
    </div>
    <style>@keyframes pulse-marker{
      0%,100%{box-shadow:0 0 0 3px ${c}30,0 0 10px ${c}44;}
      50%{box-shadow:0 0 0 8px ${c}18,0 0 20px ${c}33;}
    }</style>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

function makeDefaultIcon(severity) {
  const colors = { critical:'#ff1744', warning:'#ff9100', info:'#29b6f6' };
  const c = colors[severity] || '#4CAF50';
  return L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${c};border:2px solid #fff;box-shadow:0 2px 6px ${c}88;"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -10],
  });
}

const TYPES   = ['All Types', 'Wildlife', 'Deforestation', 'Wildfire', 'Poaching', 'Conflict', 'Other'];
const REGIONS = ['All Regions', 'Assam', 'Arunachal Pradesh', 'Manipur', 'Meghalaya', 'Nagaland', 'Mizoram', 'Sikkim', 'Tripura'];
const SEV_ICON = { critical: Siren, warning: AlertTriangle, info: Info };

function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

/* ── Image lightbox ── */
function ReportLightbox({ src, onClose }) {
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, zIndex:99999,
      background:'rgba(0,0,0,0.93)', cursor:'zoom-out',
      display:'flex', alignItems:'center', justifyContent:'center',
      animation:'lbFadeIn 0.2s ease',
    }}>
      <img src={src} alt="Report evidence" onClick={e=>e.stopPropagation()}
        style={{ maxWidth:'90vw', maxHeight:'88vh', borderRadius:12,
          boxShadow:'0 8px 40px rgba(0,0,0,0.9)',
          animation:'lbZoom 0.25s cubic-bezier(0.16,1,0.3,1)',
          cursor:'default',
        }}
      />
      <button onClick={onClose} style={{
        position:'fixed', top:18, right:22,
        background:'rgba(255,255,255,0.1)', border:'none', borderRadius:'50%',
        width:40, height:40, color:'#fff', fontSize:20, cursor:'pointer',
        display:'flex', alignItems:'center', justifyContent:'center',
        backdropFilter:'blur(8px)',
      }}>✕</button>
      <style>{`
        @keyframes lbFadeIn { from{opacity:0} to{opacity:1} }
        @keyframes lbZoom   { from{transform:scale(0.85)} to{transform:scale(1)} }
      `}</style>
    </div>
  );
}

/* ── Report card (Community Reports tab) ── */
const URGENCY_COLOR = {
  'High — immediate risk to life or wildlife': '#ff4444',
  'Medium — situation developing':              '#ffa500',
  'Low — no immediate danger':                  '#4caf50',
};
const TYPE_EMOJI = { wildlife:'🐘', deforestation:'🌳', fire:'🔥', poaching:'🎯', other:'📋' };

function ReportCard({ report, onImageClick }) {
  const urgColor = URGENCY_COLOR[report.urgency] ||
    (report.urgency?.toLowerCase().includes('high') ? '#ff4444' :
     report.urgency?.toLowerCase().includes('med')  ? '#ffa500' : '#4caf50');
  return (
    <div style={{
      background:'rgba(255,255,255,0.04)',
      border:`1px solid ${urgColor}33`,
      borderLeft:`4px solid ${urgColor}`,
      borderRadius:14, padding:'14px 16px',
      animation: report._live ? 'liveIn 0.4s cubic-bezier(0.16,1,0.3,1)' : 'none',
      position:'relative', overflow:'hidden',
    }}>
      {/* Live badge */}
      {report._live && (
        <span style={{
          position:'absolute', top:10, right:12,
          background:'#ff174422', border:'1px solid #ff174466',
          color:'#ff5252', fontSize:'0.62rem', fontWeight:800,
          padding:'1px 7px', borderRadius:100, letterSpacing:'0.5px',
          textTransform:'uppercase',
        }}>🔴 LIVE</span>
      )}
      <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap', marginBottom:6 }}>
            <span style={{ fontSize:'0.72rem', fontWeight:800, color: urgColor,
              textTransform:'uppercase', letterSpacing:'0.5px' }}>
              {TYPE_EMOJI[report.type] || '📋'} {report.type}
            </span>
            <span style={{ fontSize:'0.7rem', color:'#888' }}>•</span>
            <span style={{ fontSize:'0.7rem', color:'#888' }}>{report.region}</span>
            <span style={{ fontSize:'0.7rem', color:'#888' }}>•</span>
            <span style={{ fontSize:'0.7rem', color:'#666' }}>
              <Clock size={10} style={{verticalAlign:'middle', marginRight:3}}/>
              {timeAgo(report.createdAt || report.timestamp)}
            </span>
          </div>
          <div style={{ fontSize:'0.83rem', color:'#e0e0e0', marginBottom:4 }}>
            <MapPin size={12} style={{verticalAlign:'middle', marginRight:4, color:'#888'}}/>
            {report.location}
          </div>
          <p style={{ fontSize:'0.78rem', color:'#9aa0a6', margin:'4px 0 8px', lineHeight:1.5 }}>
            {report.description}
          </p>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            <span style={{
              fontSize:'0.68rem', fontWeight:700, padding:'2px 8px',
              background:`${urgColor}22`, color: urgColor,
              borderRadius:100,
            }}>{report.urgency?.split('—')[0]?.trim() || report.urgency}</span>
            {report.refId && (
              <span style={{ fontSize:'0.68rem', color:'#666',
                background:'rgba(255,255,255,0.06)', padding:'2px 8px', borderRadius:100 }}>
                🔖 {report.refId}
              </span>
            )}
            {report.status && (
              <span style={{
                fontSize:'0.68rem', fontWeight:700, padding:'2px 8px', borderRadius:100,
                background: report.status==='pending'   ? 'rgba(255,152,0,0.15)' :
                            report.status==='reviewed'  ? 'rgba(33,150,243,0.15)' :
                            report.status==='resolved'  ? 'rgba(76,175,80,0.15)' : 'rgba(255,68,68,0.1)',
                color:       report.status==='pending'   ? '#ffb74d' :
                            report.status==='reviewed'  ? '#64b5f6' :
                            report.status==='resolved'  ? '#81c784' : '#ff5252',
              }}>● {report.status}</span>
            )}
          </div>
        </div>
        {/* Image thumbnails */}
        {report.imageData?.length > 0 && (
          <div style={{ display:'flex', flexDirection:'column', gap:5, flexShrink:0 }}>
            {report.imageData.slice(0,3).map((img, i) => (
              <button key={i} onClick={() => onImageClick(img)}
                title="View full image"
                style={{
                  width:64, height:64, borderRadius:8, overflow:'hidden',
                  border:'2px solid rgba(255,255,255,0.12)',
                  cursor:'zoom-in', padding:0, background:'none',
                  position:'relative', display:'block',
                }}
              >
                <img src={img} alt={`Evidence ${i+1}`}
                  style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
                />
                {i === 2 && report.imageData.length > 3 && (
                  <div style={{
                    position:'absolute', inset:0,
                    background:'rgba(0,0,0,0.6)',
                    color:'#fff', fontWeight:700, fontSize:'0.75rem',
                    display:'flex', alignItems:'center', justifyContent:'center',
                  }}>+{report.imageData.length - 3}</div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Copy-to-clipboard hook ── */
function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };
  return [copied, copy];
}

/* ── Village Advisory Card ── */
function VillageAdvisory({ alert }) {
  const [copied, copy] = useCopy();
  const [expanded, setExpanded] = useState(true);

  /* Generate advisory from static templates if not in DB yet */
  const getStaticAdvisory = () => {
    const HEADLINES = {
      Wildlife:      { critical:['🚨 WILDLIFE DANGER — STAY INDOORS',        '🚨 वन्यजीव खतरा — घर के अंदर रहें'],
                       warning: ['⚠️ WILDLIFE ALERT — CAUTION ADVISED',     '⚠️ वन्यजीव सतर्कता — सावधान रहें'],
                       info:    ['ℹ️ WILDLIFE SIGHTING — INFORMATION',       'ℹ️ वन्यजीव दर्शन — सूचना'] },
      Deforestation: { critical:['🌳 URGENT — ILLEGAL TREE CUTTING DETECTED','🌳 अत्यावश्यक — अवैध पेड़ काटना पकड़ा गया'],
                       warning: ['⚠️ DEFORESTATION WARNING',                 '⚠️ वन कटाव चेतावनी'],
                       info:    ['ℹ️ LAND COVER CHANGE DETECTED',            'ℹ️ भूमि आच्छादन परिवर्तन'] },
      Wildfire:      { critical:['🔥 FIRE EMERGENCY — EVACUATE IF UNSAFE',   '🔥 आग आपातकाल — असुरक्षित हो तो घर छोड़ें'],
                       warning: ['⚠️ WILDFIRE RISK — BE ALERT',              '⚠️ जंगल की आग — सतर्क रहें'],
                       info:    ['ℹ️ FOREST FIRE DETECTED NEARBY',           'ℹ️ निकट में जंगल की आग'] },
      Poaching:      { critical:['🚫 CRITICAL — POACHING DETECTED',          '🚫 गंभीर — शिकार पकड़ा गया'],
                       warning: ['⚠️ POACHING ACTIVITY — REPORT NOW',        '⚠️ शिकार गतिविधि — जानकारी दें'],
                       info:    ['ℹ️ PATROL ACTIVE',                         'ℹ️ गश्त सक्रिय'] },
      Conflict:      { critical:['🚨 HUMAN-WILDLIFE CONFLICT — URGENT',      '🚨 मानव-वन्यजीव संघर्ष — तुरंत'],
                       warning: ['⚠️ ANIMAL MOVEMENT NEAR VILLAGE',          '⚠️ पशु आवाजाही — गाँव के पास'],
                       info:    ['ℹ️ ANIMAL MOVEMENT MONITORED',             'ℹ️ पशु आवाजाही निगरानी में'] },
    };
    const hl = HEADLINES[alert.type]?.[alert.severity] || ['⚠️ ALERT', '⚠️ सतर्कता'];
    return { headline: hl[0], headlineHindi: hl[1] };
  };

  const headline      = alert.headline      || getStaticAdvisory().headline;
  const headlineHindi = alert.headlineHindi || getStaticAdvisory().headlineHindi;
  const message       = alert.villageMessage || alert.description || 'Authorities have been alerted. Follow instructions from your Asha Worker and forest department.';
  const solutions     = alert.solutions?.length ? alert.solutions : [
    'Stay indoors and remain calm',
    'Contact your Asha Worker immediately',
    'Call Forest Department Helpline: 1800-11-0027',
    'Do NOT take any independent action',
  ];
  const prevention    = alert.prevention?.length ? alert.prevention : [
    'Report unusual animal activity promptly',
    'Stay updated via BioGuard alerts',
    'Participate in community safety programs',
  ];
  const whatsapp      = alert.whatsappText || `${headline}\n${headlineHindi}\n\n📍 ${alert.location}\n\n${message}\n\n📞 Helpline: 1800-11-0027`;

  const SEV_COLORS = { critical: '#ff1744', warning: '#ff9100', info: '#29b6f6' };
  const color = SEV_COLORS[alert.severity] || '#4CAF50';

  return (
    <div className="village-advisory">
      {/* Header */}
      <div className="va-header" style={{ borderColor: color + '55', background: color + '11' }}>
        <div className="va-header-left">
          <Users size={16} color={color} />
          <span style={{ color, fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Village Advisory Message
          </span>
        </div>
        <button className="va-toggle" onClick={() => setExpanded(e => !e)}>
          {expanded ? '▲ Collapse' : '▼ Expand'}
        </button>
      </div>

      {expanded && (
        <>
          {/* Headline */}
          <div className="va-headline" style={{ background: color + '18', borderLeft: `4px solid ${color}` }}>
            <div className="va-headline-en">{headline}</div>
            <div className="va-headline-hi">{headlineHindi}</div>
          </div>

          {/* Message */}
          <div className="va-message">
            <MessageSquare size={14} />
            <p>{message}</p>
          </div>

          {/* Solutions */}
          <div className="va-section">
            <div className="va-section-title">
              <CheckCircle size={14} color="#4CAF50" />
              <span>What To Do — क्या करें</span>
            </div>
            <ol className="va-list solutions-list">
              {solutions.map((s, i) => (
                <li key={i} className="va-list-item solution-item">
                  <span className="va-num">{i + 1}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Prevention */}
          <div className="va-section">
            <div className="va-section-title">
              <Shield size={14} color="#ab47bc" />
              <span>Prevention Tips — बचाव के उपाय</span>
            </div>
            <ul className="va-list prevention-list">
              {prevention.map((p, i) => (
                <li key={i} className="va-list-item prevention-item">
                  <Lightbulb size={12} color="#ab47bc" style={{ flexShrink: 0 }} />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Helplines */}
          <div className="va-helplines">
            <span>📞 Forest Helpline: <strong>1800-11-0027</strong></span>
            <span>🚑 Ambulance: <strong>108</strong></span>
            <span>🔥 Fire: <strong>101</strong></span>
          </div>

          {/* Copy button */}
          <button
            className={`va-copy-btn ${copied ? 'copied' : ''}`}
            onClick={() => copy(whatsapp)}
          >
            {copied ? <><Check size={14}/> Copied!</> : <><Copy size={14}/> Copy WhatsApp / SMS Message</>}
          </button>
        </>
      )}
    </div>
  );
}


/* ════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════ */
/* ── Create Alert Modal ── */
const ALERT_TYPES = ['Wildlife','Deforestation','Wildfire','Poaching','Conflict','Other'];
const DEFAULT_FORM = {
  type: 'Wildlife', severity: 'warning', location: '', state: '',
  description: '', action: '',
  lat: '', lng: '',
};

function CreateAlertModal({ onClose, onCreated, userRole }) {
  const [form,    setForm]    = useState(DEFAULT_FORM);
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    fetch(`${API_URL}/api/locations/suggestions`)
      .then(res => res.json())
      .then(data => setSuggestions(data.locations || []))
      .catch(() => {});
  }, []);

  const filteredSuggestions = suggestions.filter(s => 
    s.name.toLowerCase().includes((form.location||'').toLowerCase()) ||
    s.state.toLowerCase().includes((form.location||'').toLowerCase())
  ).slice(0, 10);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.location.trim() || !form.description.trim()) {
      setErr('Location and description are required.'); return;
    }
    setSaving(true); setErr('');
    try {
      const body = {
        type:        form.type,
        severity:    form.severity,
        location:    form.location.trim(),
        state:       form.state.trim() || 'Assam',
        description: form.description.trim(),
        action:      form.action.trim(),
        lat:         form.lat ? parseFloat(form.lat) : 26.2,
        lng:         form.lng ? parseFloat(form.lng) : 93.0,
      };
      const res = await fetch(`${API}/alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create alert');
      onCreated(json.alert);
      onClose();
    } catch (e) { setErr(e.message); }
    setSaving(false);
  };

  const SEV_OPTS = ['critical','warning','info'];
  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.05)', color: '#e0e0e0', fontSize: '0.84rem', outline: 'none',
    boxSizing: 'border-box',
  };
  const labelStyle = { fontSize: '0.72rem', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, display: 'block' };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9990,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn 0.2s ease',
    }}>
      <div style={{
        background: '#0f1117', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 18, width: '100%', maxWidth: 520, maxHeight: '90vh',
        overflowY: 'auto', padding: '24px 28px',
        boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
        animation: 'lbZoom 0.25s cubic-bezier(0.16,1,0.3,1)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <Zap size={18} color="#ff9100" />
              <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fff' }}>Create Live Alert</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#666', margin: 0 }}>Alert will be saved to database and broadcast to all users instantly</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', color: '#888', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16}/></button>
        </div>

        <form onSubmit={submit}>
          {/* Type + Severity */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Alert Type</label>
              <select value={form.type} onChange={e => set('type', e.target.value)} style={inputStyle}>
                {ALERT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Severity</label>
              <select value={form.severity} onChange={e => set('severity', e.target.value)} style={{ ...inputStyle, color: form.severity === 'critical' ? '#ff1744' : form.severity === 'warning' ? '#ff9100' : '#29b6f6' }}>
                {SEV_OPTS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
          </div>

          {/* Location + State */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 14 }}>
            <div style={{ position: 'relative' }}>
              <label style={labelStyle}>Location <span style={{ color: '#ff5252' }}>*</span></label>
              <input value={form.location} 
                onChange={e => {
                  set('location', e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Search village, park, or landmark…" style={inputStyle} 
              />
              {showSuggestions && filteredSuggestions.length > 0 && form.location && (
                <div className="autocomplete-dropdown" style={{
                  position: 'absolute', top: '100%', left: 0, right: 0,
                  background: '#1a1d24', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8, marginTop: 4, zIndex: 100, maxHeight: 200, overflowY: 'auto',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.5)'
                }}>
                  {filteredSuggestions.map((loc, i) => (
                    <div key={i} onClick={() => {
                      set('location', loc.name);
                      if (loc.state) set('state', loc.state);
                      if (loc.lat && loc.lng) { set('lat', loc.lat); set('lng', loc.lng); }
                      setShowSuggestions(false);
                    }} style={{
                      padding: '10px 14px', cursor: 'pointer', fontSize: '0.82rem',
                      borderBottom: i < filteredSuggestions.length-1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                      display: 'flex', flexDirection: 'column', gap: 2,
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <span style={{ color: '#fff', fontWeight: 600 }}>{loc.name}</span>
                      <span style={{ fontSize: '0.7rem', color: '#888' }}>{loc.state} • {loc.type}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label style={labelStyle}>State</label>
              <input value={form.state} onChange={e => set('state', e.target.value)} placeholder="e.g. Assam" style={inputStyle} />
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Description <span style={{ color: '#ff5252' }}>*</span></label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Describe what is happening…" rows={3}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
          </div>

          {/* Action */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Current Action</label>
            <input value={form.action} onChange={e => set('action', e.target.value)} placeholder="e.g. Rangers dispatched" style={inputStyle} />
          </div>

          {/* Coordinates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}>Latitude (optional)</label>
              <input type="number" value={form.lat} onChange={e => set('lat', e.target.value)} placeholder="26.57" style={inputStyle} step="any" />
            </div>
            <div>
              <label style={labelStyle}>Longitude (optional)</label>
              <input type="number" value={form.lng} onChange={e => set('lng', e.target.value)} placeholder="93.17" style={inputStyle} step="any" />
            </div>
          </div>

          {err && <div style={{ background: 'rgba(255,23,68,0.1)', border: '1px solid rgba(255,23,68,0.3)', borderRadius: 8, padding: '8px 12px', color: '#ff5252', fontSize: '0.8rem', marginBottom: 14 }}>{err}</div>}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '9px 20px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'none', color: '#888', fontSize: '0.84rem', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={saving} style={{
              padding: '9px 22px', borderRadius: 9, border: 'none',
              background: form.severity === 'critical' ? '#ff1744' : form.severity === 'warning' ? '#ff9100' : '#29b6f6',
              color: '#fff', fontWeight: 700, fontSize: '0.84rem', cursor: saving ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 7, opacity: saving ? 0.7 : 1,
            }}>
              <Zap size={14}/>{saving ? 'Broadcasting…' : 'Broadcast Alert'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const Alerts = () => {
  const { user } = useAuth();
  const canModerate = user?.role === 'admin' || user?.role === 'asha_worker';
  const [tab,        setTab]        = useState('alerts');   // 'alerts' | 'reports'
  const [alerts,     setAlerts]     = useState([]);
  const [reports,    setReports]    = useState([]);
  const [rptLoad,    setRptLoad]    = useState(false);
  const [lightbox,   setLightbox]   = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [liveCount,  setLiveCount]  = useState(0);
  const wsRef = useRef(null);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [severity,  setSeverity]  = useState('all');
  const [type,      setType]      = useState('All Types');
  const [region,    setRegion]    = useState('All Regions');
  const [selected,  setSelected]  = useState(null);
  const [showMap,   setShowMap]   = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const [apiError,  setApiError]  = useState('');

  /* ── Fetch from /api/alerts (DB alerts) ── */
  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setApiError('');
    try {
      const res = await fetch(`${API}/alerts?limit=100`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.alerts?.length) {
          setAlerts(prev => {
            // Merge: keep any _live WS alerts not yet in DB, prepend DB alerts
            const wsOnly = prev.filter(a => a._live && !json.alerts.find(x => x._id === a._id));
            return [...wsOnly, ...json.alerts];
          });
          setSelected(s => s ? (json.alerts.find(a => a._id === s._id) || s) : null);
        }
      } else {
        setApiError('Could not reach backend — showing cached data.');
      }
    } catch {
      setApiError('Backend unreachable. Check your internet connection.');
    }
    setLoading(false);
  }, []);


  /* ── Fetch community reports (public) ── */
  const fetchReports = useCallback(async () => {
    setRptLoad(true);
    try {
      const res = await fetch(`${API}/reports?limit=50`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const json = await res.json();
        setReports(json.reports || []);
      }
    } catch { /* silent */ }
    setRptLoad(false);
  }, [user, canModerate]);

  /* ── Live WebSocket — works for all users (no auth required) ── */
  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    const WS_URL  = API_URL.replace(/^http/, 'ws');
    const connect = () => {
      try {
        wsRef.current = new WebSocket(WS_URL);
        wsRef.current.onclose = () => setTimeout(connect, 5000);
        wsRef.current.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data);

            /* ── Live alert broadcast ── */
            if (msg.event === 'new_alert') {
              const a = { ...msg.data, _id: msg.data._id || msg.data.id, _live: true };
              setAlerts(prev => {
                if (prev.find(x => x._id === a._id)) return prev;
                return [a, ...prev.slice(0, 99)];
              });
              setLiveCount(c => c + 1);
              fireToast({
                severity: a.severity,
                text: `${a.type} Alert — ${a.location}`,
                subtext: a.description?.slice(0, 90),
                solutions: a.solutions,
              });
            }

            /* ── Real-Time GBIF/GFW/Satellite batch ── */
            if (msg.event === 'realtime_alert_batch' && msg.data?.alerts) {
              const batch = msg.data.alerts.map(a => ({
                ...a, _id: a.id || `rt-${Date.now()}-${Math.random()}`,
                _live: true, source: 'system',
              }));
              setAlerts(prev => {
                const newOnes = batch.filter(a => !prev.find(x => x._id === a._id));
                return newOnes.length > 0 ? [...newOnes, ...prev].slice(0, 100) : prev;
              });
              setLiveCount(c => c + batch.length);
            }

            /* ── Critical satellite alert toast ── */
            if (msg.event === 'realtime_critical_alert') {
              const a = msg.data;
              fireToast({
                severity: 'critical',
                text: `🛰️ SATELLITE ALERT — ${a.location}`,
                subtext: a.description?.slice(0, 90),
                solutions: a.solutions || ['Avoid area immediately.'],
              });
            }

            /* ── Reports ── */
            if (msg.event === 'new_report') {
              const r = { ...msg.data, _id: msg.data.id, _live: true, createdAt: msg.data.timestamp };
              setReports(prev => [r, ...prev.slice(0, 49)]);
              if (tab === 'reports') {
                fireToast({
                  kind: 'report',
                  text: `New ${msg.data.type} report — ${msg.data.location}`,
                  subtext: msg.data.description?.slice(0, 80),
                  urgency: msg.data.urgency?.toLowerCase().includes('high') ? 'high' : 'medium',
                  refId: msg.data.refId,
                  previewImage: msg.data.previewImage,
                  imageCount: msg.data.imageCount,
                });
              }
            }
            if (msg.event === 'report_updated') {
              setReports(prev => prev.map(r =>
                r._id === msg.data.id ? { ...r, status: msg.data.status, riskLevel: msg.data.riskLevel } : r
              ));
            }
          } catch (_) {}
        };
        wsRef.current.onerror = () => {};
      } catch (_) {}
    };
    connect();
    return () => { if (wsRef.current) wsRef.current.close(); };
  }, [tab]);

  useEffect(() => {
    fetchAlerts();
    // Refresh DB alerts every 5 minutes
    const t1 = setInterval(fetchAlerts, 5 * 60 * 1000);
    return () => clearInterval(t1);
  }, [fetchAlerts]);

  useEffect(() => {
    if (tab === 'reports') fetchReports();
  }, [tab, fetchReports]);

  // No auto-selection — user must click an alert to open its detail panel

  const filtered = alerts.filter(a => {
    const matchSev    = severity === 'all' || a.severity === severity;
    const matchType   = type    === 'All Types'   || a.type === type;
    const matchRegion = region  === 'All Regions' || a.state === region || a.region === region;
    const matchSearch = !search || a.location?.toLowerCase().includes(search.toLowerCase()) || a.type?.toLowerCase().includes(search.toLowerCase());
    return matchSev && matchType && matchRegion && matchSearch;
  });

  const counts = {
    critical: alerts.filter(a => a.severity === 'critical').length,
    warning:  alerts.filter(a => a.severity === 'warning').length,
    info:     alerts.filter(a => a.severity === 'info').length,
  };

  /* ── Handle newly created alert (from form) ── */
  const handleAlertCreated = useCallback((alert) => {
    setAlerts(prev => {
      if (prev.find(x => x._id === alert._id)) return prev;
      return [{ ...alert, _live: true }, ...prev.slice(0, 49)];
    });
    setLiveCount(c => c + 1);
    setActionMsg('🚀 Alert broadcast live to all users!');
    setTimeout(() => setActionMsg(''), 4000);
  }, []);

  const resolveAlert = async (id) => {
    try {
      const res = await fetch(`${API}/alerts/${id}/resolve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      setActionMsg('✅ Alert resolved successfully.');
      await fetchAlerts();
    } catch (e) { setActionMsg('❌ ' + e.message); }
    setTimeout(() => setActionMsg(''), 3000);
  };

  const deleteAlert = async (id) => {
    if (!window.confirm('Permanently delete this alert?')) return;
    try {
      const res = await fetch(`${API}/alerts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      setActionMsg('🗑️ Alert deleted.');
      setSelected(null);
      await fetchAlerts();
    } catch (e) { setActionMsg('❌ ' + e.message); }
    setTimeout(() => setActionMsg(''), 3000);
  };

  return (
    <div className="page-root alerts-page">
      {lightbox && <ReportLightbox src={lightbox} onClose={() => setLightbox(null)} />}
      {showCreate && <CreateAlertModal onClose={() => setShowCreate(false)} onCreated={handleAlertCreated} userRole={user?.role} />}

      <div className="page-header-bar">
        <div>
          <h1 className="page-title">
            <Bell size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Alert Management
          </h1>
          <p className="page-sub">
            {alerts.length} total alerts · {alerts.filter(a => a.status === 'active').length} active
            · Auto-generates village advisory with solutions &amp; prevention
          </p>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          {liveCount > 0 && (
            <span style={{
              fontSize: '0.72rem', fontWeight: 800, color: '#ff5252',
              background: 'rgba(255,23,68,0.12)', border: '1px solid rgba(255,23,68,0.3)',
              borderRadius: 100, padding: '3px 10px',
              display: 'flex', alignItems: 'center', gap: 5,
              animation: 'pulseLive 2s ease-in-out infinite',
            }}>
              <span style={{ width:7, height:7, borderRadius:'50%', background:'#ff5252', display:'inline-block' }}/>
              {liveCount} Live
            </span>
          )}
          <button className="icon-btn" onClick={tab === 'alerts' ? fetchAlerts : fetchReports}
            disabled={loading || rptLoad}>
            <RefreshCw size={14} className={(loading || rptLoad) ? 'spinning' : ''}/> Refresh
          </button>
          {tab === 'alerts' && (
            <button className={`icon-btn ${showMap ? 'active' : ''}`} onClick={() => setShowMap(!showMap)}>
              {showMap ? <X size={16}/> : <MapPin size={16}/>} {showMap ? 'Hide Map' : 'Show Map'}
            </button>
          )}
          {canModerate && tab === 'alerts' && (
            <button className="icon-btn create-alert-btn" onClick={() => setShowCreate(true)}>
              <Plus size={14}/> Create Alert
            </button>
          )}
        </div>
      </div>

      {/* ── API error banner ── */}
      {apiError && (
        <div style={{
          margin: '0 0 12px', padding: '10px 16px', borderRadius: 10,
          background: 'rgba(255,193,7,0.1)', border: '1px solid rgba(255,193,7,0.3)',
          color: '#ffc107', fontSize: '0.82rem', fontWeight: 600,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          ⚠️ {apiError}
          <button onClick={() => setApiError('')} style={{ background:'none', border:'none', cursor:'pointer', color:'inherit' }}>✕</button>
        </div>
      )}

      {/* ── Tab switcher ── */}
      <div style={{ display:'flex', gap:2, marginBottom:16,
        borderBottom:'1px solid rgba(255,255,255,0.08)', paddingBottom:0 }}>
        {[
          { key:'alerts',  label:'🚨 Alerts',             count: alerts.length },
          { key:'reports', label:'📋 Community Reports',  count: reports.length },
        ].map(t => (
          !t.restricted && (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                background:'none', border:'none', cursor:'pointer',
                padding:'10px 18px', fontSize:'0.85rem', fontWeight: tab===t.key ? 700 : 500,
                color: tab===t.key ? '#4caf50' : '#888',
                borderBottom: tab===t.key ? '2px solid #4caf50' : '2px solid transparent',
                transition:'all 0.2s', display:'flex', alignItems:'center', gap:6,
              }}
            >
              {t.label}
              <span style={{
                background: tab===t.key ? 'rgba(76,175,80,0.2)' : 'rgba(255,255,255,0.07)',
                color: tab===t.key ? '#81c784' : '#666',
                fontSize:'0.7rem', fontWeight:700,
                padding:'1px 7px', borderRadius:100,
              }}>{t.count}</span>
            </button>
          )
        ))}
      </div>

      {/* ══ REPORTS TAB ══ */}
      {tab === 'reports' && (
        <div>
          <div style={{ marginBottom:12, display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:'#4caf50',
              boxShadow:'0 0 0 2px #4caf5044', animation:'pulse-dot 2s infinite' }}/>
            <span style={{ fontSize:'0.75rem', color:'#666' }}>Live — new reports appear instantly</span>
          </div>
          <style>{`
            @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.4} }
            @keyframes liveIn {
              from { opacity:0; transform:translateY(-8px) scale(0.97); }
              to   { opacity:1; transform:translateY(0) scale(1); }
            }
          `}</style>
          {rptLoad && (
            <div style={{ textAlign:'center', color:'#555', padding:20, fontSize:'0.85rem' }}>
              Loading reports…
            </div>
          )}
          {!rptLoad && reports.length === 0 && (
            <div style={{ textAlign:'center', color:'#555', padding:32, fontSize:'0.85rem' }}>
              <FileText size={32} style={{ opacity:0.3, display:'block', margin:'0 auto 8px' }}/>
              No community reports yet.
            </div>
          )}
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {reports.map((r, i) => (
              <ReportCard key={r._id || r.refId || i} report={r} onImageClick={setLightbox} />
            ))}
          </div>
        </div>
      )}

      {/* ══ ALERTS TAB ══ */}
      {tab === 'alerts' && (<>

      {/* Severity counters */}
      <div className="sev-counters">
        {[
          { key: 'all',      label: 'All',     count: alerts.length,  color: '#555' },
          { key: 'critical', label: 'Critical', count: counts.critical, color: '#ff1744' },
          { key: 'warning',  label: 'Warning',  count: counts.warning,  color: '#ff9100' },
          { key: 'info',     label: 'Info',     count: counts.info,     color: '#29b6f6' },
        ].map(s => (
          <button key={s.key} className={`sev-counter ${severity === s.key ? 'active' : ''}`}
            style={{ '--sc': s.color }} onClick={() => setSeverity(s.key)}>
            <span className="sc-num">{s.count}</span>
            <span className="sc-lbl">{s.label}</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="search-wrap">
          <Search size={16} />
          <input placeholder="Search by location or type…" value={search}
            onChange={e => setSearch(e.target.value)} className="search-input" />
        </div>
        <select className="filter-select" value={type} onChange={e => setType(e.target.value)}>
          {TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <select className="filter-select" value={region} onChange={e => setRegion(e.target.value)}>
          {REGIONS.map(r => <option key={r}>{r}</option>)}
        </select>
      </div>

      {/* Optional map strip */}
      {showMap && (
        <div className="alert-map-strip">
          <MapContainer center={[26.2, 93.0]} zoom={6} className="alerts-map" scrollWheelZoom={false}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; OSM &copy; CARTO' />
            {/* Threat circles */}
            {filtered.map(a => (
              <Circle key={a._id + '-c'}
                center={[a.coordinates?.lat || 26, a.coordinates?.lng || 93]} radius={7000}
                pathOptions={{ color: a.severity==='critical'?'#ff1744': a.severity==='warning'?'#ff9100':'#29b6f6',
                  fillOpacity: 0.18, weight: 1.5 }}
                eventHandlers={{ click: () => setSelected(a) }}/>
            ))}
            {/* Advisory bell markers for alerts that have village messages */}
            {filtered.map(a => {
              const hasAdvisory = !!a.villageMessage;
              const icon = hasAdvisory ? makeAdvisoryIcon(a.severity) : makeDefaultIcon(a.severity);
              const lat  = a.coordinates?.lat || 26;
              const lng  = a.coordinates?.lng || 93;
              return (
                <Marker key={a._id} position={[lat, lng]} icon={icon}
                  eventHandlers={{ click: () => setSelected(a) }}>
                  <Popup maxWidth={280}>
                    <div style={{ fontFamily:'sans-serif' }}>
                      <div style={{ fontWeight:800, color: a.severity==='critical'?'#ff1744':a.severity==='warning'?'#ff9100':'#29b6f6', marginBottom:4 }}>
                        {a.headline || a.type + ' Alert'}
                      </div>
                      {a.headlineHindi && <div style={{ fontSize:'0.8rem', color:'#888', marginBottom:6 }}>{a.headlineHindi}</div>}
                      <div style={{ fontSize:'0.82rem', marginBottom:6 }}><strong>📍</strong> {a.location}</div>
                      {a.villageMessage && (
                        <div style={{ fontSize:'0.78rem', color:'#666', marginBottom:8, lineHeight:1.5 }}>
                          {a.villageMessage.slice(0, 160)}…
                        </div>
                      )}
                      {a.solutions?.slice(0,3).map((s,i) => (
                        <div key={i} style={{ fontSize:'0.75rem', color:'#4CAF50', marginBottom:2 }}>✅ {s}</div>
                      ))}
                      {hasAdvisory && <div style={{ fontSize:'0.7rem', color:'#ab47bc', marginTop:6 }}>🔔 Village Advisory Active</div>}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
          {/* Map legend */}
          <div style={{ padding: '6px 12px', display:'flex', gap:16, fontSize:'0.72rem', color:'#888', flexWrap:'wrap' }}>
            <span>🔴 Critical circle</span>
            <span>🟠 Warning circle</span>
            <span>🔵 Info circle</span>
            <span>🔔 Advisory marker (glowing = village message active)</span>
          </div>
        </div>
      )}

      {/* Main layout */}
      {/* Action feedback message */}
      {actionMsg && (
        <div style={{
          margin: '0 0 12px',
          padding: '10px 16px',
          borderRadius: 10,
          background: actionMsg.startsWith('❌') ? 'rgba(255,23,68,0.12)' : 'rgba(76,175,80,0.12)',
          color: actionMsg.startsWith('❌') ? '#ff5252' : '#81c784',
          fontSize: '0.85rem',
          fontWeight: 600,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          {actionMsg}
          <button onClick={() => setActionMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button>
        </div>
      )}

      <div className={`alerts-layout ${selected ? 'has-detail' : ''}`}>
        {/* Alert cards */}
        <div className="alerts-list-col">
          {filtered.length === 0 && !loading && (
            <div className="empty-state">
              <CheckCircle size={40} />
              <p>
                {alerts.length === 0
                  ? 'Connecting to backend… Alerts will appear shortly.'
                  : 'No alerts match the current filters.'}
              </p>
            </div>
          )}

          {/* Group: Real-Time Intelligence & Satellite */}
          {(() => {
            const sysAlerts = filtered.filter(a => a.source === 'system' || !a.source);
            return sysAlerts.length > 0 && (
              <>
                <div style={{ padding: '8px 8px 10px', margin: '4px 0 10px', borderBottom: '1px solid rgba(255,183,77,0.2)', background: 'rgba(255,183,77,0.04)', borderRadius: '8px 8px 0 0' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <h4 style={{ color: '#ffb74d', margin: 0, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Zap size={13} color="#ffb74d"/> Real-Time Intelligence &amp; Satellite Alerts
                    </h4>
                    <span style={{ fontSize:'0.68rem', fontWeight:700, color:'#ffb74d', background:'rgba(255,183,77,0.15)', borderRadius:100, padding:'2px 8px' }}>
                      {sysAlerts.length} alerts · GBIF · GFW · Satellite
                    </span>
                  </div>
                </div>
              </>
            );
          })()}
          {filtered.filter(a => a.source === 'system' || !a.source).map(a => {
            const Icon = SEV_ICON[a.severity] || AlertTriangle;
            return (
              <div key={a._id}
                className={`alert-card sev-${a.severity} ${selected?._id === a._id ? 'sel' : ''} ${a._live ? 'live-card' : ''}`}
                onClick={() => setSelected(a)}>
                <div className={`ac-strip sev-${a.severity}`} />
                <div className="ac-icon"><Icon size={20}/></div>
                <div className="ac-body">
                  <div className="ac-head">
                    {a._live && (
                      <span style={{
                        fontSize: '0.6rem', fontWeight: 800, color: '#ff5252',
                        background: 'rgba(255,23,68,0.12)', border: '1px solid rgba(255,23,68,0.3)',
                        borderRadius: 100, padding: '1px 7px', letterSpacing: '0.5px',
                        textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 4,
                      }}>
                        <span style={{ width:5, height:5, borderRadius:'50%', background:'#ff5252', display:'inline-block' }}/>
                        LIVE
                      </span>
                    )}
                    <span className={`sev-badge sev-${a.severity}`}>{a.severity}</span>
                    <span className={`status-badge ${a.status}`}>{a.status}</span>
                    {a.villageMessage && (
                      <span className="advisory-chip"><MessageSquare size={10}/> Village Advisory</span>
                    )}
                    <span className="ac-time"><Clock size={11}/> {timeAgo(a.createdAt)}</span>
                  </div>
                  <div className="ac-type">{a.type} <span style={{ color:'#666', fontSize:'0.7rem', fontWeight:400 }}>· System</span></div>
                  <div className="ac-loc"><MapPin size={12}/> {a.location}</div>
                  <p className="ac-desc">{a.description}</p>
                  <div className="ac-action">{a.action} <ChevronRight size={12}/></div>
                </div>
              </div>
            );
          })}

          {/* Loading indicator inside list */}
          {loading && alerts.length === 0 && (
            <div style={{ textAlign:'center', padding: '32px 20px', color:'#555' }}>
              <RefreshCw size={24} style={{ animation:'spin 1s linear infinite', marginBottom:8, display:'block', margin:'0 auto 12px' }}/>
              <div style={{ fontSize:'0.82rem' }}>Fetching real alerts from backend…</div>
              <div style={{ fontSize:'0.72rem', color:'#444', marginTop:4 }}>GBIF · GFW · Satellite · Field Patrol</div>
            </div>
          )}

          {/* Group: Field Patrols & Asha Workers */}
          {(() => {
            const fieldAlerts = filtered.filter(a => a.source === 'asha_worker' || a.source === 'admin');
            return fieldAlerts.length > 0 && (
              <div style={{ padding: '8px 8px 10px', margin: '20px 0 10px', borderBottom: '1px solid rgba(100,181,246,0.2)', background: 'rgba(100,181,246,0.04)', borderRadius: '8px 8px 0 0' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <h4 style={{ color: '#64b5f6', margin: 0, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Users size={13} color="#64b5f6"/> Asha Worker &amp; Field Patrol Alerts
                  </h4>
                  <span style={{ fontSize:'0.68rem', fontWeight:700, color:'#64b5f6', background:'rgba(100,181,246,0.15)', borderRadius:100, padding:'2px 8px' }}>
                    {fieldAlerts.length} alerts · Field-Verified
                  </span>
                </div>
              </div>
            );
          })()}
          {filtered.filter(a => a.source === 'asha_worker' || a.source === 'admin').map(a => {
            const Icon = SEV_ICON[a.severity] || AlertTriangle;
            return (
              <div key={a._id}
                className={`alert-card sev-${a.severity} ${selected?._id === a._id ? 'sel' : ''} ${a._live ? 'live-card' : ''}`}
                onClick={() => setSelected(a)}>
                <div className={`ac-strip sev-${a.severity}`} />
                <div className="ac-icon"><Icon size={20}/></div>
                <div className="ac-body">
                  <div className="ac-head">
                    {a._live && (
                      <span style={{
                        fontSize: '0.6rem', fontWeight: 800, color: '#ff5252',
                        background: 'rgba(255,23,68,0.12)', border: '1px solid rgba(255,23,68,0.3)',
                        borderRadius: 100, padding: '1px 7px', letterSpacing: '0.5px',
                        textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 4,
                      }}>
                        <span style={{ width:5, height:5, borderRadius:'50%', background:'#ff5252', display:'inline-block' }}/>
                        LIVE
                      </span>
                    )}
                    <span className={`sev-badge sev-${a.severity}`}>{a.severity}</span>
                    <span className={`status-badge ${a.status}`}>{a.status}</span>
                    {a.villageMessage && (
                      <span className="advisory-chip"><MessageSquare size={10}/> Village Advisory</span>
                    )}
                    <span className="ac-time"><Clock size={11}/> {timeAgo(a.createdAt)}</span>
                  </div>
                  <div className="ac-type">{a.type} <span style={{ color:'#81c784', fontSize:'0.7rem', fontWeight:600 }}>· Field Patrol Verified</span></div>
                  <div className="ac-loc"><MapPin size={12}/> {a.location}</div>
                  <p className="ac-desc">{a.description}</p>
                  <div className="ac-action">{a.action} <ChevronRight size={12}/></div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="detail-panel">
            <button className="detail-close" onClick={() => setSelected(null)}><X size={18}/></button>
            <div className={`dp-sev-bar sev-${selected.severity}`} />
            <div className="dp-head">
              <span className={`sev-badge sev-${selected.severity} big`}>{selected.severity}</span>
              <span className={`status-badge ${selected.status} big`}>{selected.status}</span>
            </div>
            <h2 className="dp-type">{selected.type} Alert</h2>
            <div className="dp-loc"><MapPin size={14}/> {selected.location}</div>
            <div className="dp-time"><Clock size={14}/> {timeAgo(selected.createdAt)}</div>
            <div className="dp-divider"/>
            <h4>Description</h4>
            <p className="dp-desc">{selected.description}</p>
            {selected.action && (
              <>
                <div className="dp-divider"/>
                <h4>Current Action</h4>
                <div className="dp-action-box">{selected.action}</div>
              </>
            )}
            <div className="dp-divider"/>

            {/* ══ Village Advisory ══ */}
            <VillageAdvisory alert={selected} />

            <div className="dp-divider"/>
            <div className="dp-mini-map">
              <MapContainer center={[selected.coordinates?.lat || 26, selected.coordinates?.lng || 93]} zoom={11}
                className="detail-map" scrollWheelZoom={false} zoomControl={false}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; OSM &copy; CARTO'/>
                <Circle center={[selected.coordinates?.lat || 26, selected.coordinates?.lng || 93]} radius={8000}
                  pathOptions={{ color: selected.severity==='critical'?'#ff1744':selected.severity==='warning'?'#ff9100':'#29b6f6',
                    fillOpacity: 0.3, weight: 2 }} />
                <Marker position={[selected.coordinates?.lat || 26, selected.coordinates?.lng || 93]}>
                  <Popup>{selected.location}</Popup>
                </Marker>
              </MapContainer>
            </div>

            {/* Moderation controls for admin / asha_worker */}
            {canModerate && selected.status !== 'resolved' && !selected._id?.startsWith('s') && (
              <>
                <div className="dp-divider"/>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: '4px 0' }}>
                  {selected.status !== 'resolved' && (
                    <button
                      onClick={() => resolveAlert(selected._id)}
                      style={{
                        background: 'rgba(76,175,80,0.15)', color: '#4CAF50',
                        border: '1px solid rgba(76,175,80,0.35)',
                        padding: '8px 18px', borderRadius: 10, fontSize: '0.82rem',
                        fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                      }}
                    >
                      <CheckCircle size={14}/> Mark Resolved
                    </button>
                  )}
                  {user?.role === 'admin' && (
                    <button
                      onClick={() => deleteAlert(selected._id)}
                      style={{
                        background: 'rgba(255,23,68,0.1)', color: '#ff5252',
                        border: '1px solid rgba(255,23,68,0.3)',
                        padding: '8px 18px', borderRadius: 10, fontSize: '0.82rem',
                        fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                        marginLeft: 'auto',
                      }}
                    >
                      <X size={14}/> Delete Alert
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
      </>)}
    </div>
  );
};

export default Alerts;
