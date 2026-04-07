const DRAG_THRESHOLD = 5;
const ZOOM_SENSITIVITY = 0.001;
export const LONG_PRESS_DELAY = 1000;
export const LONG_PRESS_DURATION = 750;

export class Interaction {
  constructor(canvas) {
    this.canvas = canvas;

    this.onZoom = null;
    this.onPan = null;
    this.onPinPlace = null;
    this.onPinSelect = null;
    this.onPinDrag = null;
    this.onPinDragEnd = null;
    this.onLabelDrag = null;
    this.onLabelDragEnd = null;
    this.onLongPressStart = null;
    this.onLongPressCancel = null;
    this.onEmptyTap = null;
    this.hitTest = null;

    this._mouseDown = false;
    this._dragging = false;
    this._dragStartX = 0;
    this._dragStartY = 0;
    this._lastMouseX = 0;
    this._lastMouseY = 0;
    this._draggedHit = null;

    this._touches = [];
    this._lastPinchDist = 0;
    this._lastPinchMid = null;
    this._touchDragging = false;
    this._touchStartX = 0;
    this._touchStartY = 0;
    this._touchGesture = null; // null | 'single' | 'pinch'

    this._longPressDelayTimer = null;
    this._longPressTimer = null;
    this._longPressActive = false;
    this._longPressCompleted = false;

    this._bindEvents();
  }

  _bindEvents() {
    this._handlers = {
      wheel: this._onWheel.bind(this),
      mousedown: this._onMouseDown.bind(this),
      mousemove: this._onMouseMove.bind(this),
      mouseup: this._onMouseUp.bind(this),
      touchstart: this._onTouchStart.bind(this),
      touchmove: this._onTouchMove.bind(this),
      touchend: this._onTouchEnd.bind(this),
      contextmenu: (e) => e.preventDefault(),
    };

    this.canvas.addEventListener('wheel', this._handlers.wheel, { passive: false });
    this.canvas.addEventListener('mousedown', this._handlers.mousedown);
    this.canvas.addEventListener('mousemove', this._handlers.mousemove);
    this.canvas.addEventListener('mouseup', this._handlers.mouseup);
    this.canvas.addEventListener('mouseleave', this._handlers.mouseup);
    this.canvas.addEventListener('touchstart', this._handlers.touchstart, { passive: false });
    this.canvas.addEventListener('touchmove', this._handlers.touchmove, { passive: false });
    this.canvas.addEventListener('touchend', this._handlers.touchend);
    this.canvas.addEventListener('touchcancel', this._handlers.touchend);
    this.canvas.addEventListener('contextmenu', this._handlers.contextmenu);
  }

  _getCanvasXY(e) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  _startLongPress(x, y) {
    this._longPressCompleted = false;

    this._longPressDelayTimer = setTimeout(() => {
      this._longPressDelayTimer = null;
      this._longPressActive = true;
      if (this.onLongPressStart) this.onLongPressStart(x, y);

      this._longPressTimer = setTimeout(() => {
        this._longPressActive = false;
        this._longPressCompleted = true;
        this._longPressTimer = null;
        if (this.onLongPressCancel) this.onLongPressCancel();
        if (this.onPinPlace) this.onPinPlace(x, y);
      }, LONG_PRESS_DURATION);
    }, LONG_PRESS_DELAY);
  }

  _cancelLongPress() {
    if (this._longPressDelayTimer) {
      clearTimeout(this._longPressDelayTimer);
      this._longPressDelayTimer = null;
    }
    if (!this._longPressActive) return;
    clearTimeout(this._longPressTimer);
    this._longPressTimer = null;
    this._longPressActive = false;
    if (this.onLongPressCancel) this.onLongPressCancel();
  }

  _onWheel(e) {
    e.preventDefault();
    const { x, y } = this._getCanvasXY(e);
    const delta = -e.deltaY * ZOOM_SENSITIVITY;
    const factor = Math.exp(delta);
    if (this.onZoom) this.onZoom(x, y, factor);
  }

  _onMouseDown(e) {
    if (e.button !== 0) return;
    const { x, y } = this._getCanvasXY(e);
    this._mouseDown = true;
    this._dragging = false;
    this._dragStartX = x;
    this._dragStartY = y;
    this._lastMouseX = x;
    this._lastMouseY = y;
    this._draggedHit = this.hitTest ? this.hitTest(x, y) : null;

    if (!this._draggedHit) {
      this._startLongPress(x, y);
    }
  }

  _onMouseMove(e) {
    if (!this._mouseDown) return;
    const { x, y } = this._getCanvasXY(e);
    const dx = x - this._lastMouseX;
    const dy = y - this._lastMouseY;

    if (!this._dragging) {
      const dist = Math.hypot(x - this._dragStartX, y - this._dragStartY);
      if (dist > DRAG_THRESHOLD) {
        this._dragging = true;
        this._cancelLongPress();
      }
    }

    if (this._dragging) {
      if (this._draggedHit) {
        const { type, pin } = this._draggedHit;
        if (type === 'label' && this.onLabelDrag) {
          this.onLabelDrag(pin.id, x, y);
        } else if (type === 'pin' && this.onPinDrag) {
          this.onPinDrag(pin.id, x, y);
        }
      } else {
        if (this.onPan) this.onPan(dx, dy);
      }
    }

    this._lastMouseX = x;
    this._lastMouseY = y;
  }

  _onMouseUp(e) {
    if (!this._mouseDown) return;
    this._cancelLongPress();
    const wasClick = !this._dragging;
    const wasCompleted = this._longPressCompleted;
    this._longPressCompleted = false;

    const pos = typeof e.clientX === 'number'
      ? this._getCanvasXY(e)
      : { x: this._lastMouseX, y: this._lastMouseY };

    if (this._draggedHit && this._dragging) {
      const { type, pin } = this._draggedHit;
      if (type === 'label' && this.onLabelDragEnd) {
        this.onLabelDragEnd(pin.id);
      } else if (type === 'pin' && this.onPinDragEnd) {
        this.onPinDragEnd(pin.id);
      }
    } else if (wasClick && !wasCompleted) {
      const hit = this.hitTest ? this.hitTest(pos.x, pos.y) : null;
      if (hit) {
        if (this.onPinSelect) this.onPinSelect(hit.pin.id);
      } else {
        if (this.onEmptyTap) this.onEmptyTap(pos.x, pos.y);
      }
    }

    this._mouseDown = false;
    this._dragging = false;
    this._draggedHit = null;
  }

  _getTouchXY(touch) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  }

  _onTouchStart(e) {
    e.preventDefault();
    this._touches = Array.from(e.touches);

    if (this._touches.length === 1 && !this._touchGesture) {
      const { x, y } = this._getTouchXY(this._touches[0]);
      this._touchDragging = false;
      this._touchStartX = x;
      this._touchStartY = y;
      this._lastMouseX = x;
      this._lastMouseY = y;
      this._draggedHit = this.hitTest ? this.hitTest(x, y) : null;

      if (!this._draggedHit) {
        this._startLongPress(x, y);
      }
    } else if (this._touches.length === 2 && this._touchGesture !== 'single') {
      this._cancelLongPress();
      this._touchGesture = 'pinch';
      this._lastPinchDist = this._pinchDistance(this._touches);
      this._lastPinchMid = this._pinchMidpoint(this._touches);
    }
  }

  _onTouchMove(e) {
    e.preventDefault();
    const touches = Array.from(e.touches);

    if (touches.length === 1 && this._touchGesture !== 'pinch') {
      const { x, y } = this._getTouchXY(touches[0]);
      const dx = x - this._lastMouseX;
      const dy = y - this._lastMouseY;

      if (!this._touchDragging) {
        const dist = Math.hypot(x - this._touchStartX, y - this._touchStartY);
        if (dist > DRAG_THRESHOLD) {
          this._touchDragging = true;
          this._touchGesture = 'single';
          this._cancelLongPress();
        }
      }

      if (this._touchDragging) {
        if (this._draggedHit) {
          const { type, pin } = this._draggedHit;
          if (type === 'label' && this.onLabelDrag) {
            this.onLabelDrag(pin.id, x, y);
          } else if (type === 'pin' && this.onPinDrag) {
            this.onPinDrag(pin.id, x, y);
          }
        } else {
          if (this.onPan) this.onPan(dx, dy);
        }
      }

      this._lastMouseX = x;
      this._lastMouseY = y;
    } else if (touches.length === 2 && this._touchGesture !== 'single') {
      this._cancelLongPress();
      this._touchGesture = 'pinch';

      const dist = this._pinchDistance(touches);
      const mid = this._pinchMidpoint(touches);

      if (this._lastPinchDist > 0) {
        const factor = dist / this._lastPinchDist;
        if (this.onZoom) this.onZoom(mid.x, mid.y, factor);
      }

      const dx = mid.x - this._lastPinchMid.x;
      const dy = mid.y - this._lastPinchMid.y;
      if (this.onPan) this.onPan(dx, dy);

      this._lastPinchDist = dist;
      this._lastPinchMid = mid;
    }

    this._touches = touches;
  }

  _onTouchEnd(e) {
    const remaining = Array.from(e.touches);

    if (this._touches.length === 1 && remaining.length === 0 && this._touchGesture !== 'pinch') {
      this._cancelLongPress();
      const wasCompleted = this._longPressCompleted;
      this._longPressCompleted = false;

      if (this._draggedHit && this._touchDragging) {
        const { type, pin } = this._draggedHit;
        if (type === 'label' && this.onLabelDragEnd) {
          this.onLabelDragEnd(pin.id);
        } else if (type === 'pin' && this.onPinDragEnd) {
          this.onPinDragEnd(pin.id);
        }
      } else if (!this._touchDragging && !wasCompleted) {
        const x = this._lastMouseX;
        const y = this._lastMouseY;
        const hit = this.hitTest ? this.hitTest(x, y) : null;
        if (hit) {
          if (this.onPinSelect) this.onPinSelect(hit.pin.id);
        } else {
          if (this.onEmptyTap) this.onEmptyTap(x, y);
        }
      }
    }

    this._touches = remaining;

    if (remaining.length === 0) {
      this._touchGesture = null;
      this._draggedHit = null;
      this._touchDragging = false;
      this._lastPinchDist = 0;
      this._lastPinchMid = null;
      this._cancelLongPress();
    }
  }

  _pinchDistance(touches) {
    const a = this._getTouchXY(touches[0]);
    const b = this._getTouchXY(touches[1]);
    return Math.hypot(b.x - a.x, b.y - a.y);
  }

  _pinchMidpoint(touches) {
    const a = this._getTouchXY(touches[0]);
    const b = this._getTouchXY(touches[1]);
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  destroy() {
    clearTimeout(this._longPressDelayTimer);
    clearTimeout(this._longPressTimer);

    this.canvas.removeEventListener('wheel', this._handlers.wheel);
    this.canvas.removeEventListener('mousedown', this._handlers.mousedown);
    this.canvas.removeEventListener('mousemove', this._handlers.mousemove);
    this.canvas.removeEventListener('mouseup', this._handlers.mouseup);
    this.canvas.removeEventListener('mouseleave', this._handlers.mouseup);
    this.canvas.removeEventListener('touchstart', this._handlers.touchstart);
    this.canvas.removeEventListener('touchmove', this._handlers.touchmove);
    this.canvas.removeEventListener('touchend', this._handlers.touchend);
    this.canvas.removeEventListener('touchcancel', this._handlers.touchend);
    this.canvas.removeEventListener('contextmenu', this._handlers.contextmenu);
  }
}
