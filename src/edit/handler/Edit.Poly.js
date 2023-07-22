L.Edit = L.Edit || {};

/**
 * @class L.Edit.Polyline
 * @aka L.Edit.Poly
 * @aka Edit.Poly
 */
L.Edit.Poly = L.Handler.extend({
  // @method initialize(): void
  initialize(poly) {

    this.latlngs = [poly._latlngs];
    if (poly._holes) {
      this.latlngs = this.latlngs.concat(poly._holes);
    }

    this._poly = poly;

    this._poly.addEventListener("revert-edited", this._updateLatLngs, this);
  },

  // Compatibility method to normalize Poly* objects
  // between 0.7.x and 1.0+
  _defaultShape() {
    if (!L.Polyline._flat) {
      return this._poly._latlngs;
    }
    return L.Polyline._flat(this._poly._latlngs) ? this._poly._latlngs : this._poly._latlngs[0];
  },

  _eachVertexHandler(callback) {
    for (let i = 0; i < this._verticesHandlers.length; i++) {
      callback(this._verticesHandlers[i]);
    }
  },

  // @method addHooks(): void
  // Add listener hooks to this handler
  addHooks() {
    this._initHandlers();
    this._eachVertexHandler((handler) => {
      handler.addHooks();
    });
  },

  // @method removeHooks(): void
  // Remove listener hooks from this handler
  removeHooks() {
    this._eachVertexHandler((handler) => {
      handler.removeHooks();
    });
  },

  // @method updateMarkers(): void
  // Fire an update for each vertex handler
  updateMarkers() {
    this._eachVertexHandler((handler) => {
      handler.updateMarkers();
    });
  },

  _initHandlers() {
    this._verticesHandlers = [];
    for (let i = 0; i < this.latlngs.length; i++) {
      this._verticesHandlers.push(new L.Edit.PolyVerticesEdit(this._poly, this.latlngs[i], this._poly.options.poly));
    }
  },

  _updateLatLngs(e) {
    this.latlngs = [e.layer._latlngs];
    if (e.layer._holes) {
      this.latlngs = this.latlngs.concat(e.layer._holes);
    }
  }

});

/**
 * @class L.Edit.PolyVerticesEdit
 * @aka Edit.PolyVerticesEdit
 */
L.Edit.PolyVerticesEdit = L.Handler.extend({
  options: {
    icon: new L.DivIcon({
      iconSize: new L.Point(8, 8),
      className: "leaflet-div-icon leaflet-editing-icon"
    }),
    touchIcon: new L.DivIcon({
      iconSize: new L.Point(20, 20),
      className: "leaflet-div-icon leaflet-editing-icon leaflet-touch-icon"
    }),
    drawError: {
      color: "#b00b00",
      timeout: 1000
    }
  },

  // @method intialize(): void
  initialize(poly, latlngs, options) {
    // if touch, switch to touch icon
    if (L.Browser.touch) {
      this.options.icon = this.options.touchIcon;
    }
    this._poly = poly;

    if (options && options.drawError) {
      options.drawError = L.Util.extend({}, this.options.drawError, options.drawError);
    }

    this._latlngs = latlngs;

    L.setOptions(this, options);
  },

  // Compatibility method to normalize Poly* objects
  // between 0.7.x and 1.0+
  _defaultShape() {
    if (!L.Polyline._flat) {
      return this._latlngs;
    }
    return L.Polyline._flat(this._latlngs) ? this._latlngs : this._latlngs[0];
  },

  // @method addHooks(): void
  // Add listener hooks to this handler.
  addHooks() {
    let poly = this._poly;
    let path = poly._path;

    if (!(poly instanceof L.Polygon)) {
      poly.options.fill = false;
      if (poly.options.editing) {
        poly.options.editing.fill = false;
      }
    }

    if (path) {
      if (poly.options.editing && poly.options.editing.className) {
        if (poly.options.original.className) {
          poly.options.original.className.split(" ").forEach((className) => {
            L.DomUtil.removeClass(path, className);
          });
        }
        poly.options.editing.className.split(" ").forEach((className) => {
          L.DomUtil.addClass(path, className);
        });
      }
    }

    poly.setStyle(poly.options.editing);

    if (this._poly._map) {

      this._map = this._poly._map; // Set map

      if (!this._markerGroup) {
        this._initMarkers();
      }
      this._poly._map.addLayer(this._markerGroup);
    }
  },

  // @method removeHooks(): void
  // Remove listener hooks from this handler.
  removeHooks() {
    let poly = this._poly;
    let path = poly._path;

    if (path) {
      if (poly.options.editing && poly.options.editing.className) {
        poly.options.editing.className.split(" ").forEach((className) => {
          L.DomUtil.removeClass(path, className);
        });
        if (poly.options.original.className) {
          poly.options.original.className.split(" ").forEach((className) => {
            L.DomUtil.addClass(path, className);
          });
        }
      }
    }

    poly.setStyle(poly.options.original);

    if (poly._map) {
      poly._map.removeLayer(this._markerGroup);
      delete this._markerGroup;
      delete this._markers;
    }
  },

  // @method updateMarkers(): void
  // Clear markers and update their location
  updateMarkers() {
    this._markerGroup.clearLayers();
    this._initMarkers();
  },

  _initMarkers() {
    if (!this._markerGroup) {
      this._markerGroup = new L.LayerGroup();
    }
    this._markers = [];

    let latlngs = this._defaultShape();
    let i;
    let j;
    let len;
    let marker;

    for (i = 0, len = latlngs.length; i < len; i++) {

      marker = this._createMarker(latlngs[i], i);
      marker.on("click", this._onMarkerClick, this);
      marker.on("contextmenu", this._onContextMenu, this);
      this._markers.push(marker);
    }

    let markerLeft;
    let markerRight;

    for (i = 0, j = len - 1; i < len; j = i++) {
      if (!(i === 0 && !(L.Polygon && (this._poly instanceof L.Polygon)))) {

        markerLeft = this._markers[j];
        markerRight = this._markers[i];

        this._createMiddleMarker(markerLeft, markerRight);
        this._updatePrevNext(markerLeft, markerRight);
      }
    }
  },

  _createMarker(latlng, index) {
    // Extending L.Marker in TouchEvents.js to include touch.
    let marker = new L.Marker.Touch(latlng, {
      draggable: true,
      icon: this.options.icon
    });

    marker._origLatLng = latlng;
    marker._index = index;

    marker
      .on("dragstart", this._onMarkerDragStart, this)
      .on("drag", this._onMarkerDrag, this)
      .on("dragend", this._fireEdit, this)
      .on("touchmove", this._onTouchMove, this)
      .on("touchend", this._fireEdit, this)
      .on("MSPointerMove", this._onTouchMove, this)
      .on("MSPointerUp", this._fireEdit, this);

    this._markerGroup.addLayer(marker);

    return marker;
  },

  _onMarkerDragStart() {
    this._poly.fire("editstart");
  },

  _spliceLatLngs(...args) {
    let latlngs = this._defaultShape();
    let removed = [].splice.apply(latlngs, args);
    this._poly._convertLatLngs(latlngs, true);
    this._poly.redraw();
    return removed;
  },

  _removeMarker(marker) {
    let i = marker._index;

    this._markerGroup.removeLayer(marker);
    this._markers.splice(i, 1);
    this._spliceLatLngs(i, 1);
    this._updateIndexes(i, -1);

    marker
      .off("dragstart", this._onMarkerDragStart, this)
      .off("drag", this._onMarkerDrag, this)
      .off("dragend", this._fireEdit, this)
      .off("touchmove", this._onMarkerDrag, this)
      .off("touchend", this._fireEdit, this)
      .off("click", this._onMarkerClick, this)
      .off("MSPointerMove", this._onTouchMove, this)
      .off("MSPointerUp", this._fireEdit, this);
  },

  _fireEdit() {
    this._poly.edited = true;
    this._poly.fire("edit");
    this._poly._map.fire(L.Draw.Event.EDITVERTEX, {layers: this._markerGroup, poly: this._poly});
  },

  _onMarkerDrag(e) {
    let marker = e.target;
    let poly = this._poly;

    let oldOrigLatLng = L.LatLngUtil.cloneLatLng(marker._origLatLng);
    L.extend(marker._origLatLng, marker._latlng);
    if (poly.options.poly) {
      let tooltip = poly._map._editTooltip; // Access the tooltip

      // If we don't allow intersections and the polygon intersects
      if (!poly.options.poly.allowIntersection && poly.intersects()) {
        L.extend(marker._origLatLng, oldOrigLatLng);
        marker.setLatLng(oldOrigLatLng);
        let originalColor = poly.options.color;
        poly.setStyle({color: this.options.drawError.color});
        if (tooltip) {
          tooltip.updateContent({
            text: L.drawLocal.draw.handlers.polyline.error
          });
        }

        // Reset everything back to normal after a second
        setTimeout(() => {
          poly.setStyle({color: originalColor});
          if (tooltip) {
            tooltip.updateContent({
              text: L.drawLocal.edit.handlers.edit.tooltip.text,
              subtext: L.drawLocal.edit.handlers.edit.tooltip.subtext
            });
          }
        }, 1000);
      }
    }

    if (marker._middleLeft) {
      marker._middleLeft.setLatLng(this._getMiddleLatLng(marker._prev, marker));
    }
    if (marker._middleRight) {
      marker._middleRight.setLatLng(this._getMiddleLatLng(marker, marker._next));
    }

    // refresh the bounds when draging
    this._poly._bounds._southWest = L.latLng(Infinity, Infinity);
    this._poly._bounds._northEast = L.latLng(-Infinity, -Infinity);
    let latlngs = this._poly.getLatLngs();
    this._poly._convertLatLngs(latlngs, true);
    this._poly.redraw();
    this._poly.fire("editdrag");
  },

  _onMarkerClick(e) {

    let minPoints = L.Polygon && (this._poly instanceof L.Polygon) ? 4 : 3;
    let marker = e.target;

    // If removing this point would create an invalid polyline/polygon don't remove
    if (this._defaultShape().length < minPoints) {
      return;
    }

    // remove the marker
    this._removeMarker(marker);

    // update prev/next links of adjacent markers
    this._updatePrevNext(marker._prev, marker._next);

    // remove ghost markers near the removed marker
    if (marker._middleLeft) {
      this._markerGroup.removeLayer(marker._middleLeft);
    }
    if (marker._middleRight) {
      this._markerGroup.removeLayer(marker._middleRight);
    }

    // create a ghost marker in place of the removed one
    if (marker._prev && marker._next) {
      this._createMiddleMarker(marker._prev, marker._next);

    } else if (!marker._prev) {
      marker._next._middleLeft = null;

    } else if (!marker._next) {
      marker._prev._middleRight = null;
    }

    this._fireEdit();
  },

  _onContextMenu(e) {
    let marker = e.target;

    this._poly._map.fire(L.Draw.Event.MARKERCONTEXT, {marker, layers: this._markerGroup, poly: this._poly});

    L.DomEvent.stopPropagation();
  },

  _onTouchMove(e) {

    let layerPoint = this._map.mouseEventToLayerPoint(e.originalEvent.touches[0]);
    let latlng = this._map.layerPointToLatLng(layerPoint);
    let marker = e.target;

    L.extend(marker._origLatLng, latlng);

    if (marker._middleLeft) {
      marker._middleLeft.setLatLng(this._getMiddleLatLng(marker._prev, marker));
    }
    if (marker._middleRight) {
      marker._middleRight.setLatLng(this._getMiddleLatLng(marker, marker._next));
    }

    this._poly.redraw();
    this.updateMarkers();
  },

  _updateIndexes(index, delta) {
    this._markerGroup.eachLayer((marker) => {
      if (marker._index > index) {
        marker._index += delta;
      }
    });
  },

  _createMiddleMarker(marker1, marker2) {
    let latlng = this._getMiddleLatLng(marker1, marker2);
    let marker = this._createMarker(latlng);
    let onClick;
    let onDragStart;
    let onDragEnd;

    marker.setOpacity(0.6);

    marker1._middleRight = marker;
    marker2._middleLeft = marker;

    onDragStart = () => {
      marker.off("touchmove", onDragStart, this);
      let i = marker2._index;

      marker._index = i;

      marker
        .off("click", onClick, this)
        .on("click", this._onMarkerClick, this);

      latlng.lat = marker.getLatLng().lat;
      latlng.lng = marker.getLatLng().lng;
      this._spliceLatLngs(i, 0, latlng);
      this._markers.splice(i, 0, marker);

      marker.setOpacity(1);

      this._updateIndexes(i, 1);
      marker2._index++;
      this._updatePrevNext(marker1, marker);
      this._updatePrevNext(marker, marker2);

      this._poly.fire("editstart");
    };

    onDragEnd = () => {
      marker.off("dragstart", onDragStart, this);
      marker.off("dragend", onDragEnd, this);
      marker.off("touchmove", onDragStart, this);

      this._createMiddleMarker(marker1, marker);
      this._createMiddleMarker(marker, marker2);
    };

    onClick = () => {
      onDragStart.call(this);
      onDragEnd.call(this);
      this._fireEdit();
    };

    marker
      .on("click", onClick, this)
      .on("dragstart", onDragStart, this)
      .on("dragend", onDragEnd, this)
      .on("touchmove", onDragStart, this);

    this._markerGroup.addLayer(marker);
  },

  _updatePrevNext(marker1, marker2) {
    if (marker1) {
      marker1._next = marker2;
    }
    if (marker2) {
      marker2._prev = marker1;
    }
  },

  _getMiddleLatLng(marker1, marker2) {
    let map = this._poly._map;
    let p1 = map.project(marker1.getLatLng());
    let p2 = map.project(marker2.getLatLng());

    return map.unproject(p1._add(p2)._divideBy(2));
  }
});

function addEditFunctionalityToDrawnPolyline() {

  // Check to see if handler has already been initialized. This is to support versions of Leaflet that still have L.Handler.PolyEdit
  if (this.editing) {
    return;
  }

  if (L.Edit.Poly) {

    this.editing = new L.Edit.Poly(this);

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

L.Polyline.addInitHook(addEditFunctionalityToDrawnPolyline);
