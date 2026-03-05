import { useState, useEffect, useRef } from 'react';
import { getNotifications, markAllRead, markRead } from '../../utils/api';
import { Bell, X, CheckCheck } from 'lucide-react';

const TYPE_CONFIG = {
  success: { color: 'var(--status-resolved)', bg: 'var(--status-resolved-bg)', icon: '✅' },
  info: { color: 'var(--status-progress)', bg: 'var(--status-progress-bg)', icon: '📋' },
  warning: { color: 'var(--status-pending)', bg: 'var(--status-pending-bg)', icon: '⚠️' },
  error: { color: 'var(--status-rejected)', bg: 'var(--status-rejected-bg)', icon: '❌' },
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const panelRef = useRef();
  const intervalRef = useRef();

  const fetchNotifs = async () => {
    try {
      const res = await getNotifications();
      setNotifications(res.data.notifications);
      setUnread(res.data.unread);
    } catch { }
  };

  useEffect(() => {
    fetchNotifs();
    intervalRef.current = setInterval(fetchNotifs, 15000);
    return () => clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkAllRead = async () => {
    await markAllRead();
    setNotifications(n => n.map(x => ({ ...x, is_read: true })));
    setUnread(0);
  };

  const handleMarkRead = async (id) => {
    await markRead(id);
    setNotifications(n => n.map(x => x.id === id ? { ...x, is_read: true } : x));
    setUnread(u => Math.max(0, u - 1));
  };

  const timeAgo = (iso) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="notif-wrap" ref={panelRef}>
      <button className="notif-btn" onClick={() => setOpen(!open)} aria-label="Notifications">
        <Bell size={18} />
        {unread > 0 && (
          <span className="notif-count">{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <div className="notif-panel animate-slide-down">
          <div className="notif-panel-header">
            <div className="notif-panel-title">
              <Bell size={15} style={{ color: 'var(--brand-blue)' }} />
              <span className="notif-panel-title-text">Notifications</span>
              {unread > 0 && <span className="notif-count" style={{ position: 'static', border: 'none' }}>{unread}</span>}
            </div>
            <div className="flex gap-sm">
              {unread > 0 && (
                <button onClick={handleMarkAllRead} className="btn btn-ghost" style={{ fontSize: 12, color: 'var(--brand-blue)' }}>
                  <CheckCheck size={14} /> All read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="btn btn-ghost">
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="notif-list">
            {notifications.length === 0 && (
              <div className="notif-empty">
                <div style={{ fontSize: 32, marginBottom: 8 }}>🔔</div>
                <div>No notifications yet</div>
              </div>
            )}
            {notifications.map(n => {
              const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
              return (
                <div
                  key={n.id}
                  className={`notif-item ${!n.is_read ? 'unread' : ''}`}
                  onClick={() => !n.is_read && handleMarkRead(n.id)}
                >
                  <div className="notif-icon" style={{ background: cfg.bg }}>{cfg.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="flex justify-between items-center gap-sm">
                      <div className={`notif-title ${n.is_read ? 'read' : 'unread'}`}>{n.title}</div>
                      {!n.is_read && <div className="notif-dot" />}
                    </div>
                    <div className="notif-msg">{n.message}</div>
                    <div className="flex items-center gap-sm mt-sm">
                      <span className="notif-time">{timeAgo(n.created_at)}</span>
                      {n.complaint_ref && <span className="notif-ref" style={{ color: cfg.color }}>{n.complaint_ref}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {notifications.length > 0 && (
            <div className="notif-footer">
              Showing last {notifications.length} notifications · Auto-refreshes every 15s
            </div>
          )}
        </div>
      )}
    </div>
  );
}
