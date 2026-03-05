import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/shared/ThemeToggle';
import toast from 'react-hot-toast';
import { User, Mail, Lock, Phone, Eye, EyeOff } from 'lucide-react';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = mode === 'login'
        ? await login(form.email, form.password)
        : await register(form);
      toast.success(`Welcome, ${user.name}!`);
      navigate(user.role === 'citizen' ? '/dashboard' : '/admin');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg">
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 10 }}>
        <ThemeToggle />
      </div>

      <div className="auth-wrapper animate-slide-up">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">🏛️</div>
          <h1 className="auth-logo-title">Gov-Complaint-Box</h1>
          <p className="auth-logo-sub">AI-Powered Grievance Management</p>
        </div>

        {/* Card */}
        <div className="card-glass">
          {/* Tabs */}
          <div className="auth-tabs">
            {['login', 'register'].map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`auth-tab ${mode === m ? 'active' : ''}`}
              >
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={handle}>
            {mode === 'register' && (
              <div className="input-icon-wrap form-field">
                <span className="input-icon"><User size={16} /></span>
                <input className="input" type="text" placeholder="Full Name" value={form.name} onChange={e => set('name', e.target.value)} required />
              </div>
            )}

            <div className="input-icon-wrap form-field">
              <span className="input-icon"><Mail size={16} /></span>
              <input className="input" type="email" placeholder="Email Address" value={form.email} onChange={e => set('email', e.target.value)} required />
            </div>

            {mode === 'register' && (
              <div className="input-icon-wrap form-field">
                <span className="input-icon"><Phone size={16} /></span>
                <input className="input" type="tel" placeholder="Phone (optional)" value={form.phone} onChange={e => set('phone', e.target.value)} />
              </div>
            )}

            <div className="password-wrap">
              <div className="input-icon-wrap">
                <span className="input-icon"><Lock size={16} /></span>
                <input className="input" type={showPass ? 'text' : 'password'} placeholder="Password" value={form.password} onChange={e => set('password', e.target.value)} required />
              </div>
              <button type="button" onClick={() => setShowPass(!showPass)} className="password-toggle">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <button type="submit" disabled={loading} className="btn btn-submit btn-full mt-sm">
              {loading ? '⏳ Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {mode === 'login' && (
            <div className="auth-demo">
              <p className="auth-demo-text">
                <strong>Demo Admin:</strong> admin@gcb.gov.in / Admin@123
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
