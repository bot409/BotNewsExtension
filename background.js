const DOWNLOAD_DIR = 'news feed system';
const FILE_NAME = 'index.html';
const DOWNLOAD_PATH = `${DOWNLOAD_DIR}/${FILE_NAME}`;
const SOURCE_URL = 'https://raw.githubusercontent.com/bot409/bot/main/index.html';

chrome.downloads.onDeterminingFilename.addListener((downloadItem, suggest) => {
  if (downloadItem.byExtensionId === chrome.runtime.id) {
    suggest({
      filename: DOWNLOAD_PATH,
      conflictAction: 'overwrite'
    });
  } else {
    suggest();
  }
});

chrome.omnibox.onInputEntered.addListener(async () => {
  try {
    const filePath = await ensureFile();
    await chrome.tabs.create({ url: toFileUrl(filePath) });
  } catch (error) {
    console.error('Could not open the News Extension HTML file:', error);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'updateNewsHtml') return;

  (async () => {
    try {
      const existing = await findExistingFile();

      // Remove the old download record/file when possible.
      if (existing) {
        try {
          await chrome.downloads.removeFile(existing.id);
        } catch (_) {
          // The file may already have been deleted manually.
        }
        try {
          await chrome.downloads.erase({ id: existing.id });
        } catch (_) {
          // Erasing history is best-effort.
        }
      }

      const id = await chrome.downloads.download({
        url: SOURCE_URL,
        filename: DOWNLOAD_PATH,
        conflictAction: 'overwrite',
        saveAs: false
      });

      await waitForDownload(id);
      sendResponse({ ok: true });
    } catch (error) {
      console.error('Could not update the News Extension HTML file:', error);
      sendResponse({ ok: false, error: String(error) });
    }
  })();

  return true;
});

async function ensureFile() {
  const existing = await findExistingFile();
  if (existing) return existing.filename;

  const id = await chrome.downloads.download({
    url: SOURCE_URL,
    filename: DOWNLOAD_PATH,
    conflictAction: 'overwrite',
    saveAs: false
  });

  await waitForDownload(id);

  const downloaded = await chrome.downloads.search({ id });
  if (!downloaded[0]?.filename) {
    throw new Error('Downloaded file path could not be determined');
  }
  return downloaded[0].filename;
}

async function findExistingFile() {
  const existing = await chrome.downloads.search({
    query: [DOWNLOAD_DIR, FILE_NAME]
  });

  return existing.find(item => {
    if (!item.filename) return false;
    const normalized = item.filename.replace(/\\/g, '/');
    return normalized.endsWith(`/${DOWNLOAD_PATH}`) &&
      item.state === 'complete' &&
      item.exists === true;
  }) || null;
}

function toFileUrl(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  if (/^[A-Za-z]:\//.test(normalized)) {
    return `file:///${encodeURI(normalized)}`;
  }
  return `file://${encodeURI(normalized)}`;
}

function waitForDownload(id) {
  return new Promise((resolve, reject) => {
    const listener = (delta) => {
      if (delta.id !== id || !delta.state) return;

      if (delta.state.current === 'complete') {
        chrome.downloads.onChanged.removeListener(listener);
        resolve();
      } else if (delta.state.current === 'interrupted') {
        chrome.downloads.onChanged.removeListener(listener);
        reject(new Error('Download interrupted'));
      }
    };

    chrome.downloads.onChanged.addListener(listener);
  });
}
