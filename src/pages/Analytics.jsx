import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  BarChart2, AlertTriangle,
  RefreshCw, Wifi, WifiOff, Activity, Shield,
  Zap, Map, FileText,
} from 'lucide-react';
import './Analytics.css';

const getToken = () => localStorage.getItem('bioguard-jwt') || '';

const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');
const API  = `${BASE}/api`;
const WS   = BASE.replace(/^http/, 'ws');

const TOOLTIP_STYLE = {
  background: '#0d1f0d',
  border: '1px solid rgba(76,175,80,0.4)',
  borderRadius: 10,
  color: '#e0ffe0',
  fontSize: '0.8rem',
  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
};

const RISK_COLORS = {
  critical: '#ff0a54', // Neon Pink
  high:     '#ff5400', // Super Orange
  medium:   '#ffdd00', // Super Yellow
  low:      '#00f5d4', // Bright Cyan-Green
};

const SEVERITY_COLORS = {
  high:   '#ff1744',
  medium: '#ff9100',
  low:    '#69f0ae',
};

/* ── Status badge ── */
function RiskBadge({ level }) {
  const colors = { critical: '#ff1744', high: '#ff6d00', medium: '#ffd600', low: '#00e676' };
  return (
    <span style={{
      background: colors[level] + '22',
      color:      colors[level],
      border:     `1px solid ${colors[level]}55`,
      borderRadius: 6,
      padding: '2px 8px',
      fontSize: '0.72rem',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    }}>
      {level}
    </span>
  );
}

/* ── Live pulse dot ── */
function PulseDot({ color = '#00e676' }) {
  return (
    <span style={{ position: 'relative', display: 'inline-block', width: 10, height: 10, marginRight: 6 }}>
      <span style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: color, animation: 'livePulse 1.5s ease-in-out infinite',
      }}/>
    </span>
  );
}

/* ── Mini stat card ── */
function StatCard({ icon: Icon, label, value, delta, bad, color = '#4CAF50' }) {
  return (
    <div className="stat-card-live">
      <div className="scl-icon" style={{ background: color + '22', color }}>
        <Icon size={20} />
      </div>
      <div className="scl-body">
        <div className="scl-value">{value}</div>
        <div className="scl-label">{label}</div>
      </div>
      {delta && (
        <div className={`scl-delta ${bad ? 'bad' : 'good'}`}>{delta}</div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════ */
const Analytics = () => {
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [wsOnline, setWsOnline] = useState(false);
  const [feed,     setFeed]     = useState([]);
  const [lastPoll, setLastPoll] = useState(null);
  const [polling,  setPolling]  = useState(false);
  const wsRef    = useRef(null);
  const timerRef = useRef(null);

  /* ── Fetch live data ── */
  const fetchLive = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setPolling(true);
    try {
      const res = await fetch(`${API}/analysis/live`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setLastPoll(new Date().toLocaleTimeString());
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setPolling(false);
    }
  }, []);

  /* ── Initial fetch + polling every 60s ── */
  useEffect(() => {
    fetchLive();
    timerRef.current = setInterval(() => fetchLive(true), 60000);
    return () => clearInterval(timerRef.current);
  }, [fetchLive]);

  /* ── WebSocket live feed ── */
  useEffect(() => {
    const connect = () => {
      try {
        const ws = new WebSocket(WS);
        wsRef.current = ws;
        ws.onopen  = () => setWsOnline(true);
        ws.onclose = () => { setWsOnline(false); setTimeout(connect, 5000); };
        ws.onerror = () => ws.close();
        ws.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data);
            if (msg.event !== 'connected') {
              setFeed(prev => [{
                id:    Date.now(),
                event: msg.event,
                text:  msg.data?.message || msg.event,
                time:  new Date().toLocaleTimeString(),
                lat:   msg.data?.lat,
                lng:   msg.data?.lng,
              }, ...prev].slice(0, 20));
            }
            /* If predictions updated, refetch */
            if (msg.event === 'predictions_updated') fetchLive(true);
          } catch {}
        };
      } catch {}
    };
    connect();
    return () => wsRef.current?.close();
  }, [fetchLive]);

  /* ── Derived data for charts ── */
  const predictions  = data?.predictions?.all || [];
  const riskDist     = predictions.length ? (() => {
    const m = { critical: 0, high: 0, medium: 0, low: 0 };
    predictions.forEach(p => { m[p.risk_level] = (m[p.risk_level] || 0) + 1; });
    return Object.entries(m).map(([k, v]) => ({ name: k, value: v, color: RISK_COLORS[k] }));
  })() : [];

  const reportTrend = (data?.reports?.trend || []).slice(-14).map(r => ({
    date:  r.date.slice(5), // MM-DD
    reports: r.count,
  }));
  const incidentTrend = (data?.incidents?.trend || []).slice(-14).map(r => ({
    date:       r.date.slice(5),
    incidents:  r.count,
    casualties: r.casualties,
  }));

  /* Merge report + incident trend by date */
  const mergedTrend = (() => {
    const map = {};
    reportTrend.forEach(r => { map[r.date] = { date: r.date, reports: r.reports, incidents: 0 }; });
    incidentTrend.forEach(r => {
      if (map[r.date]) map[r.date].incidents = r.incidents;
      else map[r.date] = { date: r.date, reports: 0, incidents: r.incidents };
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  })();

  const reportByType  = data?.reports?.byType  || [];
  const reportByState = data?.incidents?.byState || [];
  const topPredictions = predictions.slice(0, 6);

  /* ── Loading skeleton ── */
  if (loading) return (
    <div className="page-root an-page" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'70vh' }}>
      <div style={{ textAlign:'center', color:'#4CAF50' }}>
        <div className="spin-icon"><RefreshCw size={40} /></div>
        <p style={{ marginTop: 16, color:'#888', fontSize:'0.9rem' }}>Loading live data from MongoDB…</p>
      </div>
    </div>
  );

  /* ── Error state ── */
  if (error && !data) return (
    <div className="page-root an-page" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'70vh' }}>
      <div style={{ textAlign:'center' }}>
        <AlertTriangle size={40} color="#ff6d00" />
        <p style={{ color:'#ff6d00', marginTop:12 }}>Failed to load live data: {error}</p>
        <button className="icon-btn" onClick={() => fetchLive()} style={{ marginTop:12 }}>
          <RefreshCw size={14}/> Retry
        </button>
      </div>
    </div>
  );

  const s = data?.summary || {};

  return (
    <div className="page-root an-page">

      {/* ── Header ── */}
      <div className="page-header-bar">
        <div>
          <h1 className="page-title">
            <PulseDot color="#4CAF50" />
            Live Prediction Dashboard
          </h1>
          <p className="page-sub">
            Real-time ML predictions driven by community reports &amp; incident data · NE India Biodiversity Network
          </p>
        </div>
        <div className="header-actions">
          <div className="ws-badge" style={{ color: wsOnline ? '#69f0ae' : '#ff6d00' }}>
            {wsOnline ? <Wifi size={14}/> : <WifiOff size={14}/>}
            <span>{wsOnline ? 'Live' : 'Reconnecting'}</span>
          </div>
          {lastPoll && (
            <span style={{ fontSize:'0.75rem', color:'#666' }}>
              Updated {lastPoll}
            </span>
          )}
          <button
            className={`icon-btn ${polling ? 'pulsing' : ''}`}
            onClick={() => fetchLive()}
            disabled={polling}
          >
            <RefreshCw size={14} className={polling ? 'spinning' : ''}/>
            Refresh
          </button>
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="kpi-grid">
        <StatCard icon={FileText}       label="Total Reports"        value={s.totalReports    || 0} delta={`+${s.recentReports || 0} this week`}    bad={false} color="#4CAF50" />
        <StatCard icon={AlertTriangle}  label="Incidents (DB)"       value={s.totalIncidents  || 0} delta={`+${s.recentIncidents || 0} this week`}   bad={s.recentIncidents > 0} color="#ff9100" />
        <StatCard icon={Zap}            label="Critical Risk Zones"  value={s.criticalZones   || 0} delta={s.criticalZones > 0 ? 'Action needed' : 'All clear'} bad={s.criticalZones > 0} color="#ff1744" />
        <StatCard icon={Shield}         label="High Risk Zones"      value={s.highRiskZones   || 0} delta="Monitor closely"                           bad={s.highRiskZones > 2}  color="#ff6d00" />
        <StatCard icon={Activity}       label="Avg ML Risk Score"    value={s.avgRiskScore    || '—'} delta="Across all zones"                        bad={s.avgRiskScore > 0.6} color="#ab47bc" />
        <StatCard icon={Map}            label="Zones Monitored"      value={predictions.length || 8} delta="NE India"                                 bad={false} color="#29b6f6" />
      </div>

      {/* ── Main grid ── */}
      <div className="charts-grid">

        {/* 1. Report + Incident trend — stacked area */}
        <div className="chart-panel wide">
          <div className="panel-hdr">
            <h3><Activity size={16} style={{marginRight:6,verticalAlign:'middle'}}/>Community Reports &amp; Incidents — 14-Day Trend</h3>
            <span className="panel-tag live-tag"><PulseDot color="#4CAF50"/>Live from MongoDB</span>
          </div>
          {mergedTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={mergedTrend} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gReports" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#4CAF50" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#4CAF50" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gIncidents" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#ff6d00" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#ff6d00" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                <XAxis dataKey="date" tick={{ fill:'#666', fontSize:11 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill:'#666', fontSize:11 }} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={TOOLTIP_STYLE}/>
                <Legend wrapperStyle={{ fontSize:'0.8rem', color:'#666' }}/>
                <Area type="monotone" dataKey="reports"   name="Community Reports" stroke="#4CAF50" fill="url(#gReports)"   strokeWidth={2}/>
                <Area type="monotone" dataKey="incidents" name="Incidents"         stroke="#ff6d00" fill="url(#gIncidents)" strokeWidth={2}/>
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-data-msg">No report/incident data yet. Submit reports to see trend.</div>
          )}
        </div>

        {/* 2. Report type pie */}
        <div className="chart-panel">
          <div className="panel-hdr">
            <h3><FileText size={16} style={{marginRight:6,verticalAlign:'middle'}}/>Report Type Distribution</h3>
            <span className="panel-tag live-tag"><PulseDot color="#4CAF50"/>Live</span>
          </div>
          {reportByType.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={reportByType}
                  cx="50%" cy="50%"
                  innerRadius={60} outerRadius={100}
                  paddingAngle={3} dataKey="value" nameKey="name"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke:'#444' }}
                >
                  {reportByType.map((d, i) => <Cell key={i} fill={d.color}/>)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE}/>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-data-msg">No reports yet. Pie chart will populate as reports come in.</div>
          )}
        </div>

        {/* 3. ML Risk score distribution pie */}
        <div className="chart-panel">
          <div className="panel-hdr">
            <h3><Shield size={16} style={{marginRight:6,verticalAlign:'middle'}}/>ML Risk Level Distribution</h3>
            <span className="panel-tag">Across {predictions.length} zones</span>
          </div>
          {riskDist.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <defs>
                  <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over"/>
                  </filter>
                </defs>
                <text x="50%" y="45%" textAnchor="middle" dominantBaseline="middle" style={{ fill: '#ffffff', fontSize: '2.2rem', fontWeight: 900, textShadow: '0 0 10px rgba(255,255,255,0.3)' }}>
                  {predictions.length}
                </text>
                <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle" style={{ fill: '#888', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Zones
                </text>
                <Pie
                  data={riskDist}
                  cx="50%" cy="50%"
                  innerRadius={80} outerRadius={110}
                  paddingAngle={6} dataKey="value" nameKey="name"
                  stroke="none"
                  filter="url(#neonGlow)"
                  cornerRadius={8}
                >
                  {riskDist.map((d, i) => <Cell key={i} fill={d.color}/>)}
                </Pie>
                <Tooltip 
                  contentStyle={TOOLTIP_STYLE}
                  itemStyle={{ color: '#fff', fontWeight: 600, textTransform: 'capitalize' }}
                  formatter={(value, name) => [`${value} Zones`, name]}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  iconType="circle"
                  formatter={(value, entry) => <span style={{ color: '#aaa', fontWeight: 600, textTransform: 'capitalize', fontSize: '0.85rem' }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-data-msg">ML predictions loading…</div>
          )}
        </div>

        {/* 4. Incidents by state bar chart */}
        <div className="chart-panel wide">
          <div className="panel-hdr">
            <h3><BarChart2 size={16} style={{marginRight:6,verticalAlign:'middle'}}/>Incidents by State — NE India</h3>
            <span className="panel-tag live-tag"><PulseDot color="#4CAF50"/>Live from DB</span>
          </div>
          {reportByState.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={reportByState} margin={{ top:10, right:20, left:-10, bottom:0 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                <XAxis dataKey="state" tick={{ fill:'#666', fontSize:11 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill:'#666', fontSize:11 }} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={TOOLTIP_STYLE}/>
                <Legend wrapperStyle={{ fontSize:'0.8rem', color:'#666' }}/>
                <Bar dataKey="count"        name="Incidents"       fill="#ff6d00" radius={[4,4,0,0]}/>
                <Bar dataKey="avgCasualties" name="Avg Casualties" fill="#ef5350" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-data-msg">No incident data logged yet.</div>
          )}
        </div>

      </div>

      {/* ── ML Predictions table ── */}
      <div className="predictions-section">
        <div className="panel-hdr" style={{ marginBottom: 16 }}>
          <h3><Zap size={16} style={{marginRight:6,verticalAlign:'middle'}}/>ML Zone Risk Predictions</h3>
          <span className="panel-tag live-tag">
            <PulseDot color="#ab47bc"/>
            Computed from live Reports + Incidents + Temporal factors
          </span>
        </div>
        <div className="pred-grid">
          {topPredictions.length > 0 ? topPredictions.map(p => (
            <div className={`pred-card pred-${p.risk_level}`} key={p.id}>
              <div className="pred-card-top">
                <div className="pred-zone">{p.zone_name}</div>
                <RiskBadge level={p.risk_level} />
              </div>
              <div className="pred-threat">{p.threat_type}</div>
              <div className="pred-score-bar">
                <div
                  className="pred-score-fill"
                  style={{
                    width: `${(p.risk_score * 100).toFixed(0)}%`,
                    background: RISK_COLORS[p.risk_level],
                  }}
                />
                <span>{(p.risk_score * 100).toFixed(0)}/100</span>
              </div>
              <p className="pred-text">{p.prediction}</p>
              <div className="pred-factors">
                <span title="Zone base risk">🏔 {(p.factors.base_zone_risk * 100).toFixed(0)}%</span>
                <span title="Live report frequency">📋 {(p.factors.live_report_freq * 100).toFixed(0)}%</span>
                <span title="Incident severity">⚠ {(p.factors.incident_severity * 100).toFixed(0)}%</span>
                <span title="Confidence">✓ {(p.confidence * 100).toFixed(0)}% conf</span>
              </div>
            </div>
          )) : (
            <div className="no-data-msg" style={{ gridColumn:'1/-1' }}>
              ML predictions will appear here once zones are computed.
            </div>
          )}
        </div>
      </div>

      {/* ── Live WebSocket feed ── */}
      <div className="live-feed-section">
        <div className="panel-hdr" style={{ marginBottom: 12 }}>
          <h3>
            <PulseDot color={wsOnline ? '#4CAF50' : '#ff6d00'} />
            Real-Time Event Feed
          </h3>
          <span className="panel-tag">WebSocket · BioGuard Satellite &amp; Patrol Network</span>
        </div>
        <div className="feed-list">
          {feed.length === 0 && (
            <div className="feed-item feed-empty">
              <span>Waiting for live events… {wsOnline ? '(connected)' : '(connecting…)'}</span>
            </div>
          )}
          {feed.map(item => (
            <div className="feed-item" key={item.id}>
              <span className="feed-time">{item.time}</span>
              <span className="feed-event">{item.event.replace(/_/g, ' ')}</span>
              <span className="feed-text">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default Analytics;
