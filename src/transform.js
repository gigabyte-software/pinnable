import { clamp } from './utils.js';

const MIN_SCALE = 0.1;
const MAX_SCALE = 20;

export class ViewTransform {
  constructor() {
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.imageWidth = 0;
    this.imageHeight = 0;
  }

  /** Restore from saved viewState or fit image to container */
  init(imageWidth, imageHeight, canvasWidth, canvasHeight, viewState) {
    this.imageWidth = imageWidth;
    this.imageHeight = imageHeight;
    if (viewState && typeof viewState.scale === 'number') {
      this.scale = clamp(viewState.scale, MIN_SCALE, MAX_SCALE);
      this.offsetX = viewState.offsetX || 0;
      this.offsetY = viewState.offsetY || 0;
    } else {
      this.fitToView(canvasWidth, canvasHeight);
    }
  }

  fitToView(canvasWidth, canvasHeight) {
    if (!this.imageWidth || !this.imageHeight) return;
    const padding = 20;
    const scaleX = (canvasWidth - padding * 2) / this.imageWidth;
    const scaleY = (canvasHeight - padding * 2) / this.imageHeight;
    this.scale = Math.min(scaleX, scaleY);
    this.offsetX = (canvasWidth - this.imageWidth * this.scale) / 2;
    this.offsetY = (canvasHeight - this.imageHeight * this.scale) / 2;
  }

  /** Screen pixel coords -> image pixel coords */
  screenToImage(sx, sy) {
    return {
      x: (sx - this.offsetX) / this.scale,
      y: (sy - this.offsetY) / this.scale,
    };
  }

  /** Image pixel coords -> screen pixel coords */
  imageToScreen(ix, iy) {
    return {
      x: ix * this.scale + this.offsetX,
      y: iy * this.scale + this.offsetY,
    };
  }

  /** Normalized (0..1) -> image pixel coords */
  normalizedToImage(nx, ny) {
    return {
      x: nx * this.imageWidth,
      y: ny * this.imageHeight,
    };
  }

  /** Image pixel coords -> normalized (0..1) */
  imageToNormalized(ix, iy) {
    return {
      x: this.imageWidth ? ix / this.imageWidth : 0,
      y: this.imageHeight ? iy / this.imageHeight : 0,
    };
  }

  /** Screen coords -> normalized */
  screenToNormalized(sx, sy) {
    const img = this.screenToImage(sx, sy);
    return this.imageToNormalized(img.x, img.y);
  }

  /** Normalized -> screen coords */
  normalizedToScreen(nx, ny) {
    const img = this.normalizedToImage(nx, ny);
    return this.imageToScreen(img.x, img.y);
  }

  /** Zoom centered on a screen point */
  zoomAt(screenX, screenY, factor) {
    const newScale = clamp(this.scale * factor, MIN_SCALE, MAX_SCALE);
    const ratio = newScale / this.scale;
    this.offsetX = screenX - (screenX - this.offsetX) * ratio;
    this.offsetY = screenY - (screenY - this.offsetY) * ratio;
    this.scale = newScale;
  }

  /** Pan by screen-space delta */
  pan(dx, dy) {
    this.offsetX += dx;
    this.offsetY += dy;
  }

  /** Apply transform to a canvas 2D context */
  applyToContext(ctx) {
    ctx.setTransform(this.scale, 0, 0, this.scale, this.offsetX, this.offsetY);
  }

  /** Export viewState for persistence */
  toJSON() {
    return {
      scale: this.scale,
      offsetX: this.offsetX,
      offsetY: this.offsetY,
    };
  }
}
