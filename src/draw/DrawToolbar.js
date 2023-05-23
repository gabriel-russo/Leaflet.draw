/**
 * @class L.DrawToolbar
 * @aka Toolbar
 */
L.DrawToolbar = L.Toolbar.extend({

	statics: {
		TYPE: "draw"
	},

	options: {
		polyline: {},
		polygon: {},
		rectangle: {},
		circle: {},
		marker: {},
		circlemarker: {}
	},

	// @method initialize(): void
	initialize(options) {
		// Ensure that the options are merged correctly since L.extend is only shallow
		for (let type in this.options) {
			if (Object.prototype.hasOwnProperty.call(this.options, type)) {
				if (options[type]) {
					options[type] = L.extend({}, this.options[type], options[type]);
				}
			}
		}

		this._toolbarClass = "leaflet-draw-draw";
		L.Toolbar.prototype.initialize.call(this, options);
	},

	// @method getModeHandlers(): object
	// Get mode handlers information
	getModeHandlers(map) {
		return [
			{
				enabled: this.options.polyline,
				handler: new L.Draw.Polyline(map, this.options.polyline),
				title: L.drawLocal.draw.toolbar.buttons.polyline
			},
			{
				enabled: this.options.polygon,
				handler: new L.Draw.Polygon(map, this.options.polygon),
				title: L.drawLocal.draw.toolbar.buttons.polygon
			},
			{
				enabled: this.options.rectangle,
				handler: new L.Draw.Rectangle(map, this.options.rectangle),
				title: L.drawLocal.draw.toolbar.buttons.rectangle
			},
			{
				enabled: this.options.circle,
				handler: new L.Draw.Circle(map, this.options.circle),
				title: L.drawLocal.draw.toolbar.buttons.circle
			},
			{
				enabled: this.options.marker,
				handler: new L.Draw.Marker(map, this.options.marker),
				title: L.drawLocal.draw.toolbar.buttons.marker
			},
			{
				enabled: this.options.circlemarker,
				handler: new L.Draw.CircleMarker(map, this.options.circlemarker),
				title: L.drawLocal.draw.toolbar.buttons.circlemarker
			}
		];
	},

	// @method getActions(): object
	// Get action information
	getActions(handler) {
		return [
			{
				type: "finish",
				enabled: handler.completeShape,
				title: L.drawLocal.draw.toolbar.finish.title,
				text: L.drawLocal.draw.toolbar.finish.text,
				callback: handler.completeShape,
				context: handler
			},
			{
				type: "undo",
				enabled: handler.deleteLastVertex,
				title: L.drawLocal.draw.toolbar.undo.title,
				text: L.drawLocal.draw.toolbar.undo.text,
				callback: handler.deleteLastVertex,
				context: handler
			},
			{
				type: "cancel",
				enabled: this.disable,
				title: L.drawLocal.draw.toolbar.actions.title,
				text: L.drawLocal.draw.toolbar.actions.text,
				callback: this.disable,
				context: this
			}
		];
	},

	// @method setOptions(): void
	// Sets the options to the toolbar
	setOptions(options) {
		L.setOptions(this, options);

		for (let type in this._modes) {
			if (Object.prototype.hasOwnProperty.call(this._modes, type) && Object.prototype.hasOwnProperty.call(options, type)) {
				this._modes[type].handler.setOptions(options[type]);
			}
		}
	}
});
