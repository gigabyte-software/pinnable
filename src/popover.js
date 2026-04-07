export class Popover {
  constructor(wrapper) {
    this.wrapper = wrapper;
    this.currentPinId = null;
    this.onLabelChange = null;
    this.onDelete = null;
    this.onColorChange = null;
    this.onIconChange = null;
    this.onToggle = null;
    this.onClose = null;

    this._colors = [];
    this._icons = [];
    this._activeColor = '#e53935';
    this._circleDot = null;

    this._build();
    this.wrapper.appendChild(this.el);
  }

  _build() {
    this.el = document.createElement('div');
    this.el.className = 'pinnable-popover pinnable-hidden';
    this.el.addEventListener('mousedown', (e) => e.stopPropagation());
    this.el.addEventListener('touchstart', (e) => e.stopPropagation());

    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.placeholder = 'Pin label...';
    this.input.addEventListener('input', () => this._handleInput());
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.hide();
      e.stopPropagation();
    });
    this.el.appendChild(this.input);

    const toggleRow = document.createElement('div');
    toggleRow.className = 'pinnable-toggle-row';

    this.labelVisibleCb = this._createCheckbox('Show label', toggleRow, (checked) => {
      if (this.onToggle && this.currentPinId) {
        this.onToggle(this.currentPinId, 'labelVisible', checked);
      }
    });

    this.connectorCb = this._createCheckbox('Connector', toggleRow, (checked) => {
      if (this.onToggle && this.currentPinId) {
        this.onToggle(this.currentPinId, 'showConnector', checked);
      }
    });

    this.el.appendChild(toggleRow);

    const colorLabel = document.createElement('div');
    colorLabel.className = 'pinnable-section-label';
    colorLabel.textContent = 'Color';
    this.el.appendChild(colorLabel);

    this.colorContainer = document.createElement('div');
    this.colorContainer.className = 'pinnable-color-swatches';
    this.el.appendChild(this.colorContainer);

    const iconLabel = document.createElement('div');
    iconLabel.className = 'pinnable-section-label';
    iconLabel.textContent = 'Icon';
    this.el.appendChild(iconLabel);

    this.iconContainer = document.createElement('div');
    this.iconContainer.className = 'pinnable-icon-grid';
    this.el.appendChild(this.iconContainer);

    const actions = document.createElement('div');
    actions.className = 'pinnable-popover-actions';

    this.deleteBtn = document.createElement('button');
    this.deleteBtn.className = 'pinnable-delete-btn';
    this.deleteBtn.textContent = 'Delete';
    this.deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._handleDelete();
    });

    this.closeBtn = document.createElement('button');
    this.closeBtn.textContent = 'Done';
    this.closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.hide();
    });

    actions.appendChild(this.deleteBtn);
    actions.appendChild(this.closeBtn);
    this.el.appendChild(actions);
  }

  _createCheckbox(labelText, parent, onChange) {
    const label = document.createElement('label');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.addEventListener('change', () => onChange(cb.checked));
    label.appendChild(cb);
    label.appendChild(document.createTextNode(labelText));
    parent.appendChild(label);
    return cb;
  }

  setColors(colors) {
    this._colors = colors;
  }

  setIcons(icons) {
    this._icons = icons;
  }

  _renderColors(activeColor) {
    this.colorContainer.innerHTML = '';
    for (const color of this._colors) {
      const swatch = document.createElement('div');
      swatch.className = 'pinnable-color-swatch';
      swatch.dataset.color = color;
      if (color === activeColor) swatch.classList.add('pinnable-active');
      swatch.style.backgroundColor = color;
      swatch.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.onColorChange && this.currentPinId) {
          this.onColorChange(this.currentPinId, color);
        }
        this._setActiveColor(color);
      });
      this.colorContainer.appendChild(swatch);
    }
  }

  _setActiveColor(color) {
    this._activeColor = color;
    const swatches = this.colorContainer.querySelectorAll('.pinnable-color-swatch');
    swatches.forEach((s) => {
      s.classList.toggle('pinnable-active', s.dataset.color === color);
    });
    if (this._circleDot) {
      this._circleDot.style.backgroundColor = color;
    }
  }

  _renderIcons(activeIcon) {
    this.iconContainer.innerHTML = '';
    for (const icon of this._icons) {
      const cell = document.createElement('button');
      cell.className = 'pinnable-icon-cell';
      cell.title = icon.label;

      const iconValue = icon.emoji || (icon.custom ? icon.id : null);

      if (iconValue === activeIcon || (!iconValue && !activeIcon)) {
        cell.classList.add('pinnable-active');
      }

      if (!icon.emoji && !icon.custom) {
        const dot = document.createElement('span');
        dot.className = 'pinnable-icon-cell-circle';
        dot.style.backgroundColor = this._activeColor;
        this._circleDot = dot;
        cell.appendChild(dot);
      } else if (icon.custom && icon.src) {
        const img = document.createElement('img');
        img.src = icon.src;
        img.alt = icon.label;
        cell.appendChild(img);
      } else {
        cell.textContent = icon.emoji;
      }

      cell.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.onIconChange && this.currentPinId) {
          this.onIconChange(this.currentPinId, iconValue);
        }
        this._setActiveIcon(iconValue);
      });

      this.iconContainer.appendChild(cell);
    }
  }

  _setActiveIcon(iconValue) {
    const cells = this.iconContainer.querySelectorAll('.pinnable-icon-cell');
    let idx = 0;
    for (const icon of this._icons) {
      const val = icon.emoji || (icon.custom ? icon.id : null);
      cells[idx]?.classList.toggle('pinnable-active',
        val === iconValue || (!val && !iconValue));
      idx++;
    }
  }

  show(pin, screenX, screenY) {
    this.currentPinId = pin.id;
    this.input.value = pin.label || '';
    this.labelVisibleCb.checked = pin.labelVisible !== false;
    this.connectorCb.checked = pin.showConnector !== false;
    this._activeColor = pin.color || '#e53935';
    this._renderColors(this._activeColor);
    this._renderIcons(pin.icon || null);
    this._position(screenX, screenY);
    this.el.classList.remove('pinnable-hidden');
  }

  hide() {
    const wasVisible = this.isVisible();
    this.el.classList.add('pinnable-hidden');
    this.currentPinId = null;
    if (wasVisible && this.onClose) this.onClose();
  }

  isVisible() {
    return !this.el.classList.contains('pinnable-hidden');
  }

  updatePosition(screenX, screenY) {
    if (this.isVisible()) {
      this._position(screenX, screenY);
    }
  }

  _position(screenX, screenY) {
    const wrapperRect = this.wrapper.getBoundingClientRect();
    const popoverWidth = this.el.offsetWidth || 220;
    const popoverHeight = this.el.offsetHeight || 200;

    let left = screenX - popoverWidth / 2;
    let top = screenY - popoverHeight - 20;

    left = Math.max(4, Math.min(left, wrapperRect.width - popoverWidth - 4));
    if (top < 4) {
      top = screenY + 20;
    }

    this.el.style.left = left + 'px';
    this.el.style.top = top + 'px';
  }

  _handleInput() {
    if (this.onLabelChange && this.currentPinId) {
      this.onLabelChange(this.currentPinId, this.input.value);
    }
  }

  _handleDelete() {
    if (this.onDelete && this.currentPinId) {
      const pinId = this.currentPinId;
      this.hide();
      this.onDelete(pinId);
    }
  }

  destroy() {
    this.el.remove();
  }
}
