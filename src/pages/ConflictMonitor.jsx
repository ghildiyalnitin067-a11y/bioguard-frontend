import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Circle, Popup, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  ShieldAlert, Users, AlertTriangle, Clock, MapPin,
  TrendingUp, CheckCircle, XCircle, Activity, RefreshCw, Plus, X
} from 'lucide-react';
import { MapLayerControl, useMapLayer } from '../components/MapLayerControl';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './ConflictMonitor.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const SEV_COLOR    = { high: '#ff1744', medium: '#ff9100', low: '#fdd835' };
const STATUS_ICON  = { ongoing: XCircle, contained: ShieldAlert, monitoring: Activity, resolved: CheckCircle };
const STATUS_COLOR = { ongoing: '#ff1744', contained: '#ff9100', monitoring: '#29b6f6', resolved: '#4CAF50' };
const STATES       = ['All States','Assam','Arunachal Pradesh','Meghalaya','Nagaland','Manipur','Mizoram','Tripura','Sikkim'];
const NE_STATES    = ['Assam','Arunachal Pradesh','Meghalaya','Nagaland','Manipur','Mizoram','Tripura','Sikkim'];

const QUICK_LOCATIONS = [
  { name: 'Custom Map Location',          state: 'Assam',             loc: '', lat: '', lng: '' },
  { name: 'Kaziranga Eastern Range',      state: 'Assam',             loc: 'Kaziranga National Park - Eastern Range', lat: 26.600, lng: 93.450 },
  { name: 'Manas Buffer Zone',            state: 'Assam',             loc: 'Manas National Park - Buffer Zone',       lat: 26.720, lng: 91.100 },
  { name: 'Namdapha Tiger Corridor',      state: 'Arunachal Pradesh', loc: 'Namdapha National Park',                  lat: 27.500, lng: 96.200 },
  { name: 'Keibul Lamjao Wetlands',       state: 'Manipur',           loc: 'Keibul Lamjao National Park',             lat: 24.550, lng: 93.900 },
  { name: 'Nokrek Biosphere Reserve',     state: 'Meghalaya',         loc: 'Nokrek National Park',                    lat: 25.420, lng: 90.350 },
  { name: 'Dzukou Valley',                state: 'Nagaland',          loc: 'Dzukou Valley Trek',                      lat: 25.500, lng: 94.080 },
];

const BLANK_FORM = { animal:'', location:'', state:'Assam', lat:'', lng:'', severity:'medium', casualties:0, damage:'', response:'' };

const ConflictMonitor = () => {
  const { user } = useAuth();
  const canCreate = user?.role === 'asha_worker' || user?.role === 'admin';

  const [incidents,    setIncidents]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [selected,     setSelected]     = useState(null);
  const [filterSev,    setFilterSev]    = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterState,  setFilterState]  = useState('All States');
  const [showForm,     setShowForm]     = useState(false);
  const [form,         setForm]         = useState(BLANK_FORM);
  const [posting,      setPosting]      = useState(false);
  const [msg,          setMsg]          = useState('');
  const { activeLayer, setActiveLayer, layerConfig } = useMapLayer('satellite');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getIncidents({ limit: 100 });
      setIncidents(res.incidents || []);
    } catch (e) {
      setMsg('Failed to load incidents: ' + e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = incidents.filter(i => {
    const sv = filterSev    === 'all'        || i.severity === filterSev;
    const st = filterStatus === 'all'        || i.status   === filterStatus;
    const ss = filterState  === 'All States' || i.state    === filterState;
    return sv && st && ss;
  });

  const ongoing    = incidents.filter(i => i.status === 'ongoing').length;
  const highSev    = incidents.filter(i => i.severity === 'high').length;
  const resolved   = incidents.filter(i => i.status === 'resolved').length;
  const casualties = incidents.reduce((s, i) => s + (i.casualties || 0), 0);

  const submitIncident = async e => {
    e.preventDefault();
    setPosting(true);
    try {
      await api.createIncident({ ...form, lat: parseFloat(form.lat), lng: parseFloat(form.lng) });
      setMsg('✅ Incident logged successfully!');
      setForm(BLANK_FORM);
      setShowForm(false);
      await load();
    } catch (err) {
      setMsg('❌ ' + err.message);
    }
    setPosting(false);
  };

  const updateStatus = async (id, status) => {
    await api.updateIncident(id, { status });
    await load();
  };

  return (
    <div className="page-root cm-page">
      <div className="page-header-bar">
        <div>
          <h1 className="page-title">Conflict Monitor — North East India</h1>
          <p className="page-sub">
            Human-wildlife conflict tracking · {incidents.length} incidents in DB ·
            Live from MongoDB
          </p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <span className="live-pill"><span className="live-dot"/> LIVE</span>
          <button className="icon-btn" onClick={load} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin-anim' : ''}/> Refresh
          </button>
          {canCreate && (
            <button className="icon-btn create-btn" onClick={() => setShowForm(f => !f)}>
              {showForm ? <><X size={14}/> Cancel</> : <><Plus size={14}/> Log Incident</>}
            </button>
          )}
        </div>
      </div>

      {msg && <div className={`admin-msg ${msg.startsWith('❌') ? 'error' : ''}`}>{msg} <button onClick={() => setMsg('')}>✕</button></div>}

      {/* Log Incident Form */}
      {showForm && canCreate && (
        <div className="panel" style={{ marginBottom: 20 }}>
          <div className="panel-hdr"><h3><Plus size={15}/> Log New Conflict Incident</h3></div>
          <form className="worker-form" onSubmit={submitIncident}>
            <div className="wf-grid">
              <div className="wf-field"><label>Animal / Species</label>
                <input className="edit-input" required placeholder="e.g. Asian Elephant" value={form.animal} onChange={e => setForm(f => ({...f, animal: e.target.value}))}/></div>
              <div className="wf-field"><label>Quick Location Fill</label>
                <select className="auth-select" onChange={e => {
                  const sel = QUICK_LOCATIONS.find(q => q.name === e.target.value);
                  if (sel && sel.name !== 'Custom Map Location') {
                    setForm(f => ({ ...f, state: sel.state, location: sel.loc, lat: sel.lat, lng: sel.lng }));
                  }
                }}>
                  {QUICK_LOCATIONS.map(q => <option key={q.name} value={q.name}>{q.name}</option>)}
                </select>
              </div>
              <div className="wf-field"><label>State</label>
                <select className="auth-select" value={form.state} onChange={e => setForm(f => ({...f, state: e.target.value}))}>
                  {NE_STATES.map(s => <option key={s}>{s}</option>)}</select></div>
              <div className="wf-field"><label>Severity</label>
                <select className="auth-select" value={form.severity} onChange={e => setForm(f => ({...f, severity: e.target.value}))}>
                  {['low','medium','high'].map(s => <option key={s}>{s}</option>)}</select></div>
              <div className="wf-field"><label>Casualties</label>
                <input className="edit-input" type="number" min={0} value={form.casualties} onChange={e => setForm(f => ({...f, casualties: parseInt(e.target.value)||0}))}/></div>
              <div className="wf-field full"><label>Location Description</label>
                <input className="edit-input" required placeholder="e.g. Kaziranga NP, eastern range, Assam" value={form.location} onChange={e => setForm(f => ({...f, location: e.target.value}))}/></div>
              <div className="wf-field"><label>Latitude</label>
                <input className="edit-input" type="number" step="0.001" required placeholder="26.570" value={form.lat} onChange={e => setForm(f => ({...f, lat: e.target.value}))}/></div>
              <div className="wf-field"><label>Longitude</label>
                <input className="edit-input" type="number" step="0.001" required placeholder="93.170" value={form.lng} onChange={e => setForm(f => ({...f, lng: e.target.value}))}/></div>
              <div className="wf-field full"><label>Damage Description</label>
                <textarea className="edit-input" rows={2} placeholder="Describe damage…" value={form.damage} onChange={e => setForm(f => ({...f, damage: e.target.value}))}/></div>
              <div className="wf-field full"><label>Response Action</label>
                <textarea className="edit-input" rows={2} placeholder="What response was taken?" value={form.response} onChange={e => setForm(f => ({...f, response: e.target.value}))}/></div>
            </div>
            <button type="submit" className="auth-btn" disabled={posting} style={{ maxWidth:220 }}>
              {posting ? 'Submitting…' : <><Plus size={14}/> Log Incident</>}
            </button>
          </form>
        </div>
      )}

      {/* Summary Stats */}
      <div className="cm-stats">
        {[
          { icon: AlertTriangle, label: 'Ongoing Incidents', value: ongoing,    color: '#ff1744' },
          { icon: ShieldAlert,   label: 'High Severity',     value: highSev,    color: '#ff9100' },
          { icon: CheckCircle,   label: 'Resolved',          value: resolved,   color: '#4CAF50' },
          { icon: Users,         label: 'Human Casualties',  value: casualties, color: '#ab47bc' },
        ].map(s => (
          <div className="cm-stat" key={s.label} style={{ '--c': s.color }}>
            <div className="cms-icon"><s.icon size={22}/></div>
            <div className="cms-val">{s.value}</div>
            <div className="cms-lbl">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Map */}
      <div className="panel cm-map-panel">
        <div className="panel-hdr">
          <h3><MapPin size={15}/> Conflict Zone Map — North East India</h3>
          <div className="map-legend-row">
            {Object.entries(SEV_COLOR).map(([k, c]) => (
              <span key={k} className="leg-item">
                <span className="leg-dot" style={{ background: c }}/>{k}
              </span>
            ))}
          </div>
        </div>
        {loading ? (
          <div style={{ height: 320, display:'flex', alignItems:'center', justifyContent:'center', color:'#666' }}>Loading map data…</div>
        ) : (
          <div style={{ position: 'relative' }}>
            <MapContainer center={[26.0, 93.0]} zoom={6} className="cm-map" scrollWheelZoom={false}>
              <TileLayer url={layerConfig.url} attribution={layerConfig.attribution}/>
              {filtered.map(i => (
                <React.Fragment key={i._id}>
                  <Circle
                    center={[i.coordinates?.lat || 26, i.coordinates?.lng || 93]}
                    radius={i.severity === 'high' ? 10000 : i.severity === 'medium' ? 7000 : 5000}
                    pathOptions={{
                      color: SEV_COLOR[i.severity] || '#aaa',
                      fillColor: SEV_COLOR[i.severity] || '#aaa',
                      fillOpacity: 0.3, weight: 2,
                      className: i.status === 'ongoing' ? 'map-glow-pulse' : ''
                    }}
                    eventHandlers={{ click: () => setSelected(i) }}
                  >
                    <Popup>
                      <strong>{i.animal}</strong><br/>
                      {i.location}<br/>
                      <span style={{ color: SEV_COLOR[i.severity], fontWeight: 700 }}>{i.severity?.toUpperCase()}</span>
                      <br/><small>Status: {i.status}</small>
                    </Popup>
                  </Circle>
                  <Marker
                    position={[i.coordinates?.lat || 26, i.coordinates?.lng || 93]}
                    eventHandlers={{ click: () => setSelected(i) }}
                    icon={L.divIcon({
                      html: `<div class="glow-marker" style="--mc: ${SEV_COLOR[i.severity] || '#aaa'}">
                               <div class="core"></div>
                               ${i.status === 'ongoing' ? '<div class="ring"></div>' : ''}
                             </div>`,
                      className: '',
                      iconSize: [24, 24],
                      iconAnchor: [12, 12]
                    })}
                  />
                </React.Fragment>
              ))}
            </MapContainer>
            <MapLayerControl activeLayer={activeLayer} setActiveLayer={setActiveLayer}/>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="panel cm-table-panel">
        <div className="panel-hdr">
          <h3>Incident Log <span style={{ fontSize:'0.72rem', color:'#555', fontWeight:400 }}>Live from MongoDB</span></h3>
          <div className="cm-filters">
            <select className="filter-select" value={filterState} onChange={e => setFilterState(e.target.value)}>
              {STATES.map(s => <option key={s}>{s}</option>)}
            </select>
            <select className="filter-select" value={filterSev} onChange={e => setFilterSev(e.target.value)}>
              <option value="all">All Severity</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">All Status</option>
              <option value="ongoing">Ongoing</option>
              <option value="contained">Contained</option>
              <option value="monitoring">Monitoring</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign:'center', color:'#666' }}>Loading incidents from database…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign:'center', color:'#555' }}>
            No incidents found.{canCreate && <> Click <strong>"Log Incident"</strong> to add one.</>}
          </div>
        ) : (
          <div className="cm-table-wrap">
            <table className="cm-table">
              <thead><tr>
                <th>Animal / Species</th><th>Location</th><th>State</th>
                <th>Date</th><th>Severity</th><th>Status</th><th>Response</th>
                {canCreate && <th>Actions</th>}
              </tr></thead>
              <tbody>
                {filtered.map(i => {
                  const SIcon = STATUS_ICON[i.status] || Activity;
                  return (
                    <tr key={i._id} className={selected?._id === i._id ? 'tr-sel' : ''}
                      onClick={() => setSelected(i === selected ? null : i)}>
                      <td className="animal-cell">{i.animal}</td>
                      <td><MapPin size={11}/> {i.location}</td>
                      <td style={{ fontSize: '0.8rem', color: '#666' }}>{i.state}</td>
                      <td style={{ fontSize: '0.8rem' }}>{i.date || new Date(i.createdAt).toLocaleDateString('en-IN')}</td>
                      <td>
                        <span className="sev-pill" style={{
                          background: (SEV_COLOR[i.severity] || '#aaa') + '22',
                          color: SEV_COLOR[i.severity] || '#aaa',
                          border: `1px solid ${(SEV_COLOR[i.severity] || '#aaa')}44`,
                        }}>{i.severity}</span>
                      </td>
                      <td>
                        <span className="status-pill" style={{ color: STATUS_COLOR[i.status] || '#aaa' }}>
                          <SIcon size={12}/> {i.status}
                        </span>
                      </td>
                      <td className="response-cell">{i.response}</td>
                      {canCreate && (
                        <td onClick={e => e.stopPropagation()}>
                          {i.status !== 'resolved' && (
                            <button
                              className="tbl-btn"
                              title="Mark Resolved"
                              onClick={() => updateStatus(i._id, 'resolved')}>
                              <CheckCircle size={13}/>
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {selected && (
          <div className="cm-detail">
            <div className="cm-detail-grid">
              <div><strong>Species:</strong> {selected.animal}</div>
              <div><strong>State:</strong> {selected.state}</div>
              <div><strong>Location:</strong> {selected.location}</div>
              <div><strong>Date:</strong> {selected.date || new Date(selected.createdAt).toLocaleDateString('en-IN')}</div>
              <div><strong>Casualties:</strong> {selected.casualties}</div>
              <div><strong>Severity:</strong> <span style={{ color: SEV_COLOR[selected.severity] }}>{selected.severity}</span></div>
              {selected.damage   && <div className="full-col"><strong>Damage:</strong> {selected.damage}</div>}
              {selected.response && <div className="full-col"><strong>Response:</strong> {selected.response}</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConflictMonitor;
