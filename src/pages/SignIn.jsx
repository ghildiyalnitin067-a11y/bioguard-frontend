import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, Eye, EyeOff, Leaf, Mail, Lock } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const hasGoogleAuth = GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== 'YOUR_GOOGLE_CLIENT_ID_HERE';

const SignIn = () => {
  const { signIn, signInWithGoogle } = useAuth();
  const navigate   = useNavigate();
  const [form, setForm]       = useState({ email: '', password: '' });
  const [showPw, setShowPw]   = useState(false);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await signIn(form.email, form.password);
    setLoading(false);
    if (res.ok) navigate('/dashboard');
    else setError(res.error);
  };

  const handleGoogle = async (credentialResponse) => {
    setError('');
    setLoading(true);
    const res = await signInWithGoogle(credentialResponse.credential);
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
          <h1>Protect North East India's Wilderness</h1>
          <p>
            Real-time biodiversity monitoring across Assam, Arunachal Pradesh, Meghalaya,
            Nagaland, Manipur, Mizoram, Tripura and Sikkim — together.
          </p>
          <div className="auth-quote">
            <blockquote>"The forest is not a resource for us, it is a relative."</blockquote>
            <cite>— Indigenous Wisdom, NE India</cite>
          </div>
          <div className="auth-stats-row">
            {[['82', 'Protected Areas'],['65%', 'Forest Cover'],['400+', 'Active Rangers']].map(([v,l]) => (
              <div className="auth-stat" key={l}>
                <span className="as-val">{v}</span>
                <span className="as-lbl">{l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="auth-right">
        <div className="auth-form-card">
          <div className="auth-form-header">
            <h2>Welcome back</h2>
            <p>Sign in to your BioGuard account</p>
          </div>

          {/* Google Sign-In button — only shown when Client ID is configured */}
          {hasGoogleAuth && (
            <>
              <div className="google-btn-wrap">
                <GoogleLogin
                  onSuccess={handleGoogle}
                  onError={() => setError('Google sign-in failed. Please try again.')}
                  theme="outline"
                  shape="rectangular"
                  size="large"
                  width="100%"
                  text="signin_with"
                />
              </div>
              <div className="auth-divider"><span>or sign in with email</span></div>
            </>
          )}

          <form onSubmit={submit} className="auth-form">
            {error && <div className="auth-error">{error}</div>}

            <div className="auth-field">
              <label>Email Address</label>
              <div className="auth-input-wrap">
                <Mail size={16}/>
                <input
                  name="email" type="email" required
                  placeholder="ranger@bioguard.in"
                  value={form.email} onChange={handle}
                />
              </div>
            </div>

            <div className="auth-field">
              <label>Password</label>
              <div className="auth-input-wrap">
                <Lock size={16}/>
                <input
                  name="password" type={showPw ? 'text' : 'password'} required
                  placeholder="••••••••"
                  value={form.password} onChange={handle}
                />
                <button type="button" className="pw-toggle" onClick={() => setShowPw(p => !p)}>
                  {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
            </div>

            <button type="submit" className={`auth-btn ${loading ? 'loading' : ''}`} disabled={loading}>
              {loading ? <span className="spin"/> : <LogIn size={17}/>}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div className="auth-demo-hint">
            <strong>Demo accounts:</strong> admin@bioguard.in / Admin@1234 &nbsp;|&nbsp; ranger@bioguard.in / Ranger@1234
          </div>

          <p className="auth-switch">
            Don't have an account? <Link to="/signup">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
