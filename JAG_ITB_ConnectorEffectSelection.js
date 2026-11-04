//=============================================================================
// JAG_ITB_ConnectorEffectSelection.js
//=============================================================================
/*:
 * @plugindesc UI for selectable connector effects.
 * @author JAG
 *
 * @help
 * Requires:
 *   JAG_ITB_Command_UI.js
 *   JAG_ITB_TargetConnectors.js
 *
 * Load this plugin below both dependencies.
 *
 */
(function() {

    "use strict";

    //=========================================================================
    // Dependencies
    //=========================================================================

    if (typeof window.Window_Preview !== "function") {
        console.error(
            "JAG_ITB_ConnectorEffectUI: Window_Preview not available. " +
            "Check plugin load order."
        );
        return;
    }

    if (typeof window.Window_ITBTargetConnectors !== "function") {
        console.error(
            "JAG_ITB_ConnectorEffectUI: Window_ITBTargetConnectors " +
            "not available. Check plugin load order."
        );
        return;
    }

    // Local references to the existing window classes.
    var Window_Preview = window.Window_Preview;
    var Window_ITBTargetConnectors = window.Window_ITBTargetConnectors;

    //=========================================================================
    // TouchInput
    //=========================================================================

    /* var CES_TI_onMouseMove = TouchInput._onMouseMove;
    TouchInput._onMouseMove = function(event) {
        CES_TI_onMouseMove.call(this, event);
        // RPG Maker MV normally updates the mouse position only while pressed.
        // Also update it during ordinary mouse movement for hover selection.
        var scene = SceneManager._scene;
        var selector = scene && scene._connectorEffectSelectorWindow;
        if (selector && selector.visible && !this._mousePressed) {
            this._onMove(event.pageX, event.pageY);
        }
    }; */

    //==========================================================================
    // Scene_Battle
    //==========================================================================

    //--------------------------------------------------------------------------
    // Create All Windows
    //--------------------------------------------------------------------------

    var CES_SB_createAllWindows = Scene_Battle.prototype.createAllWindows;
    Scene_Battle.prototype.createAllWindows = function() {
        CES_SB_createAllWindows.call(this);
        this.createConnectorEffectSelectorWindow();
        var parent = this._previewWindow.parent;
        var previewIndex = parent.getChildIndex(this._previewWindow);
        // Place the selector window behind the preview.
        parent.setChildIndex(this._connectorEffectSelectorWindow, previewIndex);
        // Place the selection arrow above the preview.
        parent.setChildIndex(
            this._connectorEffectSelectorWindow._selectionArrow,
            previewIndex + 1
        );
    };

    //--------------------------------------------------------------------------
    // Update connector effect selector
    //--------------------------------------------------------------------------

    var CES_SB_update = Scene_Battle.prototype.update;
    Scene_Battle.prototype.update = function() {
        CES_SB_update.call(this);
        this.updateConnectorEffectSelector();
    };

    Scene_Battle.prototype.updateConnectorEffectSelector = function() {
        /* var track = this.connectorEffectTrackAtPointer();
        if (!track) {
            this.clearConnectorEffectSelector();
            return;
        }
        this.setConnectorEffectSelector(
            track.effect,
            track.hostWindow,
            track.x,
            track.y
        ); */
        var selector = this._connectorEffectSelectorWindow;
        if (!selector) return;
        var tracks = (this._connectorEffectTracks || []).filter(function(track) {
            return track.hostWindow && track.hostWindow.visible;
        });
        selector.setTracks(tracks);
        if (tracks.length > 0) {
            selector.show();
            if (!selector.active) selector.activate();
        } else {
            this.clearConnectorEffectSelector();
        }
    };

    //--------------------------------------------------------------------------
    // Connector effect selector lifecycle
    //--------------------------------------------------------------------------

    Scene_Battle.prototype.createConnectorEffectSelectorWindow = function() {
        this._connectorEffectSelectorWindow = new Window_ConnectorEffectSelector();
        this.addWindow(this._connectorEffectSelectorWindow);
        this._connectorEffectSelectorWindow.hide();
    };

    //--------------------------------------------------------------------------
    // Connector effect selector assignment
    //--------------------------------------------------------------------------

    /* Scene_Battle.prototype.setConnectorEffectSelector = function(effect, hostWindow, gaugeX, gaugeY) {
        var selector = this._connectorEffectSelectorWindow;
        if (!selector || !effect || !hostWindow) return;
        selector.setEffect(effect);
        this._connectorEffectSelectorHostWindow = hostWindow;
        this._connectorEffectSelectorGaugeX = gaugeX;
        this._connectorEffectSelectorGaugeY = gaugeY;
        selector.show();
        selector.activate();
        this.updateConnectorEffectSelectorPosition();
    }; */

    //--------------------------------------------------------------------------
    // Connector effect selector position
    //--------------------------------------------------------------------------

    /* var CES_SB_updateWindowPositions = Scene_Battle.prototype.updateWindowPositions;
    Scene_Battle.prototype.updateWindowPositions = function() {
        CES_SB_updateWindowPositions.call(this);
        if (this._connectorEffectSelectorWindow) {
            this.updateConnectorEffectSelectorPosition();
        }
    }; */

    /* Scene_Battle.prototype.updateConnectorEffectSelectorPosition = function() {
        var selector = this._connectorEffectSelectorWindow;
        var hostWindow = this._connectorEffectSelectorHostWindow;
        if (!selector || !hostWindow) return;
        if (!hostWindow.visible) {
            selector.hide();
            selector.deactivate();
            return;
        }
        var x =
            hostWindow.x +
            hostWindow.padding +
            this._connectorEffectSelectorGaugeX -
            selector.gaugeX();
        var y =
            hostWindow.y +
            hostWindow.padding +
            this._connectorEffectSelectorGaugeY -
            selector.gaugeY();
        selector.move(x, y, selector.windowWidth(), selector.windowHeight());
    }; */

    //--------------------------------------------------------------------------
    // Ensure selector is above the target connector window
    //--------------------------------------------------------------------------

    /* var CES_SB_createDisplayObjects = Scene_Battle.prototype.createDisplayObjects;
    Scene_Battle.prototype.createDisplayObjects = function() {
        CES_SB_createDisplayObjects.call(this);
        if (this._connectorEffectSelectorWindow) {
            this.addWindow(this._connectorEffectSelectorWindow);
        }
    }; */

    //--------------------------------------------------------------------------
    // Clear connector effect selector
    //--------------------------------------------------------------------------

    Scene_Battle.prototype.clearConnectorEffectSelector = function() {
        var selector = this._connectorEffectSelectorWindow;
        if (!selector) return;
        selector.setTracks([]);
        selector.deactivate();
        selector.hide();
        //this._connectorEffectSelectorHostWindow = null;
        //this._connectorEffectSelectorGaugeX = 0;
        //this._connectorEffectSelectorGaugeY = 0;
    };

    //--------------------------------------------------------------------------
    // Connector effect displayed value
    //--------------------------------------------------------------------------

    Scene_Battle.prototype.connectorEffectSelectionValue = function(effect) {
        var selector = this._connectorEffectSelectorWindow;
        if (selector && selector.effect() === effect) return selector.value();
        return effect.value;
    };

    //--------------------------------------------------------------------------
    // Connector effect track registry
    //--------------------------------------------------------------------------

    Scene_Battle.prototype.clearConnectorEffectTracks = function(hostWindow) {
        if (!this._connectorEffectTracks) {
            this._connectorEffectTracks = [];
            return;
        }
        this._connectorEffectTracks = this._connectorEffectTracks.filter(function(track) {
            return track.hostWindow !== hostWindow;
        });
    };

    Scene_Battle.prototype.registerConnectorEffectTrack = function(effect, hostWindow, x, y, width) {
        if (!this._connectorEffectTracks) this._connectorEffectTracks = [];
        this._connectorEffectTracks.push({
            effect: effect,
            hostWindow: hostWindow,
            x: x,
            y: y,
            width: width
        });
    };

    //--------------------------------------------------------------------------
    // Find connector effect track under pointer
    //--------------------------------------------------------------------------

    /* Scene_Battle.prototype.connectorEffectTrackAtPointer = function() {
        var tracks = this._connectorEffectTracks || [];
        var pointerX = TouchInput.x;
        var pointerY = TouchInput.y;
        for (var i = 0; i < tracks.length; i++) {
            var track = tracks[i];
            var host = track.hostWindow;
            if (!host || !host.visible) continue;
            var x = host.x + host.padding + track.x;
            var y = host.y + host.padding + track.y;
            if (
                pointerX >= x &&
                pointerX <= x + track.width &&
                pointerY >= y - 8 &&
                pointerY <= y + 18
            ) {
                return track;
            }
        }
        return null;
    }; */

    //=========================================================================
    // Window_ConnectorEffectSelector
    //=========================================================================

    function Window_ConnectorEffectSelector() {
        this.initialize.apply(this, arguments);
    }

    Window_ConnectorEffectSelector.prototype = Object.create(Window_Selectable.prototype);
    Window_ConnectorEffectSelector.prototype.constructor = Window_ConnectorEffectSelector;
    window.Window_ConnectorEffectSelector = Window_ConnectorEffectSelector;

    //--------------------------------------------------------------------------
    // Initialization
    //--------------------------------------------------------------------------

    Window_ConnectorEffectSelector.prototype.initialize = function() {
        this._tracks = [];
        this._effect = null;
        this._hostWindow = null;
        //this._lastPointerX = null;
        //this._lastPointerY = null;
        this._value = 0;
        Window_Selectable.prototype.initialize.call(
            this, 0, 0, this.windowWidth(), this.windowHeight()
        );
        this.opacity = 0;
        this.backOpacity = 0;
        this.contentsOpacity = 0;
        this.createSelectionArrow();
        this.deactivate();
        this.hide();
    };

    Window_ConnectorEffectSelector.prototype.standardPadding = function() {
        return 0;
    };

    Window_ConnectorEffectSelector.prototype.windowWidth = function() {
        return 180;
    };

    Window_ConnectorEffectSelector.prototype.windowHeight = function() {
        return 50;
    };

    Window_ConnectorEffectSelector.prototype.setTracks = function(tracks) {
        this._tracks = tracks || [];
        var index = this.index();
        if (index < 0) return;
        if (index >= this._tracks.length) {
            this.select(-1);
            return;
        }
        var track = this._tracks[index];
        if (
            this._effect !== track.effect ||
            this._hostWindow !== track.hostWindow
        ) {
            this.select(index);
        } else {
            this.updateTrackPosition(track);
        }
    };

    //--------------------------------------------------------------------------
    // Update
    //--------------------------------------------------------------------------

    var CES_WCES_update = Window_ConnectorEffectSelector.prototype.update;
    Window_ConnectorEffectSelector.prototype.update = function() {
        CES_WCES_update.call(this);
        this.updatePointerSelection();
        this.updateSelectionArrowPosition();
    };

    //--------------------------------------------------------------------------
    // Refresh
    //--------------------------------------------------------------------------

    Window_ConnectorEffectSelector.prototype.refresh = function() {
        if (!this._selectionArrow) return;
        if (!this._effect) {
            this._selectionArrow.visible = false;
            return;
        }
        var min = Number(this._effect.minChange);
        var max = Number(this._effect.maxChange);
        if (!isFinite(min) || !isFinite(max) || max <= min) {
            this._selectionArrow.visible = false;
            return;
        }
        this.updateSelectionArrowPosition();
        this._selectionArrow.visible = true;
        /* var value = Number(this._value);
        if (!isFinite(min) || !isFinite(max) || max <= min) {
            this._selectionArrow.visible = false;
            return;
        }
        var rate = (value - min) / (max - min);
        rate = Math.max(0, Math.min(1, rate));
        var markerX = this.gaugeX() + this.gaugeWidth() * rate;
        this._selectionArrow.x = markerX;
        this._selectionArrow.y = this.gaugeY() - 16;
        this._selectionArrow.visible = true; */
    };

    //--------------------------------------------------------------------------
    // Selection
    //--------------------------------------------------------------------------

    Window_ConnectorEffectSelector.prototype.select = function(index) {
        var track = this._tracks[index] || null;
        this._effect = track ? track.effect : null;
        this._hostWindow = track ? track.hostWindow : null;
        this._value = track ? Number(track.effect.value) : 0;
        Window_Selectable.prototype.select.call(this, track ? index : -1);
        if (track) this.updateTrackPosition(track);
        this.refresh();
    };

    //--------------------------------------------------------------------------
    // Correct selection arrow coordinates
    //--------------------------------------------------------------------------

    Window_ConnectorEffectSelector.prototype.updateSelectionArrowPosition = function() {
        if (!this._selectionArrow) return;
        this._selectionArrow.x = this.x + this.gaugeX() + this.gaugeWidth() * this.selectionRate();
        this._selectionArrow.y = this.y + this.gaugeY() - 8;
        /* console.log("Marker position:", {
            value: this._value,
            rate: this.selectionRate(),
            selectorX: this.x,
            gaugeX: this.gaugeX(),
            markerX: this._selectionArrow.x
        }); */
    };

    Window_ConnectorEffectSelector.prototype.selectionRate = function() {
        if (!this._effect) return 0;
        var min = Number(this._effect.minChange);
        var max = Number(this._effect.maxChange);
        if (!isFinite(min) || !isFinite(max) || max <= min) return 0;
        var rate = (Number(this._value) - min) / (max - min);
        return Math.max(0, Math.min(1, rate));
    };

    //--------------------------------------------------------------------------
    // Effect assignment
    //--------------------------------------------------------------------------

    /* Window_ConnectorEffectSelector.prototype.setEffect = function(effect) {
        if (this._effect === effect) return;
        this._effect = effect || null;
        this._lastPointerX = null;
        this._lastPointerY = null;
        if (this._effect) {
            this._value = Number(this._effect.value);
            this.select(0);
        } else {
            this._value = 0;
            this.deselect();
        }
        this.refresh();
    }; */

    Window_ConnectorEffectSelector.prototype.effect = function() {
        return this._effect;
    };

    Window_ConnectorEffectSelector.prototype.value = function() {
        return this._value;
    };

    //--------------------------------------------------------------------------
    // Selectable window interface
    //--------------------------------------------------------------------------

    Window_ConnectorEffectSelector.prototype.maxItems = function() {
        return this._tracks.length;
        //return this._effect ? 1 : 0;
    };

    Window_ConnectorEffectSelector.prototype.updateCursor = function() {
        this.setCursorRect(0, 0, 0, 0);
    };

    //--------------------------------------------------------------------------
    // Value selection
    //--------------------------------------------------------------------------

    Window_ConnectorEffectSelector.prototype.setValue = function(value) {
        if (!this._effect) return;
        var min = Number(this._effect.minChange);
        var max = Number(this._effect.maxChange);
        if (!isFinite(min) || !isFinite(max) || max < min) return;
        value = Math.round(Number(value));
        value = Math.max(min, Math.min(max, value));
        if (value === this._value) return;
        this._value = value;
        this.refresh();
    };

    Window_ConnectorEffectSelector.prototype.changeValue = function(amount) {
        this.setValue(this._value + amount);
    };

    //--------------------------------------------------------------------------
    // Cursor input
    //--------------------------------------------------------------------------

    Window_ConnectorEffectSelector.prototype.processCursorMove = function() {
        if (!this.active || !this._effect) return;
        if (Input.isRepeated("left")) {
            this.changeValue(-1);
        } else if (Input.isRepeated("right")) {
            this.changeValue(1);
        }
    };

    //--------------------------------------------------------------------------
    // Pointer input
    //--------------------------------------------------------------------------

    Window_ConnectorEffectSelector.prototype.processTouch = function() {
        if (!this.isOpenAndActive()) return;
        // Mouse click and drag selection.
        if (TouchInput.isTriggered() || TouchInput.isPressed()) {
            var clickedIndex = this.getClickedTrack();
            if (clickedIndex >= 0) {
                if (this.index() !== clickedIndex) {
                    SoundManager.playCursor();
                    this.select(clickedIndex);
                }
                this.updateValueFromPointer(TouchInput.x, TouchInput.y);
            }
        }
        // Mouse hover selection.
        var hoveredIndex = this.getMouseOverTrack();
        if (hoveredIndex >= 0 && this.index() !== hoveredIndex) {
            SoundManager.playCursor();
            this.select(hoveredIndex);
        }
    };

    Window_ConnectorEffectSelector.prototype.getClickedTrack = function() {
        return this.getTrackAtPointer(TouchInput.x, TouchInput.y);
    };

    Window_ConnectorEffectSelector.prototype.getMouseOverTrack = function() {
        return this.getTrackAtPointer(TouchInput._mouseOverX, TouchInput._mouseOverY);
    };

    Window_ConnectorEffectSelector.prototype.getTrackAtPointer = function(x, y) {
        if (!isFinite(x) || !isFinite(y)) return -1;
        for (var i = 0; i < this._tracks.length; i++) {
            var track = this._tracks[i];
            var host = track.hostWindow;
            if (!host || !host.visible) continue;
            var trackX = host.x + host.padding + track.x;
            var trackY = host.y + host.padding + track.y;
            if (
                x >= trackX &&
                x <= trackX + track.width &&
                y >= trackY - 8 &&
                y <= trackY + 18
            ) {
                return i;
            }
        }
        return -1;
    };

    //--------------------------------------------------------------------------
    // Value selection
    //--------------------------------------------------------------------------

    Window_ConnectorEffectSelector.prototype.updatePointerSelection = function() {
        if (!this.active || !this.visible || !this._effect) return;
        //console.log(
        //    "Pointer:", TouchInput._mouseOverX, TouchInput._mouseOverY,
        //    "Value:", this._value
        //);
        this.updateValueFromPointer(TouchInput._mouseOverX, TouchInput._mouseOverY);
        /* if (TouchInput.x === this._lastPointerX && TouchInput.y === this._lastPointerY) {
            return;
        }
        this._lastPointerX = TouchInput.x;
        this._lastPointerY = TouchInput.y;
        var x = TouchInput.x - this.x;
        var y = TouchInput.y - this.y;
        var gaugeX = this.gaugeX();
        var gaugeY = this.gaugeY();
        var gaugeWidth = this.gaugeWidth();
        if (
            x < gaugeX ||
            x > gaugeX + gaugeWidth ||
            y < gaugeY - 8 ||
            y > gaugeY + 18
        ) {
            return;
        }
        var rate = (x - gaugeX) / gaugeWidth;
        rate = Math.max(0, Math.min(1, rate));
        var min = Number(this._effect.minChange);
        var max = Number(this._effect.maxChange);
        var value = Math.round(min + rate * (max - min));
        this.setValue(value); */
    };

    Window_ConnectorEffectSelector.prototype.updateValueFromPointer = function(x, y) {
        var track = this._tracks[this.index()];
        if (!track || !this._effect) return;
        if (!isFinite(x) || !isFinite(y)) return;
        var host = track.hostWindow;
        if (!host || !host.visible) return;
        var trackX = host.x + host.padding + track.x;
        var trackY = host.y + host.padding + track.y;
        // console.log("Track geometry:", {
        //     pointerX: x,
        //     pointerY: y,
        //     trackX: trackX,
        //     trackY: trackY,
        //     width: track.width,
        //     min: this._effect.minChange,
        //     max: this._effect.maxChange
        // });
        if (
            x < trackX ||
            x > trackX + track.width ||
            y < trackY - 8 ||
            y > trackY + 18
        ) {
            return;
        }
        var rate = (x - trackX) / track.width;
        rate = Math.max(0, Math.min(1, rate));
        //console.log("Calculated rate:", rate);
        var min = Number(this._effect.minChange);
        var max = Number(this._effect.maxChange);
        var value = Math.round(min + rate * (max - min));
        //console.log("Calculated value:", value);
        this.setValue(value);
    };

    //--------------------------------------------------------------------------
    // Gauge layout
    //--------------------------------------------------------------------------

    Window_ConnectorEffectSelector.prototype.gaugeX = function() {
        return 35;
    };

    Window_ConnectorEffectSelector.prototype.gaugeY = function() {
        return 30;
    };

    Window_ConnectorEffectSelector.prototype.gaugeWidth = function() {
        return 110;
    };

    //--------------------------------------------------------------------------
    // Drawing
    //--------------------------------------------------------------------------

    //--------------------------------------------------------------------------
    // Selection marker
    //--------------------------------------------------------------------------

    Window_ConnectorEffectSelector.prototype.createSelectionArrow = function() {
        this._selectionArrow = new Sprite(
            ImageManager.loadSystem("selection_indicator32")
        );
        this._selectionArrow.anchor.x = 0.5;
        this._selectionArrow.anchor.y = 0.5;
        this._selectionArrow.scale.x = 0.8;
        this._selectionArrow.scale.y = 0.8;
        this._selectionArrow.visible = false;
        var scene = SceneManager._scene;
        if (scene && scene._previewWindow) {
            scene._previewWindow.parent.addChild(this._selectionArrow);
        }
        //this.addChild(this._selectionArrow);
    };

    //--------------------------------------------------------------------------
    // Align selection marker with track
    //--------------------------------------------------------------------------

    Window_ConnectorEffectSelector.prototype.updateTrackPosition = function(track) {
        var hostWindow = track.hostWindow;
        if (!hostWindow || !hostWindow.visible) return;
        var x =
            hostWindow.x +
            hostWindow.padding +
            track.x -
            this.gaugeX();
        var y =
            hostWindow.y +
            hostWindow.padding +
            track.y -
            this.gaugeY();
        this.move(x, y, this.windowWidth(), this.windowHeight());
    };

    //=========================================================================
    // Window_Base
    //=========================================================================

    //--------------------------------------------------------------------------
    // Connector effect display value
    //--------------------------------------------------------------------------

    Window_Base.prototype.connectorEffectDisplayValue = function(effect) {
        var scene = SceneManager._scene;
        if (
            scene instanceof Scene_Battle &&
            scene.connectorEffectSelectionValue
        ) {
            return scene.connectorEffectSelectionValue(effect);
        }
        return effect.value;
    };

    //--------------------------------------------------------------------------
    // Draw selectable connector effect track
    //--------------------------------------------------------------------------

    Window_Base.prototype.drawConnectorEffectTrack = function(effect, x, y, width) {
        var min = Number(effect.minChange);
        var max = Number(effect.maxChange);
        if (!isFinite(min) || !isFinite(max) || max <= min) return;
        var height = 10;
        this.contents.fillRect(x, y, width, height, this.gaugeBackColor());
        this.contents.fontSize = 16;
        this.changeTextColor(this.textColor(18));
        this.drawText(String(min), x - 4, y + 2, 35, "left");
        this.changeTextColor(this.textColor(24));
        this.drawText(String(max), x + width - 31, y + 2, 35, "right");
        this.resetFontSettings();
        var scene = SceneManager._scene;
        if (
            scene instanceof Scene_Battle &&
            scene.registerConnectorEffectTrack
        ) {
            scene.registerConnectorEffectTrack(effect, this, x, y, width);
        }
    };

    //=========================================================================
    // Window_Preview
    //=========================================================================

    //--------------------------------------------------------------------------
    // Draw connector effect helpers
    //--------------------------------------------------------------------------

    var CES_WP_drawConnectorEffects = Window_Preview.prototype.drawConnectorEffects;
    Window_Preview.prototype.drawConnectorEffects = function(y) {
        var scene = SceneManager._scene;
        if (scene instanceof Scene_Battle && scene.clearConnectorEffectTracks) {
            scene.clearConnectorEffectTracks(this);
        }
        CES_WP_drawConnectorEffects.call(this, y);
    };

    var CES_WP_drawConnectorEffect = Window_Preview.prototype.drawConnectorEffect;
    Window_Preview.prototype.drawConnectorEffect = function(effect, x, y) {
        CES_WP_drawConnectorEffect.call(this, effect, x, y);
        var trackY = y + this.lineHeight() - 24;
        if (effect.selectable) {
            this.drawConnectorEffectTrack(effect, x + 76, trackY, 110);
        }
    };

    //=========================================================================
    // Window_ITBTargetConnectors
    //=========================================================================

    //--------------------------------------------------------------------------
    // Supply effect
    //--------------------------------------------------------------------------

    Window_ITBTargetConnectors.prototype.setConnectorEffectPreview = function(effect) {
        this._connectorEffectPreview = effect || null;
        this.refresh();
    };

    //--------------------------------------------------------------------------
    // Reserve space for another row
    //--------------------------------------------------------------------------

    var CES_WITBTC_resizeForConnectorCount = Window_ITBTargetConnectors.prototype.resizeForConnectorCount;
    Window_ITBTargetConnectors.prototype.resizeForConnectorCount = function() {
        CES_WITBTC_resizeForConnectorCount.call(this);
        if (this._connectorEffectPreview) {
            this.height += 32;
            this.createContents();
        }
    };

    //--------------------------------------------------------------------------
    // Target-specific drawing functions
    //--------------------------------------------------------------------------
    
    var CES_WITBTC_drawTargetConnectors = Window_ITBTargetConnectors.prototype.drawTargetConnectors;
    Window_ITBTargetConnectors.prototype.drawTargetConnectors = function(x, y) {
        var scene = SceneManager._scene;
        if (scene instanceof Scene_Battle && scene.clearConnectorEffectTracks) {
            scene.clearConnectorEffectTracks(this);
        }
        var effect = this._connectorEffectPreview;
        if (effect && effect.selectable) {
            this.drawConnectorEffect(effect, x, y);
            this.drawConnectorEffectTrack(effect, x + 104, y + this.lineHeight() - 24, 110);
            y += 32;
        }
        CES_WITBTC_drawTargetConnectors.call(this, x, y);
    };

    //--------------------------------------------------------------------------
    // Add reusable effect renderer
    //--------------------------------------------------------------------------

    Window_ITBTargetConnectors.prototype.drawConnectorEffect = function(effect, x, y) {
        var definition = DataManager.getConnectorDefinition(effect.connector);
        if (!definition) return;
        var iconSize = 28;
        var spacing = 8;
        var image = BattleManager.ITB_UI.getDisciplineImage(definition.discipline);
        this.drawSystemImage(image, x, y + 2, iconSize);
        var value = Number(this.connectorEffectDisplayValue(effect));
        var text = (value > 0 ? "+" : "") + String(value);
        this.contents.fontSize = 20;
        this.changeTextColor(
            value > 0 ? this.textColor(24) :
            value < 0 ? this.textColor(18) :
            this.normalColor()
        );
        this.drawText(text, x + iconSize + spacing, y, 60, "left");
        this.resetFontSettings();
    };

})();