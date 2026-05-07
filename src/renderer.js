import { ViewTransform } from './transform.js';

const PIN_RADIUS = 8;
const PIN_SELECTED_COLOR = '#1e88e5';
const PIN_BORDER_COLOR = '#ffffff';
const PIN_BORDER_WIDTH = 2;
const ICON_FONT_SIZE = 18;
const CUSTOM_ICON_SIZE = 20;
const LABEL_FONT = '12px system-ui, -apple-system, sans-serif';
const LABEL_COLOR = '#333333';
const LABEL_BG = 'rgba(255, 255, 255, 0.9)';
const LABEL_PADDING = 4;
const CONNECTOR_WIDTH = 1.5;
const CONNECTOR_DASH = [4, 3];
const SELECTION_RING_RADIUS = 14;
const SELECTION_RING_WIDTH = 2;

export const MAP_PIN_RADIUS = 12;
export const MAP_PIN_TAIL_HEIGHT = 10;
const MAP_PIN_ICON_SIZE = 14;
const MAP_PIN_BORDER_WIDTH = 2;
const MAP_PIN_SELECTION_RING_RADIUS = 18;

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = 1;
    this.customIconMap = new Map();
  }

  setCustomIcons(map) {
    this.customIconMap = map;
  }

  clear() {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawImage(image, transform) {
    const d = this.dpr;
    this.ctx.setTransform(
      transform.scale * d, 0,
      0, transform.scale * d,
      transform.offsetX * d,
      transform.offsetY * d,
    );
    this.ctx.drawImage(image, 0, 0);
  }

  drawPins(pins, transform, selectedPinId, sizeScale = 1) {
    const d = this.dpr;
    this.ctx.setTransform(d, 0, 0, d, 0, 0);

    for (const pin of pins) {
      const pinScreen = transform.normalizedToScreen(pin.x, pin.y);
      const isSelected = pin.id === selectedPinId;

      let labelScreen = null;
      if (pin.labelVisible && pin.label) {
        labelScreen = transform.normalizedToScreen(
          pin.x + (pin.labelOffsetX || 0),
          pin.y + (pin.labelOffsetY || 0),
        );
      }

      if (labelScreen && pin.showConnector) {
        const dist = Math.hypot(labelScreen.x - pinScreen.x, labelScreen.y - pinScreen.y);
        if (dist > PIN_RADIUS * sizeScale + 4) {
          this._drawConnector(pinScreen, labelScreen, pin.color || '#e53935', sizeScale);
        }
      }

      this._drawPinMarker(pinScreen.x, pinScreen.y, pin, isSelected, sizeScale);

      if (labelScreen) {
        this._drawLabel(labelScreen.x, labelScreen.y, pin.label, sizeScale);
      }
    }
  }

  _drawPinMarker(x, y, pin, isSelected, sizeScale = 1) {
    if (pin.markerStyle === 'map-pin') {
      return this._drawMapPin(x, y, pin, isSelected, sizeScale);
    }

    const ctx = this.ctx;
    const color = pin.color || '#e53935';
    const icon = pin.icon;
    const radius = PIN_RADIUS * sizeScale;

    if (isSelected) {
      ctx.beginPath();
      ctx.arc(x, y, SELECTION_RING_RADIUS * sizeScale, 0, Math.PI * 2);
      ctx.strokeStyle = PIN_SELECTED_COLOR;
      ctx.lineWidth = SELECTION_RING_WIDTH * sizeScale;
      ctx.stroke();
    }

    if (!icon) {
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = PIN_BORDER_WIDTH * sizeScale;
      ctx.strokeStyle = PIN_BORDER_COLOR;
      ctx.stroke();
    } else if (this.customIconMap.has(icon)) {
      const img = this.customIconMap.get(icon);
      const size = CUSTOM_ICON_SIZE * sizeScale;
      ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
    } else {
      const fontSize = ICON_FONT_SIZE * sizeScale;
      ctx.font = `${fontSize}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(icon, x, y);
    }
  }

  _drawMapPin(x, y, pin, isSelected, sizeScale = 1) {
    const ctx = this.ctx;
    const color = pin.color || '#e53935';
    const r = MAP_PIN_RADIUS * sizeScale;
    const tailH = MAP_PIN_TAIL_HEIGHT * sizeScale;
    const borderW = MAP_PIN_BORDER_WIDTH * sizeScale;

    // (x, y) is the tip of the tail — the actual floor-plan location.
    // The circle centre sits above the tip.
    const cx = x;
    const cy = y - tailH - r;

    // Selection ring wraps the circle portion
    if (isSelected) {
      ctx.beginPath();
      ctx.arc(cx, cy, MAP_PIN_SELECTION_RING_RADIUS * sizeScale, 0, Math.PI * 2);
      ctx.strokeStyle = PIN_SELECTED_COLOR;
      ctx.lineWidth = SELECTION_RING_WIDTH * sizeScale;
      ctx.stroke();
    }

    // Draw teardrop: circle + triangular tail
    ctx.beginPath();
    const tailAngle = Math.asin(Math.min(1, (r * 0.4) / r));
    const startAngle = Math.PI / 2 + tailAngle;
    const endAngle = Math.PI / 2 - tailAngle + Math.PI * 2;
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.lineTo(x, y);
    ctx.closePath();

    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = borderW;
    ctx.strokeStyle = PIN_BORDER_COLOR;
    ctx.stroke();

    // Draw icon inside the circle (white tinted)
    if (pin.icon && this.customIconMap.has(pin.icon)) {
      const img = this.customIconMap.get(pin.icon);
      const iconSize = MAP_PIN_ICON_SIZE * sizeScale;
      this._drawTintedIcon(img, cx, cy, iconSize, '#ffffff');
    }
  }

  _drawTintedIcon(img, cx, cy, size, tintColor) {
    const offCanvas = document.createElement('canvas');
    offCanvas.width = size;
    offCanvas.height = size;
    const offCtx = offCanvas.getContext('2d');

    offCtx.drawImage(img, 0, 0, size, size);

    offCtx.globalCompositeOperation = 'source-in';
    offCtx.fillStyle = tintColor;
    offCtx.fillRect(0, 0, size, size);

    this.ctx.drawImage(offCanvas, cx - size / 2, cy - size / 2, size, size);
  }

  _drawLabel(x, y, text, sizeScale = 1) {
    const ctx = this.ctx;
    const fontSize = 12 * sizeScale;
    const padding = LABEL_PADDING * sizeScale;
    ctx.font = `${fontSize}px system-ui, -apple-system, sans-serif`;
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = fontSize + 2;

    const bgX = x - textWidth / 2 - padding;
    const bgY = y - textHeight / 2 - padding;
    const bgW = textWidth + padding * 2;
    const bgH = textHeight + padding * 2;

    ctx.fillStyle = LABEL_BG;
    ctx.beginPath();
    ctx.roundRect(bgX, bgY, bgW, bgH, 4 * sizeScale);
    ctx.fill();

    ctx.fillStyle = LABEL_COLOR;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
  }

  _drawConnector(from, to, color, sizeScale = 1) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = CONNECTOR_WIDTH * sizeScale;
    ctx.setLineDash(CONNECTOR_DASH.map((v) => v * sizeScale));
    ctx.stroke();
    ctx.setLineDash([]);
  }

  drawLongPressRing(x, y, progress, color = '#1a73e8') {
    const d = this.dpr;
    const ctx = this.ctx;
    ctx.setTransform(d, 0, 0, d, 0, 0);

    const radius = 40;
    const lineWidth = 6;
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + Math.PI * 2 * progress;
    const prevLineCap = ctx.lineCap;

    ctx.lineCap = 'round';
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
    ctx.lineWidth = lineWidth;
    ctx.stroke();

    if (progress > 0) {
      ctx.beginPath();
      ctx.arc(x, y, radius, startAngle, endAngle);
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    const prevAlpha = ctx.globalAlpha;
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = color;
    ctx.fill();
    ctx.globalAlpha = prevAlpha;
    ctx.lineCap = prevLineCap;
  }

  render(image, pins, transform, selectedPinId) {
    this.clear();
    if (image) {
      this.drawImage(image, transform);
    }
    if (pins && pins.length > 0) {
      this.drawPins(pins, transform, selectedPinId);
    }
  }

  renderToOffscreen(image, pins, imageWidth, imageHeight, scale = 1) {
    const offCanvas = document.createElement('canvas');
    offCanvas.width = imageWidth * scale;
    offCanvas.height = imageHeight * scale;

    const offRenderer = new Renderer(offCanvas);
    offRenderer.dpr = 1;
    offRenderer.customIconMap = this.customIconMap;

    const offTransform = new ViewTransform();
    offTransform.imageWidth = imageWidth;
    offTransform.imageHeight = imageHeight;
    offTransform.scale = scale;
    offTransform.offsetX = 0;
    offTransform.offsetY = 0;

    const sizeScale = Math.max(1, (imageWidth * scale) / 800);

    offRenderer.clear();
    if (image) {
      offRenderer.drawImage(image, offTransform);
    }
    if (pins && pins.length > 0) {
      offRenderer.drawPins(pins, offTransform, null, sizeScale);
    }

    return offCanvas;
  }

  resize(width, height) {
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
  }

  measureLabel(text) {
    this.ctx.font = LABEL_FONT;
    const metrics = this.ctx.measureText(text);
    return {
      width: metrics.width + LABEL_PADDING * 2,
      height: 14 + LABEL_PADDING * 2,
    };
  }
}
