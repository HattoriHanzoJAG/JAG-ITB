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
    // Game System
    //==========================================================================

    var ITB_Command_GS_initialize = Game_System.prototype.initialize;
    Game_System.prototype.initialize = function() {
        ITB_Command_GS_initialize.call(this);
        // Preview window visibility preference.
        this._itbPreviewVisible = true;
    };

    Game_System.prototype.isITBPreviewVisible = function() {
        return this._itbPreviewVisible !== false;
    };

    Game_System.prototype.toggleITBPreviewVisible = function() {
        this._itbPreviewVisible = !this.isITBPreviewVisible();
        return this._itbPreviewVisible;
    };

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
            { id: "finish", iconIndex: 87 },
            { id: "preview", iconIndex: 245 },
            { id: "sort", iconIndex: 189 }
        ];
    };

    //--------------------------------------------------------------------------
    // Discipline rows
    //--------------------------------------------------------------------------

    BattleManager.ITB_UI.getDisciplineRows = function() {
        //console.log("Get Discipline Rows", this._actionMode);
        var actor = BattleManager.actor();
        var rows = [];
        if (actor) {
            if (this._actionMode === "items") {
                rows = BattleManager.ITB_UI.getItemRows(actor);
            } else {
                rows = BattleManager.ITB_UI.getSkillRows(actor);
            }
            if (this._sortActionsByAvailability) {
                rows = this.sortDisciplineRowsByAvailability(actor, rows);
            }
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
                selectable: BattleManager.ITB_UI.isActionUsable(actor, skill),
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
                selectable: BattleManager.ITB_UI.isActionUsable(actor, item),
            });
        });
        return Object.keys(result).map(key => ({
            discipline: key,
            image: BattleManager.ITB_UI.getDisciplineImage(key),
            actions: result[key]
        }));
    };

    BattleManager.ITB_UI.sortDisciplineRowsByAvailability = function(actor, rows) {
        return rows.map(function(row) {
            // Sort a copy so the original action order remains untouched.
            var actions = row.actions.map(function(action, index) {
                return {
                    action: action,
                    originalIndex: index,
                    priority: BattleManager.ITB_UI.getActionSortPriority(actor, action)
                };
            });
            actions.sort(function(a, b) {
                // Sort by availability category first.
                if (a.priority !== b.priority) return a.priority - b.priority;
                // Preserve original order among actions with the same reason.
                return a.originalIndex - b.originalIndex;
            });
            return {
                discipline: row.discipline,
                image: row.image,
                actions: actions.map(function(entry) {
                    return entry.action;
                })
            };
        });
    };

    BattleManager.ITB_UI.getActionSortPriority = function(actor, actionData) {
        var reason = this.getActionUnavailableReason(actor, actionData);
        if (!reason) return 0;
        switch (reason.type) {
            case "queue_full":
                return 1;
            case "connector":
                return 2;
            case "scope":
                return 3;
            case "unusable":
                return 4;
            default:
                return 5;
        }
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
            deception: "deception-30"
        };
        return images[discipline] || null;
    };

    //--------------------------------------------------------------------------
    // Reconstruct action object
    //--------------------------------------------------------------------------

    BattleManager.ITB_UI.databaseAction = function(actionData) {
        if (!actionData) return null;
        if (actionData.type === "skill") return $dataSkills[actionData.id];
        if (actionData.type === "item") return $dataItems[actionData.id];
        return null;
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

    BattleManager.ITB_UI.isActionUsable = function(actor, action) {
        return actor && actor.canUse(action);
    };

    BattleManager.ITB_UI.isActionUnavailable = function(data) {
        //console.log("Is action unavailable");
        //if (data) console.log("Region:", data.region);
        //if (data && data.region === "actions") console.log("Action:", data.action);
        if (!data || data.region !== "actions" || !data.action) {
            return false;
        }
        var actor = BattleManager.actor();
        if (!actor) return true;
        return !!this.getActionUnavailableReason(actor, data.action);
        /* var item = this.actionObject(data);
        if (item && !this.isActionUsable(actor, item)) return true;
        if (actor && actor.queueLength() >= actor.maxQueuedActions()) {
            //console.log("Max queue length reached");
            return true;
        } */
        //console.log("Connector state validation:", this.isConnectorStateValid(data.action));
        /* console.log(
            "ACTION AVAILABILITY:",
            item ? item.name : null,
            this.isConnectorStateValid(data.action),
            this.getConnectorValidation(item)
        ); */
        //return !this.isConnectorStateValid(data.action);
    };

    BattleManager.ITB_UI.isActionScopeCompatible = function(actor, item, target) {
        if (!actor || !item || !target) return true;
        var action = new Game_Action(actor);
        action.setItemObject(item);
        // Self-targeting actions can only target the active actor.
        if (action.isForUser()) return target === actor;
        // Enemy target.
        if (target.isEnemy()) return action.isForOpponent();
        // Ally target.
        if (target.isActor()) return action.isForFriend();
        return false;
    };

    //----------------------------------------------------------------------------
    // Action unavailability reason
    //----------------------------------------------------------------------------

    BattleManager.ITB_UI.getActionUnavailableReason = function(actor, actionData) {
        //console.log("Get Action Unavailability Reason");
        if (!actor || !actionData) return null;
        var item = this.actionObject(actionData);
        if (!item) return null;
        // 1. Action cannot be used by the actor.
        if (!this.isActionUsable(actor, item)) return {type: "unusable"};
        // 2. Current target is incompatible with the action scope.
        var target = actor._connectorPreviewTarget || this._targetBrowseTarget;
        if (target && !this.isActionScopeCompatible(actor, item, target)) {
            return {
                type: "scope",
                target: target
            };
        }
        // 3. Connector state is invalid.
        if (!this.isConnectorStateValid(item)) {
            var state = BattleManager.ITB_UI._connectorValidationState ||
                BattleManager.connectorValidationState(actor);
            // Determine where the connector state comes from.
            var source = this.connectorPreviewSource(actor);
            var failures = [];
            if (state) {
                DataManager.getDisciplines().forEach(function(discipline) {
                    var row = BattleManager.ITB_UI.previewConnectorRow(
                        state,
                        item,
                        discipline
                    );
                    //console.log("Discipline", discipline);
                    if (row && !row.connectorValid) {
                        failures.push({
                            discipline: discipline,
                            state: BattleManager.ITB_UI.connectorState(row),
                            row: row
                        });
                    }
                    //console.log("Discipline", discipline);
                    //console.log("State:", state);
                });
            }
            return {
                type: "connector",
                source: source ? source.type : null,
                failures: failures
            };
        }
        // 4. Action queue is full.
        var maxQueued = actor.maxQueuedActions();
        if (actor.queueLength() >= maxQueued) {
            return {
                type: "queue_full",
                max: maxQueued
            };
        }
        return null;
    };

    //--------------------------------------------------------------------------
    // Visibility
    //--------------------------------------------------------------------------

    BattleManager.ITB_UI.getVisibleActions = function() {
        return this.getDisciplineRows();
    };

    //--------------------------------------------------------------------------
    // Initiative helper
    //--------------------------------------------------------------------------

    BattleManager.ITB_UI.actionInitiativeCost = function(item) {
        //console.log("Item", item);
        if (!item) return 0;
        //console.log("Meta", item.meta);
        // Skill
        if (item.meta && item.meta.Initiative) {
            //console.log("Initiative", item.meta.Initiative);
            return Number(item.meta.Initiative) || 0;
        }
        // Fallback
        return 0;
    };

    //--------------------------------------------------------------------------
    // Damage helpers
    //--------------------------------------------------------------------------

    BattleManager.ITB_UI.actionAttackInfo = function(actor, item) {
        if (!actor || !item) return null;
        //console.log("Damage", item.damage);
        if (!item.damage || item.damage.type <= 0) return null;
        var formula = item.damage.formula;
        //console.log("Formula", formula);
        if (!formula) return null;
        var attackFormula = this.extractFormula(formula, "a.atk");
        //console.log("Attack Formula", attackFormula);
        if (!attackFormula) return null;
        var a = actor;
        var v = $gameVariables._data;
        try {
            var total = Math.round(eval(attackFormula));
            var bonus = total - actor.atk;
            return {total: total, bonus: bonus};
        } catch (e) {
            console.warn("Failed to evaluate attack formula:", attackFormula, e);
            return null;
        }
    };

    BattleManager.ITB_UI.actionInfluenceInfo = function(actor, item) {
        if (!actor || !item) return null;
        //console.log("Damage", item.damage);
        if (!item.damage || item.damage.type <= 0) return null;
        var formula = item.damage.formula;
        //console.log("Formula", formula);
        if (!formula) return null;
        var influenceFormula = this.extractFormula(formula, "a.mat");
        //console.log("Attack Formula", attackFormula);
        if (!influenceFormula) return null;
        var a = actor;
        var v = $gameVariables._data;
        try {
            var total = Math.round(eval(influenceFormula));
            var bonus = total - actor.mat;
            return {total: total, bonus: bonus};
        } catch (e) {
            console.warn("Failed to evaluate attack formula:", influenceFormula, e);
            return null;
        }
    };

    BattleManager.ITB_UI.extractFormula = function(formula, text) {
        if (!formula) return "";
        // Normalize subtraction:
        // "3*a.atk/2 - b.def + 20" -> "3*a.atk/2 + - b.def + 20"
        var normalized = formula.replace(/-/g, "+-");
        var terms = normalized.split("+");
        var attackTerms = terms.filter(function(term) {
            return term.indexOf(text) >= 0;
        });
        return attackTerms.join(" + ");
    };

    //--------------------------------------------------------------------------
    // Main preview connector helper
    //--------------------------------------------------------------------------

    BattleManager.ITB_UI.previewConnectorRows = function(actor, actionData) {
        console.log("Preview connector rows");
        //console.log("Actor", actor);
        //console.log("Action", actionData);
        if (!actor || !actionData) return [];
        this.refreshConnectorValidation(actor);
        var item = this.actionObject(actionData);
        //console.log("Item", item);
        if (!item) return [];
        var state = this._connectorValidationState;
        //console.log("Connector state", state);
        if (!state) return [];
        return this.buildPreviewConnectorRows(state, item);
    };

    //--------------------------------------------------------------------------
    // Connector validation helper
    //--------------------------------------------------------------------------

    BattleManager.ITB_UI.connectorPreviewSource = function(actor) {
        //console.log("Connector preview source");
        if (!actor) return null;
        var last = actor.lastQueuedAction();
        //console.log("Last action:", last);
        // Continuing a connector chain: show the previously queued action.
        if (last) {
            return {
                type: "action",
                action: last
            };
        }
        //console.log("Preview target:", actor._connectorPreviewTarget);
        //console.log("Preview target sprite:", actor._connectorPreviewTargetSprite);
        // First action: show the selected target.
        if (actor._connectorPreviewTarget) {
            return {
                type: "target",
                battler: actor._connectorPreviewTarget//,
                //sprite: actor._connectorPreviewTargetSprite
            };
        }
        return null;
    };

    //--------------------------------------------------------------------------
    // Recover database object
    //--------------------------------------------------------------------------

    BattleManager.ITB_UI.actionObject = function(actionData) {
        if (!actionData) return null;
        // UI action data
        if (actionData.type) {
            if (actionData.type === "skill") return $dataSkills[actionData.id];
            if (actionData.type === "item") return $dataItems[actionData.id];
            return null;
        }
        // Queued action data (currently skills only)
        if (actionData.skillId) return $dataSkills[actionData.skillId];
        return null;
    };

    //--------------------------------------------------------------------------
    // Build preview connector list
    //--------------------------------------------------------------------------

    BattleManager.ITB_UI.buildPreviewConnectorRows = function(state, item) {
        console.log("Build perview connector rows");
        var rows = [];
        if (!state || !item) return rows;
        //console.log("Disciplines", DataManager.getDisciplines());
        DataManager.getDisciplines().forEach(function(name) {
            var row = BattleManager.ITB_UI.previewConnectorRow(
                state,
                item,
                name
            );
            //console.log("Row", row);
            if (row) rows.push(row);
        });
        return rows;
    };

    //--------------------------------------------------------------------------
    // Create single preview connector row
    //--------------------------------------------------------------------------

    BattleManager.ITB_UI.previewConnectorRow = function(state, item, discipline) {
        //console.log("Preview connector row:", discipline);
        //console.log("State", state);
        //console.log("Item", item);
        var inputConnectors = item.inputConnectors || {};
        var outputConnectors = item.outputConnectors || {};
        var input = inputConnectors[discipline];
        var output = outputConnectors[discipline];
        var current = state[discipline];
        if (current === undefined && !input && !output) return null;
        var validation = BattleManager.ITB_UI.getConnectorValidation(item);
        var connectorValid = validation &&
            Object.prototype.hasOwnProperty.call(validation, discipline)
                ? validation[discipline]
                : true
        //if (input) {
        //    connectorValid = Game_Action.prototype.canConnectToState(state);
        //}
        return {
            discipline: discipline,
            current: current,
            input: input || null,
            output: output || null,
            strict: state._connectorRules && state._connectorRules[discipline] === "strict",
            connectorValid: connectorValid
        };
    };

    //--------------------------------------------------------------------------
    // Get connector output value
    //--------------------------------------------------------------------------

    BattleManager.ITB_UI.getConnectorOutputValue = function(output) {
        if (!output) return undefined;
        return output.value;
    };

    //--------------------------------------------------------------------------
    // Read-oriented cache of connector conditions
    //--------------------------------------------------------------------------

    BattleManager.ITB_UI.refreshConnectorValidation = function(actor, target) {
        //console.log("Refresh connector validation")
        this._connectorValidation = {};
        this._connectorValidationState = null;
        if (!actor) return;
        var state = BattleManager.connectorValidationState(
            actor,
            target || this._targetBrowseTarget
        );
        //console.log("State:", state);
        if (!state) return;
        this._connectorValidationState = JsonEx.makeDeepCopy(state);
        var skills = actor.skills();
        for (var i = 0; i < skills.length; i++) {
            var item = skills[i];
            if (!item) continue;
            var action = new Game_Action(actor);
            action.setSkill(item.id);
            this._connectorValidation[item.id] = action.connectorValidation(state);
        }
    };

    //--------------------------------------------------------------------------
    // Connector validation helpers
    //--------------------------------------------------------------------------

    BattleManager.ITB_UI.getConnectorValidation = function(item) {
        if (!item) return null;
        //console.log("Connector validation:", this._connectorValidation[item.id] || null);
        return this._connectorValidation[item.id] || null;
    };

    BattleManager.ITB_UI.isConnectorStateValid = function(item) {
        //console.log("Is Connector State Valid");
        //console.log("Item", item);
        var validation = this.getConnectorValidation(item);
        //console.log("Connector validation:", validation);
        //console.log("Validation", validation);
        if (!validation) return false;
        var keys = Object.keys(validation);
        //console.log("Connector keys:", keys);
        for (var i = 0; i < keys.length; i++) {
            if (!validation[keys[i]]) return false;
        }
        return true;
    };

    BattleManager.ITB_UI.connectorState = function(data) {
        var hasInput = (data.current !== undefined);
        var hasConnector = !!data.input;
        var hasCondition = hasConnector && !!data.input.type;
        // No connector and no input value: nothing needs to be displayed.
        if (!hasInput && !hasConnector) return null;
        // Action has a connector, but without a condition.
        if (hasConnector && !hasCondition) return "unconditional";
        // Action has a condition, but the source has no value.
        if (!hasInput && hasCondition) return "disconnected";
        // Input value exists and action has a condition to evaluate.
        if (hasInput && hasCondition) return "conditional";
        // Input value exists, but action does not have a connector.
        // Strict/lax indicator determines whether this is valid.
        if (hasInput && !hasConnector) {
            return data.strict ? "invalid" : "valid";
        }
        return null;
    };

    BattleManager.ITB_UI.connectorValidationState = function(actor) {
        return BattleManager.connectorValidationState(actor, this._targetBrowseTarget);
    };

    //--------------------------------------------------------------------------
    // State preview data
    //--------------------------------------------------------------------------

    BattleManager.ITB_UI.getActionStatePreview = function(actor, item) {
        if (!actor || !item || !item.selfState) return null;
        var state = $dataStates[item.selfState.stateId];
        if (!state) return null;
        var initiative = actor._initiative || 0;
        return {
            stateId: item.selfState.stateId,
            delay: item.selfState.offset,
            duration: null
        };
    };

    //--------------------------------------------------------------------------
    // Target browse cursor
    //--------------------------------------------------------------------------

    /* BattleManager.ITB_UI._targetBrowseIndex = -1;

    BattleManager.ITB_UI.setTargetBrowseIndex = function(index) {
        var targets = this.getTargetBrowseTargets();
        if (!targets.length) {
            this._targetBrowseIndex = -1;
            return;
        }
        index = Math.max(0, Math.min(index, targets.length - 1));
        this._targetBrowseIndex = index;
    };

    BattleManager.ITB_UI.getTargetBrowseIndex = function(target) {
        if (!target) return -1;
        var targets = this.getTargetBrowseTargets();
        return targets.indexOf(target);
    }; */

    //--------------------------------------------------------------------------
    // Target browsing helpers
    //--------------------------------------------------------------------------

    BattleManager.ITB_UI.setTargetBrowseTarget = function(target) {
        this._targetBrowseTarget = target || null;
    };

    BattleManager.ITB_UI.clearTargetBrowseTarget = function() {
        this._targetBrowseTarget = null;
    };

    BattleManager.ITB_UI.isTargetBrowsing = function() {
        return !!this._targetBrowseTarget;
    };

    BattleManager.ITB_UI.updateTargetBrowse = function(target) {
        var actor = BattleManager.actor();
        if (!actor || !target) return;
        //console.log(
        //    "TARGET BROWSE:",
        //    target.name(),
        //    target.index()
        //);
        // Once a target has been accepted, target browsing is finished.
        // The accepted target is now authoritative.
        if (actor._connectorPreviewTarget) return;
        this.setTargetBrowseTarget(target);
        this.refreshConnectorValidation(actor, target);
        //console.log(
        //    "TARGET VALIDATION:",
        //    this._connectorValidation
        //);
    };

    /* BattleManager.ITB_UI.getTargetBrowseTargets = function() {
        var targets = [];
        var enemies = $gameTroop.aliveMembers().slice();
        var actors = $gameParty.aliveMembers().slice();
        enemies.sort(function(a, b) {
            if (a.spritePosX() === b.spritePosX()) {
                return a.spritePosY() - b.spritePosY();
            }
            return a.spritePosX() - b.spritePosX();
        });
        actors.sort(function(a, b) {
            if (a.spritePosX() === b.spritePosX()) {
                return a.spritePosY() - b.spritePosY();
            }
            return a.spritePosX() - b.spritePosX();
        });
        targets = targets.concat(enemies);
        targets = targets.concat(actors);
        return targets;
    };

    BattleManager.ITB_UI.getTargetBrowseTarget = function(index) {
        var targets = this.getTargetBrowseTargets();
        if (index < 0 || index >= targets.length) return null;
        return targets[index];
    };

    BattleManager.ITB_UI.getTargetBrowseWindow = function(target) {
        if (!target) return null;
        var scene = SceneManager._scene;
        if (!scene) return null;
        if (target.isEnemy()) {
            return {
                window: scene._enemyWindow,
                index: scene._enemyWindow
                    ? scene._enemyWindow._enemies.indexOf(target)
                    : -1
            };
        }
        if (target.isActor()) {
            return {
                window: scene._actorWindow,
                index: scene._actorWindow._actors
                    ? scene._actorWindow._actors.indexOf(target)
                    : $gameParty.members().indexOf(target)
            };

        }
        return null;
    };

    BattleManager.ITB_UI.showTargetBrowseTarget = function(index) {
        var target = this.getTargetBrowseTarget(index);
        if (!target) return;
        var scene = SceneManager._scene;
        if (!scene) return;
        var mapping = this.getTargetBrowseWindow(target);
        if (!mapping || !mapping.window || mapping.index < 0) {
            return;
        }
        var window = mapping.window;
        // Hide and deactivate the other target window.
        if (window === scene._enemyWindow) {
            scene._actorWindow.hide();
            scene._actorWindow.deactivate();
        } else if (window === scene._actorWindow) {
            scene._enemyWindow.hide();
            scene._enemyWindow.deactivate();
        }
        window.refresh();
        window.show();
        window.connectorPreviewSelect(mapping.index);
        window.activate();
        this.updateTargetBrowse(target);
    };

    //--------------------------------------------------------------------------
    // Target browse movement function
    //--------------------------------------------------------------------------

    BattleManager.ITB_UI.moveTargetBrowse = function(direction) {
        var targets = this.getTargetBrowseTargets();
        if (!targets.length) return;
        var currentIndex = this._targetBrowseIndex;
        if (currentIndex < 0) {
            currentIndex = 0;
        } else {
            currentIndex += direction;
            if (currentIndex < 0) {
                currentIndex = targets.length - 1;
            }
            if (currentIndex >= targets.length) {
                currentIndex = 0;
            }
        }
        this.setTargetBrowseIndex(currentIndex);
        this.showTargetBrowseTarget(currentIndex);
    }; */

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
        this._preserveActionState = !!actor && this._actor === actor && !!this._actionSprites;
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
        if (!this._preserveActionState || !this._selection) {
            this._selection = {
                region: undefined,
                row: -1,
                column: -1
            };
            this._scrollRow = 0;
        }
        this._hoverSelection = null;
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
        BattleManager.ITB_UI.refreshConnectorValidation(BattleManager.actor());
        var commands = BattleManager.ITB_UI.getMainCommands();
        var rows = BattleManager.ITB_UI.getDisciplineRows();
        this.drawMainCommands(commands);
        //console.log("Draw rows");
        this.drawDisciplineRows(rows);
        //console.log(
        //    this._selection,
        //    this._scrollRow,
        //    this.currentSelectionSprite()
        //);
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
        //this.clearSelectionHighlights();
        var selected = this.currentSelectionSprite();
        if (!selected || !selected._queueMarker) return;
        //selected.opacity = 255;
        //selected.setBlendColor([255, 255, 100, 64]);
        // Invalid connector actions may be previewed, but cannot be confirmed.
        //if (BattleManager.ITB_UI.isActionUnavailable(selected._uiData)) {
        //    return;
        //}
        if (selected._actionUnavailable) return;
        // Already confirmed: keep the queue marker visible.
        if (selected._queueMarker.visible) {
            selected._queueMarker.visible = false;
            this.clearSelectionHighlights();
            this._pendingCommand = "repeatAction";
            this._commandDelay = 2;
            return;
        }
        //selected._queueMarker.visible = !selected._queueMarker.visible;
        // New confirmation
        selected._queueMarker.visible = true;
        this.refreshSelection();
        //this.requestITBRefresh();
        //this.updatePreviewWindow(selected);
    };

    Window_ActorCommand.prototype.refreshSelection = function() {
        console.log("Refresh Selection");
        if (BattleManager.actor()) {
            console.log("Action queue", BattleManager.actor()._actionQueue);
            console.log("Queue length", BattleManager.actor().queueLength());
        }
        this.clearSelectionHighlights();
        var selected = this.currentSelectionSprite();
        //console.log("SELECT", selected);
        // No valid selection: nothing to preview.
        if (!selected || !selected._uiData) {
            //if (this._selectionBorder) this._selectionBorder.visible = false;
            this.updatePreviewWindow(null);
            return;
        }
        // If Preview mode is off, an unavailable action should never remain
        // selected. This can happen when the viewport is scrolled onto
        // a row containing only unavailable actions.
        // Use Finish as the fallback selection, but deliberately do NOT
        // call ensureSelectionVisible(), because the viewport position
        // must remain unchanged.
        if (
            !$gameSystem.isITBPreviewVisible() &&
            selected._uiData.region === "actions" &&
            BattleManager.ITB_UI.isActionUnavailable(selected._uiData)
        ) {
            this.selectFinishCommand();
            selected = this.currentSelectionSprite();
            if (!selected || !selected._uiData) {
                this.updatePreviewWindow(null);
                return;
            }
        }
        this.refreshQueueMarkers(selected);
        // Don't highlight an action that has already been confirmed.
        if (BattleManager.ITB_UI.isActionUnavailable(selected._uiData)) {
            // Selected, but still visibly greyed out.
            selected.opacity = 160;
            selected.setBlendColor([180, 180, 180, 80]);        
            selected._actionUnavailable = true;
        } else {
            // Normal selected-action appearance.
            selected.opacity = 255;
            selected.setBlendColor([255, 255, 100, 64]);
        }
        //selected.opacity = 255;
        //selected.setBlendColor([255, 255, 100, 64]);
        selected.scale.x = this.uiSelectScale();
        selected.scale.y = this.uiSelectScale();
        //}
        this.updatePreviewWindow(selected);
    };

    Window_ActorCommand.prototype.refreshQueueMarkers = function(selected) {
        this._actionSprites.forEach(function(sprite) {
            var mark = sprite._queueMarker;
            if (!mark) return;
            sprite._queueMarker.visible = (sprite === selected) ? mark.visible : false;
        });
    };

    //--------------------------------------------------------------------------
    // Clear selection visuals
    //--------------------------------------------------------------------------

    Window_ActorCommand.prototype.clearSelectionHighlights = function() {
        //console.log("Clear selection highlights");
        var scale = this.uiIconScale();
        var selected = this.currentSelectionSprite();
        this._actionSprites.forEach(function(sprite) {
            if (sprite === selected) return;
            sprite.scale.x = scale;
            sprite.scale.y = scale;
            var data = sprite._uiData;
            var unavailable = BattleManager.ITB_UI.isActionUnavailable(data);
            //console.log("Action unavailable", unavailable);
            sprite._actionUnavailable = unavailable;
            if (unavailable) {
                sprite.opacity = 100;
                sprite.setBlendColor([0, 0, 0, 100]);
            } else {
                sprite.opacity = 215;
                sprite.setBlendColor([0, 0, 0, 0]);
            }
        });
    };

    Window_ActorCommand.prototype.clearActionSelection = function() {
        if (!this._selection || this._selection.region !== "actions") return;
        this.hideITBActionWindow();
        this._selection = {region: "commands", row: -1, column: -1};
        this.clearSelectionHighlights();
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
                case "repeatAction":
                    this.repeatAction();
                    break;
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
                case "preview":
                    this.togglePreviewWindow();
                    break;
                case "sort":
                    this.toggleActionSorting();
                    break;
                }
            }	
        }
        this.updateITBActionPanel();
        this.updateSelectionInput();
        if (Input.isTriggered("ok")) this.processITBOk();
    };

    Window_ActorCommand.prototype.updateITBActionPanel = function() {
        this.updateActorTracking();
        if (this._actionSprites) this.clearSelectionHighlights();
        if (this._needsRefresh) {
            this.refreshITBActionPanel();
            this._needsRefresh = false;
        }
        //if (!this._pendingActionPreview) return;
        //if (!this.active || !this.visible) return;
        // Consume the pending preview before restoring the selection.
        /* var pending = this._pendingActionPreview;
        this._pendingActionPreview = null;
        this._selection = {
            region: pending.region,
            row: pending.row,
            column: pending.column
        }; */
        // Highlight and preview only. Do not confirm the action.
        //this.refreshSelection();
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
        //console.log("Clear Actions:", this.children.length);
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
        if (!this.active) {
            // An inactive command window should not retain an action selection
            // or preview. If this causes issues in other UI flows later, restrict
            // this cleanup to BattleManager._connectorTargetMode.
            this.clearActionSelection();
            this.updatePreviewWindow(null);
            return;
        }
        //if (TouchInput.isCancelled()) this.onCommandSelected("undo");
        this.updateScrollArrows();
        //this.updateMouseSelection();
        this.updateMouseClick();
        //this.updateWheelInput();
        if (Input.isRepeated("left")) this.itbCursorLeft();
        if (Input.isRepeated("right")) this.itbCursorRight();
        if (Input.isRepeated("up")) this.itbCursorUp();
        if (Input.isRepeated("down")) this.itbCursorDown();
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
        this.hideITBActionWindow();
        if (!sprite || !this.isActionSelectable(sprite)) return;
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
        var x = TouchInput.x - this.x;
        var y = TouchInput.y - this.y;
        var sprite = this.hitTestActionSprite(x, y);
        if (!sprite || !this.isActionSelectable(sprite)) {
            console.log("CLICK: no selectable sprite");
            return;
        }
        // Special handling during connector target preselection.
        if (BattleManager._connectorTargetMode) {
            // Commands can be used without confirming a target.
            if (sprite._uiData.region === "commands") {
                var command = sprite._uiData.command;
                // These commands are not relevant during target preselection.
                if (!command || command.id === "undo" || command.id === "finish") {
                    return;
                }
                this.updateMouseSelection(sprite);
                this.onCommandSelected(command);
                return;
            }
            if (sprite._uiData.region !== "actions") return;
            // An unavailable action may still be inspected when Preview is on,
            // but it must not trigger target confirmation.
            //if (BattleManager.ITB_UI.isActionUnavailable(sprite._uiData)) {
            //    this.updateMouseSelection(sprite);
            //    return;
            //}
            var scene = SceneManager._scene;
            var targetWindow = scene.connectorTargetWindow();
            if (!targetWindow) return;
            var target = targetWindow === scene._actorWindow
                ? targetWindow.actor()
                : targetWindow.enemy();
            if (!target) return;
            // Store only the coordinates needed to restore the preview.
            // This is separate from the normal selection and confirmation flow.
            /* this._pendingActionPreview = {
                region: sprite._uiData.region,
                row: sprite._uiData.row,
                column: sprite._uiData.column
            }; */
            // Confirm the currently highlighted target using the existing handler.
            if (targetWindow === scene._actorWindow) {
                scene.onActorOk();
            } else {
                scene.onEnemyOk();
            }
            this._pendingCommand = null;
            return;
        }
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

    Window_ActorCommand.prototype.itbCursorLeft = function() {
        //if (this.selectedRegion() === "actions") {
        if (this.selectedRegion() === "commands") {
            this.moveITBCommandSelection(-1, 0);
            return;
        }
        var rows = BattleManager.ITB_UI.getDisciplineRows();
        if (!rows) return;
        var row = rows[this.selectedRow()];
        if (!row) return;
        var column = this._selection.column;
        this._selection.column--;
        if (this._selection.column < 0) this._selection.column = 0;
        // When preview is hidden, skip unavailable actions.
        if (!$gameSystem.isITBPreviewVisible()) {
            while (
                this._selection.column > 0 &&
                row.actions[this._selection.column] &&
                BattleManager.ITB_UI.isActionUnavailable({
                    region: "actions",
                    row: this.selectedRow(),
                    column: this._selection.column,
                    action: row.actions[this._selection.column]
                })
            ) {
                this._selection.column--;
            }
            // Nothing selectable further left: restore original selection.
            if (this._selection.column < 0) {
                this._selection.column = column;
            }
        }
        //}
        if (this.ensureSelectionVisible()) this.requestITBRefresh();
        this.hideITBActionWindow();
        this.refreshSelection();
    };

    Window_ActorCommand.prototype.itbCursorRight = function() {
        if (this.selectedRegion() === "commands") {
            this.moveITBCommandSelection(1, 0);
            return;
        } else if (this.selectedRegion() === "actions") {
            var rows = BattleManager.ITB_UI.getDisciplineRows();
            if (!rows) return;
            var row = rows[this.selectedRow()];
            if (!row) return;
            var column = this._selection.column;
            this._selection.column++;
            if (this._selection.column >= row.actions.length) {
                this._selection.column = row.actions.length - 1;
            }
            // When preview is hidden, skip unavailable actions.
            if (!$gameSystem.isITBPreviewVisible()) {
                while (
                    this._selection.column < row.actions.length &&
                    row.actions[this._selection.column] &&
                    BattleManager.ITB_UI.isActionUnavailable({
                        region: "actions",
                        row: this.selectedRow(),
                        column: this._selection.column,
                        action: row.actions[this._selection.column]
                    })
                ) {
                    this._selection.column++;
                }
                // Nothing selectable further right: restore original selection.
                if (this._selection.column >= row.actions.length) {
                    this._selection.column = column;
                }
            }
        }
        if (this.ensureSelectionVisible()) this.requestITBRefresh();
        this.hideITBActionWindow();
        this.refreshSelection();
    };

    Window_ActorCommand.prototype.itbCursorUp = function() {
        //console.log("CURSOR UP", this._selection.row, this._scrollRow);     
        if (this.selectedRegion() === "commands") {
            this.moveITBCommandSelection(0, -1);
            return;
        } else if (this.selectedRegion() === "actions") {
            var rows = BattleManager.ITB_UI.getDisciplineRows();
            if (!rows) return;
            var row = this.selectedRow();
            var column = this.selectedColumn();
            this._selection.row--;
            if (this._selection.row < 0) this._selection.row = 0;
            // When preview is hidden, skip unavailable actions.
            if ($gameSystem.isITBPreviewVisible()) {
                var newRow = rows[this._selection.row];
                if (newRow && newRow.actions.length > 0) {
                    this._selection.column = Math.min(
                        column,
                        newRow.actions.length - 1
                    );
                }
            } else {
                // Preview hidden: skip unavailable actions.
                var found = false;
                while (this._selection.row >= 0) {
                    var newRow = rows[this._selection.row];
                    if (newRow && newRow.actions.length > 0) {
                        var candidateColumn = Math.min(
                            column,
                            newRow.actions.length - 1
                        );
                        while (candidateColumn >= 0) {
                            var candidate = newRow.actions[candidateColumn];
                            var data = {
                                region: "actions",
                                row: this._selection.row,
                                column: candidateColumn,
                                action: candidate
                            };
                            if (!BattleManager.ITB_UI.isActionUnavailable(data)) {
                                this._selection.column = candidateColumn;
                                found = true;
                                break;
                            }
                            candidateColumn--;
                        }
                    }
                    if (found) break;
                    this._selection.row--;
                    if (this._selection.row < 0) break;
                }
                // Nothing selectable above: restore original selection.
                if (!found) {
                    this._selection.row = row;
                    this._selection.column = column;
                }
            }
        }
        if (this.ensureSelectionVisible()) this.requestITBRefresh();
        this.hideITBActionWindow();
        this.refreshSelection();
    };

    Window_ActorCommand.prototype.itbCursorDown = function() {
        //console.log("CURSOR DOWN", this._selection.row, this._scrollRow);
        if (this.selectedRegion() === "commands") {
            this.moveITBCommandSelection(0, 1);
            return;
        } else if (this.selectedRegion() === "actions") {
            var rows = BattleManager.ITB_UI.getDisciplineRows();
            if (!rows) return;
            var row = this.selectedRow();
            var column = this.selectedColumn();
            this._selection.row++;
            if (this._selection.row >= rows.length) {
                this._selection.row = rows.length - 1;
            }
            // When preview is hidden, skip unavailable actions.
            if ($gameSystem.isITBPreviewVisible()) {
                var newRow = rows[this._selection.row];
                if (newRow && newRow.actions.length > 0) {
                    this._selection.column = Math.min(
                        column,
                        newRow.actions.length - 1
                    );
                }
            } else {
                // Preview hidden: skip unavailable actions.
                var found = false;
                while (this._selection.row < rows.length) {
                    var newRow = rows[this._selection.row];
                    if (newRow && newRow.actions.length > 0) {
                        var candidateColumn = Math.min(
                            column,
                            newRow.actions.length - 1
                        );
                        while (candidateColumn >= 0) {
                            var candidate = newRow.actions[candidateColumn];
                            // If the preferred column is unavailable, search left.
                            var data = {
                                region: "actions",
                                row: this._selection.row,
                                column: candidateColumn,
                                action: candidate
                            };
                            if (!BattleManager.ITB_UI.isActionUnavailable(data)) {
                                this._selection.column = candidateColumn;
                                found = true;
                                break;
                            }
                            candidateColumn--;
                        }
                    }
                    if (found) break;
                    this._selection.row++;
                    if (this._selection.row >= rows.length) break;
                }
                // Nothing selectable below: restore original selection.
                if (!found) {
                    this._selection.row = row;
                    this._selection.column = column;
                }
            }
        }
        if (this.ensureSelectionVisible()) this.requestITBRefresh();
        this.hideITBActionWindow();
        this.refreshSelection();
    };

    Window_ActorCommand.prototype.moveITBCommandSelection = function(dx, dy) {
        var commands = BattleManager.ITB_UI.getMainCommands();
        if (!commands || commands.length === 0) return;
        var row = this.selectedRow();
        var column = this.selectedColumn();
        var newRow = row + dy;
        var newColumn = column + dx;
        var maxRow = Math.floor((commands.length - 1) / 2);
        // Stay within the two-column command grid.
        newRow = Math.max(0, Math.min(newRow, maxRow));
        newColumn = Math.max(0, Math.min(newColumn, 1));
        // Convert the destination row and column to the command index.
        var index = newRow * 2 + newColumn;
        // Do not select a nonexistent command.
        if (index >= commands.length) return;
        this._selection.row = newRow;
        this._selection.column = newColumn;
        this.hideITBActionWindow();
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
        if (!data || !this.isActionSelectable(data)) return;
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
        var actor = BattleManager.actor();
        var reason = BattleManager.ITB_UI.getActionUnavailableReason(actor, data);
        var scene = SceneManager._scene;
        // Maximum queued actions and connector validation
        if (reason) {
            SoundManager.playBuzzer();
            if (scene._itbActionWindow) {
                scene._itbActionWindow.showReason(reason, data);
            }
            return;
        }
        /* if (BattleManager.ITB_UI.isActionUnavailable(data)) {
            SoundManager.playBuzzer();
            return;
        } */
        if (scene._itbActionWindow) scene._itbActionWindow.hide();
        var action = BattleManager.inputtingAction();
        if (!action) return;
        //console.log(SceneManager._scene._actorWindow.active);
        //console.log(SceneManager._scene._enemyWindow.active);
        if (data.type === "skill") {
            action.setSkill(data.id);
            actor.setLastBattleSkill($dataSkills[data.id]);
        } else if (data.type === "item") {
            action.setItem(data.id);
            $gameParty.setLastItem($dataItems[data.id]);
        }
        //console.log("Enemy Window Active?:", SceneManager._scene._enemyWindow.active);
        //console.log("Needs Selection?", action.needsSelection());
        //console.log("Enemy Selection?", action.isForOpponent());
        scene.onSelectAction();
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

    Window_ActorCommand.prototype.isActionSelectable = function(sprite) {
        if (!sprite || !sprite._uiData) return false;
        // Command sprites are always selectable.
        if (sprite._uiData.region !== "actions") return true;
        // When preview is visible, unavailable actions can still be
        // selected so their preview can be inspected.
        if ($gameSystem.isITBPreviewVisible()) return true;
        // When preview is hidden, unavailable actions cannot be selected.
        return !sprite._actionUnavailable;
    };

    Window_ActorCommand.prototype.selectFinishCommand = function() {
        var commands = BattleManager.ITB_UI.getMainCommands();
        for (var i = 0; i < commands.length; i++) {
            if (commands[i].id === "finish") {
                this._selection = {
                    region: "commands",
                    row: Math.floor(i / 2),
                    column: i % 2
                };
                return;
            }
        }
    };

    //--------------------------------------------------------------------------
    // Hit-test helper
    //--------------------------------------------------------------------------

    Window_ActorCommand.prototype.hitTestActionSprite = function(localX, localY) {
        for (var i = this._actionSprites.length - 1; i >= 0; i--) {
            var sprite = this._actionSprites[i];
            if (!sprite._uiData || !sprite.visible) continue;
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

    Window_ActorCommand.prototype.debugITBState = function(event, extra) {
        if (!this._itbDebugLog) this._itbDebugLog = [];
        var selected = this.currentSelectionSprite();
        this._itbDebugLog.push({
            event: event,
            frame: Graphics.frameCount,
            active: this.active,
            scrollRow: this._scrollRow,
            selection: this._selection ? {
                region: this._selection.region,
                row: this._selection.row,
                column: this._selection.column
            } : null,
            selectedSprite: selected && selected._uiData ? {
                region: selected._uiData.region,
                row: selected._uiData.row,
                column: selected._uiData.column,
                actionId: selected._uiData.action
                    ? selected._uiData.action.id
                    : null,
                actionName: selected._uiData.action
                    ? selected._uiData.action.name
                    : null,
                x: selected.x,
                y: selected.y,
                scaleX: selected.scale.x,
                scaleY: selected.scale.y
            } : null,
            visibleActions: this._actionSprites.map(function(sprite) {
                var data = sprite._uiData;
                var action = data && data.action;

                return {
                    row: data ? data.row : null,
                    column: data ? data.column : null,
                    actionId: action ? action.id : null,
                    actionName: action ? action.name : null,
                    x: sprite.x,
                    y: sprite.y
                };
            }),
            extra: extra || null
        });
    };

    //--------------------------------------------------------------------------
    // Repeat action wrapper
    //--------------------------------------------------------------------------

    Window_ActorCommand.prototype.repeatAction = function() {
        console.log("REPEAT ACTION");
        var selected = this.currentSelectionSprite();
        if (!selected || !selected._queueMarker) return;
        selected._queueMarker.visible = true;
        this.refreshSelection();
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
    //-------------------------------------------------------------------------

    Window_ActorCommand.prototype.executeFinishCommand = function() {
        console.log("FINISH");
        //this.refreshSelection();
        this.deactivate();
        BattleManager.ITB_UI.clearTargetBrowseTarget();
        SceneManager._scene.finishActionQueue();
        /* if (this._finishPending) return;		
        this.refreshSelection();
        this._finishPending = true;
        this._finishDelay = 1;	 */
        //if (BattleManager.finishActionQueue) BattleManager.finishActionQueue();
    };

    //--------------------------------------------------------------------------
    // Preview toggle wrapper
    //--------------------------------------------------------------------------

    Window_ActorCommand.prototype.togglePreviewWindow = function() {
        var visible = $gameSystem.toggleITBPreviewVisible();
        var scene = SceneManager._scene;
        if (!scene) return;
        scene.setPreviewWindowVisible(visible);
    };

    //--------------------------------------------------------------------------
    // Sort toggle wrapper
    //--------------------------------------------------------------------------

    Window_ActorCommand.prototype.toggleActionSorting = function() {
        BattleManager.ITB_UI._sortActionsByAvailability =
            !BattleManager.ITB_UI._sortActionsByAvailability;
        //this.requestITBRefresh();
    };

    //--------------------------------------------------------------------------
    // Keep selection valid after switching mode
    //--------------------------------------------------------------------------

    Window_ActorCommand.prototype.showActionsCommand = function(mode) {
        if (BattleManager.ITB_UI._actionMode === mode) return;
        console.log("SHOW ACTIONS", {
            mode: mode,
            currentMode: BattleManager.ITB_UI._actionMode,
            selection: this._selection,
            scrollRow: this._scrollRow
        });
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
        console.log(new Error().stack);
        var oldScroll = this._scrollRow;
        var selectionRow = this._selection.row;
        var visibleRows = this.visibleRows();
        var maxScroll = this.maxScrollRow();
        if (this._selection.row < this._scrollRow) {
            this._scrollRow = this._selection.row;
        }
        if (this._selection.row >= this._scrollRow + this.visibleRows()) {
            this._scrollRow = this._selection.row - this.visibleRows() + 1;
        }
        this._scrollRow = Math.max(0, Math.min(this._scrollRow, this.maxScrollRow()));
        if (oldScroll !== this._scrollRow) {
            console.warn("[ITB scroll changed] ensureSelectionVisible", {
                oldScrollRow: oldScroll,
                newScrollRow: this._scrollRow,
                selectionRow: selectionRow,
                visibleRows: visibleRows,
                maxScrollRow: maxScroll,
                selectionRegion: this._selection.region,
                selectionColumn: this._selection.column,
                selectedAction: (function(window) {
                    var sprite = window.currentSelectionSprite();
                    var action = sprite && sprite._uiData
                        ? sprite._uiData.action
                        : null;
                    return action
                        ? { id: action.id, name: action.name }
                        : null;
                })(this)
            });
        }
        return oldScroll !== this._scrollRow;
    };

    Window_ActorCommand.prototype.scrollITBActionRows = function(direction) {
        var maxScroll = this.maxScrollRow();
        if (maxScroll <= 0) return;
        var oldScrollRow = this._scrollRow;
        this._scrollRow += direction;
        this._scrollRow = Math.max(0, Math.min(this._scrollRow, maxScroll));
        if (this._scrollRow === oldScrollRow) return;
        this.clearITBActionSprites();
        var commands = BattleManager.ITB_UI.getMainCommands();
        var rows = BattleManager.ITB_UI.getDisciplineRows();
        this.drawMainCommands(commands);
        this.drawDisciplineRows(rows);
        this.refreshSelection();
        this.updateScrollArrows();
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
        // If Finish is currently selected as the fallback while
        // Preview mode is off, keep the selection on Finish.
        // The viewport is allowed to move independently of the
        // selection in this situation.
        if (
            !$gameSystem.isITBPreviewVisible() &&
            this._selection.region === "commands"
        ) {
            this.requestITBRefresh();
            return;
        }
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
    // Mouse wheel handling functionality
    //--------------------------------------------------------------------------

    /* Window_ActorCommand.prototype.updateWheelInput = function() {
        if (!this.active) return;
        // Mouse wheel is used to scroll the action rows.
        if (this.selectedRegion() !== "actions") return;
        var maxScroll = this.maxScrollRow();
        if (maxScroll <= 0) return;
        var oldScrollRow = this._scrollRow;
        if (TouchInput.wheelY >= 20) {
            this._scrollRow++;
        } else if (TouchInput.wheelY <= -20) {
            this._scrollRow--;
        } else {
            return;
        }
        this._scrollRow = Math.max(0, Math.min(this._scrollRow, maxScroll));
        if (this._scrollRow !== oldScrollRow) {
            this.hideITBActionWindow();
            this.requestITBRefresh();
            this.refreshSelection();
        }
    }; */

    //--------------------------------------------------------------------------
    // Request Preview Update
    //--------------------------------------------------------------------------

    Window_ActorCommand.prototype.updatePreviewWindow = function(sprite) {
        // var visible = $gameSystem.isITBPreviewVisible();
        // if (this._previewWindow) {
        //     this._previewWindow.visible = visible;
        //     if (this._previewWindow._typeWindow) {
        //         this._previewWindow._typeWindow.visible = visible;
        //     }
        // }
        // if (!visible) return;
        var scene = SceneManager._scene;
        if (!scene) return;
        console.log("Actor", BattleManager.actor());
        if (sprite && sprite._uiData.region === "actions") {
            scene.updatePreviewWindow(BattleManager.actor(), sprite._uiData.action);
        } else {
            scene.updatePreviewWindow(null, null);
        }
    };

    //==========================================================================
    // Hide action message window
    //==========================================================================

    Window_ActorCommand.prototype.hideITBActionWindow = function() {
        var scene = SceneManager._scene;
        if (scene && scene._itbActionWindow) {
            scene._itbActionWindow.hide();
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
        this.clearDisplayedActor();
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
        this.clearDisplayedActor();
        this.select(actor.index());
        this.setTopRow(actor.index());
        this.refresh();
    };

    //--------------------------------------------------------------------------
    // Refresh displayed actor helpers
    //--------------------------------------------------------------------------

    Window_BattleStatus.prototype.setDisplayedActor = function(actor) {
        if (!actor) return;
        this._displayedActor = actor;
        this.select(actor.index());
        this.setTopRow(actor.index());
        this.refresh();
    };

    Window_BattleStatus.prototype.clearDisplayedActor = function() {
        this._displayedActor = null;
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
    // Hide scroll arrows
    //--------------------------------------------------------------------------

    var ITB_Command_WBS_update = Window_BattleStatus.prototype.update;
    Window_BattleStatus.prototype.update = function() {
        ITB_Command_WBS_update.call(this);
        this.upArrowVisible = false;
        this.downArrowVisible = false;
    };

    //--------------------------------------------------------------------------
    // Circular browsing
    //--------------------------------------------------------------------------

    /* Window_BattleStatus.prototype.cycleDisplayedActor = function(direction) {
        var members = $gameParty.battleMembers();
        if (members.length === 0) return;
        var currentIndex = this._displayOrderStartIndex || 0;
        var nextIndex = (currentIndex + direction + members.length) % members.length;
        this.setDisplayedActor(members[nextIndex]);
    }; */

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
        if (!this._displayedActor) {
            ITB_Command_WBS_drawItem.call(this, index);
            return;
        }
        var actor = this._displayedActor;
        this.drawBasicArea(this.basicAreaRect(index), actor);
        this.drawGaugeArea(this.gaugeAreaRect(index), actor);
        //if (actor.index() !== index) return;
        //this.drawActiveActorIndicator(index);
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
        //this.drawActorConnectors(actor, x, rect.y - 2);
        //x += this.connectorAreaWidth();
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
    // Window_ITBActorPortraits
    //==========================================================================

    function Window_ITBActorPortraits() {
        this.initialize.apply(this, arguments);
    }

    Window_ITBActorPortraits.prototype = Object.create(Window_Base.prototype);
    Window_ITBActorPortraits.prototype.constructor = Window_ITBActorPortraits;

    function Sprite_ITBActorPortrait() {
        this.initialize.apply(this, arguments);
    }

    Sprite_ITBActorPortrait.prototype = Object.create(Sprite.prototype);
    Sprite_ITBActorPortrait.prototype.constructor = Sprite_ITBActorPortrait;

    //--------------------------------------------------------------------------
    // Initialization
    //--------------------------------------------------------------------------

    Window_ITBActorPortraits.prototype.initialize = function(statusWindow) {
        this._statusWindow = statusWindow;
        var width = this.windowWidth();
        var height = this.windowHeight();
        var x = this.windowX();
        var y = this.windowY();
        Window_Base.prototype.initialize.call(this, x, y, width, height);
        this._portraits = [];
        this.createPortraits();
        //this.refresh();
    };

    Sprite_ITBActorPortrait.prototype.initialize = function(actor, window) {
        Sprite.prototype.initialize.call(this);
        this._actor = actor;
        this._window = window;
        //this._width = window.portraitWidth();
        //this._height = window.portraitHeight();
        this._portrait = null;
        this._hpGauge = null;
        this._mpGauge = null;
        this.createPortrait();
        this.createGauges();
        this.refreshHpGauge();
        this.refreshMpGauge();
    };

    //--------------------------------------------------------------------------
    // Dimensions
    //--------------------------------------------------------------------------

    Window_ITBActorPortraits.prototype.windowWidth = function() {
        return this.portraitWidth(); // + this.standardPadding() * 2;
    };

    Window_ITBActorPortraits.prototype.windowHeight = function() {
        var members = $gameParty.battleMembers();
        var rows = members.length;
        return rows * this.portraitHeight(); // + this.standardPadding() * 2;
    };

    Window_ITBActorPortraits.prototype.windowX = function() {
        return Graphics.boxWidth - this.windowWidth();
    };

    Window_ITBActorPortraits.prototype.windowY = function() {
        var scene = SceneManager._scene;
        var statusWindow = scene && scene._statusWindow;
        if (statusWindow) return statusWindow.y - this.windowHeight();
        return 0;
    };

    Window_ITBActorPortraits.prototype.portraitWidth = function() {
        return 84;
    };

    Window_ITBActorPortraits.prototype.portraitHeight = function() {
        return 84;
    };

    Sprite_ITBActorPortrait.prototype.portraitWidth = function() {
        return this._window.portraitWidth();
    };

    Sprite_ITBActorPortrait.prototype.portraitHeight = function() {
        return this._window.portraitHeight();
    };

    Sprite_ITBActorPortrait.prototype.gaugeHeight = function() {
        return 4;
    };

    //--------------------------------------------------------------------------
    // Layout
    //--------------------------------------------------------------------------

    Window_ITBActorPortraits.prototype.updateLayout = function() {
        var statusWindow = SceneManager._scene._statusWindow;
        if (!statusWindow) return;
        this.x = Graphics.boxWidth - this.width;
        this.y = statusWindow.y - this.height;
    };

    Window_ITBActorPortraits.prototype.layoutPortraits = function() {
        for (var i = 0; i < this._portraits.length; i++) {
            var portrait = this._portraits[i];
            portrait.x = 4;
            portrait.y = 4 + i * (this.portraitHeight() - 5);
            //portrait.scale.x = 0.5;
            //portrait.scale.y = 0.5;
        }
    };

    Sprite_ITBActorPortrait.prototype.layoutGauges = function() {
        this._hpGauge.x = 0;
        this._hpGauge.y = this.portraitHeight() - 15;
        this._mpGauge.x = 0;
        this._mpGauge.y = this.portraitHeight() + this.gaugeHeight() - 15;
    };

    //--------------------------------------------------------------------------
    // Update loop
    //--------------------------------------------------------------------------

    Window_ITBActorPortraits.prototype.update = function() {
        Window_Base.prototype.update.call(this);
        this.updateLayout();
        this.processTouch();
        for (var i = 0; i < this._portraits.length; i++) {
            this._portraits[i].update();
        }
    };

    Sprite_ITBActorPortrait.prototype.update = function() {
        Sprite.prototype.update.call(this);
        this.updatePortrait();
        if (this._actor) {
            if (this._lastHp !== this._actor.hp) {
                this._lastHp = this._actor.hp;
                this.refreshHpGauge();
            }
            if (this._lastMp !== this._actor.mp) {
                this._lastMp = this._actor.mp;
                this.refreshMpGauge();
            }
        }
    };

    Sprite_ITBActorPortrait.prototype.updatePortrait = function() {
        if (!this._portrait || !this._portrait.bitmap) return;
        if (!this._portrait.bitmap.isReady()) return;
        if (this._portrait._itbFrameSet) return;
        var index = this._actor.faceIndex();
        this._portrait.setFrame(
            index % 4 * Window_Base._faceWidth,
            Math.floor(index / 4) * Window_Base._faceHeight,
            Window_Base._faceWidth,
            Window_Base._faceHeight
        );
        this._portrait._itbFrameSet = true;
    };

    //--------------------------------------------------------------------------
    // Create portrait sprites
    //--------------------------------------------------------------------------

    Window_ITBActorPortraits.prototype.createPortraits = function() {
        var members = $gameParty.battleMembers();
        for (var i = 0; i < members.length; i++) {
            var portrait = new Sprite_ITBActorPortrait(
                members[i],
                this
            );
            this._portraits.push(portrait);
            this.addChild(portrait);
        }
        this.layoutPortraits();
    };

    Sprite_ITBActorPortrait.prototype.createPortrait = function() {
        if (!this._actor) return;
        this._portrait = new Sprite();
        this._portrait.bitmap = ImageManager.loadFace(this._actor.faceName());
        var index = this._actor.faceIndex();
        this._portrait.setFrame(
            index % 4 * Window_Base._faceWidth,
            Math.floor(index / 4) * Window_Base._faceHeight,
            Window_Base._faceWidth,
            Window_Base._faceHeight
        );
        this._portrait.scale.x = 0.52;
        this._portrait.scale.y = 0.52;
        this.addChild(this._portrait);
    };

    //--------------------------------------------------------------------------
    // Add gauges to portraits
    //--------------------------------------------------------------------------

    Sprite_ITBActorPortrait.prototype.createGauges = function() {
        this.createHpGauge();
        this.createMpGauge();
        this.layoutGauges();
    };

    Sprite_ITBActorPortrait.prototype.createHpGauge = function() {
        this._hpGauge = new Sprite(
            new Bitmap(this.portraitWidth(), this.gaugeHeight())
        );
        this.addChild(this._hpGauge);
    };

    Sprite_ITBActorPortrait.prototype.createMpGauge = function() {
        this._mpGauge = new Sprite(
            new Bitmap(this.portraitWidth(), this.gaugeHeight())
        );
        this.addChild(this._mpGauge);
    };

    //--------------------------------------------------------------------------
    // Draw gauges
    //--------------------------------------------------------------------------

    Sprite_ITBActorPortrait.prototype.refreshHpGauge = function() {
        var bitmap = this._hpGauge.bitmap;
        var width = bitmap.width - 8;
        var height = bitmap.height;
        var window = this._window;
        bitmap.clear();
        var rate = this._actor.mhp > 0 ? this._actor.hp / this._actor.mhp : 0;
        bitmap.fillRect(0, 0, width, height, window.gaugeBackColor());
        bitmap.gradientFillRect(
            0,
            0,
            Math.floor(width * rate),
            height,
            window.hpGaugeColor1(),
            window.hpGaugeColor2()
        );
    };

    Sprite_ITBActorPortrait.prototype.refreshMpGauge = function() {
        var bitmap = this._mpGauge.bitmap;
        var width = bitmap.width - 8;
        var height = bitmap.height;
        var window = this._window;
        bitmap.clear();
        var rate = this._actor.mmp > 0 ? this._actor.mp / this._actor.mmp : 0;
        bitmap.fillRect(0, 0, width, height, window.gaugeBackColor());
        bitmap.gradientFillRect(
            0,
            0,
            Math.floor(width * rate),
            height,
            window.mpGaugeColor1(),
            window.mpGaugeColor2()
        );
    };

    //--------------------------------------------------------------------------
    // Detect mouse clicks
    //--------------------------------------------------------------------------

    Window_ITBActorPortraits.prototype.processTouch = function() {
        if (!TouchInput.isTriggered()) return false;
        var x = TouchInput.x - this.x;
        var y = TouchInput.y - this.y;
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
        var row = Math.floor(y / this.portraitHeight());
        var members = $gameParty.battleMembers();
        if (row < 0 || row >= members.length) return false;
        var actor = members[row];
        var scene = SceneManager._scene;
        if (scene && scene.selectITBDisplayedActor) {
            scene.selectITBDisplayedActor(actor);
        }
        return true;
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
        var height = this.fittingHeight(numLines || 4);
        var x = 0;
        var scene = SceneManager._scene;
        if (scene) {
            var width = scene.previewWindowWidth();
            if (scene._statusWindow) {
                var y = scene._statusWindow.y - height - 10;
            } else {
                var y = 0;
            }
        } else {
            var width = Graphics.boxWidth;
            var y = 0;
        }
        Window_Base.prototype.initialize.call(this, x, y, width, height);
        this._item = null;
        this._badges = {};
        this.createBadges();
        this.createConnectorHeader();
        this.createConnectorRows();
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
    // Update
    //--------------------------------------------------------------------------

    /* var ITB_Command_WP_update = Window_Preview.prototype.update;
    Window_Preview.prototype.update = function() {
        ITB_Command_WP_update.call(this);
        if (this._needsHeaderRefresh &&
            this._header &&
            this._header.inputIcon.bitmap &&
            this._header.inputIcon.bitmap.isReady()) {
                this._needsHeaderRefresh = false;
                this.refresh();
        }
    }; */

    //--------------------------------------------------------------------------
    // Create badge sprites
    //--------------------------------------------------------------------------

    Window_Preview.prototype.createBadges = function() {
        this._badges.aether = this.createBadge("aether-48");
        this._badges.initiative = this.createBadge("initiative-48");
        this._badges.stamina = this.createBadge("stamina-48");
        this._badges.defense = this.createBadge("defense-60");
        this._badges.defiance = this.createBadge("defiance-60");
        this._badges.damage = this.createBadge("damage-48");
        this._badges.corruption = this.createBadge("corruption-48");
        this.createTypeWindow();
        this.layoutBadges();
    };

    //--------------------------------------------------------------------------
    // Set Item
    //--------------------------------------------------------------------------

    Window_Preview.prototype.setAction = function(actor, item, actionData) {
        console.log("Set action");
        //if (this._actor === actor && this._item === item) return;
        this._actor = actor;
        this._item = item;
        this._data = actionData;
        this.refresh();
    };

    //--------------------------------------------------------------------------
    // Clear Item
    //--------------------------------------------------------------------------

    Window_Preview.prototype.clear = function() {
        this.setAction(null, null, null);
    };

    //--------------------------------------------------------------------------
    // Refresh Preview Window
    //--------------------------------------------------------------------------

    Window_Preview.prototype.refresh = function() {
        console.log("Refresh preview window");
        var action = this._data;
        if (!action) return;
        var reason = BattleManager.ITB_UI.getActionUnavailableReason(this._actor, action);
        this._scopeFailure = reason && reason.type === "scope" ? reason : null;
        if (this._scopeFailure) {
            this._previewRows = [];
        } else {
            this._previewRows = BattleManager.ITB_UI.previewConnectorRows(this._actor, action);
        }
        this.refreshWindowSize();
        this.contents.clear();
        this.drawTitle(action);
        this.drawScope();
        if (this._scopeFailure) {
            this.clearRowSprites();
        } else {
            this.drawConnectorRows();
        }
        this.drawConnectorHeader();
        this.layoutConnectorAxis();
        this.drawConnectorAxis();
        if (this._scopeFailure) this.layoutConnectorHeaderX();
        this.drawSeparator();
        this.drawDescription();
        this.layoutBadges();
        this.refreshBadges();
    };

    Window_Preview.prototype.refreshBadges = function() {
        this.refreshInitiativeBadge();
        this.refreshAetherBadge();
        this.refreshStaminaBadge();
        this.refreshDamageBadge();
        this.refreshCorruptionBadge();
        this.refreshDefenseBadge();
        this.refreshDefianceBadge();
        this.refreshTypeWindow();
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
        return Math.floor(this.contentsWidth() * 0.5);
    };

    Window_Preview.prototype.separatorHeight = function() {
        return this.fittingHeight(this.requiredLines() - 2.5);
    };

    Window_Preview.prototype.separatorMargin = function() {
        return 16;
    };

    Window_Preview.prototype.layoutBadges = function() {
        var topY = -12;
        var bottomY = this.height - 36;
        //console.log(
        //    "Aether badge:",
        //    this._badges.aether.x,
        //    this._badges.aether.y
        //);
        this._badges.aether.x = -2;
        this._badges.aether.y = topY - 2;
        this._badges.initiative.x = this.width / 2 - 24;
        this._badges.initiative.y = topY - 8;
        this._badges.stamina.x = this.width - 46;
        this._badges.stamina.y = topY;
        this._badges.defense.x = -6;
        this._badges.defense.y = bottomY - 10;
        this._badges.defiance.x = -6;
        this._badges.defiance.y = bottomY - 10;
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
        this._badges.damage.x = this.width - 49;
        this._badges.damage.y = bottomY - 2;
        this._badges.corruption.x = this.width - 49;
        this._badges.corruption.y = bottomY - 2;
    };

    Window_Preview.prototype.badgeFontFace = function() {
        return "Rockwell";
    };

    Window_Preview.prototype.layoutConnectorHeader = function() {
        this.layoutConnectorHeaderX();
        var y = this.headerY();
        this._header.validity.y = y + 4;
        this._header.inputIcon.y = y;
        if (this._scopeFailure) {
            this._header.arrow.y = y - 8;
        } else {
            this._header.arrow.y = y + 8;
        }
        this._header.previewIcon.y = y;
        this._header.check.y = y + Window_Base._iconHeight + 4;
    };

    Window_Preview.prototype.layoutConnectorHeaderX = function() {
        if (this._scopeFailure) {
            var x = this.textPadding() + 2;
        } else if (this._connectorLayout && this._connectorLayout.visibleTracks) {
            var x = this.connectorAxisX() - Window_Base._iconWidth / 2 + 1;
        } else {
            var x = this.connectorTrackLeft();
        }
        //console.log("Header X", x);
        //console.log("Header Layout X", this._header.x);
        this._header.validity.x = x - Window_Base._iconWidth;
        this._header.inputIcon.x = x;
        if (this._scopeFailure) {
            this._header.arrow.x = x + this.headerSpacing() - 4;
        } else {
            this._header.arrow.x = x + this.headerSpacing() + 6;
        }
        this._header.previewIcon.x = this._header.arrow.x + this.headerArrowSpacing();
        this._header.check.x = this._header.inputIcon.x + Window_Base._iconWidth + 4;
    };

    Window_Preview.prototype.connectorAxisX = function() {
        if (!this._connectorLayout) {
            return this.connectorTrackLeft();
        }
        return this._connectorLayout.axisX;
    };

    Window_Preview.prototype.layoutConnectorAxis = function() {
        if (!this._axisSprite) return;
        this._axisSprite.visible = !!(!this._scopeFailure &&
            this._connectorRows &&
            this._connectorRows.some(function(row) {
                return row.icon.visible;
            }));
        var height = this.separatorHeight();
        if (!this._axisSprite.bitmap || this._axisSprite.bitmap.height !== height) {
            this._axisSprite.bitmap = new Bitmap(2, height);
        }
        this._axisSprite.x = this.connectorAxisX();
        this._axisSprite.y = this.headerY() + Window_Base._iconHeight + 4;
    };

    Window_Preview.prototype.headerY = function() {
        return 26;
    };

    Window_Preview.prototype.headerSpacing = function() {
        return 38;
    };

    Window_Preview.prototype.headerArrowSpacing = function() {
        return 26;
    };

    Window_Preview.prototype.layoutConnectorRows = function() {
        console.log("Layout Connector Rows");
        var startY = this.headerY() + this.connectorRowSpacing() + 2;
        //console.log("Y", startY);
        var visibleIndex = 0;
        this._connectorRows.forEach(function(row) {
            if (!row.icon.visible) return;
            // Discipline icon
            row.icon.x = this.connectorIconX();
            //console.log("Discipline", row.discipline);
            //console.log("Index", visibleIndex);
            row.icon.y = startY + visibleIndex * this.connectorRowSpacing();
            //console.log("Icon y", row.icon.y);
            // Connector validity indicator
            row.validity.x = this.connectorValidityX();
            row.validity.y = row.icon.y + 3;
            // Strict marker
            row.strict.x = this.connectorStrictX();
            row.strict.y = row.icon.y + 4;
            //console.log("Input Offset:", this._connectorLayout.inputOffset);
            //console.log("Connector Axis X:", this._connectorLayout.axisX);
            // Track
            row.track.x = this.connectorAxisX() - this._connectorLayout.inputOffset;
            row.track.y = row.icon.y - this.connectorTrackHeight() / 2 + 12;
            // Output track
            row.outputTrack.x = row.track.x;
            row.outputTrack.y = row.track.y + this.connectorOutputTrackOffset();
            // Track values
            row.trackValues.x = row.track.x - 4;
            row.trackValues.y = row.track.y - 3 * this.connectorTrackHeight() / 4;
            // Validation mark
            row.mark.x = this.connectorMarkX(row.state) + 4;
            //console.log("Connector Mark X", row.mark.x);
            row.mark.y = row.icon.y + 6;
            visibleIndex++;
        }, this);
    };

    Window_Preview.prototype.connectorValidityX = function() {
        return 14;
    }

    Window_Preview.prototype.connectorStrictX = function() {
        return this.connectorValidityX() + 28;
    };

    Window_Preview.prototype.connectorIconX = function() {
        return this.connectorStrictX() + 28;
    };

    Window_Preview.prototype.connectorRowSpacing = function() {
        return 36;
    };

    Window_Preview.prototype.connectorTrackHeight = function() {
        return 20;
    };

    Window_Preview.prototype.connectorOutputTrackHeight = function() {
        return Math.max(4, this.connectorTrackHeight() - 2);
    };

    Window_Preview.prototype.connectorTrackWidth = function() {
        return this.connectorTrackRight() - this.connectorTrackLeft();
    };

    Window_Preview.prototype.connectorTrackRight = function() {
        return this.separatorX() - this.separatorMargin();
    };

    Window_Preview.prototype.connectorTrackLeft = function() {
        return this.connectorIconX() + Window_Base._iconWidth + this.connectorTrackMargin();
    };

    Window_Preview.prototype.connectorTrackMargin = function() {
        return 10;
    };

    Window_Preview.prototype.connectorOutputTrackOffset = function() {
        return 5;
    };

    Window_Preview.prototype.connectorOutputArrowWidth = function() {
        var span = this._connectorLayout && this._connectorLayout.globalSpan;
        if (!span) return 0;
        return Math.abs(
            this.connectorValueToPixels(1, span) -
            this.connectorValueToPixels(0, span)
        );
    };

    //Window_Preview.prototype.connectorTrackLeft = function() {
    //    return this.connectorAxisX() - this.connectorValueToX(0);
    //};

    /* Window_Preview.prototype.connectorValueToX = function(value, row) {
        return row.track.x + this.connectorValueToPixels(value, row.displayRange);
        //var range = this.connectorDisplayRange(row);
        //var pixels = this.connectorTrackWidth();
        //return Math.round((value - range.min) / (range.max - range.min) * pixels);
    }; */

    Window_Preview.prototype.buildConnectorLayout = function(rows) {
        //if (!row.displayRange) return null;
        console.log("Build connector layout");
        var globalLeftDelta = Infinity;
        var globalRightDelta = -Infinity;
        var visibleTracks = false;
        rows.forEach(function(row) {
            row.state = this.connectorRowState(row);
            if (!row.state) return;
            row.displayRange = this.connectorDisplayRange(row);
            if (!row.displayRange) return;
            visibleTracks = true;
            globalLeftDelta = Math.min(
                globalLeftDelta,
                row.displayRange.min - row.current
            );
            globalRightDelta = Math.max(
                globalRightDelta,
                row.displayRange.max - row.current
            );
        }, this);
        var layout = {
            visibleTracks: visibleTracks,
            inputOffset: 0,
            axisX: this.connectorTrackLeft()
        };
        // No tracks means no connector axis/layout.
        if (!visibleTracks) return layout;
        layout.globalSpan = {
            min: globalLeftDelta,
            max: globalRightDelta
        };
        if (globalLeftDelta === Infinity || globalRightDelta === -Infinity) return layout
        //console.log("Global span", layout.globalSpan);
        layout.inputOffset = this.connectorValueToPixels(0, layout.globalSpan);
        //console.log("Connector track left", this.connectorTrackLeft());
        //console.log("Maximum input offset", layout.inputOffset);
        layout.axisX = this.connectorTrackLeft() + layout.inputOffset;
        return layout;
    };

    Window_Preview.prototype.connectorInterval = function(row) {
        //console.log("Input", row.input);
        if (!row.input) return null;
        //console.log("Type", row.input.type);
        switch (row.input.type) {
            case "exact":
                return {
                    left: row.input.value - row.current,
                    right: row.input.value - row.current,
                    leftOpen: false,
                    rightOpen: false
                };
            case "min":
                return {
                    left: row.input.value - row.current,
                    right: row.displayRange.max - row.current,
                    leftOpen: false,
                    rightOpen: true
                };
            case "max":
                return {
                    left: row.displayRange.min - row.current,
                    right: row.input.value - row.current,
                    leftOpen: true,
                    rightOpen: false
                };
            case "range":
                return {
                    left: row.input.min - row.current,
                    right: row.input.max - row.current,
                    leftOpen: false,
                    rightOpen: false
                };
            }
        return null;
    };

    Window_Preview.prototype.connectorMarkX = function(state) {
        console.log("Connector Mark Position");
        //console.log("state", state);
        //console.log("Preview icon x", this._header.previewIcon.x);
        //console.log("Icon width", Window_Base._iconWidth);
        var offset = 14; // half of the 20px mark, adjusted by 1px
        if (state === "disconnected") {
            return this.connectorAxisX() - offset;
        } else if (state === "valid") {
            return (this._header.previewIcon.x + Window_Base._iconWidth / 2 - offset - 1);
        } else {
            return (this._header.previewIcon.x + Window_Base._iconWidth / 2 - offset - 1);
        }
    };

    //--------------------------------------------------------------------------
    // Window resize helper
    //--------------------------------------------------------------------------

    Window_Preview.prototype.refreshWindowSize = function() {
        var newHeight = this.fittingHeight(this.requiredLines());
        if (this.height === newHeight) return;
        this.height = newHeight;
        this.createContents();
        var scene = SceneManager._scene;
        if (scene && scene._statusWindow) {
            this.y = scene._statusWindow.y - this.height - 10;
        }
    };

    //--------------------------------------------------------------------------
    // Refresh helpers
    //--------------------------------------------------------------------------

    Window_Preview.prototype.refreshInitiativeBadge = function() {
        var badge = this._badges.initiative;
        if (!badge) return;
        badge.visible = !!this._item;
        var initiative = BattleManager.ITB_UI.actionInitiativeCost(this._item);
        this.drawBadgeValue(badge, initiative, 0, 14, badge._value.bitmap.width, 24);
    };

    Window_Preview.prototype.refreshAetherBadge = function() {
        var badge = this._badges.aether;
        if (!badge) return;
        var cost = this._item ? this._item.tpCost : -1;
        badge.visible = cost > 0;
        if (!badge.visible) return;
        this.drawBadgeValue(badge, cost, 0, 12, badge._value.bitmap.width, 24);
    };

    Window_Preview.prototype.refreshStaminaBadge = function() {
        var badge = this._badges.stamina;
        if (!badge) return;
        var value = 0;
        badge.visible = value > 0;
        if (!badge.visible) return;
        this.drawBadgeValue(badge, value, 0, 10, badge._value.bitmap.width, 24);
    };

    Window_Preview.prototype.refreshDamageBadge = function() {
        console.log("Refresh Damage Badge");
        var badge = this._badges.damage;
        if (!badge) return;
        var info = BattleManager.ITB_UI.actionAttackInfo(this._actor, this._item);
        //console.log("Visible", !!info);
        badge.visible = !!info;
        if (!info) return;
        var total = info.total;
        //console.log("Total", total);
        this.drawBadgeValue(badge, total, 0, 3, badge._value.bitmap.width, 24);
        var bonus = "+" + info.bonus;
        //console.log("Bonus", bonus);
        this.drawBadgeBonus(badge, bonus, -2, 4, badge._bonus.bitmap.width, 16);
    };

    Window_Preview.prototype.refreshCorruptionBadge = function() {
        console.log("Refresh Corruption Badge");
        var badge = this._badges.corruption;
        if (!badge) return;
        if (this._badges.damage.visible) {
            badge.x = this.width - 99;
        } else {
            badge.x = this.width - 49;
        }
        var info = BattleManager.ITB_UI.actionInfluenceInfo(this._actor, this._item);
        //console.log("Visible", !!info);
        badge.visible = !!info;
        if (!info) return;
        var total = info.total;
        //console.log("Total", total);
        this.drawBadgeValue(badge, total, 0, 3, badge._value.bitmap.width, 24);
        var bonus = "+" + info.bonus;
        //console.log("Bonus", bonus);
        this.drawBadgeBonus(badge, bonus, -2, 4, badge._bonus.bitmap.width, 16);
    };

    Window_Preview.prototype.refreshDefenseBadge = function() {
        console.log("Refresh Defense Badge");
        var badge = this._badges.defense;
        if (!badge) return;
        var guard = this._item && this._item.meta && this._item.meta.Guard;
        //console.log("Visible", !!guard);
        badge.visible = !!guard;
        if (!guard) return;
        var total = this._actor.def;
        var bonus = "+" + Number(guard);
        this.drawBadgeValue(badge, total, 6, 10, badge._value.bitmap.width, 24);
        this.drawBadgeBonus(badge, bonus, 4, 10, badge._bonus.bitmap.width, 16);
    };

    Window_Preview.prototype.refreshDefianceBadge = function() {
        console.log("Refresh Defiance Badge");
        var badge = this._badges.defiance;
        if (!badge) return;
        if (this._badges.defense.visible) {
            badge.x = 44;
        } else {
            badge.x = -6;
        }
        var composure = this._item && this._item.meta && this._item.meta.Composure;
        //console.log("Visible", !!composure);
        badge.visible = !!composure;
        if (!composure) return;
        var total = this._actor.mdf;
        var bonus = "+" + Number(composure);
        this.drawBadgeValue(badge, total, 6, 10, badge._value.bitmap.width, 24);
        this.drawBadgeBonus(badge, bonus, 4, 10, badge._bonus.bitmap.width, 16);
    };

    Window_Preview.prototype.refreshTypeWindow = function() {
        if (!this._typeWindow) return;
        if (!this._item) {
            this._typeWindow.hide();
            return;
        }
        var parts = [];
        if (this._item.damage && this._item.damage.elementId > 0) {
            parts.push($dataSystem.elements[this._item.damage.elementId]);
        }
        if (this._item.stypeId) {
            parts.push($dataSystem.skillTypes[this._item.stypeId]);
        }
        var text = parts.join(" • ");
        if (!text) {
            this._typeWindow.hide();
            return;
        }
        this._typeWindow.show();
        this._typeWindow.contents.clear();
        this._typeWindow.contents.fontSize = 16;
        this._typeWindow.drawText(
            text,
            0,
            -12,
            this._typeWindow.contentsWidth(),
            "center"
        );
    };

    /* Window_Preview.prototype.refreshHeader = function(actor, data) {
        this._inputIcon.bitmap.clear();
        var source = BattleManager.ITB_UI.connectorPreviewSource(actor);
        if (!source) {
            this._inputIcon.visible = false;
            return;
        }
        this._inputIcon.visible = true;
        if (source.type === "action") {
            this.drawActionIcon(source.action);
        } else {
            this.drawHeaderBattlerIcon(source.battler);
        }
    }; */

    //--------------------------------------------------------------------------
    // Create badge helpers
    //--------------------------------------------------------------------------

    Window_Preview.prototype.createBadge = function(filename, scale) {
        /* var container = new Sprite();
        container._icon = new Sprite(ImageManager.loadSystem(filename));
        if (!scale) scale = 1;
        container._icon.bitmap.addLoadListener(function() {
            var w = container._icon.bitmap.width;
            var h = container._icon.bitmap.height;
            container._icon.x = w / 2;
            container._icon.y = h / 2;
            container._value.x = w / 2 - 24;
            container._value.y = 8;
            container._bonus.x = w / 2 - 24;
            container._bonus.y = 28;
        });
        container._icon.anchor.x = 0.5;
        container._icon.anchor.y = 0.5;
        container._icon.scale.x = scale;
        container._icon.scale.y = scale;
        this.addChild(container._icon);
        container._value = new Sprite(new Bitmap(48, 32));
        container.addChild(container._value);
        container._bonus = new Sprite(new Bitmap(48, 16));
        container.addChild(container._bonus);
        this.addChild(container);
        return container; */
        var sprite = new Sprite(ImageManager.loadSystem(filename));
        if (!scale) scale = 1;
        sprite.scale.x *= scale;
        sprite.scale.y *= scale;
        sprite._value = new Sprite(new Bitmap(48, 40));
        sprite.addChild(sprite._value);
        sprite._bonus = new Sprite(new Bitmap(48, 28));
        sprite.addChild(sprite._bonus);
        sprite._value.y = -2;
        sprite._bonus.y = 24;
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
    // Compute the required number of lines
    //--------------------------------------------------------------------------

    Window_Preview.prototype.requiredLines = function() {
        var lines = 1.7;               // title/header/badges
        if (this._item) {
            lines += this._previewRows.length;
        }
        lines = Math.max(lines, this.descriptionLines());
        /* console.log(
            "Preview requiredLines:",
            this._item ? this._item.name : null,
            "previewRows:",
            this._previewRows,
            "previewRows.length:",
            this._previewRows ? this._previewRows.length : null,
            "lines:",
            lines,
            "descriptionLines:",
            this.descriptionLines()
        ); */
        return lines;
    };

    Window_Preview.prototype.descriptionLines = function() {
        if (!this._item) return 0;
        var lines = 0;
        // Database description
        if (this._item.description) lines += this.descriptionTextLines().length;
        // States inflicted by this action
        lines += this.statePreviewLines();
        //if (this._item && this._item.selfState) lines += 1;
        // Connector effects
        lines += this.connectorEffectPreviewLines();
        return lines;
    };

    Window_Preview.prototype.statePreviewLines = function() {
        if (!this._item || !this._item.selfState) return 0;
        var state = $dataStates[this._item.selfState.stateId];
        if (!state) return 0;
        return 1;
    };

    Window_Preview.prototype.statePreviewLines = function() {
        if (!this._item) return 0;
        var lines = 0;
        // Custom self-state
        if (this._item.selfState) {
            var state = $dataStates[this._item.selfState.stateId];
            if (state) lines++;
        }
        // Database state effects
        if (this._item.effects) {
            this._item.effects.forEach(function(effect) {
                if (
                    effect.code !== Game_Action.EFFECT_ADD_STATE &&
                    effect.code !== Game_Action.EFFECT_REMOVE_STATE
                ) {
                    return;
                }
                var state = $dataStates[effect.dataId];
                if (state && state.name && state.iconIndex) lines++;
            });
        }
        return lines;
    };

    Window_Preview.prototype.connectorEffectPreviewLines = function() {
        if (!this._item || !this._item.connectorEffects) return 0;
        return this._item.connectorEffects.length;
    };

    //--------------------------------------------------------------------------
    // Set preview text
    //--------------------------------------------------------------------------

    Window_Preview.prototype.drawTitle = function(actionData) {
        var discipline = BattleManager.ITB_UI.getDisciplineImage(actionData.discipline);
        //var string = BattleManager.ITB_UI.getActionDiscipline(actionData);
        //console.log("Discipline", string);
        //console.log("Image", discipline);
        var iconSize = 28;
        var spacing = 8;
        this.contents.fontSize = 26;
        this.changeTextColor(this.normalColor());
        var textWidth = this.textWidth(actionData.name);
        var totalWidth = iconSize + spacing + textWidth;
        var x = Math.floor((this.contentsWidth() - iconSize) / 2);
        var y = 6;
        //console.log("Action:", actionData);
        //console.log("Discipline icon:", actionData.discipline);
        this.drawSystemImage(discipline, x, y + 2, iconSize);
        this.drawText(actionData.name, x + iconSize + spacing, y, totalWidth, "left");
        this.resetFontSettings();
    };

    Window_Preview.prototype.drawScope = function() {
        //console.log("Scope", this._item.scope);
        if (!this._item || !this._item.scope) return;
        this.contents.fontSize = 18;
        var scopeText = this.scopeText(this._item.scope);
        //var iconSize = 54;
        var spacing = 8;
        var w = this.contentsWidth() - spacing;
        this.drawScopeTarget(this.textWidth(scopeText) * 2);
        //var scopeWidth = this.textWidth(scopeText);
        //this.drawText(scopeText, -iconSize, 6, w, "right");
        this.drawText(scopeText, 0, 10, w, "right");
        this.resetFontSettings();
    };

    Window_Preview.prototype.drawDescription = function() {
        var lines = this.descriptionTextLines();
        var x = this.separatorX() + this.separatorMargin();
        var y = this.lineHeight() + 4;
        var numLines = lines.length;
        var w = this.contentsWidth() - x;
        if (numLines) {
            this.contents.fontSize = 20;
            this.changeTextColor(this.normalColor());
            lines.forEach(function(line, index) {
                this.drawText(line, x, y + index * this.lineHeight(), w);
            }, this);
            this.resetFontSettings();
        }
        this.drawStates((numLines + 1) * this.lineHeight());
        y += this.statePreviewLines() * this.lineHeight();
        this.drawConnectorEffects(y);
    };

    Window_Preview.prototype.drawScopeTarget = function(w) {
        var target = this._actor ? this._actor._connectorPreviewTarget : null;
        /* console.log("DRAW SCOPE TARGET");
        console.log("Actor:", this._actor);
        console.log("Target:", target);
        console.log("Contents:", this.contents);
        console.log("Contents size:", this.contents.width, this.contents.height); */
        if (!target) return;
        var size = 54;
        var x = this.contentsWidth() - size / 4 - w;
        var y = -5;
        var redrawCallback = function() {
            console.log("TARGET BITMAP READY -> PREVIEW REFRESH");
            this.refresh();
        }.bind(this)
        /* var bitmap = ImageManager.loadSystem("TargetBoard");
        if (!bitmap.isReady()) {
            bitmap.addLoadListener(function() {
                this.refresh();
            }.bind(this));
            return;
        }
        w = bitmap.width;
        h = bitmap.heigth; */
        //console.log("Drawing target background");
        this.drawTargetBackgroundAt(target, x, y, size, redrawCallback);
        size = 20;
        x = this.contentsWidth() - w + 4;
        y = 11;
        if (target.isActor()) {
            this.drawTargetMiniIconAt(target, x, y + 3, size, redrawCallback);
        } else {
            //var dw = this.contentsWidth() / 2 - 2;
            this.drawTargetMiniIconAt(target, x, y, size, redrawCallback);
        }
    };

    Window_Preview.prototype.scopeText = function(scope) {
        switch (scope) {
            case 0:
                return "No Target";
            case 1:
                return "Enemy";
            case 2:
                return "AoE";
            case 3:
                return "Random Enemy";
            case 4:
                return "Two Random Enemies";
            case 5:
                return "Three Random Enemies";
            case 6:
                return "Four Random Enemies";
            case 7:
                return "Ally";
            case 8:
                return "All Allies";
            case 9:
                return "Dead Ally";
            case 10:
                return "All Dead Allies";
            case 11:
                return "Self";
            default:
                return "";
        }
    };

    Window_Preview.prototype.descriptionTextLines = function() {
        if (!this._item || !this._item.description) return [];
        var text = this._item.description;
        var width = this.contentsWidth() - this.separatorX() - this.separatorMargin();
        //console.log("Contents width", this.contentsWidth());
        //console.log("Separator X", this.separatorX());
        //console.log("Text width", width);
        var lines = [];
        var current = "";
        var words = text.split(" ");
        for (var i = 0; i < words.length; i++) {
            var test = current ? current + " " + words[i] : words[i];
            //console.log("Test", test);
            //console.log("Test width", this.textWidth(test));
            if (this.textWidth(test) > 2 * width && current) {
                lines.push(current);
                current = words[i];
            } else {
                current = test;
            }
        }
        if (current) lines.push(current);
        return lines;
    };

    /* Window_PreviewType.prototype.setText = function(text) {
        if (this._text === text) return;
        this._text = text;
        this.refresh();
    }; */

    //--------------------------------------------------------------------------
    // Draw state helpers
    //--------------------------------------------------------------------------

    Window_Preview.prototype.drawStates = function(y) {
        var selfStates = [];
        var targetStates = [];
        // Custom self-state
        if (this._item.selfState) {
            selfStates.push({
                stateId: this._item.selfState.stateId,
                offset: Number(this._item.selfState.offset || 0)
            });
        }
        // Database Add State effects
        this._item.effects.forEach(function(effect) {
            if (
                effect.code !== Game_Action.EFFECT_ADD_STATE &&
                effect.code !== Game_Action.EFFECT_REMOVE_STATE
            ) {
                return;
            }
            var state = $dataStates[effect.dataId];
            if (!state || !state.name || !state.iconIndex) return;
            targetStates.push({
                stateId: effect.dataId,
                offset: 0,
                remove: effect.code === Game_Action.EFFECT_REMOVE_STATE
            });
        }, this);
        var x = this.separatorX() + this.separatorMargin();
        var rowHeight = this.lineHeight();
        var labelWidth = 75;
        // Self states
        selfStates.forEach(function(state, index) {
            // Self label only on first row
            if (index === 0) {
                this.contents.fontSize = 20;
                this.changeTextColor(this.textColor(6));
                this.drawText("Self:", x, y, labelWidth);
            }
            this.drawState(state, x + labelWidth, y);
            y += rowHeight;
        }, this);
        // Target states
        targetStates.forEach(function(state, index) {
            // Self label only on first row
            if (index === 0) {
                this.contents.fontSize = 20;
                this.changeTextColor(this.textColor(6));
                this.drawText("Target:", x, y, labelWidth);
            }
            this.drawState(state, x + labelWidth, y);
            y += rowHeight;
        }, this);
    };

    Window_Preview.prototype.drawState = function(stateData, x, y) {
        var state = $dataStates[stateData.stateId];
        if (!state) return;
        var iconSize = 28;
        var spacing = 8;
        // Remove-state marker
        if (stateData.remove) {
            this.drawSystemImage("cross-mark-24", x, y + 6, 24);
            x += 28;
        }
        // State icon
        this.drawScaledIcon(state.iconIndex, x, y + 4, iconSize);
        var nameX = x + iconSize + spacing;
        // Self-state trigger offset
        //console.log("State:", stateData);
        //console.log("Offset:", stateData.offset);
        if (stateData.offset > 0) {
            var triggerBitmap = ImageManager.loadSystem("trigger-32");
            var triggerSize = 32;
            //console.log("Ready:", triggerBitmap.isReady());
            if (!triggerBitmap.isReady()) {
                if (!triggerBitmap._itbRedrawRegistered) {
                    triggerBitmap._itbRedrawRegistered = true;
                    triggerBitmap.addLoadListener(function() {
                        this.refresh();
                    }.bind(this));
                }
                return;
            }
            this.contents.blt(
                triggerBitmap,
                0,
                0,
                triggerBitmap.width,
                triggerBitmap.height,
                nameX,
                y + 2,
                triggerSize,
                triggerSize
            );
            // Offset number inside the trigger icon
            this.contents.fontSize = 18;
            this.changeTextColor("#F7E839");
            this.drawText(
                String(stateData.offset), 
                nameX, 
                y + 1, 
                triggerSize - 1, 
                "center"
            );
            this.resetFontSettings();
            nameX += triggerSize + spacing;
        }
        // State name
        this.contents.fontSize = 20;
        this.changeTextColor(this.normalColor());
        this.drawText(state.name, nameX, y, this.contentsWidth() - nameX);
        this.resetFontSettings();
    };

    Window_Preview.prototype.drawStateTrigger = function(offset, x, y, size) {
        var bitmap = ImageManager.loadSystem("trigger-32");
        if (!bitmap.isReady()) {
            if (!bitmap._itbRedrawRegistered) {
                bitmap._itbRedrawRegistered = true;
                bitmap.addLoadListener(function() {
                    this.refresh();
                }.bind(this));
            }
            return;
        }
        this.contents.blt(bitmap, 0, 0, bitmap.width, bitmap.height, x, y, size, size);
        this.contents.fontSize = 14;
        this.changeTextColor("#F7E839");
        this.drawText(String(offset), x, y + 1, size, "center");
        this.resetFontSettings();
    };

    //--------------------------------------------------------------------------
    // Draw connector effect helpers
    //--------------------------------------------------------------------------

    Window_Preview.prototype.drawConnectorEffects = function(y) {
        if (!this._item || !this._item.connectorEffects) return;
        var selfEffects = [];
        var targetEffects = [];
        this._item.connectorEffects.forEach(function(effect) {
            if (effect.target === "self") {
                selfEffects.push(effect);
            } else if (effect.target === "target") {
                targetEffects.push(effect);
            }
        });
        var x = this.separatorX() + this.separatorMargin();
        var rowHeight = this.lineHeight();
        var labelWidth = 75;
        // Self effects
        selfEffects.forEach(function(effect, index) {
            if (index === 0) {
                this.contents.fontSize = 20;
                this.changeTextColor(this.textColor(6));
                this.drawText("Self:", x, y, labelWidth);
            }
            this.drawConnectorEffect(effect, x + labelWidth, y);
            y += rowHeight;
        }, this);
        // Target effects
        targetEffects.forEach(function(effect, index) {
            if (index === 0) {
                this.contents.fontSize = 20;
                this.changeTextColor(this.textColor(6));
                this.drawText("Target:", x, y, labelWidth);
            }
            this.drawConnectorEffect(effect, x + labelWidth, y);
            y += rowHeight;
        }, this);
        this.resetFontSettings();
    };

    Window_Preview.prototype.drawConnectorEffect = function(effect, x, y) {
        var definition = DataManager.getConnectorDefinition(effect.connector);
        if (!definition) return;
        var iconSize = 28;
        var spacing = 8;
        var image = BattleManager.ITB_UI.getDisciplineImage(
            definition.discipline
        );
        this.drawSystemImage(image, x, y + 2, iconSize);
        var value = Number(effect.value);
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

    //--------------------------------------------------------------------------
    // Create header for action connector validation
    //--------------------------------------------------------------------------

    Window_Preview.prototype.createConnectorHeader = function() {
        this._header = {};
        this._header.validityCheck = ImageManager.loadSystem("check-mark2-24");
        this._header.validityCross = ImageManager.loadSystem("cross-mark2-24");
        this._header.validity = new Sprite(this._header.validityCheck);
        this._header.validity.visible = true;
        this.addChild(this._header.validity);
        this._header.inputIcon = new Sprite();
        this._header.inputIcon.bitmap = new Bitmap(32, 32);
        this.addChild(this._header.inputIcon);
        this._header.previewIcon = new Sprite();
        this._header.previewIcon.bitmap = new Bitmap(32, 32);
        this.addChild(this._header.previewIcon);
        this._header.arrow = new Sprite(ImageManager.loadSystem("cursor"));
        this.addChild(this._header.arrow);
        this._header.arrow.scale.x = 0.5;
        this._header.arrow.scale.y = 0.5;
        this._header.check = new Sprite(ImageManager.loadSystem("check-mark-32"));
        this._header.check.anchor.x = 1;
        this._header.check.anchor.y = 1;
        this._header.check.scale.x = 1.2;
        this._header.check.scale.y = 1.2;
        this.addChild(this._header.check);
        this.layoutConnectorHeader();
    };

    //--------------------------------------------------------------------------
    // Create connector axis highlighting connector input values
    //--------------------------------------------------------------------------

    Window_Preview.prototype.createConnectorAxis = function() {
        this._axisSprite = new Sprite();
        this.addChild(this._axisSprite);
    };

    //--------------------------------------------------------------------------
    // Create connector discipline sprites
    //--------------------------------------------------------------------------

    Window_Preview.prototype.createConnectorRows = function() {
        console.log("Create connector rows");
        this._connectorRows = [];
        var disciplines = DataManager.getDisciplines();
        console.log("Disciplines", disciplines);
        // Create row elements up to and including the tracks.
        for (var i = 0; i < disciplines.length; i++) {
            var row = {};
            row.discipline = disciplines[i];
            // Strict marker
            row.strict = new Sprite(ImageManager.loadSystem("strict-indicator2-24"));
            row.strict.visible = false;
            this.addChild(row.strict);
            // Discipline icon
            row.icon = new Sprite(
                ImageManager.loadSystem(BattleManager.ITB_UI.getDisciplineImage(disciplines[i]))
            );
            row.icon.visible = false;
            this.addChild(row.icon);
            // Connector track
            row.track = new Sprite();
            row.track.bitmap = new Bitmap(this.connectorTrackWidth(), this.connectorTrackHeight());
            row.track.visible = false;
            this.addChild(row.track);
            // Output track
            row.outputTrack = new Sprite();
            row.outputTrack.bitmap = new Bitmap(
                this.connectorTrackWidth(),
                this.connectorOutputTrackHeight()
            );
            row.outputTrack.visible = false;
            this.addChild(row.outputTrack);
            this._connectorRows.push(row);
        }
        // Axis must be above all tracks.
        this.createConnectorAxis();
        // Track values must be above the axis.
        this._connectorRows.forEach(function(row) {
            // Connector values
            row.trackValues = new Sprite();
            row.trackValues.bitmap = new Bitmap(
                this.connectorTrackWidth(),
                this.connectorRowSpacing() + 8
            );
            row.trackValues.visible = false;
            this.addChild(row.trackValues);
            // Status marker
            row.mark = new Sprite(ImageManager.loadSystem("interdiction3-24"));
            row.mark.visible = false;
            this.addChild(row.mark);
            //this._connectorRows.push(row);
            // Connector validity indicator
            row.validityCheck = ImageManager.loadSystem("check-mark2-24");
            row.validityCross = ImageManager.loadSystem("cross-mark2-24");
            row.validity = new Sprite();
            row.validity.bitmap = row.validityCross;
            row.validity.visible = false;
            this.addChild(row.validity);
        }, this);
    };

    /* Window_Preview.prototype.setConnectorRowMark = function(row) {
        console.log("Set Connector Row Mark", row.state);
        if (row.state === "valid") {
            row.mark.bitmap = ImageManager.loadSystem("check-mark2-24");
            row.mark.visible = true;
            return;
        }
        if (row.state === "invalid" || row.state === "disconnected") {
            row.mark.bitmap = ImageManager.loadSystem("cross-mark2-24");
            row.mark.visible = true;
            return;
        }
        row.mark.visible = false;
    }; */

    //--------------------------------------------------------------------------
    // Connector input range helpers
    //--------------------------------------------------------------------------

    /* Window_Preview.prototype.connectorInputOffset = function(row) {
        return row.inputOffset;
        //var range = row.displayRange;
        //var interval = this.connectorInterval(row);
        //if (!interval) return 0;
        //return this.connectorValueToPixels(interval.right, range);
    }; */

    Window_Preview.prototype.connectorDisplayRange = function(row) {
        if (row.current === undefined) return null;
        console.log("Connector display range");
        var min = row.current;
        var max = row.current;
        if (row.output && row.output.mode === "set") {
            var outputValue = BattleManager.ITB_UI.getConnectorOutputValue(row.output);
            min = Math.min(min, outputValue);
            max = Math.max(max, outputValue);
        }
        if (row.input) {
            switch (row.input.type) {
                case "exact":
                    min = Math.min(min, row.input.value);
                    max = Math.max(max, row.input.value);
                    break;
                case "min":
                    min = Math.min(min, row.input.value);
                    max = Math.max(max, row.input.value);
                    break;
                case "max":
                    min = Math.min(min, row.input.value);
                    max = Math.max(max, row.input.value);
                    break;
                case "range":
                    min = Math.min(min, row.input.min);
                    max = Math.max(max, row.input.max);
                    break;
            }
        }
        /* console.log("Discipline", row.discipline);
        console.log("Min:", min);
        console.log("Max:", max);
        console.log("Output value:", row.output ? row.output.value : undefined);
        console.log("Current value:", row.current); */
        // Always leave one connector value of padding.
        return {min: min - 1, max: max + 1};
    };

    Window_Preview.prototype.connectorValueToPixels = function(value, range) {
        //console.log("Connector Value to Pixels");
        if (!range) return 0;
        var span = range.max - range.min;
        if (span <= 0) return 0;
        //console.log("Input value:", value);
        //console.log("Connector range:", range.min, range.max);
        return Math.round((value - range.min) * this.connectorTrackWidth() / span);
    };

    Window_Preview.prototype.connectorInputValue = function(row) {
        //console.log("Connector input value");
        //console.log("Input:", row.input);
        if (!row.input) return row.current;
        //console.log("Type:", row.input.type);
        //console.log("Value:", row.input.value);
        switch (row.input.type) {
            case "exact":
                return row.input.value;
            case "min":
                return row.input.value;
            case "max":
                return row.input.value;
            case "range":
                return row.input.min;
        }
        return row.current;
    };

    Window_Preview.prototype.connectorRowState = function(row) {
        return BattleManager.ITB_UI.connectorState(row);
    };

    /* Window_Preview.prototype.connectorRowState = function(row) {
        var hasInput = (row.current !== undefined);
        var hasConnector = !!row.input;
        var hasCondition = hasConnector && !!row.input.type;
        // No connector and no input value: nothing needs to be displayed.
        if (!hasInput && !hasConnector) return null;
        // Action has a connector, but without a condition.
        if (hasConnector && !hasCondition) return "unconditional";
        // Action has a condition, but the source has no value.
        if (!hasInput && hasCondition) return "disconnected";
        // Input value exists and action has a condition to evaluate.
        if (hasInput && hasCondition) return "conditional";
        // Input value exists, but action does not have a connector.
        // Strict/lax indicator determines whether this is valid.
        if (hasInput && !hasConnector) {
            return row.strict ? "invalid" : "valid";
        }
        return null;
    }; */

    Window_Preview.prototype.connectorInputExists = function(row) {
        return row.current !== undefined && row.current !== null;
    };

    /* Window_Preview.prototype.hasConnectorInput = function(row) {
        return row.current !== undefined;
    };

    Window_Preview.prototype.hasConnectorCondition = function(row) {
        return !!(row.input && row.input.type);
    };

    Window_Preview.prototype.hasConnectorTrack = function(row) {
        return (this.hasConnectorInput(row) && this.hasConnectorCondition(row));
    }; */

    //--------------------------------------------------------------------------
    // Draw separator
    //--------------------------------------------------------------------------

    Window_Preview.prototype.drawSeparator = function() {
        var x = this.separatorX();
        var y = this.lineHeight() + 4;
        var h = this.separatorHeight(); //this.lineHeight() + this.fittingHeight(1);
        this.contents.fillRect(x, y, 2, h, this.normalColor());
    };

    //--------------------------------------------------------------------------
    // Draw badge helpers
    //--------------------------------------------------------------------------

    Window_Preview.prototype.drawBadgeValue = function(badge, text, x, y, w, h) {
        badge._value.bitmap.clear();
        badge._value.bitmap.fontFace = this.badgeFontFace();
        //this.contents.fontBold = true;
        badge._value.bitmap.fontBold = true;
        badge._value.bitmap.fontSize = 30 / badge.scale.y;
        badge._value.bitmap.outlineWidth = 8;
        badge._value.bitmap.drawText(String(text), x, y, w, h, "center");
        //this.contents.fontBold = false;
    };

    Window_Preview.prototype.drawBadgeBonus = function(badge, text, x, y, w, h) {
        badge._bonus.bitmap.clear();
        badge._bonus.bitmap.fontFace = this.badgeFontFace();
        badge._bonus.bitmap.fontBold = true;
        badge._bonus.bitmap.fontSize = 22 / badge.scale.y;
        badge._value.bitmap.outlineWidth = 8;
        badge._bonus.bitmap.drawText(String(text), x, y, w, h, "center");
    };

    //--------------------------------------------------------------------------
    // Draw connectors helpers
    //--------------------------------------------------------------------------

    Window_Preview.prototype.drawConnectorHeader = function() {
        //console.log("Draw connector header");
        var actor = this._actor;
        var item = this._item;
        //console.log("Connector state validity", BattleManager.ITB_UI.isConnectorStateValid(item));
        if (!!this._scopeFailure) {
            this._header.validity.visible = false;
            this._header.check.visible = false;
            this._header.arrow.bitmap = ImageManager.loadSystem("cross-mark2-24");
            this._header.arrow.scale.x = 1;
            this._header.arrow.scale.y = 1;
        } else {
            this._header.validity.visible = true;
            this._header.validity.bitmap =
                BattleManager.ITB_UI.isConnectorStateValid(item)
                ? this._header.validityCheck
                : this._header.validityCross;
            var sprite = SceneManager._scene._actorCommandWindow.currentSelectionSprite();
            this._header.check.visible = sprite && sprite._queueMarker.visible;
            this._header.arrow.bitmap = ImageManager.loadSystem("cursor");
            this._header.arrow.scale.x = 0.5;
            this._header.arrow.scale.y = 0.5;
        }
        //console.log("Validity bitmap", this._header.validity.bitmap);
        var inputBitmap = this._header.inputIcon.bitmap;
        var outputBitmap = this._header.previewIcon.bitmap;
        //var arrowBitmap = this._header.arrow.bitmap;
        inputBitmap.clear();
        outputBitmap.clear();
        //arrowBitmap.clear();
        //this.layoutConnectorHeaderX();
        //console.log("Current selected sprite", sprite);
        //console.log("Action check mark", sprite._queueMarker.visible);
        //console.log("Preview check mark", this._header.check.visible);
        if (!actor || !item) return;
        var source = BattleManager.ITB_UI.connectorPreviewSource(actor);
        this.drawHeaderSourceIcon(inputBitmap, source);
        //this.drawActionIcon(inputBitmap, item.iconIndex);
        //this.drawHeaderArrow(arrowBitmap);
        this.drawActionIcon(outputBitmap, item.iconIndex);
        //if (BattleManager.actor() === actor) {
        //    this._header.check.visible = true;
        //}
    };

    Window_Preview.prototype.drawHeaderSourceIcon = function(bitmap, source) {
        bitmap.clear();
        console.log("Draw header source icon");
        if (!source) return;
        //console.log("Source:", source);
        if (source.type === "action") {
            var action = BattleManager.ITB_UI.actionObject(source.action);
            //console.log("Action:", action);
            //console.log("Index:", action.iconIndex);
            if (action) this.drawActionIcon(bitmap, action.iconIndex);
            return;
        }
        if (source.type === "target") {
            this.drawHeaderBattlerIcon(bitmap, source);
        }
    };

    /* Window_Preview.prototype.drawScopeFailure = function() {
        var reason = this._scopeFailure;
        if (!reason || !reason.target || !this._data) return;
        var target = reason.target;
        var item = BattleManager.ITB_UI.actionObject(this._data);
        var x = 0;
        var y = this.headerY();
        this.drawHeaderBattlerIcon(this.contents, target, x, y);
        x += Window_Base._iconWidth + 12;
        // Cross
        var cross = ImageManager.loadSystem("cross-mark2-24");
        this.contents.blt(cross, 0, 0, 24, 24, x, y + 4);
        x += 36;
        if (item) this.drawActionIconAt(this.contents, item.iconIndex, x, y);
    }; */

    Window_Preview.prototype.drawConnectorRows = function() {
        //console.log("Draw connector rows");
        var rows = this._previewRows;
        this._connectorLayout = this.buildConnectorLayout(rows);
        //var visibleTracks = false;
        this.clearRowSprites();
        //console.log("Rows:", rows);
        for (var i = 0; i < rows.length; i++) {
            var data = rows[i];
            var sprite = this._connectorRows.find(function(r) {
                return r.discipline === data.discipline;
            });
            //console.log("Sprite", sprite);
            if (!sprite) continue;
            sprite.preview = data;
            sprite.icon.visible = true;
            sprite.strict.visible = !!data.strict;
            sprite.state = data.state;
            /* No input condition:
            *    input exists + no condition
            *       -> valid/invalid depends on strict/lax
            *    no input value + no condition
            *       -> unconditional and valid -> omit row
            *  Input condition exists.
            *  Existing input value -> draw normal track.
            *  Missing input value  -> draw cross on axis.
            */
            visibleTrack = data.state === "conditional" || 
                data.state === "unconditional";
            sprite.track.visible = visibleTrack;
            sprite.mark.visible = (
                data.state === "valid" ||
                data.state === "invalid" ||
                data.state === "disconnected"
            );
            sprite.validity.visible = true;
            sprite.validity.bitmap = data.connectorValid
                ? sprite.validityCheck
                : sprite.validityCross;
            if (data.state !== "disconnected") {
                sprite.trackValues.visible = true;
                var outputValue = BattleManager.ITB_UI.getConnectorOutputValue(data.output);
                if (outputValue !== undefined && outputValue !== data.current) {
                    sprite.outputTrack.visible = true;
                }
            };
        }
        //console.log("Tracks visible", visibleTracks);
        //this._connectorLayout.visibleTracks = visibleTracks;
        this.layoutConnectorHeaderX();
        this.layoutConnectorRows();
        this._connectorRows.forEach(function(row) {
            /* console.log("Discipline", row.discipline);
            console.log(
                "Row track",
                row.track.x,
                row.track.y,
                row.track.visible,
                row.track.bitmap.width,
                row.track.bitmap.height
            ); */
            if (!row.preview) return;
            //if (!row.track.visible) return;
            //console.log("Axis", this._connectorLayout.axisX);
            //console.log("Input offset", row.inputOffset);
            this.drawConnectorTrack(row);
            this.drawConnectorOutputTrack(row);
            this.drawConnectorValues(row);
        }, this);
        /* rows.forEach(function(data) {
            var row = this._connectorRows.find(function(r) {
                return r.discipline === data.discipline;
            });
            if (!row) return;
            row.track.visible = !!data.input;
            if (!data.input) return;
            this.drawConnectorTrack(row.track.bitmap, data);
        }, this); */
    };

    Window_Preview.prototype.drawActionIcon = function(bitmap, iconIndex) {
        bitmap.clear();
        var pw = Window_Base._iconWidth;
        var ph = Window_Base._iconHeight;
        var sx = iconIndex % 16 * pw;
        var sy = Math.floor(iconIndex / 16) * ph;
        var icons = ImageManager.loadSystem("IconSet");
        bitmap.blt(icons, sx, sy, pw, ph, 0, 0);
    };

    Window_Preview.prototype.drawHeaderBattlerIcon = function(bitmap, source) {
        var battler = source.battler;
        if (!battler) return;
        var redrawCallback = function() {
            this.refresh();
        }.bind(this);
        this.drawActionIcon(bitmap, 16);
        var scale = 0.9;
        var width = bitmap.width * scale;
        var height = bitmap.height * scale;
        var x = (bitmap.width - width) / 2;
        var y = (bitmap.height - height) / 2;
        this.drawTargetMiniIconToBitmap(battler, bitmap, x, y, width, height, redrawCallback);
    };

    Window_Preview.prototype.drawConnectorTrack = function(row) {
        if (!row || !row.track || !row.track.visible) return;
        //if (row.state !== "conditional" && row.state !== "unconditional") return;
        track = row.track.bitmap;
        track.clear();
        //console.log("Draw connector track");
        //console.log("Bitmap", track);
        //bitmap.fillRect(0, y, w, 2, "rgba(80,80,80,1)");
        //var color1 = this.textColor(30);   // gauge left
        //var color2 = this.textColor(9);   // gauge right
        var color1;
        var color2;
        if (row.state === "conditional") {
            if (row.preview && row.preview.connectorValid) {
                color1 = "rgba(70,120,70,0.9)";
                color2 = "rgba(150,210,150,0.9)";
            } else {
                color1 = "rgba(130,60,60,0.9)";
                color2 = "rgba(220,130,130,0.9)";
            }
        } else {
            color1 = this.textColor(30);
            color2 = this.textColor(9);
        }
        var x = 0;
        var w = track.width;
        var interval = null;
        if (row.state === "conditional") {
            var span = this._connectorLayout.globalSpan;
            var interval = this.connectorInterval(row.preview);
            //console.log("Interval:", interval);
            //console.log("Span:", span);
            if (!span || !interval) return;
            x = this.connectorValueToPixels(interval.left, span);
            w = this.connectorValueToPixels(interval.right, span) - x + 1;
        }
        var openWidth = this.connectorOpenEndWidth();
        var leftX = x + openWidth;
        var rightX = x + w - openWidth - 1;
        var bodyWidth = w - 2 * openWidth;
        var h = track.height;
        var y = Math.floor(h / 2) - 1;
        /* console.log("Width", w);
        console.log("Height", h);
        console.log("X-position", x);
        console.log("Y-position", y); */
        // thin border
        //track.fillRect(leftX, y, bodyWidth, 1, this.gaugeBackColor());             // top
        //track.fillRect(leftX, y + h - 1, bodyWidth, 1, this.gaugeBackColor());// bottom
        if (!interval || interval.leftOpen) {
            this.drawConnectorOpenTeeth(track, leftX, y, h, -1, color1); // left
            if (!interval || interval.rightOpen) {
                track.gradientFillRect(leftX, y, bodyWidth, h, color1, color2);
                track.fillRect(leftX, y, bodyWidth, 1, this.gaugeBackColor()); // top
                track.fillRect(leftX, y + h - 1, bodyWidth, 1, this.gaugeBackColor()); // bottom
            } else {
                track.gradientFillRect(leftX, y, w - openWidth, h, color1, color2);
                track.fillRect(leftX, y, w - openWidth, 1, this.gaugeBackColor()); // top
                track.fillRect(leftX, y + h - 1, w - openWidth, 1, this.gaugeBackColor()); // bottom
            }
        } else {
            track.fillRect(x, y, 1, h, this.gaugeBackColor()); // left
            if (!interval || interval.rightOpen) {
                track.gradientFillRect(x, y, w - openWidth, h, color1, color2);
                track.fillRect(x, y, w - openWidth, 1, this.gaugeBackColor()); // top
                track.fillRect(x, y + h - 1, w - openWidth, 1, this.gaugeBackColor()); // bottom
            } else {
                track.gradientFillRect(x, y, w, h, color1, color2);
                track.fillRect(x, y, w, 1, this.gaugeBackColor()); // top
                track.fillRect(x, y + h - 1, w, 1, this.gaugeBackColor()); // bottom
            }
        }
        if (!interval || interval.rightOpen) {
            this.drawConnectorOpenTeeth(track, rightX, y, h, 1, color2); // right
        } else {
            track.fillRect(x + w - 1, y, 1, h, this.gaugeBackColor()); // right
        }
    };

    Window_Preview.prototype.drawConnectorOutputTrack = function(row) {
        if (!row || !row.outputTrack || !row.outputTrack.visible) return;
        var track = row.outputTrack.bitmap;
        track.clear();
        var data = row.preview;
        if (!data || data.current === undefined) return;
        var input = data.current;
        var output = BattleManager.ITB_UI.getConnectorOutputValue(data.output);
        if (output === undefined || output === input) return;
        var span = this._connectorLayout.globalSpan;
        if (!span) return;
        var inputX = this.connectorValueToPixels(0, span);
        var outputX = this.connectorValueToPixels(output - input, span);
        var left = Math.min(inputX, outputX);
        var right = Math.max(inputX, outputX);
        var arrowWidth = this.connectorOutputArrowWidth();
        var trackHeight = track.height;
        var y = Math.floor(trackHeight / 2);
        var direction = output > input ? 1 : -1;
        var trackLeft;
        var trackWidth;
        if (direction > 0) {
            trackLeft = inputX;
            trackWidth = outputX - inputX - arrowWidth;
        } else {
            trackLeft = outputX + arrowWidth;
            trackWidth = inputX - outputX - arrowWidth;
        }
        trackWidth = Math.max(1, trackWidth);
        var color1 = "rgba(140,155,160,0.95)";
        var color2 = "rgba(190,205,210,0.95)";
        track.gradientFillRect(
            trackLeft,
            y,
            trackWidth,
            trackHeight,
            color1,
            color2
        );
        // Thin border around the track body.
        /* track.fillRect(
            trackLeft,
            y,
            trackWidth,
            1,
            this.gaugeBackColor()
        ); */
        // Arrow head at the output value.
        track.context.beginPath();
        if (direction > 0) {
            track.context.fillStyle = color2;
            track.context.moveTo(outputX, y + trackHeight / 4);
            track.context.lineTo(outputX - arrowWidth, y);
            track.context.lineTo(outputX - arrowWidth, y + trackHeight / 2);
        } else {
            track.context.fillStyle = color1;
            track.context.moveTo(outputX, y + trackHeight / 4);
            track.context.lineTo(outputX + arrowWidth, y);
            track.context.lineTo(outputX + arrowWidth, y + trackHeight / 2);
        }
        track.context.closePath();
        track.context.fill();
    };

    /* Window_Preview.prototype.drawHeaderArrow = function(bitmap) {
        bitmap.clear(); 
        bitmap.paintOpacity = 255;
        bitmap.drawText("→", 0, 0, bitmap.width, bitmap.height, "center");
    }; */

    Window_Preview.prototype.drawConnectorValues = function(row) {
        //console.log("Draw connector values");
        //console.log("Row", row);
        //console.log("Discipline", row.discipline);
        //console.log("Preview", row.preview);
        //console.log("Values", row.trackValues);
        if (!row || !row.trackValues) return;
        bitmap = row.trackValues.bitmap;
        bitmap.clear();
        //console.log("Bitmap", bitmap);
        var span = this._connectorLayout.globalSpan;
        var data = row.preview;
        if (!span) return;
        var axis = this.connectorValueToPixels(0, span);
        var boundaries = this.connectorBoundaries(data.input);
        //console.log("Boundaries", boundaries);
        //console.log("Left", left);
        //console.log("Right", right);
        // Input value
        //console.log("Input", data.current);
        var inputLabel = data.current;
        var outputLabel = BattleManager.ITB_UI.getConnectorOutputValue(data.output);
        if (inputLabel !== undefined) {
            bitmap.textColor = "rgba(237,180,130,1.0)";
        } else if (outputLabel !== undefined) {
            inputLabel = outputLabel;
            bitmap.textColor = "rgba(225,235,240,1.0)";
        } else {
            inputLabel = "?";
            bitmap.textColor = "rgba(234,19,45,1.0)";
        }
        bitmap.fontSize = 20;
        bitmap.outlineWidth = 6;
        //console.log("Input label", inputLabel);
        //console.log("Output label", outputLabel);
        //console.log("Axis X-position", axis);
        // Same visual idea as redrawInitiative():
        var y = Math.floor(bitmap.height * 0.25);
        bitmap.drawText(
            inputLabel,
            axis - 12,
            y,
            32,
            bitmap.height,
            "center"
        );
        if (outputLabel !== undefined && outputLabel !== inputLabel) {
            var outputX = this.connectorValueToPixels(outputLabel - inputLabel, span);   
            //console.log("Output X-position", outputX);
            bitmap.textColor = "rgba(225,235,240,1.0)";
            bitmap.outlineWidth = 6;
            bitmap.drawText(
                outputLabel,
                outputX - 12,
                y,
                32,
                bitmap.height,
                "center"
            );
        }
        var interval = this.connectorInterval(data);
        //console.log("Interval", interval);
        if (!interval ) return;
        var left = this.connectorValueToPixels(interval.left, span);
        var right = this.connectorValueToPixels(interval.right, span) + 1;
        //console.log("Left boundary", left);
        //console.log("Right boundary", right);
        bitmap.textColor = this.textColor(6);
        bitmap.outlineWidth = 5;
        if (boundaries !== null) {
            if (boundaries.left !== undefined && 
                boundaries.left !== data.current &&
                boundaries.left !== outputLabel) {
                    bitmap.drawText(
                        boundaries.left,
                        left - 8,
                        y,
                        32,
                        bitmap.height,
                        "center"
                    );
            }
            if (boundaries.right !== undefined && 
                boundaries.right !== boundaries.left &&
                boundaries.right !== data.current &&
                boundaries.right !== outputLabel) {
                    bitmap.drawText(
                        boundaries.right,
                        right - 12,
                        y,
                        32,
                        bitmap.height,
                        "center"
                    );
            }
        }
    };

    Window_Preview.prototype.connectorBoundaries = function(input) {
        //console.log("Input", input);
        if (!input) return null;
        //console.log("Type", input.type);
        switch (input.type) {
            case "exact":
                return {
                    left: input.value,
                    right: input.value
                };
            case "min":
                return {
                    left: input.value
                };
            case "max":
                return {
                    right: input.value
                };
            case "range":
                return {
                    left: input.min,
                    right: input.max
                };
            }
        return null;
    };

    //--------------------------------------------------------------------------
    // Reset connector row sprites
    //--------------------------------------------------------------------------

    Window_Preview.prototype.clearRowSprites = function() {
        if (!this._connectorRows) return;
        for (var i = 0; i < this._connectorRows.length; i++) {
            var sprite = this._connectorRows[i];
            sprite.preview = null;
            sprite.state = null;
            sprite.strict.visible = false;
            sprite.icon.visible = false;
            sprite.track.visible = false;
            sprite.outputTrack.visible = false;
            sprite.trackValues.visible = false;
            sprite.mark.visible = false;
            sprite.validity.visible = false;
            // Clear previous track and value drawings.
            sprite.track.bitmap.clear();
            sprite.outputTrack.bitmap.clear();
            sprite.trackValues.bitmap.clear();
        }
    }

    //--------------------------------------------------------------------------
    // Draw actor icon
    //--------------------------------------------------------------------------

    /* Window_Preview.prototype.drawHeaderActorFace = function(bitmap, actor) {
        var faceBitmap = ImageManager.loadFace(actor.faceName());
        var pw = Window_Base._faceWidth;
        var ph = Window_Base._faceHeight;
        var index = actor.faceIndex();
        var sx = (index % 4) * pw;
        var sy = Math.floor(index / 4) * ph;
        bitmap.blt(faceBitmap, sx, sy, pw, ph, 0, 0, bitmap.width, bitmap.height);
    };
 */
    //--------------------------------------------------------------------------
    // Draw enemy icon
    //--------------------------------------------------------------------------

    /* Window_Preview.prototype.drawHeaderEnemy = function(destBitmap, sprite) {
        console.log("Draw Enemy Header");
        this.drawActionIcon(destBitmap, 16);
        sourceBitmap = sprite.bitmap;
        if (!sourceBitmap.isReady()) {
            this._needsHeaderRefresh = true;
            return;
        }
        if (sprite._isSvEnemy) {
            var sw = sourceBitmap.width / 9;
            var sh = sourceBitmap.height / 6;
        } else {
            var sw = sourceBitmap.width;
            var sh = sourceBitmap.height;
        }
        var dw = destBitmap.width;
        var dh = destBitmap.height;
        var dx = 0;
        var dy = 0;
        if (sw >= sh) {
            var rate = sh / sw;
            dh *= rate;
            dy += (destBitmap.height - dh);
        } else {
            var rate = sw / sh;
            dw *= rate;
            dx += Math.floor((destBitmap.width - dw) / 2);
        }
        console.log("Draw icon", destBitmap);
        console.log(
            "Enemy bitmap:",
            destBitmap.width,
            destBitmap.height
        );
        console.log(
            "Source rect:",
            0,
            0,
            sw,
            sh
        );
        console.log(
            "Destination rect:",
            dx,
            dy,
            dw,
            dh
        );
        destBitmap.blt(sourceBitmap, 0, 0, sw, sh, dx, dy, dw, dh);
    }; */

    //--------------------------------------------------------------------------
    // Draw connector indicator
    //--------------------------------------------------------------------------

    Window_Preview.prototype.drawConnectorAxis = function() {
        //var startY = this.headerY() + Window_Base._iconHeight + 8;
        //var endY = this.height - this.fittingHeight(1);
        //if (!this._connectorLayout || !this._connectorLayout.visibleTracks) return;
        console.log("Draw connector axis");
        if (!this._axisSprite || !this._axisSprite.bitmap) return;
        var bitmap = this._axisSprite.bitmap;
        //console.log("Height", bitmap.height);
        bitmap.clear();
        if (!this._axisSprite.visible) return;
        var color = "rgba(237,180,130,0.9)";
        for (var y = 0; y < bitmap.height; y += 8) {
            bitmap.fillRect(0, y, 4, 4, color);
        }
        /* var startY = this.lineHeight();
        var endY = startY + this.fittingHeight(1.5);
        var color = "rgba(220,220,220,0.75)";
        for (var y = startY; y < endY; y += 8) {
            this.contents.fillRect(this.connectorAxisX(), y, 2, 4, color);
            //this.contents.fillRect(this.connectorAxisX() - 1, 0, 4, this.contentsHeight(), "red");
        }*/
    };

    //--------------------------------------------------------------------------
    // Connector track geometry helpers
    //--------------------------------------------------------------------------

    Window_Preview.prototype.connectorOpenEndWidth = function() {
        var span = this._connectorLayout && this._connectorLayout.globalSpan;
        if (!span) return 0;
        return Math.abs(
            this.connectorValueToPixels(0.15, span) -
            this.connectorValueToPixels(0, span)
        );
    };

    Window_Preview.prototype.drawConnectorOpenTeeth = function(bitmap, x, y, h, dir, color) {
        var w = this.connectorOpenEndWidth();
        if (w <= 0) return;
        bitmap.context.fillStyle = color;
        //var toothWidth = w;
        //var toothHeight = h;
        var spacing = 3 * h / 8 - 1;
        for (var i = 0; i < 2; i++) {
            var top = y + i * spacing + 1;
            var bottom = top + spacing;
            var middle = top + spacing / 2;
            bitmap.context.beginPath();
            if (dir < 0) {
                // Open toward the left.
                bitmap.context.moveTo(x, top);
                bitmap.context.lineTo(x - w, middle);
                bitmap.context.lineTo(x, bottom);
            } else {
                // Open toward the right.
                bitmap.context.moveTo(x, top);
                bitmap.context.lineTo(x + w, middle);
                bitmap.context.lineTo(x, bottom);
            }
            bitmap.context.closePath();
            bitmap.context.fill();
        }
    };

    //==========================================================================
    // Window_Base
    //==========================================================================

    function Window_ITBAction() {
        this.initialize.apply(this, arguments);
    }

    Window_ITBAction.prototype = Object.create(Window_Base.prototype);
    Window_ITBAction.prototype.constructor = Window_ITBAction;

    //--------------------------------------------------------------------------
    // Initialize
    //--------------------------------------------------------------------------

    Window_ITBAction.prototype.initialize = function() {
        this._reason = null;
        this._actionData = null;
        this._queueNoticeActor = null;
        this._lastQueueLength = null;
        this._queueNoticeTimer = 0;
        this._queueNoticeActive = false;
        this._scrollY = 0;
        this._maxScrollY = 0;
        Window_Base.prototype.initialize.call(this, 0, 95, Graphics.boxWidth, 1);
        this.openness = 0;
        this.visible = false;
    };

    //--------------------------------------------------------------------------
    // Pop up state and visibility
    //--------------------------------------------------------------------------

    Window_ITBAction.prototype.showReason = function(reason, actionData) {
        this._reason = reason;
        this._actionData = actionData;
        this.refresh();
        this.show();
        this.open();
    };

    Window_ITBAction.prototype.hide = function() {
        this._reason = null;
        this._actionData = null;
        this.close();
        Window_Base.prototype.hide.call(this);
    };

    //--------------------------------------------------------------------------
    // Window geometry
    //--------------------------------------------------------------------------

    Window_ITBAction.prototype.updatePosition = function() {
        var scene = SceneManager._scene;
        // Display message below the timeline.
        this.x = 0;
        this.y = 95;
        // Stop at the actor portrait window.
        if (scene && scene._itbActorPortraitWindow) {
            this.width = scene._itbActorPortraitWindow.x;
        } else {
            this.width = Graphics.boxWidth;
        }
        // Normally the popup occupies the Battle Log area and ends
        // at the top of the Battle Status window.
        var bottom = Graphics.boxHeight;
        if (scene && scene._statusWindow) bottom = scene._statusWindow.y;
        // If Preview is visible, keep the popup above it.
        if ($gameSystem.isITBPreviewVisible() && scene && scene._previewWindow) {
            var preview = scene._previewWindow;
            bottom = Math.min(bottom, preview.y - 8);
        }
        // Return the maximum available height.
        return Math.max(1, bottom - this.y);
    };

    Window_ITBAction.prototype.contentHeight = function() {
        var lines = 1; // Action header
        if (!this._reason || !this._actionData) return lines * this.lineHeight();
        switch (this._reason.type) {
            case "queue_full":
                lines += 1;
                break;
            case "connector":
                lines += 1;
                break;
            case "unusable":
                lines += 1;
                break;
        }
        return lines * this.lineHeight();
    };

    Window_ITBAction.prototype.requiredContentHeight = function() {
        var lines = 0;
        // Action header.
        lines += 1;
        if (this._queueNoticeActive) {
            lines += 2;
        } else if (!this._reason || !this._actionData) {
            lines += 0;
        } else {
            switch (this._reason.type) {
                case "queue_full":
                    lines += 1;
                    break;
                case "connector":
                    // Header + requirement + explanation.
                    lines += 2;
                    break;
                case "unusable":
                    lines += 1;
                    break;
            }
        }
        return lines * this.lineHeight();
    };

    //--------------------------------------------------------------------------
    // Refresh
    //--------------------------------------------------------------------------

    Window_ITBAction.prototype.refresh = function() {
        this.height = this.updatePosition();
        var visibleHeight = this.height - this.standardPadding() * 2;
        var requiredHeight = this.requiredContentHeight();
        var contentsHeight = Math.max(visibleHeight, requiredHeight);
        this.contents = new Bitmap(this.contentsWidth(), contentsHeight);
        this.contents.clear();
        this.resetFontSettings();
        this.contents.fontSize = 26;
        if (this._queueNoticeActive) {
            this.drawQueueFullNotice();
            return;
        }
        if (!this._reason || !this._actionData) return;
        this.drawActionHeader();
        switch (this._reason.type) {
            case "queue_full":
                this.drawQueueFull();
                break;
            case "connector":
                this.drawConnector();
                break;
            case "unusable":
                this.drawUnusable();
                break;
        }
        var contentHeight = this.contentHeight();
        this._maxScrollY = Math.max(0, requiredHeight - visibleHeight);
        this._scrollY = Math.min(this._scrollY, this._maxScrollY);
        this.origin.y = this._scrollY;
    };

    //--------------------------------------------------------------------------
    // Update
    //--------------------------------------------------------------------------

    Window_ITBAction.prototype.update = function() {
        Window_Base.prototype.update.call(this);
        this.updateQueueFullNotice();
        if (!this.visible) return;
        this.updateScroll();
        if (this._queueNoticeActive) this.updateQueueFullNoticeClick();
    };

    Window_ITBAction.prototype.updateQueueFullNoticeClick = function() {
        if (!TouchInput.isTriggered()) return;
        var x = TouchInput.x;
        var y = TouchInput.y;
        if (
            x >= this.x &&
            x < this.x + this.width &&
            y >= this.y &&
            y < this.y + this.height
        ) {
            this.hideQueueFullNotice();
        }
    };

    //--------------------------------------------------------------------------
    // Action queue tracking helper
    //--------------------------------------------------------------------------

    Window_ITBAction.prototype.updateQueueFullNotice = function() {
        var actor = BattleManager.actor();
        if (!actor) {
            this._queueNoticeActor = null;
            this._lastQueueLength = null;
            return;
        }
        // New active actor: establish a baseline without triggering.
        if (this._queueNoticeActor !== actor) {
            this._queueNoticeActor = actor;
            this._lastQueueLength = actor.queueLength();
            return;
        }
        var queueLength = actor.queueLength();
        if (this._lastQueueLength === 1 && queueLength === 2) {
            this.showQueueFullNotice();
        }
        this._lastQueueLength = queueLength;
        if (!this._queueNoticeActive) return;
        this._queueNoticeTimer--;
        if (this._queueNoticeTimer <= 0) this.hideQueueFullNotice();
    };

    //--------------------------------------------------------------------------
    // Queue notice states
    //--------------------------------------------------------------------------

    Window_ITBAction.prototype.showQueueFullNotice = function() {
        this._queueNoticeActive = true;
        this._queueNoticeTimer = 360; // 2.5 seconds at 60 FPS
        this.refresh();
        this.show();
        this.open();
    };

    Window_ITBAction.prototype.hideQueueFullNotice = function() {
        this._queueNoticeActive = false;
        this._queueNoticeTimer = 0;
        this.close();
        Window_Base.prototype.hide.call(this);
    };

    //--------------------------------------------------------------------------
    // Window scroll helper
    //--------------------------------------------------------------------------

    Window_ITBAction.prototype.updateScroll = function() {
        if (this._maxScrollY <= 0) {
            this._scrollY = 0;
            this.origin.y = 0;
            return;
        }
        if (Input.isRepeated("up")) this._scrollY -= this.lineHeight();
        if (Input.isRepeated("down")) this._scrollY += this.lineHeight();
        this._scrollY = Math.max(0, Math.min(this._scrollY, this._maxScrollY));
        this.origin.y = this._scrollY;
    };

    //--------------------------------------------------------------------------
    // Draw text
    //--------------------------------------------------------------------------

    Window_ITBAction.prototype.drawActionHeader = function() {
        var action = BattleManager.ITB_UI.actionObject(this._actionData);
        if (!action) return;
        var text = "Action";
        var x = 0;
        this.drawText(text, x, 0, this.textWidth(text));
        x += this.textWidth(text) + 10;
        if (action.iconIndex !== undefined) {
            this.drawIcon(action.iconIndex, x, 0);
            x += Window_Base._iconWidth + 10;
        }
        var actionName = action.name || "";
        var suffix = "";
        switch (this._reason.type) {
            case "queue_full":
                suffix =
                    "cannot be added. Your action queue is full.";
                break;
            case "connector":
                suffix =
                    "is not valid.";
                break;
            case "unusable":
                suffix =
                    "cannot be used.";
                break;
            case "scope":
                suffix =
                    "cannot be used on this target.";
                break;
        }
        this.drawText(actionName + " " + suffix, x, 0, this.contents.width - x);
    };

    Window_ITBAction.prototype.drawUnusable = function() {
        this.drawText(
            "You can't use that right now.",
            0,
            this.lineHeight(),
            this.contents.width
        );
    };

    Window_ITBAction.prototype.drawQueueFull = function() {
        var y = this.lineHeight();
        /* this.drawText(
            "Your action queue is full.",
            0,
            y,
            this.contents.width
        );
        y += this.lineHeight(); */
        var text1 = "Finish";
        var text2 = "your queued actions or undo";
        var text3 = "the last one.";
        var commands = BattleManager.ITB_UI.getMainCommands();
        var finish = commands.filter(function(command) {
            return command.id === "finish";
        })[0];
        var undo = commands.filter(function(command) {
            return command.id === "undo";
        })[0];
        var x = 0;
        this.drawText(text1, x, y, this.textWidth(text1));
        x += this.textWidth(text1) + 8;
        if (finish) {
            this.drawIcon(finish.iconIndex, x, y);
            x += Window_Base._iconWidth + 10;
        }
        this.drawText(text2, x, y, this.textWidth(text2));
        x += this.textWidth(text2) + 8;
        if (undo) {
            this.drawIcon(undo.iconIndex, x, y);
            x += Window_Base._iconWidth + 10;
        }
        this.drawText(text3, x, y, this.contents.width - x);
    };

    Window_ITBAction.prototype.drawConnector = function() {
        var failures = this._reason.failures || [];
        console.log("=== ITB ACTION CONNECTOR DEBUG ===");
        // One failure: show the specific requirement.
        if (failures.length === 1) {
            console.log("Single failure:", failures[0]);
            var result = this.getConnectorMessage(failures[0]);
            console.log("Single failure message result:", result);
            if (!result) {
                console.log("Single failure returned no message result.");
                return;
            }
            this.drawConnectorFailure(failures[0], this.lineHeight());
            return;
        }
        // Multiple failures: show the generic explanation.
        console.log("Multiple/no failures -> generic message path");
        var result = this.getConnectorMessage();
        console.log("Generic connector message result:", result);
        if (!result) {
            console.log("Generic connector message returned no result.");
            return;
        }
        this.drawText(result.message, 0, this.lineHeight(), this.contents.width);
        this.drawPreviewExplanation(result.explanation, this.lineHeight() * 2);
    };

    Window_ITBAction.prototype.drawConnectorFailure = function(failure, y) {
        var result = this.getConnectorMessage(failure);
        console.log("=== DRAW CONNECTOR FAILURE ===");
        console.log("Failure:", failure);
        console.log("Result:", result);
        console.log("Y:", y);
        if (!result) return;
        var x = 0;
        // Prefix, e.g. "That action needs"
        var prefix = result.prefix || "";
        this.drawText(prefix, x, y, this.textWidth(prefix));
        x += this.textWidth(prefix) + 8;
        // Discipline name
        var discipline = result.discipline || "";
        this.drawText(discipline, x, y, this.textWidth(discipline));
        x += this.textWidth(discipline) + 10;
        // Discipline image immediately after the discipline name
        if (result.image) {
            this.drawSystemImage(result.image, x, y + 2, 28);
            x += 38;
        }
        // Requirement / condition
        var requirement = result.requirement || "";
        if (requirement) {
            this.drawText(requirement, x, y, this.textWidth(requirement));
            x += this.textWidth(requirement) + 8;
        }
        // Remaining text, e.g. "on this target."
        var suffix = result.suffix || "";
        this.drawText(suffix, x, y, this.contents.width - x);
    };

    Window_ITBAction.prototype.drawPreviewExplanation = function(text, y) {
        if (!text) return;
        var commands = BattleManager.ITB_UI.getMainCommands();
        var preview = commands.filter(function(command) {
            return command.id === "preview";
        })[0];
        var phrase = "Check the Preview";
        var x = 0;
        this.drawText(phrase, x, y, this.textWidth(phrase)
        );
        x += this.textWidth(phrase) + 8;
        if (preview) {
            this.drawIcon(preview.iconIndex, x, y + 2);
            x += 42;
        }
        var remainder = text;
        if (text.indexOf("Check the Preview") === 0) {
            remainder = text.substring("Check the Preview".length);
        }
        this.drawText(remainder, x, y, this.contents.width - x);
    };

    Window_ITBAction.prototype.drawQueueFullNotice = function() {
        var commands = BattleManager.ITB_UI.getMainCommands();
        var finish = commands.filter(function(command) {
            return command.id === "finish";
        })[0];
        var undo = commands.filter(function(command) {
            return command.id === "undo";
        })[0];
        var x = 0;
        var y = 0;
        var message = "Your action queue is full.";
        this.drawText(message, x, y, this.contents.width);
        y += this.lineHeight();
        var text1 = "Finish";
        var text2 = "your queued actions or undo";
        var text3 = "the last one.";
        this.drawText(text1, x, y, this.textWidth(text1));
        x += this.textWidth(text1) + 8;
        if (finish) {
            this.drawIcon(finish.iconIndex, x, y + 2);
            x += 42;
        }
        this.drawText(text2, x, y, this.textWidth(text2));
        x += this.textWidth(text2) + 8;
        if (undo) {
            this.drawIcon(undo.iconIndex, x, y + 2);
            x += 42;
        }
        this.drawText(text3, x, y, this.contents.width - x);
    };

    //--------------------------------------------------------------------------
    // Return the specific connector invalidity information and text
    //--------------------------------------------------------------------------

    Window_ITBAction.prototype.getConnectorMessage = function(failure) {
        var failures = this._reason.failures || [];
        console.log("=== getConnectorMessage DEBUG ===");
        /*
        * Multiple failures:
        * If all failures are the same type, give a useful
        * generic message based on that type and source.
        * If different failure types are mixed, use the
        * completely generic message.
        */
        if (!failure && failures.length > 1) {
            var states = {};
            failures.forEach(function(failure) {
                states[failure.state] = true;
            });
            var source = this._reason.source;
            var stateKeys = Object.keys(states);
            // Mixed failure types.
            if (stateKeys.length !== 1) {
                return {
                    message: "This action is not valid.",
                    explanation: "Check the Preview to see why not."
                };
            }
            var state = stateKeys[0];
            switch (state) {
                case "disconnected":
                    if (source === "target") {
                        return {
                            message: "That action can't be used on this target.",
                            explanation: "Check the preview to see why."
                        };
                    }
                    return {
                        message: "That action can't follow your previous action.",
                        explanation: "Check the preview to see why."
                    };
                case "conditional":
                    if (source === "target") {
                        return {
                            message: "That action doesn't work with this target right now.",
                            explanation: "Check the preview to see what's required."
                        };
                    }
                    return {
                        message: "That action doesn't work after your previous action.",
                        explanation: "Check the preview to see what's required."
                    };
                case "invalid":
                    if (source === "target") {
                        return {
                            message: "That action doesn't match this target.",
                            explanation: "Check the preview to see which discipline is needed."
                        };
                    }
                    return {
                        message: "That action doesn't match your previous action.",
                        explanation: "Check the preview to see which discipline is needed."
                    };
                default:
                    return {
                        message: "This action is not valid.",
                        explanation: "Check the Preview to see why not."
                    };
            }
        }
        console.log("Single failure state:", failure.state);
        console.log("Single failure row:", failure.row);
        console.log("Single failure discipline:", failure.discipline);
        console.log("Connector source:", this._reason.source);
        /*
        * Single failure:
        * Build the specific connector explanation.
        */
        if (!failure || !failure.row) return null;
        var row = failure.row;
        var discipline = failure.discipline;
        var names = DataManager.getDisciplines();
        var displayName = names[discipline] || discipline;
        var result = {
            prefix: "That action needs",
            discipline: displayName,
            image: BattleManager.ITB_UI.getDisciplineImage(discipline),
            requirement: "",
            suffix: ""
        };
        var source = this._reason.source;
        var condition = row.input && row.input.type ? row.input : null;
        /*
        * Disconnected:
        * The action requires this connector, but the source
        * does not provide it.
        */
        if (failure.state === "disconnected") {
            if (source === "target") {
                result.suffix = "to work on this target.";
            } else {
                result.suffix = "to follow your previous action.";
            }
            return result;
        }
        /*
        * Conditional:
        * The source has the connector, but its value does not
        * satisfy the required condition.
        */
        if (failure.state === "conditional" && condition) {
            console.log("Conditional connector detected.");
            console.log("Condition:", condition);
            switch (condition.type) {
                case "exact":
                    result.requirement = String(condition.value);
                    break;
                case "min":
                    result.requirement =
                        String(condition.value) + " or higher";
                    break;
                case "max":
                    result.requirement =
                        String(condition.value) + " or less";
                    break;
                case "range":
                    result.requirement =
                        String(condition.min) +
                        "\u2013" +
                        String(condition.max);
                    break;
            }
            if (source === "target") {
                result.suffix = "on this target.";
            } else {
                result.suffix = "after your previous action.";
            }
            console.log("Conditional result:", result);
            return result;
        }
        /*
        * Invalid:
        * The source has a strict connector, but the action
        * does not explicitly use that connector.
        */
        if (failure.state === "invalid") {
            console.log("Invalid connector detected.");
            console.log("Invalid result:", result);
            if (source === "target") {
                result.suffix = "to follow this target.";
            } else {
                result.suffix = "after your previous action.";
            }
            return result;
        }
        return null;
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
    // Draw system icon helper
    //--------------------------------------------------------------------------

    Window_Base.prototype.createSystemSprite = function(filename) {
        var sprite = new Sprite(ImageManager.loadSystem(filename));
        //sprite.scale.x = 0.5 / sprite.bitmap.width;
        //sprite.scale.y = 0.5 / sprite.bitmap.height;
        return sprite;
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
        var size = this._actorIconSize;
        var window = this;
        function drawFace() {
            if (window.contents && !window.contents._destroyed) {
                window.contents.blt(bitmap, sx, sy, pw, ph, x, y, size, size);
            }
        }
        if (bitmap.isReady()) {
            drawFace();
        } else {
            bitmap.addLoadListener(drawFace);
        }
        /* this.contents.blt(
            bitmap, 
            sx, 
            sy, 
            pw, 
            ph, 
            x, 
            y, 
            this._actorIconSize, 
            this._actorIconSize
        ); */
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
        //console.log("Image", bitmap);
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
    // Window_BattleEnemy
    //==========================================================================

    var ITB_Command_WBE_select = Window_BattleEnemy.prototype.select;
    Window_BattleEnemy.prototype.select = function(index) {
        ITB_Command_WBE_select.call(this, index);
        if (!BattleManager._connectorTargetMode) return;
        BattleManager.ITB_UI.updateTargetBrowse(this.enemy());
    };

    //==========================================================================
    // Window_BattleActor
    //==========================================================================

    var ITB_Command_WBA_select = Window_BattleActor.prototype.select;
    Window_BattleActor.prototype.select = function(index) {
        ITB_Command_WBA_select.call(this, index);
        if (!BattleManager._connectorTargetMode) return;
        BattleManager.ITB_UI.updateTargetBrowse(this.actor());
    };

    //--------------------------------------------------------------------------
    // Update for process handling
    //--------------------------------------------------------------------------

    Window_BattleActor.prototype.update = function() {
        Window_BattleStatus.prototype.update.call(this);
        if (this._ignoreInitialOk && !Input.isPressed("ok")) {
            this._ignoreInitialOk = false;
        }
    };

    //==========================================================================
    // Scene_Battle
    //==========================================================================

    //--------------------------------------------------------------------------
    // Update handlers
    //--------------------------------------------------------------------------

    var ITB_Command_SB_update = Scene_Battle.prototype.update;
    Scene_Battle.prototype.update = function() {
        var actorCommand = this._actorCommandWindow;
        // Route clicks to the visible command UI during connector target
        // preselection, even though the command window is inactive.
        if (
            BattleManager._connectorTargetMode &&
            actorCommand &&
            actorCommand.visible &&
            TouchInput.isTriggered()
        ) {
            var x = TouchInput.x - actorCommand.x;
            var y = TouchInput.y - actorCommand.y;
            // Only intercept clicks within the actor command window.
            if (x >= 0 && y >= 0 && x < actorCommand.width && y < actorCommand.height) {
                actorCommand.updateMouseClick();
            }
        }
        ITB_Command_SB_update.call(this);
        //this.updateITBTargetBrowseState();
    //     // Use mouse wheel to toggle between actors in battle status window
    //     if (TouchInput.wheelY >= 20) {
    //         this.cycleStatusActor(1);
    //     }
    //     if (TouchInput.wheelY <= -20) {
    //         this.cycleStatusActor(-1);
    //     }
        if (!actorCommand) return;
        // Preserve existing action-row wheel scrolling.
        if (
            actorCommand.active ||
            (this._enemyWindow && this._enemyWindow.active) ||
            (this._actorWindow && this._actorWindow.active)
        ) {
            if (TouchInput.wheelY >= 20) actorCommand.scrollITBActionRows(1);
            if (TouchInput.wheelY <= -20) actorCommand.scrollITBActionRows(-1);
        }
        /* if (BattleManager._connectorTargetMode) {
            if (Input.isRepeated('right')) {
                BattleManager.ITB_UI.moveTargetBrowse(1);
            }
            if (Input.isRepeated('left')) {
                BattleManager.ITB_UI.moveTargetBrowse(-1);
            }
        } */
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

    Scene_Battle.prototype.selectITBDisplayedActor = function(actor) {
        if (!actor || !this._statusWindow) return;
        console.log("Portrait selected:", actor.name(), actor.index());
        // Always update the displayed actor in the battle status window.
        this._statusWindow.setDisplayedActor(actor);
        console.log("Status selection:", this._statusWindow.index());
        console.log("Displayed actor:", this._statusWindow._displayedActor.name());
        // When actor-target browsing is active, also select the actor sprite.
        if (this._actorWindow && this._actorWindow.active) {
            var members = $gameParty.battleMembers();
            var actorIndex = members.indexOf(actor);
            if (actorIndex >= 0) this._actorWindow.select(actorIndex);
        }
    };

    //Scene_Battle.prototype.resetITBDisplayedActor = function() {
    //    if (!this._statusWindow) return;
    //    this._statusWindow.clearDisplayedActor();
    //    this._statusWindow.refreshActiveActor();
    //};

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
        this._statusWindow.refreshActiveActor();
        //this.resetITBDisplayedActor()
        //var actor = BattleManager.actor();
        //if (!actor) return;
        //this._statusWindow.select(actor.index());
        //this._statusWindow.setTopRow(actor.index());
        //this._statusWindow.refresh();
    };

    //--------------------------------------------------------------------------
    // Create All Windows
    //--------------------------------------------------------------------------

    ITB_Command_SB_createAllWindows = Scene_Battle.prototype.createAllWindows;
    Scene_Battle.prototype.createAllWindows = function() {
        ITB_Command_SB_createAllWindows.call(this);
        this.createITBActorPortraits();
        this.createPreviewWindow();
        this.createITBActionWindow();
    };

    //--------------------------------------------------------------------------
    // Create Actor Portraits Window 
    //--------------------------------------------------------------------------

    Scene_Battle.prototype.createITBActorPortraits = function() {
        this._itbActorPortraitWindow = new Window_ITBActorPortraits(this._statusWindow);
        this.addWindow(this._itbActorPortraitWindow);
    };

    //--------------------------------------------------------------------------
    // Create Preview Window
    //--------------------------------------------------------------------------

    Scene_Battle.prototype.createPreviewWindow = function() {
        var wx = 0;
        var wy = this._statusWindow.y;
        var ww = this.previewWindowWidth();
        var wh = Graphics.boxHeight - wy;
        this._previewWindow = new Window_Preview(wx, wy, ww, wh);
        this.addWindow(this._previewWindow);
    };

    Scene_Battle.prototype.previewWindowWidth = function() {
        var portraitWindow = this._itbActorPortraitWindow;
        if (!portraitWindow) {
            return Graphics.boxWidth;
        }
        return portraitWindow.x;
    };

    //--------------------------------------------------------------------------
    // Create Action Message Window
    //--------------------------------------------------------------------------

    Scene_Battle.prototype.createITBActionWindow = function() {
        this._itbActionWindow = new Window_ITBAction();
        this.addWindow(this._itbActionWindow);
    };

    //--------------------------------------------------------------------------
    // Update Preview Window
    //--------------------------------------------------------------------------

    Scene_Battle.prototype.updatePreviewWindow = function(actor, actionData) {
        if (!this._previewWindow) return;
        console.log("Update preview window");
        if (!actionData) {
            this._previewWindow.clear();
            this._previewWindow.hide();
            if (this._previewWindow._typeWindow) {
                this._previewWindow._typeWindow.hide();
            }
            return;
        }
        var item = BattleManager.ITB_UI.databaseAction(actionData);
        this._previewWindow.setAction(actor, item, actionData);
        if ($gameSystem.isITBPreviewVisible()) {
            this._previewWindow.show();
            if (this._previewWindow._typeWindow) {
                this._previewWindow._typeWindow.show();
            }
        } else {
            this._previewWindow.hide();
            if (this._previewWindow._typeWindow) {
                this._previewWindow._typeWindow.hide();
            }
        }
        //this._previewWindow.show();
    };

    //--------------------------------------------------------------------------
    // Control Preview Window Visibility
    //--------------------------------------------------------------------------

    Scene_Battle.prototype.setPreviewWindowVisible = function(visible) {
        if (!this._previewWindow) return;
        if (visible) {
            this._previewWindow.show();
            if (this._previewWindow._typeWindow) {
                this._previewWindow._typeWindow.show();
            }
        } else {
            this._previewWindow.hide();
            if (this._previewWindow._typeWindow) {
                this._previewWindow._typeWindow.hide();
            }
        }
    };

    //--------------------------------------------------------------------------
    // Obseve target changes
    //--------------------------------------------------------------------------

    Scene_Battle.prototype.updateITBTargetBrowseState = function() {
        if (!BattleManager._connectorTargetMode) {
            this._itbLastBrowseTarget = null;
            BattleManager.ITB_UI.clearTargetBrowseTarget();
            return;
        }
        var window = null;
        if (this._actorWindow && this._actorWindow.active) {
            window = this._actorWindow;
        } else if (this._enemyWindow && this._enemyWindow.active) {
            window = this._enemyWindow;
        }
        var target = null;
        if (window) {
            target = window === this._actorWindow ? window.actor() : window.enemy();
        }
        if (target === this._itbLastBrowseTarget) return;
        this._itbLastBrowseTarget = target;
        if (target) {
            BattleManager.ITB_UI.updateTargetBrowse(target);
        } else {
            BattleManager.ITB_UI.clearTargetBrowseTarget();
        }
    };

    //--------------------------------------------------------------------------
    // Refresh action interface
    //--------------------------------------------------------------------------

    ITB_Command_SB_queueConnectorAction = Scene_Battle.prototype.queueConnectorAction;
    Scene_Battle.prototype.queueConnectorAction = function(actor, action) {
        ITB_Command_SB_queueConnectorAction.call(this, actor, action);
        if (this._actorCommandWindow) this._actorCommandWindow.confirmSelection();
    };

    //--------------------------------------------------------------------------
    // Cache target image
    //--------------------------------------------------------------------------

    /* Scene_Battle.prototype.CacheTargetImageExtension = function(target) {
        //console.log("Cache target image");
        //console.log("Target:", target);
        if (!target) return null;
        var isSvEnemy = $gameSystem.isSideView() && 
            Imported.YEP_X_AnimatedSVEnemies &&
            target.hasSVBattler() &&
            Yanfly.Param.CTBEnemySVBattler;
        if (isSvEnemy) {
            var image = ImageManager.loadSvEnemy(target.battlerName());
        } else {
            var image = ImageManager.loadEnemy(target.battlerName(), target.battlerHue());
        }
        var sprite = new Sprite(image);
        sprite._isSvEnemy = isSvEnemy;
        return sprite;
    } */

    //--------------------------------------------------------------------------
    // Process Cancel
    //--------------------------------------------------------------------------

    var ITB_Command_WS_processCancel = Window_Selectable.prototype.processCancel;
    Window_Selectable.prototype.processCancel = function() {
        ITB_Command_WS_processCancel.call(this);
        // Only handle cancellation that returns to target preselection.
        var scene = SceneManager._scene;
        if (
            !scene || 
            !scene._previewWindow ||
            !scene._actorWindow ||
            this === scene._skillWindow ||
            this === scene._itemWindow
        ) {
            return;
        }
        var actor = BattleManager.actor();
        // The connector plugin returns to target preselection when
        // there is no queued action available to undo.
        if (
            !actor ||
            !actor._connectorPreviewTarget ||
            !actor._canUndoQueuedAction
        ) {
            scene.updatePreviewWindow(null, null);
            var commandWindow = scene._actorCommandWindow;
            if (commandWindow) commandWindow.clearActionSelection();
        }
    };

    //--------------------------------------------------------------------------
    // Keyboard target browsing helpers
    //--------------------------------------------------------------------------


    //Scene_Battle.prototype.refreshUI = function(actor, action) {
    //    if (this._actorCommandWindow) this._actorCommandWindow.refreshSelection();
    //};

    //--------------------------------------------------------------------------
    // Helper for drawing connector values
    //--------------------------------------------------------------------------

    /* Bitmap.prototype.drawConnectorValues = function(leftX, rightX, leftValue, rightValue) {
        this.fontSize = 14;
        this.textColor = Window_Base.prototype.textColor.call(
            SceneManager._scene._previewWindow,
            0
        );
        var y = Math.floor(this.height * 0.35);
        this.drawText(leftValue, leftX - 12, y, 24, this.height, "center");
        if (leftValue !== rightValue) {
            this.drawText(rightValue, rightX - 12, y, 24, this.height, "center");
        }
    }; */

})();