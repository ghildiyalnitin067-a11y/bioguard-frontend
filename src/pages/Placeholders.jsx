import React from 'react';

const PlaceholderPage = ({ title }) => (
  <div style={{ paddingTop: '100px', textAlign: 'center', minHeight: '100vh', padding: '120px 20px', backgroundColor: '#fdfbf7' }}>
    <h1 style={{ color: '#1a472a', marginBottom: '20px', fontFamily: 'Inter, sans-serif' }}>{title}</h1>
    <p style={{ fontFamily: 'Inter, sans-serif', color: '#555' }}>This page is currently under construction.</p>
  </div>
);

export const Dashboard = () => <PlaceholderPage title="Dashboard" />;
export const Alerts = () => <PlaceholderPage title="Alerts" />;
export const ConflictMonitor = () => <PlaceholderPage title="Human-Wildlife Conflict Monitor" />;
export const Analytics = () => <PlaceholderPage title="Analytics" />;
export const Report = () => <PlaceholderPage title="Community Reporting" />;
export const Learn = () => <PlaceholderPage title="Learn & Awareness" />;
