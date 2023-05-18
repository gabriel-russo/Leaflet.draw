/**
 * @class L.Draw.Toolbar
 * @aka Toolbar
 *
 * The toolbar class of the API — it is used to create the ui
 * This will be depreciated
 *
 * @example
 *
 * ```js
 *    var toolbar = L.Toolbar();
 *    toolbar.addToolbar(map);
 * ```
 *
 * ### Disabling a toolbar
 *
 * If you do not want a particular toolbar in your app you can turn it off by setting the toolbar to false.
 *
 * ```js
 *      var drawControl = new L.Control.Draw({
 *          draw: false,
 *          edit: {
 *              featureGroup: editableLayers
 *          }
 *      });
 * ```
 *
 * ### Disabling a toolbar item
 *
 * If you want to turn off a particular toolbar item, set it to false. The following disables drawing polygons and
 * markers. It also turns off the ability to edit layers.
 *
 * ```js
 *      var drawControl = new L.Control.Draw({
 *          draw: {
 *              polygon: false,
 *              marker: false
 *          },
 *          edit: {
 *              featureGroup: editableLayers,
 *              edit: false
 *          }
 *      });
 * ```
 */
L.Toolbar = L.Class.extend({
	// @section Methods for modifying the toolbar

	// @method initialize(options): void
	// Toolbar constructor
	initialize(options) {
		L.setOptions(this, options);

		this._modes = {};
		this._actionButtons = [];
		this._activeMode = null;

		let version = L.version.split(".");
		// If Version is >= 1.2.0
		if (parseInt(version[0], 10) === 1 && parseInt(version[1], 10) >= 2) {
			L.Toolbar.include(L.Evented.prototype);
		} else {
			L.Toolbar.include(L.Mixin.Events);
		}
	},

	// @method enabled(): boolean
	// Gets a true/false of whether the toolbar is enabled
	enabled() {
		return this._activeMode !== null;
	},

	// @method disable(): void
	// Disables the toolbar
	disable() {
		if (!this.enabled()) {
			return;
		}

		this._activeMode.handler.disable();
	},

	// @method addToolbar(map): L.DomUtil
	// Adds the toolbar to the map and returns the toolbar dom element
	addToolbar(map) {
		let container = L.DomUtil.create("div", "leaflet-draw-section");
		let buttonIndex = 0;
		let buttonClassPrefix = this._toolbarClass || "";
		let modeHandlers = this.getModeHandlers(map);
		let i;

		this._map = map;

		// If customButtons option is set, add the buttons to the toolbar and
		// exit the function because toolbar dom is not needed
		if (this.options.customButtons) {
			for (i = 0; i < modeHandlers.length; i++) {
				if (modeHandlers[i].enabled) {
					this._initModeHandlerOnExternalButton(
						modeHandlers[i].handler,
						modeHandlers[i].title,
						this.options.customButtons[modeHandlers[i].handler.type]
					);
				}
			}

			return;
		}

		this._toolbarContainer = L.DomUtil.create("div", "leaflet-draw-toolbar leaflet-bar");

		for (i = 0; i < modeHandlers.length; i++) {
			if (modeHandlers[i].enabled) {
				this._initModeHandler(
					modeHandlers[i].handler,
					this._toolbarContainer,
					buttonIndex++,
					buttonClassPrefix,
					modeHandlers[i].title
				);
			}
		}

		// if no buttons were added, do not add the toolbar
		if (!buttonIndex) {
			return;
		}

		// Save button index of the last button, -1 as we would have ++ after the last button
		this._lastButtonIndex = --buttonIndex;

		// Create empty actions part of the toolbar
		this._actionsContainer = L.DomUtil.create("ul", "leaflet-draw-actions");

		// Add draw and cancel containers to the control container
		container.appendChild(this._toolbarContainer);
		container.appendChild(this._actionsContainer);

		return container;
	},

	// @method removeToolbar(): void
	// Removes the toolbar and drops the handler event listeners
	removeToolbar() {
		// Dispose each handler
		for (let handlerId in this._modes) {
			if (Object.prototype.hasOwnProperty.call(this._modes, handlerId)) {
				// Unbind handler button
				this._disposeButton(
					this._modes[handlerId].button,
					this._modes[handlerId].handler.enable,
					this._modes[handlerId].handler
				);

				// Make sure is disabled
				this._modes[handlerId].handler.disable();

				// Unbind handler
				this._modes[handlerId].handler
					.off("enabled", this._handlerActivated, this)
					.off("disabled", this._handlerDeactivated, this);
			}
		}
		this._modes = {};

		// Dispose the actions toolbar
		for (let i = 0, l = this._actionButtons.length; i < l; i++) {
			this._disposeButton(this._actionButtons[i].button, this._actionButtons[i].callback, this);
		}
		this._actionButtons = [];
		this._actionsContainer = null;
	},

	_initModeHandlerOnExternalButton(handler, title, button) {
		let { type } = handler;

		this._modes[type] = {};

		this._modes[type].handler = handler;

		this._modes[type].button = button;

		this._modes[type].button.title = title;

		/* iOS does not use click events */
		let eventType = this._detectIOS() ? "touchstart" : "click";

		L.DomEvent.on(button, "click", L.DomEvent.stopPropagation)
			.on(button, "mousedown", L.DomEvent.stopPropagation)
			.on(button, "dblclick", L.DomEvent.stopPropagation)
			.on(button, "touchstart", L.DomEvent.stopPropagation)
			.on(button, "click", L.DomEvent.preventDefault)
			.on(button, eventType, handler.enable, handler);

		this._modes[type].handler
			.on("enabled", this._handlerActivated, this)
			.on("disabled", this._handlerDeactivated, this);
	},

	_initModeHandler(handler, container, buttonIndex, classNamePredix, buttonTitle) {
		let { type } = handler;

		this._modes[type] = {};

		this._modes[type].handler = handler;

		this._modes[type].button = this._createButton({
			type,
			title: buttonTitle,
			className: `${classNamePredix}-${type}`,
			container,
			callback: this._modes[type].handler.enable,
			context: this._modes[type].handler
		});

		this._modes[type].buttonIndex = buttonIndex;

		this._modes[type].handler
			.on("enabled", this._handlerActivated, this)
			.on("disabled", this._handlerDeactivated, this);
	},

	/* Detect iOS based on browser User Agent, based on:
   * http://stackoverflow.com/a/9039885 */
	_detectIOS() {
		return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
	},

	_createButton(options) {
		let link = L.DomUtil.create("a", options.className || "", options.container);
		// Screen reader tag
		let sr = L.DomUtil.create("span", "sr-only", options.container);

		link.href = "#";
		link.appendChild(sr);

		if (options.title) {
			link.title = options.title;
			sr.innerHTML = options.title;
		}

		if (options.text) {
			link.innerHTML = options.text;
			sr.innerHTML = options.text;
		}

		/* iOS does not use click events */
		let buttonEvent = this._detectIOS() ? "touchstart" : "click";

		L.DomEvent.on(link, "click", L.DomEvent.stopPropagation)
			.on(link, "mousedown", L.DomEvent.stopPropagation)
			.on(link, "dblclick", L.DomEvent.stopPropagation)
			.on(link, "touchstart", L.DomEvent.stopPropagation)
			.on(link, "click", L.DomEvent.preventDefault)
			.on(link, buttonEvent, options.callback, options.context);

		return link;
	},

	_disposeButton(button, callback) {
		/* iOS does not use click events */
		let buttonEvent = this._detectIOS() ? "touchstart" : "click";

		L.DomEvent.off(button, "click", L.DomEvent.stopPropagation)
			.off(button, "mousedown", L.DomEvent.stopPropagation)
			.off(button, "dblclick", L.DomEvent.stopPropagation)
			.off(button, "touchstart", L.DomEvent.stopPropagation)
			.off(button, "click", L.DomEvent.preventDefault)
			.off(button, buttonEvent, callback);
	},

	_handlerActivated(e) {
		// Disable active mode (if present)
		this.disable();

		// Cache new active feature
		this._activeMode = this._modes[e.handler];

		L.DomUtil.addClass(this._activeMode.button, "leaflet-draw-toolbar-button-enabled");

		// 	this._showActionsToolbar() :
		this._map.fire(L.Draw.Event.ACTIONSTART, { actions: this.getActions(e.handler) });
		this.fire("enable");
	},

	_handlerDeactivated() {
		// this._hideActionsToolbar();

		L.DomUtil.removeClass(this._activeMode.button, "leaflet-draw-toolbar-button-enabled");

		this._activeMode = null;

		this._map.fire(L.Draw.Event.ACTIONSTOP);
		this.fire("disable");
	},

	_createActions(handler) {
		let container = this._actionsContainer;
		let buttons = this.getActions(handler);
		let l = buttons.length;
		let li;
		let di;
		let dl;
		let button;

		// Dispose the actions toolbar (todo: dispose only not used buttons)
		for (di = 0, dl = this._actionButtons.length; di < dl; di++) {
			this._disposeButton(this._actionButtons[di].button, this._actionButtons[di].callback);
		}
		this._actionButtons = [];

		// Remove all old buttons
		while (container.firstChild) {
			container.removeChild(container.firstChild);
		}

		for (let i = 0; i < l; i++) {
			if (!("enabled" in buttons[i] && !buttons[i].enabled)) {

				li = L.DomUtil.create("li", "", container);

				button = this._createButton({
					title: buttons[i].title,
					text: buttons[i].text,
					container: li,
					callback: buttons[i].callback,
					context: buttons[i].context
				});

				this._actionButtons.push({
					button,
					callback: buttons[i].callback
				});
			}
		}
	},

	_showActionsToolbar() {
		let { buttonIndex } = this._activeMode;
		let lastButtonIndex = this._lastButtonIndex;
		let toolbarPosition = this._activeMode.button.offsetTop - 1;

		// Recreate action buttons on every click
		this._createActions(this._activeMode.handler);

		// Correctly position the cancel button
		this._actionsContainer.style.top = `${toolbarPosition}px`;

		if (buttonIndex === 0) {
			L.DomUtil.addClass(this._toolbarContainer, "leaflet-draw-toolbar-notop");
			L.DomUtil.addClass(this._actionsContainer, "leaflet-draw-actions-top");
		}

		if (buttonIndex === lastButtonIndex) {
			L.DomUtil.addClass(this._toolbarContainer, "leaflet-draw-toolbar-nobottom");
			L.DomUtil.addClass(this._actionsContainer, "leaflet-draw-actions-bottom");
		}

		this._actionsContainer.style.display = "block";
		this._map.fire(L.Draw.Event.TOOLBAROPENED);
	},

	_hideActionsToolbar() {
		this._actionsContainer.style.display = "none";

		L.DomUtil.removeClass(this._toolbarContainer, "leaflet-draw-toolbar-notop");
		L.DomUtil.removeClass(this._toolbarContainer, "leaflet-draw-toolbar-nobottom");
		L.DomUtil.removeClass(this._actionsContainer, "leaflet-draw-actions-top");
		L.DomUtil.removeClass(this._actionsContainer, "leaflet-draw-actions-bottom");
		this._map.fire(L.Draw.Event.TOOLBARCLOSED);
	}
});
