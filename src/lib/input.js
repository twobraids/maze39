
  const Input = {
  keys: {  },
  gamepad: { },
  mouse: { x: 0, y: 0, down: false, wheel: false },
  touch: { active: false, x: 0, y: 0 },

  lars_sez: '',

  init() {
    const windowEvents = {
      mousemove: this.handleMouseMove,
      mousedown: this.handleMouseDown,
      mouseup: this.handleMouseUp,
      contextmenu: this.ignoreThisEvent,
      wheel: this.handleWheel,
      keydown: this.handleKeyDown,
      keyup: this.handleKeyUp,
      touchstart: this.handleTouchStart,
      touchmove: this.handleTouchMove,
      touchend: this.handleTouchEnd
    };
    Object.keys(windowEvents)
      .forEach(k => window.addEventListener(k, windowEvents[k].bind(this)));
  },

  handleKeyDown(ev) {
    this.keys[ev.keyCode] = true;
    ev.preventDefault();
  },

  handleKeyUp(ev) {
    delete this.keys[ev.keyCode];
    ev.preventDefault();
  },

  update(dt) {
    this.updateGamepads(dt);
  },

  handleMouseMove(ev) {
    this.mouse.x = ev.clientX;
    this.mouse.y = ev.clientY;
    ev.preventDefault();
  },

  handleMouseDown(ev) {
    this.mouse.down = ev.button;
    ev.preventDefault();
  },

  handleMouseUp(ev) {
    this.mouse.down = false;
    ev.preventDefault();
  },

  ignoreThisEvent(ev) {
    ev.preventDefault();
  },

  handleWheel(ev) {
    this.mouse.wheel = ev.deltaY;
    ev.preventDefault();
  },

  touchEventTracker: { },

  startTrackTouch(touch) {
    let id = "t" + touch.identifier.toString();
    this.touchEventTracker[id] = {
      timestamp: Date.now(),
      x: touch.pageX,
      y: touch.pageY,
      xStart: touch.pageX,
      yStart: touch.pageY,
      ended: false
    }
  },

  trackTouch(touch) {
    let id = "t" + touch.identifier.toString();
    this.touchEventTracker[id].x = touch.pageX;
    this.touchEventTracker[id].y = touch.pageY;
  },

  endTrackTouch(touch) {
    let id = "t" + touch.identifier.toString();
    this.touchEventTracker[id].ended = true;
  },


  handleTouchStart(ev) {
    this.touch.active = true;
    for (let i = 0; i < ev.changedTouches.length; i++)
      this.startTrackTouch(ev.changedTouches[i]);
    ev.preventDefault();
  },

  handleTouchMove(ev) {
    for (let i = 0; i < ev.changedTouches.length; i++)
      this.trackTouch(ev.changedTouches[i]);
    ev.preventDefault();
  },

  handleTouchEnd(ev) {
    this.touch.active = false;
    for (let i = 0; i < ev.changedTouches.length; i++)
      this.endTrackTouch(ev.changedTouches[i]);
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