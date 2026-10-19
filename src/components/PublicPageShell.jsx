import React from 'react';
import PublicNavbar from './PublicNavbar';

export default function PublicPageShell({ eyebrow, title, description, action, children, wide = false }) {
  return (
    <div className="public-page-shell">
      <PublicNavbar />
      <main className={`public-page-content ${wide ? 'wide' : ''}`}>
        {(title || description || action) && (
          <div className="page-heading-row">
            <div>
              {eyebrow && <span className="page-eyebrow">{eyebrow}</span>}
              {title && <h1>{title}</h1>}
              {description && <p>{description}</p>}
            </div>
            {action && <div className="page-heading-action">{action}</div>}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
