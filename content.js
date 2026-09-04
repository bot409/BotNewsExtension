(() => {
  const DOWNLOAD_DIR = 'news feed system';
  const FILE_NAME = 'index.html';
  const EXPECTED_SUFFIX = `/${DOWNLOAD_DIR}/${FILE_NAME}`;

  const currentPath = decodeURIComponent(window.location.pathname);
  if (!currentPath.endsWith(EXPECTED_SUFFIX)) {
    return; // Not our file — do nothing.
  }

  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('aria-label', 'עדכון');
  button.title = 'עדכון';
  button.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 11a8 8 0 0 0-14.9-4M4 5v5h5M4 13a8 8 0 0 0 14.9 4M20 19v-5h-5"/>
    </svg>
  `;

  Object.assign(button.style, {
    position: 'fixed',
    left: '16px',
    bottom: '16px',
    width: '44px',
    height: '44px',
    padding: '10px',
    border: 'none',
    borderRadius: '50%',
    background: '#ffffff',
    color: '#333333',
    boxShadow: '0 2px 10px rgba(0,0,0,.25)',
    cursor: 'pointer',
    zIndex: '2147483647',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  });

  const svg = button.querySelector('svg');
  Object.assign(svg.style, {
    width: '100%',
    height: '100%',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '2',
    strokeLinecap: 'round',
    strokeLinejoin: 'round'
  });

  const style = document.createElement('style');
  style.textContent = `
    @keyframes newsExtensionSpin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .news-extension-update-spinning {
      animation: newsExtensionSpin 0.8s linear infinite;
    }
  `;
  document.documentElement.appendChild(style);
  document.documentElement.appendChild(button);

  button.addEventListener('click', () => {
    if (button.disabled) return;

    button.disabled = true;
    svg.classList.add('news-extension-update-spinning');
    button.style.cursor = 'wait';

    chrome.runtime.sendMessage({ type: 'updateNewsHtml' }, (response) => {
      if (chrome.runtime.lastError || !response?.ok) {
        svg.classList.remove('news-extension-update-spinning');
        button.disabled = false;
        button.style.cursor = 'pointer';
        return;
      }

      svg.classList.remove('news-extension-update-spinning');
      window.location.reload();
    });
  });
})();
