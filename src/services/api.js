/**
 * BioGuard API Client — Full Real-Data Edition
 */

const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');

function getToken() {
  return localStorage.getItem('bioguard-jwt');
}

async function request(path, opts = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(opts.headers || {}),
  };
  const res  = await fetch(`${BASE}${path}`, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

export const api = {
  /* ── Auth ── */
  signUp:        body => request('/api/auth/signup',  { method: 'POST', body: JSON.stringify(body) }),
  signIn:        body => request('/api/auth/signin',  { method: 'POST', body: JSON.stringify(body) }),
  me:            ()   => request('/api/auth/me'),
  updateProfile: body => request('/api/auth/profile', { method: 'PATCH', body: JSON.stringify(body) }),

  /* ── Alerts ── */
  getAlerts:    params => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/api/alerts${q}`);
  },
  getAlert:     id  => request(`/api/alerts/${id}`),
  getAlertMsg:  id  => request(`/api/alerts/${id}/message`),
  createAlert:  body => request('/api/alerts', { method: 'POST', body: JSON.stringify(body) }),
  resolveAlert: id  => request(`/api/alerts/${id}/resolve`, { method: 'PATCH' }),
  deleteAlert:  id  => request(`/api/alerts/${id}`, { method: 'DELETE' }),

  /* ── Incidents ── */
  getIncidents:   params => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/api/incidents${q}`);
  },
  getIncident:    id   => request(`/api/incidents/${id}`),
  createIncident: body => request('/api/incidents', { method: 'POST', body: JSON.stringify(body) }),
  updateIncident: (id, body) => request(`/api/incidents/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteIncident: id   => request(`/api/incidents/${id}`, { method: 'DELETE' }),

  /* ── Reports ── */
  getReports:   params => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/api/reports${q}`);
  },
  getMyReports: () => request('/api/reports/mine'),
  submitReport: body => request('/api/reports', { method: 'POST', body: JSON.stringify(body) }),
  updateReport: (id, body) => request(`/api/reports/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteReport: id  => request(`/api/reports/${id}`, { method: 'DELETE' }),
  updateReportStatus: (id, status) => request(`/api/reports/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  /* ── ML Predictions / Analysis / Real Data ── */
  getLiveAnalysis: () => request('/api/analysis/live'),
  getMLPredictions:() => request('/api/real-data/predict-risk/zones'),

  // Legacy real-data predict (JS Random Forest)
  predictRisk: (lat, lng) => request('/api/real-data/predict-risk', {
    method: 'POST',
    body: JSON.stringify({ lat, lng }),
  }),

  // Python-backed Random Forest prediction (with JS fallback)
  predictRiskPython: (lat, lng, extra = {}) => request('/api/ml/predict', {
    method: 'POST',
    body: JSON.stringify({ lat, lng, ...extra }),
  }),

  // Python ML service status
  mlHealth: () => request('/api/ml/health'),

  // Trigger model retrain (admin)
  mlTrain: () => request('/api/ml/train', { method: 'POST' }),

  // Get computed feature vector for debugging
  mlFeatures: (lat, lng) => request(`/api/ml/features?lat=${lat}&lng=${lng}`),

  /* ── Real API Data ── */
  getWildlifeData: (lat, lng, radius = 200, limit = 100) => {
    let q = `?limit=${limit}`;
    if (lat != null && lng != null) q += `&lat=${lat}&lng=${lng}&radius=${radius}`;
    return request(`/api/real-data/wildlife-data${q}`);
  },
  getForestAlerts: () => request('/api/real-data/forest-alerts'),
  getSpeciesStats: () => request('/api/real-data/species-stats'),
  getClimateData:  () => request('/api/real-data/climate'),
  getPoachingRisk: () => request('/api/real-data/poaching-risk'),
  refreshPredictions: () => request('/api/analysis/refresh', { method: 'POST' }),

  /* ── Admin (admin role only) ── */
  adminStats:      ()           => request('/api/admin/stats'),
  adminUsers:      params       => request(`/api/admin/users${params ? '?' + new URLSearchParams(params) : ''}`),
  adminChangeRole: (id, role)   => request(`/api/admin/users/${id}/role`,   { method: 'PATCH', body: JSON.stringify({ role }) }),
  adminToggleUser: id           => request(`/api/admin/users/${id}/toggle`, { method: 'PATCH' }),
  adminDeleteUser: id           => request(`/api/admin/users/${id}`,        { method: 'DELETE' }),

  /* ── Health ── */
  health: () => request('/api/health'),
};

export default api;
