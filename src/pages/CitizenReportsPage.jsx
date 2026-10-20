import React, { useEffect, useMemo, useState } from 'react';
import PublicPageShell from '../components/PublicPageShell';
import StatusBadge from '../components/StatusBadge';
import { getAllReports } from '../api/api';
import RecoveryProgressBar from '../components/RecoveryProgressBar';

export default function CitizenReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [query, setQuery] = useState('');
  const [selectedPhotos, setSelectedPhotos] = useState(null);
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const loadReports = () => {
      getAllReports()
        .then(r => {
          if (isMounted) {
            setReports((r.data || []).filter(x => x && x.status !== 'REJECTED'));
            setLoadError('');
          }
        })
        .catch(() => {
          if (isMounted) {
            setLoadError('Unable to load situation reports. Please check your connection.');
          }
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    };
    loadReports();
    const interval = setInterval(loadReports, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const filtered = useMemo(() => {
    if (!Array.isArray(reports)) return [];
    return reports.filter(r => {
      if (!r) return false;
      const matchesStatus = filter === 'ALL' || r.status === filter;
      const haystack = `${r.reportNumber || ''} ${r.title || ''} ${r.location || ''} ${r.reporterName || ''}`.toLowerCase();
      return matchesStatus && haystack.includes(query.toLowerCase());
    });
  }, [reports, filter, query]);

  return (
    <PublicPageShell eyebrow="PUBLIC TRACKING" title="Situation Reports" description="Search public situation & damage reports and follow their recovery progress.">
      <div className="report-filter-bar card-surface">
        <div className="search-field"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search report number, title or location..." /></div>
        <select value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="ALL">All Status</option><option value="IN_PROGRESS">In Progress</option><option value="RESOLVED">Resolved</option>
        </select>
      </div>

      {loadError && <div className="form-message error" style={{ marginBottom: 16 }}>⚠ {loadError}</div>}

      {loading ? <div className="page-loading card-surface">Loading situation reports...</div> : (
        <div className="report-grid-modern">
          {filtered.length === 0 ? <div className="empty-card card-surface"><h3>No reports found</h3><p>Try changing your search or status filter.</p></div> : filtered.map(r => (
            <article className="report-modern-card card-surface" key={r.id}>
              <div className="report-modern-head"><div><span className="report-number">{r.reportNumber || `Report ${r.id}`}</span><h3>{r.title}</h3></div><StatusBadge status={r.status} /></div>
              <p className="report-location">{r.location}</p>
              {r.description && <p className="report-card-description">{r.description}</p>}
              
              {r.photoUrls?.length > 0 && (
                <div 
                  className="dashboard-report-photo" 
                  onClick={() => { setSelectedPhotos(r.photoUrls); setPhotoIndex(0); }}
                  style={{ cursor: 'pointer', margin: '10px 0' }}
                >
                  <img src={r.photoUrls[0]} alt={r.title} style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 8 }} />
                  {r.photoUrls.length > 1 && (
                    <span style={{ fontSize: 11, color: '#8EB69B', marginTop: 4, display: 'inline-block' }}>+{r.photoUrls.length - 1} more photos</span>
                  )}
                </div>
              )}

              <div className="report-tags">
                <span>{(r.damageType || 'OTHER').replaceAll('_', ' ')}</span>
                <span className={`severity-tag ${(r.severity || '').toLowerCase()}`}>{r.severity || 'N/A'}</span>
                {r.reporterName && <span>Reported by : {r.reporterName}</span>}
              </div>
              <RecoveryProgressBar status={r.status} recoveryProgress={r.recoveryProgress} />
            </article>
          ))}
        </div>
      )}

      {selectedPhotos && (
        <div className="photo-modal" onClick={() => setSelectedPhotos(null)}>
          <div className="photo-modal-card" onClick={e => e.stopPropagation()}>
            <button className="photo-modal-close" onClick={() => setSelectedPhotos(null)}>×</button>
            {selectedPhotos.length > 1 && (
              <button className="photo-prev" onClick={() => setPhotoIndex((photoIndex - 1 + selectedPhotos.length) % selectedPhotos.length)}>‹</button>
            )}
            <img src={selectedPhotos[photoIndex]} alt="Report detail" />
            {selectedPhotos.length > 1 && (
              <button className="photo-next" onClick={() => setPhotoIndex((photoIndex + 1) % selectedPhotos.length)}>›</button>
            )}
            <div className="photo-count">{photoIndex + 1} / {selectedPhotos.length}</div>
          </div>
        </div>
      )}
    </PublicPageShell>
  );
}
