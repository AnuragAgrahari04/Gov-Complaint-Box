import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAllComplaints, updateComplaintStatus, getAnalytics, getAdminStats, listUsers, createOfficer } from '../utils/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import toast from 'react-hot-toast';
import { LogOut, LayoutDashboard, FileText, Users, BarChart2, ChevronDown, Check, Map } from 'lucide-react';
import GeoHeatmap from '../components/admin/GeoHeatmap';
import NotificationBell from '../components/shared/NotificationBell';
import ThemeToggle from '../components/shared/ThemeToggle';

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={15} /> },
  { key: 'complaints', label: 'Complaints', icon: <FileText size={15} /> },
  { key: 'map', label: 'Complaint Map', icon: <Map size={15} /> },
  { key: 'users', label: 'Officers', icon: <Users size={15} /> },
  { key: 'analytics', label: 'Analytics', icon: <BarChart2 size={15} /> },
];

const STATUS_COLORS = { PENDING: '#f59e0b', IN_PROGRESS: '#3b82f6', RESOLVED: '#10b981', REJECTED: '#ef4444' };
const DEPT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316', '#ec4899'];
const DEPARTMENTS = ['Water Supply', 'Road Maintenance', 'Electricity', 'Public Transport', 'Crime', 'Corruption', 'Sanitation', 'Healthcare', 'Education'];

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('dashboard');
  const [complaints, setComplaints] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [stats, setStats] = useState(null);
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ status: '', department: '', priority: '', urgent: '' });
  const [newOfficer, setNewOfficer] = useState({ name: '', email: '', password: '', department: '' });
  const [creatingOfficer, setCreatingOfficer] = useState(false);

  useEffect(() => { fetchComplaints(); fetchAnalytics(); fetchStats(); fetchOfficers(); }, []);
  useEffect(() => { fetchComplaints(); }, [filters]);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.department) params.department = filters.department;
      if (filters.priority) params.priority = filters.priority;
      if (filters.urgent) params.urgent = filters.urgent;
      const res = await getAllComplaints(params);
      setComplaints(res.data.complaints || []);
    } catch { toast.error('Failed to load complaints'); }
    finally { setLoading(false); }
  };

  const fetchAnalytics = async () => { try { const res = await getAnalytics(); setAnalytics(res.data); } catch { } };
  const fetchStats = async () => { try { const res = await getAdminStats(); setStats(res.data); } catch { } };
  const fetchOfficers = async () => { try { const res = await listUsers('officer'); setOfficers(res.data); } catch { } };

  const handleStatusUpdate = async (complaintId, status, note = '') => {
    try {
      await updateComplaintStatus(complaintId, { status, note });
      toast.success(`Status updated to ${status}`);
      fetchComplaints();
      fetchAnalytics();
    } catch { toast.error('Update failed'); }
  };

  const handleCreateOfficer = async (e) => {
    e.preventDefault();
    setCreatingOfficer(true);
    try {
      await createOfficer(newOfficer);
      toast.success('Officer created!');
      setNewOfficer({ name: '', email: '', password: '', department: '' });
      fetchOfficers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally { setCreatingOfficer(false); }
  };

  const pieData = analytics ? [
    { name: 'Pending', value: analytics.pending, color: STATUS_COLORS.PENDING },
    { name: 'In Progress', value: analytics.in_progress, color: STATUS_COLORS.IN_PROGRESS },
    { name: 'Resolved', value: analytics.resolved, color: STATUS_COLORS.RESOLVED },
    { name: 'Rejected', value: analytics.rejected, color: STATUS_COLORS.REJECTED },
  ] : [];

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">🏛️</div>
          <div className="sidebar-title">Gov-Complaint-Box</div>
          <div className="sidebar-subtitle">Admin Panel</div>
        </div>
        <nav className="sidebar-nav">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`sidebar-btn ${tab === t.key ? 'active' : ''}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user-name">{user?.name}</div>
          <div className="sidebar-user-role">{user?.role}</div>
          <div className="flex gap-sm mb-md">
            <ThemeToggle />
            <NotificationBell />
          </div>
          <button onClick={logout} className="btn btn-danger w-full">
            <LogOut size={13} /> Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="app-main">
        {/* ── DASHBOARD ── */}
        {tab === 'dashboard' && (
          <div className="animate-fade">
            <h1 className="page-title">📊 Overview</h1>
            <div className="stat-grid">
              {[
                { label: 'Total Complaints', value: analytics?.total ?? '—', color: '#3b82f6' },
                { label: 'Pending', value: analytics?.pending ?? '—', color: '#f59e0b' },
                { label: 'In Progress', value: analytics?.in_progress ?? '—', color: '#06b6d4' },
                { label: 'Resolved', value: analytics?.resolved ?? '—', color: '#10b981' },
                { label: 'Urgent', value: analytics?.urgent ?? '—', color: '#ef4444' },
                { label: 'Resolution Rate', value: stats ? `${stats.resolution_rate}%` : '—', color: '#8b5cf6' },
              ].map((s, i) => (
                <div key={i} className="stat-card" style={{ borderColor: `${s.color}33` }}>
                  <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="charts-grid">
              <div className="chart-card">
                <div className="chart-title">Complaints by Status</div>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Legend iconType="circle" iconSize={10} formatter={v => <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{v}</span>} />
                    <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-card">
                <div className="chart-title">Complaints by Department</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={analytics?.by_department || []} margin={{ top: 4, right: 8, left: -20, bottom: 40 }}>
                    <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} angle={-35} textAnchor="end" />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {(analytics?.by_department || []).map((_, i) => <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ── MAP ── */}
        {tab === 'map' && <GeoHeatmap />}

        {/* ── COMPLAINTS ── */}
        {tab === 'complaints' && (
          <div className="animate-fade">
            <h1 className="page-title">📋 All Complaints</h1>
            <div className="filter-row">
              {[
                { key: 'status', options: ['', 'PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'], label: 'Status' },
                { key: 'priority', options: ['', 'LOW', 'NORMAL', 'HIGH', 'CRITICAL'], label: 'Priority' },
                { key: 'department', options: ['', ...DEPARTMENTS], label: 'Department' },
              ].map(f => (
                <select key={f.key} className="input-select" value={filters[f.key]} onChange={e => setFilters(prev => ({ ...prev, [f.key]: e.target.value }))}>
                  <option value="">{f.label}: All</option>
                  {f.options.filter(Boolean).map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ))}
              <label className="filter-checkbox">
                <input type="checkbox" checked={filters.urgent === 'true'} onChange={e => setFilters(p => ({ ...p, urgent: e.target.checked ? 'true' : '' }))} />
                Urgent only
              </label>
            </div>
            {loading && <div className="loading-text">Loading...</div>}
            <div className="flex flex-col gap-md">
              {complaints.map(c => (
                <ComplaintRow key={c.id} complaint={c} onStatusUpdate={handleStatusUpdate} />
              ))}
            </div>
            {!loading && complaints.length === 0 && (
              <div className="empty-state">No complaints match your filters.</div>
            )}
          </div>
        )}

        {/* ── OFFICERS ── */}
        {tab === 'users' && (
          <div className="animate-fade">
            <h1 className="page-title">👮 Officers</h1>
            <div className="officers-grid">
              <div className="card" style={{ padding: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: 'var(--text-primary)' }}>➕ Add New Officer</h3>
                <form onSubmit={handleCreateOfficer}>
                  {[
                    { key: 'name', placeholder: 'Full Name', type: 'text' },
                    { key: 'email', placeholder: 'Email', type: 'email' },
                    { key: 'password', placeholder: 'Password', type: 'password' },
                  ].map(f => (
                    <input key={f.key} type={f.type} placeholder={f.placeholder} value={newOfficer[f.key]} onChange={e => setNewOfficer(p => ({ ...p, [f.key]: e.target.value }))} required className="input mb-md" />
                  ))}
                  <select value={newOfficer.department} onChange={e => setNewOfficer(p => ({ ...p, department: e.target.value }))} required className="input mb-lg">
                    <option value="">Select Department</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <button type="submit" disabled={creatingOfficer} className="btn btn-primary btn-full">
                    {creatingOfficer ? 'Creating...' : 'Create Officer'}
                  </button>
                </form>
              </div>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: 'var(--text-secondary)' }}>Existing Officers ({officers.length})</h3>
                <div className="flex flex-col gap-md">
                  {officers.map(o => (
                    <div key={o.id} className="officer-card">
                      <div>
                        <div className="officer-name">{o.name}</div>
                        <div className="officer-email">{o.email}</div>
                      </div>
                      <span className="badge badge-dept">{o.department}</span>
                    </div>
                  ))}
                  {officers.length === 0 && <div className="empty-state" style={{ padding: 24 }}>No officers yet.</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ANALYTICS ── */}
        {tab === 'analytics' && (
          <div className="animate-fade">
            <h1 className="page-title">📈 Analytics</h1>
            <div className="charts-grid">
              <div className="chart-card">
                <div className="chart-title">By Department</div>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={analytics?.by_department || []} layout="vertical" margin={{ top: 4, right: 20, left: 80, bottom: 4 }}>
                    <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {(analytics?.by_department || []).map((_, i) => <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-card">
                <div className="chart-title">By Category</div>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={analytics?.by_category || []} layout="vertical" margin={{ top: 4, right: 20, left: 100, bottom: 4 }}>
                    <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function ComplaintRow({ complaint: c, onStatusUpdate }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');

  return (
    <div className="complaint-card complaint-expand" style={{ padding: 0 }}>
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }} onClick={() => setOpen(!open)}>
        <div style={{ flex: 1 }}>
          <div className="flex items-center gap-sm" style={{ marginBottom: 4 }}>
            <span className="complaint-id">{c.complaint_id}</span>
            {c.is_urgent && <span className="badge badge-urgent">⚠️ URGENT</span>}
          </div>
          <div className="complaint-title" style={{ fontSize: 14 }}>{c.title}</div>
          <div className="complaint-meta" style={{ marginTop: 3 }}>{c.department} · {c.submitter?.name} · {new Date(c.created_at).toLocaleDateString('en-IN')}</div>
        </div>
        <span className={`badge ${c.status === 'PENDING' ? 'badge-pending' : c.status === 'IN_PROGRESS' ? 'badge-progress' : c.status === 'RESOLVED' ? 'badge-resolved' : 'badge-rejected'}`} style={{ fontWeight: 700 }}>{c.status}</span>
        <ChevronDown size={16} style={{ color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
      </div>
      {open && (
        <div className="complaint-expand-body animate-fade">
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.7 }}>{c.description}</p>
          {c.ai_response && <div className="ai-response-box" style={{ marginBottom: 16 }}><span style={{ fontSize: 12 }}>🤖 {c.ai_response}</span></div>}
          <div className="flex gap-sm" style={{ flexWrap: 'wrap', marginBottom: 12 }}>
            {['IN_PROGRESS', 'RESOLVED', 'REJECTED'].map(s => (
              <button key={s} onClick={() => onStatusUpdate(c.id, s, note)} className={`btn btn-status ${s === 'IN_PROGRESS' ? 'badge-progress' : s === 'RESOLVED' ? 'badge-resolved' : 'badge-rejected'}`} style={{ border: '1px solid' }}>
                <Check size={12} /> {s.replace('_', ' ')}
              </button>
            ))}
          </div>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Optional note / resolution details..." className="input" style={{ fontSize: 13 }} />
        </div>
      )}
    </div>
  );
}
