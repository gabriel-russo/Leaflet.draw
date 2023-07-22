L.Edit = L.Edit || {};
/**
 * @class L.Edit.CircleMarker
 * @aka Edit.Circle
 * @inherits L.Edit.SimpleShape
 */
L.Edit.CircleMarker = L.Edit.SimpleShape.extend({
  _createMoveMarker() {
    let center = this._shape.getLatLng();

    this._moveMarker = this._createMarker(center, this.options.moveIcon);
  },

  _createResizeMarker() {
    // To avoid an undefined check in L.Edit.SimpleShape.removeHooks
    this._resizeMarkers = [];
  },

  _move(latlng) {
    if (this._resizeMarkers.length) {
      let resizemarkerPoint = this._getResizeMarkerPoint(latlng);
      // Move the resize marker
      this._resizeMarkers[0].setLatLng(resizemarkerPoint);
    }

    // Move the circle
    this._shape.setLatLng(latlng);

    this._map.fire(L.Draw.Event.EDITMOVE, {layer: this._shape});
  }
});

function addEditFunctionalityToDrawnCircleMarker() {
  if (L.Edit.CircleMarker) {
    this.editing = new L.Edit.CircleMarker(this);

    if (this.options.editable) {
      this.editing.enable();
    }
  }

  this.addEventListener("add", () => {
    if (this.editing && this.editing.enabled()) {
      this.editing.addHooks();
    }
  });

  this.addEventListener("remove", () => {
    if (this.editing && this.editing.enabled()) {
      this.editing.removeHooks();
    }
  });
}

L.CircleMarker.addInitHook(addEditFunctionalityToDrawnCircleMarker);
