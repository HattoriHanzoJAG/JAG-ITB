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

    Window_ITBTargetConnectors.prototype.initialize = function() {
        console.log("TARGET CONNECTOR WINDOW: INITIALIZE");
        this._target = null;
        this._connectorEntries = [];
        Window_Base.prototype.initialize.call(
            this,
            0,
            0,
            this.windowWidth(),
            this.windowHeight()
        );
        this.createConnectorRows();
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

    //========================================================================= 
    // Dimensions 
    //=========================================================================

    Window_ITBTargetConnectors.prototype.targetConnectorIconSize = function() { 
        return 24;
    }; 
    
    Window_ITBTargetConnectors.prototype.targetConnectorSpacing = function() { 
        return 44; 
    };

    Window_ITBTargetConnectors.prototype.targetConnectorTextWidth = function() { 
        var width = 0;
        var oldFontSize = this.contents.fontSize;
        this.contents.fontSize = 22;
        this._connectorEntries.forEach(function(entry) {
            var text = String(entry.value);
            width = Math.max(width, this.textWidth(text));
        }, this);
        this.contents.fontSize = oldFontSize;
        // Small breathing room after the number.
        return width + 4;
    };
    
    Window_ITBTargetConnectors.prototype.windowWidth = function() {
        var spacing = this.connectorSpacing();
        var iconSize = this.targetConnectorIconSize();
        var textWidth = this.connectorTextWidth();
        var itemWidth = iconSize + textWidth + 2;
        return itemWidth * 3 + spacing * 2 + this.standardPadding() * 2;
    };

    Window_ITBTargetConnectors.prototype.windowHeight = function() {
        var iconSize = this.targetConnectorIconSize();
        return (iconSize * 2 + this.standardPadding() * 2 + 4);
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
        if (!this._target) return;
        console.log(
            "TARGET CONNECTOR WINDOW: CLEAR TARGET"
        );
        this._target = null;
        this.contents.clear();
        this.hide();
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
        var spacing = this.connectorSpacing(); 
        var itemWidth = iconSize + 2 + textWidth; 
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

    Window_ITBTargetConnectors.prototype.createConnectorRows = function() {
        this._connectorRows = [];
        var disciplines = DataManager.getDisciplines();
        for (var i = 0; i < disciplines.length; i++) {
            var row = {};
            row.discipline = disciplines[i];
            row.strict = new Sprite(ImageManager.loadSystem("strict-indicator2-24"));
            row.strict.visible = false;
            this.addChild(row.strict);
            this._connectorRows.push(row);
        }
    };

    Window_ITBTargetConnectors.prototype.createSelectionArrow = function() {
        this._selectionArrow = new Sprite(ImageManager.loadSystem("selection_indicator16"));
        this._selectionArrow.anchor.x = 0.5;
        this._selectionArrow.anchor.y = 0.5;
        this._selectionArrow.visible = false;
        var scene = SceneManager._scene;
        if (scene) scene.addChild(this._selectionArrow);
    };

    Window_ITBTargetConnectors.prototype.drawTargetConnectors = function(x, y) {
        var iconSize = this.targetConnectorIconSize();
        var spacing = this.connectorSpacing() / 2;
        var textWidth = this.targetConnectorTextWidth(); 
        var itemWidth = iconSize + 2 + textWidth;
        this.contents.fontSize = 22;
        this._connectorEntries.forEach(function(entry, i) {
            var col = i % 3;
            var row = Math.floor(i / 3);
            var drawX = x + col * (itemWidth + spacing) + spacing;
            var drawY = y + row * (iconSize + 2) + 2;
            var icon = BattleManager.ITB_UI.getDisciplineImage(entry.name);
            this.drawSystemImage(icon, drawX, drawY, iconSize);
            this.drawText(entry.value, drawX + iconSize + 4, drawY - 6, textWidth, "left");
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
        var x = sprite.x;
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
        this.y = y;
    };

    //=========================================================================
    // Scene_Battle
    //=========================================================================

    Scene_Battle.prototype.createITBTargetConnectorWindow = function() {
        console.log("TARGET CONNECTOR WINDOW: CREATE");
        this._itbTargetConnectorWindow = new Window_ITBTargetConnectors();
        if (this._itbActionWindow) {
            var parent = this._itbActionWindow.parent;
            parent.addChild(this._itbTargetConnectorWindow);
            parent.setChildIndex(
                this._itbTargetConnectorWindow,
                parent.getChildIndex(this._itbActionWindow)
            );
        } else {
            this.addChild(this._itbTargetConnectorWindow);
        }
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
        window.updateTarget(target);
        if (window.visible) window.updatePosition();
    };

})();