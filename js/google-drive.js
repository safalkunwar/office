// js/google-drive.js
// Promise-based ES module for Google Drive auth and upload

let CLIENT_ID = '';
let API_KEY = '';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

let cachedFolderId = null;
let isGapiInitialized = false;
let tokenClient = null;
const folderCache = new Map();

function readCredentialsFromDomOrStorage() {
  CLIENT_ID = (localStorage.getItem('googleClientId') || document.getElementById('googleClientId')?.value || '').trim();
  API_KEY = (localStorage.getItem('googleApiKey') || document.getElementById('googleApiKey')?.value || '').trim();
}

function readAndPersistUserEmailIfPresent() {
  const emailInput = document.getElementById('userEmail');
  const emailFromStorage = localStorage.getItem('userEmail');
  const email = (emailInput?.value || emailFromStorage || '').trim();
  if (email && email !== emailFromStorage) {
    localStorage.setItem('userEmail', email);
  }
  return email;
}

function setSetupUiState(state, message) {
  // Optional UI present on student/admin setup page
  const emailSection = document.getElementById('emailInputSection');
  const progressSection = document.getElementById('oauthProgressSection');
  const connectedSection = document.getElementById('connectedStatusSection');
  const errorSection = document.getElementById('errorSection');
  const errorMessage = document.getElementById('errorMessage');

  if (emailSection) emailSection.style.display = state === 'email' ? 'block' : 'none';
  if (progressSection) progressSection.style.display = state === 'progress' ? 'block' : 'none';
  if (connectedSection) connectedSection.style.display = state === 'connected' ? 'block' : 'none';
  if (errorSection) errorSection.style.display = state === 'error' ? 'block' : 'none';
  if (errorMessage && message) errorMessage.textContent = message;

  if (state === 'connected') {
    const email = localStorage.getItem('gdrive_email') || localStorage.getItem('userEmail') || '';
    const connectedEmailEl = document.getElementById('connectedEmail');
    if (connectedEmailEl) connectedEmailEl.textContent = email || 'Connected Account';
  }
}

function showCredentialsStatus(message, type = 'success') {
  const status = document.getElementById('googleApiCredentialsStatus');
  if (status) {
    status.className = `status-message ${type}`;
    status.textContent = message;
  }
}

function saveCredentialsFromInputs() {
  const clientId = document.getElementById('googleClientId')?.value?.trim();
  const apiKey = document.getElementById('googleApiKey')?.value?.trim();
  if (!clientId || !apiKey) {
    showCredentialsStatus('Please enter both Client ID and API Key.', 'error');
    return false;
  }
  localStorage.setItem('googleClientId', clientId);
  localStorage.setItem('googleApiKey', apiKey);
  showCredentialsStatus('Credentials saved. You can now connect Google Drive.', 'success');
  return true;
}

function gapiLoadClient() {
  return new Promise((resolve) => {
    window.gapi.load('client', resolve);
  });
}

async function ensureGapiInitialized() {
  if (isGapiInitialized) return;
  readCredentialsFromDomOrStorage();
  if (!CLIENT_ID || !API_KEY) {
    throw new Error('Missing Google API credentials. Please set Client ID and API Key.');
  }
  await gapiLoadClient();
  await window.gapi.client.init({
    apiKey: API_KEY,
    discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
  });
  isGapiInitialized = true;
}

function getOrCreateTokenClient({ initial } = { initial: false }) {
  if (tokenClient) return tokenClient;
  const emailHint = localStorage.getItem('gdrive_email') || localStorage.getItem('userEmail') || undefined;
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    // First connect uses consent; subsequent calls will override prompt below
    prompt: initial ? 'consent' : '',
    hint: emailHint,
    callback: () => {},
  });
  return tokenClient;
}

async function ensureSignedIn() {
  await ensureGapiInitialized();
  // If we already have a token set on gapi, just reuse it
  const currentToken = window.gapi.client.getToken?.();
  if (currentToken?.access_token) return currentToken.access_token;
  // Request or refresh silently if possible
  const emailHint = localStorage.getItem('gdrive_email') || localStorage.getItem('userEmail') || undefined;
  const token = await new Promise((resolve, reject) => {
    try {
      const client = getOrCreateTokenClient({ initial: false });
      client.callback = (resp) => {
        if (resp && resp.access_token) {
          window.gapi.client.setToken({ access_token: resp.access_token });
          resolve(resp.access_token);
        } else {
          reject(new Error(resp?.error || 'Failed to obtain access token'));
        }
      };
      client.requestAccessToken({ prompt: '', hint: emailHint });
    } catch (e) {
      reject(e);
    }
  });
  return token;
}

async function findOrCreateUploadsFolder() {
  if (cachedFolderId) return cachedFolderId;
  const listRes = await window.gapi.client.drive.files.list({
    q: "name='MediaUploads' and mimeType='application/vnd.google-apps.folder' and trashed=false",
    fields: 'files(id, name)',
    spaces: 'drive',
  });
  const files = listRes.result.files || [];
  if (files.length > 0) {
    cachedFolderId = files[0].id;
  } else {
    const createRes = await window.gapi.client.drive.files.create({
      resource: { name: 'MediaUploads', mimeType: 'application/vnd.google-apps.folder' },
      fields: 'id',
    });
    cachedFolderId = createRes.result.id;
  }
  return cachedFolderId;
}

function sanitizeFolderName(name) {
  if (!name) return 'Unknown';
  return String(name).replace(/[\\/:*?"<>|\n\r]+/g, ' ').trim().slice(0, 128) || 'Unknown';
}

async function findOrCreateChildFolder(parentId, childName) {
  const key = parentId + '::' + childName;
  if (folderCache.has(key)) return folderCache.get(key);
  const listRes = await window.gapi.client.drive.files.list({
    q: `name='${childName.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`,
    fields: 'files(id, name)'
  });
  const files = listRes.result.files || [];
  let id;
  if (files.length > 0) {
    id = files[0].id;
  } else {
    const createRes = await window.gapi.client.drive.files.create({
      resource: { name: childName, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] },
      fields: 'id'
    });
    id = createRes.result.id;
  }
  folderCache.set(key, id);
  return id;
}

export async function initiateGoogleDriveAuth() {
  try {
    const email = readAndPersistUserEmailIfPresent();
    setSetupUiState('progress');
    await ensureGapiInitialized();
    const client = getOrCreateTokenClient({ initial: true });
    const token = await new Promise((resolve, reject) => {
      client.callback = (resp) => {
        if (resp && resp.access_token) {
          window.gapi.client.setToken({ access_token: resp.access_token });
          resolve(resp.access_token);
        } else {
          reject(new Error(resp?.error || 'Failed to obtain access token'));
        }
      };
      client.requestAccessToken({ prompt: 'consent', hint: email || undefined });
    });

    const folderId = await findOrCreateUploadsFolder();
    if (email) localStorage.setItem('gdrive_email', email);
    localStorage.setItem('gdrive_token', token || '');
    localStorage.setItem('gdrive_folder', folderId || '');
    localStorage.setItem('gdrive_connected', '1');

    setSetupUiState('connected');
    return { folderId, email: localStorage.getItem('gdrive_email') || email || '' };
  } catch (err) {
    console.error('Google Drive authentication failed', err);
    setSetupUiState('error', err?.message || 'Authentication failed.');
    throw err;
  }
}

export async function uploadFileToDrive(file, subfolderName) {
  if (!file) throw new Error('No file provided');
  const token = await ensureSignedIn();
  const rootFolderId = await findOrCreateUploadsFolder();
  let targetFolderId = rootFolderId;
  if (subfolderName) {
    const safe = sanitizeFolderName(subfolderName);
    targetFolderId = await findOrCreateChildFolder(rootFolderId, safe);
  }
  localStorage.setItem('gdrive_token', token);
  localStorage.setItem('gdrive_folder', rootFolderId);

  const metadata = { name: file.name, mimeType: file.type || 'application/octet-stream', parents: [targetFolderId] };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);

  const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink,parents', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token },
    body: form,
  });

  if (!uploadRes.ok) {
    const text = await uploadRes.text();
    throw new Error(`Upload failed (${uploadRes.status}): ${text}`);
  }
  const fileInfo = await uploadRes.json();

  try {
    await window.gapi.client.drive.permissions.create({ fileId: fileInfo.id, resource: { role: 'reader', type: 'anyone' } });
  } catch (e) {
    console.warn('Could not set public permission:', e);
  }

  return fileInfo;
}

export function disconnectGoogleDrive() {
  try {
    // Revoke token via GIS if present
    const accessToken = window.gapi?.client?.getToken?.()?.access_token;
    if (accessToken && window.google?.accounts?.oauth2?.revoke) {
      window.google.accounts.oauth2.revoke(accessToken, () => {});
    }
  } catch {}
  localStorage.removeItem('gdrive_token');
  localStorage.removeItem('gdrive_folder');
  localStorage.removeItem('gdrive_connected');
  // keep gdrive_email for convenience
  setSetupUiState('email');
}

export function retryGoogleDriveAuth() {
  return initiateGoogleDriveAuth();
}

// Expose for inline HTML buttons
if (typeof window !== 'undefined') {
  window.initiateGoogleDriveAuth = initiateGoogleDriveAuth;
  window.uploadFileToDrive = uploadFileToDrive;
  window.disconnectGoogleDrive = disconnectGoogleDrive;
  window.retryGoogleDriveAuth = retryGoogleDriveAuth;
}

// Initialize setup UI from stored connection
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const saveBtn = document.getElementById('saveGoogleApiCredentialsBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const saved = saveCredentialsFromInputs();
        if (saved) {
          readAndPersistUserEmailIfPresent();
        }
      });
    }
    // If previously connected, show connected UI
    const connected = localStorage.getItem('gdrive_connected') === '1' && localStorage.getItem('gdrive_folder');
    if (connected) setSetupUiState('connected');
  });
} 