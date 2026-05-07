import { Pinnable } from '../src/index.js';

const STORAGE_KEY = 'pinnable-demo-data';
const PALETTE = [
  '#e53935', '#1e88e5', '#43a047', '#fb8c00',
  '#8e24aa', '#00acc1', '#6d4c41', '#546e7a',
];
const EVENT_LOG_LIMIT = 80;

// Sample SVG icons encoded as data URIs for map-pin demo
const SAMPLE_CUSTOM_ICONS = [
  {
    id: 'warning',
    label: 'Warning',
    src: 'data:image/svg+xml,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    ),
  },
  {
    id: 'search',
    label: 'Observation',
    src: 'data:image/svg+xml,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    ),
  },
  {
    id: 'shield',
    label: 'Health & Safety',
    src: 'data:image/svg+xml,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>',
    ),
  },
];

const container = document.getElementById('pinnableContainer');
const placeholder = document.getElementById('placeholder');
const imageInput = document.getElementById('imageInput');
const dataOutput = document.getElementById('dataOutput');
const btnSave = document.getElementById('btnSave');
const btnExport = document.getElementById('btnExport');
const btnClear = document.getElementById('btnClear');
const btnZoomIn = document.getElementById('btnZoomIn');
const btnZoomOut = document.getElementById('btnZoomOut');
const btnResetView = document.getElementById('btnResetView');
const btnLoadJson = document.getElementById('btnLoadJson');
const btnToggleData = document.getElementById('btnToggleData');
const jsonDialog = document.getElementById('jsonDialog');
const jsonInput = document.getElementById('jsonInput');
const btnJsonCancel = document.getElementById('btnJsonCancel');
const btnJsonLoad = document.getElementById('btnJsonLoad');

const optAutoOpenAdd = document.getElementById('optAutoOpenAdd');
const optAutoOpenSelect = document.getElementById('optAutoOpenSelect');
const optMapPinMode = document.getElementById('optMapPinMode');

const eventLog = document.getElementById('eventLog');
const btnClearEvents = document.getElementById('btnClearEvents');

let pinnable = null;

function buildOptions() {
  const mapPin = optMapPinMode.checked;
  return {
    availableIcons: [],
    availableColors: PALETTE,
    customIcons: mapPin ? SAMPLE_CUSTOM_ICONS : [],
    defaultMarkerStyle: mapPin ? 'map-pin' : null,
    defaultIcon: mapPin ? 'warning' : null,
    showEditorOnAdd: optAutoOpenAdd.checked,
    showEditorOnSelect: optAutoOpenSelect.checked,
  };
}

function initPinnable() {
  if (pinnable) pinnable.destroy();
  placeholder.style.display = 'none';
  pinnable = new Pinnable(container, buildOptions());
  return pinnable;
}

function updateDataOutput(data) {
  dataOutput.textContent = JSON.stringify(data, null, 2);
}

function logEvent(name, detail) {
  const time = new Date().toTimeString().slice(0, 8);
  const entry = document.createElement('li');

  const timeEl = document.createElement('span');
  timeEl.className = 'demo-event-time';
  timeEl.textContent = time;

  const nameEl = document.createElement('span');
  const shortName = name.replace(/^pinnable:/, '');
  nameEl.className = `demo-event-name demo-event-name-${shortName.replace('pin-', '')}`;
  nameEl.textContent = shortName;

  const detailEl = document.createElement('span');
  detailEl.className = 'demo-event-detail';
  detailEl.textContent = formatDetail(name, detail);

  entry.appendChild(timeEl);
  entry.appendChild(nameEl);
  entry.appendChild(detailEl);
  eventLog.insertBefore(entry, eventLog.firstChild);

  while (eventLog.children.length > EVENT_LOG_LIMIT) {
    eventLog.removeChild(eventLog.lastChild);
  }
}

function formatDetail(name, detail) {
  if (!detail) return '';
  if (detail.pin) {
    const p = detail.pin;
    const id = p.id ? p.id.slice(0, 6) : '?';
    const label = p.label ? ` "${p.label}"` : '';
    return `${id}${label}`;
  }
  if (detail.pins) {
    return `${detail.pins.length} pin(s)`;
  }
  return '';
}

container.addEventListener('pinnable:load', (e) => logEvent('pinnable:load', e.detail));

container.addEventListener('pinnable:save', (e) => {
  logEvent('pinnable:save', e.detail);
  localforage.setItem(STORAGE_KEY, e.detail).then(() => {
    updateDataOutput(e.detail);
    showToast('Data saved');
  });
});

container.addEventListener('pinnable:pin-add', (e) => {
  logEvent('pinnable:pin-add', e.detail);
  if (pinnable) updateDataOutput(pinnable.save());
});

container.addEventListener('pinnable:pin-remove', (e) => {
  logEvent('pinnable:pin-remove', e.detail);
  if (pinnable) updateDataOutput(pinnable.save());
});

container.addEventListener('pinnable:pin-update', (e) => {
  logEvent('pinnable:pin-update', e.detail);
  if (pinnable) updateDataOutput(pinnable.save());
});

container.addEventListener('pinnable:pin-selected', (e) => {
  logEvent('pinnable:pin-selected', e.detail);
});

imageInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (ev) => {
    const inst = initPinnable();
    await inst.load({
      image: { src: ev.target.result, name: file.name },
    });
    updateDataOutput(inst.save());
  };
  reader.readAsDataURL(file);
  imageInput.value = '';
});

btnZoomIn.addEventListener('click', () => pinnable?.zoomIn());
btnZoomOut.addEventListener('click', () => pinnable?.zoomOut());
btnResetView.addEventListener('click', () => pinnable?.resetView());

btnSave.addEventListener('click', () => {
  if (pinnable) pinnable.save();
});

btnExport.addEventListener('click', async () => {
  if (!pinnable) return;
  try {
    const blob = await pinnable.exportImage({ format: 'png' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pinnable-export.png';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Image exported');
  } catch (err) {
    alert('Export failed: ' + err.message);
  }
});

btnClear.addEventListener('click', async () => {
  await localforage.removeItem(STORAGE_KEY);
  if (pinnable) {
    pinnable.destroy();
    pinnable = null;
  }
  placeholder.style.display = '';
  dataOutput.textContent = '';
  showToast('Data cleared');
});

btnLoadJson.addEventListener('click', () => {
  jsonDialog.showModal();
});

btnJsonCancel.addEventListener('click', () => {
  jsonDialog.close();
});

btnJsonLoad.addEventListener('click', async () => {
  try {
    const data = JSON.parse(jsonInput.value);
    const inst = initPinnable();
    await inst.load(data);
    updateDataOutput(inst.save());
    jsonDialog.close();
    jsonInput.value = '';
  } catch (err) {
    alert('Invalid JSON: ' + err.message);
  }
});

let dataVisible = true;
btnToggleData.addEventListener('click', () => {
  dataVisible = !dataVisible;
  dataOutput.style.display = dataVisible ? '' : 'none';
});

btnClearEvents.addEventListener('click', () => {
  eventLog.innerHTML = '';
});

async function rebuildPinnable() {
  if (!pinnable) return;
  const data = pinnable.save();
  pinnable.destroy();
  pinnable = new Pinnable(container, buildOptions());
  await pinnable.load(data);
}

optAutoOpenAdd.addEventListener('change', rebuildPinnable);
optAutoOpenSelect.addEventListener('change', rebuildPinnable);
optMapPinMode.addEventListener('change', rebuildPinnable);

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'demo-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('demo-toast-visible'));
  setTimeout(() => {
    toast.classList.remove('demo-toast-visible');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

async function init() {
  try {
    const saved = await localforage.getItem(STORAGE_KEY);
    if (saved && saved.image && saved.image.src) {
      const inst = initPinnable();
      await inst.load(saved);
      updateDataOutput(saved);
    }
  } catch (err) {
    console.warn('Pinnable demo: failed to load saved data', err);
  }
}

init();
