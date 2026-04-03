/**
 * ReportsInbox — Shared component for asha_worker + admin
 * Displays all community reports with full moderation controls:
 *  - Update status (pending / reviewed / resolved / fake)
 *  - Update risk level (low / medium / high / critical)
 *  - Update urgency
 *  - Add moderator note
 *  - Delete fake/invalid reports
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronDown, ChevronUp, Eye, CheckCircle, Trash2,
  AlertTriangle, MapPin, Phone, Mail, User, RefreshCw,
  Edit3, Flag, Save, X
} from 'lucide-react';
import api from '../services/api';

const URGENCY_COLOR = {
  'High — immediate risk to life or wildlife': '#ff1744',
  'Medium — situation developing':             '#ff9100',
  'Low — no immediate danger':                 '#29b6f6',
};
const RISK_COLOR  = { critical:'#ff1744', high:'#ff9100', medium:'#facc15', low:'#4CAF50' };
const STATUS_STYLE = {
  pending:  { bg:'#facc1520', color:'#facc15' },
  reviewed: { bg:'#29b6f620', color:'#29b6f6' },
  resolved: { bg:'#4CAF5020', color:'#4CAF50' },
  fake:     { bg:'#e53e3e20', color:'#fc8181' },
};
const TYPE_LABEL = {
  wildlife:'🐘 Wildlife', deforestation:'🌳 Logging',
  fire:'🔥 Fire', poaching:'🎯 Poaching', other:'📋 Other',
};

function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

const ReportsInbox = ({ onCountChange }) => {
  const [reports,  setReports]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [msg,      setMsg]      = useState('');
  const [filter,   setFilter]   = useState('all');
  const [expanded, setExpanded] = useState(null);
  const [editing,  setEditing]  = useState(null);   // id being edited inline
  const [editForm, setEditForm] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getReports({ limit: 100 });
      const data = res.reports || [];
      setReports(data);
      onCountChange?.(data.filter(r => r.status === 'pending').length);
    } catch (e) { setMsg('Failed to load: ' + e.message); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredReports = filter === 'all' ? reports : reports.filter(r => r.status === filter);

  /* ── Moderation actions ── */
  const updateStatus = async (id, status) => {
    try {
      await api.updateReport(id, { status, isFake: status === 'fake' });
      setMsg(`✅ Report marked as ${status}`);
      await load();
    } catch (e) { setMsg('❌ ' + e.message); }
  };

  const deleteReport = async (id, refId) => {
    if (!window.confirm(`Delete report ${refId}? This cannot be undone.`)) return;
    try {
      await api.deleteReport(id);
      setMsg(`🗑️ Report ${refId} deleted.`);
      await load();
    } catch (e) { setMsg('❌ ' + e.message); }
  };

  const startEdit = (r) => {
    setEditing(r._id);
    setEditForm({
      riskLevel:     r.riskLevel || 'medium',
      urgency:       r.urgency   || '',
      moderatorNote: r.moderatorNote || '',
    });
  };

  const saveEdit = async (id) => {
    try {
      await api.updateReport(id, editForm);
      setMsg('✅ Report updated.');
      setEditing(null);
      await load();
    } catch (e) { setMsg('❌ ' + e.message); }
  };

  const pendingCount = reports.filter(r => r.status === 'pending').length;

  return (
    <div className="panel">
      {/* Header */}
      <div className="panel-hdr" style={{ flexWrap:'wrap', gap:10 }}>
        <h3 style={{ display:'flex', alignItems:'center', gap:8 }}>
          📋 Reports Inbox
          {pendingCount > 0 && (
            <span style={{ background:'#ff174430', color:'#ff5252',
              fontSize:'0.7rem', fontWeight:800, padding:'2px 8px', borderRadius:20 }}>
              {pendingCount} pending
            </span>
          )}
        </h3>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
          {['all','pending','reviewed','resolved','fake'].map(s => (
            <button key={s}
              onClick={() => setFilter(s)}
              style={{
                padding:'4px 12px', borderRadius:20, fontSize:'0.72rem', fontWeight:700,
                border: filter===s ? 'none' : '1px solid rgba(255,255,255,0.1)',
                background: filter===s ? (STATUS_STYLE[s]?.bg || '#ffffff20') : 'transparent',
                color:      filter===s ? (STATUS_STYLE[s]?.color || '#fff') : '#666',
                cursor:'pointer',
              }}>
              {s}
            </button>
          ))}
          <button className="icon-btn" onClick={load} disabled={loading} style={{ marginLeft:4 }}>
            <RefreshCw size={13} className={loading ? 'spin-anim':''}/> Refresh
          </button>
        </div>
      </div>

      {msg && (
        <div style={{ margin:'0 0 12px', padding:'8px 14px', borderRadius:8,
          background: msg.startsWith('❌') ? '#ff174415':'#4CAF5015',
          color: msg.startsWith('❌') ? '#ff5252':'#81c784', fontSize:'0.82rem', display:'flex', justifyContent:'space-between' }}>
          {msg}
          <button onClick={() => setMsg('')} style={{ background:'none', border:'none', cursor:'pointer', color:'inherit' }}>✕</button>
        </div>
      )}

      {loading ? (
        <div style={{ padding:40, textAlign:'center', color:'#555' }}>Loading reports…</div>
      ) : filteredReports.length === 0 ? (
        <div style={{ padding:40, textAlign:'center', color:'#555' }}>
          No {filter !== 'all' ? filter : ''} reports found.
          {filter === 'all' && <> Community members can submit via <Link to="/report" style={{ color:'#4CAF50' }}>Report page</Link>.</>}
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {filteredReports.map(r => {
            const urgColor = URGENCY_COLOR[r.urgency] || '#888';
            const isOpen   = expanded === r._id;
            const isEditing = editing === r._id;
            const ss = STATUS_STYLE[r.status] || { bg:'#88888820', color:'#888' };
            const rc = RISK_COLOR[r.riskLevel || 'medium'];

            return (
              <div key={r._id} style={{
                border:'1px solid rgba(255,255,255,0.06)',
                borderLeft:`4px solid ${urgColor}`,
                borderRadius:12, overflow:'hidden',
                background: r.isFake ? 'rgba(229,62,62,0.04)' : 'rgba(255,255,255,0.02)',
              }}>
                {/* Row header — click to expand */}
                <div style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 14px', cursor:'pointer' }}
                  onClick={() => setExpanded(isOpen ? null : r._id)}>

                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', marginBottom:3 }}>
                      <span style={{ fontWeight:800, fontSize:'0.82rem', color:'#c8e6c9' }}>
                        {TYPE_LABEL[r.type] || r.type}
                      </span>
                      {/* Status badge */}
                      <span style={{ fontSize:'0.65rem', padding:'2px 8px', borderRadius:20, fontWeight:700,
                        background: ss.bg, color: ss.color }}>
                        ● {r.status}
                      </span>
                      {/* Risk badge */}
                      <span style={{ fontSize:'0.65rem', padding:'2px 8px', borderRadius:20, fontWeight:700,
                        background: rc + '25', color: rc, border:`1px solid ${rc}40` }}>
                        ⚡ {r.riskLevel || 'medium'} risk
                      </span>
                      {r.isFake && (
                        <span style={{ fontSize:'0.65rem', padding:'2px 8px', borderRadius:20, fontWeight:800,
                          background:'#e53e3e30', color:'#fc8181' }}>🚫 FAKE</span>
                      )}
                      <span style={{ fontSize:'0.62rem', color:'#444', marginLeft:'auto', whiteSpace:'nowrap' }}>
                        #{r.refId} · {timeAgo(r.createdAt)}
                      </span>
                    </div>
                    <div style={{ fontSize:'0.77rem', color:'#777', display:'flex', gap:10, flexWrap:'wrap' }}>
                      <span><MapPin size={11}/> {r.location}, {r.region}</span>
                      {r.anonymous ? <span>👤 Anonymous</span> : r.contactName && <span><User size={11}/> {r.contactName}</span>}
                    </div>
                  </div>

                  {isOpen ? <ChevronUp size={15} color="#555"/> : <ChevronDown size={15} color="#555"/>}
                </div>

                {/* Expanded section */}
                {isOpen && (
                  <div style={{ padding:'0 14px 14px', borderTop:'1px solid rgba(255,255,255,0.05)' }}>

                    {/* Description */}
                    <p style={{ fontSize:'0.83rem', color:'#aaa', lineHeight:1.7, margin:'12px 0 10px' }}>
                      {r.description}
                    </p>

                    {/* Contact info */}
                    {!r.anonymous && (r.contactPhone || r.contactEmail) && (
                      <div style={{ display:'flex', gap:14, marginBottom:10, fontSize:'0.77rem', color:'#777' }}>
                        {r.contactPhone && <span><Phone size={12}/> {r.contactPhone}</span>}
                        {r.contactEmail && <span><Mail size={12}/> {r.contactEmail}</span>}
                      </div>
                    )}

                    {/* Submitted by */}
                    {r.submittedBy && (
                      <div style={{ fontSize:'0.73rem', color:'#555', marginBottom:10 }}>
                        👤 Submitted by: <strong style={{ color:'#888' }}>{r.submittedBy.name || 'User'}</strong>
                        {r.submittedBy.role && ` (${r.submittedBy.role})`}
                      </div>
                    )}

                    {/* Files */}
                    {r.files?.length > 0 && (
                      <div style={{ fontSize:'0.75rem', color:'#666', marginBottom:10 }}>
                        📎 {r.files.length} file(s): {r.files.join(', ')}
                      </div>
                    )}

                    {/* Moderator note (read-only) */}
                    {r.moderatorNote && !isEditing && (
                      <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:8, padding:'8px 12px',
                        fontSize:'0.77rem', color:'#888', marginBottom:10, borderLeft:'3px solid #555' }}>
                        📝 Moderator Note: {r.moderatorNote}
                      </div>
                    )}

                    {/* ── EDIT FORM ── */}
                    {isEditing ? (
                      <div style={{ background:'rgba(255,255,255,0.03)', borderRadius:10,
                        padding:'12px', marginBottom:10, display:'flex', flexDirection:'column', gap:10 }}>
                        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                          {/* Risk Level */}
                          <div style={{ flex:1, minWidth:140 }}>
                            <label style={{ fontSize:'0.72rem', color:'#888', display:'block', marginBottom:4 }}>⚡ Risk Level</label>
                            <select value={editForm.riskLevel}
                              onChange={e => setEditForm(f => ({...f, riskLevel: e.target.value}))}
                              style={{ width:'100%', background:'#1a1a2e', color:'#e0e0e0',
                                border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'7px 10px', fontSize:'0.82rem' }}>
                              {['low','medium','high','critical'].map(l => <option key={l}>{l}</option>)}
                            </select>
                          </div>
                          {/* Urgency */}
                          <div style={{ flex:2, minWidth:200 }}>
                            <label style={{ fontSize:'0.72rem', color:'#888', display:'block', marginBottom:4 }}>🚨 Urgency</label>
                            <select value={editForm.urgency}
                              onChange={e => setEditForm(f => ({...f, urgency: e.target.value}))}
                              style={{ width:'100%', background:'#1a1a2e', color:'#e0e0e0',
                                border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'7px 10px', fontSize:'0.82rem' }}>
                              <option value="Low — no immediate danger">Low — no immediate danger</option>
                              <option value="Medium — situation developing">Medium — situation developing</option>
                              <option value="High — immediate risk to life or wildlife">High — immediate risk to life or wildlife</option>
                            </select>
                          </div>
                        </div>
                        {/* Moderator Note */}
                        <div>
                          <label style={{ fontSize:'0.72rem', color:'#888', display:'block', marginBottom:4 }}>📝 Moderator Note</label>
                          <textarea
                            value={editForm.moderatorNote}
                            onChange={e => setEditForm(f => ({...f, moderatorNote: e.target.value}))}
                            rows={2}
                            placeholder="Add a note explaining your review decision…"
                            style={{ width:'100%', background:'#1a1a2e', color:'#e0e0e0',
                              border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'8px 12px',
                              fontSize:'0.82rem', resize:'vertical', boxSizing:'border-box' }}/>
                        </div>
                        <div style={{ display:'flex', gap:8 }}>
                          <button onClick={() => saveEdit(r._id)} style={{
                            background:'#4CAF5020', color:'#4CAF50', border:'1px solid #4CAF5040',
                            padding:'6px 16px', borderRadius:8, fontSize:'0.78rem', fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
                            <Save size={13}/> Save Changes
                          </button>
                          <button onClick={() => setEditing(null)} style={{
                            background:'rgba(255,255,255,0.05)', color:'#888', border:'1px solid rgba(255,255,255,0.1)',
                            padding:'6px 16px', borderRadius:8, fontSize:'0.78rem', cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
                            <X size={13}/> Cancel
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {/* ── ACTION BUTTONS ── */}
                    {!isEditing && (
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:6 }}>
                        {/* Edit */}
                        <button onClick={() => startEdit(r)} style={{
                          background:'#8b5cf620', color:'#a78bfa', border:'1px solid #8b5cf640',
                          padding:'6px 14px', borderRadius:8, fontSize:'0.76rem', fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
                          <Edit3 size={12}/> Edit Details
                        </button>

                        {/* Status changes */}
                        {r.status !== 'reviewed' && r.status !== 'fake' && (
                          <button onClick={() => updateStatus(r._id, 'reviewed')} style={{
                            background:'#29b6f620', color:'#29b6f6', border:'1px solid #29b6f640',
                            padding:'6px 14px', borderRadius:8, fontSize:'0.76rem', fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
                            <Eye size={12}/> Mark Reviewed
                          </button>
                        )}
                        {r.status !== 'resolved' && r.status !== 'fake' && (
                          <button onClick={() => updateStatus(r._id, 'resolved')} style={{
                            background:'#4CAF5020', color:'#4CAF50', border:'1px solid #4CAF5040',
                            padding:'6px 14px', borderRadius:8, fontSize:'0.76rem', fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
                            <CheckCircle size={12}/> Mark Resolved
                          </button>
                        )}
                        {r.status !== 'fake' && (
                          <button onClick={() => updateStatus(r._id, 'fake')} style={{
                            background:'#e53e3e20', color:'#fc8181', border:'1px solid #e53e3e40',
                            padding:'6px 14px', borderRadius:8, fontSize:'0.76rem', fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
                            <Flag size={12}/> Mark Fake
                          </button>
                        )}
                        {r.status !== 'pending' && (
                          <button onClick={() => updateStatus(r._id, 'pending')} style={{
                            background:'rgba(255,255,255,0.05)', color:'#888', border:'1px solid rgba(255,255,255,0.1)',
                            padding:'6px 14px', borderRadius:8, fontSize:'0.76rem', cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
                            ↩ Reset Pending
                          </button>
                        )}

                        {/* Delete (rightmost, always dangerous) */}
                        <button onClick={() => deleteReport(r._id, r.refId)} style={{
                          background:'#ff174415', color:'#ff5252', border:'1px solid #ff174430',
                          padding:'6px 14px', borderRadius:8, fontSize:'0.76rem', fontWeight:700, cursor:'pointer',
                          display:'flex', alignItems:'center', gap:5, marginLeft:'auto' }}>
                          <Trash2 size={12}/> Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ReportsInbox;
