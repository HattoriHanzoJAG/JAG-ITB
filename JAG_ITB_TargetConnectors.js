//=============================================================================
// JAG_ITB_TargetConnectors.js
//=============================================================================
/*:
 * @name JAG_ITB_TargetConnectors
 * @plugindesc Displays connector values above the currently browsed ITB target.
 * @author JAG
 *
 * @help
 * Displays the connector values of the target currently being browsed during
 * ITB target selection.
 *
 * The connector window:
 *   - follows the currently browsed target;
 *   - updates when the target changes;
 *   - remains visible after the target is selected;
 *   - disappears when target browsing is cleared.
 *
 * Requires:
 *   JAG_ITB_Action_Connectors
 *   JAG_ITB_Command_UI
 *
 * Load this plugin AFTER JAG_ITB_Command_UI.js.
 */
//=============================================================================

(function() {

    "use strict";

    //=========================================================================
    // Window_ITBTargetConnectors
    //=========================================================================

    function Window_ITBTargetConnectors() {
        this.initialize.apply(this, arguments);
    }

    Window_ITBTargetConnectors.prototype = Object.create(Window_Base.prototype);
    Window_ITBTargetConnectors.prototype.constructor = Window_ITBTargetConnectors;
    window.Window_ITBTargetConnectors = Window_ITBTargetConnectors;

    Window_ITBTargetConnectors.prototype.initialize = function() {
        console.log("TARGET CONNECTOR WINDOW: INITIALIZE");
        this._target = null;
        this._connectorEntries = [];
        this._selectionArrow = null;
        this._selectionArrowTarget = null;
        this._selectionArrowScene = null;
        Window_Base.prototype.initialize.call(
            this,
            0,
            0,
            this.windowWidth(),
            this.windowHeight()
        );
        this.createSelectionArrow();
        // Invisible window frame/background. 
        this.opacity = 0; 
        this.backOpacity = 0; 
        // Keep the contents fully visible. 
        this.contentsOpacity = 255;
        this.openness = 0;
        this.hide();
        //this.openness = 255;
        //this.show();
        //this.contents.fontSize = 20;
        console.log(
            "TARGET CONNECTOR WINDOW CREATED:",
            this.width,
            this.height
        );
    };

    //========================================================================= 
    // Update 
    //========================================================================= 

    /* Window_ITBTargetConnectors.prototype.update = function() { 
        Window_Base.prototype.update.call(this); 
        var target = BattleManager.ITB_UI._targetBrowseTarget; 
        this.updateTarget(target); 
        if (this._target) this.updatePosition();
    }; */

    Window_ITBTargetConnectors.prototype.updateSelectionArrow = function(target) {
        if (!this._selectionArrow) return;
        var scene = SceneManager._scene;
        if (!scene) {
            this._selectionArrow.visible = false;
            return;
        }
        // Ensure the arrow belongs to the current scene.
        if (this._selectionArrowScene !== scene || this._selectionArrow.parent !== scene) {
            if (this._selectionArrow.parent) {
                this._selectionArrow.parent.removeChild(this._selectionArrow);
            }
            scene.addChild(this._selectionArrow);
            this._selectionArrowScene = scene;
        }
        if (!target) {
            this._selectionArrow.visible = false;
            this._selectionArrowTarget = null;
            return;
        }
        var previousTarget = this._target;
        this._target = target;
        var sprite = this.targetSprite();
        this._target = previousTarget;
        if (!sprite) {
            this._selectionArrow.visible = false;
            return;
        }
        this._selectionArrowTarget = target;
        this._selectionArrow.x = sprite.x;
        this._selectionArrow.y = sprite.y - sprite.height - 12;
        this._selectionArrow.visible = true;
    };

    //========================================================================= 
    // Dimensions 
    //=========================================================================

    Window_ITBTargetConnectors.prototype.targetConnectorIconSize = function() { 
        return 24;
    }; 
    
    Window_ITBTargetConnectors.prototype.targetConnectorSpacing = function() { 
        return 2; 
    };

    Window_ITBTargetConnectors.prototype.targetConnectorTextWidth = function() { 
        var width = 0;
        // windowWidth() is called before contents exists during initialization.
        if (!this._windowContentsSprite || !this._windowContentsSprite.bitmap) {
            return 12;
        }
        var oldFontSize = this.contents.fontSize;
        this.contents.fontSize = 22;
        this._connectorEntries.forEach(function(entry) {
            width = Math.max(width, this.textWidth(String(entry.value)));
        }, this);
        this.contents.fontSize = oldFontSize;
        // Small breathing room after the number.
        return width + 12;
    };
    
    Window_ITBTargetConnectors.prototype.windowWidth = function() {
        var spacing = this.targetConnectorSpacing();
        var iconSize = this.targetConnectorIconSize();
        var textWidth = this.targetConnectorTextWidth();
        var itemWidth = iconSize * 2 + textWidth;
        return itemWidth * 3 + spacing * 2 + this.standardPadding() * 2;
    };

    Window_ITBTargetConnectors.prototype.windowHeight = function() {
        var iconSize = this.targetConnectorIconSize();
        return (iconSize * 2 + this.standardPadding() * 2 + 4);
    };

    //=========================================================================
    // Selection Arrow
    //=========================================================================

    Window_ITBTargetConnectors.prototype.createSelectionArrow = function() {
        this._selectionArrow = new Sprite(ImageManager.loadSystem("selection_indicator32"));
        this._selectionArrow.anchor.x = 0.5;
        this._selectionArrow.anchor.y = 0.5;
        this._selectionArrow.visible = false;
        //var scene = SceneManager._scene;
        //if (scene) scene.addChild(this._selectionArrow);
    };

    //=========================================================================
    // Target
    //=========================================================================

    Window_ITBTargetConnectors.prototype.updateTarget = function(target) { 
        if (this._target === target) return; 
        if (!target) { 
            this.clearTarget(); 
            return; 
        } 
        this._target = target; 
        console.log( "TARGET CONNECTOR WINDOW: TARGET", 
            target.name(), 
            target.index() 
        ); 
        this.refresh(); 
        this.updatePosition(); 
        this.openness = 255;
        this.show(); 
    };

    Window_ITBTargetConnectors.prototype.clearTarget = function() {
        console.log("TARGET CONNECTOR WINDOW: CLEAR TARGET");
        if (this._target) {
            this._target = null;
            this.contents.clear();
            this.hide();
        }
        if (this._selectionArrow) {
            this._selectionArrow.visible = false;
            this._selectionArrowTarget = null;
        }
    };

    Window_ITBTargetConnectors.prototype.targetSprite = function() {
        if (!this._target) return null;
        var scene = SceneManager._scene;
        if (!scene || !scene._spriteset) return null;
        var spriteset = scene._spriteset;
        var sprites = [];
        if (spriteset._enemySprites) {
            sprites = sprites.concat(spriteset._enemySprites);
        }
        if (spriteset._actorSprites) {
            sprites = sprites.concat(spriteset._actorSprites);
        }
        for (var i = 0; i < sprites.length; i++) {
            var sprite = sprites[i];
            if (!sprite) continue;
            if (sprite._battler === this._target) return sprite;
        }
        return null;
    };

    //=========================================================================
    // Refresh
    //=========================================================================

    Window_ITBTargetConnectors.prototype.refresh = function() {
        this.contents.clear();
        this._connectorEntries = [];
        if (!this._target) return;
        var names = DataManager.getDisciplines(); 
        for (var i = 0; i < names.length; i++) { 
            var name = names[i]; 
            var value = this._target.connector(name); 
            // Do not display missing connectors. 
            if (value === undefined || value === null) continue; 
            this._connectorEntries.push({ 
                name: name, 
                value: value 
            }); 
        } 
        if (this._connectorEntries.length === 0) { 
            this.hide(); 
            return; 
        } 
        this.resizeForConnectorCount(); 
        this.createContents(); 
        this.drawTargetConnectors(0, 0);
    };

    Window_ITBTargetConnectors.prototype.resizeForConnectorCount = function() { 
        var iconSize = this.targetConnectorIconSize(); 
        var textWidth = this.targetConnectorTextWidth(); 
        var spacing = this.targetConnectorSpacing(); 
        var itemWidth = iconSize * 2 + textWidth; 
        var count = this._connectorEntries.length; 
        var columns = Math.min(3, count); 
        var rows = count <= 3 ? 1 : 2; 
        var width = columns * itemWidth + (columns - 1) * spacing + this.standardPadding() * 2; 
        var height = rows * iconSize + this.standardPadding() * 2 + 4; 
        if ( width === this.width && height === this.height ) return; 
        this.width = width; 
        this.height = height; 
        this.createContents(); 
    };

    //=========================================================================
    // Target-specific drawing functions
    //=========================================================================

    Window_ITBTargetConnectors.prototype.drawTargetConnectors = function(x, y) {
        var iconSize = this.targetConnectorIconSize();
        var spacing = this.targetConnectorSpacing();
        var textWidth = this.targetConnectorTextWidth(); 
        var itemWidth = iconSize * 2 + textWidth;
        this.contents.fontSize = 22;
        this._connectorEntries.forEach(function(entry, i) {
            var col = i % 3;
            var row = Math.floor(i / 3);
            var drawX = x + col * (itemWidth + spacing) + spacing;
            var drawY = y + row * (iconSize + 2) + 2;
            // Display the strict indicator only when required by this target.
            if (this._target.connectorRule(entry.name) === "strict") {
                this.drawSystemImage("strict-indicator2-24", drawX, drawY, iconSize);
            }
            var icon = BattleManager.ITB_UI.getDisciplineImage(entry.name);
            this.drawSystemImage(icon, drawX + iconSize, drawY, iconSize);
            this.drawText(entry.value, drawX + iconSize * 2 + 4, drawY - 6, textWidth, "left");
        }, this);
        this.resetFontSettings();
    };

    //=========================================================================
    // Position
    //=========================================================================

    Window_ITBTargetConnectors.prototype.updatePosition = function() {
        if (!this._target) return;
        //var x = this._target.screenX();
        //var y = this._target.screenY();
        var sprite = this.targetSprite();
        if (!sprite) return;
        // Keep the connector window horizontally centered above the target.
        this.x = sprite.x - this.width / 2;
        // Position the connector window immediately above the selection arrow.
        var arrowY = sprite.y - sprite.height - 12;
        this.y = arrowY - this.height;
        // Keep the window within the screen boundaries.
        this.x = Math.max(0, Math.min(this.x, Graphics.boxWidth - this.width));
        this.y = Math.max(0, Math.min(this.y, Graphics.boxHeight - this.height));
        /* var x = sprite.x;
        var y = sprite.y;
        // Center the window over the target.
        x -= Math.floor(this.width / 2);
        // Place the connector window above the target.
        y -= this.height + 200;
        // Keep the window inside the screen horizontally.
        x = Math.max(0, Math.min(x, Graphics.boxWidth - this.width));
        // Keep the window inside the screen vertically.
        y = Math.max(0, y);
        this.x = x;
        this.y = y; */
    };

    //=========================================================================
    // Scene_Battle
    //=========================================================================

    Scene_Battle.prototype.createITBTargetConnectorWindow = function() {
        console.log("TARGET CONNECTOR WINDOW: CREATE");
        this._itbTargetConnectorWindow = new Window_ITBTargetConnectors();
        var parent = this._previewWindow.parent;
        var previewIndex = parent.getChildIndex(this._previewWindow);
        // Add the target connector window immediately behind the preview.
        parent.addChild(this._itbTargetConnectorWindow);
        parent.setChildIndex(this._itbTargetConnectorWindow, previewIndex);
        // Add the target selection arrow immediately above the target
        // connector window, but still behind the preview.
        parent.addChild(this._itbTargetConnectorWindow._selectionArrow);
        parent.setChildIndex(
            this._itbTargetConnectorWindow._selectionArrow,
            parent.getChildIndex(this._previewWindow)
        );
        /* if (this._itbActionWindow) {
            var parent = this._itbActionWindow.parent;
            parent.addChild(this._itbTargetConnectorWindow);
            parent.setChildIndex(
                this._itbTargetConnectorWindow,
                parent.getChildIndex(this._itbActionWindow)
            );
        } else {
            this.addChild(this._itbTargetConnectorWindow);
        } */
        console.log(
            "TARGET CONNECTOR WINDOW:",
            this._itbTargetConnectorWindow
        );
    };

    /* var JAG_TC_SceneBattle_createAllWindows = Scene_Battle.prototype.createAllWindows;
    Scene_Battle.prototype.createAllWindows = function() {
        JAG_TC_SceneBattle_createAllWindows.call(this);
        this.createITBTargetConnectorWindow();
    }; */

    var JAG_TC_SceneBattle_createDisplayObjects = Scene_Battle.prototype.createDisplayObjects;
    Scene_Battle.prototype.createDisplayObjects = function() {
        JAG_TC_SceneBattle_createDisplayObjects.call(this);
        this.createITBTargetConnectorWindow();
    };

    var JAG_TC_SceneBattle_update = Scene_Battle.prototype.update;
    Scene_Battle.prototype.update = function() {
        JAG_TC_SceneBattle_update.call(this);
        var window = this._itbTargetConnectorWindow;
        if (!window) return;
        var target = BattleManager.ITB_UI._targetBrowseTarget;
        var actor = BattleManager.actor(); 
        if (actor && actor._connectorPreviewTarget) target = actor._connectorPreviewTarget;
        // Update the target information as usual.
        window.updateTarget(target);
        /* // During action execution, check the acting actor's queue first.
        if (actor && actor.queueLength && actor.queueLength() > 0) {
            // Hide the connector information while queued actions remain.
            window.hide();
        } else if (target && window._target === target && window._connectorEntries.length > 0) {
            // The queue is empty again; restore the information for this target.
            window.show();
            window.open();
        } */
        if (target && window._target === target && window._connectorEntries.length > 0) {
            window.show();
            window.open();
        } else {
            window.hide();
        }
        if (window.visible) window.updatePosition();
        // Keep the selection arrow independent of the information window.
        window.updateSelectionArrow(target);
    };

})();