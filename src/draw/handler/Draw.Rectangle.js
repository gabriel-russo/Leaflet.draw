/**
 * @class L.Draw.Rectangle
 * @aka Draw.Rectangle
 * @inherits L.Draw.SimpleShape
 */
L.Draw.Rectangle = L.Draw.SimpleShape.extend({
  statics: {
    TYPE: "rectangle"
  },

  options: {
    shapeOptions: {
      stroke: true,
      color: "#3388ff",
      weight: 4,
      opacity: 0.5,
      fill: true,
      fillColor: null, // same as color by default
      fillOpacity: 0.2,
      clickable: true
    },
    showArea: true, // Whether to show the area in the tooltip
    metric: true // Whether to use the metric measurement system or imperial
  },

  // @method initialize(): void
  initialize(map, options) {
    // Save the type so super can fire, need to do this as cannot do this.TYPE :(
    this.type = L.Draw.Rectangle.TYPE;

    this._initialLabelText = L.drawLocal.draw.handlers.rectangle.tooltip.start;

    L.Draw.SimpleShape.prototype.initialize.call(this, map, options);
  },

  // @method disable(): void
  disable() {
    if (!this._enabled) {
      return;
    }

    this._isCurrentlyTwoClickDrawing = false;
    L.Draw.SimpleShape.prototype.disable.call(this);
  },

  _onMouseUp(e) {
    if (!this._shape && !this._isCurrentlyTwoClickDrawing) {
      this._isCurrentlyTwoClickDrawing = true;
      return;
    }

    // Make sure closing click is on map
    let hasAncestor = false;
    let element = e.target;
    // Start searching in his ancestor tree an element with class Name leaflat-pane
    while (element) {

      if (!element.parentElement) {
        break;
      }

      if (element.parentElement.classList.contains("leaflet-pane")) {
        hasAncestor = true;
        break;
      }

      element = element.parentNode;
    }

    if (this._isCurrentlyTwoClickDrawing && !hasAncestor) {
      return;
    }

    L.Draw.SimpleShape.prototype._onMouseUp.call(this);
  },

  _drawShape(latlng) {
    if (!this._shape) {
      this._shape = new L.Rectangle(new L.LatLngBounds(this._startLatLng, latlng), this.options.shapeOptions);
      this._map.addLayer(this._shape);
    } else {
      this._shape.setBounds(new L.LatLngBounds(this._startLatLng, latlng));
    }
  },

  _fireCreatedEvent() {
    let rectangle = new L.Rectangle(this._shape.getBounds(), this.options.shapeOptions);
    L.Draw.SimpleShape.prototype._fireCreatedEvent.call(this, rectangle);
  },

  _getTooltipText() {
    let tooltipText = L.Draw.SimpleShape.prototype._getTooltipText.call(this);
    let shape = this._shape;
    let {showArea} = this.options;
    let latLngs;
    let area;
    let subtext;

    if (shape) {
      latLngs = this._shape._defaultShape ? this._shape._defaultShape() : this._shape.getLatLngs();
      area = L.GeometryUtil.geodesicArea(latLngs);
      subtext = showArea ? L.GeometryUtil.readableArea(area, this.options.metric) : "";
    }

    return {
      text: tooltipText.text,
      subtext
    };
  }
});
