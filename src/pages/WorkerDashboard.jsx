import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert, MapPin, Bell, FileText, Leaf,
  AlertTriangle, CheckCircle, Clock, Plus
} from 'lucide-react';
import { MapContainer, TileLayer, Circle, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import ReportsInbox from '../components/ReportsInbox';
import './RoleDashboard.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const WorkerDashboard = () => {
  const { user } = useAuth();
  const [alerts,    setAlerts]    = useState([]);
  const [myReports,  setMyReports]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [form,      setForm]      = useState({ type: 'Wildlife', severity: 'warning', location: '', state: user?.state || 'Assam', lat: '', lng: '', description: '' });
  const [posting,   setPosting]   = useState(false);
  const [tab,       setTab]       = useState('feed');
  const [msg,       setMsg]       = useState('');

  useEffect(() => {
    api.getAlerts({ limit: 20 })
      .then(d => setAlerts(d.alerts || []))
      .catch(e => setMsg(e.message))
      .finally(() => setLoading(false));
    api.getMyReports()
      .then(d => setMyReports(d.reports || []))
      .catch(() => {});
  }, []);

  const submitAlert = async e => {
    e.preventDefault();
    setPosting(true);
    try {
      await api.createAlert({ ...form, lat: parseFloat(form.lat), lng: parseFloat(form.lng) });
      setMsg('✅ Alert submitted successfully!');
      setForm({ ...form, location: '', lat: '', lng: '', description: '' });
      const d = await api.getAlerts({ limit: 20 });
      setAlerts(d.alerts || []);
      const r = await api.getMyReports();
      setMyReports(r.reports || []);
    } catch (err) {
      setMsg('❌ ' + err.message);
    }
    setPosting(false);
  };

  const NE_STATES = ['Assam','Arunachal Pradesh','Meghalaya','Nagaland','Manipur','Mizoram','Tripura','Sikkim'];

  const QUICK_LOCATIONS = [
    { name: 'Custom Map Location',          state: 'Assam',             loc: '', lat: '', lng: '' },
    { name: 'Kaziranga Eastern Range',      state: 'Assam',             loc: 'Kaziranga National Park - Eastern Range', lat: 26.600, lng: 93.450 },
    { name: 'Manas Buffer Zone',            state: 'Assam',             loc: 'Manas National Park - Buffer Zone',       lat: 26.720, lng: 91.100 },
    { name: 'Namdapha Tiger Corridor',      state: 'Arunachal Pradesh', loc: 'Namdapha National Park',                  lat: 27.500, lng: 96.200 },
    { name: 'Keibul Lamjao Wetlands',       state: 'Manipur',           loc: 'Keibul Lamjao National Park',             lat: 24.550, lng: 93.900 },
    { name: 'Nokrek Biosphere Reserve',     state: 'Meghalaya',         loc: 'Nokrek National Park',                    lat: 25.420, lng: 90.350 },
    { name: 'Dzukou Valley',                state: 'Nagaland',          loc: 'Dzukou Valley Trek',                      lat: 25.500, lng: 94.080 },
  ];

  const URGENCY_COLOR = {
    'High — immediate risk to life or wildlife': '#ff1744',
    'Medium — situation developing':             '#ff9100',
    'Low — no immediate danger':                 '#29b6f6',
  };
  const STATUS_COLOR = { pending:'#facc15', reviewed:'#29b6f6', resolved:'#4CAF50' };

  return (
    <div className="page-root role-page">
      <div className="page-header-bar">
        <div>
          <div className="role-badge worker-badge"><ShieldAlert size={14}/> Field Worker Dashboard</div>
          <h1 className="page-title">Asha Worker — {user?.state}</h1>
          <p className="page-sub">Create alerts · Monitor incidents · File reports</p>
        </div>
      </div>

      {msg && <div className={`admin-msg ${msg.startsWith('❌') ? 'error' : ''}`}>{msg} <button onClick={() => setMsg('')}>✕</button></div>}

      {/* Quick stats */}
      <div className="worker-stats">
        {[
          { icon: Bell,      label: 'Alerts Today',    value: alerts.filter(a => a.status === 'active').length,   color: '#ef4444' },
          { icon: FileText,  label: 'My Reports',      value: user?.reports || 0,                                  color: '#16a34a' },
          { icon: MapPin,    label: 'Active Zone',      value: user?.state || 'NE India',                          color: '#f97316' },
          { icon: CheckCircle,label:'Resolved (30d)',   value: alerts.filter(a => a.status === 'resolved').length,  color: '#22c55e' },
        ].map(s => (
          <div className="worker-stat" key={s.label} style={{ '--wc': s.color }}>
            <s.icon size={20} style={{ color: 'var(--wc)' }}/>
            <div className="ws-val">{s.value}</div>
            <div className="ws-lbl">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="role-tabs">
        {['feed','create','reports','map'].map(t => (
          <button key={t} className={`rtab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'feed' ? '📡 Live Feed' : t === 'create' ? '➕ Create Alert' : t === 'reports' ? '📋 Reports Inbox' : '🗺️ Map'}
          </button>
        ))}
      </div>

      {/* Live feed */}
      {tab === 'feed' && (
        <div className="panel">
          <div className="panel-hdr"><h3><Bell size={15}/> Live Alert Feed</h3></div>
          {loading ? <div className="role-loading"><div className="role-spinner"/></div> : (
            <div className="worker-feed">
              {alerts.map((a, i) => (
                <div className={`wf-item sev-${a.severity}`} key={a._id || i}>
                  <div className={`wf-bar sev-${a.severity}`}/>
                  <div className="wf-body">
                    <div className="wf-top">
                      <span className={`sev-badge ${a.severity}`}>{a.severity}</span>
                      <span className="wf-type">{a.type}</span>
                      <span className="wf-time"><Clock size={11}/> {new Date(a.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="wf-loc"><MapPin size={11}/> {a.location}</div>
                    <div className="wf-desc">{a.description}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create alert form */}
      {tab === 'create' && (
        <div className="panel">
          <div className="panel-hdr"><h3><Plus size={15}/> Submit New Alert</h3></div>
          <form className="worker-form" onSubmit={submitAlert}>
            <div className="wf-grid">
              <div className="wf-field">
                <label>Alert Type</label>
                <select value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value}))} className="auth-select">
                  {['Wildlife','Deforestation','Wildfire','Poaching','Conflict','Other'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="wf-field">
                <label>Severity</label>
                <select value={form.severity} onChange={e => setForm(f => ({...f, severity: e.target.value}))} className="auth-select">
                  {['info','warning','critical'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="wf-field">
                <label>Quick Location Fill</label>
                <select className="auth-select" onChange={e => {
                  const sel = QUICK_LOCATIONS.find(q => q.name === e.target.value);
                  if (sel && sel.name !== 'Custom Map Location') {
                    setForm(f => ({ ...f, state: sel.state, location: sel.loc, lat: sel.lat, lng: sel.lng }));
                  }
                }}>
                  {QUICK_LOCATIONS.map(q => <option key={q.name} value={q.name}>{q.name}</option>)}
                </select>
              </div>
              <div className="wf-field">
                <label>State</label>
                <select value={form.state} onChange={e => setForm(f => ({...f, state: e.target.value}))} className="auth-select">
                  {NE_STATES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="wf-field full">
                <label>Location Description</label>
                <input className="edit-input" required placeholder="e.g. Kaziranga NP, eastern range" value={form.location} onChange={e => setForm(f => ({...f, location: e.target.value}))}/>
              </div>
              <div className="wf-field">
                <label>Latitude</label>
                <input className="edit-input" type="number" step="0.001" required placeholder="26.570" value={form.lat} onChange={e => setForm(f => ({...f, lat: e.target.value}))}/>
              </div>
              <div className="wf-field">
                <label>Longitude</label>
                <input className="edit-input" type="number" step="0.001" required placeholder="93.170" value={form.lng} onChange={e => setForm(f => ({...f, lng: e.target.value}))}/>
              </div>
              <div className="wf-field full">
                <label>Description</label>
                <textarea className="edit-input" rows={3} placeholder="Describe what you observed…" value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}/>
              </div>
            </div>
            <button type="submit" className="auth-btn" disabled={posting} style={{ maxWidth: 220 }}>
              {posting ? <><span className="spin"/> Submitting…</> : <><Plus size={15}/> Submit Alert</>}
            </button>
          </form>
        </div>
      )}

      {/* Reports Inbox — full moderation for asha_worker */}
      {tab === 'reports' && (
        <ReportsInbox />
      )}

      {tab === 'map' && (
        <div className="panel">
          <div className="panel-hdr"><h3>🗺️ Live Alert Map — {user?.state || 'NE India'}</h3></div>
          <div style={{ height: 400, borderRadius: 12, overflow: 'hidden' }}>
            <MapContainer center={[26.0, 93.0]} zoom={6} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution="&copy; OSM &copy; CARTO" />
              {alerts.map(a => (
                <React.Fragment key={a._id}>
                  <Circle
                    center={[a.coordinates?.lat || 26, a.coordinates?.lng || 93]}
                    radius={a.severity === 'critical' ? 12000 : a.severity === 'warning' ? 8000 : 5000}
                    pathOptions={{
                      color: a.severity === 'critical' ? '#ff1744' : a.severity === 'warning' ? '#ff9100' : '#29b6f6',
                      fillOpacity: 0.2, weight: 1.5,
                      className: 'map-pulse-circle'
                    }}
                  />
                  <Marker
                    position={[a.coordinates?.lat || 26, a.coordinates?.lng || 93]}
                    icon={L.divIcon({
                      html: `<div class="glow-marker" style="--mc: ${a.severity === 'critical' ? '#ff1744' : a.severity === 'warning' ? '#ff9100' : '#29b6f6'}">
                               <div class="core"></div>
                               <div class="ring"></div>
                             </div>`,
                      className: '',
                      iconSize: [24, 24],
                      iconAnchor: [12, 12]
                    })}
                  >
                    <Popup>
                      <strong>{a.type}</strong><br/>
                      {a.location}<br/>
                      <span style={{ color: a.severity === 'critical' ? '#ff1744' : a.severity === 'warning' ? '#ff9100' : '#29b6f6', fontWeight: 700 }}>
                        {a.severity?.toUpperCase()}
                      </span>
                    </Popup>
                  </Marker>
                </React.Fragment>
              ))}
            </MapContainer>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '10px 0' }}>
            Showing {alerts.length} active alerts · Click markers to view details ·
            <Link to="/conflict" style={{ color: '#4CAF50', marginLeft: 6 }}>Open Conflict Monitor →</Link>
          </p>
        </div>
      )}
    </div>
  );
};

export default WorkerDashboard;
