// js/google-drive.js (standalone ES module for demo.html)
let CLIENT_ID = '';
let API_KEY = '';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
let folderId = null;
let userEmail = '';

function getCredentials() {
  CLIENT_ID = localStorage.getItem('googleClientId') || document.getElementById('googleClientId')?.value || '';
  API_KEY = localStorage.getItem('googleApiKey') || document.getElementById('googleApiKey')?.value || '';
  userEmail = localStorage.getItem('userEmail') || document.getElementById('userEmail')?.value || '';
}

window.initiateGoogleDriveAuth = function() {
  getCredentials();
  if (!CLIENT_ID || !API_KEY) {
    alert('Please enter your Google API credentials.');
    return;
  }
  if (!userEmail || !/^[^@]+@[^@]+\.[^@]+$/.test(userEmail)) {
    alert('Please enter a valid Gmail address.');
    return;
  }
  gapi.load('client:auth2', () => {
    gapi.client.init({
      apiKey: API_KEY,
      clientId: CLIENT_ID,
      discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
      scope: SCOPES,
    }).then(() => {
      return gapi.auth2.getAuthInstance().signIn({prompt: 'consent', login_hint: userEmail});
    }).then(() => {
      findOrCreateFolder().then(id => {
        folderId = id;
        localStorage.setItem('gdrive_token', gapi.auth.getToken().access_token);
        localStorage.setItem('gdrive_folder', folderId);
        localStorage.setItem('gdrive_email', gapi.auth2.getAuthInstance().currentUser.get().getBasicProfile().getEmail());
      });
    }).catch(err => {
      alert('Google Drive authentication failed: ' + (err.error || err.message));
    });
  });
};

function findOrCreateFolder() {
  return gapi.client.drive.files.list({
    q: `name='MediaUploads' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive'
  }).then(response => {
    const files = response.result.files;
    if (files && files.length > 0) {
      return files[0].id;
    } else {
      // Create folder
      return gapi.client.drive.files.create({
        resource: {
          name: 'MediaUploads',
          mimeType: 'application/vnd.google-apps.folder'
        },
        fields: 'id'
      }).then(res => res.result.id);
    }
  });
}

window.uploadFileToDrive = function(file, onSuccess, onError) {
  getCredentials();
  const token = gapi.auth.getToken()?.access_token || localStorage.getItem('gdrive_token');
  const folder = folderId || localStorage.getItem('gdrive_folder');
  if (!token || !folder) {
    alert('Google Drive not connected. Please connect first.');
    return;
  }
  const metadata = {
    name: file.name,
    mimeType: file.type,
    parents: [folder]
  };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}));
  form.append('file', file);

  fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,webContentLink', {
    method: 'POST',
    headers: new Headers({ 'Authorization': 'Bearer ' + token }),
    body: form,
  })
  .then(res => res.json())
  .then(val => {
    // Make file public (optional)
    return gapi.client.drive.permissions.create({
      fileId: val.id,
      resource: { role: 'reader', type: 'anyone' }
    }).then(() => {
      if (onSuccess) onSuccess(val);
    });
  })
  .catch(err => {
    if (onError) onError(err);
    else alert('Upload failed: ' + (err.message || err));
  });
}; 