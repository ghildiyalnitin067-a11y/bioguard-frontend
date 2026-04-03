import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Eye, EyeOff, Leaf, Mail, Lock, User, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const NE_STATES = ['Assam','Arunachal Pradesh','Meghalaya','Nagaland','Manipur','Mizoram','Tripura','Sikkim'];
const ROLES     = ['Community Member','Field Researcher','Forest Ranger','NGO Worker','Government Official','Journalist','Student'];

const SignUp = () => {
  const { signUp }   = useAuth();
  const navigate     = useNavigate();
  const [form, setForm]       = useState({ name:'', email:'', password:'', role:'Community Member', state:'Assam' });
  const [showPw, setShowPw]   = useState(false);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    const res = await signUp(form);
    setLoading(false);
    if (res.ok) navigate('/dashboard');
    else setError(res.error);
  };

  return (
    <div className="auth-page">
      {/* Left panel */}
      <div className="auth-left">
        <div className="auth-left-inner">
          <div className="auth-brand">
            <Leaf size={36} className="auth-brand-icon"/>
            <span>BioGuard</span>
          </div>
          <h1>Join the Conservation Network</h1>
          <p>
            Become part of a community protecting the rich biodiversity of North East India —
            8 states, 82 protected areas, and thousands of species depend on us.
          </p>
          <div className="auth-feature-list">
            {[
              '🗺️ Live threat maps across NE India',
              '🚨 Real-time deforestation & wildlife alerts',
              '📊 Analytics and conservation insights',
              '📝 Community incident reporting',
            ].map(f => <div key={f} className="af-item">{f}</div>)}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="auth-right">
        <div className="auth-form-card">
          <div className="auth-form-header">
            <h2>Create your account</h2>
            <p>Free to join — for rangers, researchers & citizens</p>
          </div>

          <form onSubmit={submit} className="auth-form">
            {error && <div className="auth-error">{error}</div>}

            <div className="auth-field">
              <label>Full Name</label>
              <div className="auth-input-wrap">
                <User size={16}/>
                <input name="name" type="text" required placeholder="Priya Sharma"
                  value={form.name} onChange={handle}/>
              </div>
            </div>

            <div className="auth-field">
              <label>Email Address</label>
              <div className="auth-input-wrap">
                <Mail size={16}/>
                <input name="email" type="email" required placeholder="you@example.com"
                  value={form.email} onChange={handle}/>
              </div>
            </div>

            <div className="auth-field">
              <label>Password</label>
              <div className="auth-input-wrap">
                <Lock size={16}/>
                <input name="password" type={showPw ? 'text' : 'password'} required placeholder="Min 6 characters"
                  value={form.password} onChange={handle}/>
                <button type="button" className="pw-toggle" onClick={() => setShowPw(p => !p)}>
                  {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
            </div>

            <div className="auth-row-2">
              <div className="auth-field">
                <label>Role</label>
                <select name="role" value={form.role} onChange={handle} className="auth-select">
                  {ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="auth-field">
                <label><MapPin size={13}/> State</label>
                <select name="state" value={form.state} onChange={handle} className="auth-select">
                  {NE_STATES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <button type="submit" className={`auth-btn ${loading ? 'loading' : ''}`} disabled={loading}>
              {loading ? <span className="spin"/> : <UserPlus size={17}/>}
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account? <Link to="/signin">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
