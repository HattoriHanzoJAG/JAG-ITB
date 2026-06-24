//=============================================================================
// JAG_ITB_Action_Connectors.js
//=============================================================================
/*:
 * @plugindesc Action connector system that builds on action queuing plugin and
 * adds action connectors to skills and battlers that are requirements for 
 * connecting skills to a target or previous actions in the queue.
 * 2026-05-23 This version reads action connectors for battlers and skills and. 
 * adds these as requirements for selecting actions. It also implements target
 * preselection since target connectors are now a prerequisite for action selection.
 * This version is an attempt to implement target browsing: selecting a target
 * automatically updates the action window with actions that can be connected to 
 * this target. However, this functionality conflicts with RMMV architecture and
 * will therefore be integrated with the action connector UI at a later stage,
 * falling back on the previous version with target preselection.
 * 2026-05-24 Working version with targer preselection. To be tested for single target.
 *	Fixed bug in selectNextCommand not calling queueAction. Some skills don't appear 
 *	in the actor command menu.
 * 2026-05-25 Fixed bug in selectEnemySelection not calling selectNexCommand
 *  if no target is preselected. Tested for single target and two attack skills.
 * 2026-05-26 Added connector effects for skills.
 * 2026-05-27 Added action connector conditions for enemies. Attack action is still
 *  visible and enabled if it doesn't connect, but another check was added in queueAction
 *  for the validity of skills. First-pass implementation of strict and lax connectors, 
 *  to be tested.
 * 2026-05-28 Completed implementation of strict and lax connectors. Solved error in
 *  result state always referring to target state. Also implemented input connectors 
 *  without condition that unconditionally connect to both strict and lax connectors.
 * @author JG
 */

(function() {

    const TRACE_CONNECTORS = true;
    const DEBUG_CONNECTORS = true;

    //=============================================================================
    // Database Loading
    //=============================================================================

    var Connector_DM_isDatabaseLoaded = DataManager.isDatabaseLoaded;
    DataManager.isDatabaseLoaded = function() {
        if (!Connector_DM_isDatabaseLoaded.call(this)) return false;
        if (!this._connectorsLoaded) {
            this.processBattlerConnectorNotetags($dataEnemies);
            this.processBattlerConnectorNotetags($dataActors);
            this.processSkillConnectorNotetags($dataSkills);
            this.processConnectorEffectsNotetags($dataSkills);
            this.processConnectorRulesNotetags($dataActors);
            this.processConnectorRulesNotetags($dataEnemies);
            this._connectorsLoaded = true;
        }
        return true;
    };

    //=============================================================================
    // Notetag Parsing
    //=============================================================================

    DataManager.processBattlerConnectorNotetags = function(group) {
        var note1 = /<Distance:\s*(\-?\d+)>/i;
        var note2 = /<Combat:\s*(\-?\d+)>/i;
        var note3 = /<Sorcery:\s*(\-?\d+)>/i;
        var note4 = /<Diplomacy:\s*(\-?\d+)>/i;
        var note5 = /<Deception:\s*(\-?\d+)>/i;
        var note6 = /<Manoeuvre:\s*(\-?\d+)>/i;
        for (var n = 1; n < group.length; n++) {
            var obj = group[n];
            if (!obj) continue;
            obj.distance = undefined;
            obj.combat = undefined;
            obj.sorcery = undefined;
            obj.diplomacy = undefined;
            obj.deception = undefined;
            obj.manoeuvre = undefined;
            var notedata = obj.note.split(/[\r\n]+/);
            for (var i = 0; i < notedata.length; i++) {
                var line = notedata[i];
                if (line.match(note1)) {
                    obj.distance = parseInt(RegExp.$1);
                }
                if (line.match(note2)) {
                    obj.combat = parseInt(RegExp.$1);
                }
                if (line.match(note3)) {
                    obj.sorcery = parseInt(RegExp.$1);
                }
                if (line.match(note4)) {
                    obj.diplomacy = parseInt(RegExp.$1);
                }
                if (line.match(note5)) {
                    obj.deception = parseInt(RegExp.$1);
                }
                if (line.match(note6)) {
                    obj.manoeuvre = parseInt(RegExp.$1);
                }
            }
        }
    };

    DataManager.processSkillConnectorNotetags = function(group) {
        var inputRegex = /<Input\s+(\w+)(?:\s+(.+))?>/i;
        var outputRegex = /<Output[ ](\w+):[ ](.+)>/i;
        for (var n = 1; n < group.length; n++) {
            var obj = group[n];
            if (!obj) continue;
            obj.inputConnectors = {};
            obj.outputConnectors = {};
            var notedata = obj.note.split(/[\r\n]+/);
            for (var i = 0; i < notedata.length; i++) {
                var line = notedata[i];
                if (line.match(inputRegex)) {
                    if (DEBUG_CONNECTORS) {
                        console.log("--------------------");
                        console.log("INPUT TAG MATCH");
                        console.log("Skill:", obj.name);
                        console.log("Line:", line);
                    }
                    var name = RegExp.$1.toLowerCase();
                    var conditionText = RegExp.$2;
                    if (DEBUG_CONNECTORS) {
                        console.log("Connector:", name);
                        console.log("Condition text:", conditionText);
                    }
                    if (conditionText) {
                        obj.inputConnectors[name] =
                            DataManager.parseConnectorCondition(conditionText.trim());
                        if (DEBUG_CONNECTORS) {
                            console.log("Parsed condition:", 
                                DataManager.parseConnectorCondition(conditionText.trim()));
                        }
                    } else {
                        // Explicit connector without condition
                        if (DEBUG_CONNECTORS) console.log("Explicit connector without condition");
                        obj.inputConnectors[name] = {};
                    }
                    if (DEBUG_CONNECTORS) {
                        console.log("Current input connectors:", obj.inputConnectors);
                    }
                }
                if (line.match(outputRegex)) {
                    var name = RegExp.$1.toLowerCase();
                    var value = RegExp.$2.trim();
                    if (value.match(/^@(\w+)$/i)) {
                        // Inherit previous state
                        obj.outputConnectors[name] = {
                            mode: "inherit",
                            source: RegExp.$1.toLowerCase()
                        };
                    } else {
                        // Direct numeric assignment
                        obj.outputConnectors[name] = {
                            mode: "set",
                            value: parseInt(value)
                        };
                    }
                }
            }
        }
    };

    DataManager.processConnectorEffectsNotetags = function(group) {
        const regex = /<connectorEffects>([\s\S]*?)<\/connectorEffects>/i;
        for (const obj of group) {
            if (!obj || !obj.note) continue;
            obj.connectorEffects = [];
            const match = obj.note.match(regex);
            if (!match) continue;
            const lines = match[1]
                .split(/[\r\n]+/)
                .map(l => l.trim())
                .filter(Boolean);
            for (const line of lines) {
                const parts = line.split(/\s+/);
                if (parts.length !== 3) continue;
                const target = parts[0];
                const connector = parts[1];
                const value = Number(parts[2]);
                obj.connectorEffects.push({
                    target: target,
                    connector: connector,
                    value: value
                });
            }
            if (DEBUG_CONNECTORS) console.log(obj.name, obj.connectorEffects);
        }
    };

    DataManager.processConnectorRulesNotetags = function(group) {
        const blockRegex = /<connectorRules>([\s\S]*?)<\/connectorRules>/i;
        for (const obj of group) {
            if (!obj || !obj.note) continue;
            obj.connectorRules = {};
            const match = obj.note.match(blockRegex);
            if (!match) continue;
            const lines = match[1]
                .split(/[\r\n]+/)
                .map(l => l.trim())
                .filter(Boolean);
            for (const line of lines) {
                const parts = line.split(/\s*:\s*/);
                if (parts.length !== 2) continue;
                const connector = parts[0].toLowerCase();
                const rule = parts[1].toLowerCase();
                obj.connectorRules[connector] = rule;
            }
        }
    };

    DataManager.parseConnectorCondition = function(text) {
        if (text.match(/^<=\s*(\d+)$/)) {
            return {
                type: "max",
                value: parseInt(RegExp.$1)
            };
        }
        if (text.match(/^>=\s*(\d+)$/)) {
            return {
                type: "min",
                value: parseInt(RegExp.$1)
            };
        }
        if (text.match(/^(\d+)-(\d+)$/)) {
            return {
                type: "range",
                min: parseInt(RegExp.$1),
                max: parseInt(RegExp.$2)
            };
        }
        if (text.match(/^(\d+)$/)) {
            return {
                type: "exact",
                value: parseInt(RegExp.$1)
            };
        }
        return null;
    };

    //=============================================================================
    // BattleManager Extensions
    //=============================================================================

    BattleManager.currentConnectorState = function(actor) {
        console.log("Current Connector State")
        if (actor.queueLength() <= 0) {
            return actor._selectedTarget.connectorState();
        }
        var last = actor._actionQueue[actor._actionQueue.length - 1];;
        return JsonEx.makeDeepCopy(last.resultState);
    };

    BattleManager.connectorValidationState = function(actor) {
        // Combo continuation
        if (TRACE_CONNECTORS || DEBUG_CONNECTORS) console.log("CONNECTOR VALIDATION STATE");
        if (DEBUG_CONNECTORS) {
            console.log("actor:", actor.name());
            console.log("preview target:", actor._connectorPreviewTarget);
        }
        if (!actor) return null;
        if (actor._actionQueue.length > 0) {
            var last = actor._actionQueue[actor._actionQueue.length - 1];
            if (last && last.resultState) {
                return JsonEx.makeDeepCopy(last.resultState);
            }
        }
        // First action target preview
        if (actor._connectorPreviewTarget) {
            return actor._connectorPreviewTarget.connectorState();
        }
        return null;
    };

    var Connector_BM_selectNextCommand = BattleManager.selectNextCommand;
    BattleManager.selectNextCommand = function() {
        if (TRACE_CONNECTORS || DEBUG_CONNECTORS) {
            console.log("=== SELECT NEXT COMMAND ===");
            if (DEBUG_CONNECTORS) console.log(new Error().stack);
        }
        var actor = this.actor();
        var action = this.inputtingAction();
        if (!action || !action.item()) return;
        if (DEBUG_CONNECTORS) {
            console.log("actor:", actor ? actor.name() : null);
            console.log("action:", action);
            console.log(
                "STATE",
                {
                    queueInput: actor ? actor._queueInputActive : null,
                    preview: actor ? !!actor._connectorPreviewTarget : null,
                    queueLength: actor ? actor.queueLength() : null,
                    phase: this._phase
                }
            );
        }
        // -------------------------------------------------
        // STORE TARGET + RESULT STATE + ACTION QUEUE
        // -------------------------------------------------
        if (DEBUG_CONNECTORS) {
            console.log(
                "COMMAND_SELECTION_STATE",
                actor.queueLength(),
                actor._connectorPreviewTarget,
                actor._queueInputActive
            );
        }
        if (actor && action && actor._connectorPreviewTarget) {
            if (TRACE_CONNECTORS || DEBUG_CONNECTORS) console.log("AUTO QUEUE CONNECTOR ACTION");
            var target = actor._connectorPreviewTarget;
            // Inject stored target for action requiring target selection
            if (action.needsSelection()) {
                if (DEBUG_CONNECTORS) console.log("Store target");
                action.setTarget(target.index());
            }
            // Build queue entry and connector result state
            SceneManager._scene._queueAction(
                action,
                target,
                action.isForOpponent() ? "enemy" : "ally"
            );
            if (DEBUG_CONNECTORS) console.log("Queue length:", actor.queueLength()); 
        }
        // Return to queue input mode
        if (actor && actor._queueInputActive) {
            if (TRACE_CONNECTORS || DEBUG_CONNECTORS) console.log("RETURN TO COMMAND INPUT");
            SceneManager._scene._skillWindow.hide();
            SceneManager._scene._itemWindow.hide();
            SceneManager._scene._enemyWindow.hide();
            SceneManager._scene._actorWindow.hide();
            SceneManager._scene._actorCommandWindow.show();
            SceneManager._scene._actorCommandWindow.activate();
            return;
        }
        // -------------------------------------------------
        // NORMAL FLOW
        // -------------------------------------------------
        Connector_BM_selectNextCommand.call(this);
    };

    //=============================================================================
    // Game_Battler Extensions
    //=============================================================================
    /*
    * strict:
    *   Connector must be explicitly referenced by the skill.
    *
    * lax:
    *   Connector may exist on the target but does not need
    *   to be referenced by the skill.
    *
    * Example:
    *
    * Target:
    *   distance = 1
    *   combat = 2
    *
    * Rules:
    *   distance = strict
    *   combat = lax
    *
    * Skill:
    *   <Input Distance>
    *
    * Result:
    *   Valid
    *
    * Skill:
    *   <Input Combat>
    *
    * Result:
    *   Invalid (missing strict distance connector)
    */

    Connector_GB_initMembers = Game_Battler.prototype.initMembers;
    Game_Battler.prototype.initMembers = function() {
        Connector_GB_initMembers.call(this);
        this._connectors = {};
        this._connectorRules = {};
        this.initConnectorRules();
        this._connectorPreviewTarget = null;
        this._connectorTargetMode = false;
    };

    // Initialize connectors for battlers
    Game_Battler.prototype.initConnectors = function() {
        this._connectors = {
            /* distance: undefined,
            deception: undefined,
            combat: undefined,
            diplomacy: undefined,
            sorcery: undefined,
            manoeuvre: undefined */
        };
    };

    Game_Battler.prototype.connector = function(name) {
        if (!this._connectors) return undefined;
        return this._connectors[name];
    };

    Game_Battler.prototype.connectorState = function() {
        if (DEBUG_CONNECTORS) console.log("CONNECTOR STATE:", this._connectors);
        var state = JsonEx.makeDeepCopy(this._connectors || {});
        state._connectorRules = JsonEx.makeDeepCopy(this._connectorRules || {});
        return state;
    };

    Game_Battler.prototype.resolveConnectorSourceState = function(actionData) {
        // First queued action
        if (this._actionQueue.length <= 0) {
            var target = this.resolveActionTarget(actionData);
            if (!target) return null;
            return target.connectorState();
        }
        // Chained action
        var previous = this._actionQueue[this._actionQueue.length - 1];
        return previous.resultState || null;
    };

    Game_Battler.prototype.printBattleConnectors = function() {
        console.log("Print Battle Connectors")
        console.log(
            this.name(),
            JSON.stringify(this._connectors)
        );
    };

    Game_Battler.prototype.initConnectorRules = function() {
        this._connectorRules = {
            distance: "strict",
            deception: "strict",
            combat: "lax",
            diplomacy: "lax",
            sorcery: "lax"
        };
    };

    Game_Battler.prototype.connectorRule = function(name) {
        if (!this._connectorRules) {
            return "lax";
        }
        return this._connectorRules[name] || "lax";
    };

    Connector_GB_setupCTBCharge = Game_Battler.prototype.setupCTBCharge;
    Game_Battler.prototype.setupCTBCharge = function() {
        if (TRACE_CONNECTORS || DEBUG_CONNECTORS) console.log("ACTION CONNECTOR SETUP CTB CHARGE");
        var action = this.currentAction();
        if (DEBUG_CONNECTORS) console.log("Current Action:", action);
        if (DEBUG_CONNECTORS) console.log("Action item:", action ? action.item() : null);
        if (!action || !action.item()) {
            Connector_GB_setupCTBCharge.call(this);
            return;
        }
        if (this.isEnemy()) {
            var targets = action.makeTargets();
            if (DEBUG_CONNECTORS) {
                console.log("VALIDATION TARGETS:", targets.map(t => t.name()));
            }
            var valid = true;
            for (var i = 0; i < targets.length; i++) {
                if (!action.canConnectToTarget(targets[i])) {
                    valid = false;
                    break;
                }
            }
            if (!valid) {
                if (DEBUG_CONNECTORS) {
                    console.log("INVALID ENEMY CONNECTOR ACTION -> WAIT");
                }
                this.clearActions();
            }
        }
        Connector_GB_setupCTBCharge.call(this);
    }

    Connector_GB_undoLastQueuedAction = Game_Battler.prototype.undoLastQueuedAction;
    Game_Battler.prototype.undoLastQueuedAction = function() {
        var removed = Connector_GB_undoLastQueuedAction.call(this);
        if (removed) {
            this._connectorState = this._lastQueuedConnectorState;
            this._lastQueuedConnectorState = null;
        }
        return removed;
    };

    //=============================================================================
    // Game_Enemy Setup
    //=============================================================================

    Connector_GameEnemy_setup = Game_Enemy.prototype.setup;
    Game_Enemy.prototype.setup = function(enemyId, x, y) {
        Connector_GameEnemy_setup.call(this, enemyId, x, y);
        this._connectorRules = JsonEx.makeDeepCopy(this._connectorRules || {});
        var data = this.enemy();
        if (data.distance !== undefined) {
            this._connectors.distance = data.distance;
        }
        if (data.combat !== undefined) {
            this._connectors.combat = data.combat;
        }
        if (data.sorcery !== undefined) {
            this._connectors.sorcery = data.sorcery;
        }
        if (data.diplomacy !== undefined) {
            this._connectors.diplomacy = data.diplomacy;
        }
        if (data.deception !== undefined) {
            this._connectors.deception = data.deception;
        }
        if (data.manoeuvre !== undefined) {
            this._connectors.manoeuvre = data.manoeuvre;
        }
        if (data.connectorRules) {
            for (var key in data.connectorRules) {
                this._connectorRules[key] = data.connectorRules[key];
            }
        }
    };

    //=============================================================================
    // Game_Actor Setup
    //=============================================================================

    var Connector_GameActor_setup = Game_Actor.prototype.setup;
    Game_Actor.prototype.setup = function(actorId) {
        Connector_GameActor_setup.call(this, actorId);
        if (!this._connectors) this._connectors = {};
        this._connectorRules = JsonEx.makeDeepCopy(this._connectorRules || {});
        var data = this.actor();
        if (this._connectors.distance === undefined &&
            data.distance !== undefined) {
            this._connectors.distance = data.distance;
        }
        if (this._connectors.combat === undefined && 
            data.combat !== undefined) {
            this._connectors.combat = data.combat;
        }
        if (this._connectors.sorcery === undefined &&
            data.sorcery !== undefined) {
            this._connectors.sorcery = data.sorcery;
        }
        if (this._connectors.diplomacy === undefined &&
            data.diplomacy !== undefined) {
            this._connectors.diplomacy = data.diplomacy;
        }
        if (this._connectors.deception === undefined &&
            data.deception !== undefined) {
            this._connectors.deception = data.deception;
        }
        if (this._connectors.manoeuvre === undefined &&
            data.manoeuvre !== undefined) {
            this._connectors.manoeuvre = data.manoeuvre;
        }
        if (data.connectorRules) {
            for (var key in data.connectorRules) {
                this._connectorRules[key] = data.connectorRules[key];
            }
        }
        if (DEBUG_CONNECTORS) {
            console.log("FINAL RULES FOR", this.name(), this._connectorRules);
        }
    };

    //=============================================================================
    // Connector Validation
    //=============================================================================

    const Connector_GA_apply = Game_Action.prototype.apply;
    Game_Action.prototype.apply = function(target) {
        Connector_GA_apply.call(this, target);
        this.applyConnectorEffects(target);
        if (DEBUG_CONNECTORS) {
            const subject = this.subject();
            subject.printBattleConnectors();
            target.printBattleConnectors();
        }
    };

    // Apply Connector Effects
    Game_Action.prototype.applyConnectorEffects = function(target) {
        const item = this.item();
        if (!item.connectorEffects) return;
        const subject = this.subject();
        if (DEBUG_CONNECTORS) console.log("Apply Connector Effects");
        for (const effect of item.connectorEffects) {
            let battler = null;
            if (effect.target === "self") {
                battler = subject;
            } else if (effect.target === "target") {
                battler = target;
            }
            if (!battler) continue;
            if (battler._connectors[effect.connector] === undefined) {
                if (DEBUG_CONNECTORS) console.log(battler.name(), effect.connector, "undefined -> ignored");
                continue;
            }
            battler._connectors[effect.connector] += effect.value;
            if (DEBUG_CONNECTORS) {
                console.log(
                    battler.name(),
                    effect.connector,
                    battler._connectors[effect.connector]
                );
            }
        }
    };

    // Connector Condition Checker
    Game_Action.prototype.checkConnectorCondition = function(value, condition) {
        if (DEBUG_CONNECTORS) {
            console.log("CHECK CONDITION", "value:", value, "condition:", condition);
        }
        if (condition === undefined || condition === null || 
                Object.keys(condition).length <= 0) {
            if (DEBUG_CONNECTORS) console.log("CONDITION UNDEFINED -> PASS");
            return true;
        }
        if (value === undefined) {
            if (DEBUG_CONNECTORS) console.log("VALUE UNDEFINED -> PASS");
            return true;
        };
        switch (condition.type) {
            case "exact":
                return value === condition.value;
            case "min":
                return value >= condition.value;
            case "max":
                return value <= condition.value;
            case "range":
                return (
                    value >= condition.min &&
                    value <= condition.max
                );
        }
        return false;
    };

    // Validate Target
    Game_Action.prototype.canConnectToTarget = function(target) {
        if (TRACE_CONNECTORS || DEBUG_CONNECTORS) console.log("CAN CONNECT TO TARGET");
        if (!target) return true;
        var state = target.connectorState();
        if (!state) return true;
        return this.canConnectToState(state);
    };

    // Validate Entire State
    Game_Action.prototype.canConnectToState = function(state) {
        if (TRACE_CONNECTORS || DEBUG_CONNECTORS) {
            console.log("CAN CONNECT TO STATE");
            console.log("Skill:", this.item().name);
            console.log("State:", state);
        }
        var skill = this.item();
        if (!skill) return false;
        var rawInputs = skill.inputConnectors || {};
        var inputs = {};
        //var inputs = skill.inputConnectors || {};
        Object.keys(rawInputs).forEach(function(key) {
            inputs[key] = this.normalizeConnector(rawInputs[key]);
        }, this);
        if (DEBUG_CONNECTORS) {
            console.log("Raw inputs:", rawInputs);
            console.log("Inputs:", inputs);
        }
        var rules = state._connectorRules || {};
        if (DEBUG_CONNECTORS) {
            console.log("Rules:", rules);
            console.log("HAS RULES?", !!state._connectorRules, state._connectorRules);
        }
        var ruleKeys = Object.keys(rules);
        for (var i = 0; i < ruleKeys.length; i++) {
            var name = ruleKeys[i];
            if (rules[name] !== "strict") continue;
            if (!inputs[name]) {
                if (DEBUG_CONNECTORS) console.log("FAILED STRICT CONNECTOR:", name);
                return false;
            }
        }
        var keys = Object.keys(inputs);
        for (var i = 0; i < keys.length; i++) {
            var name = keys[i];
            var condition = inputs[name];
            var value = state[name];
            if (DEBUG_CONNECTORS) {
                console.log("----------------");
                console.log("Connector:", name);
                console.log("Value:", value);
                console.log("Condition:", condition);
            }
            var passed = this.checkConnectorCondition(value, condition);
            if (DEBUG_CONNECTORS) console.log("PASSED:", passed);
            if (!passed) {
                if (DEBUG_CONNECTORS) console.log("FAILED CONNECTOR CHECK:", name);
                return false;
            }
        }
        if (DEBUG_CONNECTORS) console.log("ALL CONNECTOR CHECKS PASSED");
        return true;
    };

    Game_Action.prototype.isValidConnectorSkill = function(state) {
        return this.canConnectToState(state);
    };
    
    Game_Action.prototype.normalizeConnector = function(conn) {
        // no connector at all
        if (conn === undefined) return undefined;
        // explicit connector but no condition
        if (conn === null || conn === true) return {};
        // already condition object
        if (typeof conn === "object") return conn;
        return {};
    };

    //=============================================================================
    // Connector State Building
    //=============================================================================
    /*
    * Connector State Flow
    *
    * Initial Action:
    *   Target connectorState()
    *       ↓
    *   sourceState
    *       ↓
    *   buildResultState()
    *       ↓
    *   resultState stored in queue entry
    *
    * Chained Action:
    *   Previous queue entry resultState
    *       ↓
    *   sourceState
    *       ↓
    *   buildResultState()
    *       ↓
    *   new resultState
    *
    * Validation always occurs against sourceState.
    */

    Game_Action.prototype.buildResultState = function(sourceState) {
        if (TRACE_CONNECTORS || DEBUG_CONNECTORS) console.log("Build Result State");
        var result = JsonEx.makeDeepCopy(sourceState || {});
        if (!result._connectorRules) {
            result._connectorRules = {};
        }
        var outputs = this.item().outputConnectors || {};
        var keys = Object.keys(outputs);
        for (var i = 0; i < keys.length; i++) {
            var name = keys[i];
            var output = outputs[name];
            if (output.mode === "set") {
                // Direct assignment
                result[name] = output.value;
                if (sourceState &&
                    sourceState._connectorRules &&
                    sourceState._connectorRules[name]) {
                    result._connectorRules[name] = sourceState._connectorRules[name];
                }
            }
            else if (output.mode === "inherit") {
                // Inherit previous state
                result[name] = sourceState[output.source];
            }
        }
        return result;
    };

    //=============================================================================
    // Scene Battle Hooks
    //=============================================================================

    var Connector_SB_onEnemyOk = Scene_Battle.prototype.onEnemyOk;
    Scene_Battle.prototype.onEnemyOk = function() {
        var actor = BattleManager.actor();
        if (TRACE_CONNECTORS || DEBUG_CONNECTORS) console.log("ON ENEMY OK");
        // ----------------------------------
        // CONNECTOR TARGET PRESELECTION
        // ----------------------------------
        if (BattleManager._connectorTargetMode) {
            if (DEBUG_CONNECTORS) console.log("Connector Target Preselection");
            actor._connectorPreviewTarget = this._enemyWindow.enemy();
            actor._queueInputActive = true;
            BattleManager._connectorTargetMode = false;
            this._enemyWindow.hide();
            this._enemyWindow.deactivate();
            actor._connectorPreviewTarget.deselect();
            console.log(
                actor._connectorPreviewTarget,
                actor._connectorPreviewTarget.isSelected()
            );
            return;
        }
        Connector_SB_onEnemyOk.call(this);
    };

    var Connector_SB_onActorOk = Scene_Battle.prototype.onActorOk;
    Scene_Battle.prototype.onActorOk = function() {
        if (TRACE_CONNECTORS || DEBUG_CONNECTORS) console.log("ON ACTOR OK");
        var actor = BattleManager.actor();
        // ----------------------------------
        // CONNECTOR TARGET PRESELECTION
        // ----------------------------------
        if (BattleManager._connectorTargetMode) {
            if (DEBUG_CONNECTORS) console.log("Connector Target Preselection");
            actor._connectorPreviewTarget = this._actorWindow.actor();
            actor._queueInputActive = true;
            BattleManager._connectorTargetMode = false;
            this._enemyWindow.hide();
            this._enemyWindow.deactivate();
            return;
        }
        Connector_SB_onActorOk.call(this);
    };

    Scene_Battle.prototype._queueAction = function(action, target, type) {
        var actor = BattleManager.actor();
        if (TRACE_CONNECTORS || DEBUG_CONNECTORS) console.log("QUEUE ACTION");
        if (DEBUG_CONNECTORS) {
            console.log(
                "STATE",
                {
                    queueInput: actor ? actor._queueInputActive : null,
                    preview: actor ? !!actor._connectorPreviewTarget : null,
                    queueLength: actor ? actor.queueLength() : null,
                    phase: BattleManager._phase
                }
            );
        }
        if (!actor) return;
        var data = action.createQueueData();
        if (!data) {
            if (DEBUG_CONNECTORS) console.warn("Queue rejected: invalid action", action);
            return;
        }
        data.targetIndex = (type === "enemy")
            ? target.index()
            : $gameParty.members().indexOf(target);
        var sourceState = BattleManager.connectorValidationState(actor);
        if (DEBUG_CONNECTORS) {
            console.log("action:", action.item().name);
            console.log("target:", target ? target.name() : null);
            console.log("SOURCE STATE:", sourceState);
            console.log("queue length BEFORE:", BattleManager.actor().queueLength());
        }
        if (sourceState) {
            var valid = action.canConnectToState(sourceState);
            if (DEBUG_CONNECTORS) console.log("VALID:", valid);
            if (!valid) {
                if (DEBUG_CONNECTORS) console.log("INVALID CONNECTOR ACTION -> REJECTED");
                SoundManager.playBuzzer();
                return;
            }
            data.resultState = action.buildResultState(sourceState);
            actor._lastQueuedConnectorState = sourceState;
            if (DEBUG_CONNECTORS) console.log("RESULT STATE:", data.resultState);
        }
        if (DEBUG_CONNECTORS) console.log("Enqueue");
        actor.enqueueAction(data);
        if (DEBUG_CONNECTORS) console.log("queue length AFTER:", actor.queueLength());
    };

    var Connector_SB_finishActionQueue = Scene_Battle.prototype.finishActionQueue;
    Scene_Battle.prototype.finishActionQueue = function() {
        var actor = BattleManager.actor();
        if (TRACE_CONNECTORS || DEBUG_CONNECTORS) console.log("FINISH ACTION QUEUE");
        if (DEBUG_CONNECTORS) {
            console.log(
                "STATE",
                {
                    queueInput: actor ? actor._queueInputActive : null,
                    preview: actor ? !!actor._connectorPreviewTarget : null,
                    queueLength: actor ? actor.queueLength() : null,
                    phase: BattleManager._phase
                }
            );
        }
        if (!actor) return;
        // Store target between activations to continue action queuing on next activation
        if (actor.queueLength() > 1) {
            actor._queuedTarget = actor._connectorPreviewTarget;
        } else {
            actor._queuedTarget = null;
        }
        // Reset the temporary UI states to finish action queuing
        actor._connectorPreviewTarget = null;
        actor._queueInputActive = false;
        $gameTroop.members().forEach(function(enemy) {
            enemy.deselect();
        });
        console.log("Actor Command Window Active?:", this._actorCommandWindow.active);
        Connector_SB_finishActionQueue.call(this);
    };

    Connector_SB_startActorCommandSelection = Scene_Battle.prototype.startActorCommandSelection;
    Scene_Battle.prototype.startActorCommandSelection = function() {
        if (TRACE_CONNECTORS || DEBUG_CONNECTORS) console.log("START ACTOR COMMAND SELECTION");
        if (DEBUG_CONNECTORS) {
            console.log(
                this._actorCommandWindow.active,
                this._actorCommandWindow.visible,
                this._actorCommandWindow.index()
            );
            console.log(new Error().stack);
        }
        Connector_SB_startActorCommandSelection.call(this);
        var actor = BattleManager.actor();
        if (DEBUG_CONNECTORS) {
            console.log(
                "STATE",
                {
                    queueInput: actor ? actor._queueInputActive : null,
                    preview: actor ? !!actor._connectorPreviewTarget : null,
                    queueLength: actor ? actor.queueLength() : null,
                    phase: BattleManager._phase
                }
            );
        }
        console.log("Actor Command Window Active?:", this._actorCommandWindow.active);
        if (!actor) return;
        if (!actor._connectorPreviewTarget) {
            if (actor.queueLength() <= 0) {
                if (DEBUG_CONNECTORS) console.log("Target preselection");
                BattleManager._connectorTargetMode = true;
                this._actorCommandWindow.deactivate();
                this._enemyWindow.show();
                this._enemyWindow.connectorPreviewSelect(0);
                this._enemyWindow.active = true;
                return;
            } else if (actor._queuedTarget) {
                //if (DEBUG_CONNECTORS) console.log(JSON.stringify(actor._actionQueue, null, 2));
                actor._connectorPreviewTarget = actor._queuedTarget;
                actor._queueInputActive = true;
            }
        }
        if (DEBUG_CONNECTORS) {
            console.log(
                "COMMAND_SELECTION_STATE",
                actor.queueLength(),
                actor._connectorPreviewTarget,
                actor._queueInputActive
            );
        }
    };

    var Connector_SB_selectEnemySelection = Scene_Battle.prototype.selectEnemySelection;
    Scene_Battle.prototype.selectEnemySelection = function() {
        var actor = BattleManager.actor();
        if (TRACE_CONNECTORS || DEBUG_CONNECTORS) console.log("Select Enemy Selection");
        if (DEBUG_CONNECTORS) {
            console.log("Actor", !!actor);
            console.log("Queue length", actor ? actor.queueLength() : null);
            console.log("Preview target:", actor ? actor._connectorPreviewTarget : null);
        }
        if (actor) {
            BattleManager.selectNextCommand();
            return;
        }
        Connector_SB_selectEnemySelection.call(this);
    };

    var Connector_BM_selectPrevious = Scene_Battle.selectPreviousCommand;
    Scene_Battle.selectPreviousCommand = function() {
        if (TRACE_CONNECTORS || DEBUG_CONNECTORS) console.log("Select Previous Command");
        var actor = BattleManager.actor();
        if (!actor || !actor._connectorPreviewTarget) return;
        Connector_BM_selectPrevious.call(this);
    };

    var Connector_WS_processCancel = Window_Selectable.prototype.processCancel;
    Window_Selectable.prototype.processCancel = function() {
        if (DEBUG_CONNECTORS) {
            console.log(
                "PROCESS CANCEL",
                this.constructor.name
            );
        }
        var actor = BattleManager.actor();
        if (!actor || !actor._connectorPreviewTarget) return;
        Connector_WS_processCancel.call(this);
    };

    //=============================================================================
    // Window Extensions
    //=============================================================================

    Window_BattleEnemy.prototype.connectorPreviewSelect = function(index) {
        this._index = index;
        this.ensureCursorVisible();
        this.updateCursor();
    };

    const Connector_WH_specialSelectionText = Window_Help.prototype.specialSelectionText;
    Window_Help.prototype.specialSelectionText = function(action) {
        // Guard against action.item() === null
        if (!action || !action.item()) return false;
        return Connector_WH_specialSelectionText.call(this, action);
    };

    var Connector_WSL_isEnabled = Window_SkillList.prototype.isEnabled;
    Window_SkillList.prototype.isEnabled = function(item) {
        if (DEBUG_CONNECTORS) console.log("IS ENABLED");
        if (!item) return false;
        if (!Connector_WSL_isEnabled.call(this, item)) return false;
        var actor = this._actor;
        if (!actor || !actor.canUse(item)) return false;
        var state = BattleManager.connectorValidationState(actor);
        if (!state) return true;
        var action = new Game_Action(actor);
        action.setSkill(item.id);
        if (DEBUG_CONNECTORS) console.log("Action:", action);
        return action.canConnectToState(state);
    };

    var Connector_WSL_includes = Window_SkillList.prototype.includes;
    Window_SkillList.prototype.includes = function(item) {
        if (DEBUG_CONNECTORS) console.log("INCLUDES");
        if (!item) return false;
        if (!Connector_WSL_includes.call(this, item)) return false;
        var actor = this._actor;
        if (!actor) return false;
        var state = BattleManager.connectorValidationState(actor);
        if (!state) return true;
        var action = new Game_Action(actor);
        action.setSkill(item.id);
        if (DEBUG_CONNECTORS) console.log("Action:", action);
        return action.canConnectToState(state);
    };

})();