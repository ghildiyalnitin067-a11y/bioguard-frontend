import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, TreePine, Eye, Zap, ArrowUpRight,
  ArrowDownRight, Clock, MapPin, Activity, ChevronRight, RefreshCw,
  Radio, Bell,
} from 'lucide-react';
import { MapLayerControl, useMapLayer } from '../components/MapLayerControl';
import api from '../services/api';
import './Dashboard.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const SEV_COLOR = { critical: '#ff1744', warning: '#ff9100', info: '#29b6f6' };

function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/* ── Pulsing LIVE marker for real-time alerts ── */
function makeLiveGlowIcon(severity) {
  const c = SEV_COLOR[severity] || '#ff9100';
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:36px;height:36px;">
      <div style="position:absolute;inset:0;border-radius:50%;background:${c}22;
        border:2.5px solid ${c};display:flex;align-items:center;justify-content:center;
        box-shadow:0 0 0 0 ${c}99;animation:liveMarkerPulse 1.5s ease-out infinite;">
        <span style="font-size:14px;">🔴</span>
      </div>
    </div>
    <style>
      @keyframes liveMarkerPulse {
        0%   { box-shadow: 0 0 0 0 ${c}99; }
        70%  { box-shadow: 0 0 0 14px ${c}00; }
        100% { box-shadow: 0 0 0 0 ${c}00; }
      }
    </style>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
}

/* ── Regular DB alert marker ── */
function makeDbIcon(severity) {
  const c = SEV_COLOR[severity] || '#29b6f6';
  return L.divIcon({
    html: `<div class="glow-marker" style="--mc:${c}">
             <div class="core"></div>
             <div class="ring"></div>
           </div>`,
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

const Dashboard = () => {
  const [alerts,       setAlerts]       = useState([]);
  const [liveAlerts,   setLiveAlerts]   = useState([]); // WS-pushed live alerts
  const [stats,        setStats]        = useState(null);
  const [activity,     setActivity]     = useState([]);
  const [filter,       setFilter]       = useState('all');
  const [selected,     setSelected]     = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [liveCount,    setLiveCount]    = useState(0);
  const [wsConnected,  setWsConnected]  = useState(false);
  const wsRef = useRef(null);

  // Real data state
  const [mlZones,       setMlZones]       = useState([]);
  const [gbifData,      setGbifData]      = useState([]);
  const [forestAlerts,  setForestAlerts]  = useState([]);
  const [clickPrediction, setClickPrediction] = useState(null);
  const [predicting,    setPredicting]    = useState(false);

  const { activeLayer, setActiveLayer, layerConfig } = useMapLayer('satellite');

  const MapClickHandler = () => {
    useMapEvents({
      click: async (e) => {
        const { lat, lng } = e.latlng;
        setPredicting(true);
        setClickPrediction({ lat, lng, loading: true });
        try {
          const data = await api.predictRiskPython(lat, lng);
          setClickPrediction({ lat, lng, data, loading: false });
        } catch (err) {
          setClickPrediction({ lat, lng, error: 'Failed to predict risk.', loading: false });
        }
        setPredicting(false);
      }
    });
    return null;
  };

  /* ── WebSocket for real-time live alerts ── */
  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    const WS_URL  = API_URL.replace(/^http/, 'ws');

    const connect = () => {
      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => setWsConnected(true);
        ws.onclose = () => {
          setWsConnected(false);
          // Reconnect after 5s
          setTimeout(connect, 5000);
        };
        ws.onerror = () => {};

        ws.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data);

            /* ── New individual alert ── */
            if (msg.event === 'new_alert') {
              const a = { ...msg.data, _id: msg.data._id || msg.data.id, _live: true, _liveAt: Date.now() };
              setLiveAlerts(prev => {
                if (prev.find(x => x._id === a._id)) return prev;
                return [a, ...prev.slice(0, 9)]; // keep last 10 live
              });
              setAlerts(prev => {
                if (prev.find(x => x._id === a._id)) return prev;
                return [a, ...prev.slice(0, 49)];
              });
              setLiveCount(c => c + 1);
              // Update activity log
              setActivity(prev => [{
                time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                event: `🔴 LIVE — ${a.type} alert at ${a.location}`,
                type: a.severity === 'critical' ? 'danger' : 'warning',
              }, ...prev.slice(0, 7)]);
            }

            /* ── Batch real-time alerts (GBIF/GFW/satellite) ── */
            if (msg.event === 'realtime_alert_batch' && msg.data?.alerts) {
              const batch = msg.data.alerts.map(a => ({
                ...a, _id: a._id || a.id || `rt-${Date.now()}-${Math.random()}`,
                _live: true, _liveAt: Date.now(), source: a.source || 'system',
              }));
              setLiveAlerts(prev => {
                const merged = [...batch.filter(a => !prev.find(x => x._id === a._id)), ...prev];
                return merged.slice(0, 10);
              });
              setLiveCount(c => c + batch.length);
            }

            /* ── Alert resolved ── */
            if (msg.event === 'alert_resolved') {
              setAlerts(prev => prev.map(a =>
                a._id === (msg.data._id || msg.data.id) ? { ...a, status: 'resolved' } : a
              ));
            }
          } catch (_) {}
        };
      } catch (_) {}
    };

    connect();
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [alertRes, statsRes, mlRes, forestRes] = await Promise.all([
        api.getAlerts({ limit: 50 }),
        api.adminStats().catch(() => null),
        api.getMLPredictions().catch(() => ({ predictions: [] })),
        api.getForestAlerts().catch(() => ({ alerts: [] })),
      ]);

      const live = alertRes.alerts || [];
      setAlerts(live);
      if (!selected && live.length) setSelected(live[0]);

      if (statsRes) setStats(statsRes.stats);
      if (mlRes.predictions) setMlZones(mlRes.predictions);
      if (forestRes.alerts) setForestAlerts(forestRes.alerts);

      // Fetch wildlife sightings around central NE India (Assam focus)
      api.getWildlifeData(26.2, 93.0, 300, 100).then(data => {
        if (data.occurrences) setGbifData(data.occurrences);
      }).catch(() => {});

      // Build activity log from recent alerts
      const acts = live.slice(0, 8).map(a => ({
        time: new Date(a.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        event: `${a.type} alert — ${a.location} (${a.action || 'Monitoring'})`,
        type: a.severity === 'critical' ? 'danger' : a.severity === 'warning' ? 'warning' : 'info',
      }));
      setActivity(acts.length ? acts : [
        { time: '--', event: 'No recent activity. Submit alerts to populate this log.', type: 'info' },
      ]);
    } catch (e) {
      console.error('[Dashboard] load error', e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // All alerts: merge live WS alerts + DB alerts, deduplicated
  const allAlerts = React.useMemo(() => {
    const ids = new Set();
    const merged = [];
    for (const a of [...liveAlerts, ...alerts]) {
      if (!ids.has(a._id)) { ids.add(a._id); merged.push(a); }
    }
    return merged;
  }, [liveAlerts, alerts]);

  const filtered = filter === 'all' ? allAlerts : allAlerts.filter(a => a.severity === filter);

  const statCards = [
    {
      icon: TreePine,
      label: 'NE Forest Cover',
      value: '65.0%',
      delta: '−0.4%',
      down: true,
      color: '#4CAF50',
    },
    {
      icon: AlertTriangle,
      label: 'Active Alerts',
      value: stats ? stats.activeAlerts : allAlerts.filter(a => a.status === 'active').length,
      delta: stats ? `${stats.totalAlerts} total` : '—',
      down: false,
      color: '#ff9100',
    },
    {
      icon: Eye,
      label: 'Protected Areas',
      value: '82',
      delta: '8 states',
      down: false,
      color: '#29b6f6',
    },
    {
      icon: Zap,
      label: 'Incidents (DB)',
      value: stats ? stats.totalIncidents : '—',
      delta: stats ? `${stats.ongoingIncidents || 0} ongoing` : '—',
      down: (stats?.ongoingIncidents || 0) > 0,
      color: '#ab47bc',
    },
  ];

  return (
    <div className="page-root db-page">
      <style>{`
        @keyframes liveRingPulse {
          0%,100% { opacity:1; transform:scale(1); }
          50% { opacity:0.5; transform:scale(1.15); }
        }
        @keyframes liveSlideIn {
          from { opacity:0; transform:translateX(-8px); }
          to   { opacity:1; transform:translateX(0); }
        }
        @keyframes wsDot {
          0%,100% { opacity:1; } 50% { opacity:0.3; }
        }
      `}</style>

      {/* Header */}
      <div className="page-header-bar">
        <div>
          <h1 className="page-title">Live Dashboard — North East India</h1>
          <p className="page-sub">
            Real-time biodiversity monitoring · {allAlerts.length} alerts ·
            Assam · Arunachal Pradesh · Meghalaya · Nagaland · Manipur · Mizoram · Tripura · Sikkim
          </p>
        </div>
        <div className="header-actions">
          {/* WS connection indicator */}
          <span style={{
            fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5,
            color: wsConnected ? '#4caf50' : '#ff5252',
            background: wsConnected ? 'rgba(76,175,80,0.1)' : 'rgba(255,82,82,0.1)',
            border: `1px solid ${wsConnected ? 'rgba(76,175,80,0.3)' : 'rgba(255,82,82,0.3)'}`,
            borderRadius: 100, padding: '4px 10px',
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%', display: 'inline-block',
              background: wsConnected ? '#4caf50' : '#ff5252',
              animation: wsConnected ? 'wsDot 2s infinite' : 'none',
            }}/>
            {wsConnected ? 'WS Live' : 'WS Offline'}
          </span>
          {liveCount > 0 && (
            <span style={{
              fontSize: '0.7rem', fontWeight: 800, color: '#ff5252',
              background: 'rgba(255,23,68,0.12)', border: '1px solid rgba(255,23,68,0.3)',
              borderRadius: 100, padding: '4px 10px',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <Bell size={12}/> {liveCount} Live
            </span>
          )}
          <span className="live-pill"><span className="live-dot" /> LIVE</span>
          <button className="icon-btn" onClick={load} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin-anim' : ''}/> Refresh
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stat-row">
        {statCards.map(s => (
          <div className="stat-card" key={s.label} style={{ '--c': s.color }}>
            <div className="sc-icon"><s.icon size={22} /></div>
            <div className="sc-body">
              <div className="sc-value">{s.value}</div>
              <div className="sc-label">{s.label}</div>
            </div>
            <div className={`sc-delta ${s.down ? 'bad' : 'good'}`}>
              {s.down ? <ArrowDownRight size={13}/> : <ArrowUpRight size={13}/>} {s.delta}
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="db-grid">
        {/* Map */}
        <div className="panel map-panel">
          <div className="panel-hdr">
            <h3><Activity size={16}/> Threat Map — North East India</h3>
            <span className="panel-tag">
              {allAlerts.length} alerts · {liveAlerts.length > 0 && (
                <span style={{ color:'#ff5252', fontWeight:700 }}>
                  {liveAlerts.length} 🔴 LIVE
                </span>
              )}
            </span>
          </div>
          <div style={{ position: 'relative' }}>
            <MapContainer center={[26.2, 93.0]} zoom={7} className="leaflet-map" scrollWheelZoom={false}>
              <TileLayer url={layerConfig.url} attribution={layerConfig.attribution}/>
              <MapClickHandler />

              {/* 1. ML risk heatmap */}
              {mlZones.map(z => (
                <Circle key={z.id}
                  center={[z.lat, z.lng]}
                  radius={z.risk_score * 30000}
                  pathOptions={{
                    color: z.risk_level === 'critical' ? '#ff0a54' : z.risk_level === 'high' ? '#ff5400' : z.risk_level === 'medium' ? '#ffdd00' : '#00f5d4',
                    fillColor: z.risk_level === 'critical' ? '#ff0a54' : z.risk_level === 'high' ? '#ff5400' : z.risk_level === 'medium' ? '#ffdd00' : '#00f5d4',
                    fillOpacity: Math.min(0.5, z.risk_score),
                    weight: 0,
                  }}>
                  <Popup>
                    <strong>ML Prediction: {z.zone_name}</strong><br/>
                    Risk Level: <span style={{color: z.risk_level === 'critical' ? '#ff0a54' : '#ff5400', fontWeight:'bold'}}>{z.risk_level?.toUpperCase()}</span><br/>
                    Risk Score: {(z.risk_score * 100).toFixed(0)}/100<br/>
                    <em style={{fontSize: '0.8rem'}}>{z.prediction}</em>
                  </Popup>
                </Circle>
              ))}

              {/* 2. Forest Alert Layer (GFW) */}
              {forestAlerts.map((f, i) => (
                <Circle key={`f-${i}`}
                  center={[f.lat, f.lng]}
                  radius={f.area_ha ? f.area_ha * 100 : 2000}
                  pathOptions={{ color: '#ab47bc', fillOpacity: 0.6, weight: 1.5 }}>
                  <Popup>
                    <strong>Global Forest Watch Alert</strong><br/>
                    Type: {f.alertType}<br/>
                    Location: {f.location}<br/>
                    Area: {f.area_ha} ha<br/>
                    Date: {f.date}
                  </Popup>
                </Circle>
              ))}

              {/* 3. ── LIVE WebSocket alerts — glowing pulsing markers ── */}
              {liveAlerts.map(a => {
                const lat = a.coordinates?.lat || a.lat || 26.5;
                const lng = a.coordinates?.lng || a.lng || 93.0;
                const c = SEV_COLOR[a.severity] || '#ff9100';
                return (
                  <React.Fragment key={`live-${a._id}`}>
                    {/* Outer pulsing halo */}
                    <Circle
                      center={[lat, lng]}
                      radius={a.severity === 'critical' ? 22000 : 16000}
                      pathOptions={{ color: c, fillColor: c, fillOpacity: 0.12, weight: 1.5 }}
                    />
                    <Circle
                      center={[lat, lng]}
                      radius={a.severity === 'critical' ? 10000 : 7000}
                      pathOptions={{ color: c, fillColor: c, fillOpacity: 0.25, weight: 0 }}
                    />
                    <Marker
                      position={[lat, lng]}
                      icon={makeLiveGlowIcon(a.severity)}
                      eventHandlers={{ click: () => setSelected(a) }}
                    >
                      <Popup>
                        <div style={{ minWidth: 220 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                            <span style={{ background:'#ff174422', border:'1px solid #ff174466', color:'#ff5252', fontSize:'0.65rem', fontWeight:800, padding:'1px 7px', borderRadius:100 }}>🔴 LIVE</span>
                            <span style={{ fontSize:'0.72rem', color: c, fontWeight:700 }}>{a.severity?.toUpperCase()}</span>
                          </div>
                          <strong style={{ fontSize:'0.88rem' }}>{a.type} Alert</strong><br/>
                          <span style={{ fontSize:'0.78rem', color:'#555' }}>📍 {a.location}</span><br/>
                          {a.description && <em style={{ fontSize:'0.75rem', color:'#777', display:'block', marginTop:4 }}>{a.description.slice(0, 100)}…</em>}
                          {a.solutions?.slice(0,2).map((s,i) => (
                            <div key={i} style={{ fontSize:'0.72rem', color:'#4CAF50', marginTop:3 }}>✅ {s}</div>
                          ))}
                        </div>
                      </Popup>
                    </Marker>
                  </React.Fragment>
                );
              })}

              {/* 4. DB alerts (regular) */}
              {filtered.filter(a => !a._live).map(a => (
                <React.Fragment key={a._id}>
                  {a.status !== 'resolved' && (
                    <Circle
                      center={[a.coordinates?.lat || 26.5, a.coordinates?.lng || 93]}
                      radius={a.severity === 'critical' ? 15000 : a.severity === 'warning' ? 10000 : 7000}
                      pathOptions={{
                        color: SEV_COLOR[a.severity] || '#29b6f6',
                        fillOpacity: 0.15, weight: 1.5,
                      }}
                    />
                  )}
                  <Marker
                    position={[a.coordinates?.lat || 26.5, a.coordinates?.lng || 93]}
                    eventHandlers={{ click: () => setSelected(a) }}
                    icon={makeDbIcon(a.severity)}
                  >
                    <Popup>
                      <strong>{a.type}</strong><br/>
                      <span>{a.location}</span><br/>
                      <em style={{ fontSize: '0.8em', color: SEV_COLOR[a.severity] }}>{a.severity?.toUpperCase()}</em><br/>
                      <small>{a.description}</small>
                    </Popup>
                  </Marker>
                </React.Fragment>
              ))}

              {/* 5. Click Prediction Popup */}
              {clickPrediction && (
                <Popup position={[clickPrediction.lat, clickPrediction.lng]} onClose={() => setClickPrediction(null)}>
                  <div style={{minWidth: '240px', fontFamily: 'sans-serif'}}>
                    {clickPrediction.loading ? (
                      <div style={{color:'#666', padding:'8px 0'}}>⏳ Running ML prediction…</div>
                    ) : clickPrediction.error ? (
                      <div style={{color: 'red'}}>{clickPrediction.error}</div>
                    ) : clickPrediction.data ? (() => {
                      const d = clickPrediction.data;
                      const COLOR = { Critical:'#ff0a54', High:'#ff5400', Medium:'#ffdd00', Low:'#00f5d4',
                                      critical:'#ff0a54', high:'#ff5400', medium:'#ffdd00', low:'#00f5d4' };
                      const lvl = d.risk_level || 'Low';
                      const score = Math.round(d.risk_score * 100);
                      const c = COLOR[lvl] || '#69f0ae';
                      const f = d.features_used || {};
                      return (
                        <>
                          <div style={{fontWeight:800, fontSize:'0.88rem', marginBottom:6, borderBottom:'1px solid #eee', paddingBottom:4}}>
                            🤖 Python RF — ML Risk Analysis
                          </div>
                          <div style={{marginBottom:8}}>
                            <div style={{display:'flex', justifyContent:'space-between', marginBottom:3}}>
                              <span style={{fontWeight:700, color:c, textTransform:'uppercase', fontSize:'0.85rem'}}>{lvl}</span>
                              <span style={{fontWeight:700, fontSize:'0.85rem'}}>{score}/100</span>
                            </div>
                            <div style={{background:'#e0e0e0', borderRadius:4, height:8, overflow:'hidden'}}>
                              <div style={{width:`${score}%`, background:c, height:'100%'}}/>
                            </div>
                          </div>
                          <div style={{fontSize:'0.72rem', color:'#aaa'}}>
                            📍 {clickPrediction.lat.toFixed(4)}, {clickPrediction.lng.toFixed(4)}
                          </div>
                        </>
                      );
                    })() : null}
                  </div>
                </Popup>
              )}
            </MapContainer>
            <MapLayerControl activeLayer={activeLayer} setActiveLayer={setActiveLayer}/>

            {/* Live alerts overlay on map corner */}
            {liveAlerts.length > 0 && (
              <div style={{
                position: 'absolute', top: 10, left: 10, zIndex: 1000,
                background: 'rgba(13,17,23,0.92)', backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,23,68,0.35)', borderRadius: 12,
                padding: '8px 12px', maxWidth: 220,
                boxShadow: '0 4px 20px rgba(255,23,68,0.2)',
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                  <span style={{ width:7, height:7, borderRadius:'50%', background:'#ff5252', display:'inline-block', animation:'wsDot 1.5s infinite' }}/>
                  <span style={{ fontSize:'0.65rem', fontWeight:800, color:'#ff5252', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                    {liveAlerts.length} Live Alert{liveAlerts.length > 1 ? 's' : ''}
                  </span>
                </div>
                {liveAlerts.slice(0, 3).map(a => (
                  <div key={a._id} style={{
                    fontSize:'0.7rem', color:'#ccc', marginBottom:3,
                    animation: 'liveSlideIn 0.4s ease',
                    display:'flex', alignItems:'center', gap:5,
                  }}>
                    <span style={{ color: SEV_COLOR[a.severity] || '#ff9100', fontWeight:700 }}>●</span>
                    {a.type} — {a.location?.slice(0, 28)}{a.location?.length > 28 ? '…' : ''}
                  </div>
                ))}
                {liveAlerts.length > 3 && (
                  <div style={{ fontSize:'0.65rem', color:'#666', marginTop:2 }}>+{liveAlerts.length - 3} more</div>
                )}
              </div>
            )}
          </div>
          <div className="map-legend-row" style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', padding: '10px', fontSize: '0.8rem' }}>
            <span style={{fontWeight:'bold', color: '#aaa'}}>ML Risk Heatmap:</span>
            {[['#ff0a54','Critical'],['#ff5400','High'],['#ffdd00','Medium'],['#00f5d4','Low']].map(([c,l]) => (
              <span key={l} className="leg-item" style={{display:'flex', alignItems:'center', gap:'4px'}}>
                <span className="leg-dot" style={{ background: c, width:'10px', height:'10px', borderRadius:'50%', opacity:0.5 }}/>{l}
              </span>
            ))}
            <span style={{fontWeight:'bold', color: '#aaa', marginLeft:'10px'}}>Live WS Alerts:</span>
            <span style={{display:'flex', alignItems:'center', gap:4}}>
              <span style={{width:10,height:10,borderRadius:'50%',background:'#ff5252',opacity:0.8}}/>🔴 Pulsing = Live
            </span>
            <span className="leg-item" style={{marginLeft:'auto', color:'#aaa', fontSize:'0.75rem'}}>
              *Click Map to Predict Risk Profile
            </span>
          </div>
        </div>

        {/* Alerts Sidebar */}
        <div className="panel alerts-panel">
          <div className="panel-hdr">
            <h3>
              <Radio size={14} style={{ marginRight:5, verticalAlign:'middle' }}/>
              Live Alerts
              {liveCount > 0 && (
                <span style={{
                  marginLeft:8, fontSize:'0.62rem', fontWeight:800, color:'#ff5252',
                  background:'rgba(255,23,68,0.12)', border:'1px solid rgba(255,23,68,0.25)',
                  borderRadius:100, padding:'1px 7px',
                }}>
                  {liveCount} NEW
                </span>
              )}
            </h3>
            <Link to="/alerts" className="panel-link">View all <ChevronRight size={14}/></Link>
          </div>
          <div className="filter-tabs">
            {['all','critical','warning','info'].map(f => (
              <button key={f} className={`ftab ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}>{f}</button>
            ))}
          </div>
          <div className="alert-scroll">
            {loading && <div style={{ padding: 20, color: '#666', fontSize: '0.85rem' }}>Loading alerts…</div>}
            {!loading && filtered.length === 0 && (
              <div style={{ padding: '20px', color: '#666', fontSize: '0.85rem', textAlign:'center' }}>
                No alerts yet.<br/>Asha Workers can create alerts from their dashboard.
              </div>
            )}
            {filtered.map(a => (
              <div key={a._id}
                className={`alert-row sev-${a.severity} ${selected?._id === a._id ? 'sel' : ''}`}
                onClick={() => setSelected(a)}
                style={{ animation: a._live ? 'liveSlideIn 0.4s ease' : 'none' }}>
                <div className={`sev-bar sev-${a.severity}`} />
                <div className="ar-body">
                  <div className="ar-top">
                    {a._live && (
                      <span style={{
                        fontSize:'0.6rem', fontWeight:800, color:'#ff5252',
                        background:'rgba(255,23,68,0.12)', border:'1px solid rgba(255,23,68,0.3)',
                        borderRadius:100, padding:'1px 6px', letterSpacing:'0.5px',
                        display:'inline-flex', alignItems:'center', gap:3,
                      }}>
                        <span style={{ width:5, height:5, borderRadius:'50%', background:'#ff5252', display:'inline-block' }}/>
                        LIVE
                      </span>
                    )}
                    <span className={`sev-badge ${a.severity}`}>{a.severity}</span>
                    <span className="ar-time"><Clock size={11}/> {timeAgo(a.createdAt || a._liveAt)}</span>
                  </div>
                  <div className="ar-type">{a.type}</div>
                  <div className="ar-loc"><MapPin size={11}/> {a.location}</div>
                </div>
              </div>
            ))}
          </div>

          {selected && (
            <div className="alert-detail">
              <div className="ad-header">
                <span className={`sev-badge ${selected.severity}`}>{selected.severity}</span>
                <span style={{ fontSize:'0.72rem', color: selected.status === 'active' ? '#ff5252' : '#69f0ae', fontWeight:600 }}>
                  ● {selected.status || 'active'}
                </span>
                {selected._live && (
                  <span style={{ fontSize:'0.62rem', fontWeight:800, color:'#ff5252',
                    background:'rgba(255,23,68,0.1)', borderRadius:100, padding:'1px 7px',
                    border:'1px solid rgba(255,23,68,0.3)', marginLeft:'auto' }}>
                    🔴 LIVE
                  </span>
                )}
              </div>
              <div className="ad-type">{selected.type}</div>
              <div className="ad-loc"><MapPin size={12}/> {selected.location}</div>
              {selected.headline && (
                <div style={{ marginTop: 8, background: '#ff174418', borderLeft: '3px solid #ff1744',
                  padding: '6px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700, color: '#ff6b6b' }}>
                  {selected.headline}
                </div>
              )}
              <p className="ad-desc">{selected.description}</p>
              {selected.action && (
                <div style={{ fontSize:'0.78rem', color:'#4CAF50', fontWeight:600, marginBottom:6 }}>
                  ⚡ {selected.action}
                </div>
              )}
              <Link to="/alerts" className="ad-btn">View Full Alert + Advisory →</Link>
            </div>
          )}
        </div>
      </div>

      {/* Activity Log */}
      <div className="panel activity-panel-wrap">
        <div className="panel-hdr">
          <h3>System Activity Log</h3>
          <span className="panel-tag">NE India region · Live from DB + WebSocket</span>
        </div>
        <div className="activity-list">
          {activity.map((a, i) => (
            <div className="act-item" key={i}>
              <span className="act-time">{a.time}</span>
              <span className={`act-dot dot-${a.type}`} />
              <span className="act-event">{a.event}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
