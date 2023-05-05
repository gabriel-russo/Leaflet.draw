/**
 * @class L.Draw.Circle
 * @aka Draw.Circle
 * @inherits L.Draw.SimpleShape
 */
L.Draw.Circle = L.Draw.SimpleShape.extend({
	statics: {
		TYPE: "circle"
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
		showRadius: true,
		metric: true, // Whether to use the metric measurement system or imperial
		feet: true, // When not metric, use feet instead of yards for display
		nautic: false // When not metric, not feet use nautic mile for display
	},

	// @method initialize(): void
	initialize(map, options) {
		// Save the type so super can fire, need to do this as cannot do this.TYPE :(
		this.type = L.Draw.Circle.TYPE;

		this._initialLabelText = L.drawLocal.draw.handlers.circle.tooltip.start;

		L.Draw.SimpleShape.prototype.initialize.call(this, map, options);
	},

	_drawShape(latlng) {
		// Calculate the distance based on the version
		let distance;
		if (L.GeometryUtil.isVersion07x()) {
			distance = this._startLatLng.distanceTo(latlng);
		} else {
			distance = this._map.distance(this._startLatLng, latlng);
		}

		if (!this._shape) {
			this._shape = new L.Circle(this._startLatLng, distance, this.options.shapeOptions);
			this._map.addLayer(this._shape);
		} else {
			this._shape.setRadius(distance);
		}
	},

	_fireCreatedEvent() {
		let circle = new L.Circle(this._startLatLng, this._shape.getRadius(), this.options.shapeOptions);
		L.Draw.SimpleShape.prototype._fireCreatedEvent.call(this, circle);
	},

	_onMouseMove(e) {
		let { latlng } = e;
		let { showRadius } = this.options;
		let useMetric = this.options.metric;
		let radius;

		this._tooltip.updatePosition(latlng);
		if (this._isDrawing) {
			this._drawShape(latlng);

			// Get the new radius (rounded to 1 dp)
			radius = this._shape.getRadius().toFixed(1);

			let subtext = "";
			if (showRadius) {
				subtext = `${L.drawLocal.draw.handlers.circle.radius}: ${
					L.GeometryUtil.readableDistance(radius, useMetric, this.options.feet, this.options.nautic)}`;
			}
			this._tooltip.updateContent({
				text: this._endLabelText,
				subtext
			});
		}
	}
});
