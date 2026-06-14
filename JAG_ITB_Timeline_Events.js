//=============================================================================
// JAG_ITB_Timeline_Events.js
//=============================================================================
/*:
 * @name JAG_ITB_Timeline_Events
 * @plugindesc Triggers events and states on initiative track
 * @author JAG
 *
 */

(function() {

    const DEBUG_EVENTS = true;

    //--------------------------------------------------------------------------
    // Notetag parser
    //--------------------------------------------------------------------------

    var TE_DM_isDatabaseLoaded = DataManager.isDatabaseLoaded;
    DataManager.isDatabaseLoaded = function() {
        if (!TE_DM_isDatabaseLoaded.call(this)) return false;
        if (!this._eventsLoaded) {
            this.processITBSelfStateNotetags($dataSkills);
            this._eventsLoaded = true;
        }
        return true;
    };

    DataManager.processITBSelfStateNotetags = function(group) {
        if (DEBUG_EVENTS) console.log("SELFSTATE NOTE TAGS");
        //const regex = /<SelfState:\s*(\d+)\s*,\s*(\d+)\s*>/i;
        const regex = /<SelfState:\s*(\d+)(?:\s*,\s*(-?\d+))?\s*>/i;
        if (DEBUG_EVENTS) console.log("Group:", group);
        for (let i = 1; i < group.length; i++) {
            const obj = group[i];
            if (DEBUG_EVENTS) console.log("Name:", obj.name);
            if (!obj) continue;
            obj.selfState = null;
            const match = regex.exec(obj.note);
            if (match) {
                if (DEBUG_EVENTS) {
                    console.log("--------------------");
                    console.log("INPUT TAG MATCH");
                }
                obj.selfState = {
                    stateId: Number(match[1]),
                    offset: Number(match[2] || 0)
                };
                if (DEBUG_EVENTS) console.log("Selfstate:", obj.selfState);
            }
        }
    };

    //--------------------------------------------------------------------------
    // Track global initiative progression
    //--------------------------------------------------------------------------

    BattleManager.currentInitiative = function() {
        var battlers = this.allBattleMembers().filter(function(b) {
            return b && b.isAlive();
        });
        if (battlers.length <= 0) return 0;
        return Math.min.apply(null,
            battlers.map(function(b) {
                return b.initiative;
            })
        );
    };

    //--------------------------------------------------------------------------
    // Call effects scheduler
    //--------------------------------------------------------------------------

    BattleManager.updateITBEvents = function() {
        this.allBattleMembers().forEach(function(battler) {
            if (battler) battler.updateITBEvents();
        });
    };
    
    TE_BM_getChargedCTBBattler = BattleManager.getChargedCTBBattler;
    BattleManager.getChargedCTBBattler = function() {
        this.updateITBEvents();
        return TE_BM_getChargedCTBBattler.call(this);
    };

    /* TE_BM_updateCTBPhase = BattleManager.updateCTBPhase;
    BattleManager.updateCTBPhase = function() {
        TE_BM_updateCTBPhase.call(this);
        BattleManager.allBattleMembers().forEach(function(battler) {
            if (battler) battler.updateITBEvents();
        });
    }; */

    //--------------------------------------------------------------------------
    // Damage debug hook
    //--------------------------------------------------------------------------

    var TEST_GA_makeDamageValue = Game_Action.prototype.makeDamageValue;
    Game_Action.prototype.makeDamageValue = function(target, critical) {
        if (DEBUG_EVENTS) {
            console.log("=== DAMAGE DEBUG ===");
            console.log("Target:", target.name());
            console.log("States:", target.states().map(function(s){ return s.id + ":" + s.name; }));
            console.log("Base DEF:", target.paramBase(3));
            console.log("Final DEF:", target.def);
        }
        var result = TEST_GA_makeDamageValue.call(this, target, critical);
        if (DEBUG_EVENTS) console.log("Damage:", result);
        return result;
    };

    //--------------------------------------------------------------------------
    // Battler storage
    //--------------------------------------------------------------------------

    TE_GB_initMembers = Game_Battler.prototype.initMembers;
    Game_Battler.prototype.initMembers = function() {
        TE_GB_initMembers.call(this);
        this._ITBEvents = [];
    };

    //--------------------------------------------------------------------------
    // Helper API
    //--------------------------------------------------------------------------

    /* Game_Battler.prototype.addTimedState = function(stateId, applyOffset, duration) {
        applyOffset = applyOffset || 0;
        duration = duration || 0;
        const now = this.initiative || 0;
        if (!this._stateTiming) this._stateTiming = {};
        this._stateTiming[stateId] = {
            applyAt: now + applyOffset,
            removeAt: now + applyOffset + duration
        };
    }; */

    //--------------------------------------------------------------------------
    // State valuation hook
    //--------------------------------------------------------------------------

    /* Game_Battler.prototype.isITBStateActive = function(stateId) {
        if (!this.isStateAffected(stateId)) return false;
        const timing = this._stateTiming?.[stateId];
        if (!timing) return true;
        const now = this.initiative || 0;
        return now >= timing.applyAt && now < timing.removeAt;
    }; */
    
    //--------------------------------------------------------------------------
    // Schedule the effect
    //--------------------------------------------------------------------------

    const TE_GB_setupCTBCharge = Game_Battler.prototype.setupCTBCharge;
    Game_Battler.prototype.setupCTBCharge = function() {
        const initiative = this._initiative;
        TE_GB_setupCTBCharge.call(this);
        const action = this.currentAction();
        if (!action) return;
        //if (!action._ctbActionId) action._ctbActionId = BattleManager._nextCTBActionId++;
        const item = action.item();
        if (!item || !item.selfState) return;
        var skillId = item.id;
        this._ITBEvents = this._ITBEvents.filter(function(event) {
            return event.skillId === skillId;
        });
        /* if (!action._ctbSelfstate) {
            action._ctbSelfState = {
                actionId: action._ctbActionId,
                stateId: item.selfState.stateId,
                offset: item.selfState.offset,
                target: this
            };
        } */
        if (!item.selfState.offset || item.selfState.offset <= 0) {
            if (DEBUG_EVENTS) console.log("Add state:", item.selfState.stateId);
            this.addState(item.selfState.stateId);
            if (DEBUG_EVENTS) {
                console.log("Battler:", this.name());
                console.log("States:", this._states);
            }
        } else {
            /* var existing = this._ITBEvents.find(function(effect) {
                return effect.stateId === item.selfState.stateId;
            });
            if (existing) {
                if (DEBUG_EVENTS) {
                    console.log("Event already exists:", item.selfState.stateId);
                    console.log("State initiative before:", existing.triggerInitiative);
                }
                existing.triggerInitiative = initiative + item.selfState.offset;
                existing.actionId = action._ctbActionId;
                existing.action = action;
            } else { */
            if (DEBUG_EVENTS) console.log("New event scheduled:", item.selfState.stateId);
            this._ITBEvents.push({
                actionId: action.item.Id,
                stateId: item.selfState.stateId,
                triggerInitiative: initiative + item.selfState.offset
            });
            //}
            if (DEBUG_EVENTS) {
                console.log("Battler:", this.name());
                console.log("State initiative:", initiative + item.selfState.offset);
                console.log("Battler initiative:", initiative);
                console.log(
                    "SELFSTATE",
                    item ? item.name : null,
                    item ? item.selfState : null
                );
            }
        }
    };

    //--------------------------------------------------------------------------
    // Cancel the effect
    //--------------------------------------------------------------------------

    /* Game_Battler.prototype.cancelActionSelfState = function(action) {
        if (!action) return;
        this.removeITBEventsForAction(action);
        if (action._ctbSelfState) action._ctbSelfState = null;
    }; */

    /* Game_Battler.prototype.removeITBEventsForAction = function(action) {
        if (!action || !this._ITBEvents) return;
        this._ITBEvents = this._ITBEvents.filter(function(event) {
            return event.action !== action
        });
    }; */

    Game_Battler.prototype.validateITBEvents = function() {
        var action = this.currentAction();
        var skillId = action && action.item() ? action.item().id : 0;
        this._ITBEvents = this._ITBEvents.filter(function(event) {
            return event.skillId === skillId;
        });
    };

    //--------------------------------------------------------------------------
    // Auto cleanup
    //--------------------------------------------------------------------------

    /* const TE_GB_update = Game_Battler.prototype.update;
    Game_Battler.prototype.update = function() {
        TE_GB_update.call(this);
        if (!this._stateTiming) return;
        const now = this.initiative || 0;
        for (const stateId in this._stateTiming) {
            const t = this._stateTiming[stateId];
            if (t.removeAt <= now) {
                this.removeState(Number(stateId));
                delete this._stateTiming[stateId];
            }
        }
    }; */

    //--------------------------------------------------------------------------
    // Auto removal
    //--------------------------------------------------------------------------

    const TE_GB_onAllActionsEnd = Game_Battler.prototype.onAllActionsEnd;
    Game_Battler.prototype.onAllActionsEnd = function() {
        if (DEBUG_EVENTS) {
            console.log(
                "ON ALL ACTIONS END:",
                this.name(),
                this.states().map(s => `${s.id}:${s.name}`)
            );
        }
        TE_GB_onAllActionsEnd.call(this);
        this.removeAfterActionStates();
    };

    Game_Battler.prototype.removeAfterActionStates = function() {
        this.states().forEach(function(state) {
            if (state.autoRemovalTiming !== 1) return;
            if (DEBUG_EVENTS) {
                console.log(
                    "REMOVE AFTER ACTION:",
                    this.name(),
                    state.name
                );
            }
            this.removeState(state.id);
        }, this);
    };

    /* const TE_GB_removeState = Game_Battler.prototype.removeState;
    Game_Battler.prototype.removeState = function(stateId) {
        TE_GB_removeState.call(this. stateId);
        this.cleanupITBEventsAfterStateRemoval();
    };

    Game_Battler.prototype.cleanupITBEventsAfterStateRemoval = function() {
        if (!this._ITBEvents) return;
        // remove orphaned events whose action no longer exists or is invalid
        this._ITBEvents = this._ITBEvents.filter(function(event) {
            if (!event.action) return false;
            if (event.action._item === undefined) return false;
            return true;
        });
    }; */

    //--------------------------------------------------------------------------
    // Update unscheduled effects
    //--------------------------------------------------------------------------

    Game_Battler.prototype.updateITBEvents = function() {
        if (!this._ITBEvents) return;
        for (let i = this._ITBEvents.length - 1; i >= 0; i--) {
            const effect = this._ITBEvents[i];
            if (DEBUG_EVENTS) {
                console.log("Update event", effect);
                console.log("Event initiative", effect.triggerInitiative);
                console.log("Next battler initiative", BattleManager.currentInitiative());
            }
            if (BattleManager.currentInitiative() >= effect.triggerInitiative) {
                this.addState(effect.stateId);
                this._ITBEvents.splice(i, 1);
                if (DEBUG_EVENTS) {
                    console.log(
                        "ITB EFFECT:",
                        this.name(),
                        "State",
                        effect.stateId
                    );
                }
            }
        }
    };

    //=============================================================================
    // Window_CTBTimeLine
    //=============================================================================

    var TE_BM_addTimelineExtensionEntries = BattleManager.addTimelineExtensionEntries;
    BattleManager.addTimelineExtensionEntries = function(entries, battler) {
        console.log(
            "TIMELINE EXTENSION",
            battler.name(),
            battler.ctbActionPreview()
        );
        TE_BM_addTimelineExtensionEntries.call(this, entries, battler);
        //var previews = battler._ctbStatePreviews;
        //if (!previews || previews.length <= 0) return;
        // Preview selfstate
        var action = battler.ctbActionPreview();
        if (!action || !action.item() || !action.item().selfState) return;
        console.log(
            "STATE CHECK",
            battler.name(),
            action.item() ? action.item().name : null,
            action.item() ? action.item().selfState : null
        );
        //if (battler.currentAction() && action === battler.currentAction()) return;
        var selfState = battler.previewSelfState();
        if (!selfState) return;
        console.log(
            "ADDING STATE PREVIEW",
            battler.name(),
            action.item().selfState.stateId
        );
        entries.push({
            type: "statePreview",
            battler: battler,
            stateId: selfState.stateId,
            initiative: selfState.initiative,
            activationOrder: battler._activationOrder || 0,
            preview: true
        });
        // Scheduled selfstates
        battler._ITBEvents.forEach(function(event) {
            entries.push({
                type: "statePreview",
                battler: battler,
                stateId: event.stateId,
                initiative: event.triggerInitiative,
                activationOrder: battler._activationOrder || 0,
                preview: false,
                event: event
            });
        });
    };

    Window_CTBTimeline.prototype.drawStatePreviewEntry = function(entry) {
        var state = $dataStates[entry.stateId];
        if (!state) return;
        var slot = this.createStatePreviewSlot(entry);
        this.addChild(slot);
    };

    Window_CTBTimeline.prototype.createStatePreviewSlot = function(entry) {
        var slot = new Sprite();
        slot._entry = entry;
        slot.x = this.slotX(entry.initiative);
        slot.y = this.slotY(entry.initiative);
        return slot;
    };

    var TE_WCTBAI_updateRedraw = Window_CTBActionIcon.prototype.updateRedraw;
    Window_CTBActionIcon.prototype.updateRedraw = function() {
        TE_WCTBAI_updateRedraw.call(this);
        this.drawPreviewSelfState();
    };

    Window_CTBActionIcon.prototype.drawPreviewSelfState = function() {
        if (!this._battler) return;
        var selfState = this._battler.previewSelfState();
        if (!selfState) return;
        var state = $dataStates[selfState.stateId];
        if (!state) return;
        var iconIndex = state.iconIndex;
        if (!iconIndex) return;
        // temporary position for testing
        var x = 38;
        var y = 20;
        if (this._battler.isCTBPreviewBlinking()) {
            this.contents.paintOpacity = this._blinkOpacity;
        }
        this.drawActionBorderAt(x - 3, y - 3, "#66CCFF");
        this.drawActionIcon(iconIndex, x, y);
        this.contents.paintOpacity = 255;
    };

    var TE_CTBAI_updateRedraw = Window_CTBActionIcon.prototype.updateRedraw;
    Window_CTBActionIcon.prototype.updateRedraw = function() {
        if (this._timelineEntryType !== "statePreview") {
            TE_CTBAI_updateRedraw.call(this);
            return;
        }
        this.contents.clear();
        this.drawActionBorder();
        this.drawActionIcon(this._iconIndex, 2, 20);
    };

    var TE_CTBAI_updateActionIcon = Window_CTBActionIcon.prototype.updateActionIcon;
    Window_CTBActionIcon.prototype.updateActionIcon = function() {
        if (this._timelineEntryType !== "statePreview") {
            TE_CTBAI_updateActionIcon.call(this);
            return;
        }
        var preview = this._battler.previewSelfState();
        if (!preview) {
            this._iconIndex = 0;
        } else {
            var state = $dataStates[preview.stateId];
            this._iconIndex = state ? state.iconIndex : 0;
        }
    };

    var TE_CTBAI_updatePosition = Window_CTBActionIcon.prototype.updatePosition;
    Window_CTBActionIcon.prototype.updatePosition = function() {
        if (this._timelineEntryType !== "statePreview") {
            TE_CTBAI_updatePosition.call(this);
            return;
        }
        var preview = this._battler.previewSelfState();
        if (!preview) {
            this.visible = false;
            return;
        } else this.visible = true;
        var timeline = BattleManager.timelineWindow();
        if (!timeline) return;
        var x = timeline.initiativeToX(preview.initiative);
        this.x = x - this.width / 2;
        this.y = this._mainSprite._ctbIcon.y;
    };

    Game_Battler.prototype.previewSelfState = function() {
        var action = this.ctbActionPreview();
        if (!action) return null;
        var item = action.item();
        if (!item || !item.selfState) return null;
        var data = action.item().selfState;
        return {
            stateId: data.stateId,
            initiative: this.initiative + data.offset
        };
    };

    var TE_SB_addCTBIcon = Sprite_Battler.prototype.addCTBIcon;
    Sprite_Battler.prototype.addCTBIcon = function() {
        TE_SB_addCTBIcon.call(this);
        this._ctbStatePreviewIcon = new Window_CTBActionIcon(this);
        this._ctbStatePreviewIcon._timelineEntryType = "statePreview";
    };
    
})();