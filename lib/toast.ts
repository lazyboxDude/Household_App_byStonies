export function showToast(message: string, type: 'info' | 'success' | 'error' = 'info', duration = 4000) {
  try {
    const id = `toast_${Date.now()}_${Math.floor(Math.random()*1000)}`;
    const containerId = 'global-toast-container';
    let container = document.getElementById(containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = containerId;
      container.style.position = 'fixed';
      container.style.right = '16px';
      container.style.top = 'calc(env(safe-area-inset-top, 0px) + 16px)';
      container.style.zIndex = '9999';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.gap = '8px';
      container.style.pointerEvents = 'none';
      document.body.appendChild(container);
    }

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const accent = type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--danger)' : 'var(--accent)';

    const el = document.createElement('div');
    el.id = id;
    el.className = 'material-sheet';
    el.style.minWidth = '200px';
    el.style.maxWidth = '360px';
    el.style.padding = '10px 14px';
    el.style.borderRadius = 'var(--radius-md, 14px)';
    el.style.boxShadow = 'var(--shadow-lg, 0 20px 40px rgba(0,0,0,0.2))';
    el.style.borderLeft = `3px solid ${accent}`;
    el.style.color = 'var(--text, #1d1d1f)';
    el.style.fontSize = '14px';
    el.style.fontWeight = '500';
    el.style.pointerEvents = 'auto';
    el.style.opacity = '0';
    el.style.transform = reduceMotion ? 'none' : 'translateX(24px) scale(0.96)';
    el.style.transition = reduceMotion
      ? 'opacity 180ms ease'
      : 'opacity 300ms cubic-bezier(0.32,0.72,0,1), transform 300ms cubic-bezier(0.32,0.72,0,1)';
    el.textContent = message;

    container.appendChild(el);
    // Force a layout flush so the enter transition actually animates.
    requestAnimationFrame(() => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });

    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = reduceMotion ? 'none' : 'translateX(24px) scale(0.96)';
      setTimeout(() => { try { el.remove(); } catch {} }, reduceMotion ? 180 : 300);
    }, duration);
  } catch (err) {
    // non-fatal

    console.error('showToast failed', err);
  }
}
