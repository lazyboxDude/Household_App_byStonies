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
      container.style.top = '16px';
      container.style.zIndex = '9999';
      document.body.appendChild(container);
    }

    const el = document.createElement('div');
    el.id = id;
    el.style.marginTop = '8px';
    el.style.minWidth = '180px';
    el.style.padding = '10px 12px';
    el.style.borderRadius = '8px';
    el.style.boxShadow = '0 6px 18px rgba(0,0,0,0.08)';
    el.style.color = '#0f172a';
    el.style.fontSize = '14px';
    el.style.background = type === 'success' ? '#dcfce7' : type === 'error' ? '#fee2e2' : '#eef2ff';
    el.textContent = message;

    container.appendChild(el);

    setTimeout(() => {
      try { el.style.transition = 'opacity 200ms ease'; el.style.opacity = '0'; } catch {}
      setTimeout(() => { try { el.remove(); } catch {} }, 220);
    }, duration);
  } catch (err) {
    // non-fatal
    // eslint-disable-next-line no-console
    console.error('showToast failed', err);
  }
}
