//=============================================================================
// JAG_ITB_Command_UI.js
//=============================================================================
/*:
 * @name JAG_ITB_Command_UI
 * @plugindesc Icon-based UI for ITB and Action Connector Systems
 * @author JAG
 *
 */
(function() {

    BattleManager.ITB_UI = BattleManager.ITB_UI || {};

    //--------------------------------------------------------------------------
    // Set Mode
    //--------------------------------------------------------------------------

    BattleManager.ITB_UI.setActionMode = function(mode) {
        this._actionMode = mode;
    };

    BattleManager.ITB_UI.setUIMode = function(mode) {
        this._uiMode = mode;
    };

    //--------------------------------------------------------------------------
    // Selected actor
    //--------------------------------------------------------------------------

    BattleManager.ITB_UI.getSelectedActor = function() {
        return {
            actorId: BattleManager.actor(),
            battler: BattleManager.actor(),
            isActive: BattleManager._actorIndex >= 0
        };
    };

    //--------------------------------------------------------------------------
    // Main commands
    //--------------------------------------------------------------------------

    /* return [
        { id: "skill", icon: 0 },
        { id: "item", icon: 0 },
        { id: "undo", icon: 0 },
        { id: "finish", icon: 0 },
        { id: "escape", icon: 0 }
    ]; */

    BattleManager.ITB_UI.getMainCommands = function() {
        return [
            { id: "skill", iconindex: 76 },
            { id: "item", iconindex: 176 },
            { id: "undo", iconindex: 82 },
            { id: "finish", iconindex: 87 }
        ];
    };

    //--------------------------------------------------------------------------
    // Discipline rows
    //--------------------------------------------------------------------------

    BattleManager.ITB_UI.getDisciplineRows = function(actor, target) {
        if (!actor) return [];
        const result = {};
        const discipline = skill.meta.discipline || "combat";
        if (!result[discipline]) {result[discipline] = []};
        actor.skills().forEach(skill => {
            const data = {
                id: skill.id,
                type: "skill",
                name: skill.name,
                iconIndex: skill.iconIndex,
                discipline: discipline,
                enabled: actor.canUse(skill),
                selectable: actor.canUse(skill),
                isBasic: skill.name === "Attack" || skill.name === "Guard"
            };
            const d = data.discipline;
            if (result[d]) result[d].push(data);
        });
        return Object.keys(result).map(key => ({
            discipline: key,
            skills: result[key]
        }));
    };

    BattleManager.ITB_UI.setSelectedRow = function(row) {
        this._selectedRow = row;
    };

    //--------------------------------------------------------------------------
    // Vertical navigation
    //--------------------------------------------------------------------------

    BattleManager.ITB_UI.setSelectedColumn = function(column) {
        this._selectedRow = column;
    };

    //--------------------------------------------------------------------------
    // Action selection state
    //--------------------------------------------------------------------------

    BattleManager.ITB_UI.getSelectedAction = function() {
        return this._selectedAction;
    };

    BattleManager.ITB_UI.setSelectedAction = function(action) {
        this._selectedAction = action;
    };

    //--------------------------------------------------------------------------
    // Preview hook
    //--------------------------------------------------------------------------

    BattleManager.ITB_UI.getActionPreview = function() {
        return null;
    };

    //--------------------------------------------------------------------------
    // Target
    //--------------------------------------------------------------------------

    BattleManager.ITB_UI.getCurrentTarget = function() {
        return BattleManager._targets ? BattleManager._targets[0] : null;
    };

    //--------------------------------------------------------------------------
    // Selectability
    //--------------------------------------------------------------------------

    BattleManager.ITB_UI.isActionSelectable = function(actor, skill, target) {
        return actor && actor.canUse(skill);
    };

    //--------------------------------------------------------------------------
    // Visibility
    //--------------------------------------------------------------------------

    BattleManager.ITB_UI.getVisibleActions = function(actor, target) {
        return this.getDisciplineRows(actor, target);
    };

    //--------------------------------------------------------------------------
    // Initialization
    //--------------------------------------------------------------------------

    var ITB_Command_WAC_setup = Window_ActorCommand.prototype.setup;
    Window_ActorCommand.prototype.setup = function(actor) {
        console.log("Actor Command Setup", actor);
        ITB_Command_WAC_setup.call(this, actor);
        if (actor) this.initializeITBActionPanel();
    };

    Window_ActorCommand.prototype.initializeITBActionPanel = function() {
        console.log("ITB Action Panel Initialize");
        //this.clearITBActionPanel();
        //this._mainCommands = [];
        //this._disciplineRows = [];
        this._actionSprites = [];
        //this.createITBActionSprites();
        this.opacity = 0;
        this.contentsOpacity = 0;
        this.refreshITBActionPanel();
    };

    //--------------------------------------------------------------------------
    // UI refresh cycle
    //--------------------------------------------------------------------------

    //Window_ActorCommand.prototype.drawItem = function(index) {
    //};

    /* var ITB_Command_WAC_update = Window_ActorCommand.prototype.update;
    Window_ActorCommand.prototype.update = function() {
        ITB_Command_WAC_update.call(this);
        if (this.needRefreshITBPanel()) this.refreshITBActionPanel();
        this.updateITBActionPanel();
    }; */

    Window_ActorCommand.prototype.refreshITBActionPanel = function() {
        this.clearITBActionSprites();
        var actor = BattleManager.actor();
        if (!actor) return;
        var target = BattleManager.ITB_UI.getCurrentTarget();
        var commands = BattleManager.ITB_UI.getMainCommands();
        var rows = BattleManager.ITB_UI.getDisciplineRows(actor, target);
        this.drawMainIcons(commands);
        this.drawDisciplineRows(rows);
    };

    //--------------------------------------------------------------------------
    // Action rendering (testing only)
    //--------------------------------------------------------------------------

    /* Window_ActorCommand.prototype.createITBActionSprites = function() {
        console.log("Create Action Sprites");
        for (var i = 0; i < 10; i++) {
            var sprite = this.createIconSprite(64 + i);
            sprite.x = i * 33;
            sprite.y = 0;
            this.addChild(sprite);
            this._actionSprites.push(sprite);
        }
        //var sprite = new Sprite(ImageManager.loadSystem("IconSet"));
        //sprite.setFrame(0, 0, Window_Base._iconWidth, Window_Base._iconHeight);
        //sprite.x = 0;
        //sprite.y = 0;
        //this.addChild(sprite);
        //this._actionSprites.push(sprite);
    }; */

    //--------------------------------------------------------------------------
    // Draw main command icons
    //--------------------------------------------------------------------------

    Window_ActorCommand.prototype.drawMainIcons = function(commands) {
        var startX = 0;
        var startY = 0;
        var spacingX = 36;
        var spacingY = 36;
        commands.forEach(function(command, index) {
            var col = index % 2;
            var row = Math.floor(index / 2);
            var sprite = this.createIconSprite(command.iconIndex);
            sprite.x = startX + col * spacingX;
            sprite.y = startY + row * spacingY;
            this.addChild(sprite);
            this._actionSprites.push(sprite);
        }, this);
    };

    //--------------------------------------------------------------------------
    // Draw discipline rows
    //--------------------------------------------------------------------------

    Window_ActorCommand.prototype.drawDisciplineRows = function(rows) {
        var startX = 90;
        var startY = 0;
        var spacingX = 36;
        var spacingY = 36;
        rows.forEach(function(rowData, rowIndex) {
            rowData.skills.forEach(function(skillData, skillIndex) {
                var sprite = this.createIconSprite(skillData.iconIndex);
                sprite.x = startX + skillIndex * spacingX;
                sprite.y = startY + rowIndex * spacingY;
                this.addChild(sprite);
                this._actionSprites.push(sprite);
            }, this);
        }, this);
    };

    //--------------------------------------------------------------------------
    // Add icon helper
    //--------------------------------------------------------------------------

    Window_ActorCommand.prototype.createIconSprite = function(iconIndex) {
        var sprite = new Sprite(ImageManager.loadSystem("IconSet"));
        sprite.bitmap.addLoadListener(function() {
            var pw = Window_Base._iconWidth;
            var ph = Window_Base._iconHeight;
            var sx = iconIndex % 16 * pw;
            var sy = Math.floor(iconIndex / 16) * ph;
            sprite.setFrame(sx, sy, pw, ph);
        });
        return sprite;
    };

    //--------------------------------------------------------------------------
    // Clear old icons helper
    //--------------------------------------------------------------------------

    Window_ActorCommand.prototype.clearITBActionSprites = function() {
        if (!this._actionSprites) {
            this._actionSprites = [];
            return;
        }
        this._actionSprites.forEach(function(sprite) {
            if (sprite && sprite.parent) sprite.parent.removeChild(sprite);
        });
        this._actionSprites = [];
    };

})();