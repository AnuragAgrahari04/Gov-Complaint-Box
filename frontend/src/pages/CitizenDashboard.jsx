import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { submitComplaint, getMyComplaints } from '../utils/api';
import toast from 'react-hot-toast';
import { LogOut, Plus, List, Upload, MapPin, CheckCircle, Clock, XCircle, ChevronRight, Mic, Square } from 'lucide-react';
import NotificationBell from '../components/shared/NotificationBell';
import ThemeToggle from '../components/shared/ThemeToggle';

const STATUS_CONFIG = {
  PENDING: { color: 'var(--status-pending)', badgeClass: 'badge-pending', icon: <Clock size={14} />, label: 'Pending' },
  IN_PROGRESS: { color: 'var(--status-progress)', badgeClass: 'badge-progress', icon: <ChevronRight size={14} />, label: 'In Progress' },
  RESOLVED: { color: 'var(--status-resolved)', badgeClass: 'badge-resolved', icon: <CheckCircle size={14} />, label: 'Resolved' },
  REJECTED: { color: 'var(--status-rejected)', badgeClass: 'badge-rejected', icon: <XCircle size={14} />, label: 'Rejected' },
};

export default function CitizenDashboard() {
  const { user, logout } = useAuth();
  const [view, setView] = useState('list');
  const [complaints, setComplaints] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef();
  const [form, setForm] = useState({ title: '', description: '', address: '', latitude: '', longitude: '', image: null, audio: null });

  // Voice recording
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => { fetchComplaints(); }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const file = new File([blob], 'voice-complaint.wav', { type: 'audio/wav' });
        setForm(f => ({ ...f, audio: file }));
        stream.getTracks().forEach(t => t.stop());
        toast.success('Voice recorded! It will be transcribed by AI.');
      };
      mediaRecorder.start();
      setRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch {
      toast.error('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const fetchComplaints = async () => {
    setLoading(true);
    try { const res = await getMyComplaints(); setComplaints(res.data); }
    catch { toast.error('Failed to load complaints'); }
    finally { setLoading(false); }
  };

  const handleLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(f => ({ ...f, latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
        toast.success('Location captured!');
      },
      () => toast.error('Location access denied')
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.description) return toast.error('Title and description required');
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('description', form.description);
      if (form.address) fd.append('address', form.address);
      if (form.latitude) fd.append('latitude', form.latitude);
      if (form.longitude) fd.append('longitude', form.longitude);
      if (form.image) fd.append('image', form.image);
      if (form.audio) fd.append('audio', form.audio);
      await submitComplaint(fd);
      toast.success('✅ Complaint submitted successfully!');
      setForm({ title: '', description: '', address: '', latitude: '', longitude: '', image: null, audio: null });
      setView('list');
      fetchComplaints();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Submission failed');
    } finally { setSubmitting(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <header className="header">
        <div className="header-brand">
          <span className="header-brand-icon">🏛️</span>
          <div>
            <div className="header-brand-title">Gov-Complaint-Box</div>
            <div className="header-brand-sub">Citizen Portal</div>
          </div>
        </div>
        <div className="header-actions">
          <span className="header-user">👤 {user?.name}</span>
          <ThemeToggle />
          <NotificationBell />
          <button onClick={logout} className="btn btn-danger">
            <LogOut size={14} /> Logout
          </button>
        </div>
      </header>

      <div className="app-container">
        {/* Stats */}
        <div className="stat-grid animate-slide-up">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const count = complaints.filter(c => c.status === key).length;
            return (
              <div key={key} className="stat-card" style={{ borderColor: `color-mix(in srgb, ${cfg.color} 20%, transparent)` }}>
                <div className="stat-value" style={{ color: cfg.color }}>{count}</div>
                <div className="stat-label">{cfg.label}</div>
              </div>
            );
          })}
        </div>

        {/* Nav */}
        <div className="flex gap-md mb-xl">
          <button className={`btn-nav ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>
            <List size={15} /> My Complaints
          </button>
          <button className={`btn-nav accent ${view === 'submit' ? 'active' : ''}`} onClick={() => setView('submit')}>
            <Plus size={15} /> New Complaint
          </button>
        </div>

        {/* ── COMPLAINT LIST ── */}
        {view === 'list' && (
          <div className="animate-fade">
            {loading && <div className="loading-text">Loading...</div>}
            {!loading && complaints.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <p>No complaints yet.</p>
                <button onClick={() => setView('submit')} className="btn btn-primary mt-lg">Submit your first complaint</button>
              </div>
            )}
            <div className="flex flex-col gap-md">
              {complaints.map(c => {
                const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.PENDING;
                return (
                  <div key={c.id} className="complaint-card" onClick={() => { setSelected(c); setView('detail'); }}>
                    <div className="complaint-row">
                      <div style={{ flex: 1 }}>
                        <div className="flex items-center gap-sm mb-sm">
                          <span className="complaint-id">{c.complaint_id}</span>
                          {c.is_urgent && <span className="badge badge-urgent">⚠️ URGENT</span>}
                        </div>
                        <div className="complaint-title">{c.title}</div>
                        <div className="complaint-meta">{c.category} · {c.subcategory}</div>
                      </div>
                      <span className={`badge ${cfg.badgeClass}`}>{cfg.icon} {cfg.label}</span>
                    </div>
                    <div className="complaint-date">
                      {new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── SUBMIT COMPLAINT ── */}
        {view === 'submit' && (
          <div className="card animate-slide-up" style={{ borderRadius: 'var(--radius-xl)', padding: '28px 24px' }}>
            <h2 className="page-title">📝 Submit a New Complaint</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-field">
                <label className="form-label">Complaint Title *</label>
                <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Brief title of your complaint" required />
              </div>
              <div className="form-field">
                <label className="form-label">Description *</label>
                <textarea className="input textarea" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe your complaint in detail..." rows={5} required />
              </div>
              <div className="form-field">
                <label className="form-label">Location</label>
                <div className="flex gap-sm">
                  <input className="input" style={{ flex: 1 }} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Area / street address" />
                  <button type="button" onClick={handleLocation} className={`btn ${form.latitude ? 'btn-primary' : 'btn-secondary'}`} style={{ whiteSpace: 'nowrap' }}>
                    <MapPin size={14} /> {form.latitude ? 'Located!' : 'GPS'}
                  </button>
                </div>
              </div>
              <div className="form-field">
                <label className="form-label">Attach Image (optional)</label>
                <input type="file" ref={fileRef} accept="image/*" style={{ display: 'none' }} onChange={e => setForm(f => ({ ...f, image: e.target.files[0] }))} />
                <button type="button" onClick={() => fileRef.current.click()} className={`upload-btn ${form.image ? 'has-file' : ''}`}>
                  <Upload size={16} /> {form.image ? `✅ ${form.image.name}` : 'Click to upload image'}
                </button>
              </div>
              <div className="form-field">
                <label className="form-label">Voice Complaint (optional — AI will transcribe)</label>
                <div className="flex gap-md items-center">
                  {!recording ? (
                    <button type="button" onClick={startRecording} className={`upload-btn ${form.audio ? 'has-file' : ''}`} style={{ flex: 1, justifyContent: 'center' }}>
                      <Mic size={16} /> {form.audio ? `✅ ${form.audio.name}` : 'Click to record voice'}
                    </button>
                  ) : (
                    <button type="button" onClick={stopRecording} className="upload-btn recording" style={{ flex: 1, justifyContent: 'center' }}>
                      <Square size={16} /> Stop Recording — {recordingTime}s
                    </button>
                  )}
                  {form.audio && (
                    <button type="button" onClick={() => setForm(f => ({ ...f, audio: null }))} className="btn btn-danger" style={{ fontSize: 12 }}>✕ Clear</button>
                  )}
                </div>
                {recording && <p style={{ fontSize: 12, color: 'var(--status-rejected)', marginTop: 6 }}>🔴 Recording in progress... Click Stop when done.</p>}
              </div>
              <div className="flex gap-md mt-xl">
                <button type="button" onClick={() => setView('list')} className="btn btn-secondary btn-full">Cancel</button>
                <button type="submit" disabled={submitting} className="btn btn-submit btn-full" style={{ flex: 2 }}>
                  {submitting ? '🤖 AI is analyzing...' : 'Submit Complaint'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── COMPLAINT DETAIL ── */}
        {view === 'detail' && selected && (
          <div className="animate-fade">
            <button onClick={() => setView('list')} className="btn btn-ghost mb-lg" style={{ color: 'var(--brand-blue)' }}>
              ← Back to My Complaints
            </button>
            <ComplaintDetail complaint={selected} />
          </div>
        )}
      </div>
    </div>
  );
}

function ComplaintDetail({ complaint: c }) {
  const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.PENDING;
  return (
    <div className="card" style={{ borderRadius: 'var(--radius-xl)', padding: 28 }}>
      <div className="detail-header">
        <div>
          <span className="detail-id">{c.complaint_id}</span>
          <h2 className="detail-title">{c.title}</h2>
        </div>
        <span className={`badge ${cfg.badgeClass}`} style={{ padding: '6px 14px', fontSize: 13 }}>{cfg.icon} {cfg.label}</span>
      </div>

      <div className="info-grid">
        <InfoChip label="Department" value={c.department || '—'} />
        <InfoChip label="Category" value={c.category || '—'} />
        <InfoChip label="Subcategory" value={c.subcategory || '—'} />
        <InfoChip label="Priority" value={c.priority || '—'} />
      </div>

      {c.is_urgent && <div className="urgent-banner">⚠️ This complaint has been flagged as URGENT</div>}

      <div className="mb-lg">
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Description</div>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7 }}>{c.description}</p>
      </div>

      {c.ai_response && (
        <div className="ai-response-box">
          <div className="ai-response-label">🤖 AI Response</div>
          <p className="ai-response-text">{c.ai_response}</p>
        </div>
      )}

      {c.updates?.length > 0 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12 }}>Status History</div>
          {c.updates.map((u, i) => (
            <div key={i} className="timeline-item">
              <div className="timeline-dot" />
              <div>
                <div className="timeline-status">{u.old_status} → <strong>{u.new_status}</strong></div>
                {u.note && <div className="timeline-note">{u.note}</div>}
                <div className="timeline-meta">by {u.officer} · {new Date(u.created_at).toLocaleDateString('en-IN')}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 16 }}>
        Submitted on {new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
      </div>
    </div>
  );
}

function InfoChip({ label, value }) {
  return (
    <div className="info-chip">
      <div className="info-chip-label">{label}</div>
      <div className="info-chip-value">{value}</div>
    </div>
  );
}
