L.Edit = L.Edit || {};
/**
 * @class L.Edit.Rectangle
 * @aka Edit.Rectangle
 * @inherits L.Edit.SimpleShape
 */
L.Edit.Rectangle = L.Edit.SimpleShape.extend({
	_createMoveMarker() {
		let bounds = this._shape.getBounds();
		let center = bounds.getCenter();

		this._moveMarker = this._createMarker(center, this.options.moveIcon);
	},

	_createResizeMarker() {
		let corners = this._getCorners();

		this._resizeMarkers = [];

		for (let i = 0, l = corners.length; i < l; i++) {
			this._resizeMarkers.push(this._createMarker(corners[i], this.options.resizeIcon));
			// Monkey in the corner index as we will need to know this for dragging
			this._resizeMarkers[i]._cornerIndex = i;
		}
	},

	_onMarkerDragStart(e) {
		L.Edit.SimpleShape.prototype._onMarkerDragStart.call(this, e);

		// Save a reference to the opposite point
		let corners = this._getCorners();
		let marker = e.target;
		let currentCornerIndex = marker._cornerIndex;

		this._oppositeCorner = corners[(currentCornerIndex + 2) % 4];

		this._toggleCornerMarkers(0, currentCornerIndex);
	},

	_onMarkerDragEnd(e) {
		let marker = e.target;
		let bounds;
		let center;

		// Reset move marker position to the center
		if (marker === this._moveMarker) {
			bounds = this._shape.getBounds();
			center = bounds.getCenter();

			marker.setLatLng(center);
		}

		this._toggleCornerMarkers(1);

		this._repositionCornerMarkers();

		L.Edit.SimpleShape.prototype._onMarkerDragEnd.call(this, e);
	},

	_move(newCenter) {
		let latlngs = this._shape._defaultShape ? this._shape._defaultShape() : this._shape.getLatLngs();
		let bounds = this._shape.getBounds();
		let center = bounds.getCenter();
		let offset;
		let newLatLngs = [];

		// Offset the latlngs to the new center
		for (let i = 0, l = latlngs.length; i < l; i++) {
			offset = [latlngs[i].lat - center.lat, latlngs[i].lng - center.lng];
			newLatLngs.push([newCenter.lat + offset[0], newCenter.lng + offset[1]]);
		}

		this._shape.setLatLngs(newLatLngs);

		// Reposition the resize markers
		this._repositionCornerMarkers();

		this._map.fire(L.Draw.Event.EDITMOVE, { layer: this._shape });
	},

	_resize(latlng) {
		let bounds;

		// Update the shape based on the current position of this corner and the opposite point
		this._shape.setBounds(L.latLngBounds(latlng, this._oppositeCorner));

		// Reposition the move marker
		bounds = this._shape.getBounds();
		this._moveMarker.setLatLng(bounds.getCenter());

		this._map.fire(L.Draw.Event.EDITRESIZE, { layer: this._shape });
	},

	_getCorners() {
		let bounds = this._shape.getBounds();
		let nw = bounds.getNorthWest();
		let ne = bounds.getNorthEast();
		let se = bounds.getSouthEast();
		let sw = bounds.getSouthWest();

		return [nw, ne, se, sw];
	},

	_toggleCornerMarkers(opacity) {
		for (let i = 0, l = this._resizeMarkers.length; i < l; i++) {
			this._resizeMarkers[i].setOpacity(opacity);
		}
	},

	_repositionCornerMarkers() {
		let corners = this._getCorners();

		for (let i = 0, l = this._resizeMarkers.length; i < l; i++) {
			this._resizeMarkers[i].setLatLng(corners[i]);
		}
	}
});

function addEditFunctionalityToDrawnRectangle() {

	if (this.editing) {
		return;
	}

	if (L.Edit.Rectangle) {

		this.editing = new L.Edit.Rectangle(this);

		if (this.options.editable) {
			this.editing.enable();
		}
	}
}

L.Rectangle.addInitHook(addEditFunctionalityToDrawnRectangle);
