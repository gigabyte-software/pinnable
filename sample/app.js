import { Pinnable } from '../src/index.js';

const STORAGE_KEY = 'pinnable-demo-data';

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

let pinnable = null;

function initPinnable() {
  if (pinnable) pinnable.destroy();
  placeholder.style.display = 'none';
  pinnable = new Pinnable(container, {
    availableIcons: [],
    availableColors: [
      '#e53935', '#1e88e5', '#43a047', '#fb8c00',
      '#8e24aa', '#00acc1', '#6d4c41', '#546e7a',
    ],
  });
  return pinnable;
}

function updateDataOutput(data) {
  dataOutput.textContent = JSON.stringify(data, null, 2);
}

container.addEventListener('pinnable:save', (e) => {
  localforage.setItem(STORAGE_KEY, e.detail).then(() => {
    updateDataOutput(e.detail);
    showToast('Data saved');
  });
});

container.addEventListener('pinnable:pin-add', () => {
  updateDataOutput(pinnable.save());
});

container.addEventListener('pinnable:pin-remove', () => {
  updateDataOutput(pinnable.save());
});

container.addEventListener('pinnable:pin-update', () => {
  updateDataOutput(pinnable.save());
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
