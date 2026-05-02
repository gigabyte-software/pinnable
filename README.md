# @gigabyte/pinnable

Interactive canvas-based pin-on-image component. Designed for floor plans, site maps, and similar use cases where users need to place, label, and manage markers on large images.

Zero dependencies. Works with any framework or vanilla JS.

## Features

- Canvas rendering with pinch-to-zoom, scroll-zoom, and pan
- Long-press to place pins (1s grace period + 0.75s radial progress ring)
- Per-pin editing: label, color, icon, visibility toggles
- Draggable labels with connector lines
- 20+ built-in emoji icons, custom image icon support
- Rasterized image export with pins baked in
- Normalized (0..1) coordinate storage for resolution independence
- View state persistence (zoom level and pan position)
- High-DPI / Retina display support
- Gesture locking (pinch and pan don't interfere with each other)
- Haptic feedback on pin placement (supported devices)
- Optional host-driven editing (suppress the built-in editor and react via events)

## Installation

```bash
npm install @gigabyte/pinnable
```

Or load the UMD build directly:

```html
<script src="dist/pinnable.umd.js"></script>
<script>
  const { Pinnable } = window.Pinnable;
</script>
```

## Quick Start

```html
<div id="container" style="width: 100%; height: 500px;"></div>
```

```js
import { Pinnable } from '@gigabyte/pinnable';

const pinnable = new Pinnable(document.getElementById('container'));

await pinnable.load({
  image: { src: '/path/to/floorplan.jpg', name: 'floorplan.jpg' },
});
```

## Usage

### Constructor

```js
const pinnable = new Pinnable(containerElement, options);
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `defaultIcon` | `string \| null` | `null` | Default icon for new pins (`null` = filled circle) |
| `availableColors` | `string[]` | 8 preset colors | Color swatches shown in the pin editor |
| `availableIcons` | `string[]` | `[]` (all shown) | Icon ID whitelist. Empty = show all built-in icons |
| `customIcons` | `object[]` | `[]` | Custom image icons (see below) |
| `showEditorOnAdd` | `boolean` | `true` | Whether the built-in editor opens automatically when a pin is placed |
| `showEditorOnSelect` | `boolean` | `true` | Whether the built-in editor opens automatically when an existing pin is clicked/tapped |

### Methods

#### `load(data): Promise<void>`

Load an image and optionally restore pins and view state.

```js
await pinnable.load({
  image: { src: 'data:image/png;base64,...', name: 'plan.png' },
  pins: [...],       // optional, array of pin objects
  viewState: {...},  // optional, saved zoom/pan state
});
```

#### `save(): object`

Returns the current state and dispatches a `pinnable:save` event.

```js
const data = pinnable.save();
// data = { image: {...}, pins: [...], viewState: {...} }
```

#### `exportImage(options): Promise<Blob | string>`

Renders the image with pins baked in at full resolution.

```js
const blob = await pinnable.exportImage({
  format: 'png',       // 'png' | 'jpeg'
  quality: 0.92,       // JPEG quality (0-1)
  scale: 1,            // Scale multiplier
  asDataUrl: false,     // true returns a data URL string instead of Blob
});
```

#### `zoomIn()` / `zoomOut()` / `resetView()`

Programmatic zoom and view reset.

#### `openEditor(pinId): void`

Opens the built-in pin editor for the given pin. No-op if `pinId` is unknown. Useful when `showEditorOnAdd` / `showEditorOnSelect` are `false` and you want to fall back to the built-in dialog from your own UI.

#### `closeEditor(): void`

Hides the built-in pin editor and clears the current selection.

#### `updatePin(pinId, changes): object | null`

Partial update of a pin's editable fields. Allowed keys: `label`, `labelVisible`, `showConnector`, `color`, `icon` (the same fields the built-in dialog can change). Other keys are ignored.

- Dispatches `pinnable:pin-update` once if anything actually changed.
- Refreshes the built-in editor if it's currently open for this pin.
- Returns the updated pin (shallow copy) or `null` if `pinId` is unknown.

```js
pinnable.updatePin(pin.id, { label: 'Fire exit', color: '#e53935' });
```

For position / label-offset changes, use drag interactions — those are intentionally outside this API.

#### `removePin(pinId): boolean`

Removes a pin (mirrors the built-in editor's Delete button). Closes the editor if it was open for this pin. Dispatches `pinnable:pin-remove`. Returns `true` on success, `false` if `pinId` is unknown.

#### `destroy()`

Remove all DOM elements, event listeners, and observers. Call when unmounting.

### Events

Listen on the container element:

```js
container.addEventListener('pinnable:save', (e) => {
  console.log(e.detail); // { image, pins, viewState }
});
```

| Event | Detail | When |
|-------|--------|------|
| `pinnable:load` | Full data object | Image loaded |
| `pinnable:save` | Full data object | `save()` called |
| `pinnable:pin-add` | `{ pin }` | Pin placed |
| `pinnable:pin-remove` | `{ pin }` | Pin deleted |
| `pinnable:pin-update` | `{ pin }` | Pin edited (label, color, icon, position, toggles) |
| `pinnable:pin-selected` | `{ pin }` | Existing pin selected (clicked/tapped) |

### Host-driven editing

Set `showEditorOnAdd` and/or `showEditorOnSelect` to `false` to suppress the built-in editor dialog. The corresponding events still fire, so a host app can render its own UI and use `updatePin` / `removePin` / `openEditor` to drive changes:

```js
const pinnable = new Pinnable(container, {
  showEditorOnAdd: false,
  showEditorOnSelect: false,
});

container.addEventListener('pinnable:pin-selected', (e) => {
  myCustomUi.open(e.detail.pin, {
    onSave: (changes) => pinnable.updatePin(e.detail.pin.id, changes),
    onDelete: () => pinnable.removePin(e.detail.pin.id),
    onFallback: () => pinnable.openEditor(e.detail.pin.id),
  });
});
```

### Pin Data Structure

```js
{
  id: 'uuid',
  x: 0.5,              // Normalized X (0..1)
  y: 0.3,              // Normalized Y (0..1)
  label: 'Fire exit',
  labelVisible: true,
  labelOffsetX: 0,      // Normalized offset from pin
  labelOffsetY: -0.03,
  showConnector: true,
  color: '#e53935',
  icon: null,           // null = circle, string = emoji or custom icon ID
}
```

Coordinates are normalized (0..1) relative to the original image dimensions. This makes pin positions resilient to image resizes or resolution changes. To convert to pixel coordinates: `pixelX = pin.x * imageWidth`.

### Custom Icons

```js
const pinnable = new Pinnable(container, {
  customIcons: [
    { id: 'fire-panel', label: 'Fire Panel', src: '/icons/fire-panel.svg' },
  ],
  availableIcons: ['circle', 'pushpin', 'fire-panel'], // whitelist
});
```

Built-in icon IDs: `circle`, `pushpin`, `round-pushpin`, `fire-extinguisher`, `door`, `warning`, `fire`, `cross-mark`, `check-mark`, `red-circle`, `green-circle`, `yellow-circle`, `blue-circle`, `star`, `house`, `wrench`, `lightbulb`, `lock`, `camera`, `shower`, `wheelchair`.

## Interaction Model

| Action | Mouse | Touch |
|--------|-------|-------|
| Place pin | Long-click (hold ~1.75s) | Long-press (hold ~1.75s) |
| Select/edit pin | Click pin | Tap pin |
| Pan | Click + drag | One-finger drag |
| Zoom | Scroll wheel | Pinch |
| Drag pin | Click + drag pin | Touch + drag pin |
| Drag label | Click + drag label | Touch + drag label |
| Dismiss editor | Click empty space | Tap empty space |

Pin placement uses a two-phase long press: a 1-second grace period (no visual feedback, allows scroll/pan to start) followed by a 0.75-second radial progress ring. This prevents accidental pin placement during navigation.

Gesture locking prevents pinch-to-zoom from triggering a pan when one finger lifts first, and vice versa. All fingers must be lifted between gesture types.

The built-in editor can be suppressed entirely with `showEditorOnAdd` / `showEditorOnSelect`. In that mode, listen for `pinnable:pin-add` / `pinnable:pin-selected` and use `updatePin` / `removePin` / `openEditor` to drive editing yourself — see [Host-driven editing](#host-driven-editing).

## Development

```bash
npm install
npm run dev       # Starts Vite dev server with sample app
npm run build     # Builds ESM and UMD bundles to dist/
```

The `sample/` folder contains a standalone demo app with localforage persistence.

## Versioning

This project follows [Semantic Versioning](https://semver.org/):

- **PATCH** (0.1.x): Bug fixes, visual tweaks, internal refactors with no API changes
- **MINOR** (0.x.0): New features, new options, new events (backwards-compatible)
- **MAJOR** (x.0.0): Breaking changes to constructor options, method signatures, event names, or data structure

## License

[MIT](LICENSE)
