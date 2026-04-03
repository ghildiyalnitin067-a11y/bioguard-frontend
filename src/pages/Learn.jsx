import React, { useState } from 'react';
import { BookOpen, TreePine, Bird, Fish, Bug, Leaf, ChevronRight, Clock, Tag, ExternalLink } from 'lucide-react';
import './Learn.css';

const CATEGORIES = ['All', 'Conservation', 'Wildlife', 'Forests', 'Climate', 'Community'];

const ARTICLES = [
  {
    id: 1, category: 'Forests', title: 'Understanding Deforestation: Causes & Global Impact',
    excerpt: 'Deforestation affects 15 billion trees every year. Learn about the primary drivers — from illegal logging to agricultural expansion — and what we can do to reverse the trend.',
    read: '8 min read', tag: 'Educational', image: 'https://images.unsplash.com/photo-1542401886-65d6c61db217?w=600&q=80', featured: true,
  },
  {
    id: 2, category: 'Wildlife', title: 'Human-Wildlife Conflict: Why It Happens & How to Prevent It',
    excerpt: 'As forest corridors shrink, animals increasingly venture into human settlements. Discover science-backed strategies to coexist peacefully with wildlife.',
    read: '6 min read', tag: 'Research', image: 'https://images.unsplash.com/photo-1564760055775-d63b17a55c44?w=600&q=80', featured: true,
  },
  {
    id: 3, category: 'Conservation', title: 'Community Rangers: The Frontline of Biodiversity Protection',
    excerpt: 'Meet the 400+ community rangers across India using BioGuard to report and prevent poaching. Their stories, tools, and impact.',
    read: '5 min read', tag: 'Story', image: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=600&q=80', featured: false,
  },
  {
    id: 4, category: 'Climate', title: 'How Forests Cool the Planet: The Science of Carbon Sinks',
    excerpt: 'Old-growth forests sequester massive amounts of carbon. Explore the chemistry behind carbon capture and why every tree matters in the fight against climate change.',
    read: '7 min read', tag: 'Science', image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&q=80', featured: false,
  },
  {
    id: 5, category: 'Wildlife', title: 'India\'s Big Five: Status, Threats, and Conservation Wins',
    excerpt: 'Tiger, Elephant, Rhino, Lion, Leopard — India\'s iconic megafauna. Get an updated look at their population trends and the policies protecting them.',
    read: '9 min read', tag: 'Wildlife', image: 'https://images.unsplash.com/photo-1466721591366-2d5fba72006d?w=600&q=80', featured: false,
  },
  {
    id: 6, category: 'Community', title: 'How to Report Environmental Violations: A Citizen\'s Guide',
    excerpt: 'You don\'t need to be a ranger to protect the forest. Learn how to document, report, and follow up on illegal activities using BioGuard\'s community tools.',
    read: '4 min read', tag: 'Guide', image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&q=80', featured: false,
  },
  {
    id: 7, category: 'Forests', title: 'Satellite Technology in Forest Monitoring: How It Works',
    excerpt: 'From MODIS to Sentinel-2, learn how space-based sensors detect deforestation events within hours — and how BioGuard uses this data in real time.',
    read: '6 min read', tag: 'Technology', image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&q=80', featured: false,
  },
  {
    id: 8, category: 'Conservation', title: 'Protected Area Networks: Are India\'s Wildlife Sanctuaries Enough?',
    excerpt: 'India has 988 protected areas covering 5% of its land. This analysis examines whether the current sanctuary system adequately protects wildlife corridors.',
    read: '10 min read', tag: 'Policy', image: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=600&q=80', featured: false,
  },
];

const SPECIES = [
  { name: 'Bengal Tiger',    status: 'Vulnerable',  population: '~3,800',   icon: '🐯', color: '#ff6f00' },
  { name: 'Asian Elephant',  status: 'Endangered',  population: '~27,000',  icon: '🐘', color: '#fb8c00' },
  { name: 'Snow Leopard',    status: 'Vulnerable',  population: '~4,500',   icon: '🐆', color: '#ab47bc' },
  { name: 'Indian Rhino',    status: 'Vulnerable',  population: '~4,000',   icon: '🦏', color: '#e53935' },
  { name: 'Red Panda',       status: 'Endangered',  population: '~10,000',  icon: '🐼', color: '#d84315' },
  { name: 'Ganges Dolphin',  status: 'Endangered',  population: '~1,200',   icon: '🐬', color: '#1565c0' },
];

const STATUS_COLOR = { 'Vulnerable': '#fb8c00', 'Endangered': '#e53935', 'Critically Endangered': '#b71c1c' };

const TAG_COLOR = {
  Educational: '#1565c0', Research: '#6a1b9a', Story: '#2e7d32',
  Science: '#00695c', Wildlife: '#e65100', Guide: '#0277bd',
  Technology: '#283593', Policy: '#4a148c',
};

const Learn = () => {
  const [cat, setCat]     = useState('All');
  const [expanded, setExpanded] = useState(null);

  const shown = cat === 'All' ? ARTICLES : ARTICLES.filter(a => a.category === cat);
  const featured = shown.filter(a => a.featured);
  const rest     = shown.filter(a => !a.featured);

  return (
    <div className="page-root learn-page">
      {/* Hero */}
      <div className="learn-hero">
        <div className="lh-content">
          <Leaf size={40} className="lh-icon"/>
          <h1>Learn &amp; Discover</h1>
          <p>Science-backed resources on biodiversity, forest conservation, and human-wildlife coexistence — curated for students, NGOs, and everyday citizens.</p>
        </div>
      </div>

      {/* Category tabs */}
      <div className="cat-nav">
        {CATEGORIES.map(c => (
          <button key={c} className={`cat-tab ${cat===c?'active':''}`} onClick={() => setCat(c)}>{c}</button>
        ))}
      </div>

      <div className="learn-body">

        {/* Featured articles */}
        {featured.length > 0 && (
          <div className="featured-grid">
            {featured.map(a => (
              <div key={a.id} className="featured-card">
                <div className="fc-img" style={{ backgroundImage: `url(${a.image})` }}>
                  <div className="fc-overlay"/>
                  <span className="fc-cat">{a.category}</span>
                </div>
                <div className="fc-body">
                  <div className="fc-meta">
                    <span className="fc-tag" style={{ background: TAG_COLOR[a.tag]+'22', color: TAG_COLOR[a.tag], border:`1px solid ${TAG_COLOR[a.tag]}44` }}>
                      <Tag size={11}/> {a.tag}
                    </span>
                    <span className="fc-read"><Clock size={11}/> {a.read}</span>
                  </div>
                  <h2 className="fc-title">{a.title}</h2>
                  <p className="fc-excerpt">{a.excerpt}</p>
                  <button className="fc-btn">Read Article <ExternalLink size={14}/></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Article grid */}
        {rest.length > 0 && (
          <>
            <h3 className="section-label">More Articles</h3>
            <div className="article-grid">
              {rest.map(a => (
                <div key={a.id} className={`article-card ${expanded === a.id ? 'expanded' : ''}`}
                  onClick={() => setExpanded(expanded === a.id ? null : a.id)}>
                  <div className="ac-img" style={{ backgroundImage: `url(${a.image})` }}>
                    <span className="ac-cat">{a.category}</span>
                  </div>
                  <div className="ac-body">
                    <div className="ac-meta">
                      <span className="ac-tag" style={{ background: TAG_COLOR[a.tag]+'22', color: TAG_COLOR[a.tag] }}>
                        <Tag size={10}/> {a.tag}
                      </span>
                      <span className="ac-read"><Clock size={10}/> {a.read}</span>
                    </div>
                    <h3 className="ac-title">{a.title}</h3>
                    {expanded === a.id && <p className="ac-excerpt">{a.excerpt}</p>}
                    <span className="ac-more">{expanded === a.id ? 'Show less' : 'Read more'} <ChevronRight size={13}/></span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Species spotlight */}
        <div className="species-section">
          <div className="section-hdr">
            <Bird size={20}/> <h3>Species Spotlight — Conservation Status</h3>
          </div>
          <div className="species-grid">
            {SPECIES.map(s => (
              <div className="species-card" key={s.name} style={{ '--sc': s.color }}>
                <div className="sp-emoji">{s.icon}</div>
                <div className="sp-name">{s.name}</div>
                <div className="sp-status" style={{ color: STATUS_COLOR[s.status] }}>{s.status}</div>
                <div className="sp-pop">Est. population: <strong>{s.population}</strong></div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick links */}
        <div className="resources-section">
          <h3>External Resources</h3>
          <div className="resource-grid">
            {[
              { name: 'Wildlife Institute of India', url: 'https://wii.gov.in', icon: TreePine },
              { name: 'WWF India',                   url: 'https://wwfindia.org', icon: Bird },
              { name: 'MoEFCC — Forest Data',        url: 'https://moef.gov.in', icon: Leaf },
              { name: 'IUCN Red List',               url: 'https://iucnredlist.org', icon: Bug },
              { name: 'NASA FIRMS Fire Map',         url: 'https://firms.modaps.eosdis.nasa.gov', icon: Fish },
              { name: 'Global Forest Watch',         url: 'https://globalforestwatch.org', icon: BookOpen },
            ].map(r => (
              <a key={r.name} href={r.url} target="_blank" rel="noreferrer" className="resource-card">
                <r.icon size={18}/>
                <span>{r.name}</span>
                <ExternalLink size={13}/>
              </a>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Learn;
