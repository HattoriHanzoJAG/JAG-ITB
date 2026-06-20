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

    const DEBUG_EVENTS = false;

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
    // Battler storage
    //--------------------------------------------------------------------------

    TE_GB_initMembers = Game_Battler.prototype.initMembers;
    Game_Battler.prototype.initMembers = function() {
        TE_GB_initMembers.call(this);
        this._ITBEvents = [];
    };
    
    //--------------------------------------------------------------------------
    // Schedule the effect
    //--------------------------------------------------------------------------

    const TE_GB_setupCTBCharge = Game_Battler.prototype.setupCTBCharge;
    Game_Battler.prototype.setupCTBCharge = function() {
        const initiative = this._initiative;
        TE_GB_setupCTBCharge.call(this);
        const action = this.currentAction();
        if (!action) return;
        const item = action.item();
        if (!item || !item.selfState) return;
        var skillId = item.id;
        this._ITBEvents = this._ITBEvents.filter(function(event) {
            return event.skillId === skillId;
        });
        if (!item.selfState.offset || item.selfState.offset <= 0) {
            if (DEBUG_EVENTS) console.log("Add state:", item.selfState.stateId);
            this.addState(item.selfState.stateId);
            if (DEBUG_EVENTS) {
                console.log("Battler:", this.name());
                console.log("States:", this._states);
            }
        } else {
            if (DEBUG_EVENTS) console.log("New event scheduled:", item.selfState.stateId);
            this._ITBEvents.push({
                type: "selfState",
                battler: this,
                skillId: item.id,
                stateId: item.selfState.stateId,
                triggerInitiative: initiative + item.selfState.offset
            });
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
    // Call effects scheduler
    //--------------------------------------------------------------------------

    BattleManager.findScheduledSelfState = function() {
        if (DEBUG_EVENTS) console.log("Find Scheduled State");
        var current = this.currentInitiative();
        var next = null;
        this.sortBattleMembers().forEach(function(battler) {
            if (!battler || !battler._ITBEvents) return;
            battler._ITBEvents.forEach(function(event) {
                if (event.triggerInitiative > current) return;
                if (!next || event.triggerInitiative < next.triggerInitiative) {
                    next = event;
                }
            });
        });
        return next;
    };

    BattleManager.updateITBEvents = function() {
        var current = this.currentInitiative();
        this.sortBattleMembers().forEach(function(battler) {
            if (!battler || !battler._ITBEvents) return;
            for (var i = battler._ITBEvents.length - 1; i >= 0; i--) {
                var event = battler._ITBEvents[i];
                if (event.triggerInitiative > current) continue;
                battler.addState(event.stateId);
                battler._ITBEvents.splice(i, 1);
            }
        });
    };

    /* BattleManager.updateITBEvents = function() {
        this.allBattleMembers().forEach(function(battler) {
            if (battler) battler.updateITBEvents();
        });
    };
    
    TE_BM_getChargedCTBBattler = BattleManager.getChargedCTBBattler;
    BattleManager.getChargedCTBBattler = function() {
        this.updateITBEvents();
        return TE_BM_getChargedCTBBattler.call(this);
    }; */

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

    Game_Battler.prototype.removeScheduledState = function(stateId) {
        this._ITBEvents = this._ITBEvents.filter(function(event) {
                return event.stateId !== stateId;
        });
    };

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

    //--------------------------------------------------------------------------
    // Update timeline event
    //--------------------------------------------------------------------------

    BattleManager.updateTimelineEvent = function() {
        this._timelineEventFrames--;
        this._timelineEventBlink++;
        if (this._timelineEventFrames > 0) return;
        this._timelineEventActive = false;
        this._timelineAnchorInitiative = undefined;
        this.updateITBEvents();
        this.requestTimelineRefresh("Apply selfstate");
    };

    //--------------------------------------------------------------------------
    // Visual Pause
    //--------------------------------------------------------------------------

    BattleManager.startTimelineEvent = function(slot) {
        if (DEBUG_EVENTS) console.log("Start Timeline Event");
        if (!slot) return;
        console.log("Slot", slot);
        this._timelineEventActive = true;
        this._scheduledState = slot;
        this._timelineEventBlink = 0;
        this._timelineEventFrames = 120;
    };

    BattleManager.isTimelineEventBusy = function() {
        return this._timelineEventActive;
    }

    const TE_BM_isBusy = BattleManager.isBusy;
    BattleManager.isBusy = function() {
        if (this.isTimelineEventBusy()) return true;
        return TE_BM_isBusy.call(this);
    }

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

    //=============================================================================
    // Window_CTBTimeLine
    //=============================================================================

    TE_BM_update = BattleManager.update;
    BattleManager.update = function() {
        if (this._timelineEventActive) {
            this.updateTimelineEvent();
            return
        }
        TE_BM_update.call(this);
    };

    TE_BM_requestTimelineRefresh = BattleManager.requestTimelineRefresh;
    BattleManager.requestTimelineRefresh = function(reason) {
        if (reason === "Setup Charge") {
            var event = this.findScheduledSelfState();
            if (event) {
                this._timelineAnchorInitiative = event.triggerInitiative;
                console.log("Initiative", this._timelineAnchorInitiative);
            }
            TE_BM_requestTimelineRefresh.call(this, reason);
            this.startTimelineEvent(event);
        } else {
            TE_BM_requestTimelineRefresh.call(this, reason);
        }
    };

    var TE_BM_addTimelineExtensionEntries = BattleManager.addTimelineExtensionEntries;
    BattleManager.addTimelineExtensionEntries = function(entries, battler) {
        if (DEBUG_EVENTS) {
            console.log(
                "TIMELINE EXTENSION",
                battler.name(),
                battler.itbActionPreview()
            );
        }
        TE_BM_addTimelineExtensionEntries.call(this, entries, battler);
        // Preview selfstate
        var action = battler.itbActionPreview();
        if (DEBUG_EVENTS) console.log("Action:", action);
        if (action && action.item() && action.item().selfState) {
            if (DEBUG_EVENTS) {
                console.log(
                    "STATE CHECK",
                    battler.name(),
                    action.item() ? action.item().name : null,
                    action.item() ? action.item().selfState : null
                );
            }
            var selfState = battler.previewSelfState();
            if (!selfState) return;
            if (DEBUG_EVENTS) {
                console.log(
                    "ADDING STATE PREVIEW",
                    battler.name(),
                    action.item().selfState.stateId
                );
            }
            entries.push({
                type: "statePreview",
                battler: battler,
                stateId: selfState.stateId,
                initiative: selfState.initiative,
                activationOrder: battler.previewActivationOrder(),
                preview: true
            });
        }
        // Scheduled selfstates
        if (DEBUG_EVENTS) {
            console.log(
                "ITB Events",
                battler.name(),
                battler._ITBEvents
            );
        }
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
            if (DEBUG_EVENTS) {
                console.log(
                    "SCHEDULED STATE",
                    battler.name(),
                    event.stateId,
                    event.triggerInitiative
                );
            }
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

    Window_CTBTimeline.prototype.firstTimelineEventSlot = function() {
        for (var i = 0; i < this._timelineSlots.length; i++) {
            var slot = this._timelineSlots[i];
            if (slot.type === "selfState") return slot;
        }
        return null;
    };

    //=============================================================================
    // Window_CTBActionIcon
    //=============================================================================

    var TE_CTBAI_init = Window_CTBActionIcon.prototype.initialize;
    Window_CTBActionIcon.prototype.initialize = function(mainSprite) {
        TE_CTBAI_init.call(this, mainSprite);
        if (!this._isStatePreviewWindow) this.createStatePreviewWindow();
    };

    Window_CTBActionIcon.prototype.createStatePreviewWindow = function() {
        this._statePreviewWindow = new Window_CTBActionIconStatePreview(this);
        this.addChild(this._statePreviewWindow);
    };

    Window_CTBActionIcon.prototype.previewSelfState = function() {
        if (!this._battler) return null;
        return this._battler.previewSelfState();
    };

    var TE_CTBAI_updateBlink = Window_CTBActionIcon.prototype.updateBlink;
    Window_CTBActionIcon.prototype.updateBlink = function() {
        if (BattleManager._timelineEventActive) {
            var visible = Math.floor(BattleManager._timelineEventBlink / 12) % 4 < 2;
            this._blinkOpacity = visible ? 255 : 0
            //opacity = Graphics.frameCount % 48 < 32 ? 255 : 0;
            return;
        }
        TE_CTBAI_updateBlink.call(this);
    };

    //=============================================================================
    // Window_CTBActionIconStatePreview
    //=============================================================================

    function Window_CTBActionIconStatePreview(parent) {
        this.initialize.apply(this, arguments);
    };

    Window_CTBActionIconStatePreview.prototype = Object.create(Window_CTBActionIcon.prototype);
    Window_CTBActionIconStatePreview.prototype.constructor = Window_CTBActionIconStatePreview;

    Window_CTBActionIconStatePreview.prototype.initialize = function(parent) {
        this._parent = parent;
        this._isStatePreviewWindow = true;
        Window_CTBActionIcon.prototype.initialize.call(this, parent._mainSprite);
        this.opacity = 0;
        this.contentsOpacity = 255;
    };

    Window_CTBActionIconStatePreview.prototype.updatePosition = function() {
        var battler = this._parent._battler;
        if (!battler) return;
        var timelineState = battler.currentTimelineState();
        if (!timelineState) {
            this.visible = false;
            return;
        }
        var timeline = BattleManager.timelineWindow();
        if (!timeline) return;
        var stateSlot = this.findStatePreviewSlot(battler);
        if (timelineState.type === "statePreview") {
            var actionSlot = timeline.slotForPreview(battler);
        } else {
            var actionSlot = timeline.slotForBattler(battler);
        }
        if (stateSlot === undefined || actionSlot === undefined) return;
        var stateX = timeline.slotCenterX(stateSlot);
        var actionX = timeline.x + timeline.slotCenterX(actionSlot);
        this.x = stateX - actionX;
        this.y = 0; // same baseline as action icon window
        this.visible = true;
    };

    Window_CTBActionIconStatePreview.prototype.update = function() {
        Window_CTBActionIcon.prototype.update.call(this);
        this.updatePosition();
        this.refresh();
        this.updateBlink();
    };

    Window_CTBActionIconStatePreview.prototype.refresh = function() {
        this.contents.clear();
        var battler = this._parent._battler;
        if (!battler) return;
        var timelineState = battler.currentTimelineState();
        if (!timelineState) return;
        if (timelineState.type === "statePreview") {
            var queue = battler._actionQueue;
            if (!queue || queue.length <= 1) {
                var blinking = this._battler.isITBPreviewBlinking();
                if (blinking) this.contents.paintOpacity = this._blinkOpacity;
            }
            this.drawPreviewArrow("#66CCFF");
        } else if (BattleManager._timelineEventActive) {
            this.contents.paintOpacity = this._blinkOpacity;
        }
        var state = $dataStates[timelineState.stateId];
        if (!state) return;
        var iconIndex = state.iconIndex;
        if (!iconIndex) return;
        this.drawActionBorderAt(-1, 17, "#66CCFF");
        this.drawActionIcon(iconIndex, 2, 20);
        this.drawTargetBackground();
        this.drawTargetMiniIcon();
        if (timelineState.type === "statePreview") {
            if (queue && queue.length > 1) return;
            this.contents.paintOpacity = 255;
        } else if ( BattleManager._timelineEventActive) this.contents.paintOpacity = 255;
    };

    Window_CTBActionIconStatePreview.prototype.targetBattler = function() {
        var battler = this._parent._battler;
        if (!battler) return null;
        var timelineState = battler.currentTimelineState();
        if (!timelineState) return Window_CTBActionIcon.prototype.targetBattler();
        return timelineState.battler;
    };

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
            var selfState = battler.scheduledSelfState(type);
        }
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
        var action = this.itbActionPreview();
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

    Game_Battler.prototype.scheduledSelfState = function(type) {
        if (!this._ITBEvents || this._ITBEvents.length <= 0) return null;
        var event = this._ITBEvents.find(function(event) {return event.type === "selfState"});
            if (!event) return null;
            return {
                stateId: event.stateId,
                initiative: event.triggrInitiative,
                battler: this,
                event: event
            };
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
            battler: this,
            type: "selfState",
            event: event
        };
    };
    
})();