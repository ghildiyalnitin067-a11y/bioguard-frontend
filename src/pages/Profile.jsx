import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Mail, MapPin, Shield, Edit3, Save, X,
  FileText, Bell, LogOut, CheckCircle, Activity, Clock
} from 'lucide-react';
import { MapContainer, TileLayer, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import './Profile.css';

const ACT_ICON = { alert: Bell, report: FileText, join: CheckCircle, login: Activity };
const ACT_COLOR = { alert: '#fb8c00', report: '#4CAF50', join: '#1976d2', login: '#ab47bc' };

const Profile = () => {
  const { user, signOut, updateProfile } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: user?.name || '', bio: user?.bio || '', state: user?.state || '' });

  if (!user) {
    navigate('/signin');
    return null;
  }

  const saveEdit = () => { updateProfile({ name: form.name, bio: form.bio, state: form.state }); setEditing(false); };
  const cancelEdit = () => { setForm({ name: user.name, bio: user.bio, state: user.state }); setEditing(false); };

  const handleSignOut = () => { signOut(); navigate('/'); };

  return (
    <div className="page-root profile-page">
      {/* Banner */}
      <div className="profile-banner">
        <div className="pb-overlay"/>
        <div className="pb-content">
          <div className="pb-avatar-wrap">
            <img
              src={user.avatar}
              alt={user.name}
              className="pb-avatar"
              onError={e => { e.target.src = `https://api.dicebear.com/8.x/adventurer/svg?seed=${user.email}`; }}
            />
            <div className="pb-online"/>
          </div>
          <div className="pb-info">
            <div className="pb-name-row">
              <h1 className="pb-name">{user.name}</h1>
              {user.joinedVia === 'google' && (
                <span className="pb-google-badge">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Google Account
                </span>
              )}
            </div>
            <div className="pb-meta">
              <span><Shield size={13}/> {user.role}</span>
              <span><MapPin size={13}/> {user.state}</span>
              <span><Clock size={13}/> Joined {user.joined}</span>
            </div>
          </div>
          <div className="pb-actions">
            <button className="pb-btn" onClick={() => setEditing(e => !e)}>
              <Edit3 size={15}/> {editing ? 'Cancel' : 'Edit Profile'}
            </button>
            <button className="pb-btn danger" onClick={handleSignOut}>
              <LogOut size={15}/> Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="profile-body">

        {/* Left: Stats + Bio + Edit */}
        <div className="profile-left">

          {/* Stats */}
          <div className="pcard">
            <h3><Activity size={16}/> Your Activity</h3>
            <div className="pstat-grid">
              {[
                { val: user.reports,         lbl: 'Reports Filed',    color: '#4CAF50' },
                { val: user.alertsReceived,  lbl: 'Alerts Received',  color: '#fb8c00' },
                { val: 8,                    lbl: 'Conflicts Logged',  color: '#e53935' },
                { val: 3,                    lbl: 'Badges Earned',     color: '#ab47bc' },
              ].map(s => (
                <div className="pstat" key={s.lbl} style={{ '--c': s.color }}>
                  <div className="pstat-val">{s.val}</div>
                  <div className="pstat-lbl">{s.lbl}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Bio / edit form */}
          <div className="pcard">
            {!editing ? (
              <>
                <h3><User size={16}/> About</h3>
                <p className="profile-bio">{user.bio || 'No bio yet — click Edit Profile to add one.'}</p>
                <div className="profile-detail-row">
                  <span className="pdr-label"><Mail size={13}/> Email</span>
                  <span className="pdr-val">{user.email}</span>
                </div>
                <div className="profile-detail-row">
                  <span className="pdr-label"><Shield size={13}/> Role</span>
                  <span className="pdr-val">{user.role}</span>
                </div>
                <div className="profile-detail-row">
                  <span className="pdr-label"><MapPin size={13}/> State</span>
                  <span className="pdr-val">{user.state}</span>
                </div>
                <div className="profile-detail-row">
                  <span className="pdr-label">🔐 Signed in via</span>
                  <span className="pdr-val" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    {user.joinedVia === 'google' ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#4285F4', fontWeight: 600 }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        Google
                      </span>
                    ) : '✉️ Email & Password'}
                  </span>
                </div>
              </>
            ) : (
              <>
                <h3><Edit3 size={16}/> Edit Profile</h3>
                <div className="edit-form">
                  <label>Display Name</label>
                  <input className="edit-input" value={form.name}
                    onChange={e => setForm(f => ({...f, name: e.target.value}))}/>

                  <label>Bio</label>
                  <textarea className="edit-input" rows={3} placeholder="Tell the community about yourself…"
                    value={form.bio}
                    onChange={e => setForm(f => ({...f, bio: e.target.value}))}/>

                  <label>State / Region</label>
                  <select className="edit-input" value={form.state}
                    onChange={e => setForm(f => ({...f, state: e.target.value}))}>
                    {['Assam','Arunachal Pradesh','Meghalaya','Nagaland','Manipur','Mizoram','Tripura','Sikkim','Uttarakhand','Other'].map(s => <option key={s}>{s}</option>)}
                  </select>

                  <div style={{ fontSize: '0.78rem', color: '#666', marginTop: 4, padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, borderLeft: '3px solid #555' }}>
                    🔐 Role: <strong style={{ color: '#aaa' }}>{user.role}</strong> — Roles can only be changed by an admin.
                  </div>

                  <div className="edit-actions">
                    <button className="edit-btn save" onClick={saveEdit}><Save size={15}/> Save</button>
                    <button className="edit-btn cancel" onClick={cancelEdit}><X size={15}/> Cancel</button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Preferences */}
          <div className="pcard">
            <h3>⚙️ Preferences</h3>
            <div className="pref-row">
              <span>Appearance</span>
              <button className="theme-pill" onClick={toggle}>
                {theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
              </button>
            </div>
            <div className="pref-row">
              <span>Email notifications</span>
              <div className="toggle-wrap">
                <input type="checkbox" id="email-notif" defaultChecked/>
                <label htmlFor="email-notif" className="toggle-label"/>
              </div>
            </div>
            <div className="pref-row">
              <span>Push alerts</span>
              <div className="toggle-wrap">
                <input type="checkbox" id="push-notif" defaultChecked/>
                <label htmlFor="push-notif" className="toggle-label"/>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Recent activity */}
        <div className="profile-right">
          <div className="pcard full">
            <h3><Clock size={16}/> Recent Activity</h3>
            <div className="act-timeline">
              {(user.recentActivity || []).map((a, i) => {
                const Icon = ACT_ICON[a.type] || Activity;
                return (
                  <div className="atl-item" key={i}>
                    <div className="atl-icon" style={{ background: ACT_COLOR[a.type] + '22', color: ACT_COLOR[a.type] }}>
                      <Icon size={16}/>
                    </div>
                    <div className="atl-body">
                      <div className="atl-text">{a.text}</div>
                      <div className="atl-time">{a.time}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Coverage map — real Leaflet */}
          <div className="pcard full">
            <h3>📍 Coverage Area — {user.state}</h3>
            <div className="coverage-map" style={{ height: 220, borderRadius: 12, overflow: 'hidden' }}>
              <MapContainer
                center={[26.2, 93.0]}
                zoom={5}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
                zoomControl={false}
                attributionControl={false}
              >
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                <Circle
                  center={[26.2, 93.0]}
                  radius={300000}
                  pathOptions={{ color: '#4CAF50', fillColor: '#4CAF50', fillOpacity: 0.12, weight: 1.5 }}
                />
              </MapContainer>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#555', marginTop: 8 }}>Your sightings and reports contribute to NE India's biodiversity dataset.</p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Profile;
