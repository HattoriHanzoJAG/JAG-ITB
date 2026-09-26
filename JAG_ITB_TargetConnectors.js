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
        Window_Base.prototype.initialize.call(
            this,
            0,
            0,
            this.windowWidth(),
            this.windowHeight()
        );
        this.openness = 0;
        this.hide();
        //this.openness = 255;
        //this.show();
        //this.contents.fontSize = 20;
        /* this.drawText(
            "TARGET CONNECTORS TEST",
            10,
            10,
            280,
            "left"
        ); */
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

    Window_ITBTargetConnectors.prototype.windowWidth = function() {
        var spacing = this.connectorSpacing();
        var iconSize = this.connectorIconSize();
        var textWidth = this.connectorTextWidth();
        return spacing * 3 + iconSize + textWidth + 16;
    };

    Window_ITBTargetConnectors.prototype.windowHeight = function() {
        var iconSize = this.connectorIconSize();
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

    //=========================================================================
    // Refresh
    //=========================================================================

    Window_ITBTargetConnectors.prototype.refresh = function() {
        this.contents.clear();
        if (!this._target) return;
        var oldFontSize = this.contents.fontSize;
        this.contents.fontSize = 22;
        this.drawTargetConnectors(this._target, 0, 0);
        this.contents.fontSize = oldFontSize;
    };

    //=========================================================================
    // Target-specific drawing function
    //=========================================================================

    Window_ITBTargetConnectors.prototype.drawTargetConnectors = function(target, x, y) {
        var names = DataManager.getDisciplines();
        var iconSize = this.connectorIconSize();
        var spacing = this.connectorSpacing();
        this.contents.fontSize = 22;
        names.forEach(function(name, i) {
            var col = i % 3;
            var row = Math.floor(i / 3);
            var drawX = x + col * spacing;
            var drawY = y + row * iconSize + 2;
            var icon = BattleManager.ITB_UI.getDisciplineImage(name);
            this.drawSystemImage(icon, drawX, drawY, iconSize);
            var value = target.connector(name);
            this.drawText(
                value === undefined ? "-" : value,
                drawX + iconSize + 2,
                drawY - 10,
                this.connectorTextWidth(),
                "left"
            );
        }, this);
        this.resetFontSettings();
    };

    //=========================================================================
    // Position
    //=========================================================================

    Window_ITBTargetConnectors.prototype.updatePosition = function() {
        if (!this._target) return;
        var x = this._target.screenX();
        var y = this._target.screenY();
        // Center the window over the target.
        x -= Math.floor(this.width / 2);
        // Place the connector window above the target.
        y -= this.height + 48;
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
        this.addChild(this._itbTargetConnectorWindow);
        console.log(
            "TARGET CONNECTOR WINDOW:",
            this._itbTargetConnectorWindow
        );
    };

    var JAG_TC_SceneBattle_createAllWindows = Scene_Battle.prototype.createAllWindows;
    Scene_Battle.prototype.createAllWindows = function() {
        JAG_TC_SceneBattle_createAllWindows.call(this);
        this.createITBTargetConnectorWindow();
    };

    /* var JAG_TC_SceneBattle_createDisplayObjects = Scene_Battle.prototype.createDisplayObjects;
    Scene_Battle.prototype.createDisplayObjects = function() {
        JAG_TC_SceneBattle_createDisplayObjects.call(this);
        this.createITBTargetConnectorWindow();
    }; */

    var JAG_TC_SceneBattle_update = Scene_Battle.prototype.update;
    Scene_Battle.prototype.update = function() {
        JAG_TC_SceneBattle_update.call(this);
        var window = this._itbTargetConnectorWindow;
        if (!window) return;
        var target = BattleManager.ITB_UI._targetBrowseTarget;
        window.updateTarget(target);
        if (window.visible) window.updatePosition();
    };

})();