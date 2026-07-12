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

    //==========================================================================
    // BattleManager.ITB_UI
    //==========================================================================

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

    BattleManager.ITB_UI.getDisciplineRows = function() {
        //console.log("Get Discipline Rows", this._actionMode);
        var actor = BattleManager.actor();
        if (!actor) return [];
        //var target = actor._connectorPreviewTarget || BattleManager.ITB_UI.getCurrentTarget();
        if (this._actionMode === "items") {
            rows = BattleManager.ITB_UI.getItemRows(actor);
        } else {
            rows = BattleManager.ITB_UI.getSkillRows(actor);
        }
        return rows;
    };
        
    BattleManager.ITB_UI.getSkillRows = function(actor) {
        var result = {};
        //console.log("Get Skill Rows");
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
                selectable: BattleManager.ITB_UI.isActionSelectable(actor, skill),
                isBasic: 
                    skill.name === TextManager.attack || 
                    skill.name === TextManager.guard
            });
            //if (result[discipline]) result[discipline].push(data);
        });
        return Object.keys(result).map(key => ({
            discipline: key,
            image: BattleManager.ITB_UI.getDisciplineImage(key),
            actions: result[key]
        }));
    };

    BattleManager.ITB_UI.getItemRows = function(actor) {
        var result = {};
        //console.log("Get Item Rows");
        $gameParty.items().forEach(function(item) {
            //var discipline = item.meta.Discipline || "combat";
            var discipline = "combat";
            if (!result[discipline]) {result[discipline] = []};
            result[discipline].push({
                id: item.id,
                type: "item",
                name: item.name,
                iconIndex: item.iconIndex,
                discipline: discipline,
                enabled: actor.canUse(item),
                selectable: BattleManager.ITB_UI.isActionSelectable(actor, item),
            });
        });
        return Object.keys(result).map(key => ({
            discipline: key,
            image: BattleManager.ITB_UI.getDisciplineImage(key),
            actions: result[key]
        }));
    };

    BattleManager.ITB_UI.setSelectedRow = function(row) {
        this._selectedRow = row;
    };

    //--------------------------------------------------------------------------
    // Add discipline icon lookup
    //--------------------------------------------------------------------------

    /* BattleManager.ITB_UI.getDisciplineIcon = function(discipline) {
        var icons = {
            combat: 162,
            sorcery: 163,
            diplomacy: 165,
            manoeuvre: 164,
            distance: 164,
            deception: 161
        };
        return icons[discipline] || 0;
    }; */

    BattleManager.ITB_UI.getDisciplineImage = function(discipline) {
        var images = {
            combat: "combat-30",
            sorcery: "sorcery-30",
            diplomacy: "diplomacy-30",
            manoeuvre: "manoeuvre-30",
            distance: "manoeuvre-30",
            deception: "deception-30"
        };
        return images[discipline] || null;
    };

    Window_Base.prototype.createSystemSprite = function(filename) {
        var sprite = new Sprite(ImageManager.loadSystem(filename));
        //sprite.scale.x = 0.5 / sprite.bitmap.width;
        //sprite.scale.y = 0.5 / sprite.bitmap.height;
        return sprite;
    };

    //--------------------------------------------------------------------------
    // Get action discipline
    //--------------------------------------------------------------------------

    /* BattleManager.ITB_UI.getActionDiscipline = function(item) {
        if (!item) return "combat";
        console.log("Item", item);
        //console.log("Type", item.type);
        // Skills
        if (item.type === "skill") {
            return ($dataSystem.skillTypes[item.stypeId] || "Combat").toLowerCase();
        }
        // Items
        if (item.type === "item") {
            return item.meta.Discipline || "combat";
        }
        return "combat";
    }; */

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

    BattleManager.ITB_UI.isActionSelectable = function(actor, action) {
        return actor && actor.canUse(action);
    };

    //--------------------------------------------------------------------------
    // Visibility
    //--------------------------------------------------------------------------

    BattleManager.ITB_UI.getVisibleActions = function() {
        return this.getDisciplineRows();
    };

    //--------------------------------------------------------------------------
    // Queued action ID helper
    //--------------------------------------------------------------------------

    /* BattleManager.ITB_UI.queuedActionId = function() {
        var actor = BattleManager.actor();
        if (!actor) return 0;
        var data = actor.lastQueuedActionData();
        if (!data) return 0;
        var queued = actor.createActionFromQueueData(data);
        if (!queued || !queued.item()) return 0;
        return queued.item().id;
    }; */

    //==========================================================================
    // Window_ActorCommand
    //==========================================================================

    //--------------------------------------------------------------------------
    // Set action mode
    //--------------------------------------------------------------------------

    Window_ActorCommand.prototype.setActionMode = function(mode) {
        BattleManager.ITB_UI.setActionMode(mode);
    };

    //--------------------------------------------------------------------------
    // Layout helpers
    //--------------------------------------------------------------------------

    Window_ActorCommand.prototype.uiStartX = function() {
        return 4;
    };

    Window_ActorCommand.prototype.uiStartY = function() {
        return 4;
    };

    Window_ActorCommand.prototype.actionRowStartX = function() {
        return (this.uiStartX() + 2 * this.uiSpacing() + 10);
    };

    Window_ActorCommand.prototype.uiDefaultSpacing = function() {
        return 32;
    };

    Window_ActorCommand.prototype.uiSpacing = function() {
        return this.uiDefaultSpacing() * this.uiIconScale();
    };

    Window_ActorCommand.prototype.uiIconScale = function() {
        return 0.95; //this.uiSpacing() / Window_Base._iconWidth;
    };

    Window_ActorCommand.prototype.uiSelectScale = function() {
        return 1; //1.05 * this.uiIconScale();
    };

    //--------------------------------------------------------------------------
    // Command window initialization
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
        this.clearITBActionSprites();
        this.height = this.uiWindowHeight();
        this.width = Graphics.boxWidth;
        this.updateUIWindowPosition();
        this.createContents();
        if (!this._actionSprites) this._actionSprites = [];
        if (!BattleManager.ITB_UI._actionMode) this.setActionMode("skills");
        this._selection = {
            region: undefined,
            row: -1,
            column: -1
        };
        this._hoverSelection = null;
        this._scrollRow = 0;
        //this.createSelectionBorder();
        this.requestITBRefresh();
        //this.opacity = 0;
        //this.contentsOpacity = 0;
    };

    //--------------------------------------------------------------------------
    // Visible discipline rows
    //--------------------------------------------------------------------------

    Window_ActorCommand.prototype.visibleRows = function() {
        //return Math.max(this.maxRows(), 1);
        return 3;
    }

    //--------------------------------------------------------------------------
    // Command window height
    //--------------------------------------------------------------------------

    Window_ActorCommand.prototype.uiWindowHeight = function() {
        return (this.uiStartY() * 2 + this.visibleRows() * this.uiSpacing() + 2);
    };

    //--------------------------------------------------------------------------
    // Command window position
    //--------------------------------------------------------------------------

    Window_ActorCommand.prototype.updateUIWindowPosition = function() {
        this.y = Graphics.boxHeight - this.height;
    };

    //--------------------------------------------------------------------------
    // UI refresh cycle
    //--------------------------------------------------------------------------

    Window_ActorCommand.prototype.makeCommandList = function(index) {
    };

    Window_ActorCommand.prototype.refresh = function() {
    };

    Window_ActorCommand.prototype.refreshCursor = function() {
        //Disable refesh cursor in original window
    };

    Window_ActorCommand.prototype.refreshITBActionPanel = function() {
        this.clearITBActionSprites();
        console.log("Refresh Action Panel");
        var commands = BattleManager.ITB_UI.getMainCommands();
        var rows = BattleManager.ITB_UI.getDisciplineRows();
        this.drawMainCommands(commands);
        console.log("Draw rows");
        this.drawDisciplineRows(rows);
        console.log(
            this._selection,
            this._scrollRow,
            this.currentSelectionSprite()
        );
        //if (TouchInput.isTriggered()) 
        //this.updateMouseSelection();
        this.refreshSelection();
    };

    Window_ActorCommand.prototype.needRefreshITBPanel = function() {
        return false;
    };

    Window_ActorCommand.prototype.requestITBRefresh = function() {
        console.log("Request refresh");
        //this.ensureSelectionVisible();
        this._needsRefresh = true;
    };

    Window_ActorCommand.prototype.confirmSelection = function() {
        console.log("Confirm Selection");
        this.clearSelectionHighlights();
        var selected = this.currentSelectionSprite();
        if (!selected || !selected._queueMarker) return;
        selected.opacity = 255;
        selected.setBlendColor([255, 255, 100, 64]);
        selected._queueMarker.visible = true;
        this.updatePreviewWindow(selected);
    };

    Window_ActorCommand.prototype.refreshSelection = function() {
        console.log("Refresh Selection");
        this.clearSelectionHighlights();
        var selected = this.currentSelectionSprite();
        //console.log("SELECT", selected);
        if (!selected || !selected._uiData) {
            //if (this._selectionBorder) this._selectionBorder.visible = false;
            this.updatePreviewWindow(null);
            return;
        }
        //var queuedId = BattleManager.ITB_UI.queuedActionId();
        //console.log("Preview ID:", queuedId);
        //if (selected._uiData.action) console.log("Action ID:", selected._uiData.action.id);
        //if (selected._uiData.region === "actions" && 
        //    selected._uiData.action.id === queuedId) {
        //        selected._queueMarker.visible = true;
        //} else {
            // Don't highlight an action that has already been confirmed.
        selected.opacity = 255;
        selected.setBlendColor([255, 255, 100, 64]);
        selected.scale.x = this.uiSelectScale();
        selected.scale.y = this.uiSelectScale();
        //}
        this.updatePreviewWindow(selected);
    };

    //--------------------------------------------------------------------------
    // Clear selection visuals
    //--------------------------------------------------------------------------

    Window_ActorCommand.prototype.clearSelectionHighlights = function() {
        var scale = this.uiIconScale();
        this._actionSprites.forEach(function(sprite) {
            sprite.scale.x = scale;
            sprite.scale.y = scale;
            sprite.opacity = 215;
            sprite.setBlendColor([0, 0, 0, 0]);
            if (sprite._queueMarker) sprite._queueMarker.visible = false;
        });
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
    };

    Window_ActorCommand.prototype.drawItem = function(index) {
        // Disable draw items in original window
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
        if (this._pendingCommand) {
            this._commandDelay--;
            if (this._commandDelay <= 0) {	
                var command = this._pendingCommand;
                this._pendingCommand = null;
                switch (command) {
                case "skill":
                    this.showActionsCommand("skills");
                    break;
                case "item":
                    this.showActionsCommand("items");
                    break;
                case "undo":
                    this.executeUndoCommand();
                    break;
                case "finish":
                    this.executeFinishCommand();
                    return;
                }
            }	
        }
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
        commands.forEach(function(command, index) {
            var col = index % 2;
            var row = Math.floor(index / 2);
            var sprite = this.createIconSprite(command.iconIndex);
            //console.log("Command Index:", command.iconIndex);
            sprite.x = this.uiStartX() + col * this.uiSpacing();
            sprite.y = this.uiStartY() + row * this.uiSpacing();
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
        if (!rows) return;
        var startX = this.actionRowStartX();
        var first = this._scrollRow;
        var last = Math.min(first + this.visibleRows(), rows.length);
        for (var rowIndex = first; rowIndex < last; rowIndex++) {
            var rowData = rows[rowIndex];
            var visibleRow = rowIndex - first;
            var icon = this.createSystemSprite(rowData.image);
            icon.x = startX;
            icon.y = this.uiStartY() + visibleRow * this.uiSpacing() + 1;
            this.addChild(icon);
            this._actionSprites.push(icon);
            rowData.actions.forEach(function(actionData, actionIndex) {
                var sprite = this.createIconSprite(actionData.iconIndex);
                sprite.x = startX + (actionIndex + 1) * this.uiSpacing() + 2;
                sprite.y = this.uiStartY() + visibleRow * this.uiSpacing();
                sprite._uiData = {
                    region: "actions",
                    row: rowIndex, // <-- REAL row
                    column: actionIndex,
                    action: actionData
                };
                // Queue marker
                sprite._queueMarker = new Sprite(ImageManager.loadSystem("check-mark-32"));
                sprite._queueMarker.anchor.x = 1;
                sprite._queueMarker.anchor.y = 1;
                sprite._queueMarker.x = Window_Base._iconWidth + 3;
                sprite._queueMarker.y = Window_Base._iconHeight + 4;
                sprite._queueMarker.scale.x = 1.2;
                sprite._queueMarker.scale.y = 1.2;
                sprite._queueMarker.visible = false;
                sprite.addChild(sprite._queueMarker);
                this.addChild(sprite);
                this._actionSprites.push(sprite);
            }, this);
        }
    };

    //--------------------------------------------------------------------------
    // Add icon helper
    //--------------------------------------------------------------------------

    Window_ActorCommand.prototype.createIconSprite = function(iconIndex) {
        var sprite = new Sprite(ImageManager.loadSystem("IconSet"));
        //var offsetX = this.uiSpacingX() - 32;
        //var offsetY = this.uiSpacingY() - 32;
        //sprite._debugId = Math.random();
        //console.log("CREATE", sprite._debugId, iconIndex);
        sprite.bitmap.addLoadListener(function() {
            var pw = Window_Base._iconWidth;
            var ph = Window_Base._iconHeight;
            var sx = iconIndex % 16 * pw;
            var sy = Math.floor(iconIndex / 16) * ph;
            sprite.setFrame(sx, sy, pw, ph);
        });
        sprite.scale.x = this.uiIconScale();
        sprite.scale.y = this.uiIconScale(); 
        return sprite;
    };

    //--------------------------------------------------------------------------
    // Add selection border helper
    //--------------------------------------------------------------------------

    /* Window_ActorCommand.prototype.createSelectionBorder = function() {
        if (this._selectionBorder) return;
        var size = Window_Base._iconWidth + 4;
        var bitmap = new Bitmap(size, size);
        //bitmap.fillRect(0, 0, size, size, "#000000");
        bitmap.fillRect(2, 2, size - 2, size - 2, "#F7E839");
        //bitmap.fillRect(2, 2, size - 4, size - 4, "#F7E839");
        bitmap.fillRect(4, 4, size - 6, size - 6, "#000000");
        this._selectionBorder = new Sprite(bitmap);
        this._selectionBorder.visible = false;
        this.addChild(this._selectionBorder);
    }; */

    //--------------------------------------------------------------------------
    // Clear old icons helper
    //--------------------------------------------------------------------------

    Window_ActorCommand.prototype.clearITBActionSprites = function() {
        console.log("Clear Actions:", this.children.length);
        //if (this._selectionBorder) this._selectionBorder.visible = false;
        if (!this._actionSprites) {
            this._actionSprites = [];
            return;
        }
        this._actionSprites.forEach(function(sprite) {
            if (sprite && sprite.parent) sprite.parent.removeChild(sprite);
        });
        this._actionSprites = [];
    };

    //--------------------------------------------------------------------------
    // Input dispatcher
    //--------------------------------------------------------------------------

    Window_ActorCommand.prototype.updateSelectionInput = function() {
        if (!this.active) return;
        //if (TouchInput.isCancelled()) this.onCommandSelected("undo");
        this.updateScrollArrows();
        //this.updateMouseSelection();
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

    Window_ActorCommand.prototype.updateMouseSelection = function(sprite) {
        //if (!TouchInput.isMoved()) return;
        //if (!TouchInput.isTriggered()) return;
        /* var x = TouchInput.x;
        var y = TouchInput.y;
        var localX = x - this.x;
        var localY = y - this.y; */
        /* var hovered = null;
        this._actionSprites.forEach(function(sprite) {
            //console.log("Update Mouse Selection:", sprite._uiData);
            //if (!sprite.visible) return; 
            if (!sprite._uiData) return;
            var left = sprite.x;
            var top = sprite.y;
            var right = left + Window_Base._iconWidth;
            var bottom = top + Window_Base._iconHeight;
            if (localX >= left &&
                localX <= right &&
                localY >= top &&
                localY <= bottom
            ) {
                hovered = sprite;
            }
        }); */
        //var hovered = this.hitTestActionSprite(localX, localY);
        //console.log("Hovered:", hovered);
        if (!sprite) return;
        this._selection.region = sprite._uiData.region;
        this._selection.row = sprite._uiData.row;
        this._selection.column = sprite._uiData.column;
        this.refreshSelection();
    };

    //--------------------------------------------------------------------------
    // Mouse Click
    //--------------------------------------------------------------------------

    Window_ActorCommand.prototype.updateMouseClick = function() {
        //console.log("Update Mouse Click", TouchInput.isTriggered());
        if (!TouchInput.isTriggered()) return;
        //var sprite = this.currentSelectionSprite();
        var x = TouchInput.x - this.x;
        var y = TouchInput.y - this.y;
        var sprite = this.hitTestActionSprite(x, y);
        if (!sprite) {
            console.log("CLICK: no sprite")
            return;
        }
        console.log("CLICK: sprite region", sprite._uiData.region);
        // Commands: single-click selection
        if (sprite._uiData.region === "commands") {
            this.updateMouseSelection(sprite);
            this.onCommandSelected(sprite._uiData.command);
            return;
        }
        // Actions: first click highlights/previews, second click confirms
        var hovered = this.currentSelectionSprite();
        if (sprite !== hovered) {
            this.updateMouseSelection(sprite);
            return;
        }
        this.onActionSelected(sprite._uiData.action);
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
            var rows = BattleManager.ITB_UI.getDisciplineRows();
            if (!rows) return;
            var row = rows[this.selectedRow()];
            if (!row) return;
            this._selection.column++;
            if (this._selection.column >= row.actions.length) {
                this._selection.column = row.actions.length - 1;
            }
        }
        this.refreshSelection();
    };

    Window_ActorCommand.prototype.cursorUp = function() {
        //console.log("CURSOR UP", this._selection.row, this._scrollRow);
        //if (this.selectedRegion() === "actions") this.scrollActions(-1);
        if (this.selectedRegion() === "actions") {
            this._selection.row--;
            if (this._selection.row < 0) this._selection.row = 0;
        }
        if (this.ensureSelectionVisible()) this.requestITBRefresh();
        this.refreshSelection();
    };

    Window_ActorCommand.prototype.cursorDown = function() {
        //console.log("CURSOR DOWN", this._selection.row, this._scrollRow);
        //if (this.selectedRegion() === "actions") this.scrollActions(1);
        if (this.selectedRegion() === "actions") {
            var rows = BattleManager.ITB_UI.getDisciplineRows();
            if (!rows) return;
            this._selection.row++;
            if (this._selection.row >= rows.length) {
                this._selection.row = rows.length - 1;
            }
        }
        if (this.ensureSelectionVisible()) this.requestITBRefresh();
        this.refreshSelection();
    };

    /* Window_ActorCommand.prototype.scrollActions = function(direction) {
        if (!this.active) return;
        var rows = BattleManager.ITB_UI.getDisciplineRows();
        if (!rows || rows.length <= this.visibleRows()) return;
        this._selection.row += direction;
        this._selection.row = Math.max(0, Math.min(this._selection.row, rows.length - 1));
        if (this.ensureSelectionVisible()) this.requestITBRefresh();
        this.refreshSelection();
    }; */

    //--------------------------------------------------------------------------
    // OK Processing
    //--------------------------------------------------------------------------

    Window_ActorCommand.prototype.processITBOk = function() {
        console.log("Keyboard path");
        var data = this.currentSelectionData();
        if (!data) return;
        if (this._selection.region === "commands") {
            this.onCommandSelected(data);
        } else {
            this.onActionSelected(data);
        }
    };

    //--------------------------------------------------------------------------
    // Command selection callbacks
    //--------------------------------------------------------------------------

    Window_ActorCommand.prototype.onCommandSelected = function(command) {
        if (this._pendingCommand) return;
        this.refreshSelection();
        this._pendingCommand = command.id;
        this._commandDelay = 2;
    };

    /* Window_ActorCommand.prototype.onCommandSelected = function(command) {
        console.log("COMMAND", command.id);
        this.queueCommand(command.id);
        switch (command.id) {
            case "skill":
                this.queueCommand("skills");
                break;
            case "item":
                this.queueCommand("items");
                break;
            case "undo":
                this.queueCommand;
                break;
            case "finish":
                this.executeFinishCommand();
                break;
        }
    }; */

    Window_ActorCommand.prototype.onActionSelected = function(data) {
        //this.refreshSelection();
        var action = BattleManager.inputtingAction();
        if (!action) return;
        //console.log(SceneManager._scene._actorWindow.active);
        //console.log(SceneManager._scene._enemyWindow.active);
        if (data.type === "skill") {
            action.setSkill(data.id);
            BattleManager.actor().setLastBattleSkill($dataSkills[data.id]);
        } else if (data.type === "item") {
            action.setItem(data.id);
            $gameParty.setLastItem($dataItems[data.id]);
        }
        //console.log("Enemy Window Active?:", SceneManager._scene._enemyWindow.active);
        //console.log("Needs Selection?", action.needsSelection());
        //console.log("Enemy Selection?", action.isForOpponent());
        SceneManager._scene.onSelectAction();
        //console.log("ACTION", action.name);
        //BattleManager.ITB_UI.setSelectedAction(action);
    };

    //--------------------------------------------------------------------------
    // Preview helper
    //--------------------------------------------------------------------------

    /* Window_ActorCommand.prototype.isPreviewAction = function(actionData) {
        var actor = BattleManager.actor();
        if (!actor) return false;
        var preview = actor.itbActionPreview();
        if (!preview || !preview.item()) return false;
        return preview.item().id === actionData.id;
    }; */

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
        if (!this._selection) {
            this._selection = {region: undefined, row: -1, column: -1};
        }
        var region = this._selection.region;
        var row = this._selection.row;
        var column = this._selection.column;
        /* console.log(
            "Looking for",
            this._selection.region,
            this._selection.row,
            this._selection.column
        );
        console.log(
            this._actionSprites.map(function(s) {
                return s._uiData;
            })
        ); */
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
        if (this._selection.region === "commands") {
            var index = this._selection.row * 2 + this._selection.column;
            return BattleManager.ITB_UI.getMainCommands()[index];
        }
        var rows = BattleManager.ITB_UI.getDisciplineRows();
        if (!rows) return;
        var row = rows[this._selection.row];
        if (!row) return null;
        return row.actions[this._selection.column];
    };

    //--------------------------------------------------------------------------
    // Hit-test helper
    //--------------------------------------------------------------------------

    Window_ActorCommand.prototype.hitTestActionSprite = function(localX, localY) {
        for (var i = this._actionSprites.length - 1; i >= 0; i--) {
            var sprite = this._actionSprites[i];
            if (!sprite._uiData) continue;
            if (!sprite.visible) continue;
            var left   = sprite.x;
            var top    = sprite.y;
            var right  = left + sprite.width;
            var bottom = top + sprite.height;
            if (localX >= left &&
                localX <= right &&
                localY >= top &&
                localY <= bottom) {
                return sprite;
            }
        }
        return null;
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
        SceneManager._scene.selectPreviousCommand();
        //this.requestITBRefresh();
    };

    //--------------------------------------------------------------------------
    // Finish wrapper
    //--------------------------------------------------------------------------

    Window_ActorCommand.prototype.executeFinishCommand = function() {
        console.log("FINISH");
        //this.refreshSelection();
        this.deactivate();
        SceneManager._scene.finishActionQueue();
        /* if (this._finishPending) return;		
        this.refreshSelection();
        this._finishPending = true;
        this._finishDelay = 1;	 */
        //if (BattleManager.finishActionQueue) BattleManager.finishActionQueue();
    };

    //--------------------------------------------------------------------------
    // Keep selection valid after switching mode
    //--------------------------------------------------------------------------

    Window_ActorCommand.prototype.showActionsCommand = function(mode) {
        if (BattleManager.ITB_UI._actionMode === mode) return;
        console.log("Show actions", mode);
        this.setActionMode(mode);
        this.clearITBActionSprites();
        this.requestITBRefresh();
        this._selection = {
            region: "actions",
            row: 0,
            column: 0
        };
    };

    //--------------------------------------------------------------------------
    // Scroll helpers
    //--------------------------------------------------------------------------

    Window_ActorCommand.prototype.maxRows = function() {
        return BattleManager.ITB_UI.getDisciplineRows().length;
    };

    Window_ActorCommand.prototype.maxScrollRow = function() {
        return Math.max(0, this.maxRows() - this.visibleRows());
    };

    Window_ActorCommand.prototype.ensureSelectionVisible = function() {
        if (!this._selection || this._selection.row == null) return;
        var oldScroll = this._scrollRow;
        if (this._selection.row < this._scrollRow) {
            this._scrollRow = this._selection.row;
        }
        if (this._selection.row >= this._scrollRow + this.visibleRows()) {
            this._scrollRow = this._selection.row - this.visibleRows() + 1;
        }
        this._scrollRow = Math.max(0, Math.min(this._scrollRow, this.maxScrollRow()));
        return oldScroll !== this._scrollRow;
    };

    //--------------------------------------------------------------------------
    // Command window scroll arrows
    //--------------------------------------------------------------------------

    Window_ActorCommand.prototype.updateScrollArrows = function() {
        this.upArrowVisible = this._scrollRow > 0;
        this.downArrowVisible = this._scrollRow < this.maxScrollRow();
    };

    //--------------------------------------------------------------------------
    // Dedicated viewport scroll function
    //--------------------------------------------------------------------------

    Window_ActorCommand.prototype.scrollViewport = function(direction) {
        if (!this.active) return;
        var rows = BattleManager.ITB_UI.getDisciplineRows();
        if (!rows) return;
        if (rows.length <= this.visibleRows()) return;
        var newScroll = this._scrollRow + direction;
        newScroll = Math.max(0, Math.min(newScroll, this.maxScrollRow()));
        // Already at the top/bottom
        if (newScroll === this._scrollRow) return;
        this._scrollRow = newScroll;
        // Keep the selected row in the same screen position
        this._selection.region = "actions";
        this._selection.row += direction;
        this._selection.row = Math.max(0, Math.min(this._selection.row, rows.length - 1));
        // Keep the selected column valid
        var row = rows[this._selection.row];
        if (row) {
            this._selection.column = Math.max(0,
                Math.min(this._selection.column, row.actions.length - 1)
            );
        }
        this.requestITBRefresh();
    };

    //--------------------------------------------------------------------------
    // Request Preview Update
    //--------------------------------------------------------------------------

    Window_ActorCommand.prototype.updatePreviewWindow = function(sprite) {
        var scene = SceneManager._scene;
        if (!scene) return;
        if (sprite && sprite._uiData.region === "actions") {
            scene.updatePreviewWindow(sprite._uiData.action);
        } else {
            scene.updatePreviewWindow(null);
        }
    };

    //==========================================================================
    // Window_BattleSatus
    //==========================================================================

    //--------------------------------------------------------------------------
    // Status window initialization
    //--------------------------------------------------------------------------

    Window_BattleStatus.prototype.initialize = function() {
        var width = Graphics.boxWidth;
        var height = this.windowHeight();
        var x = Graphics.boxWidth - width;
        var scene = SceneManager._scene;
        if (scene && scene._actorCommandWindow) {
            var y = Graphics.boxHeight - height - 
                scene._actorCommandWindow.uiWindowHeight();
        } else {
            var y = Graphics.boxHeight - height;
        }
        Window_Selectable.prototype.initialize.call(this, x, y, width, height);
        //this.createActiveActorHighlight();
        this.refresh();
        this.openness = 0;
    };

    Window_BattleStatus.prototype.numVisibleRows = function() {
        return 1;
    };

    Window_BattleStatus.prototype.standardFontSize = function() {
        return 26;    // MV default is 28
    };

    Window_BattleStatus.prototype.lineHeight = function() {
        return 40;
    };

    Window_BattleStatus.prototype.standardPadding = function() {
        return 8;    // default is 18
    };

    //--------------------------------------------------------------------------
    // Refresh battle status
    //--------------------------------------------------------------------------

    Window_BattleStatus.prototype.refreshActiveActor = function() {
        // Refresh active actor displayed
        var actor = BattleManager.actor();
        if (!actor) return;
        this.setTopRow(actor.index());
        this.refresh();
    };

    //--------------------------------------------------------------------------
    // Layout helpers
    //--------------------------------------------------------------------------

    Window_BattleStatus.prototype.updateLayout = function(uiWindowHeight) {
        this.x = 0;
        this.y = Graphics.boxHeight - this.height - uiWindowHeight;
    };

    Window_BattleStatus.prototype.connectorAreaWidth = function() {
        return 112;
    };

    //--------------------------------------------------------------------------
    // Update for process handling
    //--------------------------------------------------------------------------

    var ITB_Command_WBA_update = Window_BattleActor.prototype.update;
    Window_BattleActor.prototype.update = function() {
        Window_BattleStatus.prototype.update.call(this);
        if (this._ignoreInitialOk && !Input.isPressed("ok")) {
            this._ignoreInitialOk = false;
        }
    };

    //--------------------------------------------------------------------------
    // Display active actor indicator
    //--------------------------------------------------------------------------

    Window_BattleStatus.prototype.updateCursor = function() {
        // Normal RPG Maker behaviour while the window is active
        if (this.active) {
            Window_Selectable.prototype.updateCursor.call(this);
            return;
        }
        // Otherwise highlight the currently active battler
        var actor = BattleManager.actor();
        if (actor) {
            var rect = this.itemRect(actor.index());
            this.setCursorRect(rect.x, rect.y, rect.width, rect.height);
        } else {
            this.setCursorRect(0, 0, 0, 0);
        }
    };

    /* var ITB_Command_WBS_drawItem = Window_BattleStatus.prototype.drawItem;
    Window_BattleStatus.prototype.drawItem = function(index) {
        ITB_Command_WBS_drawItem.call(this, index);
        var actor = BattleManager.actor();
        if (!actor) return;
        if (actor.index() !== index) return;
        this.drawActiveActorIndicator(index);
    }; */

    /* Window_BattleStatus.prototype.drawActiveActorIndicator = function(index) {
        var rect = this.itemRect(index);
        var bmp = new Bitmap(rect.idth, rect.height);
        bmp.fillRect(0, 0, rect.width, rect.height, "#89E5BF");
        this._activeActorHighlight.bitmap = bmp;
        this._activeActorHighlight.x = rect.x;
        this._activeActorHighlight.y = rect.y;
        this._activeActorHighlight.visible = true;
        //this.contents.fillRect(rect.x, rect.y, 4, rect.height, "#4FA3FF");
        this.contents.paintOpacity = 50;
        this.contents.fillRect(rect.x, rect.y, rect.width, rect.height, "#89E5BF");
        this.contents.paintOpacity = 255;
        this.contents.fillRect(rect.x, rect.y, rect.width, 2, "#89E5BF");
        this.contents.fillRect(rect.x, rect.y + rect.height - 2, rect.width, 2, "#89E5BF");
        this.contents.fillRect(rect.x, rect.y, 2, rect.height, "#89E5BF");
        this.contents.fillRect(rect.x + rect.width - 2, rect.y, 2, rect.height, "#89E5BF");
    }; */

    /* Window_BattleStatus.prototype.createActiveActorHighlight = function() {
        this._activeActorHighlight = new Sprite(new Bitmap(1, 1));
        this._activeActorHighlight.visible = false;
        this.addChildToBack(this._activeActorHighlight);
    }; */

    //--------------------------------------------------------------------------
    // Adjust actor status icons
    //--------------------------------------------------------------------------

    Window_BattleStatus.prototype.drawBasicArea = function(rect, actor) {
        //console.log("Draw Area");
        this.scaleIconSize();
        var x = rect.x - 2;
        this.drawScaledFace(actor, x, rect.y + 4);
        x += this._actorIconSize + 8;
        var nameWidth = 150;
        this.drawActorName(actor, x, rect.y + 2, nameWidth);
        x += nameWidth + 2;
        this.drawActorConnectors(actor, x, rect.y - 2);
        x += this.connectorAreaWidth();
        this.drawStatusIcons(actor, x, rect.y + 2, rect.right - x);
    };

    Window_BattleStatus.prototype.drawStatusIcons = function(actor, x, y, width) {
        //console.log("Draw icon");
        width = width || 144;
        //var size = 32;               // e.g. 30 instead of 32
        //var spacing = 0.95 * Window_Base._iconWidth; //size;
        var icons = actor.allIcons().slice(0, Math.floor(width / this._actorIconSize));
        for (var i = 0; i < icons.length; i++) {
            this.drawScaledIcon(
                icons[i], 
                x + this._actorIconSize * i, 
                y + 2, 
                this._actorIconSize
            );//, size);
        }
    };

    Window_BattleStatus.prototype.scaleIconSize = function() {
        this._actorIconSize = Window_Base._iconWidth;
    };

    //--------------------------------------------------------------------------
    // Draw Gauge Area
    //--------------------------------------------------------------------------

    //var ITB_Command_WBA_drawGaugeAreaWithTp = Window_BattleStatus.prototype.drawGaugeAreaWithTp;
    Window_BattleStatus.prototype.drawGaugeAreaWithTp = function(rect, actor) {
        var scale = 0.85;
        var spacing = 10;
        var hpWidth = Math.floor(108 * scale);
        var mpWidth = Math.floor(96 * scale);
        var tpWidth = Math.floor(96 * scale);
        var x = rect.x + 8;
        this.drawActorHp(actor, x, rect.y, hpWidth);
        x += hpWidth + spacing;
        this.drawActorMp(actor, x, rect.y, mpWidth);
        x += mpWidth + spacing;
        this.drawActorTp(actor, x, rect.y, tpWidth);
        x += mpWidth + spacing;
        this.drawActorTp(actor, x, rect.y, tpWidth);
    };

    //var ITB_Command_WBA_drawGaugeAreaWithoutTp = Window_BattleStatus.prototype.drawGaugeAreaWithoutTp;
    Window_BattleStatus.prototype.drawGaugeAreaWithoutTp = function(rect, actor) {
        var scale = 0.85;
        var spacing = 10;
        var hpWidth = Math.floor(201 * scale);
        var mpWidth = Math.floor(114 * scale);
        var x = rect.x;
        this.drawActorHp(actor, x, rect.y, hpWidth);
        x += hpWidth + spacing;
        this.drawActorMp(actor, x, rect.y, mpWidth);
    };

    //--------------------------------------------------------------------------
    // Gauge Area Width
    //--------------------------------------------------------------------------

    var ITB_Command_WBA_gaugeAreaWidth = Window_BattleStatus.prototype.gaugeAreaWidth;
    Window_BattleStatus.prototype.gaugeAreaWidth = function() {
        return 376;
    };

    //==========================================================================
    // Window_BattleActor
    //==========================================================================

    //--------------------------------------------------------------------------
    // Actor window activation guard
    //--------------------------------------------------------------------------

    var ITB_Command_WBA_processOk = Window_BattleActor.prototype.processOk;
    Window_BattleActor.prototype.processOk = function() {
        if (this._ignoreInitialOk) return;
        //console.log(
        //    "Actor processOk",
        //    Input.isTriggered("ok"),
        //    Input.isRepeated("ok"),
        //    Input.isPressed("ok")
        //);
        ITB_Command_WBA_processOk.call(this);
    };

    Window_BattleActor.prototype.activate = function() {
        Window_BattleStatus.prototype.activate.call(this);
        this._ignoreInitialOk = true;
    };

    //==========================================================================
    // Window_Preview
    //==========================================================================

    function Window_Preview() {
        this.initialize.apply(this, arguments);
    }

    Window_Preview.prototype = Object.create(Window_Base.prototype);
    Window_Preview.prototype.constructor = Window_Preview;

    //--------------------------------------------------------------------------
    // Preview type window
    //--------------------------------------------------------------------------

    function Window_PreviewType() {
        this.initialize.apply(this, arguments);
    }

    Window_PreviewType.prototype = Object.create(Window_Base.prototype);
    Window_PreviewType.prototype.constructor = Window_PreviewType;

    //--------------------------------------------------------------------------
    // Initialization
    //--------------------------------------------------------------------------

    Window_Preview.prototype.initialize = function(numLines) {
        var width = Graphics.boxWidth;
        var height = this.fittingHeight(numLines || 4);
        var x = 0;
        var scene = SceneManager._scene;
        if (scene && scene._statusWindow) {
            var y = scene._statusWindow.y - height - 10;
        } else {
            var y = 0;
        }
        Window_Base.prototype.initialize.call(this, x, y, width, height);
        this._item = null;
        this._badges = {};
        this.createBadges();
        this.hide();
        this.deactivate();
    };

    Window_PreviewType.prototype.initialize = function() {
        var width = 180;
        var height = 32; // this.fittingHeight(1);
        Window_Base.prototype.initialize.call(this, 0, 0, width, height);
        this.createOpaqueBackground();
        //this.opacity = 255;
        //this.backOpacity = 255;
        //this.standardBackOpacity = 255;
        //this.contentsOpacity = 255;
        this._text = "";
    };

    Window_PreviewType.prototype.standardFontSize = function() {
        return 20;    // MV default is 28
    };

    Window_PreviewType.prototype.lineHeight = function() {
        return 40;
    };

    Window_PreviewType.prototype.standardPadding = function() {
        return 8;    // default is 18
    };

    //--------------------------------------------------------------------------
    // Create badge sprites
    //--------------------------------------------------------------------------

    Window_Preview.prototype.createBadges = function() {
        this._badges.aether = this.createBadge("aether-48", 0.9);
        this._badges.initiative = this.createBadge("initiative-48");
        this._badges.stamina = this.createBadge("stamina-48");
        this._badges.defense = this.createBadge("defense-48");
        this._badges.damage = this.createBadge("damage-48", 0.9);
        this.createTypeWindow();
        this.layoutBadges();
    };

    //--------------------------------------------------------------------------
    // Set Item
    //--------------------------------------------------------------------------

    Window_Preview.prototype.setItem = function(item) {
        if (this._item === item) return;
        this._item = item;
        this.refresh();
    };

    //--------------------------------------------------------------------------
    // Clear Item
    //--------------------------------------------------------------------------

    Window_Preview.prototype.clear = function() {
        this.setItem(null);
    };

    //--------------------------------------------------------------------------
    // Refresh Preview Window
    //--------------------------------------------------------------------------

    Window_Preview.prototype.refresh = function() {
        this.contents.clear();
        var x = this.textPadding();
        var y = 0;
        var w = this.contentsWidth() - this.textPadding() * 2;
        var item = this._item;
        if (!item) return;
        this.drawTitle(item);
        //this.drawText(this._item.name, x, y, w);
        //y += this.lineHeight() + 6;
        //this.drawTextEx(this._item.description || "", x, y);
        this.drawSeparator();
        this.layoutBadges();
    };

    Window_PreviewType.prototype.refresh = function() {
        this.contents.clear();
        this.drawText(this._text, 0, 0, this.contentsWidth(), "center");
    };

    //--------------------------------------------------------------------------
    // Layout helpers
    //--------------------------------------------------------------------------

    Window_Preview.prototype.updateLayout = function() {
        if (!SceneManager._scene || !SceneManager._scene._statusWindow) return;
        this.x = 0;
        this.y = SceneManager._scene._statusWindow.y - this.height - 10;
        //this.standardBackOpacity = 255;
        //this.backOpacity = 255;
    };

    Window_Preview.prototype.separatorX = function() {
        return Math.floor(this.contentsWidth() * 0.55);
    };

    Window_Preview.prototype.layoutBadges = function() {
        var topY = -12;
        var bottomY = this.height - 36;
        this._badges.aether.x = -2;
        this._badges.aether.y = topY;
        this._badges.initiative.x = this.width / 2 - 24;
        this._badges.initiative.y = topY - 8;
        this._badges.stamina.x = this.width - 46;
        this._badges.stamina.y = topY;
        this._badges.defense.x = -6;
        this._badges.defense.y = bottomY + 2;
        //this._badges.type.x = this.width / 2 - 90;
        //this._badges.type.y = bottomY + 20;
        this._typeWindow.x = this.width / 2 - 90;
        this._typeWindow.y = bottomY + 15;
        //this._typeWindow.opacity = 255;
        //this._typeWindow.backOpacity = 255;
        //this._typeWindow.standardBackOpacity = 255;
        //this._typeWindow.alpha = 0.5;
        //console.log(this._typeWindow);
        //console.log(this._typeWindow.opacity);
        //console.log(this._typeWindow.backOpacity);
        this._badges.damage.x = this.width - 43;
        this._badges.damage.y = bottomY + 4;
    };

    //--------------------------------------------------------------------------
    // Creat badge helpers
    //--------------------------------------------------------------------------

    Window_Preview.prototype.createBadge = function(filename, scale) {
        var sprite = new Sprite(ImageManager.loadSystem(filename));
        if (!scale) scale = 1;
        sprite.scale.x *= scale;
        sprite.scale.y *= scale;
        this.addChild(sprite);
        return sprite;
    };

    Window_Preview.prototype.createTypeWindow = function() {
        this._typeWindow = new Window_PreviewType();
        //this._typeWindow.x = this.x + (this.width - this._typeWindow.width) / 2;
        //this._typeWindow.y = this.y + this.height - this._typeWindow.height / 2;
        this.addChild(this._typeWindow);
        //console.log(this._typeWindow.backOpacity);
        //console.log(this._typeWindow._dimmerSprite);
        //console.log(this._typeWindow._windowBackSprite.visible);
        //this._typeWindow._windowBackSprite.opacity = 0;
        //this._typeWindow._windowBackSprite.alpha = 0;
        //this._typeWindow.setBackgroundType(0);
        //console.log(this._typeWindow._windowBackSprite.alpha);
        //console.log(this._typeWindow._windowFrameSprite.alpha);
        //this._typeWindow._windowBackSprite.children.forEach(function(child) {
        //    child.alpha = 0;
        //});
        //this._typeWindow._windowFrameSprite.alpha = 0;
        //SceneManager._scene.addWindow(this._typeWindow);
    };

    Window_PreviewType.prototype.createOpaqueBackground = function() {
        var sprite = new Sprite(new Bitmap(this.width, this.height));
        sprite.bitmap.fillRect(
            4, 
            4, 
            this.width - 8, 
            this.height - 8, 
            "rgba(81, 77, 82, 1.0)"
        );
        this._windowSpriteContainer.addChildAt(sprite, 0);
        this._opaqueBackground = sprite;
    };

    //Window_Preview.prototype.createTypeBadge = function() {
        //var sprite = new Sprite(new Bitmap(180, 18));
        //sprite.bitmap.fillAll("white");
        //var sprite = new Sprite();
        //var background = new Sprite(ImageManager.loadSystem("Window"));
        //sprite.addChild(background);
        //var text = new Sprite(new Bitmap(180, 18));
        //sprite._textSprite = text;
        //sprite.addChild(text);
    //    var sprite = new Sprite(new Bitmap(180, 24));
    //    this.drawWindowFrame(sprite.bitmap);
    //    this.addChild(sprite);
    //    return sprite;
    //};

    //Window_Preview.prototype.drawWindowFrame = function(bitmap) {
    //    var skin = this.windowskin;
    //    bitmap.blt(skin, 96, 0, 48, 48, 0, 0, bitmap.width, bitmap.height);
    //};

    //--------------------------------------------------------------------------
    // Set preview text
    //--------------------------------------------------------------------------

    Window_Preview.prototype.drawTitle = function(item) {
        var discipline = BattleManager.ITB_UI.getDisciplineImage(item.discipline);
        //var string = BattleManager.ITB_UI.getActionDiscipline(item);
        //console.log("Discipline", string);
        //console.log("Image", discipline);
        var iconSize = 28;
        var spacing = 8;
        this.contents.fontSize = 26;
        var textWidth = this.textWidth(item.name);
        var totalWidth = iconSize + spacing + textWidth;
        var x = Math.floor((this.contentsWidth() - totalWidth) / 2);
        var y = 2;
        this.drawSystemImage(discipline, x, y, iconSize);
        this.drawText(item.name, x + iconSize + spacing, y, totalWidth, "left");
        this.resetFontSettings();
    };

    Window_PreviewType.prototype.setText = function(text) {
        if (this._text === text) return;
        this._text = text;
        this.refresh();
    };

    //--------------------------------------------------------------------------
    // Draw separator
    //--------------------------------------------------------------------------

    Window_Preview.prototype.drawSeparator = function() {
        var x = this.separatorX();
        var y = this.lineHeight();
        var h = this.fittingHeight(1.5);//this.lineHeight() + this.fittingHeight(1);
        this.contents.fillRect(x, y, 2, h, this.normalColor());
    };

    //==========================================================================
    // Window_Base
    //==========================================================================

    //--------------------------------------------------------------------------
    // Icon scaling helper
    //--------------------------------------------------------------------------

    Window_Base.prototype.drawScaledIcon = function(iconIndex, x, y, size) {
        //console.log("Rescale");
        var bitmap = ImageManager.loadSystem('IconSet');
        var pw = Window_Base._iconWidth;
        var ph = Window_Base._iconHeight;
        var sx = (iconIndex % 16) * pw;
        var sy = Math.floor(iconIndex / 16) * ph;
        this.contents.blt(bitmap, sx, sy, pw, ph, x, y, size, size);
        //this.contents.resize(0.5 * pw, 0.5 * ph);
    };

    //--------------------------------------------------------------------------
    // Actor face drawing helper
    //--------------------------------------------------------------------------

    Window_Base.prototype.drawScaledFace = function(actor, x, y) {
        var bitmap = ImageManager.loadFace(actor.faceName());
        var pw = Window_Base._faceWidth;
        var ph = Window_Base._faceHeight;
        var faceIndex = actor.faceIndex();
        var sx = (faceIndex % 4) * pw;
        var sy = Math.floor(faceIndex / 4) * ph;
        this.contents.blt(
            bitmap, 
            sx, 
            sy, 
            pw, 
            ph, 
            x, 
            y, 
            this._actorIconSize, 
            this._actorIconSize
        );
    };

    //--------------------------------------------------------------------------
    // Connector layout constants
    //--------------------------------------------------------------------------

    Window_Base.prototype.connectorIconSize = function() {
        return 20;
    };

    Window_Base.prototype.connectorSpacing = function() {
        return 36;
    };

    Window_Base.prototype.connectorTextWidth = function() {
        return 12;
    };

    //--------------------------------------------------------------------------
    // Connector drawing loop
    //--------------------------------------------------------------------------

    Window_Base.prototype.drawActorConnectors = function(actor, x, y) {
        var names = actor.connectorNames();
        var iconSize = this.connectorIconSize();
        var spacing = this.connectorSpacing();
        this.contents.fontSize = 22;
        names.forEach(function(name, i) {
            var col = i % 3;
            var row = Math.floor(i / 3);
            var drawX = x + col * spacing;
            var drawY = y + row * iconSize + 2;
            var icon = BattleManager.ITB_UI.getDisciplineImage(name);
            //console.log("Icon:", icon);
            this.drawSystemImage(icon, drawX, drawY, iconSize);
            var value = actor.connector(name);
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

    Window_Base.prototype.drawSystemImage = function(filename, x, y, size) {
        var bitmap = ImageManager.loadSystem(filename);
        if (!bitmap.isReady()) {
            bitmap.addLoadListener(function() {
                this.drawSystemImage(filename, x, y, size);
            }.bind(this));
            return;
        }
        var width = size || bitmap.width;
        var height = size || bitmap.height;
        this.contents.blt(bitmap, 0, 0, bitmap.width, bitmap.height, x, y, width, height);
    };

    //==========================================================================
    // Scene_Battle
    //==========================================================================

    //--------------------------------------------------------------------------
    // Update handlers
    //--------------------------------------------------------------------------

    var ITB_Command_SB_update = Scene_Battle.prototype.update;
    Scene_Battle.prototype.update = function() {
        ITB_Command_SB_update.call(this);
        // Use mouse wheel to toggle between actors in battle status window
        if (TouchInput.wheelY >= 20) {
            this.cycleStatusActor(1);
        }
        if (TouchInput.wheelY <= -20) {
            this.cycleStatusActor(-1);
        }
    }

    var ITB_Command_updateWindowPositions = Scene_Battle.prototype.updateWindowPositions;
    Scene_Battle.prototype.updateWindowPositions = function() {
        ITB_Command_updateWindowPositions.call(this);
        // Fix position of battle status window
        this._statusWindow.updateLayout(this._actorCommandWindow.uiWindowHeight());
        if (this._previewWindow) this._previewWindow.updateLayout();
    };

    //--------------------------------------------------------------------------
    // Refresh active actor indicator
    //--------------------------------------------------------------------------
    
    var ITB_Command_SB_startActorCommandSelection = Scene_Battle.prototype.startActorCommandSelection;
    Scene_Battle.prototype.startActorCommandSelection = function() {
        SceneManager._scene._statusWindow.refreshActiveActor();
        this.syncStatusWindowToActiveActor();
        ITB_Command_SB_startActorCommandSelection.call(this);
    };

    var ITB_SB_selectEnemySelection = Scene_Battle.prototype.selectEnemySelection;
    Scene_Battle.prototype.selectEnemySelection = function() {
        this.syncStatusWindowToActiveActor();
        ITB_SB_selectEnemySelection.call(this);
    };

    var ITB_SB_selectActorSelection = Scene_Battle.prototype.selectActorSelection;
    Scene_Battle.prototype.selectActorSelection = function() {
        this.syncStatusWindowToActiveActor();
        ITB_SB_selectActorSelection.call(this);
    };

    //--------------------------------------------------------------------------
    // Create actor window
    //--------------------------------------------------------------------------

    var ITB_Command_createActorWindow = Scene_Battle.prototype.createActorWindow;
    Scene_Battle.prototype.createActorWindow = function() {
        ITB_Command_createActorWindow.call(this);
        this._actorWindow.updateLayout(this._actorCommandWindow.uiWindowHeight());
    };

    //--------------------------------------------------------------------------
    // Actor toggling helper
    //--------------------------------------------------------------------------

    Scene_Battle.prototype.cycleStatusActor = function(direction) {
        if (this._actorCommandWindow.active) {
            this._actorCommandWindow.scrollViewport(direction);
            //this._actorCommandWindow.scrollActions(direction);
            return;
        }
        //if (this._enemyWindow.active || this._actorWindow.active) return; // or cycle targets later
        if (!this._statusWindow) return;
        var members = $gameParty.battleMembers();
        if (members.length <= 1) return;
        var index = this._statusWindow.index();
        if (index < 0) index = BattleManager.actor().index();
        index += direction;
        if (index < 0) index = members.length - 1;
        if (index >= members.length) index = 0;
        this._statusWindow.select(index);
    };

    //--------------------------------------------------------------------------
    // Sync battle status window to the active actor
    //--------------------------------------------------------------------------

    Scene_Battle.prototype.syncStatusWindowToActiveActor = function() {
        if (!this._statusWindow) return;
        var actor = BattleManager.actor();
        if (!actor) return;
        this._statusWindow.setTopRow(actor.index());
    };

    //--------------------------------------------------------------------------
    // Create Preview Window
    //--------------------------------------------------------------------------

    Scene_Battle.prototype.createPreviewWindow = function() {
        var wx = 0;
        var wy = this._statusWindow.y;
        var ww = Graphics.boxWidth;
        var wh = Graphics.boxHeight - wy;
        this._previewWindow = new Window_Preview(wx, wy, ww, wh);
        this.addWindow(this._previewWindow);
    };

    ITB_Command_SB_createAllWindows = Scene_Battle.prototype.createAllWindows;
    Scene_Battle.prototype.createAllWindows = function() {
        ITB_Command_SB_createAllWindows.call(this);
        this.createPreviewWindow();
    };

    //--------------------------------------------------------------------------
    // Update Preview Window
    //--------------------------------------------------------------------------

    Scene_Battle.prototype.updatePreviewWindow = function(item) {
        if (!this._previewWindow) return;
        if (!item) {
            this._previewWindow.clear();
            this._previewWindow.hide();
            return;
        }
        this._previewWindow.setItem(item);
        this._previewWindow.show();
    };

    //--------------------------------------------------------------------------
    // Refresh action interface
    //--------------------------------------------------------------------------

    ITB_Command_SB_queueConnectorAction = Scene_Battle.prototype.queueConnectorAction;
    Scene_Battle.prototype.queueConnectorAction = function(actor, action) {
        ITB_Command_SB_queueConnectorAction.call(this, actor, action);
        if (this._actorCommandWindow) this._actorCommandWindow.confirmSelection();
    };

    //Scene_Battle.prototype.refreshUI = function(actor, action) {
    //    if (this._actorCommandWindow) this._actorCommandWindow.refreshSelection();
    //};

    /* var ITB_Command_WB_initialize = Window_Base.prototype.initialize;
    Window_Base.prototype.initialize = function() {
        ITB_Command_WB_initialize.call(this);
        this.backOpacity = 255;
    }

    Window_Base.prototype.standardBackOpacity = function() {
        return 255;
    };

    Window_Preview.prototype.standardBackOpacity = function() {
        return 255;
    }; */

})();