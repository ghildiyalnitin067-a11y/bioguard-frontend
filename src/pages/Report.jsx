import React, { useState } from 'react';
import {
  AlertTriangle, TreePine, Flame, Crosshair, Camera,
  MapPin, Upload, CheckCircle, ChevronRight, ChevronLeft,
  User, Phone, Mail, Send, Loader
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { notifyReport } from '../services/notifications';
import './Report.css';

const INCIDENT_TYPES = [
  { key: 'wildlife',      label: 'Wildlife Conflict', icon: AlertTriangle, color: '#e53935', desc: 'Animal near settlements, dangerous sighting, or livestock attack' },
  { key: 'deforestation', label: 'Illegal Logging',   icon: TreePine,      color: '#fb8c00', desc: 'Illegal tree felling, land clearing, or mining without permits' },
  { key: 'fire',          label: 'Forest Fire',        icon: Flame,         color: '#ff6f00', desc: 'Active wildfire, slash-and-burn, or suspicious smoke' },
  { key: 'poaching',      label: 'Poaching Activity',  icon: Crosshair,     color: '#7b1fa2', desc: 'Illegal hunting, snares, traps, or poacher sightings' },
  { key: 'other',         label: 'Other Threat',       icon: Camera,        color: '#1565c0', desc: 'Pollution, encroachment, or any other environmental threat' },
];

const REGIONS = ['Karnataka', 'Kerala', 'Tamil Nadu', 'Uttarakhand', 'Assam', 'Madhya Pradesh', 'Rajasthan', 'Arunachal Pradesh', 'Maharashtra', 'Other', 'Manipur', 'Meghalaya', 'Nagaland'];

const QUICK_LOCATIONS = [
  { name: 'Custom Location',              region: '' },
  { name: 'Kaziranga Eastern Range',      region: 'Assam',             loc: 'Kaziranga National Park - Eastern Range' },
  { name: 'Manas Buffer Zone',            region: 'Assam',             loc: 'Manas National Park - Buffer Zone' },
  { name: 'Namdapha Tiger Corridor',      region: 'Arunachal Pradesh', loc: 'Namdapha National Park' },
  { name: 'Keibul Lamjao Wetlands',       region: 'Manipur',           loc: 'Keibul Lamjao National Park' },
  { name: 'Nokrek Biosphere Reserve',     region: 'Meghalaya',         loc: 'Nokrek National Park' },
  { name: 'Dzukou Valley',                region: 'Nagaland',          loc: 'Dzukou Valley Trek' },
  { name: 'Rajaji Elephant Corridor',     region: 'Uttarakhand',       loc: 'Rajaji National Park' },
];
const URGENCY = ['Low — no immediate danger', 'Medium — situation developing', 'High — immediate risk to life or wildlife'];

const STEPS = ['Incident Type', 'Location & Details', 'Evidence', 'Contact Info'];

const Report = () => {
  const { user } = useAuth();
  const [step, setStep]           = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [refId,     setRefId]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [form, setForm] = useState({
    type: '', region: '', location: '', urgency: '', description: '',
    files: [], imageData: [], name: '', phone: '', email: '', anonymous: false,
  });
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    fetch(`${API_URL}/api/locations/suggestions`)
      .then(res => res.json())
      .then(data => setSuggestions(data.locations || []))
      .catch(() => {});
  }, []);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const filteredSuggestions = suggestions.filter(s => 
    s.name.toLowerCase().includes((form.location||'').toLowerCase()) ||
    s.state.toLowerCase().includes((form.location||'').toLowerCase())
  ).slice(0, 10);

  const canNext = () => {
    if (step === 0) return !!form.type;
    if (step === 1) return form.region && form.location && form.urgency && form.description;
    if (step === 2) return true;
    if (step === 3) return form.anonymous || (form.name && form.phone);
    return false;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('bioguard-jwt');
      const res = await fetch(`${API}/api/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          type:        form.type,
          region:      form.region,
          location:    form.location,
          urgency:     form.urgency,
          description: form.description,
          files:       form.files,
          imageData:   form.imageData,
          anonymous:   form.anonymous,
          name:        form.name,
          phone:       form.phone,
          email:       form.email,
          userId:      user?._id || user?.id || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed.');
      setRefId(data.refId);
      setSubmitted(true);
      notifyReport(data.refId); // browser notification
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  /* Read a File as a base64 DataURL */
  function readAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  /* Handle file selection: store names AND base64 for images */
  async function handleFileChange(e) {
    const picked = Array.from(e.target.files);
    const names  = picked.map(f => f.name);
    const images = picked.filter(f => f.type.startsWith('image/'));
    let dataUrls = [];
    try {
      dataUrls = await Promise.all(images.map(readAsDataURL));
    } catch (_) {}
    setForm(f => ({
      ...f,
      files:     [...f.files, ...names],
      imageData: [...f.imageData, ...dataUrls],
    }));
  }

  if (submitted) return (
    <div className="page-root rp-page">
      <div className="success-screen">
        <div className="success-icon"><CheckCircle size={64}/></div>
        <h2>Report Submitted!</h2>
        <p>Thank you for contributing to conservation. Your report has been assigned ID <strong>#{refId}</strong> and will be reviewed within 30 minutes.</p>
        <button className="btn-primary-rp" onClick={() => { setSubmitted(false); setStep(0); setRefId(''); setForm({ type:'',region:'',location:'',urgency:'',description:'',files:[],imageData:[],name:'',phone:'',email:'',anonymous:false }); }}>
          Submit Another Report
        </button>
      </div>
    </div>
  );

  return (
    <div className="page-root rp-page">
      <div className="page-header-bar">
        <div>
          <h1 className="page-title">Community Report</h1>
          <p className="page-sub">Report illegal activities or wildlife threats securely and anonymously</p>
        </div>
      </div>

      <div className="report-container">
        {/* Stepper */}
        <div className="stepper">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className={`step-node ${i < step ? 'done' : i === step ? 'active' : ''}`}>
                <div className="step-circle">
                  {i < step ? <CheckCircle size={16}/> : <span>{i + 1}</span>}
                </div>
                <span className="step-label">{s}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`step-line ${i < step ? 'done' : ''}`}/>}
            </React.Fragment>
          ))}
        </div>

        <div className="step-content">

          {/* STEP 0 — Incident type */}
          {step === 0 && (
            <div className="step-panel">
              <h2 className="step-title">What are you reporting?</h2>
              <p className="step-hint">Select the category that best describes the incident.</p>
              <div className="type-grid">
                {INCIDENT_TYPES.map(t => (
                  <button key={t.key}
                    className={`type-card ${form.type === t.key ? 'sel' : ''}`}
                    style={{ '--tc': t.color }}
                    onClick={() => set('type', t.key)}>
                    <div className="tc-icon"><t.icon size={28}/></div>
                    <div className="tc-label">{t.label}</div>
                    <div className="tc-desc">{t.desc}</div>
                    {form.type === t.key && <div className="tc-check"><CheckCircle size={18}/></div>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 1 — Location & details */}
          {step === 1 && (
            <div className="step-panel">
              <h2 className="step-title">Location &amp; Details</h2>
              <p className="step-hint">Help responders locate the incident quickly.</p>
              <div className="form-grid">
                {/* Removed Quick Location Suggestion dropdown since we now have Autocomplete */}
                <div className="form-group">
                  <label>State / Region *</label>
                  <select className="form-select" value={form.region} onChange={e => set('region', e.target.value)}>
                    <option value="">Select region…</option>
                    {REGIONS.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ position: 'relative' }}>
                  <label>Specific Location *</label>
                  <div className="input-icon-wrap">
                    <MapPin size={15}/>
                    <input className="form-input" placeholder="Search village, park, or landmark…"
                      value={form.location}
                      onChange={e => {
                        set('location', e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
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
                            if (loc.state) set('region', loc.state);
                            setShowSuggestions(false);
                          }} style={{
                            padding: '10px 14px', cursor: 'pointer', fontSize: '0.82rem',
                            borderBottom: i < filteredSuggestions.length-1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                            display: 'flex', flexDirection: 'column', gap: 2,
                            background: 'transparent',
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
                </div>
                <div className="form-group full">
                  <label>Urgency Level *</label>
                  <div className="urgency-opts">
                    {URGENCY.map((u, i) => (
                      <label key={u} className={`urgency-opt ${form.urgency === u ? 'sel' : ''}`}>
                        <input type="radio" name="urgency" value={u} checked={form.urgency === u}
                          onChange={() => set('urgency', u)} />
                        <span className={`urg-dot urg-${i}`}/>
                        {u}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="form-group full">
                  <label>Description *</label>
                  <textarea className="form-textarea" rows={5}
                    placeholder="Describe what you saw — animal species, number of people involved, time of occurrence, suspicious activity details…"
                    value={form.description} onChange={e => set('description', e.target.value)}/>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 — Evidence */}
          {step === 2 && (
            <div className="step-panel">
              <h2 className="step-title">Upload Evidence <span className="optional">(Optional)</span></h2>
              <p className="step-hint">Photos, videos, or documents help us verify and prioritise your report.</p>
              <div className="upload-zone" onClick={() => document.getElementById('file-input').click()}>
                <Upload size={40}/>
                <p>Click to upload or drag &amp; drop</p>
                <span>PNG, JPG, MP4, PDF — Max 20MB each</span>
                <input id="file-input" type="file" multiple hidden
                  accept="image/*,video/*,.pdf"
                  onChange={handleFileChange}/>
              </div>
              {form.files.length > 0 && (
                <div className="file-list">
                  {form.files.map((f, i) => {
                    const preview = form.imageData.find((d, di) => di === i) ||
                      form.imageData[i];
                    return (
                      <div key={i} className="file-item">
                        {preview ? (
                          <img src={preview} alt={f}
                            style={{ width:36, height:36, objectFit:'cover', borderRadius:6, flexShrink:0 }}/>
                        ) : (
                          <Camera size={14}/>
                        )}
                        <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f}</span>
                        <button onClick={() => setForm(fm => ({
                          ...fm,
                          files:     fm.files.filter((_,j) => j !== i),
                          imageData: fm.imageData.filter((_,j) => j !== i),
                        }))}>×</button>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="anon-notice">
                <CheckCircle size={16}/> Your identity is <strong>never</strong> shared with authorities without your consent.
              </div>
            </div>
          )}

          {/* STEP 3 — Contact */}
          {step === 3 && (
            <div className="step-panel">
              <h2 className="step-title">Contact Information</h2>
              <p className="step-hint">Optionally share your details so responders can follow up.</p>
              <label className="anon-toggle">
                <input type="checkbox" checked={form.anonymous} onChange={e => set('anonymous', e.target.checked)}/>
                <span className="toggle-track"><span className="toggle-thumb"/></span>
                Submit anonymously
              </label>
              {!form.anonymous && (
                <div className="form-grid">
                  <div className="form-group">
                    <label>Full Name *</label>
                    <div className="input-icon-wrap"><User size={15}/>
                      <input className="form-input" placeholder="Your name"
                        value={form.name} onChange={e => set('name', e.target.value)}/>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Phone *</label>
                    <div className="input-icon-wrap"><Phone size={15}/>
                      <input className="form-input" placeholder="+91 XXXXX XXXXX"
                        value={form.phone} onChange={e => set('phone', e.target.value)}/>
                    </div>
                  </div>
                  <div className="form-group full">
                    <label>Email (optional)</label>
                    <div className="input-icon-wrap"><Mail size={15}/>
                      <input className="form-input" placeholder="you@example.com"
                        value={form.email} onChange={e => set('email', e.target.value)}/>
                    </div>
                  </div>
                </div>
              )}
              {/* Summary */}
              <div className="summary-box">
                <h4>Report Summary</h4>
                <div className="summary-row"><span>Type:</span><span>{INCIDENT_TYPES.find(t=>t.key===form.type)?.label}</span></div>
                <div className="summary-row"><span>Region:</span><span>{form.region}</span></div>
                <div className="summary-row"><span>Location:</span><span>{form.location}</span></div>
                <div className="summary-row"><span>Urgency:</span><span>{form.urgency}</span></div>
                <div className="summary-row"><span>Evidence:</span><span>{form.files.length} file(s)
                  {form.imageData.length > 0 && ` · ${form.imageData.length} image(s)`}</span></div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="step-nav">
          {step > 0 && (
            <button className="nav-btn secondary" onClick={() => setStep(s => s - 1)}>
              <ChevronLeft size={16}/> Back
            </button>
          )}
          <div style={{ flex: 1 }}/>
          {error && <span className="rp-error">{error}</span>}
          {step < STEPS.length - 1 ? (
            <button className="nav-btn primary" onClick={() => setStep(s => s + 1)} disabled={!canNext()}>
              Next <ChevronRight size={16}/>
            </button>
          ) : (
            <button className="nav-btn submit" onClick={handleSubmit} disabled={!canNext() || loading}>
              {loading ? <><Loader size={16} className="spin-icon"/> Submitting…</> : <><Send size={16}/> Submit Report</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Report;
