import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, TreePine, Eye, Zap, ArrowUpRight,
  ArrowDownRight, Clock, MapPin, Activity, ChevronRight, RefreshCw
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

const Dashboard = () => {
  const [alerts,   setAlerts]   = useState([]);
  const [stats,    setStats]    = useState(null);
  const [activity, setActivity] = useState([]);
  const [filter,   setFilter]   = useState('all');
  const [selected, setSelected] = useState(null);
  const [loading,  setLoading]  = useState(true);
  
  // Real data state
  const [mlZones, setMlZones] = useState([]);
  const [gbifData, setGbifData] = useState([]);
  const [forestAlerts, setForestAlerts] = useState([]);
  const [clickPrediction, setClickPrediction] = useState(null);
  const [predicting, setPredicting] = useState(false);

  const { activeLayer, setActiveLayer, layerConfig } = useMapLayer('satellite');

  const MapClickHandler = () => {
    useMapEvents({
      click: async (e) => {
        const { lat, lng } = e.latlng;
        setPredicting(true);
        setClickPrediction({ lat, lng, loading: true });
        try {
          // api.predictRiskPython already returns parsed JSON (via request())
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

  const filtered = filter === 'all' ? alerts : alerts.filter(a => a.severity === filter);

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
      value: stats ? stats.activeAlerts : alerts.filter(a => a.status === 'active').length,
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
      {/* Header */}
      <div className="page-header-bar">
        <div>
          <h1 className="page-title">Live Dashboard — North East India</h1>
          <p className="page-sub">
            Real-time biodiversity monitoring · {alerts.length} alerts in DB ·
            Assam · Arunachal Pradesh · Meghalaya · Nagaland · Manipur · Mizoram · Tripura · Sikkim
          </p>
        </div>
        <div className="header-actions">
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
            <span className="panel-tag">{alerts.length} live alerts · 8 states</span>
          </div>
          <div style={{ position: 'relative' }}>
            <MapContainer center={[26.2, 93.0]} zoom={7} className="leaflet-map" scrollWheelZoom={false}>
              {/* Main Map Elements */}
              <TileLayer url={layerConfig.url} attribution={layerConfig.attribution}/>
              <MapClickHandler />

              {/* 1. Heatmap Layer: ML risk predictions */}
              {mlZones.map(z => (
                <Circle key={z.id}
                  center={[z.lat, z.lng]}
                  radius={z.risk_score * 30000} // Dynamic radius based on score
                  pathOptions={{
                    color: z.risk_level === 'critical' ? '#ff0a54' : z.risk_level === 'high' ? '#ff5400' : z.risk_level === 'medium' ? '#ffdd00' : '#00f5d4',
                    fillColor: z.risk_level === 'critical' ? '#ff0a54' : z.risk_level === 'high' ? '#ff5400' : z.risk_level === 'medium' ? '#ffdd00' : '#00f5d4',
                    fillOpacity: Math.min(0.5, z.risk_score),
                    weight: 0,
                  }}>
                  <Popup>
                    <strong>ML Prediction: {z.zone_name}</strong><br/>
                    Risk Level: <span style={{color: z.risk_level === 'critical' ? '#ff0a54' : z.risk_level === 'high' ? '#ff5400' : z.risk_level === 'medium' ? '#ffdd00' : '#00f5d4', fontWeight:'bold'}}>{z.risk_level.toUpperCase()}</span><br/>
                    Risk Score: {(z.risk_score * 100).toFixed(0)}/100<br/>
                    <em style={{fontSize: '0.8rem'}}>{z.prediction}</em>
                  </Popup>
                </Circle>
              ))}

              {/* 2. Forest Alert Layer (GFW Data) */}
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

              {/* 3. DB Alerts */}
              {filtered.map(a => (
                <React.Fragment key={a._id}>
                  {a.status !== 'resolved' && (
                    <Circle
                      center={[a.coordinates?.lat || 26.5, a.coordinates?.lng || 93]}
                      radius={a.severity === 'critical' ? 15000 : a.severity === 'warning' ? 10000 : 7000}
                      pathOptions={{
                        color: SEV_COLOR[a.severity] || '#29b6f6',
                        fillOpacity: 0.2, weight: 1.5,
                        className: 'map-pulse-circle'
                      }}
                    />
                  )}
                  <Marker
                    position={[a.coordinates?.lat || 26.5, a.coordinates?.lng || 93]}
                    eventHandlers={{ click: () => setSelected(a) }}
                    icon={L.divIcon({
                      html: `<div class="glow-marker" style="--mc: ${SEV_COLOR[a.severity] || '#29b6f6'}">
                               <div class="core"></div>
                               ${a.status !== 'resolved' ? '<div class="ring"></div>' : ''}
                             </div>`,
                      className: '',
                      iconSize: [24, 24],
                      iconAnchor: [12, 12]
                    })}
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

              {/* 4. Click Prediction Popup */}
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
                          <div style={{fontSize:'0.78rem', color:'#555', marginBottom:6}}>
                            ✓ Confidence: <strong>{d.confidence ? `${Math.round(d.confidence * 100)}%` : '—'}</strong>
                            &nbsp;·&nbsp;
                            <span style={{color:'#888'}}>{d.source === 'python_ml' ? '🐍 Python RF' : '⚡ JS fallback'}</span>
                          </div>
                          {Object.keys(f).length > 0 && (
                            <div style={{background:'#f5f5f5', borderRadius:6, padding:'6px 8px', fontSize:'0.75rem', color:'#444', marginBottom:6}}>
                              <div style={{fontWeight:600, marginBottom:3}}>Feature Inputs:</div>
                              <div>🌲 Dist to forest: <strong>{Number(f.dist_forest).toFixed(1)} km</strong></div>
                              <div>🐾 Sightings: <strong>{Math.round(f.sightings)}</strong></div>
                              <div>🕐 Hour: <strong>{f.time_hr}:00</strong></div>
                              <div>⚠ Past conflicts: <strong>{Math.round(f.hist_conflicts)}</strong></div>
                            </div>
                          )}
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
          </div>
          <div className="map-legend-row" style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', padding: '10px', fontSize: '0.8rem' }}>
            <span style={{fontWeight:'bold', color: '#aaa'}}>ML Risk Heatmap:</span>
            {[['#ff0a54','Critical'],['#ff5400','High'],['#ffdd00','Medium'],['#00f5d4','Low']].map(([c,l]) => (
              <span key={l} className="leg-item" style={{display:'flex', alignItems:'center', gap:'4px'}}>
                <span className="leg-dot" style={{ background: c, width:'10px', height:'10px', borderRadius:'50%', opacity:0.5 }}/>{l}
              </span>
            ))}
            <span style={{fontWeight:'bold', color: '#aaa', marginLeft:'10px'}}>Other Layers:</span>
            <span className="leg-item" style={{display:'flex', alignItems:'center', gap:'4px'}}>
              <span className="leg-dot" style={{ background: '#ab47bc', width:'10px', height:'10px', borderRadius:'50%', opacity:0.6 }}/> GFW Forest Alert
            </span>
            <span className="leg-item" style={{marginLeft:'auto', color:'#aaa', fontSize:'0.75rem'}}>
              *Click Map to Predict Risk Profile
            </span>
          </div>
        </div>

        {/* Alerts Sidebar */}
        <div className="panel alerts-panel">
          <div className="panel-hdr">
            <h3>Live Alerts <span style={{ fontSize:'0.7rem', color:'#666', fontWeight:400 }}>from DB</span></h3>
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
                onClick={() => setSelected(a)}>
                <div className={`sev-bar sev-${a.severity}`} />
                <div className="ar-body">
                  <div className="ar-top">
                    <span className={`sev-badge ${a.severity}`}>{a.severity}</span>
                    <span className="ar-time"><Clock size={11}/> {timeAgo(a.createdAt)}</span>
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
                  ● {selected.status}
                </span>
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
          <span className="panel-tag">NE India region · Live from DB</span>
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
