import { generateId } from './utils.js';

const PIN_DEFAULTS = {
  label: '',
  labelVisible: true,
  labelOffsetX: 0,
  labelOffsetY: -0.03,
  showConnector: true,
  color: '#e53935',
  icon: null,
};

export function createPin(x, y, defaults = {}) {
  return {
    ...PIN_DEFAULTS,
    ...defaults,
    id: generateId(),
    x,
    y,
  };
}

export function ensurePinDefaults(pin) {
  return { ...PIN_DEFAULTS, ...pin };
}
