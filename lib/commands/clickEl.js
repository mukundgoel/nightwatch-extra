var util = require("util");
var clc = require("cli-color");

var selectorUtil = require("../util/selector");
var BaseElCommand = require("./base/baseElCommand");

// Wait until we've seen a selector as :visible SEEN_MAX times, with a
// wait for WAIT_INTERVAL milliseconds between each visibility test.
var settings = require("../settings");
var MAX_TIMEOUT = settings.COMMAND_MAX_TIMEOUT;
var WAIT_INTERVAL = settings.WAIT_INTERVAL;
var SEEN_MAX = settings.SEEN_MAX;

function ClickEl() {
  BaseElCommand.call(this);
  this.checkConditions = this.checkConditions.bind(this);
  this.cmd = "clickel";
}

util.inherits(ClickEl, BaseElCommand);

ClickEl.prototype.do = function (magellanSel) {
  var self = this;
  this.client.api.click(
    "css selector", 
    "[data-magellan-temp-automation-id='" + magellanSel + "']",
    function () {
      self.pass();
    });
};

ClickEl.prototype.checkConditions = function () {
  var self = this;

  this.execute(
    this.executeSizzlejs, [this.selector, this.injectedJsCommand()],
    function (result) {
      // Keep a running count of how many times we've seen this element visible
      if (result.isVisible && result.selectorLength === 1) {
        self.seenCount++;
      }

      var elapsed = (new Date()).getTime() - self.startTime;

      // If we've seen the selector enough times or waited too long,
      //  continue w/ checkElement
      if (self.seenCount >= SEEN_MAX || elapsed > MAX_TIMEOUT) {
        if (self.seenCount >= SEEN_MAX) {

          // use selenium click 
          self.do(result.value.value);
        } else {
          // We're about to fail. If we DO see the selector but selectorLength was > 1,
          // issue a warning that the test had an ambiguous target to click on
          if (result.selectorLength > 1) {
            console.log("ERROR: Saw selector " + self.selector + " but result length was " + result.selectorLength + ", with " + result.selectorVisibleLength + " of those :visible");
            console.log("Selector did not disambiguate after " + elapsed + " milliseconds, refine your selector or check DOM for problems.");
          }
          self.fail();
        }
      } else {
        setTimeout(self.checkConditions, WAIT_INTERVAL);
      }
    });
};

ClickEl.prototype.injectedJsCommand = function ($el, sizzle) {
  return "return $el[0].getAttribute('data-magellan-temp-automation-id')";
};

ClickEl.prototype.command = function (selector, cb) {
  this.selector = selectorUtil.normalize(selector);
  this.cb = cb;

  this.successMessage = "Selector <" + this.selector + "> clicked after %d milliseconds";
  this.failureMessage = "Selector <" + this.selector + "> could not be clicked after %d milliseconds";

  this.startTime = (new Date()).getTime();

  // Track how many times we've seen selector as :visible
  this.seenCount = 0;

  this.checkConditions();

  return this;
};

module.exports = ClickEl;
