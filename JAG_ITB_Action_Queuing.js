//=============================================================================
// JAG_ITB_Action_Queuing.js
//=============================================================================
/*:
 * @plugindesc Action queuing system that builds on ITB system plugin and
 * enables queuing scheduled actions to be executed at their respective 
 * initiative.
 * 2026-06-01 This version is now compatible with timeline events plugin.
 *  Known limitation: Action Queuing standalone does not queue skills with 
 *  Scope=None (targetless skills).
 *  This is intentionally left unresolved to avoid conflicts with Action 
 *  Connectors and potentially Yanfly BEC.
 *  Current project architecture relies on Action Connectors, where 
 *  targetless skills are not allowed.
* @author JG
 */

(function() {

    const TRACE_QUEUING = true;
    const DEBUG_QUEUING = false;

    var AQ_BM_endAction = BattleManager.endAction;
    BattleManager.endAction = function() {
        if (TRACE_QUEUING || DEBUG_QUEUING) console.log("END ACTION QUEUING");
        AQ_BM_endAction.call(this);
        var subject = this._subject;
        if (DEBUG_QUEUING) console.log("END ACTION COMPLETE");
        if (subject && subject.isActor()) {
            if (subject._actionQueue && subject._actionQueue.length > 0) {  
                if (TRACE_QUEUING || DEBUG_QUEUING) console.log("SHIFT QUEUE");
                subject._actionQueue.shift();
            }
        }
        subject._actions = [];
    };

    // Queue Initialization
    var Queue_GameBattler_initMembers = Game_Battler.prototype.initMembers;
    Game_Battler.prototype.initMembers = function() {
        Queue_GameBattler_initMembers.call(this);
        this._actionQueue = [];
    }

    // Promote next queued action
    Game_Battler.prototype.promoteQueuedAction = function() {
        if (!this._actionQueue || this._actionQueue.length <= 0) {
            if (DEBUG_QUEUING) console.log("Reset action queue");
            this._actions = [];
            return false;
        }
        var action = this.createActionFromQueueData(this._actionQueue[0]);
        this._actions = [action];
        if (DEBUG_QUEUING) {
            console.log("Current action:", action)
            console.log("Actions queue:", this._actions);
            console.log("Queue length:", this._actionQueue.length)
        }
        return true;
    };

    Game_Battler.prototype.createActionFromQueueData = function(data) {
        if (TRACE_QUEUING || DEBUG_QUEUING) console.log("Create action from queue data");
        var action = new Game_Action(this);
        if (data.isAttack) {
            action.setAttack();
        } else if (data.isGuard) {
            action.setGuard();
        } else {
            action.setSkill(data.skillId);
        }
        action.setTarget(data.targetIndex);
        return action;
    };

    // Queue Helper Functions
    Game_Battler.prototype.enqueueAction = function(actionData) {
        if (this._actionQueue.length >= this.maxQueuedActions()) return false;
        this._actionQueue.push(actionData);
        this._canUndoQueuedAction = true;
        return true;
    };

    Game_Battler.prototype.nextQueuedAction = function() {
        if (!this._actionQueue || this._actionQueue.length === 0) return null;
        return this.createActionFromQueueData(this._actionQueue[0]);
    };

    Game_Battler.prototype.undoLastQueuedAction = function() {
        if (!this._actionQueue || this._actionQueue.length === 0) {
            return false;
        }
        var removed = this._actionQueue.pop();
        this._canUndoQueuedAction = false;
        return removed;
    };

    Game_Battler.prototype.maxQueuedActions = function() {
        return 2;
    };

    // Clear Action Queue
    Game_Battler.prototype.clearActionQueue = function() {
        if (TRACE_QUEUING || DEBUG_QUEUING) Console.log("Clear action queue")
        this._actionQueue = [];
    };

    // Debug Helper
    Game_Battler.prototype.printQueue = function(name) {
        console.log(this.name(), this._actionQueue);
    };

    Game_Battler.prototype.queueLength = function() {
        return this._actionQueue.length;
    };

    // Queue Entry Creator
    Game_Action.prototype.createQueueData = function() {
        var item = this.item();
        if (!item) {
            if (DEBUG_QUEUING) console.log("Queue creation failed: no item assigned.");
            return null;
        }
        return {
            skillId: this.item().id,
            targetIndex: this._targetIndex,
            targetType: this.isForOpponent() ? "enemy" : "ally",
            initiative: this.item().initiative || 0,
            isAttack: this.isAttack(),
            isGuard: this.isGuard()
        };
    };

    var AQ_SB_onEnemyOk = Scene_Battle.prototype.onEnemyOk;
    Scene_Battle.prototype.onEnemyOk = function() {
        if (!(BattleManager.actor() instanceof Game_Actor)) {
            return AQ_SB_onEnemyOk.call(this);
        }
        var action = BattleManager.inputtingAction();
        var target = this._enemyWindow.enemy();
        if (TRACE_QUEUING || DEBUG_QUEUING) console.log("=== QUEUE ENEMY ACTION ===");
        if (DEBUG_QUEUING) {
            console.log("actor:", BattleManager.actor().name());
            console.log("action:", action.item() ? action.item().name : null);
            console.log("target:", target.name());
        }
        action.setTarget(this._enemyWindow.enemyIndex());
        // Build queue entry
        this._queueAction(action, target, "enemy");
        this._enemyWindow.hide();
        this.afterActionQueued();
    };

    var AQ_SB_onActorOk = Scene_Battle.prototype.onActorOk;
    Scene_Battle.prototype.onActorOk = function() {
        var action = BattleManager.inputtingAction();
        var target = this._actorWindow.actor();
        action.setTarget(this._actorWindow.enemyIndex());
        this._queueAction(action, target, "ally");
        this._actorWindow.hide();
        this.afterActionQueued();
    };

    Scene_Battle.prototype.afterActionQueued = function() {
        this._actorCommandWindow.activate();
    };

    Scene_Battle.prototype.createActorCommandWindow = function() {
        this._actorCommandWindow = new Window_ActorCommand();
        this._actorCommandWindow.setHandler("finishQueue", this.finishActionQueue.bind(this));
        this._actorCommandWindow.setHandler('attack', this.commandAttack.bind(this));
        this._actorCommandWindow.setHandler('skill',  this.commandSkill.bind(this));
        this._actorCommandWindow.setHandler('guard',  this.commandGuard.bind(this));
        this._actorCommandWindow.setHandler('item',   this.commandItem.bind(this));
        this._actorCommandWindow.setHandler('cancel', this.selectPreviousCommand.bind(this));
        this.addWindow(this._actorCommandWindow);
    };

    var AQ_WAC_makeCommandList = Window_ActorCommand.prototype.makeCommandList;
    Window_ActorCommand.prototype.makeCommandList = function() {
        if (TRACE_QUEUING || DEBUG_QUEUING) {
            console.log("MAKE COMMAND LIST");
            if (DEBUG_QUEUING) console.log("actor:", this._actor);
        }
        AQ_WAC_makeCommandList.call(this);
        if (!this._actor) return;
        this.addCommand("Finish Queue", "finishQueue");
    };

    Scene_Battle.prototype._queueAction = function(action, target, type) {
        var data = action.createQueueData();
        if (!data) {
            console.warn("Queue rejected: invalid action", action);
            return;
        }
        data.targetIndex = (type === "enemy")
            ? target.index()
            : $gameParty.members().indexOf(target);
        BattleManager.actor().enqueueAction(data);
    };

    Scene_Battle.prototype.finishActionQueue = function() {
        if (TRACE_QUEUING || DEBUG_QUEUING) console.log("FINISH QUEUE");
        var actor = BattleManager.actor();
        if (!actor) return;
        actor.promoteQueuedAction();
        actor._canUndoQueuedAction = false;
        BattleManager.selectNextCommand();
    };

    Scene_Battle.prototype.commandGuard = function() {
        if (TRACE_QUEUING || DEBUG_QUEUING) console.log("=== QUEUE GUARD ===");
        if (DEBUG_QUEUING) {
            console.log("actor:", BattleManager.actor().name());
            console.log(
                "inputting action:",
                BattleManager.inputtingAction()
            );
        }
        BattleManager.inputtingAction().setGuard();
        var actor = BattleManager.actor();
        if (!actor) return;
        var skillId = actor.guardSkillId();
        var data = {
            skillId: skillId,
            targetIndex: actor.index(),
            targetType: "self",
            initiative: $dataSkills[skillId].initiative || 0,
            isAttack: false,
            isGuard: true
        };
        actor.enqueueAction(data);
        if (DEBUG_QUEUING) console.log("GUARD QUEUED");
        this.afterActionQueued();
    };

    AQ_SB_startActorCommandSelection = Scene_Battle.prototype.startActorCommandSelection;
    Scene_Battle.prototype.startActorCommandSelection = function() {
        if (TRACE_QUEUING || DEBUG_QUEUING) console.log("START ACTOR COMMAND SELECTION");
        AQ_SB_startActorCommandSelection.call(this);
        var actor = BattleManager.actor();
        if (actor) {
            var previewAction = actor.nextQueuedAction();
            actor.setCTBActionPreview(previewAction, false);
        }
    };

    var AQ_BM_selectPrevious = BattleManager.selectPreviousCommand;
    BattleManager.selectPreviousCommand = function() {
        var actor = this.actor();
        if (actor && actor._canUndoQueuedAction) {
            var removed = actor.undoLastQueuedAction();
            if (removed) {
                if (actor.queueLength() > 0) {
                    var action = actor.ctbActionPreview();
                    if (!action) action = actor.currentAction();
                    if (action) actor.setCTBActionPreview(action, false);
                } else {
                    actor.clearCTBActionPreview();
                }
                this.requestTimelineRefresh("Previous Command");
                actor._canUndoQueuedAction = false;
                SoundManager.playCancel();
                //SceneManager._scene._skillWindow.refresh();
                //SceneManager._scene._itemWindow.refresh();
                return;
            }
        }
        AQ_BM_selectPrevious.call(this);
    };

    //=============================================================================
    // Window_CTBTimeLine
    //=============================================================================

    BattleManager.maxDisplayedActions = function() {
        return 2;
    };

    var AQ_WCTBAI_initialize = Window_CTBActionIcon.prototype.initialize;
    Window_CTBActionIcon.prototype.initialize = function(mainSprite, actionIndex) {
        AQ_WCTBAI_initialize.call(this, mainSprite);
        this._blinkOpacity = 255;
        this._blinkCount = 0;
        this._actionIndex = actionIndex || 0;
        this._lastTargetIndex = -1;
    };

    Window_CTBActionIcon.prototype.iconSpacing = function() {
        return 4;
    };

    Window_CTBActionIcon.prototype.actionY = function(index) {
        return index * (this.iconHeight() + this.iconSpacing());
    };

    Window_CTBActionIcon.prototype.drawQueuedActionIcons = function() {
        if (!this._battler) return;
        //if (!this._battler._actionQueue) return;
        var queue = this._battler._actionQueue;
        if (!queue || queue.length <= 1) return;
        var maxIcons = BattleManager.maxDisplayedActions();
        var visibleIcons = Math.min(queue.length, maxIcons);
        // Skip first queued action.
        for (var i = 1; i < visibleIcons; i++) {
            var data = queue[i];
            if (!data) continue;
            var iconIndex = 0;
            if (data.isAttack) {
                iconIndex = $dataSkills[this._battler.attackSkillId()].iconIndex;
            } else if (data.isGuard) {
                iconIndex = $dataSkills[this._battler.guardSkillId()].iconIndex;
            } else if ($dataSkills[data.skillId]) {
                iconIndex = $dataSkills[data.skillId].iconIndex;
            }
            if (!iconIndex) continue;
            var y = this.actionY(i) + this.iconHeight();
            var blinking = this._battler.isCTBPreviewBlinking() && (i === visibleIcons - 1);
            if (blinking) {
                this.contents.paintOpacity = this._blinkOpacity;
            }
            this.drawActionBorderAt(1, y - 3, "#CECECE");
            this.drawActionIcon(iconIndex, 4, y);
            this.contents.paintOpacity = 255;
        }
    };

    var AQ_WCTBAI_update = Window_CTBActionIcon.prototype.update;
    Window_CTBActionIcon.prototype.update = function() {
        AQ_WCTBAI_update.call(this);
        this.updateBlink();
    };

    var AQ_WCTBAI_updateRedraw = Window_CTBActionIcon.prototype.updateRedraw;
    Window_CTBActionIcon.prototype.updateRedraw = function() {
        //console.log("Redraw frame", Graphics.frameCount);
        AQ_WCTBAI_updateRedraw.call(this);
        if (
            this._battler &&
            this._battler.isCTBPreviewBlinking() &&
            this._battler.queueLength &&
            this._battler.queueLength() <= 1
        ) {
            this.contents.paintOpacity = this._blinkOpacity;
            this.contents.clear();
            this.drawActionBorder();
            this.drawActionIcon(this._iconIndex, 2, 20);
            if (this._previewState) this.drawPreviewArrow("#F7E839");
            this.drawTargetBackground();
            this.drawTargetMiniIcon();
            this.contents.paintOpacity = 255;
        }
        //if (!this._battler) return;
        //if (this._iconIndex <= 0) return;
        this.drawQueuedActionIcons();
        //if (this._battler && this._battler.isCTBPreviewBlinking()) this._redraw = true;
    };

    /* Window_CTBActionIcon.prototype.hasTargetIcon = function() {
        if (!this._battler) return false;
        var action = this._battler._actions ? this._battler._actions[0] : null;
        return !!action && action._targetIndex >= 0;
    }; */

    var AQ_WCTBAI_drawTargetBackground = Window_CTBActionIcon.prototype.drawTargetBackground;
    Window_CTBActionIcon.prototype.drawTargetBackground = function() {
        if (this._actionIndex !== 0) return;
        AQ_WCTBAI_drawTargetBackground.call(this);
    };

    var AQ_WCTBAI_drawTargetMiniIcon = Window_CTBActionIcon.prototype.drawTargetMiniIcon;
    Window_CTBActionIcon.prototype.drawTargetMiniIcon = function() {
        if (this._actionIndex !== 0) return;
        AQ_WCTBAI_drawTargetMiniIcon.call(this);
    };

    var AQ_WCTBAI_updatePosition = Window_CTBActionIcon.prototype.updatePosition;
    Window_CTBActionIcon.prototype.updatePosition = function() {
        AQ_WCTBAI_updatePosition.call(this);
        var main = this._mainSprite._ctbIcon;
        this.y = main.y + this.actionY(this._actionIndex + 1) + 12;
    };

    Window_CTBActionIcon.prototype.updateTargetIcon = function() {
        if (!this._battler) return;
        var actions = this._battler._actions;
        var action = actions ? actions[this._actionIndex] : null;
        var targetIndex = -1;
        if (action) targetIndex = action._targetIndex;
        if (this._lastTargetIndex !== targetIndex) {
            this._lastTargetIndex = targetIndex;
            this._redraw = true;
        }
    };

    var AQ_WCTBAI_windowHeight = Window_CTBActionIcon.prototype.windowHeight;
    Window_CTBActionIcon.prototype.windowHeight = function() {
        var visible = BattleManager.maxDisplayedActions();
        return this.actionY(visible) + 28 + this.standardPadding() * 2;
    };

    Window_CTBActionIcon.prototype.updateBlink = function() {
        //console.log(this._blinkOpacity);
        //console.log("Update blink frame", Graphics.frameCount);
        if (!this._battler) return;
        var opacity = 255;
        if (this._battler.isCTBPreviewBlinking()) {
            opacity = Graphics.frameCount % 48 < 32 ? 255 : 0;
        }
        if (opacity !== this._blinkOpacity) {
            this._blinkOpacity = opacity;
            this._redraw = true;
        }
    };

    Game_Battler.prototype.setCTBActionPreview = function(action, blink) {
        var queuedAction = this.nextQueuedAction();
        if (queuedAction) {
            this._ctbActionPreview = queuedAction;
        } else {
            this._ctbActionPreview = action;
        }
        if (blink === undefined) {
            blink = true;
        }
        this._ctbPreviewBlink = blink;
    };

    Game_Battler.prototype.clearCTBActionPreview = function() {
        this._ctbActionPreview = null;
        this._ctbPreviewBlink = false;
    };

    Game_Battler.prototype.isCTBPreviewBlinking = function() {
        return !!this._ctbPreviewBlink;
    };

})();