import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, ShieldCheck, AlertTriangle, Activity,
  Trash2, CheckCircle, UserX, UserCheck,
  RefreshCw, Crown, FileText, Clock, MapPin,
  Eye, Filter, ChevronDown, ChevronUp, Phone, Mail, User
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import ReportsInbox from '../components/ReportsInbox';
import './RoleDashboard.css';

/* ── helpers ── */
const URGENCY_COLOR = {
  'High — immediate risk to life or wildlife': '#ff1744',
  'Medium — situation developing':             '#ff9100',
  'Low — no immediate danger':                 '#29b6f6',
};
const TYPE_LABEL = {
  wildlife: '🐘 Wildlife Conflict', deforestation: '🌳 Illegal Logging',
  fire: '🔥 Forest Fire', poaching: '🎯 Poaching', other: '📋 Other',
};
function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

/* ── Inline Alerts Manager for the Admin Dashboard Alerts tab ── */
const BASE_URL = (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_API_URL : '') || 'http://localhost:4000';
const getToken = () => localStorage.getItem('bioguard-jwt') || '';
const SEV_COLORS = { critical: '#ff1744', warning: '#ff9100', info: '#29b6f6' };

const AlertsManager = () => {
  const [alerts,  setAlerts]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg,     setMsg]     = useState('');
  const [filter,  setFilter]  = useState('all');

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/alerts?limit=100`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      setAlerts(json.alerts || []);
    } catch (e) { setMsg('Failed to load alerts: ' + e.message); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resolve = async (id) => {
    try {
      const res = await fetch(`${BASE_URL}/api/alerts/${id}/resolve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setMsg('✅ Alert resolved.'); load();
    } catch (e) { setMsg('❌ ' + e.message); }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this alert permanently?')) return;
    try {
      const res = await fetch(`${BASE_URL}/api/alerts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setMsg('🗑️ Alert deleted.'); load();
    } catch (e) { setMsg('❌ ' + e.message); }
  };

  const shown = filter === 'all' ? alerts : alerts.filter(a => a.status === filter);

  return (
    <div className="panel">
      <div className="panel-hdr" style={{ flexWrap: 'wrap', gap: 8 }}>
        <h3><AlertTriangle size={15}/> Alert Management</h3>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {['all', 'active', 'resolved'].map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{
              padding: '4px 12px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
              background: filter === s ? 'rgba(76,175,80,0.2)' : 'transparent',
              color: filter === s ? '#4CAF50' : '#666',
              border: filter === s ? '1px solid rgba(76,175,80,0.4)' : '1px solid rgba(255,255,255,0.08)',
            }}>{s}</button>
          ))}
          <button className="icon-btn" onClick={load} disabled={loading} style={{ marginLeft: 4 }}>
            <RefreshCw size={13} className={loading ? 'spin-anim' : ''}/> Refresh
          </button>
          <Link to="/alerts" className="panel-link" style={{ marginLeft: 8 }}>Full page →</Link>
        </div>
      </div>

      {msg && (
        <div style={{ margin: '0 0 12px', padding: '8px 14px', borderRadius: 8,
          background: msg.startsWith('❌') ? '#ff174415' : '#4CAF5015',
          color: msg.startsWith('❌') ? '#ff5252' : '#81c784', fontSize: '0.82rem',
          display: 'flex', justifyContent: 'space-between' }}>
          {msg}<button onClick={() => setMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#555' }}>Loading alerts…</div>
      ) : shown.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#555' }}>No {filter !== 'all' ? filter : ''} alerts found.</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr>
              <th>Type</th><th>Severity</th><th>Location</th><th>State</th><th>Status</th><th>Created</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {shown.map(a => (
                <tr key={a._id}>
                  <td style={{ fontWeight: 700 }}>{a.type}</td>
                  <td>
                    <span style={{ color: SEV_COLORS[a.severity], fontWeight: 700, fontSize: '0.8rem',
                      background: (SEV_COLORS[a.severity] || '#888') + '18', padding: '2px 8px', borderRadius: 20 }}>
                      {a.severity}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.82rem' }}>{a.location}</td>
                  <td style={{ fontSize: '0.8rem', color: '#666' }}>{a.state}</td>
                  <td>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700,
                      color: a.status === 'active' ? '#ff5252' : a.status === 'resolved' ? '#4CAF50' : '#888' }}>
                      ● {a.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.78rem', color: '#666' }}>{timeAgo(a.createdAt)}</td>
                  <td className="action-cell">
                    {a.status !== 'resolved' && (
                      <button className="tbl-btn" title="Resolve" onClick={() => resolve(a._id)}>
                        <CheckCircle size={14}/>
                      </button>
                    )}
                    <button className="tbl-btn danger" title="Delete" onClick={() => remove(a._id)}>
                      <Trash2 size={14}/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats,   setStats]   = useState(null);
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState('overview');
  const [msg,     setMsg]     = useState('');
  const [pendingCount, setPendingCount] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const [s, u] = await Promise.all([
        api.adminStats(),
        api.adminUsers(),
      ]);
      setStats(s.stats);
      setUsers(u.users);
    } catch (e) { setMsg(e.message); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const changeRole = async (id, role) => {
    await api.adminChangeRole(id, role);
    setMsg(`Role updated to ${role}`);
    load();
  };

  const toggleUser = async (id) => {
    await api.adminToggleUser(id);
    load();
  };

  const deleteUser = async (id) => {
    if (!window.confirm('Delete this user permanently?')) return;
    await api.adminDeleteUser(id);
    setMsg('User deleted');
    load();
  };

  return (
    <div className="page-root role-page">
      {/* Header */}
      <div className="page-header-bar">
        <div>
          <div className="role-badge admin-badge"><Crown size={14}/> Admin Dashboard</div>
          <h1 className="page-title">System Control Panel</h1>
          <p className="page-sub">Full access — BioGuard NE India Platform</p>
        </div>
        <button className="icon-btn" onClick={load}><RefreshCw size={15}/> Refresh</button>
      </div>

      {msg && <div className="admin-msg">{msg} <button onClick={() => setMsg('')}>✕</button></div>}

      {/* Tabs */}
      <div className="role-tabs">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'reports',  label: `Reports${pendingCount > 0 ? ` (${pendingCount} pending)` : ''}` },
          { key: 'users',    label: 'Users' },
          { key: 'alerts',   label: 'Alerts' },
        ].map(t => (
          <button key={t.key} className={`rtab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <div className="role-loading"><div className="role-spinner"/></div> : (

        /* ══════════ OVERVIEW ══════════ */
        tab === 'overview' && stats && (
          <div className="admin-overview">
            <div className="admin-stat-grid">
              {[
                { icon: Users,         label: 'Total Users',      value: stats.totalUsers,      color: '#16a34a' },
                { icon: FileText,      label: 'Total Reports',    value: stats.totalReports,    color: '#29b6f6' },
                { icon: AlertTriangle, label: 'Active Alerts',    value: stats.activeAlerts,    color: '#ff1744' },
                { icon: CheckCircle,   label: 'Resolved Alerts',  value: stats.resolvedAlerts,  color: '#22c55e' },
                { icon: Activity,      label: 'Ongoing Incidents',value: stats.ongoingIncidents,color: '#f97316' },
                { icon: Clock,         label: 'Pending Reports',  value: stats.pendingReports,  color: '#facc15' },
              ].map(s => (
                <div className="admin-stat-card" key={s.label} style={{ '--ac': s.color }}>
                  <s.icon size={24} style={{ color: 'var(--ac)' }}/>
                  <div className="asc-val">{s.value}</div>
                  <div className="asc-lbl">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="panel">
              <div className="panel-hdr"><h3><Users size={15}/> Users by Role</h3></div>
              <div className="role-bar-group">
                {[['user','Community','#16a34a'],['asha_worker','Field Workers','#f97316'],['admin','Admins','#8b5cf6']].map(([r,l,c]) => (
                  <div className="role-bar-item" key={r}>
                    <span style={{ color: c, fontWeight: 700 }}>{l}</span>
                    <div className="rbi-bar">
                      <div className="rbi-fill" style={{ width: `${((stats.usersByRole?.[r]||0)/(stats.totalUsers||1))*100}%`, background: c }}/>
                    </div>
                    <span className="rbi-count">{stats.usersByRole?.[r] || 0}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      )}

      {/* ══════════ REPORTS INBOX (shared component) ══════════ */}
      {!loading && tab === 'reports' && (
        <ReportsInbox onCountChange={setPendingCount} />
      )}

      {/* ══════════ USERS ══════════ */}
      {!loading && tab === 'users' && (
        <div className="panel">
          <div className="panel-hdr"><h3><Users size={15}/> Registered Users</h3></div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr>
                <th>Name</th><th>Email</th><th>Role</th><th>State</th><th>Status</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id} className={!u.isActive ? 'inactive-row' : ''}>
                    <td><strong>{u.name}</strong></td>
                    <td>{u.email}</td>
                    <td>
                      <select className="role-select" value={u.role}
                        disabled={u._id === user?.id}
                        onChange={e => changeRole(u._id, e.target.value)}>
                        <option value="user">user</option>
                        <option value="asha_worker">asha_worker</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td>{u.state}</td>
                    <td><span className={`status-chip ${u.isActive ? 'active' : 'inactive'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td className="action-cell">
                      <button className="tbl-btn" onClick={() => toggleUser(u._id)} title={u.isActive ? 'Deactivate' : 'Activate'}>
                        {u.isActive ? <UserX size={14}/> : <UserCheck size={14}/>}
                      </button>
                      {u._id !== user?.id && (
                        <button className="tbl-btn danger" onClick={() => deleteUser(u._id)} title="Delete">
                          <Trash2 size={14}/>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════ ALERTS ══════════ */}
      {!loading && tab === 'alerts' && (
        <AlertsManager />
      )}
    </div>
  );
};

export default AdminDashboard;
