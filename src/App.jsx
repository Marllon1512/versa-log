import { useState, useEffect, createContext, useContext, useRef } from "react";

// ============================================================
// SUPABASE CONFIG
// ============================================================
const SUPABASE_URL = "https://kwccjkqltllypbmaisio.supabase.co";
const SUPABASE_KEY = "sb_publishable_DOstaNgELEBpS9D-Fe4KqQ_UURE_1dN";

const db = {
  async query(table, options = {}) {
    let url = `${SUPABASE_URL}/rest/v1/${table}?`;
    const params = [];
    if (options.select) params.push(`select=${options.select}`);
    else params.push('select=*');
    if (options.filter) {
      Object.entries(options.filter).forEach(([k, v]) => params.push(`${k}=eq.${encodeURIComponent(v)}`));
    }
    if (options.order) params.push(`order=${options.order}`);
    if (options.limit) params.push(`limit=${options.limit}`);
    url += params.join('&');
    const res = await fetch(url, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async insert(table, data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async update(table, id, data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async delete(table, id) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: 'DELETE',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    if (!res.ok) throw new Error(await res.text());
    return true;
  },

  async login(email, password) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error_description || data.msg || 'Erro ao fazer login');
    return data;
  }
};


// ============================================================
// DESIGN TOKENS
// ============================================================
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg-0: #0a0a0b;
    --bg-1: #111113;
    --bg-2: #18181c;
    --bg-3: #222228;
    --bg-4: #2a2a32;
    --border: rgba(255,255,255,0.07);
    --border-hover: rgba(255,255,255,0.14);
    --text-1: #f0f0f2;
    --text-2: #9090a0;
    --text-3: #5a5a6a;
    --accent: #6e6ef0;
    --accent-dim: rgba(110,110,240,0.15);
    --green: #22c55e;
    --green-dim: rgba(34,197,94,0.12);
    --amber: #f59e0b;
    --amber-dim: rgba(245,158,11,0.12);
    --red: #ef4444;
    --red-dim: rgba(239,68,68,0.12);
    --blue: #3b82f6;
    --blue-dim: rgba(59,130,246,0.12);
    --font: 'DM Sans', sans-serif;
    --mono: 'DM Mono', monospace;
  }

  body { background: var(--bg-0); color: var(--text-1); font-family: var(--font); font-size: 14px; line-height: 1.5; }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--bg-4); border-radius: 2px; }

  /* Layout */
  .app { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
  .app-inner { display: flex; flex: 1; overflow: hidden; }
  .sidebar { width: 220px; min-width: 220px; background: var(--bg-1); border-right: 1px solid var(--border); display: flex; flex-direction: column; padding: 20px 0; overflow-y: auto; }
  .main { flex: 1; overflow-y: auto; background: var(--bg-0); }
  .page { padding: 24px; max-width: 1200px; }
  .topbar { background: var(--bg-1); border-bottom: 1px solid var(--border); padding: 10px 16px; display: flex; gap: 6px; flex-wrap: wrap; align-items: center; overflow-x: auto; }
  .topbar-logo { font-size: 12px; font-weight: 700; color: var(--text-1); letter-spacing: 0.08em; margin-right: 8px; display: flex; align-items: center; gap: 6px; }
  .topbar-btn { padding: 5px 10px; border-radius: 6px; font-size: 11px; font-weight: 500; cursor: pointer; border: 1px solid var(--border); background: transparent; color: var(--text-2); transition: all 0.15s; font-family: var(--font); white-space: nowrap; }
  .topbar-btn:hover { background: var(--bg-3); color: var(--text-1); }
  .topbar-btn.active { background: var(--accent-dim); border-color: var(--accent); color: var(--accent); }

  /* Sidebar */
  .sidebar-logo { padding: 0 20px 24px; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid var(--border); margin-bottom: 16px; }
  .sidebar-logo-icon { width: 32px; height: 32px; background: var(--text-1); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .sidebar-logo-text { font-size: 13px; font-weight: 600; letter-spacing: 0.05em; color: var(--text-1); }
  .sidebar-section { padding: 0 12px; margin-bottom: 8px; }
  .sidebar-section-label { font-size: 10px; font-weight: 500; color: var(--text-3); letter-spacing: 0.08em; text-transform: uppercase; padding: 0 8px; margin-bottom: 4px; }
  .nav-item { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 8px; cursor: pointer; color: var(--text-2); font-size: 13px; font-weight: 400; transition: all 0.15s; border: none; background: none; width: 100%; text-align: left; }
  .nav-item:hover { background: var(--bg-3); color: var(--text-1); }
  .nav-item.active { background: var(--accent-dim); color: var(--accent); }
  .nav-item svg { width: 15px; height: 15px; flex-shrink: 0; }
  .sidebar-user { margin-top: auto; padding: 16px 20px 0; border-top: 1px solid var(--border); display: flex; align-items: center; gap: 10px; }
  .avatar { width: 30px; height: 30px; border-radius: 50%; background: var(--bg-4); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; color: var(--text-2); flex-shrink: 0; }
  .sidebar-user-info { flex: 1; min-width: 0; }
  .sidebar-user-name { font-size: 12px; font-weight: 500; color: var(--text-1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sidebar-user-role { font-size: 11px; color: var(--text-3); }

  /* Page header */
  .page-header { margin-bottom: 28px; }
  .page-title { font-size: 22px; font-weight: 600; color: var(--text-1); }
  .page-subtitle { font-size: 13px; color: var(--text-2); margin-top: 2px; }
  .page-actions { display: flex; gap: 8px; align-items: center; }
  .page-header-row { display: flex; align-items: center; justify-content: space-between; }

  /* Cards */
  .card { background: var(--bg-1); border: 1px solid var(--border); border-radius: 12px; padding: 20px; }
  .card-sm { background: var(--bg-1); border: 1px solid var(--border); border-radius: 10px; padding: 16px; }

  /* Stats */
  .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 24px; }
  .stat-card { background: var(--bg-1); border: 1px solid var(--border); border-radius: 12px; padding: 16px 20px; }
  .stat-value { font-size: 28px; font-weight: 600; color: var(--text-1); font-family: var(--mono); }
  .stat-label { font-size: 12px; color: var(--text-2); margin-top: 2px; }
  .stat-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; }

  /* Buttons */
  .btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; border: none; transition: all 0.15s; font-family: var(--font); }
  .btn-primary { background: var(--accent); color: #fff; }
  .btn-primary:hover { background: #5a5ae0; }
  .btn-secondary { background: var(--bg-3); color: var(--text-1); border: 1px solid var(--border); }
  .btn-secondary:hover { background: var(--bg-4); border-color: var(--border-hover); }
  .btn-ghost { background: transparent; color: var(--text-2); }
  .btn-ghost:hover { background: var(--bg-3); color: var(--text-1); }
  .btn-danger { background: var(--red-dim); color: var(--red); border: 1px solid rgba(239,68,68,0.2); }
  .btn-danger:hover { background: rgba(239,68,68,0.2); }
  .btn-sm { padding: 5px 10px; font-size: 12px; border-radius: 6px; }
  .btn-icon { width: 32px; height: 32px; padding: 0; justify-content: center; }
  .btn:disabled { opacity: 0.4; cursor: not-allowed; }

  /* Badges */
  .badge { display: inline-flex; align-items: center; padding: 3px 8px; border-radius: 20px; font-size: 11px; font-weight: 500; }
  .badge-green { background: var(--green-dim); color: var(--green); }
  .badge-amber { background: var(--amber-dim); color: var(--amber); }
  .badge-red { background: var(--red-dim); color: var(--red); }
  .badge-blue { background: var(--blue-dim); color: var(--blue); }
  .badge-gray { background: var(--bg-3); color: var(--text-2); }
  .badge-accent { background: var(--accent-dim); color: var(--accent); }

  /* Table */
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 11px; font-weight: 500; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.06em; padding: 10px 14px; border-bottom: 1px solid var(--border); }
  td { padding: 12px 14px; border-bottom: 1px solid var(--border); font-size: 13px; color: var(--text-1); vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: var(--bg-2); }

  /* Forms */
  .form-group { margin-bottom: 16px; }
  .form-label { display: block; font-size: 12px; font-weight: 500; color: var(--text-2); margin-bottom: 6px; letter-spacing: 0.03em; text-transform: uppercase; }
  .form-input { width: 100%; background: var(--bg-2); border: 1px solid var(--border); border-radius: 8px; padding: 9px 12px; color: var(--text-1); font-size: 13px; font-family: var(--font); outline: none; transition: border-color 0.15s; }
  .form-input:focus { border-color: var(--accent); }
  .form-input::placeholder { color: var(--text-3); }
  select.form-input { cursor: pointer; }
  .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .form-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }

  /* Filters */
  .filters { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 20px; }
  .filter-btn { padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; cursor: pointer; border: 1px solid var(--border); background: transparent; color: var(--text-2); transition: all 0.15s; font-family: var(--font); }
  .filter-btn:hover { border-color: var(--border-hover); color: var(--text-1); }
  .filter-btn.active { background: var(--accent-dim); border-color: var(--accent); color: var(--accent); }
  .search-input { background: var(--bg-2); border: 1px solid var(--border); border-radius: 8px; padding: 7px 12px; color: var(--text-1); font-size: 13px; outline: none; width: 220px; font-family: var(--font); }
  .search-input:focus { border-color: var(--accent); }
  .search-input::placeholder { color: var(--text-3); }

  /* List items */
  .list-item { display: flex; align-items: center; padding: 14px 16px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-1); cursor: pointer; transition: all 0.15s; margin-bottom: 8px; gap: 14px; }
  .list-item:hover { border-color: var(--border-hover); background: var(--bg-2); }
  .list-item-main { flex: 1; min-width: 0; }
  .list-item-title { font-size: 14px; font-weight: 500; color: var(--text-1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .list-item-sub { font-size: 12px; color: var(--text-2); margin-top: 2px; }

  /* Modal */
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
  .modal { background: var(--bg-1); border: 1px solid var(--border); border-radius: 16px; width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto; }
  .modal-header { padding: 20px 24px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
  .modal-title { font-size: 16px; font-weight: 600; }
  .modal-body { padding: 20px 24px; }
  .modal-footer { padding: 16px 24px; border-top: 1px solid var(--border); display: flex; gap: 8px; justify-content: flex-end; }

  /* Login */
  .login-page { min-height: 100vh; background: var(--bg-0); display: flex; align-items: center; justify-content: center; }
  .login-card { background: var(--bg-1); border: 1px solid var(--border); border-radius: 20px; padding: 40px; width: 100%; max-width: 380px; }
  .login-logo { display: flex; align-items: center; gap: 12px; margin-bottom: 32px; }
  .login-logo-icon { width: 44px; height: 44px; background: var(--text-1); border-radius: 50%; display: flex; align-items: center; justify-content: center; }

  /* Progress bar */
  .progress-bar { height: 3px; background: var(--bg-3); border-radius: 2px; overflow: hidden; margin-bottom: 24px; }
  .progress-fill { height: 100%; background: var(--accent); border-radius: 2px; transition: width 0.3s; }

  /* Step indicator */
  .steps { display: flex; gap: 6px; margin-bottom: 24px; }
  .step-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--bg-4); transition: background 0.2s; }
  .step-dot.active { background: var(--accent); width: 18px; border-radius: 3px; }
  .step-dot.done { background: var(--green); }

  /* Divider */
  .divider { height: 1px; background: var(--border); margin: 20px 0; }

  /* Empty state */
  .empty { text-align: center; padding: 60px 20px; color: var(--text-3); }
  .empty-icon { font-size: 32px; margin-bottom: 12px; }
  .empty-text { font-size: 14px; }

  /* Alert */
  .alert { padding: 12px 16px; border-radius: 8px; font-size: 13px; margin-bottom: 16px; }
  .alert-warning { background: var(--amber-dim); color: var(--amber); border: 1px solid rgba(245,158,11,0.2); }
  .alert-error { background: var(--red-dim); color: var(--red); border: 1px solid rgba(239,68,68,0.2); }
  .alert-success { background: var(--green-dim); color: var(--green); border: 1px solid rgba(34,197,94,0.2); }

  /* Map */
  .map-layout { display: grid; grid-template-columns: 320px 1fr; gap: 0; height: calc(100vh - 130px); border-radius: 12px; overflow: hidden; border: 1px solid var(--border); }
  .map-sidebar { background: var(--bg-1); overflow-y: auto; border-right: 1px solid var(--border); }
  .map-frame { background: var(--bg-2); }
  .map-frame iframe { width: 100%; height: 100%; border: none; }

  /* Ponto */
  .ponto-clock { font-size: 48px; font-weight: 300; font-family: var(--mono); color: var(--text-1); text-align: center; padding: 32px 0; }
  .ponto-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

  /* Ranking */
  .rank-item { display: flex; align-items: center; gap: 14px; padding: 14px 16px; background: var(--bg-1); border: 1px solid var(--border); border-radius: 10px; margin-bottom: 8px; }
  .rank-number { font-size: 18px; font-weight: 600; font-family: var(--mono); color: var(--text-3); width: 28px; text-align: center; flex-shrink: 0; }
  .rank-number.gold { color: #f59e0b; }
  .rank-number.silver { color: #9ca3af; }
  .rank-number.bronze { color: #b45309; }

  /* Responsivo */
  @media (max-width: 768px) {
    .sidebar { display: none; }
    .page { padding: 16px; }
    .stats-grid { grid-template-columns: 1fr 1fr; }
    .form-grid-2, .form-grid-3 { grid-template-columns: 1fr; }
    .map-layout { grid-template-columns: 1fr; grid-template-rows: 300px 1fr; }
  }
`;

// ============================================================
// AUTH CONTEXT
// ============================================================
const AuthContext = createContext(null);

const MOCK_USERS = [
  { id: "1", email: "admin@versalog.com", password: "123", full_name: "Marllon Augusto", role: "admin" },
  { id: "2", email: "gestor@versalog.com", password: "123", full_name: "Carlos Gestor", role: "gestor" },
  { id: "3", email: "entregador@versalog.com", password: "123", full_name: "João Entregador", role: "entregador" },
  { id: "4", email: "motorista@versalog.com", password: "123", full_name: "Pedro Motorista", role: "motorista" },
];

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);

  const login = async (email, password) => {
    setAuthLoading(true);
    try {
      // Try Supabase auth first
      const authData = await db.login(email, password);
      // Get user profile from usuarios table
      const users = await db.query('usuarios', { filter: { email } });
      if (users && users.length > 0) {
        setUser({ ...users[0], token: authData.access_token });
        setAuthLoading(false);
        return true;
      }
      // Fallback: create user profile if not exists
      setUser({ id: authData.user?.id, email, full_name: email.split('@')[0], role: 'admin' });
      setAuthLoading(false);
      return true;
    } catch(e) {
      // Fallback to mock for demo
      const found = MOCK_USERS.find(u => u.email === email && u.password === password);
      if (found) { setUser(found); setAuthLoading(false); return true; }
      setAuthLoading(false);
      return false;
    }
  };

  const logout = () => { setUser(null); };

  return <AuthContext.Provider value={{ user, login, logout, authLoading }}>{children}</AuthContext.Provider>;
}

const useAuth = () => useContext(AuthContext);

// ============================================================
// ICONS (inline SVG)
// ============================================================
const Icon = ({ name, size = 16 }) => {
  const icons = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    orders: <><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></>,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></>,
    ranking: <><polyline points="18 20 18 10"/><polyline points="12 20 12 4"/><polyline points="6 20 6 14"/></>,
    wrench: <><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></>,
    check: <><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></>,
    team: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>,
    map: <><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></>,
    route: <><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 000-7h-11a3.5 3.5 0 010-7H15"/><circle cx="18" cy="5" r="3"/></>,
    clock: <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    upload: <><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></>,
    edit: <><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    trash: <><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></>,
    x: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    chevron: <polyline points="9 18 15 12 9 6"/>,
    search: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    logout: <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    alert: <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
    truck: <><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></>,
    pin: <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></>,
    pdf: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></>,
    phone: <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 014.07 8.91 19.79 19.79 0 011 .29a2 2 0 012.11-2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 6.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 13.92z"/>,
    star: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  );
};

// ============================================================
// LOGO COMPONENT
// ============================================================
const VersaLogo = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="5"/>
    <path d="M14 34 L31 69 L48 34" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M52 69 L69 34 L86 69" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ============================================================
// STATUS HELPERS
// ============================================================
const statusBadge = (status) => {
  const map = {
    "Pendente": "badge-gray", "Separando": "badge-accent", "Pronto para Rota": "badge-blue",
    "Em Rota": "badge-blue", "Entregue": "badge-green", "Problema": "badge-red",
    "Remarcado": "badge-amber", "Cancelado": "badge-gray",
    "Aberto": "badge-amber", "Em andamento": "badge-blue", "Concluído": "badge-green",
    "Aprovado": "badge-green", "Reprovado": "badge-red",
    "Ativa": "badge-green", "Inativa": "badge-gray",
  };
  return map[status] || "badge-gray";
};

const deliveryDate = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const today = new Date(); today.setHours(0,0,0,0);
  d.setHours(0,0,0,0);
  const fmt = d.toLocaleDateString("pt-BR");
  if (d < today) return { text: `Atrasado — ${fmt}`, color: "var(--red)" };
  if (d.getTime() === today.getTime()) return { text: `Hoje, ${fmt}`, color: "var(--green)" };
  return { text: fmt, color: "var(--text-2)" };
};

// ============================================================
// REAL DATA - Supabase
// ============================================================
const useAppData = () => {
  const { user } = useAuth();
  const [pedidos, setPedidosState] = useState([]);
  const [assistencias, setAssistenciasState] = useState([]);
  const [pontos, setPontosState] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadPedidos = async () => {
    try {
      const data = await db.query('pedidos', { order: 'created_at.desc' });
      setPedidosState(data || []);
    } catch(e) { console.error('Erro pedidos:', e); setPedidosState([]); }
  };

  const loadAssistencias = async () => {
    try {
      const data = await db.query('assistencias', { order: 'created_at.desc' });
      setAssistenciasState(data || []);
    } catch(e) { console.error('Erro assistencias:', e); setAssistenciasState([]); }
  };

  const loadPontos = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const data = await db.query('pontos', { filter: { data: today }, order: 'data_hora.desc' });
      setPontosState(data || []);
    } catch(e) { console.error('Erro pontos:', e); setPontosState([]); }
  };

  useEffect(() => {
    if (user) {
      setLoading(true);
      Promise.all([loadPedidos(), loadAssistencias(), loadPontos()])
        .finally(() => setLoading(false));
    }
  }, [user?.id]);

  const setPedidos = async (updaterOrArray) => {
    if (typeof updaterOrArray === 'function') {
      setPedidosState(updaterOrArray);
    } else {
      setPedidosState(updaterOrArray);
    }
  };

  const setAssistencias = async (updaterOrArray) => {
    if (typeof updaterOrArray === 'function') {
      setAssistenciasState(updaterOrArray);
    } else {
      setAssistenciasState(updaterOrArray);
    }
  };

  const setPontos = async (updaterOrArray) => {
    if (typeof updaterOrArray === 'function') {
      setPontosState(updaterOrArray);
    } else {
      setPontosState(updaterOrArray);
    }
  };

  const savePedido = async (pedido) => {
    try {
      const { id, ...data } = pedido;
      const result = await db.insert('pedidos', data);
      await loadPedidos();
      return result[0];
    } catch(e) { console.error('Erro salvar pedido:', e); throw e; }
  };

  const updatePedido = async (id, data) => {
    try {
      await db.update('pedidos', id, { ...data, updated_at: new Date().toISOString() });
      await loadPedidos();
    } catch(e) { console.error('Erro update pedido:', e); throw e; }
  };

  const saveAssistencia = async (assistencia) => {
    try {
      const { id, produtos, ...data } = assistencia;
      data.prazo = new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0];
      const result = await db.insert('assistencias', data);
      const assistenciaId = result[0].id;
      if (produtos && produtos.length > 0) {
        for (const p of produtos) {
          await db.insert('assistencia_itens', {
            assistencia_id: assistenciaId,
            produto: p.produto,
            fornecedor: p.fornecedor,
            motivo: p.motivo,
            descricao: p.descricao,
            status: 'Aberto',
            prazo: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0]
          });
        }
      }
      await loadAssistencias();
      return result[0];
    } catch(e) { console.error('Erro salvar assistencia:', e); throw e; }
  };

  const savePonto = async (ponto) => {
    try {
      const result = await db.insert('pontos', ponto);
      await loadPontos();
      return result[0];
    } catch(e) { console.error('Erro salvar ponto:', e); throw e; }
  };

  const importarPedidos = async (lista) => {
    try {
      for (const p of lista) {
        const { id, produtos, selected, erro, ...pedidoData } = p;
        const result = await db.insert('pedidos', pedidoData);
        const pedidoId = result[0].id;
        if (produtos && produtos.length > 0) {
          for (const prod of produtos) {
            await db.insert('produtos', {
              pedido_id: pedidoId,
              nome_produto: prod.nome_produto,
              quantidade: prod.quantidade || 1,
              status_produto: 'Pendente'
            });
          }
        }
      }
      await loadPedidos();
    } catch(e) { console.error('Erro importar pedidos:', e); throw e; }
  };

  return {
    pedidos, setPedidos,
    assistencias, setAssistencias,
    pontos, setPontos,
    loading,
    savePedido, updatePedido,
    saveAssistencia, savePonto,
    importarPedidos,
    reload: () => Promise.all([loadPedidos(), loadAssistencias(), loadPontos()])
  };
};

// ============================================================
// LOGIN PAGE
// ============================================================
function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    const ok = await login(email, password);
    if (!ok) setError("Email ou senha incorretos");
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon"><VersaLogo size={26} /></div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>VERSA LOG</div>
            <div style={{ fontSize: 11, color: "var(--text-3)" }}>Sistema de logística</div>
          </div>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="form-input" type="text" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" />
        </div>
        <div className="form-group">
          <label className="form-label">Senha</label>
          <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => { if(e.key === "Enter") handleLogin(); }} />
        </div>
        <button className="btn btn-primary" style={{ width: "100%", marginTop: 8, justifyContent: "center", padding: 12 }} onClick={handleLogin} disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
        <div style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
          <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 8, textAlign: "center" }}>Acesso rápido para teste:</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[["Admin", "admin@versalog.com"], ["Gestor", "gestor@versalog.com"], ["Entregador", "entregador@versalog.com"]].map(([label, em]) => (
              <button key={label} className="btn btn-secondary" style={{ justifyContent: "center", fontSize: 12 }} onClick={() => login(em, "123")}>
                Entrar como {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SIDEBAR
// ============================================================
function Sidebar({ page, setPage }) {
  const { user, logout } = useAuth();
  const isGestor = ["admin", "gestor"].includes(user?.role);
  const isEntregador = ["entregador", "motorista"].includes(user?.role);

  const gestaoItems = [
    { id: "dashboard", icon: "dashboard", label: "Painel" },
    { id: "pedidos", icon: "orders", label: "Pedidos" },
    { id: "agenda", icon: "calendar", label: "Agenda" },
    { id: "ranking", icon: "ranking", label: "Ranking" },
    { id: "assistencia", icon: "wrench", label: "Assistência" },
    { id: "conferencia", icon: "check", label: "Conferência" },
    { id: "equipe", icon: "team", label: "Equipe" },
    { id: "mapa", icon: "map", label: "Mapa do Dia" },
  ];

  const entregaItems = [
    { id: "rota", icon: "route", label: "Minha Rota" },
    { id: "ponto", icon: "clock", label: "Ponto" },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon"><VersaLogo size={18} /></div>
        <span className="sidebar-logo-text">VERSA LOG</span>
      </div>

      {isGestor && (
        <div className="sidebar-section">
          <div className="sidebar-section-label">Gestão</div>
          {gestaoItems.map(item => (
            <button key={item.id} className={`nav-item ${page === item.id ? "active" : ""}`} onClick={() => setPage(item.id)}>
              <Icon name={item.icon} size={15} />
              {item.label}
            </button>
          ))}
        </div>
      )}

      <div className="sidebar-section" style={{ marginTop: isGestor ? 8 : 0 }}>
        <div className="sidebar-section-label">Entregas</div>
        {entregaItems.map(item => (
          <button key={item.id} className={`nav-item ${page === item.id ? "active" : ""}`} onClick={() => setPage(item.id)}>
            <Icon name={item.icon} size={15} />
            {item.label}
          </button>
        ))}
      </div>

      <div className="sidebar-user">
        <div className="avatar">{user?.full_name?.charAt(0)}</div>
        <div className="sidebar-user-info">
          <div className="sidebar-user-name">{user?.full_name}</div>
          <div className="sidebar-user-role" style={{ textTransform: "capitalize" }}>{user?.role}</div>
        </div>
        <button className="btn btn-ghost btn-icon" onClick={logout} title="Sair">
          <Icon name="logout" size={14} />
        </button>
      </div>
    </div>
  );
}

// ============================================================
// DASHBOARD
// ============================================================
function Dashboard({ pedidos }) {
  const hoje = new Date().toISOString().split("T")[0];
  const pedidosHoje = pedidos.filter(p => p.data_entrega === hoje);
  const stats = [
    { label: "Total do dia", value: pedidosHoje.length, icon: "orders", color: "var(--accent)", bg: "var(--accent-dim)" },
    { label: "Entregues", value: pedidosHoje.filter(p => p.status === "Entregue").length, icon: "check", color: "var(--green)", bg: "var(--green-dim)" },
    { label: "Em Rota", value: pedidosHoje.filter(p => p.status === "Em Rota").length, icon: "truck", color: "var(--blue)", bg: "var(--blue-dim)" },
    { label: "Problemas", value: pedidosHoje.filter(p => p.status === "Problema").length, icon: "alert", color: "var(--red)", bg: "var(--red-dim)" },
    { label: "Remarcados", value: pedidos.filter(p => p.status === "Remarcado").length, icon: "calendar", color: "var(--amber)", bg: "var(--amber-dim)" },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Painel de Operações</div>
        <div className="page-subtitle">{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</div>
      </div>

      <div className="stats-grid">
        {stats.map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-icon" style={{ background: s.bg, color: s.color }}><Icon name={s.icon} size={16} /></div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 16 }}>Pedidos de hoje</div>
        {pedidosHoje.length === 0 ? (
          <div className="empty"><div className="empty-text">Nenhum pedido para hoje</div></div>
        ) : pedidosHoje.map(p => (
          <div className="list-item" key={p.id}>
            <div className="list-item-main">
              <div className="list-item-title">{p.cliente}</div>
              <div className="list-item-sub">Pedido #{p.numero_pedido} · {p.endereco}</div>
            </div>
            <span className={`badge ${statusBadge(p.status)}`}>{p.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// PEDIDOS
// ============================================================
function Pedidos({ pedidos, setPedidos, importarPedidos }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [lojaFilter, setLojaFilter] = useState("Todas");
  const [selected, setSelected] = useState(null);
  const [showTrocarModal, setShowTrocarModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [newEntregador, setNewEntregador] = useState("");
  const [motivoTroca, setMotivoTroca] = useState("");
  const { user } = useAuth();
  const isGestor = ["admin", "gestor"].includes(user?.role);

  const lojas = ["Todas", ...new Set(pedidos.map(p => p.local_separacao).filter(Boolean))];
  const statuses = ["Todos", "Pendente", "Separando", "Pronto para Rota", "Em Rota", "Entregue", "Problema", "Remarcado", "Cancelado"];

  const filtered = pedidos.filter(p => {
    const matchSearch = !search || p.cliente.toLowerCase().includes(search.toLowerCase()) || p.numero_pedido.includes(search);
    const matchStatus = statusFilter === "Todos" || p.status === statusFilter;
    const matchLoja = lojaFilter === "Todas" || p.local_separacao === lojaFilter;
    return matchSearch && matchStatus && matchLoja;
  });

  const confirmarTroca = () => {
    if (!newEntregador || !selected) return;
    const entregadores = [
      { id: "3", nome: "João Entregador" },
      { id: "4", nome: "Pedro Motorista" },
    ];
    const ent = entregadores.find(e => e.id === newEntregador);
    setPedidos(prev => prev.map(p => p.id === selected.id
      ? { ...p, entregador_id: ent.id, entregador_nome: ent.nome }
      : p
    ));
    setSelected(prev => ({ ...prev, entregador_id: ent.id, entregador_nome: ent.nome }));
    setShowTrocarModal(false);
    setMotivoTroca("");
  };

  const podeEmRota = (p) => p.entregador_id && p.entregador_nome;

  const avancarStatus = (pedido) => {
    const flow = { "Pendente": "Separando", "Separando": "Pronto para Rota", "Pronto para Rota": "Em Rota", "Em Rota": "Entregue" };
    if (pedido.status === "Pronto para Rota" && !podeEmRota(pedido)) {
      alert("Defina um entregador antes de enviar para rota.");
      return;
    }
    const next = flow[pedido.status];
    if (!next) return;
    setPedidos(prev => prev.map(p => p.id === pedido.id ? { ...p, status: next } : p));
    if (selected?.id === pedido.id) setSelected(prev => ({ ...prev, status: next }));
  };

  if (selected) {
    const date = deliveryDate(selected.data_entrega);
    const canChangeToRota = podeEmRota(selected);

    return (
      <div className="page">
        <div className="page-header-row" style={{ marginBottom: 20 }}>
          <button className="btn btn-ghost" onClick={() => setSelected(null)}>
            ← Voltar
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-secondary btn-sm"><Icon name="pdf" size={13} /> Gerar PDF</button>
            {isGestor && <button className="btn btn-secondary btn-sm"><Icon name="edit" size={13} /></button>}
          </div>
        </div>

        <span className={`badge ${statusBadge(selected.status)}`} style={{ marginBottom: 8 }}>{selected.status}</span>
        <div className="page-title" style={{ marginBottom: 2 }}>{selected.cliente}</div>
        <div style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 4 }}>Pedido #{selected.numero_pedido}</div>
        {date && (
          <div style={{ fontSize: 13, color: date.color, marginBottom: 20, display: "flex", alignItems: "center", gap: 6 }}>
            📅 Entrega: {date.text}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
          <div className="card-sm" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <Icon name="pin" size={15} style={{ color: "var(--text-2)" }} />
              <div>
                <div style={{ fontSize: 13 }}>{selected.endereco}</div>
                <div style={{ fontSize: 12, color: "var(--text-2)" }}>{selected.cidade}</div>
              </div>
            </div>
            <button className="btn btn-secondary btn-sm">Maps</button>
          </div>

          <div className="card-sm" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <Icon name="phone" size={15} />
              <span style={{ fontSize: 13 }}>{selected.telefone}</span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn btn-secondary btn-sm">Ligar</button>
              <button className="btn btn-secondary btn-sm" style={{ color: "var(--green)" }}>WhatsApp</button>
            </div>
          </div>

          <div className="card-sm" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <Icon name="team" size={15} />
              <span style={{ fontSize: 13, color: selected.entregador_nome ? "var(--text-1)" : "var(--text-3)" }}>
                {selected.entregador_nome || "Sem entregador"}
              </span>
            </div>
            {isGestor && ["Pendente","Separando","Pronto para Rota","Em Rota"].includes(selected.status) && (
              <button className="btn btn-secondary btn-sm" onClick={() => setShowTrocarModal(true)}>
                <Icon name="edit" size={12} /> Alterar
              </button>
            )}
          </div>
        </div>

        {selected.observacoes && (
          <div className="alert alert-warning" style={{ marginBottom: 16 }}>
            {selected.observacoes}
          </div>
        )}

        {!canChangeToRota && ["Pendente","Separando","Pronto para Rota"].includes(selected.status) && (
          <div className="alert alert-error" style={{ marginBottom: 16 }}>
            ⚠ Defina um entregador antes de enviar para rota.
          </div>
        )}

        {isGestor && !["Entregue","Cancelado"].includes(selected.status) && (
          <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
            <button className="btn btn-secondary" style={{ flex: 1, justifyContent: "center", color: "var(--amber)" }}>
              📅 Remarcar
            </button>
            <button className="btn btn-danger" style={{ flex: 1, justifyContent: "center" }}>
              Cancelar
            </button>
          </div>
        )}

        {isGestor && ["Pendente","Separando","Pronto para Rota","Em Rota"].includes(selected.status) && (
          <button
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center", marginBottom: 24, opacity: (selected.status === "Pronto para Rota" && !canChangeToRota) ? 0.4 : 1 }}
            disabled={selected.status === "Pronto para Rota" && !canChangeToRota}
            onClick={() => avancarStatus(selected)}
          >
            Avançar status →
          </button>
        )}

        <div style={{ fontWeight: 600, marginBottom: 12 }}>Histórico</div>
        <div className="card-sm">
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--accent-dim)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon name="check" size={13} style={{ color: "var(--accent)" }} />
            </div>
            <div>
              <div style={{ fontSize: 13 }}>Pedido criado</div>
              <div style={{ fontSize: 12, color: "var(--text-2)" }}>por {user?.full_name} · {new Date().toLocaleDateString("pt-BR")}</div>
            </div>
          </div>
        </div>

        {showImport && (
          <ImportarLoteModal
            onClose={() => setShowImport(false)}
            onImport={async (novos) => {
              try {
                await importarPedidos(novos);
              } catch(e) {
                setPedidos(prev => [...novos.map(p => ({...p, id: `p_${Date.now()}_${Math.random()}`})), ...prev]);
              }
              setShowImport(false);
            }}
          />
        )}
        {showTrocarModal && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <div className="modal-title">Trocar entregador</div>
                <button className="btn btn-ghost btn-icon" onClick={() => setShowTrocarModal(false)}><Icon name="x" size={16} /></button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Novo entregador</label>
                  <select className="form-input" value={newEntregador} onChange={e => setNewEntregador(e.target.value)}>
                    <option value="">Selecione...</option>
                    <option value="3">João Entregador</option>
                    <option value="4">Pedro Motorista</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Motivo (opcional)</label>
                  <input className="form-input" placeholder="Ex: entregador indisponível..." value={motivoTroca} onChange={e => setMotivoTroca(e.target.value)} />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowTrocarModal(false)}>Cancelar</button>
                <button className="btn btn-primary" onClick={confirmarTroca} disabled={!newEntregador}>Confirmar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header-row page-header">
        <div>
          <div className="page-title">Pedidos</div>
          <div className="page-subtitle">{filtered.length} pedidos encontrados</div>
        </div>
        {isGestor && (
          <div className="page-actions">
            <button className="btn btn-secondary" onClick={() => setShowImport(true)}><Icon name="upload" size={14} /> Importar em Lote</button>
            <button className="btn btn-primary"><Icon name="plus" size={14} /> Novo</button>
          </div>
        )}
      </div>

      <div className="filters">
        <input className="search-input" placeholder="Buscar cliente ou pedido..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="form-input" style={{ width: "auto", padding: "7px 10px" }} value={lojaFilter} onChange={e => setLojaFilter(e.target.value)}>
          {lojas.map(l => <option key={l}>{l}</option>)}
        </select>
      </div>

      <div className="filters">
        {statuses.map(s => (
          <button key={s} className={`filter-btn ${statusFilter === s ? "active" : ""}`} onClick={() => setStatusFilter(s)}>{s}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty"><div className="empty-icon">📦</div><div className="empty-text">Nenhum pedido encontrado</div></div>
      ) : filtered.map(p => {
        const date = deliveryDate(p.data_entrega);
        return (
          <div className="list-item" key={p.id} onClick={() => setSelected(p)}>
            <div className="list-item-main">
              <div className="list-item-title">{p.cliente}</div>
              <div className="list-item-sub">
                Pedido #{p.numero_pedido} · {p.endereco}, {p.cidade}
              </div>
              {date && <div style={{ fontSize: 11, color: date.color, marginTop: 2 }}>📅 {date.text}</div>}
            </div>
            <div style={{ display: "flex", flex: "column", alignItems: "flex-end", gap: 4 }}>
              <span className={`badge ${statusBadge(p.status)}`}>{p.status}</span>
              {p.prioridade !== "Normal" && <span className="badge badge-amber" style={{ marginTop: 4 }}>{p.prioridade}</span>}
            </div>
            <Icon name="chevron" size={14} style={{ color: "var(--text-3)", flexShrink: 0 }} />
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// AGENDA
// ============================================================
function Agenda({ pedidos }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = currentDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const getPedidosDia = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return pedidos.filter(p => p.data_entrega === dateStr);
  };

  const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="page">
      <div className="page-header-row page-header">
        <div className="page-title" style={{ textTransform: "capitalize" }}>{monthName}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setCurrentDate(new Date(year, month - 1, 1))}>←</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setCurrentDate(new Date(year, month + 1, 1))}>→</button>
        </div>
      </div>

      <div className="card">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1 }}>
          {days.map(d => (
            <div key={d} style={{ padding: "8px 4px", textAlign: "center", fontSize: 11, color: "var(--text-3)", fontWeight: 500 }}>{d}</div>
          ))}
          {Array(firstDay).fill(null).map((_, i) => <div key={`e${i}`} />)}
          {Array(daysInMonth).fill(null).map((_, i) => {
            const day = i + 1;
            const ps = getPedidosDia(day);
            const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
            return (
              <div key={day} style={{ padding: "8px 6px", minHeight: 60, borderRadius: 6, background: isToday ? "var(--accent-dim)" : "transparent", border: isToday ? "1px solid var(--accent)" : "1px solid transparent" }}>
                <div style={{ fontSize: 12, fontWeight: isToday ? 600 : 400, color: isToday ? "var(--accent)" : "var(--text-2)", marginBottom: 4 }}>{day}</div>
                {ps.slice(0, 2).map(p => (
                  <div key={p.id} style={{ fontSize: 10, padding: "2px 4px", borderRadius: 3, background: "var(--bg-3)", color: "var(--text-2)", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.cliente.split(" ")[0]}
                  </div>
                ))}
                {ps.length > 2 && <div style={{ fontSize: 10, color: "var(--accent)" }}>+{ps.length - 2}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// RANKING
// ============================================================
function Ranking({ pedidos }) {
  const entregadores = {};
  pedidos.forEach(p => {
    if (!p.entregador_nome) return;
    if (!entregadores[p.entregador_nome]) entregadores[p.entregador_nome] = { total: 0, entregues: 0, problemas: 0 };
    entregadores[p.entregador_nome].total++;
    if (p.status === "Entregue") entregadores[p.entregador_nome].entregues++;
    if (p.status === "Problema") entregadores[p.entregador_nome].problemas++;
  });

  const ranking = Object.entries(entregadores)
    .map(([nome, data]) => ({ nome, ...data, taxa: data.total ? Math.round((data.entregues / data.total) * 100) : 0 }))
    .sort((a, b) => b.taxa - a.taxa);

  const medalhas = ["gold", "silver", "bronze"];

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Ranking de Entregadores</div>
        <div className="page-subtitle">Baseado na taxa de conclusão</div>
      </div>

      {ranking.length === 0 ? (
        <div className="empty"><div className="empty-icon">🏆</div><div className="empty-text">Sem dados suficientes ainda</div></div>
      ) : ranking.map((r, i) => (
        <div className="rank-item" key={r.nome}>
          <div className={`rank-number ${medalhas[i] || ""}`}>{i + 1}</div>
          <div className="avatar">{r.nome.charAt(0)}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500 }}>{r.nome}</div>
            <div style={{ fontSize: 12, color: "var(--text-2)" }}>{r.entregues} entregues · {r.problemas} problemas</div>
            <div style={{ marginTop: 6, height: 4, background: "var(--bg-3)", borderRadius: 2 }}>
              <div style={{ width: `${r.taxa}%`, height: "100%", background: "var(--green)", borderRadius: 2 }} />
            </div>
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, fontFamily: "var(--mono)", color: r.taxa >= 80 ? "var(--green)" : r.taxa >= 50 ? "var(--amber)" : "var(--red)" }}>
            {r.taxa}%
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// ASSISTENCIA
// ============================================================
function NovaAssistenciaModal({ onClose, onSave, pedidoPreenchido }) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [dados, setDados] = useState({
    solicitante: user?.full_name || "",
    telefone: pedidoPreenchido?.telefone || "",
    numero_pedido: pedidoPreenchido?.numero_pedido || "",
    cliente: pedidoPreenchido?.cliente || "",
  });
  const [produtos, setProdutos] = useState([
    { id: 1, produto: pedidoPreenchido?.produto || "", fornecedor: "", motivo: "", descricao: "", fotos: [] }
  ]);

  const motivos = ["Avaria", "Defeito de fabricação", "Erro de acabamento", "Item incorreto", "Outros"];

  const addProduto = () => setProdutos(prev => [...prev, { id: Date.now(), produto: "", fornecedor: "", motivo: "", descricao: "", fotos: [] }]);
  const removeProduto = (id) => setProdutos(prev => prev.filter(p => p.id !== id));
  const updateProduto = (id, field, value) => setProdutos(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));

  const handleSave = () => {
    const assistencia = {
      id: Date.now().toString(),
      numero: `AS-${String(Date.now()).slice(-4)}`,
      cliente: dados.cliente,
      telefone: dados.telefone,
      pedido_ref: dados.numero_pedido,
      data_abertura: new Date().toISOString().split("T")[0],
      status: "Aberto",
      tipo_problema: produtos[0]?.motivo || "Outros",
      observacoes: produtos[0]?.descricao || "",
      responsavel_nome: user?.full_name,
      origem: "formulário",
      produtos: produtos,
    };
    onSave(assistencia);
    onClose();
  };

  const steps = ["Dados gerais", "Produtos", "Confirmar"];
  const canNext0 = dados.cliente && dados.solicitante;
  const canNext1 = produtos.every(p => p.produto && p.motivo && p.descricao);

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 580 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Nova Assistência Técnica</div>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>Etapa {step + 1} de {steps.length} — {steps[step]}</div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>

        <div style={{ padding: "12px 24px 0" }}>
          <div className="steps">
            {steps.map((s, i) => (
              <div key={s} className={`step-dot ${i === step ? "active" : i < step ? "done" : ""}`} />
            ))}
          </div>
        </div>

        <div className="modal-body">
          {step === 0 && (
            <div>
              {pedidoPreenchido && (
                <div className="alert alert-success" style={{ marginBottom: 16 }}>
                  ✓ Dados preenchidos automaticamente do pedido #{pedidoPreenchido.numero_pedido}
                </div>
              )}
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Solicitante *</label>
                  <input className="form-input" value={dados.solicitante} onChange={e => setDados(p => ({...p, solicitante: e.target.value}))} placeholder="Nome de quem abre" />
                </div>
                <div className="form-group">
                  <label className="form-label">Telefone</label>
                  <input className="form-input" value={dados.telefone} onChange={e => setDados(p => ({...p, telefone: e.target.value}))} placeholder="(00) 00000-0000" />
                </div>
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Nº do Pedido</label>
                  <input className="form-input" value={dados.numero_pedido} onChange={e => setDados(p => ({...p, numero_pedido: e.target.value}))} placeholder="Ex: 39799" />
                </div>
                <div className="form-group">
                  <label className="form-label">Cliente *</label>
                  <input className="form-input" value={dados.cliente} onChange={e => setDados(p => ({...p, cliente: e.target.value}))} placeholder="Nome do cliente" />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: "var(--text-2)" }}>{produtos.length} produto(s) adicionado(s)</div>
                <button className="btn btn-secondary btn-sm" onClick={addProduto}><Icon name="plus" size={12} /> Adicionar produto</button>
              </div>
              {produtos.map((p, i) => (
                <div key={p.id} style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 10, padding: 16, marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)" }}>Produto {i + 1}</div>
                    {produtos.length > 1 && (
                      <button className="btn btn-ghost btn-sm" style={{ color: "var(--red)" }} onClick={() => removeProduto(p.id)}><Icon name="trash" size={12} /></button>
                    )}
                  </div>
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">Nome do produto *</label>
                      <input className="form-input" value={p.produto} onChange={e => updateProduto(p.id, "produto", e.target.value)} placeholder="Ex: Sofá Bless" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Fornecedor / Fábrica</label>
                      <input className="form-input" value={p.fornecedor} onChange={e => updateProduto(p.id, "fornecedor", e.target.value)} placeholder="Ex: Templum" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Motivo *</label>
                    <select className="form-input" value={p.motivo} onChange={e => updateProduto(p.id, "motivo", e.target.value)}>
                      <option value="">Selecione o motivo...</option>
                      {motivos.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 8 }}>
                    <label className="form-label">Descrição do problema *</label>
                    <textarea className="form-input" rows={3} value={p.descricao} onChange={e => updateProduto(p.id, "descricao", e.target.value)} placeholder="Descreva o problema detalhadamente..." style={{ resize: "none" }} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Fotos</label>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      {p.fotos.map((f, fi) => (
                        <div key={fi} style={{ width: 48, height: 48, background: "var(--bg-3)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📷</div>
                      ))}
                      <div style={{ width: 48, height: 48, background: "var(--bg-3)", borderRadius: 6, border: "1px dashed var(--border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18 }}
                        onClick={() => updateProduto(p.id, "fotos", [...p.fotos, "foto"])}>+</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="card-sm" style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>Dados gerais</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13 }}>
                  <div><span style={{ color: "var(--text-2)" }}>Solicitante: </span>{dados.solicitante}</div>
                  <div><span style={{ color: "var(--text-2)" }}>Cliente: </span>{dados.cliente}</div>
                  <div><span style={{ color: "var(--text-2)" }}>Pedido: </span>#{dados.numero_pedido || "—"}</div>
                  <div><span style={{ color: "var(--text-2)" }}>Telefone: </span>{dados.telefone || "—"}</div>
                </div>
              </div>
              {produtos.map((p, i) => (
                <div key={p.id} className="card-sm" style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: "var(--accent)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Produto {i + 1}</div>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{p.produto}</div>
                  <div style={{ fontSize: 12, color: "var(--text-2)" }}>{p.motivo} · {p.fornecedor || "Fornecedor não informado"}</div>
                  <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 4 }}>{p.descricao}</div>
                  <div style={{ marginTop: 6 }}>
                    <span className="badge badge-amber">Prazo: 30 dias</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          {step > 0 && <button className="btn btn-secondary" onClick={() => setStep(s => s - 1)}>← Voltar</button>}
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          {step < 2 && (
            <button className="btn btn-primary" disabled={step === 0 ? !canNext0 : !canNext1} onClick={() => setStep(s => s + 1)}>
              Continuar →
            </button>
          )}
          {step === 2 && (
            <button className="btn btn-primary" style={{ background: "var(--green)" }} onClick={handleSave}>
              ✓ Confirmar abertura
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Import em Lote Modal
function ImportarLoteModal({ onClose, onImport }) {
  const [files, setFiles] = useState([]);
  const [step, setStep] = useState(0); // 0=upload, 1=preview, 2=done
  const [pedidosExtraidos, setPedidosExtraidos] = useState([]);
  const [processando, setProcessando] = useState(false);
  const [progresso, setProgresso] = useState(0);

  const MOCK_EXTRACTIONS = [
    { numero_pedido: "40001", cliente: "MARIA SILVA SANTOS", telefone: "(31) 99111-2222", endereco: "Rua das Flores 123", cidade: "Belo Horizonte", data_entrega: new Date().toISOString().split("T")[0], status: "Pendente", prioridade: "Normal", local_separacao: "TEMPLUM MINAS LTDA", produtos: [{ nome_produto: "SOFÁ OSLO - BEGE", quantidade: 1 }], selected: true, erro: null },
    { numero_pedido: "40002", cliente: "JOÃO PEDRO ALVES", telefone: "(31) 98222-3333", endereco: "Av. Afonso Pena 500", cidade: "Belo Horizonte", data_entrega: "2026-05-01", status: "Pendente", prioridade: "Alta", local_separacao: "SANTA COMERCIO DE MOVEIS LTDA", produtos: [{ nome_produto: "MESA CENTER - NOGUEIRA", quantidade: 1 }, { nome_produto: "CADEIRA TULIPA - BEGE", quantidade: 4 }], selected: true, erro: "data_passada" },
    { numero_pedido: "40003", cliente: "ANA PAULA FERREIRA", telefone: "(31) 97333-4444", endereco: "Rua Padre Eustáquio 800", cidade: "Belo Horizonte", data_entrega: new Date().toISOString().split("T")[0], status: "Pendente", prioridade: "Normal", local_separacao: "TEMPLUM MINAS LTDA", produtos: [{ nome_produto: "POLTRONA BLESS - CINZA", quantidade: 2 }], selected: true, erro: null },
  ];

  const handleFiles = (e) => {
    const selected = Array.from(e.target.files);
    setFiles(selected);
  };

  const processar = async () => {
    setProcessando(true);
    for (let i = 0; i < files.length; i++) {
      setProgresso(Math.round(((i + 1) / files.length) * 100));
      await new Promise(r => setTimeout(r, 600));
    }
    setPedidosExtraidos(MOCK_EXTRACTIONS.slice(0, Math.max(files.length, 1)));
    setProcessando(false);
    setStep(1);
  };

  const toggleSelect = (idx) => {
    setPedidosExtraidos(prev => prev.map((p, i) => i === idx ? { ...p, selected: !p.selected } : p));
  };

  const updateData = (idx, field, value) => {
    setPedidosExtraidos(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const confirmar = () => {
    const selecionados = pedidosExtraidos.filter(p => p.selected).map(p => ({
      ...p, id: `p_${Date.now()}_${Math.random()}`,
    }));
    onImport(selecionados);
    setStep(2);
  };

  const dataPassada = (dateStr) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date(new Date().toDateString());
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 680 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Importar Fichas em Lote</div>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
              {step === 0 && "Selecione os PDFs das fichas de entrega"}
              {step === 1 && `${pedidosExtraidos.filter(p => p.selected).length} de ${pedidosExtraidos.length} pedidos selecionados`}
              {step === 2 && "Importação concluída"}
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>

        <div className="modal-body">
          {step === 0 && (
            <div>
              <label style={{ display: "block", background: "var(--bg-2)", border: "2px dashed var(--border)", borderRadius: 12, padding: 40, textAlign: "center", cursor: "pointer" }}>
                <input type="file" multiple accept=".pdf,.jpg,.png" onChange={handleFiles} style={{ display: "none" }} />
                <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
                <div style={{ fontWeight: 500, marginBottom: 4 }}>Toque para selecionar arquivos</div>
                <div style={{ fontSize: 12, color: "var(--text-2)" }}>PDF, JPG ou PNG · Múltiplos arquivos permitidos</div>
              </label>

              {files.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 8 }}>{files.length} arquivo(s) selecionado(s):</div>
                  {files.map((f, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "var(--bg-2)", borderRadius: 6, marginBottom: 6 }}>
                      <span style={{ fontSize: 16 }}>📄</span>
                      <span style={{ fontSize: 12, flex: 1 }}>{f.name}</span>
                      <button className="btn btn-ghost btn-sm" style={{ color: "var(--red)" }} onClick={() => setFiles(prev => prev.filter((_, fi) => fi !== i))}>
                        <Icon name="x" size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {processando && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 8 }}>Processando fichas... {progresso}%</div>
                  <div className="progress-bar"><div className="progress-fill" style={{ width: `${progresso}%` }} /></div>
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div>
              {pedidosExtraidos.map((p, i) => (
                <div key={i} style={{ background: p.erro === "data_passada" ? "rgba(245,158,11,0.05)" : "var(--bg-2)", border: `1px solid ${p.erro ? "rgba(245,158,11,0.3)" : "var(--border)"}`, borderRadius: 10, padding: 14, marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <input type="checkbox" checked={p.selected} onChange={() => toggleSelect(i)} style={{ marginTop: 3, cursor: "pointer" }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{p.cliente}</div>
                        <span style={{ fontSize: 11, color: "var(--text-2)" }}>#{p.numero_pedido}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 6 }}>{p.endereco} · {p.local_separacao}</div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <input type="date" value={p.data_entrega} onChange={e => updateData(i, "data_entrega", e.target.value)}
                          style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 8px", color: "var(--text-1)", fontSize: 12, fontFamily: "var(--font)" }} />
                        <select value={p.prioridade} onChange={e => updateData(i, "prioridade", e.target.value)}
                          style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 8px", color: "var(--text-1)", fontSize: 12, fontFamily: "var(--font)" }}>
                          <option>Normal</option><option>Alta</option><option>Urgente</option>
                        </select>
                        <span style={{ fontSize: 11, color: "var(--text-2)" }}>{p.produtos.length} produto(s)</span>
                      </div>
                      {p.erro === "data_passada" && dataPassada(p.data_entrega) && (
                        <div style={{ marginTop: 8, fontSize: 11, color: "var(--amber)", background: "var(--amber-dim)", padding: "4px 8px", borderRadius: 4 }}>
                          ⚠ Data no passado — verifique antes de confirmar
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === 2 && (
            <div style={{ textAlign: "center", padding: 32 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Importação concluída!</div>
              <div style={{ fontSize: 13, color: "var(--text-2)" }}>
                {pedidosExtraidos.filter(p => p.selected).length} pedidos importados com sucesso.
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {step === 0 && (
            <>
              <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
              <button className="btn btn-primary" disabled={files.length === 0 || processando} onClick={processar}>
                {processando ? `Processando... ${progresso}%` : `Processar ${files.length} ficha(s)`}
              </button>
            </>
          )}
          {step === 1 && (
            <>
              <button className="btn btn-secondary" onClick={() => setStep(0)}>← Voltar</button>
              <button className="btn btn-primary" disabled={pedidosExtraidos.filter(p => p.selected).length === 0} onClick={confirmar}>
                ✓ Importar {pedidosExtraidos.filter(p => p.selected).length} pedido(s)
              </button>
            </>
          )}
          {step === 2 && (
            <button className="btn btn-primary" onClick={onClose}>Fechar</button>
          )}
        </div>
      </div>
    </div>
  );
}

function Assistencia({ assistencias, setAssistencias, saveAssistencia }) {
  const [filter, setFilter] = useState("Todos");
  const [showModal, setShowModal] = useState(false);
  const statuses = ["Todos", "Aberto", "Em andamento", "Aguardando fábrica", "Aguardando peça", "Concluído", "Cancelado"];

  const filtered = assistencias.filter(a => filter === "Todos" || a.status === filter);

  const prazoInfo = (dataAbertura) => {
    const abertura = new Date(dataAbertura);
    const prazo = new Date(abertura); prazo.setDate(prazo.getDate() + 30);
    const hoje = new Date();
    const diff = Math.floor((prazo - hoje) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { text: `Atrasado ${Math.abs(diff)}d`, color: "var(--red)", badge: "badge-red" };
    if (diff <= 5) return { text: `${diff}d restantes`, color: "var(--red)", badge: "badge-red" };
    if (diff <= 10) return { text: `${diff}d restantes`, color: "var(--amber)", badge: "badge-amber" };
    return { text: `${diff}d restantes`, color: "var(--text-2)", badge: "badge-gray" };
  };

  return (
    <div className="page">
      <div className="page-header-row page-header">
        <div className="page-title">Assistência Técnica</div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><Icon name="plus" size={14} /> Nova assistência</button>
      </div>

      <div className="filters">
        {statuses.map(s => (
          <button key={s} className={`filter-btn ${filter === s ? "active" : ""}`} onClick={() => setFilter(s)}>{s}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty"><div className="empty-icon">🔧</div><div className="empty-text">Nenhuma assistência encontrada</div></div>
      ) : filtered.map(a => {
        const prazo = prazoInfo(a.data_abertura);
        return (
          <div className="list-item" key={a.id}>
            <div className="list-item-main">
              <div className="list-item-title">{a.cliente}</div>
              <div className="list-item-sub">{a.tipo_problema} · {a.responsavel_nome}</div>
              <div style={{ fontSize: 11, color: prazo.color, marginTop: 2 }}>⏱ {prazo.text}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
              <span className={`badge ${statusBadge(a.status)}`}>{a.status}</span>
              <span className={`badge ${prazo.badge}`} style={{ fontSize: 10 }}>{prazo.text}</span>
            </div>
            <Icon name="chevron" size={14} style={{ color: "var(--text-3)" }} />
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// CONFERENCIA
// ============================================================
function Conferencia() {
  const [items] = useState([
    { id: "c1", numero_pedido: "39799", numero_nf: "NF-12345", produto: "SOFA BLESS - PÉ METAL TUBO PRETO", fornecedor: "TEMPLUM MINAS LTDA", conferente_nome: "Carlos Gestor", resultado: null, data_hora: new Date().toISOString() },
    { id: "c2", numero_pedido: "39789", numero_nf: "NF-12340", produto: "POLTRONA ELOA - Tec: E139", fornecedor: "SANTA COMERCIO", conferente_nome: "Carlos Gestor", resultado: "Aprovado", data_hora: new Date().toISOString() },
  ]);

  return (
    <div className="page">
      <div className="page-header-row page-header">
        <div className="page-title">Conferência</div>
        <button className="btn btn-primary"><Icon name="plus" size={14} /> Nova conferência</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Pedido</th>
                <th>NF</th>
                <th>Produto</th>
                <th>Fornecedor</th>
                <th>Conferente</th>
                <th>Resultado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map(c => (
                <tr key={c.id}>
                  <td style={{ fontFamily: "var(--mono)", fontSize: 12 }}>#{c.numero_pedido}</td>
                  <td style={{ fontSize: 12, color: "var(--text-2)" }}>{c.numero_nf}</td>
                  <td>{c.produto}</td>
                  <td style={{ fontSize: 12, color: "var(--text-2)" }}>{c.fornecedor}</td>
                  <td style={{ fontSize: 12 }}>{c.conferente_nome}</td>
                  <td>
                    {c.resultado
                      ? <span className={`badge ${statusBadge(c.resultado)}`}>{c.resultado}</span>
                      : <span className="badge badge-amber">Pendente</span>}
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-sm btn-icon"><Icon name="chevron" size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// EQUIPE
// ============================================================
function Equipe() {
  const [equipes] = useState([
    { id: "e1", nome: "Equipe Alpha", motorista_nome: "Pedro Motorista", entregadores_nomes: ["João Entregador"], status: "Ativa" },
  ]);
  const [usuarios] = useState([
    { id: "1", full_name: "Marllon Augusto", role: "admin", email: "admin@versalog.com" },
    { id: "2", full_name: "Carlos Gestor", role: "gestor", email: "gestor@versalog.com" },
    { id: "3", full_name: "João Entregador", role: "entregador", email: "entregador@versalog.com" },
    { id: "4", full_name: "Pedro Motorista", role: "motorista", email: "motorista@versalog.com" },
  ]);

  return (
    <div className="page">
      <div className="page-header-row page-header">
        <div className="page-title">Equipe</div>
        <button className="btn btn-primary"><Icon name="plus" size={14} /> Nova equipe</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        {equipes.map(e => (
          <div className="card" key={e.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{e.nome}</div>
              <span className={`badge ${statusBadge(e.status)}`}>{e.status}</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 8 }}>
              🚗 Motorista: <span style={{ color: "var(--text-1)" }}>{e.motorista_nome}</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-2)" }}>
              👤 Entregadores: <span style={{ color: "var(--text-1)" }}>{e.entregadores_nomes.join(", ")}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="page-title" style={{ fontSize: 16, marginBottom: 16 }}>Todos os usuários</div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Nome</th><th>Email</th><th>Cargo</th><th></th></tr>
            </thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div className="avatar">{u.full_name.charAt(0)}</div>
                      {u.full_name}
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: "var(--text-2)" }}>{u.email}</td>
                  <td><span className="badge badge-accent" style={{ textTransform: "capitalize" }}>{u.role}</span></td>
                  <td><button className="btn btn-ghost btn-sm btn-icon"><Icon name="edit" size={13} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAPA DO DIA
// ============================================================
function MapaDia({ pedidos }) {
  const hoje = new Date().toISOString().split("T")[0];
  const pedidosHoje = pedidos.filter(p => p.data_entrega === hoje);
  const [selected, setSelected] = useState(pedidosHoje[0] || null);
  const [filter, setFilter] = useState("Todos");

  const filtered = pedidosHoje.filter(p => filter === "Todos" || p.status === filter);
  const statuses = ["Todos", "Pendente", "Em Rota", "Entregue", "Problema"];

  const mapUrl = selected
    ? `https://maps.google.com/maps?q=${encodeURIComponent(selected.endereco + ", " + selected.cidade + ", MG, Brasil")}&output=embed`
    : `https://maps.google.com/maps?q=Belo+Horizonte,MG,Brasil&output=embed`;

  return (
    <div className="page">
      <div className="page-header-row page-header">
        <div>
          <div className="page-title">Mapa do Dia</div>
          <div className="page-subtitle">{pedidosHoje.length} entregas hoje — {new Date().toLocaleDateString("pt-BR")}</div>
        </div>
        <button className="btn btn-secondary btn-sm">↻ Atualizar</button>
      </div>

      <div className="map-layout">
        <div className="map-sidebar">
          <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {statuses.map(s => (
                <button key={s} className={`filter-btn ${filter === s ? "active" : ""}`} style={{ fontSize: 11, padding: "4px 8px" }} onClick={() => setFilter(s)}>{s}</button>
              ))}
            </div>
          </div>
          {filtered.length === 0 ? (
            <div className="empty" style={{ padding: 32 }}><div className="empty-text">Nenhuma entrega</div></div>
          ) : filtered.map(p => (
            <div
              key={p.id}
              onClick={() => setSelected(p)}
              style={{
                padding: "12px 14px", cursor: "pointer", borderBottom: "1px solid var(--border)",
                background: selected?.id === p.id ? "var(--bg-2)" : "transparent",
                borderLeft: selected?.id === p.id ? `3px solid var(--accent)` : "3px solid transparent",
                transition: "all 0.15s",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-1)" }}>{p.cliente.split(" ").slice(0, 2).join(" ")}</div>
                <span className={`badge ${statusBadge(p.status)}`} style={{ fontSize: 10 }}>{p.status}</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-2)" }}>#{p.numero_pedido}</div>
              <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{p.endereco}</div>
            </div>
          ))}
        </div>
        <div className="map-frame">
          <iframe src={mapUrl} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Mapa de entregas" />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MINHA ROTA
// ============================================================
function MinhaRota({ pedidos, setPedidos }) {
  const { user } = useAuth();
  const [activeDelivery, setActiveDelivery] = useState(null);
  const [step, setStep] = useState(0);
  const [photos, setPhotos] = useState([]);
  const [sigNome, setSigNome] = useState("");
  const [sigDoc, setSigDoc] = useState("");
  const [obs, setObs] = useState("");
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [lastPos, setLastPos] = useState(null);

  const hoje = new Date().toISOString().split("T")[0];
  const meusPedidos = pedidos.filter(p =>
    (p.entregador_id === user?.id || p.entregador_nome === user?.full_name) &&
    p.data_entrega === hoje && p.status !== "Cancelado"
  );

  const pendentes = meusPedidos.filter(p => p.status !== "Entregue");
  const entregues = meusPedidos.filter(p => p.status === "Entregue");

  const startDelivery = (pedido) => {
    setActiveDelivery(pedido);
    setStep(0);
    setPhotos([]);
    setSigNome("");
    setSigDoc("");
    setObs("");
  };

  const initCanvas = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  useEffect(() => { if (step === 2) setTimeout(initCanvas, 100); }, [step]);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const startDraw = (e) => { e.preventDefault(); setDrawing(true); setLastPos(getPos(e, canvasRef.current)); };
  const draw = (e) => {
    e.preventDefault();
    if (!drawing || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    const pos = getPos(e, canvasRef.current);
    ctx.beginPath(); ctx.strokeStyle = "#000"; ctx.lineWidth = 2; ctx.lineCap = "round";
    ctx.moveTo(lastPos.x, lastPos.y); ctx.lineTo(pos.x, pos.y); ctx.stroke();
    setLastPos(pos);
  };
  const endDraw = () => setDrawing(false);

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const concluir = () => {
    setPedidos(prev => prev.map(p => p.id === activeDelivery.id ? { ...p, status: "Entregue" } : p));
    setActiveDelivery(null);
  };

  const steps = ["Iniciar", "Fotos", "Assinatura", "Concluir"];

  if (activeDelivery) {
    return (
      <div className="page">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <button className="btn btn-ghost" onClick={() => setActiveDelivery(null)}>← Cancelar</button>
          <div style={{ fontSize: 12, color: "var(--text-2)" }}>Etapa {step + 1} de {steps.length}</div>
        </div>

        <div className="steps">
          {steps.map((s, i) => (
            <div key={s} className={`step-dot ${i === step ? "active" : i < step ? "done" : ""}`} />
          ))}
        </div>

        <div style={{ fontWeight: 600, marginBottom: 4 }}>{activeDelivery.cliente}</div>
        <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 20 }}>Pedido #{activeDelivery.numero_pedido} · {activeDelivery.endereco}</div>

        {step === 0 && (
          <div>
            <div className="card" style={{ marginBottom: 16, textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📍</div>
              <div style={{ fontWeight: 500, marginBottom: 4 }}>Pronto para iniciar?</div>
              <div style={{ fontSize: 12, color: "var(--text-2)" }}>Sua localização GPS será registrada automaticamente</div>
            </div>
            <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: 14 }} onClick={() => setStep(1)}>
              Iniciar atendimento
            </button>
          </div>
        )}

        {step === 1 && (
          <div>
            <div style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 16 }}>Fotografe cada produto separadamente para comprovar a entrega.</div>
            <div style={{ fontSize: 12, color: "var(--accent)", marginBottom: 16 }}>📸 {photos.length} foto(s) registrada(s)</div>
            <div className="card" style={{ marginBottom: 16, textAlign: "center", padding: 32, cursor: "pointer", border: "2px dashed var(--border)" }}
              onClick={() => setPhotos(prev => [...prev, `foto_${Date.now()}`])}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
              <div style={{ fontSize: 13 }}>Toque para fotografar produto</div>
              <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>Simula captura de câmera</div>
            </div>
            {photos.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                {photos.map((p, i) => (
                  <div key={p} style={{ width: 60, height: 60, background: "var(--bg-3)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📷</div>
                ))}
              </div>
            )}
            <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: 14 }}
              disabled={photos.length === 0} onClick={() => setStep(2)}>
              Continuar ({photos.length} foto{photos.length !== 1 ? "s" : ""})
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="form-grid-2" style={{ marginBottom: 16 }}>
              <div className="form-group">
                <label className="form-label">Nome do recebedor</label>
                <input className="form-input" value={sigNome} onChange={e => setSigNome(e.target.value)} placeholder="Nome completo" />
              </div>
              <div className="form-group">
                <label className="form-label">CPF / RG</label>
                <input className="form-input" value={sigDoc} onChange={e => setSigDoc(e.target.value)} placeholder="000.000.000-00" />
              </div>
            </div>
            <div className="form-group">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label className="form-label" style={{ margin: 0 }}>Assinatura do cliente</label>
                <button className="btn btn-ghost btn-sm" onClick={clearCanvas}>Limpar</button>
              </div>
              <canvas
                ref={canvasRef} width={600} height={150}
                style={{ width: "100%", height: 150, background: "#fff", borderRadius: 8, border: "1px solid var(--border)", cursor: "crosshair", touchAction: "none" }}
                onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
              />
              <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>Assine com o dedo ou mouse</div>
            </div>
            <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: 14 }}
              disabled={!sigNome} onClick={() => setStep(3)}>
              Continuar
            </button>
          </div>
        )}

        {step === 3 && (
          <div>
            <div className="form-group">
              <label className="form-label">Observações (opcional)</label>
              <textarea className="form-input" rows={3} value={obs} onChange={e => setObs(e.target.value)} placeholder="Ex: produto entregue na portaria..." style={{ resize: "none" }} />
            </div>
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 500, marginBottom: 8 }}>Resumo da entrega</div>
              <div style={{ fontSize: 13, color: "var(--text-2)" }}>📸 {photos.length} foto(s) registrada(s)</div>
              <div style={{ fontSize: 13, color: "var(--text-2)", marginTop: 4 }}>✍ Assinado por: {sigNome}</div>
              {obs && <div style={{ fontSize: 13, color: "var(--text-2)", marginTop: 4 }}>💬 {obs}</div>}
            </div>
            <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: 14, background: "var(--green)" }} onClick={concluir}>
              ✓ Concluir entrega
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Minha Rota</div>
        <div className="page-subtitle">{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</div>
      </div>

      {pendentes.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>Pendentes ({pendentes.length})</div>
          {pendentes.map(p => (
            <div className="list-item" key={p.id}>
              <div className="list-item-main">
                <div className="list-item-title">{p.cliente}</div>
                <div className="list-item-sub">#{p.numero_pedido} · {p.endereco}</div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => startDelivery(p)}>Iniciar</button>
            </div>
          ))}
        </>
      )}

      {entregues.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)", margin: "16px 0 10px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Entregues ({entregues.length})</div>
          {entregues.map(p => (
            <div className="list-item" key={p.id} style={{ opacity: 0.6 }}>
              <div className="list-item-main">
                <div className="list-item-title">{p.cliente}</div>
                <div className="list-item-sub">#{p.numero_pedido}</div>
              </div>
              <span className="badge badge-green">Entregue</span>
            </div>
          ))}
        </>
      )}

      {meusPedidos.length === 0 && (
        <div className="empty"><div className="empty-icon">🚚</div><div className="empty-text">Nenhuma entrega atribuída para hoje</div></div>
      )}
    </div>
  );
}

// ============================================================
// PONTO
// ============================================================
function Ponto({ pontos, setPontos, savePonto }) {
  const { user } = useAuth();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const registrar = async (tipo) => {
    const ponto = {
      usuario_id: user?.id || null,
      usuario_nome: user?.full_name,
      tipo,
      data_hora: new Date().toISOString(),
      data: new Date().toISOString().split("T")[0]
    };
    try {
      await savePonto(ponto);
    } catch(e) {
      setPontos(prev => [...prev, { ...ponto, id: Date.now().toString() }]);
    }
  };

  const hoje = new Date().toISOString().split("T")[0];
  const meusPontos = pontos.filter(p => p.usuario_id === user?.id && p.data === hoje);

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Ponto Eletrônico</div>
      </div>

      <div className="card" style={{ textAlign: "center", marginBottom: 20 }}>
        <div className="ponto-clock">
          {time.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </div>
        <div style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 24 }}>
          {time.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </div>
        <div className="ponto-grid">
          {[["Entrada", "var(--green)"], ["Saída", "var(--red)"], ["Almoço", "var(--amber)"], ["Retorno", "var(--blue)"]].map(([tipo, color]) => (
            <button key={tipo} className="btn btn-secondary" style={{ justifyContent: "center", padding: 14, color, borderColor: color + "44" }} onClick={() => registrar(tipo)}>
              {tipo}
            </button>
          ))}
        </div>
      </div>

      <div style={{ fontWeight: 600, marginBottom: 12 }}>Registros de hoje</div>
      {meusPontos.length === 0 ? (
        <div className="empty"><div className="empty-text">Nenhum registro hoje</div></div>
      ) : meusPontos.map(p => (
        <div className="list-item" key={p.id} style={{ cursor: "default" }}>
          <span className={`badge ${p.tipo === "Entrada" || p.tipo === "Retorno" ? "badge-green" : p.tipo === "Saída" ? "badge-red" : "badge-amber"}`}>{p.tipo}</span>
          <div className="list-item-main">
            <div style={{ fontSize: 13 }}>{new Date(p.data_hora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
function App() {
  const { user, logout } = useAuth();
  const [page, setPage] = useState("dashboard");
  const data = useAppData();

  if (!user) return <LoginPage />;

  const renderPage = () => {
    switch (page) {
      case "dashboard": return <Dashboard pedidos={data.pedidos} />;
      case "pedidos": return <Pedidos pedidos={data.pedidos} setPedidos={data.setPedidos} importarPedidos={data.importarPedidos} />;
      case "agenda": return <Agenda pedidos={data.pedidos} />;
      case "ranking": return <Ranking pedidos={data.pedidos} />;
      case "assistencia": return <Assistencia assistencias={data.assistencias} setAssistencias={data.setAssistencias} saveAssistencia={data.saveAssistencia} />;
      case "conferencia": return <Conferencia />;
      case "equipe": return <Equipe />;
      case "mapa": return <MapaDia pedidos={data.pedidos} />;
      case "rota": return <MinhaRota pedidos={data.pedidos} setPedidos={data.setPedidos} />;
      case "ponto": return <Ponto pontos={data.pontos} setPontos={data.setPontos} savePonto={data.savePonto} />;
      default: return <Dashboard pedidos={data.pedidos} />;
    }
  };

  const isGestor = ["admin", "gestor"].includes(user?.role);
  const isEntregador = ["entregador", "motorista"].includes(user?.role);

  const allItems = [
    ...(isGestor ? [
      { id: "dashboard", label: "Painel" },
      { id: "pedidos", label: "Pedidos" },
      { id: "agenda", label: "Agenda" },
      { id: "ranking", label: "Ranking" },
      { id: "assistencia", label: "Assistência" },
      { id: "conferencia", label: "Conferência" },
      { id: "equipe", label: "Equipe" },
      { id: "mapa", label: "Mapa do Dia" },
    ] : []),
    { id: "rota", label: "Minha Rota" },
    { id: "ponto", label: "Ponto" },
  ];

  return (
    <div className="app">
      <div className="topbar">
        <div className="topbar-logo">
          <VersaLogo size={16} />
          VERSA LOG
        </div>
        {allItems.map(item => (
          <button key={item.id} className={`topbar-btn ${page === item.id ? "active" : ""}`} onClick={() => setPage(item.id)}>
            {item.label}
          </button>
        ))}
        <button className="topbar-btn" style={{ marginLeft: "auto", color: "var(--red)" }} onClick={logout}>Sair</button>
      </div>
      <div className="app-inner">
        <div className="main">{renderPage()}</div>
      </div>
    </div>
  );
}

export default function VersaLogApp() {
  return (
    <>
      <style>{styles}</style>
      <AuthProvider>
        <App />
      </AuthProvider>
    </>
  );
}
