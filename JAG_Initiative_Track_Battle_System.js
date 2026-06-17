//=============================================================================
// JAG_Initiative_Track_Battle_System.js
//=============================================================================
/*:
 * @plugindesc Deterministic initiative battle system for YEP CTB.
 * @author JAG
 */

function Window_CTBActionIcon() {
    this.initialize.apply(this, arguments);
}

Window_CTBActionIcon.prototype = Object.create(Window_Base.prototype);
Window_CTBActionIcon.prototype.constructor = Window_CTBActionIcon;
window.Window_CTBActionIcon = Window_CTBActionIcon;

function Window_CTBTimeline() {
    this.initialize.apply(this, arguments);
}

Window_CTBTimeline.prototype = Object.create(Window_Base.prototype);
Window_CTBTimeline.prototype.constructor = Window_CTBTimeline;
window.Window_CTBTimeline = Window_CTBTimeline;

(function() {

    const TRACE_ITB = true;
    const DEBUG_ITB = false;
    const DEBUG_Timeline = true;

    var _DataManager_isDatabaseLoaded = DataManager.isDatabaseLoaded;
    DataManager.isDatabaseLoaded = function() {
	if (!_DataManager_isDatabaseLoaded.call(this)) return false;
	if (!this._initiativeNotetagsLoaded) {
	    this.processInitiativeNotetag($dataSkills);
	    this.processInitiativeNotetag($dataItems);
	    this._initiativeNotetagsLoaded = true;
	}

	return true;
    };

    DataManager.processInitiativeNotetag = function(group) {
        var regex = /<(?:Initiative):[ ](\d+)>/i;
        for (var i = 1; i < group.length; i++) {
            var obj = group[i];
            if (!obj) continue;
            obj.initiative = 30;
            var match = regex.exec(obj.note);
            if (match) {
            obj.initiative = Number(match[1]);
            }
        }
    };

    Game_Action.prototype.initiative = function() {
	    if (DEBUG_ITB) console.log("Initiative:", this.item().initiative);
        return this.item().initiative || 0;
    };
    
    Game_Battler.prototype.setupCTBCharge = function() {
        if (TRACE_ITB || DEBUG_ITB) console.log("=== SETUP CTB CHARGE === I", this._initiative);
	    var action = this.currentAction();
        if (DEBUG_ITB) {
            console.log("Subject:", this.name());
            console.log("Current Action:", action);
            console.log("isCharging:", this.isCTBCharging());
            console.log("Initiative before:", this._initiative);
            console.log("Queue:", this._actionQueue);
        }
	    if (this.isCTBCharging()) return;
        if (BattleManager._subject !== this) return;
        if (BattleManager._bypassCtbEndTurn) return;
        if (action) {
            var item = action.item();
            if (item) {
                if (TRACE_ITB || DEBUG_ITB) {
                    console.log("APPLYING CTB CHARGE I", this._initiative);
                    if (DEBUG_ITB) console.log("Action item:", item.name);  
                }
                this.setCTBCharging(true);
                // initiative cost becomes charge duration
                this._ctbChargeMod = -item.initiative;
                this.setCTBCharge(0);
                this._initiative += item.initiative;
                this.updateActivationOrder();
                this.clearCTBActionPreview();
                BattleManager.requestTimelineRefresh("Setup Charge");
                if (DEBUG_ITB) console.log("New initiative:", this._initiative);
            } else {
                this._ctbChargeMod = 0;
            }
        } else {
            this._ctbChargeMod = 0;
        }
        this.setActionState('waiting');
    };

    BattleManager.getChargedCTBBattler = function() {
        if ($gameParty.aliveMembers() <= 0 || $gameTroop.aliveMembers() <= 0) return false;
        var members = this.allBattleMembers();
        var first = false;
        for (var i = 0; i < members.length; i++) {
            var battler = members[i];
            if (!battler) continue;
            //if (!battler.isAlive()) continue;
            //if (!battler.canMove()) continue;
            if (!this.isBattlerCTBCharged(battler)) continue;
            //var action = battler.currentAction();
            //var item = action ? action.item() : null;
            //if (!action || !item) continue;
            if (!first) {
                first = battler;
            } else if (
                battler.ctbTicksToReady() < first.ctbTicksToReady()
            ) {
                first = battler;
            } else if (
                battler.ctbTicksToReady() === first.ctbTicksToReady() &&
                battler._activationOrder < first._activationOrder
            ) {
                first = battler;
            }
        }
        return first;
    };

    BattleManager.getReadyCTBBattler = function() {
        var fastest = false;
        for (var i = 0; i < this.allBattleMembers().length; ++i) {
            var battler = this.allBattleMembers()[i];
            if (!battler) continue;
            if (!this.isBattlerCTBReady(battler)) continue;
            if (!fastest) {
                fastest = battler;
            } else if (
                battler.ctbTicksToReady() < fastest.ctbTicksToReady()
            ) {
                fastest = battler;
            } else if (
                battler.ctbTicksToReady() === fastest.ctbTicksToReady() &&
                battler._activationOrder < fastest._activationOrder
            ) {
                fastest = battler;
            }
        }
        return fastest;
    };

    BattleManager.ctbTurnOrder = function() {
        var battlers = $gameParty.aliveMembers().concat($gameTroop.aliveMembers());
        battlers.sort(function(a, b) {
            if (a.ctbTicksToReady() > b.ctbTicksToReady()) return 1;
            if (a.ctbTicksToReady() < b.ctbTicksToReady()) return -1;
            if (a.ctbTicksToReady() === b.ctbTicksToReady()) {
                if (a._activationOrder > b._activationOrder) return 1;
                if (a._activationOrder < b._activationOrder) return -1;
            };     
            return 0;
        });
        return battlers;
    };

    BattleManager.isBattlerCTBReady = function(battler) {
        if (battler.isDead() || battler.isConfused()) return false;
        if (DEBUG_ITB) {
            console.log("Battler:",battler);
            console.log("isCTBCharging:",battler.isCTBCharging());
        }
        if (battler.isCTBCharging()) return false;
        if (battler.ctbTurnOrder() > 0) return false;
        if (battler.currentAction() && battler.currentAction().item()) {
            this._subject = battler;
            battler.makeActions();
            battler.setupCTBCharge();
            return true;
        }
        return true;
    };

    var _BattleManager_startCTBInput = BattleManager.startCTBInput;
    BattleManager.startCTBInput = function(battler) {
        if (TRACE_ITB || DEBUG_ITB) console.log("=== START CTB INPUT === I", battler._initiative);
        if (DEBUG_ITB) {
            console.log("Battler:", battler.name());
            console.log("Alive:", battler.isAlive());
            console.log("Last Target:", battler._lastTargetIndex);
            console.log("Preview Target:", battler._connectorPreviewTarget);
            console.log("Battler is enemy:", battler.isEnemy());
            console.log("Battler can input:", battler.canInput());
        }
        _BattleManager_startCTBInput.call(this, battler);
        BattleManager.requestTimelineRefresh("Start Input");
    };

    Yanfly.CTB.BattleManager_selectNextCommand = BattleManager.selectNextCommand;
    BattleManager.selectNextCommand = function() {
        if (TRACE_ITB || DEBUG_ITB) console.log("SELECT NEXT COMMAND: Initiative CTB System");
        if (DEBUG_ITB) {
            console.log("Actor:", this.actor().name());
            console.log("Action:", this.actor().currentAction());
        }
        if (this.isCTB()) {
        if (!this.actor()) return this.setCTBPhase();
        this.resetNonPartyActorCTB();
        this._subject = this.actor();
        if (TRACE_ITB || DEBUG_ITB) console.log("CALLING setupCTBCharge");
        this.actor().setupCTBCharge();
        //console.log("Queued:", this.actor()._queued);
        //console.log("Initiative:", this.actor()._initiative);
        if (this.actor().isCTBCharging()) {
            if (TRACE_ITB || DEBUG_ITB) console.log("ADVANCING CTB PHASE I", this.actor()._initiative);
            if (DEBUG_ITB) {
                console.log("actor:", this.actor().name());
            }
            this.actor().spriteStepBack();
            this.actor().requestMotionRefresh();
            this._actorIndex = undefined;
            this.setCTBPhase();  
        } else if (this.isValidCTBActorAction()) {
            this.startCTBAction(this.actor());
        } else {
            if (this.actor()) this.ctbSkipTurn();
            $gameParty.requestMotionRefresh();
            this.setCTBPhase();
          }
        } else {
          Yanfly.CTB.BattleManager_selectNextCommand.call(this);
        }
    };

    var _Game_Action_executeHpDamage = Game_Action.prototype.executeHpDamage;
    Game_Action.prototype.executeHpDamage = function(target, value) {
        _Game_Action_executeHpDamage.call(this, target, value);
        if (TRACE_ITB || DEBUG_ITB) {
            console.log(" ");
            console.log("=== EXECUTE HP DAMAGE ===");
        }
        if (DEBUG_ITB) {
            console.log("Target:", target.name());
            console.log("Damage:", value);
        }
        if (value <= 0) {
            if (DEBUG_ITB) console.log("NO DAMAGE");
            return;
        }
        if (!target.isEnemy()) {
            if (DEBUG_ITB) console.log("TARGET NOT ENEMY");
            return;
        }
        var enemy = target.enemy();
        var match = enemy.note.match(/<Alerted State:\s*(\d+)>/i);
        if (match) {
            var stateId = Number(match[1]);
            if (DEBUG_ITB) console.log("ADDING ALERT STATE:", stateId);
            if (target.isStateAffected(stateId)) {
                var action = target.currentAction();
                if (action && action.item()) {
                    var counterInitiative = action.item().initiative || 0;
                    target._initiative = this._subject()._initiative + counterInitiative;
                    target.updateActivationOrder();
                    if (DEBUG_ITB) console.log(target.name(),"counter rescheduled to", target._initiative);
                }
            } else {
                target.addState(stateId);
                if (DEBUG_ITB) {
                    console.log(
                        "States after add:",
                        target.states().map(function(s) {
                            return s.name;
                        })
                    );
                }
            }
        }
    }

    Game_Battler.prototype.ctbTicksToReady = function() {
	    return this._initiative || 0;
    };

    Game_Battler.prototype.ctbWaitInitiative = function() {
        var own = this.initiative || 0;
        var battlers = BattleManager.allBattleMembers().filter(function(b) {
            return b && b.isAlive() && b !== this;
        }, this);
        var higher = battlers
            .map(function(b) {
                return b.initiative || 0;
            })
            .filter(function(i) {
                return i > own;
            });
        if (higher.length <= 0) return 1;
        var next = Math.min.apply(null, higher);
        return Math.max(1, next - own);
    };

    Game_Battler.prototype.updateActivationOrder = function() {
        this._activationOrder = ++BattleManager._activationCounter;
        if (DEBUG_ITB) {
            console.log("Battler:", this.name());
            console.log("Action order:", this._activationOrder);
        }
    };

    BattleManager.initializeActivationOrder = function() {
        this._activationCounter = 0;
        this.allBattleMembers().forEach(function(battler) {
            battler._activationOrder = ++this._activationCounter;
        }, this);
    };

    var _BM_startBattle = BattleManager.startBattle;
    BattleManager.startBattle = function() {
        _BM_startBattle.call(this);
        this.initializeActivationOrder();
    };

    var _BM_onCTBStart = Game_Battler.prototype.onCTBStart;
        Game_Battler.prototype.onCTBStart = function() {
        _BM_onCTBStart.call(this)
        if (TRACE_ITB || DEBUG_ITB) {
            console.log(" ");
            console.log("==== ON CTB START ====");
        }
        this._initiative = 0;
        BattleManager._timelineVersion = 0;
    };  

    var _BM_endAction = BattleManager.endAction;
    BattleManager.endAction = function() {
	    var subject = this._subject;
        if (TRACE_ITB || DEBUG_ITB) {
            console.log(" ");
            console.log("==== END ACTION ====");
            if (DEBUG_ITB) console.log(subject.name());
        }
        BattleManager.ctbTicksToReadyClear();
        //if (subject) this._showCTBActionIcon = false;
        _BM_endAction.call(this)
        if (DEBUG_ITB) this.debugState();
    };  

    var _BM_startAction = BattleManager.startAction;
    BattleManager.startAction = function() {
        _BM_startAction.call(this)
        if (TRACE_ITB || DEBUG_ITB)  {
            console.log(" ");
            console.log("==== START ACTION ====");
            if (DEBUG_ITB) this.debugState();
        }
    };

    var _BM_startCTBAction = BattleManager.startCTBAction;
    BattleManager.startCTBAction = function(battler) {
        if (TRACE_ITB || DEBUG_ITB) {
            console.log(" ");
            console.log("=== START ACTION === I", battler._initiative);
        }
        this._subject = battler;
        var action = battler.currentAction();
        // INVALID SUBJECT
        if (action && action.isValid()) {
            this.startAction();
        } else {
            var wait = battler.ctbWaitInitiative();
            //console.log("INVALID ACTION:", battler.name(), "WAITS", wait);
            battler._initiative += wait;
            battler.clearActions();
            battler.setActionState('waiting');
            this.endAction();
        }
        if (DEBUG_ITB) {
            console.log(battler.name());
            console.log(battler.currentAction());
        }	
    };

    BattleManager.normalizeInitiative = function() {
        var members = this.allBattleMembers().filter(function(member) {
            return member && member.isAlive();
        });
        if (members.length <= 0) return;
        var minTp = Math.min.apply(null, members.map(function(member) {
            return member.tp;
        }));
        if (minTp <= 0) return;
        members.forEach(function(member) {
            member.setTp(member.tp - minTp);
        });
        if (DEBUG_ITB) console.log("Normalized initiative by", minTp);
    }; 

    BattleManager.requestTimelineRefresh = function(reason) {
        if (TRACE_ITB || DEBUG_Timeline) console.log("TIMELINE REFRESH:", reason);
        if (DEBUG_Timeline) this._showlog = true;
        this._timelineVersion++;
    };

    //var _SB_commandAttack = Scene_Battle.prototype.commandAttack;
    Scene_Battle.prototype.commandAttack = function() {
        if (TRACE_ITB || DEBUG_ITB) console.log("COMMAND ATTACK");
        var actor = BattleManager.actor();
        var action = BattleManager.inputtingAction();
        action.setAttack();
        if (DEBUG_ITB) {
            console.log("Action:", action);
            console.log("Actor:", actor);
            console.log("Item:", action.item());
        }
        if (actor && action.item()) {
            actor.setCTBActionPreview(action);
            BattleManager.requestTimelineRefresh("Select Attack");
        }
        this.selectEnemySelection();
    };

    var _SB_onSelectAction = Scene_Battle.prototype.onSelectAction;
    Scene_Battle.prototype.onSelectAction = function() {
        var actor = BattleManager.actor();
        var action = BattleManager.inputtingAction();
        if (actor && action && action.item()) {
            actor.setCTBActionPreview(action);
            BattleManager.requestTimelineRefresh("Select Skill");
        }
        _SB_onSelectAction.call(this);
    };

    var _CTB_updateRedraw = Window_CTBIcon.prototype.updateRedraw;
    Window_CTBIcon.prototype.updateRedraw = function() {
        _CTB_updateRedraw.call(this);
        this.redrawInitiative();
    };

    Window_CTBIcon.prototype.redrawInitiative = function() {
        if (!this._battler) return;
        var value = this._battler.initiative || this._battler.ctbTicksToReady() || 0;
	    var y = this.contents.height - this.lineHeight() + 12;
        this.contents.fontSize = 17;
        this.changeTextColor(this.textColor(6));
        this.drawText(
            value,
            0,
            y - 1,
            this.contents.width,
            'center'
        );
    };

    Window_CTBIcon.prototype.initialize = function(mainSprite) {
        this._mainSprite = mainSprite;
        var width = this.iconWidth() + 8 + this.standardPadding() * 2;
        var height = this.iconHeight() + 14 + this.standardPadding() * 2;
        this._redraw = false;
        this._position = Yanfly.Param.CTBTurnPosX.toLowerCase();
        this._direction = Yanfly.Param.CTBTurnDirection.toLowerCase();
        this._lowerWindows = eval(Yanfly.Param.BECLowerWindows);
        Window_Base.prototype.initialize.call(this, 0, 0, width, height);
        this.opacity = 0;
        this.contentsOpacity = 0;
        this._lastTimelineVersion = -1;
    };

    Window_CTBIcon.prototype.destinationY = function() {
        var timeline = BattleManager.timelineWindow();
        if (!timeline) return 0;
        var value = timeline.y + timeline.trackBottom() - this.iconHeight() - 16;
        if (this._battler && this._battler.isSelected()) value -= this.contents.height / 4;
        return value;
    };

    Window_CTBIcon.prototype.drawIcon = function(iconIndex, x, y) {
        var bitmap = ImageManager.loadSystem('IconSet');
        var pw = Window_Base._iconWidth;
        var ph = Window_Base._iconHeight;
        var sx = iconIndex % 16 * pw;
        var sy = Math.floor(iconIndex / 16) * ph;
        var ww = this.iconWidth();
        var wh = this.iconHeight() - 6;
        this.contents.blt(bitmap, sx, sy, pw, ph, x, y, ww, wh);
    };

    Window_CTBIcon.prototype.redrawEnemy = function() {
        if (this.isUsingSVBattler()) {
          return this.redrawSVEnemy();
        };
        var bitmap = this._image;
        var sw = bitmap.width;
        var sh = bitmap.height;
        var dw = this.contents.width - 8;
        var dh = this.contents.height - 14;
        var dx = 0;
        var dy = 0;
        if (sw >= sh) {
          var rate = sh / sw;
          dh *= rate;
          dy += this.contents.height - 8 - dh;
        } else {
          var rate = sw / sh;
          dw *= rate;
          dx += Math.floor((this.contents.width - 8 - dw) / 2);
        }
        this.contents.blt(bitmap, 0, 0, sw, sh, dx + 4, dy + 4, dw, dh);
    };

    Window_CTBIcon.prototype.redrawSVEnemy = function() {
        var bitmap = this._image;
        var sw = bitmap.width / 9;
        var sh = bitmap.height / 6;
        var dw = this.contents.width - 8;
        var dh = this.contents.height - 14;
        var dx = 0;
        var dy = 0;
        if (sw >= sh) {
          var rate = sh / sw;
          dh *= rate;
          dy += this.contents.height - 8 - dh;
        } else {
          var rate = sw / sh;
          dw *= rate;
          dx += Math.floor((this.contents.width - 8 - dw) / 2);
        }
        this.contents.blt(bitmap, 0, 0, sw, sh, dx + 4, dy + 4, dw, dh);
    };

    Window_CTBIcon.prototype.redrawActorFace = function() {
        var width = Window_Base._faceWidth;
        var height = Window_Base._faceHeight;
        var faceIndex = this._battler.faceIndex();
        var bitmap = this._image;
        var pw = Window_Base._faceWidth;
        var ph = Window_Base._faceHeight;
        var sw = Math.min(width, pw);
        var sh = Math.min(height, ph);
        var dx = Math.floor(Math.max(width - pw, 0) / 2);
        var dy = Math.floor(Math.max(height - ph, 0) / 2);
        var sx = faceIndex % 4 * pw + (pw - sw) / 2;
        var sy = Math.floor(faceIndex / 4) * ph + (ph - sh) / 2;
        var dw = this.contents.width - 8;
        var dh = this.contents.height - 14;
        this.contents.blt(bitmap, sx, sy, sw, sh, dx + 4, dy + 4, dw, dh);
    };

    Window_CTBIcon.prototype.updateDestinationX = function() {
        if (!this._battler) return;
        if (this._battler.isDead()) return;
        var timeline = BattleManager.timelineWindow();
        if (!timeline) return;
        //var initiative = this._battler.initiative || this._battler.ctbTicksToReady() || 0;
        var slot = timeline.slotForBattler(this._battler);
        this._destinationX = timeline.x + timeline.slotCenterX(slot - 1) - this.width/10 - 2;
    };

    Window_CTBIcon.prototype.iconWidth = function() {
        var timelineWidth = Graphics.boxWidth - BattleManager.timelineMargin() - 80;
        return Math.floor(timelineWidth/ BattleManager.timelineSlotCount()) - 6;
    };

    Window_CTBIcon.prototype.iconHeight = function() {
        return this.iconWidth();
    };

    Window_CTBIcon.prototype.iconScale = function() {
        if (BattleManager._subject === this._battler) {
            return 1.25;
        }
        return 1.0;
    };

    //=============================================================================
    // Window_CTBActionIcon
    //=============================================================================

    Window_CTBActionIcon.prototype.initialize = function(mainSprite) {
        this._mainSprite = mainSprite;
        var width = this.iconWidth() + 20 + this.standardPadding() * 2;
        var height = this.windowHeight();
        this._redraw = false;
        Window_Base.prototype.initialize.call(this, 0, 0, width, height);
        this.opacity = 0;
        this.contentsOpacity = 0;
        this._iconIndex = 0;
    };

    Window_CTBActionIcon.prototype.setWindowLayer = function(windowLayer) {
        this._windowLayer = windowLayer;
    };

    Window_CTBActionIcon.prototype.update = function() {
        Window_Base.prototype.update.call(this);
        this.updateBattler();
        this.updateActionIcon();
        this.updateTargetIcon();
        this.updateRedraw();
        this.updatePosition();
    };

    // Update this for actions
    Window_CTBActionIcon.prototype.updateBattler = function() {
        if (!this._mainSprite) return;
        this._battler = this._mainSprite._battler;
    };

    Window_CTBActionIcon.prototype.removeCTBActionIcon = function() {
        this.contents.clear();
        this.opacity = 0;
        this.contentsOpacity =0;
    };

    Window_CTBActionIcon.prototype.updateActionIcon = function() {
        if (!this._battler) return;
        var preview = this._battler.ctbActionPreview();
        var changed = 
            this._iconIndex !== this._battler.ctbActionIcon() || 
            this._previewState !== preview;
        if (changed) {
            if (DEBUG_Timeline) {
                console.log(
                    this._battler.name(),
                    "preview =", preview,
                    "current =", this._battler.currentAction()
                );
            }
            this._previewState = preview;
            this._iconIndex = this._battler.ctbActionIcon();
            this._redraw = true;
        }
    };

    Window_CTBActionIcon.prototype.updateTargetIcon = function() {
        if (!this._battler) return;
        var action = this._battler.currentAction();
        var targetIndex = -1;
        if (action) targetIndex = action._targetIndex;
        if (this._lastTargetIndex !== targetIndex) {
            this._lastTargetIndex = targetIndex;
            this._redraw = true;
        }
    };

    Window_CTBActionIcon.prototype.forceRedraw = function() {
        this._redraw = true;
    };

    Window_CTBActionIcon.prototype.updateRedraw = function() {
        if (!this._redraw) return;
        this._redraw = false;
        if (DEBUG_Timeline) {
            if (this._lastbattler !== this._battler) {
                this._lastbattler = this._battler;
                console.log(
                    "ICON UPDATE",
                    this._battler.name(),
                    this._battler.isActor()
                );
            }
        }
        this.contents.clear();
        if (this._iconIndex <= 0) {
            this.opacity = 0;
            this.contentsOpacity = 0;
            return;
        }
        this.opacity = 0;
        this.contentsOpacity = 255;
        this.drawActionBorder();
        this.drawActionIcon(this._iconIndex, 2, 20);
        if (this._previewState) {
            //if (DEBUG_Timeline) console.log("Draw preview arrow");
            this.drawPreviewArrow("#F7E839");
        }
        this.drawTargetBackground();
        this.drawTargetMiniIcon();
    };

    Window_CTBActionIcon.prototype.drawActionIcon = function(iconIndex, x, y) {
        var bitmap = ImageManager.loadSystem('IconSet');
        var pw = Window_Base._iconWidth;
        var ph = Window_Base._iconHeight;
        var sx = iconIndex % 16 * pw;
        var sy = Math.floor(iconIndex / 16) * ph;
        var dw = this.iconWidth();
        var dh = this.iconHeight();
        this.contents.blt(bitmap, sx, sy, pw, ph, x, y, dw, dh);
    };

    Window_CTBActionIcon.prototype.drawActionBorder = function(rect) {
        this.drawActionBorderAt(-1, 17, "#F7E839");
    };

    Window_CTBActionIcon.prototype.drawActionBorderAt = function(x, y, color) {
        var w = this.iconWidth() + 6;
        var h = this.iconHeight() + 6;
        this.contents.fillRect(x, y, w, h, "#000000");
        w -= 2;
        h -= 2;
        this.contents.fillRect(x + 1, y + 1, w, h, color);
        w -= 2;
        h -= 2;
        this.contents.fillRect(x + 2, y + 2, w, h, color);
        w -= 2;
        h -= 2;
        this.contents.fillRect(x + 3, y + 3, w, h, "#000000");
    };

    Window_CTBActionIcon.prototype.updatePosition = function() {
        if (!this._battler) return;
        var preview = this._battler.ctbActionPreview();
        if(preview) {
            var timeline = BattleManager.timelineWindow();
            if (!timeline) return;
            var slot = timeline.slotForPreview(this._battler);
            if (slot < 0) {
                this.contentsOpacity = 0;
                return;
            }
            this.contentsOpacity = 255;
            this.x = timeline.x + timeline.slotCenterX(slot) - this.width / 2;
            this.y = timeline.x + timeline.trackY() - this.height;
        } else {
            var main = this._mainSprite._ctbIcon;
            if (!main) return;
            this.x = main.x;
            this.y = main.y + main.height - 36;
        }
    };

    Window_CTBActionIcon.prototype.targetBattler = function() {
        if (!this._battler) return null;
        var action = this._battler.ctbActionPreview();
        if (!action) action = this._battler.currentAction();
        if (!action) return null;
        //console.log(
        //    "TARGET TEST",
        //    action,
        //    action ? action._targetIndex : null
        //);
        if (this._battler.isActor()) {
            var targetIndex = action._targetIndex;
            if (targetIndex === undefined || targetIndex === null || targetIndex < 0) return null;
            if (action.isForOpponent()) {
                var unit = this._battler.opponentsUnit();
                return unit.members()[targetIndex];
            }
            if (action.isForFriend()) {
                var unit = this._battler.friendsUnit();
                return unit.members()[targetIndex];
            }
            return null;
        }
        var targets = action.makeTargets();
        if (!targets || targets.length === 0) return null;
        var target = targets[0];
        //if (target === this._battler) return null;
        return target;
    };

    Window_CTBActionIcon.prototype.drawTargetBackground = function() {
        var target = this.targetBattler();
        if (!target) return;
        var bitmap = ImageManager.loadSystem("TargetBoard");
        if (!bitmap.isReady()) {
            bitmap.addLoadListener(function() {
                this._redraw = true;
            }.bind(this));
            return;
        }
        var size = 54;
        var x = this.contents.width - 3*size/4 - 1;
        var y = this.iconHeight() - 3*size/4 - 3;
        this.contents.blt(
            bitmap,
            0,
            0,
            bitmap.width,
            bitmap.height,
            x,
            y,
            size,
            size
        );
    };

    Window_CTBActionIcon.prototype.drawTargetMiniIcon = function() {
        var target = this.targetBattler();
        if (!target) return;
        var size = 20;
        var dx = this.contents.width - size - 4;
        var dy = this.iconHeight() - size - 3;
        var bitmap;
        if (target.isActor()) {
            bitmap = ImageManager.loadFace(target.faceName());
            //console.log("Bitmap:", bitmap);
            //console.log("Bitmap.isReady:", bitmap.isReady);
            if (!bitmap.isReady()) return;
            var faceIndex = target.faceIndex();
            var pw = Window_Base._faceWidth;
            var ph = Window_Base._faceHeight;
            var sx = (faceIndex % 4) * pw;
            var sy = Math.floor(faceIndex / 4) * ph;
            this.contents.blt(
                bitmap,
                sx,
                sy,
                pw,
                ph,
                dx,
                dy,
                size,
                size
            );
        } else {
            var sw;
            var sh;
            if ($gameSystem.isSideView()) {
                bitmap = ImageManager.loadSvEnemy(target.battlerName());
                sw = bitmap.width / 9;
                sh = bitmap.height / 6;
            } else {
                bitmap = ImageManager.loadEnemy(
                    target.battlerName(),
                    target.battlerHue()
                );
                //bitmap = ImageManager.loadPicture(
                //    "img/enemies/" + target.name()
                //);
                sw = bitmap.width;
                sh = bitmap.height;
            }
            if (!bitmap.isReady()) return;
            var dw = this.contents.width/2 - 2;
            var dh = this.contents.height/2 - 2;
            this.contents.blt(
                bitmap,
                0,
                0,
                sw,
                sh,
                dx,
                dy - 2,
                dw,
                dh
            );
        }
    };

    Window_CTBActionIcon.prototype.drawPreviewArrow = function(color) {
        var ctx = this.contents._context;
        var cx = 3 * this.contents.width / 8 - 3;
        // tip of arrow
        var top = 3;
        // base of arrow
        var bottom = 16;
        // half width
        var half = 6;
        ctx.save();
        ctx.fillStyle = color;
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx, top);
        ctx.lineTo(cx - half, bottom);
        ctx.lineTo(cx + half, bottom);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        this.contents._setDirty();
    };

    Window_CTBActionIcon.prototype.windowHeight = function() {
        return this.iconHeight() + 28 + this.standardPadding() * 2;
    };

    Window_CTBActionIcon.prototype.iconWidth = function() {
        var timelineWidth = Graphics.boxWidth - BattleManager.timelineMargin() - 80;
        return Math.floor(timelineWidth/ BattleManager.timelineSlotCount()) - 8;
    };

    Window_CTBActionIcon.prototype.iconHeight = function() {
        return this.iconWidth();
    };

    Game_Battler.prototype.ctbActionIcon = function() {
        //if (!this._showCTBActionIcon && this.isActor()) return 0;
        if (this.isEnemy() && !this.isCTBCharging()) return 0;
        var action = this.ctbActionPreview();
        if (!action) action = this.currentAction();
        if (!action || !action.item()) return 0;
        return action.item().iconIndex;
    };

    Sprite_Battler.prototype.createCTBIcon = function() {
        if (!Yanfly.Param.CTBTurnOrder) return;
        this._ctbIcon = new Window_CTBIcon(this);
        this._ctbActionIcon = new Window_CTBActionIcon(this);
    };

    Sprite_Battler.prototype.addCTBIcon = function() {
        if (!this._ctbIcon && !this._ctbActionIcon) return;
        if (this._addedCTBIcon) return;
        if (!SceneManager._scene) return;
        var scene = SceneManager._scene;
        if (!scene._windowLayer) return;
        this._addedCTBIcon = true;
        this._ctbIcon.setWindowLayer(scene._windowLayer);
        this._ctbActionIcon.setWindowLayer(scene._windowLayer);
        scene.addChild(this._ctbIcon);
        scene.addChild(this._ctbActionIcon);
    };

    Object.defineProperty(Game_Battler.prototype, 'initiative', {
        get: function() {
            return this._initiative || 0;
        },
        configurable: true
    });

    //=============================================================================
    // Window_CTBTimeLine
    //=============================================================================

    Window_CTBTimeline.prototype.initialize = function() {
        //console.log("CTB Timeline Initialized");
        const width = Graphics.boxWidth;
        const height = 80;
        Window_Base.prototype.initialize.call(this, 0, 0, width, height);
        this._scale = 1;
        this.opacity = 0;
        this.redraw();
    };

    Window_CTBTimeline.prototype.update = function() {
        Window_Base.prototype.update.call(this);
        if (this._lastTimelineVersion !== BattleManager._timelineVersion) {
            if (DEBUG_Timeline) console.log("Redraw timeline");
            this.redraw();
            this._lastTimelineVersion = BattleManager._timelineVersion;
        }
    };

    Window_CTBTimeline.prototype.currentInitiative = function() {
        var anchor = BattleManager._timelineAnchorInitiative;
        console.log("Current initiative");
        console.log("Anchor:", anchor);
        if (anchor !== undefined && anchor !== null) return anchor;
        var members = BattleManager.sortBattleMembers().filter(function(member) {
            return member && member.isAlive();
        });
        if (members.length <= 0) return 0;
        return Math.min.apply(null, members.map(function(member) {
            return member.initiative || member.ctbTicksToReady() || 0;
        }));
    };   

    //Window_CTBTimeline.prototype.initiativeToSlot = function(initiative) { 
    //    return Math.floor((initiative - this.currentInitiative()) / this._scale);
    //};

    Window_CTBTimeline.prototype.getTimelineScale = function(members) {
        const count = this.slotCount();
        var scale = 1;
        while (this.requiredSlots(scale, members) > count) scale++;
        return scale;
    };

    Window_CTBTimeline.prototype.activeSlotWidth = function() {
        return Math.floor(1.25 * this.slotWidth());
    };

    Window_CTBTimeline.prototype.slotWidth = function() {
        return Math.floor((this.timelineRight() - this.timelineLeft())/ this.slotCount());
    };

    Window_CTBTimeline.prototype.slotCenterX = function(slot) {
        return this.timelineLeft() + slot * this.slotWidth() + this.slotWidth() / 2;
    };

    Window_CTBTimeline.prototype.timelineLeft = function() {
        return 20;
    };

    Window_CTBTimeline.prototype.timelineRight = function() {
        return this.contents.width + this.timelineLeft() - BattleManager.timelineMargin();
    };

    Window_CTBTimeline.prototype.slotCount = function() {
        return BattleManager.timelineSlotCount();
    };

    /* Window_CTBTimeline.prototype.initiativeToX = function(initiative) {
        const stepSize = this.slotCount() * this._scale; // initiative per tick segment
        const range = initiative - this.currentInitiative();
        const timelineWidth = this.timelineRight() - this.timelineLeft();
        return this.timelineLeft() + (range / stepSize) * timelineWidth;
    }; */

    Window_CTBTimeline.prototype.redraw = function() {
        this.contents.clear();
        this.buildTimelineSlots();
        this.drawTrack();
    };

    Window_CTBTimeline.prototype.drawTrack = function() {
        //var current = this.currentInitiative();
        var x = this.timelineLeft();
        var values = this.buildDisplayedInitiatives();
        for (var i = 0; i < this.slotCount(); i++) {
            var width = (i === 0)
                ? this.activeSlotWidth()
                : this.slotWidth();
            this.drawTrackSlot(
                x,
                18,
                width,
                28,
                values[i],
                i
            );
            x += width;
        }
    };

    Window_CTBTimeline.prototype.drawTrackSlot = function(x, y, width, height, value, i) {
        this.contents.fillRect(
            x,
            y,
            width,
            height + 1,
            this.gaugeBackColor()
        );
        var xl = 0;
        var xr = 0;
        if (this._timelineSlots && i < this._timelineSlots.length - 1) {
            var left = this._timelineSlots[i];
            var right = this._timelineSlots[i + 1];
            if (left.initiative === right.initiative) xr = 2;
        }
        if (this._timelineSlots && i > 0 && i < this._timelineSlots.length) {
            var left = this._timelineSlots[i - 1];
            var right = this._timelineSlots[i];
            if (left.initiative === right.initiative) {
                xl -= 2;
                xr += 2;
            };
        }
        this.contents.fillRect(
            x + 1 + xl,
            y + 1,
            width - 2 + xr,
            height - 2,
            "#F5A623"
        );
        this.contents.fillRect(
            x + 3 + 2*xl,
            y + 3,
            width - 6 + 2*xr,
            height - 6,
            "#270909"
        );
        if (xl === 0) {
            this.contents.fontSize = 17;
            this.drawText(
                value,
                x,
                y + 1,
                width,
                "center"
            );
        }
    };

    Window_CTBTimeline.prototype.trackY = function() {
        return 18;
    };

    Window_CTBTimeline.prototype.trackHeight = function() {
        return 28;
    };

    Window_CTBTimeline.prototype.trackBottom = function() {
        return this.trackY() + this.trackHeight();
    };

    Window_CTBTimeline.prototype.requiredSlots = function(scale, members) {
        if (!members || members.length <= 0) return 0;
        //var members = entries.filter(function(member) {
        //    return member && member.isAlive();
        //});
        //if (members.length <= 0) return 0;
        var initiatives = members.map(function(member) {
            return member.initiative || 0;
        });
        initiatives.sort(function(a, b) {return a - b});
        var current = initiatives[0];
        var highest = initiatives[initiatives.length - 1];
        // base slots required by range
        var slots = Math.floor((highest - current) / scale) + 1;
        // add duplicate slots
        var counts = {};
        initiatives.forEach(function(value) {
            counts[value] = (counts[value] || 0) + 1;
        });
        Object.keys(counts).forEach(function(key) {
            slots += counts[key] - 1;
        });
        return slots;
    };

    Window_CTBTimeline.prototype.buildTimelineSlots = function() {
        var current = this.currentInitiative();
        if (DEBUG_Timeline) console.log("Build timeline slots from:", current);
        if (DEBUG_Timeline) console.log("Anchor initiative:", BattleManager._timelineAnchorInitiative);
        //var members = BattleManager.sortBattleMembers().filter(function(member) {
        //    return member && member.isAlive();
        //});
        var entries = BattleManager.buildTimelineEntries();
        this._scale = this.getTimelineScale(entries);
        if (entries.length <= 0) {
            this._timelineSlots = [];
            return;
        }
        // group by scaled initiative buckets
        var grouped = {};
        entries.forEach(function(entry) {
            var initiative = entry.initiative;
            var apparent = current + Math.floor((initiative - current) / this._scale) * this._scale;
            if (!grouped[apparent]) grouped[apparent] = [];
            grouped[apparent].push(entry);
        }, this);
        // build timeline using actual initiative values
        var slots = [];
        var visibleInitiative = current;
        while (slots.length < this.slotCount()) {
            if (grouped[visibleInitiative]) {
                grouped[visibleInitiative].forEach(function(entry) {
                    var slot = {};
                    for (var key in entry) slot[key] = entry[key];
                    //slot.initiative = entry.initiative;
                    //slot.battler = entry.battler || null;
                    slot.action = entry.action || null;
                    slots.push(slot);
                });
            } else {
                slots.push({
                    initiative: visibleInitiative,
                    battler: null,
                    type: "empty"
                });
            }
            visibleInitiative += this._scale;
        }
        this._timelineSlots = slots.slice(0, this.slotCount());
        if (DEBUG_Timeline) this.debugTimeline();
    };

    Window_CTBTimeline.prototype.debugTimeline = function() {
        console.log("Scale =", this._scale);
        console.table(this._timelineSlots.map(function(slot, index) {
            return {
                slot: index,
                type: slot.type,
                initiative: slot.initiative,
                battler: slot.battler ? slot.battler.name() : "-",
                action: slot.action ? slot.action.item().name : "-"
            };
        }));
    };

    Window_CTBTimeline.prototype.buildDisplayedInitiatives = function() {
        var values = [];
        for (var i = 0; i < this._timelineSlots.length; i++) {
            values.push(this._timelineSlots[i].initiative);
        }
        var next = values.length > 0
                ? values[values.length - 1] + this._scale
                : this.currentInitiative();
        while (values.length < this.slotCount()) {
            values.push(next);
            next += this._scale;
        }
        return values;
    };

    Window_CTBTimeline.prototype.slotForBattler = function(battler) {
        if (!this._timelineSlots) return 0;
        for (var i = 0; i < this._timelineSlots.length; i++) {
            var slot = this._timelineSlots[i];
            if (slot.type === "battler" && slot.battler === battler) return i + 1;
        }
        return 0;
    };

    Window_CTBTimeline.prototype.slotForPreview = function(battler) {
        if (!this._timelineSlots) return 0;
        for (var i = 0; i < this._timelineSlots.length; i++) {
            var slot = this._timelineSlots[i];
            if (slot.type === "preview" && slot.battler === battler) {
                return i + 1;
            }
        }
        return 0;
    };

    var _CTB_SceneBattle_createAllWindows = Scene_Battle.prototype.createAllWindows;
    Scene_Battle.prototype.createAllWindows = function() {
        _CTB_SceneBattle_createAllWindows.call(this);
        this.createCTBTimelineWindow();
    };

    Scene_Battle.prototype.createCTBTimelineWindow = function() {
        this._ctbTimelineWindow = new Window_CTBTimeline();
        this.addWindow(this._ctbTimelineWindow);
    };

    Game_Battler.prototype.setCTBActionPreview = function(action) {
        if (DEBUG_Timeline) {
            console.log(
                "SET PREVIEW:", 
                this.name(), 
                action
            );
        }
        this._ctbActionPreview = action;
        //this._showCTBActionIcon = true;
    };

    Game_Battler.prototype.ctbActionPreview = function() {
        return this._ctbActionPreview;
    };

    Game_Battler.prototype.clearCTBActionPreview = function() {
        if (DEBUG_Timeline) console.log("CLEAR PREVIEW:", this.name());
        this._ctbActionPreview = null;
    };

    Game_Battler.prototype.ctbPreviewInitiative = function() {
        var action = this._ctbActionPreview;
        //if (DEBUG_Timeline) console.log("PREVIEW INIT:", this.name(), this.initiative, action ? action.item().initiative : null);
        if (!action || !action.item()) return this.initiative;
        return this.initiative + (action.item().initiative || 0);
    };

    BattleManager.timelineWindow = function() {
        var scene = SceneManager._scene;
        if (!scene) return null;
        return scene._ctbTimelineWindow;
    };

    BattleManager.buildTimelineEntries = function() {
        if (DEBUG_Timeline) {
            var showlog = this._showlog;
            if (showlog) console.log("Build Timeline Entries");
        }
        var entries = [];
        this.sortBattleMembers().forEach(function(battler) {
            if (showlog) console.log("Battler:", battler.name());
            if (!battler || !battler.isAlive()) return;
            entries.push({
                type: "battler",
                battler: battler,
                initiative: battler.initiative || battler.ctbTicksToReady() || 0,
                activationOrder: battler._activationOrder || 0
            });
            var action = battler.ctbActionPreview();
            if (DEBUG_Timeline && showlog) {
                console.log(
                    "PREVIEW",
                    battler.name(),
                    action,
                    action ? action.item() : null,
                    action ? action.constructor && action.constructor.name : null
                );
            }
            if (battler.isActor() && action && action.item()) {
                if (DEBUG_Timeline && showlog) {
                    console.log(
                        "ADDING PREVIEW INITIATIVE",
                        battler.ctbPreviewInitiative()
                    );
                }
                entries.push({
                    type: "preview",
                    battler: battler,
                    action: battler.ctbActionPreview(),
                    initiative: battler.ctbPreviewInitiative(),
                    activationOrder: battler._activationOrder || 0
                });
            }
            BattleManager.addTimelineExtensionEntries(entries, battler);
            if (DEBUG_Timeline && showlog) {
                console.log(
                    battler.ctbActionPreview(),
                    battler.ctbActionPreview() &&
                    battler.ctbActionPreview().item()
                );
            }
        });
        entries.sort(function(a, b) {
            if (a.initiative !== b.initiative) {
                return a.initiative - b.initiative;
            }
            return a.activationOrder - b.activationOrder;
        });
        if (DEBUG_Timeline) this._showlog = false;
        return entries;
    };

    BattleManager.addTimelineExtensionEntries = function(entries, battler) {
        // Extension hook for timeline entries (see e.g. JAG_ITB_TimelineEvents pluging).
    };

    BattleManager.sortBattleMembers = function() {
        var members = this.allBattleMembers().slice();
        members.sort(function(a, b) {
            var ia = a._initiative || a.ctbTicksToReady() || 0;
            var ib = b._initiative || b.ctbTicksToReady() || 0;
            ia = ia || 0;
            ib = ib || 0;
            if (ia !== ib) return ia - ib;
            var aa = a._activationOrder || 0;
            var bb = b._activationOrder || 0;
            return aa - bb;
        });
        return members;
    };

    BattleManager.timelineSlotCount = function() {
        return 21;
    };

    BattleManager.timelineMargin = function() {
        return 28;
    };

    //=============================================================================
    // DEBUG HELPERS
    //=============================================================================

    BattleManager.debugState = function() {
        console.log(" ");
        console.log("========== CTB STATE ==========");
        console.log("Phase:", this._phase);

        this.allBattleMembers().forEach(function(b) {
            if (!b) return;

            console.log(
            b.name(),
            "| charge = ", b._ctbCharge,
            "| ctbspeed() =", b.ctbSpeed(),
            "| ticksToReady = ", b.ctbTicksToReady(),
            "| initiative =", b.initiative,
            "| activation order =", b._activationOrder
            );
        });
    };
})();