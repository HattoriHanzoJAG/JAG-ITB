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
    const DEBUG_CONNECTORS = false;

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
        var note1 = /<Manoeuvre:\s*(\-?\d+)>/i;
        var note2 = /<Combat:\s*(\-?\d+)>/i;
        var note3 = /<Sorcery:\s*(\-?\d+)>/i;
        var note4 = /<Diplomacy:\s*(\-?\d+)>/i;
        var note5 = /<Deception:\s*(\-?\d+)>/i;
        for (var n = 1; n < group.length; n++) {
            var obj = group[n];
            if (!obj) continue;
            obj.combat = undefined;
            obj.sorcery = undefined;
            obj.diplomacy = undefined;
            obj.deception = undefined;
            obj.manoeuvre = undefined;
            var notedata = obj.note.split(/[\r\n]+/);
            for (var i = 0; i < notedata.length; i++) {
                var line = notedata[i];
                if (line.match(note1)) {
                    obj.manoeuvre = parseInt(RegExp.$1);
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

    /* DataManager.processConnectorEffectsNotetags = function(group) {
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
    }; */

    DataManager.processConnectorEffectsNotetags = function(group) {
        const regex = /<connectorEffects>([\s\S]*?)<\/connectorEffects>/i;
        const lineRegex = /^(\w+)\s+(\w+)\s+([+-]?\d+(?:\.\d+)?)(?:\s*,\s*([+-]?\d+(?:\.\d+)?))?$/;
        for (const obj of group) {
            if (!obj || !obj.note) continue;
            obj.connectorEffects = [];
            const match = obj.note.match(regex);
            if (!match) continue;
            const lines = match[1]
                .split(/[\r\n]+/)
                .map(line => line.trim())
                .filter(Boolean);
            for (const line of lines) {
                const parsed = line.match(lineRegex);
                if (!parsed) continue;
                const target = parsed[1].toLowerCase();
                const connector = parsed[2].toLowerCase();
                const value = Number(parsed[3]);
                const hasSelectableRange = parsed[4] !== undefined;
                const effect = {
                    target: target,
                    connector: connector,
                    value: value,
                    selectable: hasSelectableRange
                };
                if (hasSelectableRange) {
                    const maxChange = Number(parsed[4]);
                    // The first value is the initial value and lower bound.
                    // The second value is the upper bound.
                    if (maxChange < value) continue;
                    effect.minChange = value;
                    effect.maxChange = maxChange;
                }
                obj.connectorEffects.push(effect);
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
    // Connector Definitions
    //=============================================================================

    DataManager.connectorDefinitions = function() {
        return [
            {
                discipline: "combat",
                disciplineName: "Combat",
                connector: "offense",
                connectorName: "Offense",
                attributeName: "Ferocity"
            },
            {
                discipline: "diplomacy",
                disciplineName: "Diplomacy",
                connector: "hostility",
                connectorName: "Hostility",
                attributeName: "Conviction"
            },
            {
                discipline: "deception",
                disciplineName: "Deception",
                connector: "concealment",
                connectorName: "Concealment",
                attributeName: "Guile"
            },
            {
                discipline: "sorcery",
                disciplineName: "Sorcery",
                connector: "expressiveness",
                connectorName: "Expressiveness",
                attributeName: "Spirituality"
            },
            {
                discipline: "manoeuvre",
                disciplineName: "Manoeuvre",
                connector: "distance",
                connectorName: "Distance",
                attributeName: "Vision"
            }
        ];
    };

    DataManager.getConnectorDefinition = function(key) {
        var definitions = this.connectorDefinitions();
        key = String(key).toLowerCase();
        for (var i = 0; i < definitions.length; i++) {
            if (definitions[i].discipline === key) {
                return definitions[i];
            }
        }
        return null;
    };

    DataManager.getDisciplines = function() {
        return this.connectorDefinitions().map(function(definition) {
            return definition.discipline;
        });
    };

    //=============================================================================
    // BattleManager Extensions
    //=============================================================================

    /* BattleManager.currentConnectorState = function(actor) {
        console.log("Current Connector State")
        if (actor.queueLength() <= 0) {
            return actor._selectedTarget.connectorState();
        }
        var last = actor.lastQueuedActionData();
        return JsonEx.makeDeepCopy(last.resultState);
    }; */

    /* BattleManager.connectorNames = function() {
        return [
            "combat",
            "sorcery",
            "deception",
            "diplomacy",
            "distance"
        ];
    };  
 */
    BattleManager.connectorValidationState = function(actor, target) {
        // Combo continuation
        if (!actor) return null;
        var last = actor.lastQueuedAction();
        if (last && last.resultState) {
            return JsonEx.makeDeepCopy(last.resultState);
        }
        // First action target preview
        if (target) {
            return target.connectorState();
        } else if (actor._connectorPreviewTarget) {
            return actor._connectorPreviewTarget.connectorState();
        }
        return null;
    };

    /* var Connector_BM_selectNextCommand = BattleManager.selectNextCommand;
    BattleManager.selectNextCommand = function() {
        if (TRACE_CONNECTORS || DEBUG_CONNECTORS) {
            console.log("=== SELECT NEXT COMMAND ===");
            if (DEBUG_CONNECTORS) console.log(new Error().stack);
        }
        var actor = this.actor();
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
        if (DEBUG_CONNECTORS) {
            console.log(
                "COMMAND_SELECTION_STATE",
                actor.queueLength(),
                actor._connectorPreviewTarget,
                actor._queueInputActive
            );
        }
        var action = this.inputtingAction();
        if (!action || !action.item()) return;
        // -------------------------------------------------
        // STORE TARGET + RESULT STATE + ACTION QUEUE
        // -------------------------------------------------
        SceneManager._scene.queueConnectorAction(actor, action);
        // Return to queue input mode
        if (actor && actor._queueInputActive) {
            SceneManager._scene.returnToCommandInput();
            return;
        }
        // -------------------------------------------------
        // NORMAL FLOW
        // -------------------------------------------------
        Connector_BM_selectNextCommand.call(this);
    }; */

    BattleManager.isConnectorActionScopeCompatible = function(actor, action, target) {
        if (!actor || !action || !target) return true;
        if (action.isForUser()) return target === actor;
        if (target.isEnemy()) return action.isForOpponent();
        if (target.isActor()) return action.isForFriend();
        return false;
    };

    BattleManager.resetTargetPreselection = function(actor) {
        actor._queuedTarget = null;
        actor._connectorPreviewTarget = null;
        this._actorIndex = actor.index();
        this._connectorTargetMode = true;
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
    *   manoeuvre = 1
    *   combat = 2
    *
    * Rules:
    *   manoeuvre = strict
    *   combat = lax
    *
    * Skill:
    *   <Input Manoeuvre>
    *
    * Result:
    *   Valid
    *
    * Skill:
    *   <Input Combat>
    *
    * Result:
    *   Invalid (missing strict manoeuvre connector)
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

    /* Game_Battler.prototype.resolveConnectorSourceState = function(actionData) {
        // First queued action
        if (this._actionQueue.length <= 0) {
            var target = this.resolveActionTarget(actionData);
            if (!target) return null;
            return target.connectorState();
        }
        // Chained action
        var previous = this.lastQueuedActionData();
        return previous.resultState || null;
    }; */

    Game_Battler.prototype.printBattleConnectors = function() {
        console.log("Print Battle Connectors")
        console.log(
            this.name(),
            JSON.stringify(this._connectors)
        );
    };

    Game_Battler.prototype.initConnectorRules = function() {
        this._connectorRules = {
            manoeuvre: "strict",
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

    Game_Battler.prototype.itbTimelineAction = function() {
        var action = this.itbActionPreview();
        // Explicit previews retain priority.
        if (action) return action;
        action = this.currentAction();
        if (!action || !action.item()) return null;
        var target = this._connectorPreviewTarget;
        var correctScope = BattleManager.isConnectorActionScopeCompatible(this, action, target);
        if (target && !correctScope) return null;
        var state = BattleManager.connectorValidationState(this);
        if (state && !action.canConnectToState(state)) return null;
        return action;
    };

    //=============================================================================
    // Game_Enemy Setup
    //=============================================================================

    Connector_GameEnemy_setup = Game_Enemy.prototype.setup;
    Game_Enemy.prototype.setup = function(enemyId, x, y) {
        Connector_GameEnemy_setup.call(this, enemyId, x, y);
        this._connectorRules = JsonEx.makeDeepCopy(this._connectorRules || {});
        var data = this.enemy();
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
        if (condition === undefined || condition === null || 
                Object.keys(condition).length <= 0) {
            return true;
        }
        if (value === undefined) return true;
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
    /* Game_Action.prototype.canConnectToState = function(state) {
        if (TRACE_CONNECTORS || DEBUG_CONNECTORS) {
            console.log("CAN CONNECT TO STATE");
            console.log("Skill:", this.item().name);
            console.log("State:", state);
        }
        var skill = this.item();
        if (!skill) return false;
        var rawInputs = skill.inputConnectors || {};
        var inputs = {};
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
    }; */

    // Validate Entire State
    Game_Action.prototype.canConnectToState = function(state) {
        var validation = this.connectorValidation(state);
        var keys = Object.keys(validation);
        for (var i = 0; i < keys.length; i++) {
            if (!validation[keys[i]]) return false;
        }
        return true;
    };

    // Per connector validation
    Game_Action.prototype.connectorValidation = function(state) {
        var skill = this.item();
        if (!skill || !state) return {};
        var inputs = skill.inputConnectors || {};
        var rules = state._connectorRules || {};
        var result = {};
        var ruleKeys = Object.keys(rules);
        // First establish strict/lax validity.
        for (var i = 0; i < ruleKeys.length; i++) {
            var name = ruleKeys[i];
            if (rules[name] !== "strict") continue;
            result[name] = !!inputs[name];
        }
        // Then evaluate explicit input connectors.
        var keys = Object.keys(inputs);
        for (var j = 0; j < keys.length; j++) {
            var name = keys[j];
            var condition = inputs[name];
            var value = state[name];
            result[name] = this.checkConnectorCondition(value, condition);
        }
        return result;
    };

    //Game_Action.prototype.isValidConnectorSkill = function(state) {
    //    return this.canConnectToState(state);
    //};
    
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

    var Connector_SB_update = Scene_Battle.prototype.update;
    Scene_Battle.prototype.update = function() {
        Connector_SB_update.call(this);
        this.updateConnectorTargetWindow();
    };

    var Connector_SB_onSelectAction = Scene_Battle.prototype.onSelectAction;
    Scene_Battle.prototype.onSelectAction = function() {
        var actor = this._actor || BattleManager.actor();
        var action = BattleManager.inputtingAction();
        if (TRACE_CONNECTORS || DEBUG_CONNECTORS) {
            console.log("=== CONNECTOR ON SELECT ACTION ===");
        }
        if (DEBUG_CONNECTORS) {
            console.log("actor:", actor ? actor.name() : null);
            console.log(
                "action:",
                action && action.item()
                    ? action.item().name
                    : null
            );
            console.log("preview target:", actor ? actor._connectorPreviewTarget : null);
        }
        if (this.queueConnectorActionAndReturn(actor, action)) return;
        Connector_SB_onSelectAction.call(this);
    };

    var Connector_SB_onEnemyOk = Scene_Battle.prototype.onEnemyOk;
    Scene_Battle.prototype.onEnemyOk = function() {
        var actor = this._actor || BattleManager.actor();
        if (TRACE_CONNECTORS || DEBUG_CONNECTORS) console.log("ON ENEMY OK");
        // ----------------------------------
        // CONNECTOR TARGET PRESELECTION
        // ----------------------------------
        if (BattleManager._connectorTargetMode) {
            if (DEBUG_CONNECTORS) console.log("Connector Target Preselection");
            var target = this._enemyWindow.enemy()
            actor._connectorPreviewTarget = target;
            //actor._connectorPreviewTargetSprite = this.CacheTargetImageExtension(target);
            BattleManager._connectorTargetMode = false;
            this._enemyWindow.hide();
            this._enemyWindow.deactivate();
            target.deselect();
            if (DEBUG_CONNECTORS) {
                console.log(
                    actor._connectorPreviewTarget,
                    actor._connectorPreviewTarget.isSelected()
                );
            }
            return;
        }
        Connector_SB_onEnemyOk.call(this);
    };

    var Connector_SB_onActorOk = Scene_Battle.prototype.onActorOk;
    Scene_Battle.prototype.onActorOk = function() {
        if (TRACE_CONNECTORS || DEBUG_CONNECTORS) console.log("ON ACTOR OK");
        var actor = this._actor || BattleManager.actor();
        // ----------------------------------
        // CONNECTOR TARGET PRESELECTION
        // ----------------------------------
        if (BattleManager._connectorTargetMode) {
            if (DEBUG_CONNECTORS) console.log("Connector Target Preselection");
            var target = this._actorWindow.actor();
            actor._connectorPreviewTarget = target;
            //actor._connectorPreviewTargetSprite = this.CacheTargetImageExtension(target);
            BattleManager._connectorTargetMode = false;
            this._actorWindow.hide();
            this._actorWindow.deactivate();
            target.deselect();
            if (DEBUG_CONNECTORS) {
                console.log(
                    actor._connectorPreviewTarget,
                    actor._connectorPreviewTarget.isSelected()
                );
            }
            return;
        }
        Connector_SB_onActorOk.call(this);
    };

    Scene_Battle.prototype._queueAction = function(action, target, type) {
        var actor = this._actor || BattleManager.actor();
        if (TRACE_CONNECTORS || DEBUG_CONNECTORS) console.log("QUEUE ACTION");
        if (DEBUG_CONNECTORS) {
            console.log(
                "STATE",
                {
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
        if (!BattleManager.isConnectorActionScopeCompatible(actor, action, target)) {
            if (DEBUG_CONNECTORS) {
                console.log(
                    "INVALID ACTION SCOPE -> REJECTED",
                    {
                        action: action.item() ? action.item().name : null,
                        target: target ? target.name() : null
                    }
                );
            }
            if (actor.itbActionPreview() === action) actor.clearITBActionPreview();
            SoundManager.playBuzzer();
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
                if (actor.itbActionPreview() === action) actor.clearITBActionPreview();
                SoundManager.playBuzzer();
                return;
            }
            data.resultState = action.buildResultState(sourceState);
            actor._lastQueuedConnectorState = sourceState;
            if (DEBUG_CONNECTORS) console.log("RESULT STATE:", data.resultState);
        }
        if (DEBUG_CONNECTORS) console.log("Enqueue");
        var enqueued = actor.enqueueAction(data);
        if (DEBUG_CONNECTORS) console.log("queue length AFTER:", actor.queueLength());
        if (enqueued) {
            actor.setITBActionPreview(action);
            BattleManager.requestTimelineRefresh("Queue Action");
        }
    };

    var Connector_SB_finishActionQueue = Scene_Battle.prototype.finishActionQueue;
    Scene_Battle.prototype.finishActionQueue = function() {
        var actor = this._actor || BattleManager.actor();
        if (TRACE_CONNECTORS || DEBUG_CONNECTORS) console.log("FINISH ACTION QUEUE");
        if (DEBUG_CONNECTORS) {
            console.log(
                "STATE",
                {
                    preview: actor ? !!actor._connectorPreviewTarget : null,
                    queueLength: actor ? actor.queueLength() : null,
                    phase: BattleManager._phase,
                    initiative: actor ? actor.initiative : null
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
        $gameTroop.members().forEach(function(enemy) {
            enemy.deselect();
        });
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
        this._actor = BattleManager.actor();
        Connector_SB_startActorCommandSelection.call(this);
        if (DEBUG_CONNECTORS) {
            console.log(
                "STATE",
                {
                    preview: this._actor ? !!this._actor._connectorPreviewTarget : null,
                    queueLength: this._actor ? this._actor.queueLength() : null,
                    phase: BattleManager._phase
                }
            );
        }
        console.log("Actor Command Window Active?:", this._actorCommandWindow.active);
        if (!this._actor) return;
        var actor = this._actor;
        if (!actor._connectorPreviewTarget) {
            if (actor.queueLength() <= 0) {
                if (DEBUG_CONNECTORS) console.log("Target preselection");
                BattleManager._connectorTargetMode = true;
                this.returnToTargetPreselection();
                return;
            } else if (actor._queuedTarget) {
                actor._connectorPreviewTarget = actor._queuedTarget;
            }
        }
        if (DEBUG_CONNECTORS) {
            console.log(
                "COMMAND_SELECTION_STATE",
                actor.queueLength(),
                actor._connectorPreviewTarget
            );
        }
    };

    var Connector_SB_selectEnemySelection = Scene_Battle.prototype.selectEnemySelection;
    Scene_Battle.prototype.selectEnemySelection = function() {
        var actor = this._actor || BattleManager.actor();
        if (TRACE_CONNECTORS || DEBUG_CONNECTORS) console.log("Select Enemy Selection");
        if (DEBUG_CONNECTORS) {
            console.log("Actor", !!actor);
            console.log("Queue length", actor ? actor.queueLength() : null);
            console.log("Preview target:", actor ? actor._connectorPreviewTarget : null);
        }
        if (this.queueConnectorActionAndReturn(actor, BattleManager.inputtingAction())) return;
        Connector_SB_selectEnemySelection.call(this);
    };

    Scene_Battle.prototype.queueConnectorAction = function(actor, action) {
        if (!actor || !action || !actor._connectorPreviewTarget) return;
        if (TRACE_CONNECTORS || DEBUG_CONNECTORS) console.log("AUTO QUEUE CONNECTOR ACTION");
        //var target = actor._connectorPreviewTarget;
        // Inject stored target for action requiring target selection
        //if (DEBUG_CONNECTORS) console.log("Store target");
        //action.setTarget(target.index());
        // Build queue entry and connector result state
        this._queueAction(action, actor._connectorPreviewTarget, action.isForOpponent() ? "enemy" : "ally");
        if (DEBUG_CONNECTORS) console.log("Queue length:", actor.queueLength()); 
    };

    Scene_Battle.prototype.returnToCommandInput = function() {
        if (TRACE_CONNECTORS || DEBUG_CONNECTORS) console.log("RETURN TO COMMAND INPUT");
        this._skillWindow.hide();
        this._itemWindow.hide();
        this._enemyWindow.hide();
        this._actorWindow.hide();
        this._actorCommandWindow.show();
        this._actorCommandWindow.activate();
    };

    var Connector_SB_selectPrevious = Scene_Battle.prototype.selectPreviousCommand;
    Scene_Battle.prototype.selectPreviousCommand = function() {
        if (TRACE_CONNECTORS || DEBUG_CONNECTORS) console.log("Select Previous Command");
        var actor = this._actor || BattleManager.actor();
        if (!actor || !actor._connectorPreviewTarget) return;
        if (!actor._canUndoQueuedAction) {
            if (!actor.queueLength() || actor.queueLength() === 0) {
                $gameTroop.members().forEach(function(enemy) {enemy.deselect()});
                BattleManager.resetTargetPreselection(actor);
                SceneManager._scene.returnToTargetPreselection();
            }
            return;
        }
        console.log("Actor:", actor);
        if (actor) console.log("Can undo queued action:", actor._canUndoQueuedAction);
        Connector_SB_selectPrevious.call(this);
    };

    var Connector_WS_processCancel = Window_Selectable.prototype.processCancel;
    Window_Selectable.prototype.processCancel = function() {
        if (DEBUG_CONNECTORS) {
            console.log(
                "PROCESS CANCEL",
                this.constructor.name
            );
        }
        var scene = SceneManager._scene;
        // Let skill and item windows use their normal cancel handlers.
        if (this === scene._skillWindow || this === scene._itemWindow) {
            Connector_WS_processCancel.call(this);
            return;
        }
        var actor = BattleManager.actor();
        if (!actor || !actor._connectorPreviewTarget) {
            SoundManager.playCancel();
            scene._actorWindow.deselect();
            scene.prepareEnemyPreselection();
            return;
        }
        if (!actor._canUndoQueuedAction) {
            if (!actor.queueLength() || actor.queueLength() === 0) {
                SoundManager.playCancel();
                this.updateInputData();
                this.deactivate();
                $gameTroop.members().forEach(function(enemy) {enemy.deselect()});
                BattleManager.resetTargetPreselection(actor);
                scene.returnToTargetPreselection();
            }
            return;
        }
        Connector_WS_processCancel.call(this);
    };

    Scene_Battle.prototype.returnToTargetPreselection = function(actor, action) {
        this._actorCommandWindow.deactivate();
        this._skillWindow.hide();
        this._itemWindow.hide();
        this.prepareEnemyPreselection();
    }

    Scene_Battle.prototype.prepareEnemyPreselection = function(actor, action) {
        this._enemyWindow.show();
        this._actorWindow.deactivate();
        this._actorWindow.hide();
        this._enemyWindow.connectorPreviewSelect(0);
        this._enemyWindow.activate();
    }

    Scene_Battle.prototype.queueConnectorActionAndReturn = function(actor, action) {
        if (!actor || !action || !action.item()) return false;
        if (!actor._connectorPreviewTarget) return false;
        if (DEBUG_CONNECTORS) {
            console.log(
                "CONNECTOR TARGET EXISTS -> QUEUE ACTION"
            );
        }
        this.queueConnectorAction(actor, action);
        this.returnToCommandInput();
        return true;
    };

    Scene_Battle.prototype.updateConnectorTargetWindow = function() {
        if (!BattleManager._connectorTargetMode) {
            this._connectorTargetInputMode = null;
            this._connectorTargetLastMouseX = TouchInput.x;
            this._connectorTargetLastMouseY = TouchInput.y;
            return;
        }
        // Keyboard browsing takes priority until the mouse moves.
        if (Input.isTriggered("left")) {
            this._connectorTargetInputMode = "keyboard";
            this.switchConnectorTargetWindow("enemy");
            return;
        }
        if (Input.isTriggered("right")) {
            this._connectorTargetInputMode = "keyboard";
            this.switchConnectorTargetWindow("actor");
            return;
        }
        if (Input.isRepeated("up")) {
            this._connectorTargetInputMode = "keyboard";
            this.moveConnectorTarget(-1);
            return;
        }
        if (Input.isRepeated("down")) {
            this._connectorTargetInputMode = "keyboard";
            this.moveConnectorTarget(1);
            return;
        }
        // Resume mouse-driven selection when the pointer moves.
        var mouseMoved =
            this._connectorTargetLastMouseX !== TouchInput.x ||
            this._connectorTargetLastMouseY !== TouchInput.y;
        this._connectorTargetLastMouseX = TouchInput.x;
        this._connectorTargetLastMouseY = TouchInput.y;
        //if (mouseMoved) this._connectorTargetInputMode = "mouse";
        //if (this._connectorTargetInputMode === "keyboard") return;
        var enemyIndex = this._enemyWindow.getMouseOverEnemy();
        var actorIndex = this._actorWindow.getMouseOverActor();
        if (enemyIndex >= 0  && (!this._enemyWindow.active || mouseMoved)) {
            this._connectorTargetInputMode = "mouse";
            this.setConnectorTargetWindow("enemy");
            this.previewConnectorTarget(this._enemyWindow, enemyIndex);
            return;
            //this._enemyWindow.connectorPreviewSelect(enemyIndex);
        } else if (actorIndex >= 0) {
            this._connectorTargetInputMode = "mouse";
            this.setConnectorTargetWindow("actor");
            this.previewConnectorTarget(this._actorWindow, actorIndex);
            return;
            //this._actorWindow.connectorPreviewSelect(actorIndex);
        }
        if (mouseMoved) this._connectorTargetInputMode = "mouse";
        if (this._connectorTargetInputMode === "keyboard") return;
        // Normal mouse browsing within the active window.
        if (enemyIndex >= 0) {
            this.setConnectorTargetWindow("enemy");
            this.previewConnectorTarget(this._enemyWindow, enemyIndex);
        } else if (actorIndex >= 0) {
            this.setConnectorTargetWindow("actor");
            this.previewConnectorTarget(this._actorWindow, actorIndex);
        }
    };

    /* Scene_Battle.prototype.setConnectorTargetWindow = function(type) {
        var currentWindow = this.connectorTargetWindow();
        var targetWindow = type === "actor" ? this._actorWindow : this._enemyWindow;
        // Already in the requested target mode.
        if (currentWindow === targetWindow && targetWindow.visible) return;
        if (currentWindow !== targetWindow) SoundManager.playCursor();
        if (type === "actor") {
            this._enemyWindow.deactivate();
            this._enemyWindow.hide();
            this._actorWindow.show();
            this._actorWindow.activate();
            var enemy = this._enemyWindow.enemy();
            if (enemy) $gameTroop.select(enemy);
        } else {
            this._actorWindow.deactivate();
            this._actorWindow.hide();
            this._enemyWindow.show();
            this._enemyWindow.activate();
            var actor = this._actorWindow.actor();
            if (actor) $gameParty.select(actor);
        }
    }; */

    Scene_Battle.prototype.setConnectorTargetWindow = function(type) {
        if (type === "enemy") {
            if (this._enemyWindow.active &&
                this._enemyWindow.visible &&
                !this._actorWindow.visible) {
                return;
            } else if (!this._enemyWindow.active) {
                SoundManager.playCursor();
            }
            //this._actorWindow.deselect();
            this._actorWindow.deactivate();
            this._actorWindow.hide();
            this._enemyWindow.show();
            this._enemyWindow.activate();
            this._enemyWindow.active = true;
            var enemy = this._enemyWindow.enemy();
            if (enemy) $gameTroop.select(enemy);
        } else if (type === "actor") {
            // Already in actor-target mode: preserve its current selection.
            if (this._actorWindow.active &&
                this._actorWindow.visible &&
                !this._enemyWindow.visible) {
                return;
            } else if (!this._actorWindow.active) {
                SoundManager.playCursor();
            }
            //this._enemyWindow.deselect();
            this._enemyWindow.deactivate();
            this._enemyWindow.hide();
            this._actorWindow.show();
            this._actorWindow.activate();
            this._actorWindow.active = true;
            var actor = this._actorWindow.actor();
            if (actor) $gameParty.select(actor);
        }
    };

    Scene_Battle.prototype.connectorTargetWindow = function() {
        if (this._actorWindow && this._actorWindow.active) return this._actorWindow;
        if (this._enemyWindow && this._enemyWindow.active) return this._enemyWindow;
        return null;
    };

    Scene_Battle.prototype.moveConnectorTarget = function(direction) {
        var window = this.connectorTargetWindow();
        if (!window) return;
        var count = window.maxItems();
        if (count <= 0) return;
        var index = window.index();
        if (index < 0) index = direction < 0 ? 0 : -1;
        index = (index + direction + count) % count;
        this.previewConnectorTarget(window, index);
    };

    Scene_Battle.prototype.switchConnectorTargetWindow = function(type) {
        var currentWindow = this.connectorTargetWindow();
        var targetWindow = type === "actor" ? this._actorWindow : this._enemyWindow;
        if (!currentWindow || currentWindow === targetWindow) return;
        var count = targetWindow.maxItems();
        if (count <= 0) return;
        // Preserve the approximate index when changing target types.
        var index = currentWindow.index();
        index = Math.max(0, Math.min(index, count - 1));
        this.setConnectorTargetWindow(type);
        this.previewConnectorTarget(targetWindow, index);
    };

    Scene_Battle.prototype.previewConnectorTarget = function(window, index) {
        if (!window || index < 0 || index >= window.maxItems()) return;
        //window.connectorPreviewSelect(index);
        window.select(index);
        var target = window === this._actorWindow ? window.actor() : window.enemy();
        if (!target) return;
        if (target.isActor()) {
            $gameParty.select(target);
        } else if (target.isEnemy()) {
            $gameTroop.select(target);
        }
    };

    Scene_Battle.prototype.commandGuard = function() {
        var actor = this._actor || BattleManager.actor();
        var action = BattleManager.inputtingAction();
        action.setGuard();
        if (this.queueConnectorActionAndReturn(actor, action)) return;
        this.selectNextCommand();
    };

    //Scene_Battle.prototype.CacheTargetImageExtension = function(target) {
        // Extension hook for caching target image
    //    return null;
    //}

    //=============================================================================
    // Window Extensions
    //=============================================================================

    var Connector_WBE_processCursorMove = Window_BattleEnemy.prototype.processCursorMove;
    Window_BattleEnemy.prototype.processCursorMove = function() {
        if (BattleManager._connectorTargetMode) return;
        Connector_WBE_processCursorMove.call(this);
    };

    Window_BattleEnemy.prototype.connectorPreviewSelect = function(index) {
        this._index = index;
        this.ensureCursorVisible();
        this.updateCursor();
    };

    var Connector_WBA_processCursorMove = Window_BattleActor.prototype.processCursorMove;
    Window_BattleActor.prototype.processCursorMove = function() {
        if (BattleManager._connectorTargetMode) return;
        Connector_WBA_processCursorMove.call(this);
    };

    Window_BattleActor.prototype.connectorPreviewSelect = function(index) {
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
        var action = new Game_Action(actor);
        action.setSkill(item.id);
        if (DEBUG_CONNECTORS) console.log("Action:", action);
        var correctScope = BattleManager.isConnectorActionScopeCompatible(
                actor,
                action,
                actor._connectorPreviewTarget
        );
        if (actor._connectorPreviewTarget && !correctScope) return false;
        var state = BattleManager.connectorValidationState(actor);
        if (!state) return true;
        return action.canConnectToState(state);
    };

    var Connector_WSL_includes = Window_SkillList.prototype.includes;
    Window_SkillList.prototype.includes = function(item) {
        if (DEBUG_CONNECTORS) console.log("INCLUDES");
        if (!item) return false;
        if (!Connector_WSL_includes.call(this, item)) return false;
        var actor = this._actor;
        if (!actor) return false;
        var action = new Game_Action(actor);
        action.setSkill(item.id);
        if (DEBUG_CONNECTORS) console.log("Action:", action);
        var correctScope = BattleManager.isConnectorActionScopeCompatible(
                actor,
                action,
                actor._connectorPreviewTarget
        );
        if (actor._connectorPreviewTarget && !correctScope) return false;
        var state = BattleManager.connectorValidationState(actor);
        if (!state) return true;
        return action.canConnectToState(state);
    };

})();