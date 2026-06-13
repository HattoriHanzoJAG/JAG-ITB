//=============================================================================
// Guard_Defense_System.js
//=============================================================================
/*:
 * @name guard_defense
 * @plugindesc Adds defense from equipment only while guarding.
 * @author JG
 *
 */

(function() {

    const DEBUG_GUARD = true;
    // CHANGE THIS TO YOUR DEFENSIVE STATE ID
    const GUARD_STATE_ID = 2;

    //--------------------------------------------------------------------------
    // Guard DEF calculation
    //--------------------------------------------------------------------------

    Game_Actor.prototype.guardDef = function() {
        let value = 0;
        const equips = this.equips();
        for (let i = 0; i < equips.length; i++) {
            const equip = equips[i];
            if (equip && equip.meta.Guard) {
                value += Number(equip.meta.Guard || 0);;
            }
        }
        if (DEBUG_GUARD) console.log("Equipment guard:", value);
        const action = this._guardingAction;
        if (action && action.item() && action.item().meta.Guard) {
            value += Number(action.item().meta.Guard || 0);
        }
        return value;
    };

    //--------------------------------------------------------------------------
    // Effective DEF during combat
    //--------------------------------------------------------------------------


    Game_Actor.prototype.isGuarding = function(target) {
        if (DEBUG_GUARD) {
            console.log("=== Is GUARDING ===");
            console.log("Battler:", this.name());
            console.log("Target:", target.name());
            console.log("Battler ID:", this.actorId ? this.actorId() : this.index());
            console.log("_guardingAction:", this._guardingAction);
            console.log("States:", this._states);
        }
        const action = this._guardingAction;
        if (!action || !this.isStateAffected(GUARD_STATE_ID)) return false
        if (DEBUG_GUARD) console.log("makeTargets:", action.makeTargets().map(t => t.name()));
        return action.makeTargets().includes(target);
    };

    //--------------------------------------------------------------------------
    // Damage formula hook
    //--------------------------------------------------------------------------

    const Guard_GA_evalDamageFormula = Game_Action.prototype.evalDamageFormula;
    Game_Action.prototype.evalDamageFormula = function(target) {
        const subject = this.subject();
        // Store original DEF
        const originalDefDescriptor = Object.getOwnPropertyDescriptor(target, 'def');
        const originalDef = target.def;
        // Temporary guard DEF
        if (target.isActor() && target.isGuarding(subject)) {
            target._guardTempDef = originalDef + target.guardDef();
            if (DEBUG_GUARD) {
                console.log("Original defense", originalDef);
                console.log("Temporary guard", target._guardTempDef);
            }
        } else {
            target._guardTempDef = target.def;
            if (DEBUG_GUARD) {
                console.log("GUARD INACTIVE");
                console.log("Subject", subject);
                //console.log("Target is guarding subject", target.isGuarding(subject));
            }
        }
        // Override ONLY def getter
        Object.defineProperty(target, 'def', {
            configurable: true,
            get: function() {
                return this._guardTempDef;
            }
        });
        const value = Guard_GA_evalDamageFormula.call(this, target);
        if (DEBUG_GUARD) console.log("Damage:", value);
        // Restore original param function
        delete target.def;
        delete target._guardTempDef;
        return value;
    };

    //--------------------------------------------------------------------------
    // State application hook
    //--------------------------------------------------------------------------

    const Guard_GB_setupCTBCharge = Game_Battler.prototype.setupCTBCharge;
    Game_Battler.prototype.setupCTBCharge = function() {
        Guard_GB_setupCTBCharge.call(this);
        var action = this.currentAction();
        if (!action) return;
        const item = action.item();
        const subject = action.subject();
        if (item && item.meta.SelfState) {
            const stateId = Number(item.meta.SelfState);
            if (DEBUG_GUARD) {
                console.log("=== APPLY SELF STATE ===");
                console.log("Subject:", subject.name());
            }
            if (stateId === GUARD_STATE_ID) {
                if (DEBUG_GUARD) console.log("Apply guarding action");
                subject._guardingAction = action;
                if (DEBUG_GUARD) console.log("Stored guarding action on:", subject.name());
            }
        }
    };

    //--------------------------------------------------------------------------
    // Automatically clean target when state is removed
    //--------------------------------------------------------------------------

    const Guard_GB_removeState = Game_Battler.prototype.removeState;
    Game_Battler.prototype.removeState = function(stateId) {
        if (DEBUG_GUARD) console.log("=== REMOVE STATE ===");
        if (stateId === GUARD_STATE_ID) {
            if (DEBUG_GUARD) {
                console.log("Clear guarding action");
                console.log("Battler:", this.name());
                console.log("State ID:", stateId);
                console.log("States BEFORE:", this._states);
                console.log("Guarding action BEFORE:", this._guardingAction);
            }
            this._guardingAction = null;
        }
        Guard_GB_removeState.call(this, stateId);
        if (stateId === GUARD_STATE_ID) {
            if (DEBUG_GUARD) {
                console.log("Guarding action AFTER:", this._guardingAction);
                console.log("States AFTER:", this._states);
            }
        }
    };

    //--------------------------------------------------------------------------
    // STATUS MENU
    //--------------------------------------------------------------------------

    Window_Status.prototype.drawParameters = function(x, y) {
        const lineHeight = this.lineHeight();
        // Draw original parameters
        for (let i = 0; i < 6; i++) {
            const paramId = i + 2;
            const yy = y + lineHeight * i;
            this.changeTextColor(this.systemColor());
            this.drawText(TextManager.param(paramId), x, yy, 160);
            let value = this._actor.param(paramId);
            // DEF only
            //if (paramId === 3) value -= this._actor.guardDef();
            this.resetTextColor();
            this.drawText(
                value,
                x + 160,
                yy,
                60,
                'right'
            );
        }
        // Draw Guard DEF below them
        const guardY = y + lineHeight * 6;
        this.changeTextColor(this.systemColor());
        this.drawText("Guard", x, guardY, 160);
        this.resetTextColor();
        this.drawText(
            this._actor.guardDef(),
            x + 160,
            guardY,
            60,
            'right'
        );
    };

    //--------------------------------------------------------------------------
    // EQUIP MENU
    //--------------------------------------------------------------------------

    const Guard_WES_drawItem = Window_EquipStatus.prototype.drawItem;
    Window_EquipStatus.prototype.drawItem = function(x, y, paramId) {
        // DEF line only
        if (paramId === 3) {
            this.changeTextColor(this.systemColor());
            this.drawText(TextManager.param(paramId), x, y, 120);
            const actorDef = this._actor.param(3);
            this.resetTextColor();
            this.drawText(actorDef, x + 140, y, 48, 'right');
            // New equipment preview
            if (this._tempActor) {
                const tempDef = this._tempActor.param(3);
                this.drawRightArrow(x + 188, y);
                this.drawText(tempDef, x + 222, y, 48, 'right');
            }
            return;
        }
        Guard_WES_drawItem.call(this, x, y, paramId);
    };

    //--------------------------------------------------------------------------
    // EQUIP WINDOW HELP TEXT
    //--------------------------------------------------------------------------

    const Guard_WH_setItem = Window_Help.prototype.setItem;
    Window_Help.prototype.setItem = function(item) {
        Guard_WH_setItem.call(this, item);
        if (item && item.meta && item.meta.Guard) {
            this.setText(
                item.description +
                '\nProvides DEF +' + item.meta.Guard + ' against target while guarding.'
            );
        }
    };

    //--------------------------------------------------------------------------
    // BATTLE STATUS WINDOW
    //--------------------------------------------------------------------------

    const Guard_WBS_drawBasicArea = Window_BattleStatus.prototype.drawBasicArea;
    Window_BattleStatus.prototype.drawBasicArea = function(rect, actor) {
        Guard_WBS_drawBasicArea.call(this, rect, actor);
        // Optional: could display Guard DEF here later
    };

})();