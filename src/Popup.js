import * as Cesium from "cesium";

function _createEl(tag, className) {
  const el = document.createElement(tag);
  el.className = className;
  return el;
}
/**
 * 地图气泡
 */
export class Popup {
  constructor(options = {}) {
    this.otherClassName = options.className ?? null;
    this.closeButton = options.closeButton ?? true;
    this.anchor = options.anchor ?? null;

    this._isSelfFitAnchor = !this.anchor;
    this._bgColor = options.bgColor ?? "white";

    if (this._isSelfFitAnchor) {
      this.anchor = "bottom";
    }

    this._offset = options.offset ?? [0, 0];
    this._isOpen = false;
    this._lngLat = [0, 0];
    this._contentTipHeight = 10;

    this._className = "gismap-popup";
    this._topClassName = "gismap-popup-top";
    this._closeButtonClassName = "gismap-popup-close-button";
    this._contentClassName = "gismap-popup-content";
    this._tipClassName = `gismap-popup-tip-${this.anchor}`;

    this._el = _createEl("div", this._className);
    this._tip = _createEl("div", this._tipClassName);

    this._contentEl = _createEl("div", this._contentClassName);

    if (this.closeButton) {
      this._topEl = _createEl("div", this._topClassName);
      this._closeButtonEl = _createEl("div", this._closeButtonClassName);
      this._closeButtonEl.innerText = "x";
      this._topEl.append(this._closeButtonEl);
      this._el.append(this._topEl);
      this._closeButtonEl.addEventListener(
        "click",
        this._closeButtonClickHandler
      );
    }
    this._el.append(this._contentEl);
    this._el.append(this._tip);
    if (this.otherClassName) {
      this._el.classList.add(this.otherClassName);
    }

    this._eventContainer = { open: [], close: [] };
    this._eventTypeList = ["open", "close"];
  }

  get left() {
    return this._el.style.left;
  }

  set left(val) {
    this._el.style.left = val;
  }

  get top() {
    return this._el.style.top;
  }

  set top(val) {
    this._el.style.top = val;
  }

  _closeButtonClickHandler = () => {
    this.close();
  };

  _setOpen(flag) {
    this._isOpen = flag;
    this.getElement().style.display = this._isOpen ? "block" : "none";
  }

  _postRenderHandler = () => {
    const oldAnchor = this.anchor;
    const { left, top } = this._calculateCoords();
    this._changeAnchorModel(left, top);

    const newAnchor = this.anchor;
    this.left = `${left}px`;
    this.top = `${top}px`;

    if (oldAnchor === newAnchor) return;
    const classList = this._tip.classList;
    classList.remove(classList);
    classList.add(`gismap-popup-tip-${this.anchor}`);
  };

  _getScreenCoords() {
    const position = Cesium.Cartesian3.fromDegrees(...this._lngLat);
    return Cesium.SceneTransforms.wgs84ToWindowCoordinates(
      this._map.scene,
      position
    );
  }

  _calculateCoords() {
    let left, top;
    const { x, y } = this._getScreenCoords();
    switch (this.anchor) {
      case "bottom":
        left = x - this._el.offsetWidth / 2 - this._offset[0];
        top =
          y - this._el.offsetHeight - this._contentTipHeight - this._offset[1];
        break;
      case "top":
        left = x - this._el.offsetWidth / 2 - this._offset[0];
        top = y + this._contentTipHeight - this._offset[1];
        break;
      case "right":
        left =
          x - this._el.offsetWidth - this._contentTipHeight - this._offset[0];
        top = y - this._el.offsetHeight / 2 - this._offset[1];
        break;
      case "left":
        left = x + this._contentTipHeight - this._offset[0];
        top = y - this._el.offsetHeight / 2 - this._offset[1];
        break;
      default:
        break;
    }
    return { left, top };
  }

  _changeAnchorModel(left, top) {
    const cw = this._container.offsetWidth;
    const ch = this._container.offsetHeight;
    const ew = this._el.offsetWidth;
    const eh = this._el.offsetHeight;
    const dx = cw - ew;
    const dy = ch - eh;
    const oldAnchor = this.anchor;
    if (this._isSelfFitAnchor) {
      if (top < 0) {
        this.anchor = "top";
        const { left, top } = this._calculateCoords();
        if (left < 0 || left > dx || top < 0 || top > dy) {
          this.anchor = oldAnchor;
        }
      } else if (left < 0) {
        this.anchor = "left";
        const { left, top } = this._calculateCoords();
        if (left < 0 || left > dx || top < 0 || top > dy) {
          this.anchor = oldAnchor;
        }
      } else if (top > dy) {
        this.anchor = "bottom";
        const { left, top } = this._calculateCoords();
        if (left < 0 || left > dx || top < 0 || top > dy) {
          this.anchor = oldAnchor;
        }
      } else if (left > dx) {
        this.anchor = "right";
        const { left, top } = this._calculateCoords();
        if (left < 0 || left > dx || top < 0 || top > dy) {
          this.anchor = oldAnchor;
        }
      }
    }
  }

  _fire(event) {
    const events = this._eventContainer[event];
    for (let i = 0; i < events.length; i++) {
      const el = events[i];
      el();
    }
  }

  _setBgColor() {
    document.documentElement.style.setProperty(
      "--gismap-bgColor",
      this._bgColor
    );
  }

  on(event, callback) {
    if (!this._eventTypeList.includes(event)) {
      console.error("不合法的事件名!");
      return;
    }
    const events = this._eventContainer[event];
    const hasSameCallBack = events.find((item) => {
      return item === callback;
    });
    if (hasSameCallBack) return;
    this._eventContainer[event].push(callback);
  }

  off(event, callback) {
    if (!this._eventTypeList.includes(event)) {
      console.error("不合法的事件名!");
      return;
    }
    const events = this._eventContainer[event];

    for (let i = 0; i < events.length; i++) {
      const el = events[i];
      if (el === callback) {
        events.splice(i, 1);
        return;
      }
    }
  }

  addTo(map) {
    this._map = map;
    this._container = map.container;
    this._setBgColor();
    this.open();
    map.container.style.overflow = "hidden";
    map.container.append(this.getElement());
    map.scene.postRender.addEventListener(this._postRenderHandler);
  }

  remove() {
    this._map.container.removeChild(this.getElement());
    this._map.off("postRender", this._postRenderHandler);
    this.getElement().remove();
    this._map = null;
  }

  open() {
    this._setOpen(true);
    this._fire("open");
  }

  close() {
    this._setOpen(false);
    this._fire("close");
  }

  isOpen() {
    return this._isOpen;
  }

  getLngLat() {
    return this._lngLat;
  }

  setLngLat(lngLat) {
    this._lngLat = lngLat;
    if (this._map) {
      this._postRenderHandler();
    }
    return this;
  }

  getElement() {
    return this._el;
  }

  getOffset() {
    return this._offset;
  }

  setOffset(offset) {
    this._offset = offset;
    return this;
  }

  setHTML(html) {
    this._contentEl.innerHTML = html;
    return this;
  }

  setDOMContent(htmlNode) {
    this.setHTML("");
    this._contentEl.append(htmlNode);
    return this;
  }
}
