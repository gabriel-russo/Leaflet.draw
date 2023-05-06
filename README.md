# Leaflet.draw

This fork of Leaflet.draw is a work in progress. It is intended to update to newest packages and Javascript standards.

It is not intended to be a drop-in replacement for the original Leaflet.draw and will not be published. 

This is a custom fork for my own needs.

----

Adds support for drawing and editing vectors and markers on [Leaflet maps](https://github.com/Leaflet/Leaflet).

Supports [Leaflet](https://github.com/Leaflet/Leaflet/releases) 1.0.0+ branches.

Please check out our [Api Documentation](https://leaflet.github.io/Leaflet.draw/docs/leaflet-draw-latest.html)

## In this readme

- [Customizing Language](#customizing-language-and-text-in-leafletdraw)
- [Common tasks](#common-tasks)
- [Building the project](#build)
- [Documentation](#documentation)

## Customizing language and text in Leaflet.draw

Leaflet.draw uses the `L.drawLocal` configuration object to set any text used in the plugin. Customizing this will allow support for changing the text or supporting another language.

See [Leaflet.draw.js](https://github.com/Leaflet/Leaflet.draw/blob/master/src/Leaflet.draw.js) for the default strings.

E.g.

```js
    // Set the button title text for the polygon button
    L.drawLocal.draw.toolbar.buttons.polygon = 'Draw a sexy polygon!';
    
    // Set the tooltip start text for the rectangle
    L.drawLocal.draw.handlers.rectangle.tooltip.start = 'Not telling...';
```

## Common tasks

The following examples outline some common tasks.

### Example Leaflet.draw config

The following example will show you how to:

1. Change the position of the control's toolbar.
2. Customize the styles of a vector layer.
3. Use a custom marker.
4. Disable the delete functionality.

```js
    var cloudmadeUrl = 'http://{s}.tile.cloudmade.com/BC9A493B41014CAABB98F0471D759707/997/256/{z}/{x}/{y}.png',
        cloudmade = new L.TileLayer(cloudmadeUrl, {maxZoom: 18}),
        map = new L.Map('map', {layers: [cloudmade], center: new L.LatLng(-37.7772, 175.2756), zoom: 15 });
    
    var editableLayers = new L.FeatureGroup();
    map.addLayer(editableLayers);
    
    var MyCustomMarker = L.Icon.extend({
        options: {
            shadowUrl: null,
            iconAnchor: new L.Point(12, 12),
            iconSize: new L.Point(24, 24),
            iconUrl: 'link/to/image.png'
        }
    });
    
    var options = {
        position: 'topright',
        draw: {
            polyline: {
                shapeOptions: {
                    color: '#f357a1',
                    weight: 10
                }
            },
            polygon: {
                allowIntersection: false, // Restricts shapes to simple polygons
                drawError: {
                    color: '#e1e100', // Color the shape will turn when intersects
                    message: '<strong>Oh snap!<strong> you can\'t draw that!' // Message that will show when intersect
                },
                shapeOptions: {
                    color: '#bada55'
                }
            },
            circle: false, // Turns off this drawing tool
            rectangle: {
                shapeOptions: {
                    clickable: false
                }
            },
            marker: {
                icon: new MyCustomMarker()
            }
        },
        edit: {
            featureGroup: editableLayers, //REQUIRED!!
            remove: false
        }
    };
    
    var drawControl = new L.Control.Draw(options);
    map.addControl(drawControl);
    
    map.on(L.Draw.Event.CREATED, function (e) {
        var type = e.layerType,
            layer = e.layer;
    
        if (type === 'marker') {
            layer.bindPopup('A popup!');
        }
    
        editableLayers.addLayer(layer);
    });
```

### Changing a drawing handlers options

You can change a draw handlers options after initialisation by using the `setDrawingOptions` method on the Leaflet.draw control.

E.g. to change the colour of the rectangle:

```js
drawControl.setDrawingOptions({
    rectangle: {
    	shapeOptions: {
        	color: '#0000FF'
        }
    }
});
```

# Build

To build you can install the npm dependencies:

    npm install

and then use:

    npm run build

after that, you can get the code in `dist/` folder.

## Documentation

Documentation is build with Leafdoc, to generate the documentation use

    npm run docs

and the generated html documentation is saved to `./docs/leaflet-draw-latest.html`
