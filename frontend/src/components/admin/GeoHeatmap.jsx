import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { getMapPoints } from '../../utils/api';
import { useTheme } from '../../context/ThemeContext';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  PENDING: '#f59e0b',
  IN_PROGRESS: '#3b82f6',
  RESOLVED: '#10b981',
  REJECTED: '#6b7280',
};

const CATEGORY_COLORS = {
  'Water Supply': '#06b6d4',
  'Road Maintenance': '#f97316',
  'Electricity': '#eab308',
  'Public Transport': '#8b5cf6',
  'Crime': '#ef4444',
  'Corruption': '#dc2626',
  'Sanitation': '#10b981',
  'Healthcare': '#ec4899',
  'Education': '#3b82f6',
};

function MapRecenter({ center }) {
  const map = useMap();
  useEffect(() => { map.setView(center, map.getZoom()); }, [center, map]);
  return null;
}

export default function GeoHeatmap() {
  const { theme } = useTheme();
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [colorBy, setColorBy] = useState('status');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [center] = useState([20.5937, 78.9629]);

  useEffect(() => { fetchPoints(); }, []);

  const fetchPoints = async () => {
    setLoading(true);
    try { const res = await getMapPoints(); setPoints(res.data); }
    catch { toast.error('Failed to load map data'); }
    finally { setLoading(false); }
  };

  const filtered = points.filter(p => {
    if (filterStatus && p.status !== filterStatus) return false;
    if (filterCategory && p.category !== filterCategory) return false;
    return true;
  });

  const getColor = (p) => colorBy === 'status' ? STATUS_COLORS[p.status] || '#64748b' : CATEGORY_COLORS[p.category] || '#64748b';

  const stats = {
    total: filtered.length,
    urgent: filtered.filter(p => p.is_urgent).length,
    pending: filtered.filter(p => p.status === 'PENDING').length,
    resolved: filtered.filter(p => p.status === 'RESOLVED').length,
  };

  const tileUrl = theme === 'dark'
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  return (
    <div className="flex flex-col gap-lg animate-fade">
      <h1 className="page-title" style={{ margin: 0 }}>🗺️ Complaint Map</h1>

      <div className="map-controls">
        <select className="input-select" value={colorBy} onChange={e => setColorBy(e.target.value)}>
          <option value="status">Color by Status</option>
          <option value="category">Color by Category</option>
        </select>
        <select className="input-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {['PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="input-select" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
          <option value="">All Categories</option>
          {Object.keys(CATEGORY_COLORS).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={fetchPoints} className="btn btn-secondary">↻ Refresh</button>
      </div>

      <div className="map-stats">
        {[
          { label: 'Mapped', value: stats.total, color: '#3b82f6' },
          { label: 'Urgent', value: stats.urgent, color: '#ef4444' },
          { label: 'Pending', value: stats.pending, color: '#f59e0b' },
          { label: 'Resolved', value: stats.resolved, color: '#10b981' },
        ].map(s => (
          <div key={s.label} className="map-stat" style={{ borderColor: `${s.color}33`, border: `1px solid ${s.color}33` }}>
            <div className="map-stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="map-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="map-container">
        {loading && <div className="map-overlay">Loading map data...</div>}
        <MapContainer center={center} zoom={5} style={{ height: '100%', width: '100%' }}>
          <TileLayer url={tileUrl} attribution='&copy; <a href="https://carto.com/">CARTO</a>' />
          <MapRecenter center={center} />
          {filtered.map(p => (
            <CircleMarker
              key={p.id}
              center={[p.lat, p.lng]}
              radius={p.is_urgent ? 12 : 8}
              pathOptions={{
                color: p.is_urgent ? '#ef4444' : getColor(p),
                fillColor: getColor(p),
                fillOpacity: 0.85,
                weight: p.is_urgent ? 2 : 1,
              }}
            >
              <Popup>
                <div style={{ minWidth: 200, fontFamily: 'var(--font-sans)' }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{p.title}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>{p.complaint_id}</div>
                  <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
                    <span className={`badge ${p.status === 'PENDING' ? 'badge-pending' : p.status === 'IN_PROGRESS' ? 'badge-progress' : p.status === 'RESOLVED' ? 'badge-resolved' : 'badge-rejected'}`} style={{ fontSize: 11 }}>{p.status}</span>
                    {p.category && <span style={{ fontSize: 11, background: '#1e293b', color: '#94a3b8', padding: '2px 8px', borderRadius: 4 }}>{p.category}</span>}
                    {p.is_urgent && <span className="badge badge-urgent">⚠️ URGENT</span>}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      <div className="map-legend">
        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Legend:</div>
        {colorBy === 'status'
          ? Object.entries(STATUS_COLORS).map(([s, c]) => (
            <div key={s} className="map-legend-item"><div className="map-legend-dot" style={{ background: c }} />{s}</div>
          ))
          : Object.entries(CATEGORY_COLORS).map(([cat, col]) => (
            <div key={cat} className="map-legend-item"><div className="map-legend-dot" style={{ background: col }} />{cat}</div>
          ))
        }
        <div className="map-legend-item" style={{ color: '#fca5a5' }}>
          <div className="map-legend-dot" style={{ background: '#ef4444', width: 14, height: 14, border: '2px solid #fff' }} />
          Urgent (larger)
        </div>
      </div>

      {filtered.length === 0 && !loading && (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-faint)', padding: 32 }}>
          📍 No geo-tagged complaints found. Citizens must enable GPS when submitting.
        </div>
      )}
    </div>
  );
}
