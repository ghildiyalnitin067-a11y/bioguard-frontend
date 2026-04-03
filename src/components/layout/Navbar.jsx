import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { Leaf, Menu, X, Sun, Moon, LogIn, UserPlus, ChevronDown, LogOut, User } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth }  from '../../context/AuthContext';
import './Navbar.css';

const NAV_LINKS = [
  { name: 'Home',             path: '/'          },
  { name: 'Dashboard',        path: '/dashboard'  },
  { name: 'Alerts',           path: '/alerts'     },
  { name: 'Conflict Monitor', path: '/conflict'   },
  { name: 'Analytics',        path: '/analytics'  },
  { name: 'Report',           path: '/report'     },
  { name: 'Learn',            path: '/learn'      },
];

const Navbar = () => {
  const { theme, toggle }   = useTheme();
  const { user, signOut }   = useAuth();
  const navigate            = useNavigate();
  const location            = useLocation();
  const [scrolled, setScrolled]         = useState(false);
  const [mobileOpen, setMobileOpen]     = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropRef = useRef(null);

  // Only the home page uses the transparent-on-top style
  const isHome  = location.pathname === '/';
  // On inner pages OR when scrolled → always show solid navbar
  const isSolid = !isHome || scrolled;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = e => { if (dropRef.current && !dropRef.current.contains(e.target)) setDropdownOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSignOut = () => {
    setDropdownOpen(false);
    setMobileOpen(false);
    signOut();
    navigate('/');
  };

  return (
    <nav className={`navbar ${isSolid ? 'scrolled' : ''} theme-${theme}`}>
      <div className="navbar-container">

        {/* Logo */}
        <Link to="/" className="navbar-logo">
          <Leaf className="logo-icon" size={28}/>
          <span>BioGuard</span>
        </Link>

        {/* Desktop Links */}
        <div className="navbar-links">
          {NAV_LINKS.map(l => (
            <NavLink
              key={l.name}
              to={l.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >{l.name}</NavLink>
          ))}
        </div>

        {/* Right controls */}
        <div className="navbar-right">
          {/* Theme toggle */}
          <button className="theme-toggle" onClick={toggle} title={theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}>
            {theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}
          </button>

          {/* Auth area */}
          {!user ? (
            <div className="auth-buttons">
              <Link to="/signin"  className="nav-signin">  <LogIn    size={15}/> Sign In  </Link>
              <Link to="/signup"  className="nav-signup">  <UserPlus size={15}/> Sign Up  </Link>
            </div>
          ) : (
            <div className="user-menu" ref={dropRef}>
              <button className="user-trigger" onClick={() => setDropdownOpen(o => !o)}>
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="user-avatar"
                  onError={e => { e.target.src = `https://api.dicebear.com/8.x/adventurer/svg?seed=${user.email}`; }}
                />
                <span className="user-name">{user.name.split(' ')[0]}</span>
                <ChevronDown size={14} className={`chevron ${dropdownOpen ? 'open' : ''}`}/>
              </button>
              {dropdownOpen && (
                <div className="user-dropdown">
                  <div className="ud-header">
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="ud-avatar"
                      onError={e => { e.target.src = `https://api.dicebear.com/8.x/adventurer/svg?seed=${user.email}`; }}
                    />
                    <div className="ud-header-info">
                      <strong>{user.name}</strong>
                      <span className="ud-email">{user.email}</span>
                      {user.joinedVia === 'google' && (
                        <span className="ud-google-badge">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                          </svg>
                          Google Account
                        </span>
                      )}
                    </div>
                  </div>
                  <Link to="/profile" className="ud-item" onClick={() => setDropdownOpen(false)}>
                    <User size={15}/> My Profile
                  </Link>
                  <button className="ud-item danger" onClick={handleSignOut}>
                    <LogOut size={15}/> Sign Out
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Mobile hamburger */}
          <button className="mobile-menu-icon" onClick={() => setMobileOpen(o => !o)}>
            {mobileOpen ? <X size={26}/> : <Menu size={26}/>}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`mobile-menu ${mobileOpen ? 'open' : ''}`}>
        {NAV_LINKS.map(l => (
          <NavLink
            key={l.name}
            to={l.path}
            className="mobile-nav-item"
            onClick={() => setMobileOpen(false)}
          >{l.name}</NavLink>
        ))}
        <div className="mobile-auth">
          {!user ? (
            <>
              <Link to="/signin" className="mobile-auth-btn" onClick={() => setMobileOpen(false)}>Sign In</Link>
              <Link to="/signup" className="mobile-auth-btn primary" onClick={() => setMobileOpen(false)}>Sign Up</Link>
            </>
          ) : (
            <>
              <Link to="/profile" className="mobile-auth-btn" onClick={() => setMobileOpen(false)}>My Profile</Link>
              <button className="mobile-auth-btn danger" onClick={handleSignOut}>Sign Out</button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
