L.Draw = L.Draw || {};

/**
 * @class L.Draw.Feature
 * @aka Draw.Feature
 */
L.Draw.Feature = L.Handler.extend({

	// @method initialize(): void
	initialize(map, options) {
		this._map = map;
		this._container = map._container;
		this._overlayPane = map._panes.overlayPane;
		this._popupPane = map._panes.popupPane;

		// Merge default shapeOptions options with custom shapeOptions
		if (options && options.shapeOptions) {
			options.shapeOptions = L.Util.extend({}, this.options.shapeOptions, options.shapeOptions);
		}
		L.setOptions(this, options);

		let version = L.version.split(".");
		// If Version is >= 1.2.0
		if (parseInt(version[0], 10) === 1 && parseInt(version[1], 10) >= 2) {
			L.Draw.Feature.include(L.Evented.prototype);
		} else {
			L.Draw.Feature.include(L.Mixin.Events);
		}
	},

	// @method enable(): void
	// Enables this handler
	enable() {
		if (this._enabled) {
			return;
		}

		L.Handler.prototype.enable.call(this);

		this.fire("enabled", { handler: this.type });

		this._map.fire(L.Draw.Event.DRAWSTART, { layerType: this.type });
	},

	// @method disable(): void
	disable() {
		if (!this._enabled) {
			return;
		}

		L.Handler.prototype.disable.call(this);

		this._map.fire(L.Draw.Event.DRAWSTOP, { layerType: this.type });

		this.fire("disabled", { handler: this.type });
	},

	// @method addHooks(): void
	// Add's event listeners to this handler
	addHooks() {
		let map = this._map;

		if (map) {
			L.DomUtil.disableTextSelection();

			map.getContainer().focus();

			this._tooltip = new L.Draw.Tooltip(this._map);

			L.DomEvent.on(this._container, "keyup", this._cancelDrawing, this);
		}
	},

	// @method removeHooks(): void
	// Removes event listeners from this handler
	removeHooks() {
		if (this._map) {
			L.DomUtil.enableTextSelection();

			this._tooltip.dispose();
			this._tooltip = null;

			L.DomEvent.off(this._container, "keyup", this._cancelDrawing, this);
		}
	},

	// @method setOptions(object): void
	// Sets new options to this handler
	setOptions(options) {
		L.setOptions(this, options);
	},

	_fireCreatedEvent(layer) {
		this._map.fire(L.Draw.Event.CREATED, { layer, layerType: this.type });
	},

	// Cancel drawing when the escape key is pressed
	_cancelDrawing(e) {
		if (e.keyCode === 27) {
			this._map.fire("draw:canceled", { layerType: this.type });
			this.disable();
		}
	}
});
