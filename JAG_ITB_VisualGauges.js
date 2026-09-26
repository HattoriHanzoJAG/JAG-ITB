//=============================================================================
// JAG_ITB_VisualHpGauge_Extension.js
//=============================================================================
/*:
 * @name JAG_ITB_VisualHpGauge_Extension
 * @plugindesc Adds a compact MP gauge below the YEP Visual HP Gauge for enemies.
 * @author JAG
 *
 * @help
 * Requires YEP_X_VisualHpGauge.
 *
 * Enemy visual gauges display:
 *   HP
 *   MP
 *
 * The existing Yanfly gauge visibility, fading and HP animation behaviour
 * remains unchanged.
 */
//=============================================================================

(function() {

    "use strict";

    if (!Imported.YEP_X_VisualHpGauge) return;

    //=========================================================================
    // Window_VisualHPGauge
    //=========================================================================

    var JAG_VHG_updateWindowSize = Window_VisualHPGauge.prototype.updateWindowSize;
    Window_VisualHPGauge.prototype.updateWindowSize = function() {
        // Keep the original Yanfly gauge unchanged for actors.
        if (!this._battler || !this._battler.isEnemy()) {
            JAG_VHG_updateWindowSize.call(this);
            return;
        }
        var spriteWidth = this._battler.hpGaugeWidth();
        // Make the gauge slightly narrower than the original HP gauge.
        var gaugeWidth = Math.max(80, spriteWidth - 20);
        var width = gaugeWidth + this.standardPadding() * 2;
        width = Math.min(width, Graphics.boxWidth + this.standardPadding() * 2);
        // Two compact gauge rows. Only use a second row when the enemy actually has MP.
        var rows = this._battler.mmp > 0 ? 2 : 1;
        var height = this.lineHeight() * rows;
        height += this.standardPadding() * 2;
        if (width === this.width && height === this.height) return;
        this.width = width;
        this.height = height;
        this.createContents();
        this._requestRefresh = true;
        this.makeWindowBoundaries();
    };

    //=========================================================================
    // Refresh
    //=========================================================================

    var JAG_VHG_refresh = Window_VisualHPGauge.prototype.refresh;
    Window_VisualHPGauge.prototype.refresh = function() {
        // Keep the original Yanfly gauge unchanged for actors.
        if (!this._battler || !this._battler.isEnemy()) {
            JAG_VHG_refresh.call(this);
            return;
        }
        this.contents.clear();
        if (!this._battler) return;
        this._requestRefresh = false;
        var battler = this._battler;
        // Smaller font to keep the two gauges compact.
        var oldFontSize = this.contents.fontSize;
        this.contents.fontSize = 18;
        var width = this.contents.width - 4;
        // HP
        this.drawActorHp(battler, 2, 2, width);
        // MP
        if (battler.mmp > 0) {
            this.drawActorMp(battler, 2, this.lineHeight() - 2, width);
        }
        this.contents.fontSize = oldFontSize;
    };

})();