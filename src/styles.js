let injected = false;

export function injectStyles() {
  if (injected) return;
  injected = true;

  const style = document.createElement('style');
  style.textContent = `
.pinnable-wrapper {
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 100%;
  touch-action: none;
  user-select: none;
}

.pinnable-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.pinnable-popover {
  position: absolute;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  z-index: 10;
  min-width: 200px;
  max-width: 260px;
  pointer-events: auto;
  font-family: system-ui, -apple-system, sans-serif;
}

.pinnable-popover input[type="text"] {
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 14px;
  outline: none;
  width: 100%;
  box-sizing: border-box;
}

.pinnable-popover input[type="text"]:focus {
  border-color: #4a90d9;
}

.pinnable-popover-actions {
  display: flex;
  justify-content: space-between;
  gap: 6px;
}

.pinnable-popover button {
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  border: 1px solid #ccc;
  background: #f5f5f5;
}

.pinnable-popover button:hover {
  background: #eee;
}

.pinnable-popover .pinnable-delete-btn {
  color: #d32f2f;
  border-color: #d32f2f;
}

.pinnable-popover .pinnable-delete-btn:hover {
  background: #fde8e8;
}

.pinnable-hidden {
  display: none;
}

.pinnable-toggle-row {
  display: flex;
  gap: 10px;
  align-items: center;
  font-size: 12px;
  color: #555;
}

.pinnable-toggle-row label {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  white-space: nowrap;
}

.pinnable-toggle-row input[type="checkbox"] {
  margin: 0;
  cursor: pointer;
}

.pinnable-section-label {
  font-size: 11px;
  color: #888;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.pinnable-color-swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.pinnable-color-swatch {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: border-color 0.15s;
  box-sizing: border-box;
}

.pinnable-color-swatch:hover {
  border-color: rgba(0, 0, 0, 0.3);
}

.pinnable-color-swatch.pinnable-active {
  border-color: #333;
}

.pinnable-icon-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  max-height: 72px;
  overflow-y: auto;
}

.pinnable-icon-cell {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  border: 2px solid transparent;
  cursor: pointer;
  font-size: 16px;
  background: none;
  padding: 0;
  transition: border-color 0.15s, background 0.15s;
  line-height: 1;
}

.pinnable-icon-cell:hover {
  background: #f0f0f0;
}

.pinnable-icon-cell.pinnable-active {
  border-color: #4a90d9;
  background: #e8f0fe;
}

.pinnable-icon-cell-circle {
  display: block;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  flex-shrink: 0;
}

.pinnable-icon-cell img {
  width: 18px;
  height: 18px;
  object-fit: contain;
}
`;
  document.head.appendChild(style);
}
