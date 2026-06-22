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
            actorId: BattleManager.actor() ? BattleManager.actor().actorId() : 0,
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
            { id: "skill", iconIndex: 191 },
            { id: "item", iconIndex: 176 },
            { id: "undo", iconIndex: 75 },
            { id: "finish", iconIndex: 87 }
        ];
    };

    //--------------------------------------------------------------------------
    // Discipline rows
    //--------------------------------------------------------------------------

    BattleManager.ITB_UI.getDisciplineRows = function(actor, target) {
        if (!actor) return [];
        var result = {};
        actor.skills().forEach(skill => {
            var discipline = ($dataSystem.skillTypes[skill.stypeId] || "Combat").toLowerCase();
            if (!result[discipline]) {result[discipline] = []};
            result[discipline].push({
                id: skill.id,
                type: "skill",
                name: skill.name,
                iconIndex: skill.iconIndex,
                discipline: discipline,
                enabled: actor.canUse(skill),
                selectable: BattleManager.ITB_UI.isActionSelectable(actor, skill, target),
                isBasic: 
                    skill.name === TextManager.attack || 
                    skill.name === TextManager.guard
            });
            //if (result[discipline]) result[discipline].push(data);
        });
        return Object.keys(result).map(key => ({
            discipline: key,
            iconIndex: BattleManager.ITB_UI.getDisciplineIcon(key),
            skills: result[key]
        }));
    };

    BattleManager.ITB_UI.setSelectedRow = function(row) {
        this._selectedRow = row;
    };

    //--------------------------------------------------------------------------
    // Add discipline icon lookup
    //--------------------------------------------------------------------------

    BattleManager.ITB_UI.getDisciplineIcon = function(discipline) {
        var icons = {
            combat: 162,
            sorcery: 163,
            diplomacy: 165,
            manoeuvre: 164,
            deception: 161
        };
        return icons[discipline] || 0;
    };

    //--------------------------------------------------------------------------
    // Vertical navigation
    //--------------------------------------------------------------------------

    BattleManager.ITB_UI.setSelectedColumn = function(column) {
        this._selectedColumn = column;
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
        this.clearCommandList();
        if (actor) this.initializeITBActionPanel();
    };

    Window_ActorCommand.prototype.initializeITBActionPanel = function() {
        console.log("ITB Action Panel Initialize");
        //this._mainCommands = [];
        //this._disciplineRows = [];
        /* if (!this._itbInitialized) {
            this.initializeITBActionPanel();
            this._itbInitialized = true;
        } */
        this.clearITBActionSprites();
        if (!this._actionSprites) this._actionSprites = [];
        this._selection = {
            region: "commands",
            row: 0,
            column: 0
        };
        this._hoverSelection = null;
        this.requestITBRefresh();
        //this.opacity = 0;
        //this.contentsOpacity = 0;
    };

    //--------------------------------------------------------------------------
    // UI refresh cycle
    //--------------------------------------------------------------------------

    Window_ActorCommand.prototype.drawItem = function(index) {
        // Disable draw items in original window
    };

    Window_ActorCommand.prototype.makeCommandList = function(index) {
    };

    Window_ActorCommand.prototype.refresh = function() {
    };

    Window_ActorCommand.prototype.refreshITBActionPanel = function() {
        this.clearITBActionSprites();
        var actor = BattleManager.actor();
        if (!actor) return;
        var target = BattleManager.ITB_UI.getCurrentTarget();
        var commands = BattleManager.ITB_UI.getMainCommands();
        var rows = BattleManager.ITB_UI.getDisciplineRows(actor, target);
        this.drawMainCommands(commands);
        this.drawDisciplineRows(rows);
        //if (TouchInput.isTriggered()) 
        this.updateMouseSelection();
        this.refreshSelection();
    };

    Window_ActorCommand.prototype.needRefreshITBPanel = function() {
        return false;
    };

    Window_ActorCommand.prototype.requestITBRefresh = function() {
        console.log("Request refresh");
        this._needsRefresh = true;
    };

    Window_ActorCommand.prototype.refreshSelection = function() {
        this._actionSprites.forEach(function(sprite) {
            sprite.scale.x = 1;
            sprite.scale.y = 1;
        });
        var selected = this.currentSelectionSprite();
        console.log("SELECT", selected);
        if (!selected) return;
        selected.scale.x = 1.1;
        selected.scale.y = 1.1;
        console.log("Sprite scaled");
    };

    //--------------------------------------------------------------------------
    // UI update loop
    //--------------------------------------------------------------------------

    Window_ActorCommand.prototype.updateCursor = function() {
        // Disable cursor rectangle in original window
        //this.setCursorRect(0,0,0,0);
    };

    Window_ActorCommand.prototype._updateCursor = function() {
        // Disable cursor rectangle in original window
    };

    Window_ActorCommand.prototype.isCursorVisible = function() {
        // Disable cursor rectangle in original window
        //return false;
    };

    Window_ActorCommand.prototype.refreshCursor = function() {
        //Disable refesh cursor in original window
    };

    Window_ActorCommand.prototype.processTouch = function() {
        // Disable processing selection in original window
    };

    Window_ActorCommand.prototype.processOk = function() {
        // Disable processing selection in original window
    };

    var ITB_Command_WAC_update = Window_ActorCommand.prototype.update;
    Window_ActorCommand.prototype.update = function() {
        //console.log("Window Actor Command Update");
        //console.log(this._list);
        ITB_Command_WAC_update.call(this);
        //if (this._cursorSprite) console.log("Cursor sprite exists");
        //if (this.needRefreshITBPanel()) this.refreshITBActionPanel();
        this.updateITBActionPanel();
        this.updateSelectionInput();
        if (Input.isTriggered("ok")) this.processITBOk();
    };

    Window_ActorCommand.prototype.updateITBActionPanel = function() {
        this.updateActorTracking();
        if (this._needsRefresh) {
            this.refreshITBActionPanel();
            this._needsRefresh = false;
        }
    };

    Window_ActorCommand.prototype.updateActorTracking = function() {
        var actor = BattleManager.actor();
        var actorId = actor ? actor.actorId() : 0;
        if (this._trackedActorId !== actorId) {
            console.log("UPDATE ACTOR TRACKING");
            this._trackedActorId = actorId;
            this.requestITBRefresh();
        }
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

    Window_ActorCommand.prototype.drawMainCommands = function(commands) {
        var startX = 4;
        var startY = 4;
        var spacingX = 32;
        var spacingY = 32;
        commands.forEach(function(command, index) {
            var col = index % 2;
            var row = Math.floor(index / 2);
            var sprite = this.createIconSprite(command.iconIndex);
            //console.log("Command Index:", command.iconIndex);
            sprite.x = startX + col * spacingX;
            sprite.y = startY + row * spacingY;
            sprite._uiData = {
                region: "commands",
                row: row,
                column: col,
                command: command
            };
            /* sprite._itbType = "command";
            sprite._commandId = command.id;
            sprite._row = row;
            sprite._column = col; */
            this.addChild(sprite);
            this._actionSprites.push(sprite);
            //console.log("Sprite pushed:", sprite);
        }, this);
    };

    //--------------------------------------------------------------------------
    // Draw discipline rows
    //--------------------------------------------------------------------------

    Window_ActorCommand.prototype.drawDisciplineRows = function(rows) {
        var startX = 78;
        var startY = 4;
        var spacingX = 32;
        var spacingY = 32;
        rows.forEach(function(rowData, rowIndex) {
            var icon = this.createIconSprite(rowData.iconIndex);
            icon.x = startX;
            icon.y = startY + rowIndex * spacingY;
            this.addChild(icon);
            this._actionSprites.push(icon);
            rowData.skills.forEach(function(skillData, skillIndex) {
                var sprite = this.createIconSprite(skillData.iconIndex);
                sprite.x = startX + (skillIndex + 1) * spacingX + 2;
                sprite.y = startY + rowIndex * spacingY;
                sprite._uiData = {
                    region: "actions",
                    row: rowIndex,
                    column: skillIndex,
                    action: skillData
                };
                /* sprite._itbType = "action";
                sprite._skillId = skillData.id;
                sprite._row = rowIndex;
                sprite._column = skillIndex; */
                //opacity = skillData.selectable ? 255 : 100
                this.addChild(sprite);
                this._actionSprites.push(sprite);
            }, this);
        }, this);
        //console.log("Removing", this._actionSprites.length, "sprites");
    };

    //--------------------------------------------------------------------------
    // Add icon helper
    //--------------------------------------------------------------------------

    Window_ActorCommand.prototype.createIconSprite = function(iconIndex) {
        var sprite = new Sprite(ImageManager.loadSystem("IconSet"));
        //sprite._debugId = Math.random();
        //console.log("CREATE", sprite._debugId, iconIndex);
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
        console.log("Clear Actions:", this.children.length);
        if (!this._actionSprites) {
            this._actionSprites = [];
            return;
        }
        this._actionSprites.forEach(function(sprite) {
            console.log("Removing", sprite._debugType, sprite._commandId);
            if (sprite && sprite.parent) sprite.parent.removeChild(sprite);
        });
        this._actionSprites = [];
        //this._actionSprites.length = 0;
        console.log("Actions cleared:", this.children.length);
    };

    //--------------------------------------------------------------------------
    // Input dispatcher
    //--------------------------------------------------------------------------

    Window_ActorCommand.prototype.updateSelectionInput = function() {
        if (!this.active) return;
        this.updateMouseSelection();
        this.updateMouseClick();
        if (Input.isRepeated("left")) this.cursorLeft();
        if (Input.isRepeated("right")) this.cursorRight();
        if (Input.isRepeated("up")) this.cursorUp();
        if (Input.isRepeated("down")) this.cursorDown();
        //if (Input.isTriggered("ok")) this.processITBOk();
        //if (TouchInput.isTriggered()) this.processITBOk();
        //this.refreshSelection();
    };

    //--------------------------------------------------------------------------
    // Mouse Hover
    //--------------------------------------------------------------------------

    Window_ActorCommand.prototype.updateMouseSelection = function() {
        //if (!TouchInput.isMoved()) return;
        if (!TouchInput.isTriggered()) return;
        var x = TouchInput.x;
        var y = TouchInput.y;
        var localX = x - this.x;
        var localY = y - this.y;
        var hovered = null;
        this._actionSprites.forEach(function(sprite) {
            //console.log("Update Mouse Selection:", sprite._uiData);
            //if (!sprite.visible) return; 
            if (!sprite._uiData) return;
            var left = sprite.x;
            var top = sprite.y;
            var right = left + Window_Base._iconWidth;
            var bottom = top + Window_Base._iconHeight;
            /* if (localX < left) return;
            if (localX > right) return;
            if (localY < top) return;
            if (localY > bottom) return;
            if (sprite._itbType === "command") {
                this._selection.region = "commands";
                this._selection.row = sprite._row;
                this._selection.column = sprite._column;
            }
            if (sprite._itbType === "action") {
                this._selection.region = "actions";
                this._selection.row = sprite._row;
                this._selection.column = sprite._column;
            } */
            if (localX >= left &&
                localX <= right &&
                localY >= top &&
                localY <= bottom
            ) {
                hovered = sprite;
            }
        });
        console.log("Hovered:", hovered);
        if (!hovered) return;
        this._selection.region = hovered._uiData.region;
        this._selection.row = hovered._uiData.row;
        this._selection.column = hovered._uiData.column;
        this.refreshSelection();
    };

    //--------------------------------------------------------------------------
    // Mouse Click
    //--------------------------------------------------------------------------

    Window_ActorCommand.prototype.updateMouseClick = function() {
        //console.log("Update Mouse Click", TouchInput.isTriggered());
        if (!TouchInput.isTriggered()) return;
        var sprite = this.currentSelectionSprite();
        if (!sprite) {
            console.log("CLICK: no sprite")
            return;
        }
        console.log("CLICK: sprite region", sprite._uiData.region);
        if (sprite._uiData.region === "commands") {
            this.onCommandSelected(sprite._uiData.command);
        } else {
            this.onActionSelected(sprite._uiData.action);
        }
    };

    //--------------------------------------------------------------------------
    // Cursor Functions
    //--------------------------------------------------------------------------

    Window_ActorCommand.prototype.cursorLeft = function() {
        if (this.selectedRegion() === "actions") {
            this._selection.column--;
            if (this._selection.column < 0) this._selection.column = 0;
        }
        this.refreshSelection();
    };

    Window_ActorCommand.prototype.cursorRight = function() {
        if (this.selectedRegion() === "actions") {
            var rows = BattleManager.ITB_UI.getDisciplineRows(
                    BattleManager.actor(),
                    BattleManager.ITB_UI.getCurrentTarget()
                );
            var row = rows[this.selectedRow()];
            if (!row) return;
            this._selection.column++;
            if (this._selection.column >= row.skills.length) {
                this._selection.column = row.skills.length - 1;
            }
        }
        this.refreshSelection();
    };

    Window_ActorCommand.prototype.cursorUp = function() {
        console.log("CURSOR UP", this._selection.row);
        if (this.selectedRegion() === "actions") {
            this._selection.row--;
            if (this._selection.row < 0) this._selection.row = 0;
        }
        this.refreshSelection();
    };

    Window_ActorCommand.prototype.cursorDown = function() {
        console.log("CURSOR DOWN", this._selection.row);
        if (this.selectedRegion() === "actions") {
            var rows = BattleManager.ITB_UI.getDisciplineRows(
                    BattleManager.actor(),
                    BattleManager.ITB_UI.getCurrentTarget()
                );
            this._selection.row++;
            if (this._selection.row >= rows.length) {
                this._selection.row = rows.length - 1;
            }
        }
        this.refreshSelection();
    };

    //--------------------------------------------------------------------------
    // OK Processing
    //--------------------------------------------------------------------------

    Window_ActorCommand.prototype.processITBOk = function() {
        var data = this.currentSelectionData();
        if (!data) return;
        if (this._selection.region === "commands") {
            this.onCommandSelected(data);
        } else {
            this.onActionSelected(data);
        }
    };

    //--------------------------------------------------------------------------
    // Selection callbacks
    //--------------------------------------------------------------------------

    Window_ActorCommand.prototype.onCommandSelected = function(command) {
        console.log("COMMAND", command.id);
        switch (command.id) {
            case "skill":
                //BattleManager.ITB_UI.setActionMode("skill");
                //this.requestITBRefresh();
                this.onSkillMode();
                break;
            case "item":
                //BattleManager.ITB_UI.setActionMode("item");
                //this.requestITBRefresh();
                this.onItemMode();
                break;
            case "undo":
                this.executeUndoCommand();
                break;
            case "finish":
                this.executeFinishCommand();
                break;
        }
    };

    Window_ActorCommand.prototype.onActionSelected = function(data) {
        var action = BattleManager.inputtingAction();
        if (!action) return;
        if (data.type === "skill") {
            action.setSkill(data.id);
            BattleManager.actor().setLastBattleSkill($dataSkills[data.id]);
        } else if (data.type === "item") {
            action.setItem(data.id);
            $gameParty.setLastItem($dataItems[data.id]);
        }
        SceneManager._scene.onSelectAction();
        //console.log("ACTION", action.name);
        //BattleManager.ITB_UI.setSelectedAction(action);
    };

    //--------------------------------------------------------------------------
    // Selection helpers
    //--------------------------------------------------------------------------

    Window_ActorCommand.prototype.selectedRegion = function() {
        return this._selection.region;
    };

    Window_ActorCommand.prototype.selectedRow = function() {
        return this._selection.row;
    };

    Window_ActorCommand.prototype.selectedColumn = function() {
        return this._selection.column;
    };

    /* Window_ActorCommand.prototype.selectedActionData = function() {
        if (this.selectedRegion() !== "skills") return null;
        var rows = BattleManager.ITB_UI.getDisciplineRows(
                BattleManager.actor(),
                BattleManager.ITB_UI.getCurrentTarget()
            );
        var row = rows[this.selectedRow()];
        if (!row) return null;
        return row.skills[this.selectedColumn()];
    }; */

    Window_ActorCommand.prototype.currentSelectionSprite = function() {
        var region = this._selection.region;
        var row = this._selection.row;
        var column = this._selection.column;
        return this._actionSprites.find(function(sprite) {
            //console.log("Current Selection Sprite");
            if (!sprite._uiData) return false;
            //console.log("Region:", region);
            //console.log("Row:", row);
            //console.log("Column:", column);
            //console.log("Return:", sprite._uiData.region === region &&
            //    sprite._uiData.row === row &&
            //    sprite._uiData.column === column);
            return (
                sprite._uiData.region === region &&
                sprite._uiData.row === row &&
                sprite._uiData.column === column
            );
        });
        /* if (this.selectedRegion() === "commands") {
            return this._actionSprites.find(function(sprite) {
                return sprite._itbType === "command" &&
                    sprite._row === this.selectedRow() &&
                    sprite._column === this.selectedColumn();
            }, this);
        }
        if (this.selectedRegion() === "actions") {
            return this._actionSprites.find(function(sprite) {
                return sprite._itbType === "action" &&
                    sprite._row === this.selectedRow() &&
                    sprite._column === this.selectedColumn();
            }, this);
        }
        return null; */
    };

    Window_ActorCommand.prototype.currentSelectionData = function() {
        var actor = BattleManager.actor();
        if (!actor) return null;
        if (this._selection.region === "commands") {
            return BattleManager.ITB_UI.getMainCommands()[this._selection.index];
        }
        var rows = BattleManager.ITB_UI.getDisciplineRows(
            actor,
            BattleManager.ITB_UI.getCurrentTarget()
        );
        var row = rows[this._selection.row];
        if (!row) return null;
        return row.skills[this._selection.column];
    };

    //--------------------------------------------------------------------------
    // Undo wrapper
    //--------------------------------------------------------------------------

    Window_ActorCommand.prototype.executeUndoCommand = function() {
        //var actor = BattleManager.actor();
        //if (!actor) return;
        console.log("UNDO");
        //if (actor.removeLastQueuedAction) actor.removeLastQueuedAction();
        //if (BattleManager.selectPreviousCommand) BattleManager.selectPreviousCommand();
        BattleManager.selectPreviousCommand();
        this.requestITBRefresh();
    };

    //--------------------------------------------------------------------------
    // Finish wrapper
    //--------------------------------------------------------------------------

    Window_ActorCommand.prototype.executeFinishCommand = function() {
        console.log("FINISH");
        BattleManager.finishActionQueue();
        //if (BattleManager.finishActionQueue) BattleManager.finishActionQueue();
    };

    //--------------------------------------------------------------------------
    // Skill wrapper
    //--------------------------------------------------------------------------

    Window_ActorCommand.prototype.onSkillMode = function() {
        console.log("ON SKILL MODE");
        BattleManager.ITB_UI.setActionMode("skill");
        this.requestITBRefresh();
    };

    //--------------------------------------------------------------------------
    // Item wrapper
    //--------------------------------------------------------------------------

    Window_ActorCommand.prototype.onItemMode = function() {
        console.log("ON ITEM MODE");
        BattleManager.ITB_UI.setActionMode("item");
        this.requestITBRefresh();
    };

})();