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
                skillId: item.id,
                stateId: item.selfState.stateId,
                triggerInitiative: initiative + item.selfState.offset
            });
            //}
            console.log("ITB EVENTS:", this._ITBEvents);
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
        console.log("Action:", action);
        if (action && action.item() && action.item().selfState) {
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
        }
        // Scheduled selfstates
        console.log(
            "ITB Events",
            battler.name(),
            battler._ITBEvents
        );
        battler._ITBEvents.forEach(function(event) {
            entries.push({
                type: "selfState",
                battler: battler,
                stateId: event.stateId,
                initiative: event.triggerInitiative,
                activationOrder: battler._activationOrder || 0,
                preview: false,
                event: event
            });
            console.log(
                "SCHEDULED STATE",
                battler.name(),
                event.stateId,
                event.triggerInitiative
            );
        });
    };

    /* var TE_WCTBT_buildSlots = Window_CTBTimeline.prototype.buildTimelineSlots;
    Window_CTBTimeline.prototype.buildTimelineSlots = function() {
        TE_WCTBT_buildSlots.call(this);
        // After base slots exist, enrich them safely
        if (!this._timelineSlots) return;
        this._timelineSlots.forEach(function(slot) {
            if (!slot || slot.type !== "statePreview") return;
            // ensure consistent structure (important!)
            slot.stateId = slot.stateId || 0;
            slot.preview = true;
            slot.event = "selfState";
        });
    }; */

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

    /* var TE_WCTBT_drawTrackSlot = Window_CTBTimeline.prototype.drawTrackSlot;
    Window_CTBTimeline.prototype.drawTrackSlot = function(x, y, width, height, value, i) {
        TE_WCTBT_drawTrackSlot.call(this, x, y, width, height, value, i);
        if (!this._timelineSlots) return;
        var slot = this._timelineSlots[i];
        if (!slot) return;
        if (slot.type === "statePreview") {
            var state = $dataStates[slot.stateId];
            if (state && state.iconIndex) {
                //console.log("DRAW STATE ICON", state.name);
                this.drawIcon(
                    state.iconIndex,
                    x + width / 2 - 16,
                    y - 18
                );
            }
        }
    } */

    var TE_CTBAI_init = Window_CTBActionIcon.prototype.initialize;
    Window_CTBActionIcon.prototype.initialize = function(mainSprite) {
        TE_CTBAI_init.call(this, mainSprite);
        if (!this._isStatePreviewWindow) this.createStatePreviewWindow();
    };

    Window_CTBActionIcon.prototype.createStatePreviewWindow = function() {
        this._statePreviewWindow = new Window_CTBActionIconStatePreview(this);
        this.addChild(this._statePreviewWindow);
    };

    Window_CTBActionIcon.prototype.drawPreviewSelfState = function() {
        //console.log("DRAW PREVIEW SELFSTATE");
        if (!this._battler) return;
        var selfState = this._battler.previewSelfState();
        if (!selfState) return;
        //console.log("Selfstate:", selfState);
        var state = $dataStates[selfState.stateId];
        if (!state) return;
        //console.log("State:", state);
        var iconIndex = state.iconIndex;
        if (!iconIndex) return;
        //console.log("Icon index:", iconIndex);
        var timeline = BattleManager.timelineWindow();
        if (!timeline) return;
        // Action slot position (anchor)
        var actionInit = this._battler.ctbPreviewInitiative();
        //console.log("Action Init:", actionInit);
        if (!actionInit) return;
        // Selfstate slot position
        var stateInit = selfState.initiative;
        //console.log("State Init:", stateInit);
        // convert into timeline space
        var actionX = timeline.initiativeToX(actionInit);
        var stateX = timeline.initiativeToX(stateInit);
        //console.log("Initiative:", initiative);
        // Relative offset inside action icon window
        var x = stateX - actionX; //timeline.initiativeToX(initiative);
        var y = 20;
        if (this._battler.isCTBPreviewBlinking()) {
            this.contents.paintOpacity = this._blinkOpacity;
        }
        /* console.log(
            "Window X:",
            this.x,
            "Timeline X:",
            x,
            "Contents Width:",
            this.contentsWidth()
        ); */
        //console.log("X-coordinate:", x);
        this.drawActionBorderAt(x - 3, y - 3, "#66CCFF");
        this.drawActionIcon(iconIndex, x, y);
        this.contents.paintOpacity = 255;
    };

    var TE_WCTBAI_updateRedraw = Window_CTBActionIcon.prototype.updateRedraw;
    Window_CTBActionIcon.prototype.updateRedraw = function() {
        TE_WCTBAI_updateRedraw.call(this);
        this.drawPreviewSelfState();
    };

    Window_CTBActionIcon.prototype.previewSelfState = function() {
        if (!this._battler) return null;
        return this._battler.previewSelfState();
    };

    /* var TE_WCTBAI_updateRedraw = Window_CTBActionIcon.prototype.updateRedraw;
    Window_CTBActionIcon.prototype.updateRedraw = function() {
        if (this._timelineEntryType !== "statePreview") {
            TE_WCTBAI_updateRedraw.call(this);
            return;
        }
        this.contents.clear();
        this.drawActionBorder();
        this.drawActionIcon(this._iconIndex, 2, 20);
    }; */

    /* var TE_WCTBAI_updateActionIcon = Window_CTBActionIcon.prototype.updateActionIcon;
    Window_CTBActionIcon.prototype.updateActionIcon = function() {
        if (this._timelineEntryType !== "statePreview") {
            return TE_WCTBAI_updateActionIcon.call(this);
        }
        var preview = this._battler.previewSelfState();
        if (!preview) {
            this._iconIndex = 0;
        } else {
            var state = $dataStates[preview.stateId];
            this._iconIndex = state ? state.iconIndex : 0;
        }
        console.log("STATE ICON UPDATE");
    }; */

    /* var TE_WCTBAI_updatePosition = Window_CTBActionIcon.prototype.updatePosition;
    Window_CTBActionIcon.prototype.updatePosition = function() {
        if (this._timelineEntryType !== "statePreview") {
            TE_WCTBAI_updatePosition.call(this);
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
    }; */

    /* var TE_WCTBAI_updateDestinationX = Window_CTBActionIcon.prototype.updateDestinationX;
    Window_CTBActionIcon.prototype.updateDestinationX = function() {
        if (this._timelineEntryType !== "statePreview") {
            return TE_WCTBAI_updateDestinationX.call(this);
        }
        if (!this._battler) return;
        var preview = this.previewSelfState();
        if (!preview) {
            this.visible = false;
        } else {
            var timeline = BattleManager.timelineWindow();
            if (!timeline) return;
            this.visible = true;
            var x = timeline.initiativeToX(preview.initiative);
            this._destinationX = x - this.width / 2;
        }
    };

    var TE_WCTBAI_updateTargetIcon = Window_CTBActionIcon.prototype.updateTargetIcon;
    Window_CTBActionIcon.prototype.updateTargetIcon = function() {
        if (this._timelineEntryType === "statePreview") return;
        TE_WCTBAI_updateTargetIcon.call(this);
    }; */

    function Window_CTBActionIconStatePreview(parent) {
        this.initialize.apply(this, arguments);
    };

    Window_CTBActionIconStatePreview.prototype = Object.create(Window_CTBActionIcon.prototype);
    Window_CTBActionIconStatePreview.prototype.constructor = Window_CTBActionIconStatePreview;
    //Window_CTBActionIconStatePreview.prototype.drawActionBorderAt = 
    //    Window_CTBActionIcon.prototype.drawActionBorderAt;
    //Window_CTBActionIconStatePreview.prototype.drawActionBorder =
    //    Window_CTBActionIcon.prototype.drawActionBorder;
    //Window_CTBActionIconStatePreview.prototype.drawActionIcon =
    //    Window_CTBActionIcon.prototype.drawActionIcon;

    Window_CTBActionIconStatePreview.prototype.initialize = function(parent) {
        this._parent = parent;
        //console.log("STATE WINDOW INITIALIZE:", parent);
        this._isStatePreviewWindow = true;
        Window_CTBActionIcon.prototype.initialize.call(this, parent._mainSprite);
        this.opacity = 0;
        this.contentsOpacity = 255;
    };

    Window_CTBActionIconStatePreview.prototype.updatePosition = function() {
        var battler = this._parent._battler;
        if (!battler) return;
        var timelineState = battler.currentTimelineState();
        //console.log("Timeline state:", timelineState);
        if (!timelineState) {
            this.visible = false;
            return;
        }
        //console.log("Type:", timelineState.type);
        var timeline = BattleManager.timelineWindow();
        if (!timeline) return;
        var stateSlot = this.findStatePreviewSlot(battler);
        //console.log("State slot:", stateSlot);
        if (timelineState.type === "statePreview") {
            var actionSlot = timeline.slotForPreview(battler);
        } else {
            var actionSlot = timeline.slotForBattler(battler);
        }
        //console.log("Action slot:", actionSlot);
        if (stateSlot === undefined || actionSlot === undefined) return;
        var stateX = timeline.slotCenterX(stateSlot);
        var actionX = timeline.x + timeline.slotCenterX(actionSlot);
        this.x = stateX - actionX;
        this.y = 0; // same baseline as action icon window
        this.visible = true;
    };

    Window_CTBActionIconStatePreview.prototype.update = function() {
        //console.log("STATE WINDOW UPDATE");
        Window_CTBActionIcon.prototype.update.call(this);
        this.updatePosition();
        this.refresh();
        this.updateBlink();
    };

    Window_CTBActionIconStatePreview.prototype.refresh = function() {
        //console.log("STATE WINDOW REFRESH");
        this.contents.clear();
        var battler = this._parent._battler;
        if (!battler) return;
        var timelineState = battler.currentTimelineState();
        if (!timelineState) return;
        var state = $dataStates[timelineState.stateId];
        if (!state) return;
        var iconIndex = state.iconIndex;
        if (!iconIndex) return;
        //console.log("Draw Icon");
        //this.drawActionBorder();
        if (timelineState.type === "statePreview") {
            var blinking = this._battler.isCTBPreviewBlinking();
            if (blinking) this.contents.paintOpacity = this._blinkOpacity;
            this.drawPreviewArrow("#66CCFF");
        }
        this.drawActionBorderAt(-1, 17, "#66CCFF");
        this.drawActionIcon(iconIndex, 2, 20);
        this.drawTargetBackground();
        this.drawTargetMiniIcon();
        if (timelineState.type === "statePreview") this.contents.paintOpacity = 255;
    };

    Window_CTBActionIconStatePreview.prototype.targetBattler = function() {
        var battler = this._parent._battler;
        if (!battler) return null;
        var selfState = battler.previewSelfState();
        if (!selfState) return Window_CTBActionIcon.prototype.targetBattler();
        return selfState.battler;
    };

    /* Window_CTBActionIconStatePreview.prototype.findStatePreviewSlot = function() {
        var timeline = BattleManager.timelineWindow();
        if (!timeline) return null;
        var battler = this._parent._battler;
        if (!battler) return null;
        var selfState = battler.previewSelfState();
        if (!selfState) return null;
        return timeline._timelineSlots.find(function(slot) {
            return slot.type === "statePreview" &&
                slot.battler === battler &&
                slot.stateId === selfState.stateId;
        });
    } */

    Window_CTBActionIconStatePreview.prototype.findStatePreviewSlot = function(battler) {
        var timeline = BattleManager.timelineWindow();
        if (!timeline) return 0;
        var battler = this._parent._battler;
        if (!battler) return 0;
        var timelineState = battler.currentTimelineState();
        if (!timelineState) return;
        var type = timelineState.type;
        if (type === "statePreview") {
            var selfState = battler.previewSelfState();
        } else {
            var selfState = battler.scheduledSelfState();
        }
        //console.log("Timeline state:", timelineState);
        //console.log("Type:", timelineState.type);
        if (!selfState) return 0;
        for (var i = 0; i < timeline._timelineSlots.length; i++) {
            var slot = timeline._timelineSlots[i];
            if (slot.type === type && 
                slot.battler === battler &&
                slot.stateId === selfState.stateId
            ) {
                return i + 1;
            }
        }
        return 0;
    };

    Window_CTBActionIconStatePreview.prototype.currentStateData = function() {
        var preview = this._battler.previewSelfState();
        if (preview) return preview;
        return this._battler.scheduledSelfState();
    };

    Game_Battler.prototype.previewSelfState = function() {
        var action = this.ctbActionPreview();
        //return this._battler.previewSelfState();
        if (!action) return null;
        var item = action.item();
        if (!item || !item.selfState) return null;
        var data = action.item().selfState;
        return {
            stateId: data.stateId,
            initiative: this.initiative + data.offset,
            battler: this
        };
    };

    Game_Battler.prototype.scheduledSelfState = function() {
        if (!this.ITBEvents || this._ITBEvents.length <= 0) return null;
        return this._ITBEvents.find(function(event) {return event.type === "selfState"});
    };

    Game_Battler.prototype.currentTimelineState = function() {
        var preview = this.previewSelfState();
        if (preview) {
            preview.type = "statePreview";
            return preview;
        }
        if (!this._ITBEvents) return null;
        var event = this._ITBEvents.find(function(e) {return e.stateId});
        if (!event) return null;
        return {
            stateId: event.stateId,
            initiative: event.triggerInitiative,
            type: "scheduledState",
            event: event
        };
    };

    /* var TE_SB_addCTBIcon = Sprite_Battler.prototype.addCTBIcon;
    Sprite_Battler.prototype.addCTBIcon = function() {
        TE_SB_addCTBIcon.call(this);
        this._ctbStatePreviewIcon = new Window_CTBActionIcon(this);
        this._ctbStatePreviewIcon._timelineEntryType = "statePreview";
        //console.log("ADD STATE ICON");
    }; */
    
})();