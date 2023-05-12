L.Edit = L.Edit || {};

/**
 * @class L.Edit.Marker
 * @aka Edit.Marker
 */
L.Edit.Marker = L.Handler.extend({
	// @method initialize(): void
	initialize(marker, options) {
		this._marker = marker;
		L.setOptions(this, options);
	},

	// @method addHooks(): void
	// Add listener hooks to this handler
	addHooks() {
		let marker = this._marker;

		marker.dragging.enable();
		marker.on("dragend", this._onDragEnd, marker);
		this._toggleMarkerHighlight();
	},

	// @method removeHooks(): void
	// Remove listener hooks from this handler
	removeHooks() {
		let marker = this._marker;

		marker.dragging.disable();
		marker.off("dragend", this._onDragEnd, marker);
		this._toggleMarkerHighlight();
	},

	_onDragEnd(e) {
		let layer = e.target;
		layer.edited = true;
		this._map.fire(L.Draw.Event.EDITMOVE, { layer });
	},

	_toggleMarkerHighlight() {
		let icon = this._marker._icon;

		// Don't do anything if this layer is a marker but doesn't have an icon. Markers
		// should usually have icons. If using Leaflet.draw with Leaflet.markercluster there
		// is a chance that a marker doesn't.
		if (!icon) {
			return;
		}

		// This is quite naughty, but I don't see another way of doing it. (short of setting a new icon)
		icon.style.display = "none";

		if (L.DomUtil.hasClass(icon, "leaflet-edit-marker-selected")) {
			L.DomUtil.removeClass(icon, "leaflet-edit-marker-selected");
			// Offset as the border will make the icon move.
			this._offsetMarker(icon, -4);

		} else {
			L.DomUtil.addClass(icon, "leaflet-edit-marker-selected");
			// Offset as the border will make the icon move.
			this._offsetMarker(icon, 4);
		}

		icon.style.display = "";
	},

	_offsetMarker(icon, offset) {
		let iconMarginTop = parseInt(icon.style.marginTop, 10) - offset;
		let iconMarginLeft = parseInt(icon.style.marginLeft, 10) - offset;

		icon.style.marginTop = `${iconMarginTop}px`;
		icon.style.marginLeft = `${iconMarginLeft}px`;
	}
});

function addEditFunctionalityToDrawnMarker() {
	if (L.Edit.Marker) {
		this.editing = new L.Edit.Marker(this);

		if (this.options.editable) {
			this.editing.enable();
		}

	}
}

L.Marker.addInitHook(addEditFunctionalityToDrawnMarker);
