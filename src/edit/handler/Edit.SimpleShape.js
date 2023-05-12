L.Edit = L.Edit || {};
/**
 * @class L.Edit.SimpleShape
 * @aka Edit.SimpleShape
 */
L.Edit.SimpleShape = L.Handler.extend({
	options: {
		moveIcon: new L.DivIcon({
			iconSize: new L.Point(8, 8),
			className: "leaflet-div-icon leaflet-editing-icon leaflet-edit-move"
		}),
		resizeIcon: new L.DivIcon({
			iconSize: new L.Point(8, 8),
			className: "leaflet-div-icon leaflet-editing-icon leaflet-edit-resize"
		}),
		touchMoveIcon: new L.DivIcon({
			iconSize: new L.Point(20, 20),
			className: "leaflet-div-icon leaflet-editing-icon leaflet-edit-move leaflet-touch-icon"
		}),
		touchResizeIcon: new L.DivIcon({
			iconSize: new L.Point(20, 20),
			className: "leaflet-div-icon leaflet-editing-icon leaflet-edit-resize leaflet-touch-icon"
		})
	},

	// @method intialize(): void
	initialize(shape, options) {
		// if touch, switch to touch icon
		if (L.Browser.touch) {
			this.options.moveIcon = this.options.touchMoveIcon;
			this.options.resizeIcon = this.options.touchResizeIcon;
		}

		this._shape = shape;
		L.Util.setOptions(this, options);
	},

	// @method addHooks(): void
	// Add listener hooks to this handler
	addHooks() {
		let shape = this._shape;
		if (this._shape._map) {
			this._map = this._shape._map;
			shape.setStyle(shape.options.editing);

			if (shape._map) {
				this._map = shape._map;
				if (!this._markerGroup) {
					this._initMarkers();
				}
				this._map.addLayer(this._markerGroup);
			}
		}
	},

	// @method removeHooks(): void
	// Remove listener hooks from this handler
	removeHooks() {
		let shape = this._shape;

		shape.setStyle(shape.options.original);

		if (shape._map) {
			this._unbindMarker(this._moveMarker);

			for (let i = 0, l = this._resizeMarkers.length; i < l; i++) {
				this._unbindMarker(this._resizeMarkers[i]);
			}
			this._resizeMarkers = null;

			this._map.removeLayer(this._markerGroup);
			delete this._markerGroup;
		}

		this._map = null;
	},

	// @method updateMarkers(): void
	// Remove the edit markers from this layer
	updateMarkers() {
		this._markerGroup.clearLayers();
		this._initMarkers();
	},

	_initMarkers() {
		if (!this._markerGroup) {
			this._markerGroup = new L.LayerGroup();
		}

		// Create center marker
		this._createMoveMarker();

		// Create edge marker
		this._createResizeMarker();
	},

	_createMoveMarker() {
		// Children override
	},

	_createResizeMarker() {
		// Children override
	},

	_createMarker(latlng, icon) {
		// Extending L.Marker in TouchEvents.js to include touch.
		let marker = new L.Marker.Touch(latlng, {
			draggable: true,
			icon,
			zIndexOffset: 10
		});

		this._bindMarker(marker);

		this._markerGroup.addLayer(marker);

		return marker;
	},

	_bindMarker(marker) {
		marker
			.on("dragstart", this._onMarkerDragStart, this)
			.on("drag", this._onMarkerDrag, this)
			.on("dragend", this._onMarkerDragEnd, this)
			.on("touchstart", this._onTouchStart, this)
			.on("touchmove", this._onTouchMove, this)
			.on("MSPointerMove", this._onTouchMove, this)
			.on("touchend", this._onTouchEnd, this)
			.on("MSPointerUp", this._onTouchEnd, this);
	},

	_unbindMarker(marker) {
		marker
			.off("dragstart", this._onMarkerDragStart, this)
			.off("drag", this._onMarkerDrag, this)
			.off("dragend", this._onMarkerDragEnd, this)
			.off("touchstart", this._onTouchStart, this)
			.off("touchmove", this._onTouchMove, this)
			.off("MSPointerMove", this._onTouchMove, this)
			.off("touchend", this._onTouchEnd, this)
			.off("MSPointerUp", this._onTouchEnd, this);
	},

	_onMarkerDragStart(e) {
		let marker = e.target;
		marker.setOpacity(0);

		this._shape.fire("editstart");
	},

	_fireEdit() {
		this._shape.edited = true;
		this._shape.fire("edit");
	},

	_onMarkerDrag(e) {
		let marker = e.target;
		let latlng = marker.getLatLng();

		if (marker === this._moveMarker) {
			this._move(latlng);
		} else {
			this._resize(latlng);
		}

		this._shape.redraw();
		this._shape.fire("editdrag");
	},

	_onMarkerDragEnd(e) {
		let marker = e.target;
		marker.setOpacity(1);

		this._fireEdit();
	},

	_onTouchStart(e) {
		L.Edit.SimpleShape.prototype._onMarkerDragStart.call(this, e);

		if (typeof (this._getCorners) === "function") {
			// Save a reference to the opposite point
			let corners = this._getCorners();
			let marker = e.target;
			let currentCornerIndex = marker._cornerIndex;

			marker.setOpacity(0);

			// Copyed from Edit.Rectangle.js line 23 _onMarkerDragStart()
			// Latlng is null otherwise.
			this._oppositeCorner = corners[(currentCornerIndex + 2) % 4];
			this._toggleCornerMarkers(0, currentCornerIndex);
		}

		this._shape.fire("editstart");
	},

	_onTouchMove(e) {
		let layerPoint = this._map.mouseEventToLayerPoint(e.originalEvent.touches[0]);
		let latlng = this._map.layerPointToLatLng(layerPoint);
		let marker = e.target;

		if (marker === this._moveMarker) {
			this._move(latlng);
		} else {
			this._resize(latlng);
		}

		this._shape.redraw();

		// prevent touchcancel in IOS
		// e.preventDefault();
		return false;
	},

	_onTouchEnd(e) {
		let marker = e.target;
		marker.setOpacity(1);
		this.updateMarkers();
		this._fireEdit();
	},

	_move() {
		// Children override
	},

	_resize() {
		// Children override
	}
});
