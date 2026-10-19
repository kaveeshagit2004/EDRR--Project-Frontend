import React from 'react';

export default function StatusBadge({ status = 'UNKNOWN' }) {
  if (String(status).toUpperCase() === 'PENDING') return null;
  const normalized = String(status).toLowerCase().replaceAll('_', '-').replaceAll(' ', '-');
  return <span className={`status-pill status-${normalized}`}>{String(status).replaceAll('_', ' ')}</span>;
}
