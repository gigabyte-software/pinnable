import { ViewTransform } from './transform.js';
import { Renderer } from './renderer.js';
import { Interaction, LONG_PRESS_DURATION } from './interaction.js';
import { Popover } from './popover.js';
import { createPin, ensurePinDefaults } from './pin.js';
import { injectStyles } from './styles.js';
import { getAvailableIcons, preloadCustomIcons } from './icons.js';

const HIT_RADIUS = 12;
const DEFAULT_COLORS = [
  '#e53935', '#1e88e5', '#43a047', '#fb8c00',
  '#8e24aa', '#00acc1', '#6d4c41', '#546e7a',
];

export class Pinnable {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      defaultIcon: options.defaultIcon ?? null,
      availableIcons: options.availableIcons ?? [],
      availableColors: options.availableColors ?? DEFAULT_COLORS,
      customIcons: options.customIcons ?? [],
    };

    injectStyles();

    this.wrapper = document.createElement('div');
    this.wrapper.className = 'pinnable-wrapper';
    this.container.appendChild(this.wrapper);

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'pinnable-canvas';
    this.wrapper.appendChild(this.canvas);

    this.transform = new ViewTransform();
    this.renderer = new Renderer(this.canvas);
    this.interaction = new Interaction(this.canvas);
    this.popover = new Popover(this.wrapper);

    this._iconList = getAvailableIcons(
      this.options.availableIcons,
      this.options.customIcons,
    );
    this.popover.setColors(this.options.availableColors);
    this.popover.setIcons(this._iconList);

    if (this.options.customIcons.length > 0) {
      const { map, ready } = preloadCustomIcons(this.options.customIcons);
      this._customIconMap = map;
      this._customIconsReady = ready;
      ready.then(() => this.renderer.setCustomIcons(map));
    } else {
      this._customIconMap = new Map();
      this._customIconsReady = Promise.resolve();
    }

    this.pins = [];
    this.image = null;
    this.imageData = null;
    this.selectedPinId = null;
    this._loaded = false;
    this._rafId = null;
    this._longPressState = null;
    this._longPressRafId = null;

    this._wireInteraction();
    this._wirePopover();
    this._setupResize();
  }

  _wireInteraction() {
    this.interaction.onZoom = (sx, sy, factor) => this._handleZoom(sx, sy, factor);
    this.interaction.onPan = (dx, dy) => this._handlePan(dx, dy);
    this.interaction.onPinPlace = (sx, sy) => this._handlePinPlace(sx, sy);
    this.interaction.onPinSelect = (pinId) => this._handlePinSelect(pinId);
    this.interaction.onPinDrag = (pinId, sx, sy) => this._handlePinDrag(pinId, sx, sy);
    this.interaction.onPinDragEnd = (pinId) => this._handlePinDragEnd(pinId);
    this.interaction.onLabelDrag = (pinId, sx, sy) => this._handleLabelDrag(pinId, sx, sy);
    this.interaction.onLabelDragEnd = (pinId) => this._handleLabelDragEnd(pinId);
    this.interaction.onLongPressStart = (sx, sy) => this._handleLongPressStart(sx, sy);
    this.interaction.onLongPressCancel = () => this._handleLongPressCancel();
    this.interaction.onEmptyTap = (sx, sy) => this._handleEmptyTap(sx, sy);
    this.interaction.hitTest = (sx, sy) => this._hitTest(sx, sy);
  }

  _wirePopover() {
    this.popover.onLabelChange = (pinId, label) => this._handleLabelChange(pinId, label);
    this.popover.onDelete = (pinId) => this._handleDelete(pinId);
    this.popover.onColorChange = (pinId, color) => this._handleColorChange(pinId, color);
    this.popover.onIconChange = (pinId, icon) => this._handleIconChange(pinId, icon);
    this.popover.onToggle = (pinId, field, value) => this._handleToggle(pinId, field, value);
    this.popover.onClose = () => {
      this.selectedPinId = null;
      this._render();
    };
  }

  _setupResize() {
    this._resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          this.renderer.resize(width, height);
          this._render();
        }
      }
    });
    this._resizeObserver.observe(this.wrapper);
  }

  async load(data) {
    if (!data || !data.image || !data.image.src) {
      throw new Error('Pinnable: data.image.src is required');
    }

    this.imageData = { ...data.image };
    this.pins = (data.pins || []).map((p) => ensurePinDefaults({ ...p }));
    this.selectedPinId = null;
    this.popover.hide();

    await this._loadImage(data.image.src);
    await this._customIconsReady;

    this.imageData.width = this.image.naturalWidth;
    this.imageData.height = this.image.naturalHeight;

    const rect = this.wrapper.getBoundingClientRect();
    this.renderer.resize(rect.width, rect.height);
    this.transform.init(
      this.image.naturalWidth,
      this.image.naturalHeight,
      rect.width,
      rect.height,
      data.viewState || null,
    );

    this._loaded = true;
    this._render();
    this._dispatchEvent('pinnable:load', this._buildData());
  }

  _loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.image = img;
        resolve();
      };
      img.onerror = () => reject(new Error(`Pinnable: failed to load image: ${src}`));
      img.src = src;
    });
  }

  save() {
    const data = this._buildData();
    this._dispatchEvent('pinnable:save', data);
    return data;
  }

  _buildData() {
    return {
      image: { ...this.imageData },
      pins: this.pins.map((p) => ({ ...p })),
      viewState: this.transform.toJSON(),
    };
  }

  async exportImage(options = {}) {
    if (!this.image) throw new Error('Pinnable: no image loaded');

    const format = options.format || 'png';
    const quality = options.quality ?? 0.92;
    const scale = options.scale ?? 1;
    const asDataUrl = options.asDataUrl ?? false;
    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';

    const offCanvas = this.renderer.renderToOffscreen(
      this.image,
      this.pins,
      this.imageData.width,
      this.imageData.height,
      scale,
    );

    if (asDataUrl) {
      return offCanvas.toDataURL(mimeType, quality);
    }

    return new Promise((resolve, reject) => {
      try {
        offCanvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Pinnable: export failed'));
          },
          mimeType,
          quality,
        );
      } catch (err) {
        reject(new Error(`Pinnable: export failed (CORS?) - ${err.message}`));
      }
    });
  }

  destroy() {
    this._resizeObserver.disconnect();
    this.popover.destroy();
    this.interaction.destroy();
    if (this._rafId) cancelAnimationFrame(this._rafId);
    if (this._longPressRafId) cancelAnimationFrame(this._longPressRafId);
    this.wrapper.remove();
  }

  zoomIn() {
    const rect = this.canvas.getBoundingClientRect();
    this._handleZoom(rect.width / 2, rect.height / 2, 1.3);
  }

  zoomOut() {
    const rect = this.canvas.getBoundingClientRect();
    this._handleZoom(rect.width / 2, rect.height / 2, 1 / 1.3);
  }

  resetView() {
    const rect = this.wrapper.getBoundingClientRect();
    this.transform.fitToView(rect.width, rect.height);
    this._updatePopoverPosition();
    this._render();
  }

  _handleZoom(sx, sy, factor) {
    this.transform.zoomAt(sx, sy, factor);
    this._updatePopoverPosition();
    this._render();
  }

  _handlePan(dx, dy) {
    this.transform.pan(dx, dy);
    this._updatePopoverPosition();
    this._render();
  }

  _handlePinPlace(screenX, screenY) {
    if (!this._loaded) return;

    const norm = this.transform.screenToNormalized(screenX, screenY);
    if (norm.x < 0 || norm.x > 1 || norm.y < 0 || norm.y > 1) return;

    if (navigator.vibrate) navigator.vibrate(50);

    const pin = createPin(norm.x, norm.y, {
      color: this.options.availableColors[0] || '#e53935',
      icon: this.options.defaultIcon,
    });
    this.pins.push(pin);
    this.selectedPinId = pin.id;

    const screenPos = this.transform.normalizedToScreen(pin.x, pin.y);
    this.popover.show(pin, screenPos.x, screenPos.y);

    this._dispatchEvent('pinnable:pin-add', { pin: { ...pin } });
    this._render();
  }

  _handleEmptyTap(screenX, screenY) {
    if (this.popover.isVisible()) {
      this.popover.hide();
      this.selectedPinId = null;
      this._render();
    }
  }

  _handleLongPressStart(screenX, screenY) {
    if (!this._loaded) return;
    if (this.popover.isVisible()) return;

    const color = this.options.availableColors[0] || '#e53935';
    this._longPressState = {
      x: screenX,
      y: screenY,
      startTime: performance.now(),
      color,
    };
    this._animateLongPress();
  }

  _handleLongPressCancel() {
    if (!this._longPressState) return;
    this._longPressState = null;
    if (this._longPressRafId) {
      cancelAnimationFrame(this._longPressRafId);
      this._longPressRafId = null;
    }
    this._render();
  }

  _animateLongPress() {
    if (!this._longPressState) return;

    const { x, y, startTime, color } = this._longPressState;
    const elapsed = performance.now() - startTime;
    const progress = Math.min(elapsed / LONG_PRESS_DURATION, 1);

    this.renderer.render(this.image, this.pins, this.transform, this.selectedPinId);
    this.renderer.drawLongPressRing(x, y, progress, color);

    if (progress < 1) {
      this._longPressRafId = requestAnimationFrame(() => this._animateLongPress());
    }
  }

  _handlePinSelect(pinId) {
    this.selectedPinId = pinId;
    const pin = this.pins.find((p) => p.id === pinId);
    if (pin) {
      const screenPos = this.transform.normalizedToScreen(pin.x, pin.y);
      this.popover.show(pin, screenPos.x, screenPos.y);
      this._dispatchEvent('pinnable:pin-selected', { pin: { ...pin } });
    }
    this._render();
  }

  _handlePinDrag(pinId, screenX, screenY) {
    const pin = this.pins.find((p) => p.id === pinId);
    if (!pin) return;
    const norm = this.transform.screenToNormalized(screenX, screenY);
    pin.x = norm.x;
    pin.y = norm.y;
    this._updatePopoverPosition();
    this._render();
  }

  _handlePinDragEnd(pinId) {
    const pin = this.pins.find((p) => p.id === pinId);
    if (pin) {
      this._dispatchEvent('pinnable:pin-update', { pin: { ...pin } });
    }
  }

  _handleLabelDrag(pinId, screenX, screenY) {
    const pin = this.pins.find((p) => p.id === pinId);
    if (!pin) return;
    const norm = this.transform.screenToNormalized(screenX, screenY);
    pin.labelOffsetX = norm.x - pin.x;
    pin.labelOffsetY = norm.y - pin.y;
    this._updatePopoverPosition();
    this._render();
  }

  _handleLabelDragEnd(pinId) {
    const pin = this.pins.find((p) => p.id === pinId);
    if (pin) {
      this._dispatchEvent('pinnable:pin-update', { pin: { ...pin } });
    }
  }

  _handleLabelChange(pinId, newLabel) {
    const pin = this.pins.find((p) => p.id === pinId);
    if (!pin) return;
    pin.label = newLabel;
    this._dispatchEvent('pinnable:pin-update', { pin: { ...pin } });
    this._render();
  }

  _handleColorChange(pinId, color) {
    const pin = this.pins.find((p) => p.id === pinId);
    if (!pin) return;
    pin.color = color;
    this._dispatchEvent('pinnable:pin-update', { pin: { ...pin } });
    this._render();
  }

  _handleIconChange(pinId, icon) {
    const pin = this.pins.find((p) => p.id === pinId);
    if (!pin) return;
    pin.icon = icon;
    this._dispatchEvent('pinnable:pin-update', { pin: { ...pin } });
    this._render();
  }

  _handleToggle(pinId, field, value) {
    const pin = this.pins.find((p) => p.id === pinId);
    if (!pin) return;
    pin[field] = value;
    this._dispatchEvent('pinnable:pin-update', { pin: { ...pin } });
    this._render();
  }

  _handleDelete(pinId) {
    const idx = this.pins.findIndex((p) => p.id === pinId);
    if (idx === -1) return;
    const removed = this.pins.splice(idx, 1)[0];
    this.selectedPinId = null;
    this._dispatchEvent('pinnable:pin-remove', { pin: { ...removed } });
    this._render();
  }

  _hitTest(screenX, screenY) {
    for (const pin of this.pins) {
      if (pin.labelVisible && pin.label) {
        const labelScreen = this.transform.normalizedToScreen(
          pin.x + (pin.labelOffsetX || 0),
          pin.y + (pin.labelOffsetY || 0),
        );
        const size = this.renderer.measureLabel(pin.label);
        const halfW = size.width / 2;
        const halfH = size.height / 2;
        if (
          screenX >= labelScreen.x - halfW &&
          screenX <= labelScreen.x + halfW &&
          screenY >= labelScreen.y - halfH &&
          screenY <= labelScreen.y + halfH
        ) {
          return { type: 'label', pin };
        }
      }
    }

    for (const pin of this.pins) {
      const screen = this.transform.normalizedToScreen(pin.x, pin.y);
      const dist = Math.hypot(screen.x - screenX, screen.y - screenY);
      if (dist <= HIT_RADIUS) {
        return { type: 'pin', pin };
      }
    }

    return null;
  }

  _updatePopoverPosition() {
    if (this.popover.isVisible() && this.selectedPinId) {
      const pin = this.pins.find((p) => p.id === this.selectedPinId);
      if (pin) {
        const screen = this.transform.normalizedToScreen(pin.x, pin.y);
        this.popover.updatePosition(screen.x, screen.y);
      }
    }
  }

  _render() {
    if (this._longPressState) return;
    if (this._rafId) return;
    this._rafId = requestAnimationFrame(() => {
      this._rafId = null;
      this.renderer.render(this.image, this.pins, this.transform, this.selectedPinId);
    });
  }

  _dispatchEvent(name, detail) {
    this.container.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));
  }
}
