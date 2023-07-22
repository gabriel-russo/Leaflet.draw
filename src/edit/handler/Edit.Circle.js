L.Edit = L.Edit || {};
/**
 * @class L.Edit.Circle
 * @aka Edit.Circle
 * @inherits L.Edit.CircleMarker
 */
L.Edit.Circle = L.Edit.CircleMarker.extend({

  _createResizeMarker() {
    let center = this._shape.getLatLng();
    let resizemarkerPoint = this._getResizeMarkerPoint(center);

    this._resizeMarkers = [];
    this._resizeMarkers.push(this._createMarker(resizemarkerPoint, this.options.resizeIcon));
  },

  _getResizeMarkerPoint(latlng) {
    // From L.shape.getBounds()
    let delta = this._shape._radius * Math.cos(Math.PI / 4);
    let point = this._map.project(latlng);
    return this._map.unproject([point.x + delta, point.y - delta]);
  },

  _resize(latlng) {
    let moveLatLng = this._moveMarker.getLatLng();
    let radius;
    // Calculate the radius based on the version
    if (L.GeometryUtil.isVersion07x()) {
      radius = moveLatLng.distanceTo(latlng);
    } else {
      radius = this._map.distance(moveLatLng, latlng);
    }
    this._shape.setRadius(radius);

    if (this._map.editTooltip) {
      this._map._editTooltip.updateContent({
        text: `${L.drawLocal.edit.handlers.edit.tooltip.subtext}<br />${L.drawLocal.edit.handlers.edit.tooltip.text}`,
        subtext: `${L.drawLocal.draw.handlers.circle.radius}: ${
          L.GeometryUtil.readableDistance(radius, true, this.options.feet, this.options.nautic)}`
      });
    }

    this._shape.setRadius(radius);

    this._map.fire(L.Draw.Event.EDITRESIZE, {layer: this._shape});
  }
});

function addEditFunctionalityToDrawnCircle() {
  if (L.Edit.Circle) {
    this.editing = new L.Edit.Circle(this);

    if (this.options.editable) {
      this.editing.enable();
    }
  }
}

L.Circle.addInitHook(addEditFunctionalityToDrawnCircle);
