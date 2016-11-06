const Input = {
  keys: { },
  gamepad: { },
  mouse: { x: 0, y: 0, down: false },
  touch: { active: false, x: 0, y: 0 },

  init() {
    const windowEvents = {
      mousemove: this.handleMouseMove,
      mousedown: this.handleMouseDown,
      mouseup: this.handleMouseUp,
      keydown: this.handleKeyDown,
      keyup: this.handleKeyUp,
      touchstart: this.handleTouchStart,
      touchmove: this.handleTouchMove,
      touchend: this.handleTouchEnd
    };
    Object.keys(windowEvents)
      .forEach(k => window.addEventListener(k, windowEvents[k].bind(this)));
  },

  update(dt) {
    this.updateGamepads(dt);
  },

  handleMouseMove(ev) {
    this.mouse.x = ev.clientX;
    this.mouse.y = ev.clientY;
    ev.preventDefault();
  },

  handleTouchStart(ev) {
    this.touch.active = true;
    if (ev.changedTouches.length > 0) {
      this.touch.x = ev.changedTouches[0].pageX;
      this.touch.y = ev.changedTouches[0].pageY;
    }
    ev.preventDefault();
  },

  handleTouchMove(ev) {
    if (ev.changedTouches.length > 0) {
      this.touch.x = ev.changedTouches[0].pageX;
      this.touch.y = ev.changedTouches[0].pageY;
    }
    ev.preventDefault();
  },

  handleTouchEnd(ev) {
    this.touch.active = false;
    ev.preventDefault();
  },

  handleMouseDown(ev) {
    this.mouse.down = true;
    ev.preventDefault();
  },

  handleMouseUp(ev) {
    this.mouse.down = false;
    ev.preventDefault();
  },

  handleKeyDown(ev) {
    this.keys[ev.keyCode] = true;
    ev.preventDefault();
  },

  handleKeyUp(ev) {
    delete this.keys[ev.keyCode];
    ev.preventDefault();
  },

  updateGamepads(dt) {
    // Object.keys(gamepad).forEach(k => delete gamepad[k]);
    var gamepads = navigator.getGamepads ? navigator.getGamepads() : [];

    for (var i = 0; i < gamepads.length; i++) {
    	var gp = gamepads[i];
    	if (!gp || !gp.connected) continue;
      gp.buttons.forEach((val, idx) => this.gamepad[`button${idx}`] = val.pressed);
      gp.axes.forEach((val, idx) => this.gamepad[`axis${idx}`] = val);
      break; // stop after the first gamepad
    }

    Object.keys(this.gamepad).forEach(k => {
      if (!this.gamepad[k]) { delete this.gamepad[k]; }
    });
  }

}

export default Input;
