import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert, Map, Users, ChevronDown, Activity,
  TreePine, AlertTriangle, Globe, ArrowRight, Eye,
  TrendingUp, Zap, BookOpen, BarChart2, CheckCircle,
  MessageSquare, Star
} from 'lucide-react';
import './Home.css';

/* ─── Animated counter hook ─── */
function useCounter(end, duration = 2000, startTrigger = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!startTrigger) return;
    let startTime = null;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [end, duration, startTrigger]);
  return count;
}

/* ─── Intersection observer hook ─── */
function useInView(threshold = 0.2) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);
  return [ref, inView];
}

/* ─── Stat card ─── */
const StatCard = ({ icon: Icon, end, suffix, label, color }) => {
  const [ref, inView] = useInView();
  const count = useCounter(end, 2200, inView);
  return (
    <div className="stat-card" ref={ref} style={{ '--accent': color }}>
      <div className="stat-icon-wrap"><Icon size={28} /></div>
      <div className="stat-number">{count.toLocaleString()}{suffix}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
};

/* ─── Feature card ─── */
const FeatureCard = ({ icon: Icon, title, description, link, linkLabel, delay }) => (
  <div className="feature-card" style={{ animationDelay: delay }}>
    <div className="feature-icon-wrap"><Icon size={32} /></div>
    <h3>{title}</h3>
    <p>{description}</p>
    <Link to={link} className="feature-link">
      {linkLabel} <ArrowRight size={16} />
    </Link>
  </div>
);

/* ─── Alert ticker item ─── */

const Home = () => {
  const [heroVisible, setHeroVisible] = useState(false);
  const [tickerPaused, setTickerPaused] = useState(false);
  const [featuresRef, featuresInView] = useInView(0.1);
  const [impactRef, impactInView] = useInView(0.1);

  const [testimonials, setTestimonials] = useState([]);
  const [tName, setTName] = useState('');
  const [tRole, setTRole] = useState('');
  const [tContent, setTContent] = useState('');
  const [tRating, setTRating] = useState(5);
  const [tMsg, setTMsg] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);
  
  // Real-time alerts state
  const [alerts, setAlerts] = useState([]);
  const wsRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const base = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    fetch(`${base.endsWith('/') ? base.slice(0, -1) : base}/api/testimonials`)
      .then(res => res.json())
      .then(data => setTestimonials(data.testimonials || []))
      .catch(() => {});
  }, []);

  /* ── Fetch Real-time Alerts ── */
  const fetchAlerts = React.useCallback(async () => {
    try {
      const base = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const res = await fetch(`${base.endsWith('/') ? base.slice(0, -1) : base}/api/alerts?limit=15`);
      if (res.ok) {
        const json = await res.json();
        if (json.alerts?.length) {
          setAlerts(prev => {
            const wsOnly = prev.filter(a => a._live && !json.alerts.find(x => x._id === a._id));
            return [...wsOnly, ...json.alerts];
          });
        }
      }
    } catch (e) { console.error('[Home] Failed to fetch live alerts', e); }
  }, []);

  useEffect(() => {
    fetchAlerts();
    const t1 = setInterval(fetchAlerts, 5 * 60 * 1000); // Poll every 5 minutes in background
    return () => clearInterval(t1);
  }, [fetchAlerts]);

  /* ── Live WebSocket for Ticker ── */
  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    const WS_URL  = API_URL.replace(/^http/, 'ws');
    const connect = () => {
      try {
        wsRef.current = new WebSocket(WS_URL);
        wsRef.current.onclose = () => setTimeout(connect, 5000);
        wsRef.current.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data);
            if (msg.event === 'new_alert') {
              const a = { ...msg.data, _id: msg.data._id || msg.data.id, _live: true };
              setAlerts(prev => (prev.find(x => x._id === a._id) ? prev : [a, ...prev.slice(0, 14)]));
            }
            if (msg.event === 'realtime_alert_batch' && msg.data?.alerts) {
              const batch = msg.data.alerts.map(a => ({
                ...a, _id: a._id || a.id || `rt-${Date.now()}-${Math.random()}`, _live: true
              }));
              setAlerts(prev => {
                const newOnes = batch.filter(a => !prev.find(x => x._id === a._id));
                return newOnes.length > 0 ? [...newOnes, ...prev].slice(0, 15) : prev;
              });
            }
          } catch (_) {}
        };
      } catch (_) {}
    };
    connect();
    return () => { if (wsRef.current) wsRef.current.close(); };
  }, []);

  const handleTestimonialSubmit = async (e) => {
    e.preventDefault();
    if (!tName || !tRole || !tContent) {
      setTMsg('Please fill all fields');
      return;
    }
    const base = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    try {
      const res = await fetch(`${base.endsWith('/') ? base.slice(0, -1) : base}/api/testimonials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tName, role: tRole, content: tContent, rating: tRating })
      });
      if (res.ok) {
        const json = await res.json();
        setTestimonials([json.testimonial, ...testimonials]);
        setTName(''); setTRole(''); setTContent(''); setTRating(5);
        setTMsg('Thank you for your review!');
        setTimeout(() => {
          setTMsg('');
          setShowReviewModal(false);
        }, 1500);
      } else {
        setTMsg('Failed to submit review');
      }
    } catch {
      setTMsg('Error submitting review');
    }
  };

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className={`home-container ${heroVisible ? 'fade-in' : ''}`}>

      {/* ══════════ LIVE ALERT TICKER ══════════ */}
      <div
        className="alert-ticker"
        onMouseEnter={() => setTickerPaused(true)}
        onMouseLeave={() => setTickerPaused(false)}
      >
        <span className="ticker-label"><Zap size={14} /> LIVE ALERTS</span>
        <div className="ticker-track-wrapper">
          <div className={`ticker-track ${tickerPaused ? 'paused' : ''}`}>
            {[...alerts, ...alerts].map((a, i) => {
              const severityType = a.severity === 'critical' ? 'danger' : a.severity === 'warning' ? 'warning' : 'info';
              const label = a.severity ? a.severity.toUpperCase() : 'INFO';
              const text = a.headline || a.description || `${a.type} Alert in ${a.location}`;
              return (
                <span key={i} className={`ticker-item ticker-${severityType}`}>
                  <span className="ticker-badge">{label}</span> {text}
                  <span className="ticker-sep">  •  </span>
                </span>
              );
            })}
            {alerts.length === 0 && (
              <span className="ticker-item ticker-info">
                <span className="ticker-badge">INFO</span> Connected to live real-time network... Waiting for updates.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ══════════ HERO SECTION ══════════ */}
      <section className="hero-section">
        <div className="hero-overlay" />
        <div className="hero-particles">
          {[...Array(12)].map((_, i) => (
            <span key={i} className="particle" style={{
              left: `${Math.random() * 100}%`,
              animationDuration: `${6 + Math.random() * 8}s`,
              animationDelay: `${Math.random() * 5}s`,
              width: `${4 + Math.random() * 6}px`,
              height: `${4 + Math.random() * 6}px`,
            }} />
          ))}
        </div>

        <div className="hero-content">
          <div className="hero-badge">
            <Activity size={14} /> Real-Time Biodiversity Intelligence
          </div>
          <h1 className="hero-title">
            Protecting&nbsp;<span className="hero-highlight">Forests</span> &amp;<br/>
            Wildlife with Technology
          </h1>
          <p className="hero-description">
            India's most advanced platform for monitoring deforestation, predicting
            human-wildlife conflict, and mobilising community conservation — in real time.
          </p>
          <div className="hero-buttons">
            <Link to="/dashboard" className="btn btn-primary" id="hero-dashboard-btn">
              <BarChart2 size={18} /> Explore Dashboard
            </Link>
            <Link to="/report" className="btn btn-secondary" id="hero-report-btn">
              <AlertTriangle size={18} /> Report Incident
            </Link>
          </div>
          <div className="hero-trust">
            {['Satellite Data', 'AI-Powered Alerts', 'Community-Driven', 'Open Source'].map(tag => (
              <span key={tag} className="trust-tag"><CheckCircle size={12} /> {tag}</span>
            ))}
          </div>
        </div>

        <button className="scroll-indicator" onClick={scrollToFeatures} aria-label="Scroll down">
          <ChevronDown size={32} />
        </button>
      </section>

      {/* ══════════ LIVE STATS BAR ══════════ */}
      <section className="stats-section">
        <div className="stats-grid">
          <StatCard icon={TreePine}     end={2847}  suffix="+"  label="Deforestation Alerts This Month" color="#4CAF50" />
          <StatCard icon={ShieldAlert}  end={134}   suffix=""   label="Active Conflict Zones Monitored"  color="#fb8c00" />
          <StatCard icon={Users}        end={12400} suffix="+"  label="Community Reports Filed"           color="#29b6f6" />
          <StatCard icon={Globe}        end={98}    suffix="%"  label="Alert Accuracy Rate"               color="#ab47bc" />
        </div>
      </section>

      {/* ══════════ FEATURES SECTION ══════════ */}
      <section id="features" className={`features-section ${featuresInView ? 'animate-in' : ''}`} ref={featuresRef}>
        <div className="section-container">
          <div className="section-header">
            <span className="section-eyebrow">What We Do</span>
            <h2 className="section-title">Core Capabilities</h2>
            <p className="section-subtitle">
              Six powerful modules working in concert to protect India's
              natural heritage and the communities that live alongside it.
            </p>
          </div>

          <div className="features-grid">
            <FeatureCard
              icon={Map}
              title="Real-Time Forest Monitoring"
              description="Track forest coverage, active fires, and deforestation hotspots using interactive satellite-derived map layers updated every 24 hours."
              link="/dashboard"
              linkLabel="Open Map"
              delay="0s"
            />
            <FeatureCard
              icon={ShieldAlert}
              title="Wildlife Conflict Alerts"
              description="Predict and monitor animal movement near human settlements. Instant SMS + in-app alerts for every potential conflict zone."
              link="/alerts"
              linkLabel="View Alerts"
              delay="0.1s"
            />
            <FeatureCard
              icon={Users}
              title="Community Reporting"
              description="A crowdsourced network: locals can report illegal logging, poaching, or dangerous wildlife proximity — securely and anonymously."
              link="/report"
              linkLabel="Submit Report"
              delay="0.2s"
            />
            <FeatureCard
              icon={Eye}
              title="Conflict Monitor"
              description="A live geospatial dashboard showing ongoing human-wildlife conflict incidents with severity levels, response status, and trend lines."
              link="/conflict"
              linkLabel="Monitor Now"
              delay="0.3s"
            />
            <FeatureCard
              icon={TrendingUp}
              title="Analytics & Insights"
              description="Deep-dive charts and time-series analysis on deforestation rate, biodiversity index, and conflict frequency — exportable as PDF."
              link="/analytics"
              linkLabel="View Analytics"
              delay="0.4s"
            />
            <FeatureCard
              icon={BookOpen}
              title="Learn & Awareness"
              description="Curated educational resources, species guides, and conservation best-practices for students, NGOs, and policy makers alike."
              link="/learn"
              linkLabel="Start Learning"
              delay="0.5s"
            />
          </div>
        </div>
      </section>

      {/* ══════════ MAP PREVIEW / HOW IT WORKS ══════════ */}
      <section className="how-section">
        <div className="section-container how-inner">
          <div className="how-text">
            <span className="section-eyebrow">How It Works</span>
            <h2 className="section-title left">Three Steps to Conservation</h2>
            <div className="steps">
              {[
                { num: '01', title: 'Satellite Ingestion', desc: 'NASA MODIS & Sentinel-2 imagery is processed nightly to detect land-cover change.' },
                { num: '02', title: 'AI Alert Engine',    desc: 'Machine-learning models flag deforestation events and predict wildlife movement corridors.' },
                { num: '03', title: 'Community Action',  desc: 'Rangers, locals, and NGOs receive instant alerts and can submit ground-truth reports.' },
              ].map(s => (
                <div className="step" key={s.num}>
                  <span className="step-num">{s.num}</span>
                  <div>
                    <h4>{s.title}</h4>
                    <p>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link to="/dashboard" className="btn btn-primary inline-btn">
              Explore Live Map <ArrowRight size={18} />
            </Link>
          </div>

          <div className="map-preview-wrap">
            <div className="map-preview-card">
              <div className="map-preview-header">
                <span className="map-dot red" /><span className="map-dot yellow" /><span className="map-dot green" />
                <span className="map-title-tag">BioGuard · Live Map</span>
                <span className="live-badge"><span className="pulse-ring" /> LIVE</span>
              </div>
              <div className="map-preview-body">
                {/* Simulated map visual */}
                <div className="fake-map">
                  <div className="fake-forest zone1" />
                  <div className="fake-forest zone2" />
                  <div className="fake-forest zone3" />
                  <div className="fake-river" />
                  <div className="fake-alert fa1"><AlertTriangle size={12} /></div>
                  <div className="fake-alert fa2"><AlertTriangle size={12} /></div>
                  <div className="fake-ping fp1" />
                  <div className="fake-ping fp2" />
                  <div className="map-grid-overlay" />
                </div>
                <div className="map-legend">
                  <span className="legend-item"><span className="legend-dot" style={{background:'#4CAF50'}} /> Forest Cover</span>
                  <span className="legend-item"><span className="legend-dot" style={{background:'#fb8c00'}} /> Alert Zone</span>
                  <span className="legend-item"><span className="legend-dot" style={{background:'#e53935'}} /> Critical</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ IMPACT SECTION ══════════ */}
      <section className={`impact-section ${impactInView ? 'animate-in' : ''}`} ref={impactRef}>
        <div className="section-container">
          <div className="section-header light">
            <span className="section-eyebrow light">Our Impact</span>
            <h2 className="section-title light">Measurable Conservation Results</h2>
          </div>
          <div className="impact-grid">
            {[
              { value: '34%', label: 'Reduction in repeat conflict incidents in monitored zones' },
              { value: '2.1M', label: 'Hectares of forest under active satellite surveillance' },
              { value: '6 min', label: 'Average time from detection to alert dispatch' },
              { value: '42+',  label: 'Partner NGOs and forest departments using BioGuard' },
            ].map(item => (
              <div className="impact-card" key={item.value}>
                <div className="impact-value">{item.value}</div>
                <div className="impact-label">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          TESTIMONIALS SECTION
      ══════════════════════════════════════════ */}
      <section className="testimonials-section">
        <div className="section-container">
          <div className="section-header" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: '20px', marginBottom: '40px' }}>
            <div style={{ textAlign: 'left' }}>
              <span className="section-eyebrow">Community & Users</span>
              <h2 className="section-title left" style={{ margin: 0 }}>What People Say</h2>
              <p className="section-subtitle" style={{ margin: '8px 0 0', maxWidth: '500px' }}>Real experiences from field workers, conservationists, and citizens.</p>
            </div>
            <button onClick={() => setShowReviewModal(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={18} /> Write a Review
            </button>
          </div>

          <div className="testimonials-track">
            {testimonials.map(t => (
              <div key={t._id} className="testimonial-card">
                <div style={{ display: 'flex', gap: '4px', color: '#fb8c00' }}>
                  {[...Array(5)].map((_, i) => <Star key={i} size={18} fill={i < t.rating ? 'currentColor' : 'none'} color={i < t.rating ? 'currentColor' : '#ddd'} />)}
                </div>
                <p className="testimonial-text">"{t.content}"</p>
                <div className="testimonial-author-wrap">
                  <div className="testimonial-author">{t.name}</div>
                  <div className="testimonial-author-role">{t.role}</div>
                </div>
              </div>
            ))}
            {testimonials.length === 0 && <div style={{ color: '#666', padding: '20px 0' }}>No reviews yet. Be the first to share your experience!</div>}
          </div>
        </div>
      </section>

      {/* ══════════ REVIEW MODAL ══════════ */}
      {showReviewModal && (
        <div className="review-modal-overlay" onClick={() => setShowReviewModal(false)}>
          <div className="review-modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 className="review-modal-title">
                <MessageSquare size={24} color="#4CAF50" /> Add Your Review
              </h3>
              <button className="review-modal-close" onClick={() => setShowReviewModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleTestimonialSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input className="review-input" value={tName} onChange={e=>setTName(e.target.value)} placeholder="Your Name" required />
              <input className="review-input" value={tRole} onChange={e=>setTRole(e.target.value)} placeholder="Your Role (e.g. Forest Ranger)" required />
              <textarea className="review-input" value={tContent} onChange={e=>setTContent(e.target.value)} placeholder="Share your experience..." required rows={4} style={{ resize: 'vertical' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                <span style={{ fontSize: '0.95rem', color: '#666', fontWeight: 600 }}>Rating:</span>
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={26} onClick={() => setTRating(i+1)} style={{ cursor: 'pointer', transition: 'transform 0.1s' }} onMouseDown={e=>e.currentTarget.style.transform='scale(0.9)'} onMouseUp={e=>e.currentTarget.style.transform='scale(1)'}
                    fill={i < tRating ? '#fb8c00' : 'none'} color={i < tRating ? '#fb8c00' : '#ddd'} />
                ))}
              </div>
              {tMsg && <div style={{ fontSize: '0.9rem', color: tMsg.includes('Thank') ? '#2e7d32' : '#c62828', background: tMsg.includes('Thank') ? '#e8f5e9' : '#ffebee', padding: '12px', borderRadius: '8px', fontWeight: 500 }}>{tMsg}</div>}
              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }}>
                Submit Review
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ══════════ CTA SECTION ══════════ */}
      <section className="cta-section">
        <div className="cta-content">
          <TreePine size={48} className="cta-icon" />
          <h2>Join the Conservation Network</h2>
          <p>
            Whether you're a ranger, researcher, NGO, or a concerned citizen —
            your eyes on the ground can make a difference.
          </p>
          <div className="cta-buttons">
            <Link to="/report" className="btn btn-primary" id="cta-report-btn">
              Report an Incident
            </Link>
            <Link to="/learn" className="btn btn-outline" id="cta-learn-btn">
              Learn More
            </Link>
          </div>
        </div>
        <div className="cta-bg-shapes">
          <span className="cta-shape s1" />
          <span className="cta-shape s2" />
          <span className="cta-shape s3" />
        </div>
      </section>

    </div>
  );
};

export default Home;
