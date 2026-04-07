export const DEFAULT_ICONS = [
  { id: 'circle', emoji: null, label: 'Circle' },
  { id: 'pushpin', emoji: '\u{1F4CC}', label: 'Pushpin' },
  { id: 'round-pushpin', emoji: '\u{1F4CD}', label: 'Round Pushpin' },
  { id: 'fire-extinguisher', emoji: '\u{1F9EF}', label: 'Fire Extinguisher' },
  { id: 'door', emoji: '\u{1F6AA}', label: 'Door' },
  { id: 'warning', emoji: '\u26A0\uFE0F', label: 'Warning' },
  { id: 'fire', emoji: '\u{1F525}', label: 'Fire' },
  { id: 'cross-mark', emoji: '\u274C', label: 'Cross Mark' },
  { id: 'check-mark', emoji: '\u2705', label: 'Check Mark' },
  { id: 'red-circle', emoji: '\u{1F534}', label: 'Red Circle' },
  { id: 'green-circle', emoji: '\u{1F7E2}', label: 'Green Circle' },
  { id: 'yellow-circle', emoji: '\u{1F7E1}', label: 'Yellow Circle' },
  { id: 'blue-circle', emoji: '\u{1F535}', label: 'Blue Circle' },
  { id: 'star', emoji: '\u2B50', label: 'Star' },
  { id: 'house', emoji: '\u{1F3E0}', label: 'House' },
  { id: 'wrench', emoji: '\u{1F527}', label: 'Wrench' },
  { id: 'lightbulb', emoji: '\u{1F4A1}', label: 'Lightbulb' },
  { id: 'lock', emoji: '\u{1F512}', label: 'Lock' },
  { id: 'camera', emoji: '\u{1F4F7}', label: 'Camera' },
  { id: 'shower', emoji: '\u{1F6BF}', label: 'Shower' },
  { id: 'wheelchair', emoji: '\u267F', label: 'Wheelchair' },
];

export function getAvailableIcons(whitelist = [], customIcons = []) {
  let icons = [...DEFAULT_ICONS];

  if (whitelist.length > 0) {
    const allowed = new Set(whitelist);
    allowed.add('circle');
    icons = icons.filter((i) => allowed.has(i.id));
  }

  for (const custom of customIcons) {
    icons.push({
      id: custom.id,
      emoji: null,
      label: custom.label || custom.id,
      custom: true,
      src: custom.src,
    });
  }

  return icons;
}

export function preloadCustomIcons(customIcons = []) {
  const map = new Map();
  const promises = customIcons.map((icon) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        map.set(icon.id, img);
        resolve();
      };
      img.onerror = () => {
        console.warn(`Pinnable: failed to load custom icon: ${icon.src}`);
        resolve();
      };
      img.src = icon.src;
    });
  });
  return { map, ready: Promise.all(promises) };
}
