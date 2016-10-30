import dat from 'dat-gui';

const DEBUG = true;
const TICK = 1000 / 60;

const ctx = document.getElementById('viewport').getContext('2d');

const map = {
  src: 'mazes/Firefox.png',
  // src: 'mazes/Firefox.solution.png',
  startX: 499,
  startY: 432,
  width: 4000,
  height: 4000
};

map.img = new Image();
map.img.src = map.src;

const debugOut = { keys: '' };
const keys = { };
const gamepad = { };
const mouse = { x: 0, y: 0, down: false };
const camera = { x: 0, y: 0, z: 0.5, zmin: 0.5, zmax: 3, zdelay: 0 };
const player = {
  position: { x: 0, y: 0 },
  motion: { maxSpeed: 1, accel: 0.01, dx: 0, dy: 0 }
};
let gui;

let lastUpdate = Date.now();
let lastDraw = null;

function init() {
  initEvents();
  initPlayer();

  if (DEBUG) { initDebugGUI(); }

  expandCanvas();
  setTimeout(update, TICK);
  window.requestAnimationFrame(draw);
}

function initDebugGUI() {
  gui = new dat.GUI();

  const listenAll = (folder, obj, except) => {
    Object.keys(obj).forEach(k => folder.add(obj, k).listen());
  };

  const fplayer = gui.addFolder('player');
  fplayer.open();
  listenAll(fplayer, player.position);
  listenAll(fplayer, player.motion);

  const fcamera = gui.addFolder('camera');
  fcamera.open();
  listenAll(fcamera, camera);

  const fmouse = gui.addFolder('mouse');
  fmouse.open();
  listenAll(fmouse, mouse);

  const fkeys = gui.addFolder('debug');
  fkeys.open();
  fkeys.add(debugOut, 'keys').listen();
}

function update() {
  const now = Date.now();
  const dt = now - lastUpdate;
  lastUpdate = now;

  //updateGamepads(dt);
  updatePlayer(dt);

  debugOut.keys = JSON.stringify(keys);

  setTimeout(update, TICK);
}

function draw(ts) {
  if (!lastDraw) { lastDraw = ts; }
  const dt = ts - lastDraw;
  lastDraw = ts;

  ctx.save();
  clearCanvas();
  followAndZoom(dt);
  drawMaze(dt);
  drawPlayer(dt);
  drawDebug(dt);
  ctx.restore();

  window.requestAnimationFrame(draw);
}

function updateGamepads(dt) {
  var bitmask = 0;

  // Helpers for accessing gamepad
  function axis(gp,n) { return gp.axes[n] || 0.0; }
  function btn(gp,b) { return gp.buttons[b] ? gp.buttons[b].pressed : false; }

  var gamepads = navigator.getGamepads ? navigator.getGamepads() : [];

  // Gather input from all known gamepads.
  // All gamepads are mapped to player #1, for now.
  for (var i = 0; i < gamepads.length; i++) {
  	var gp = gamepads[i];
  	if (!gp || !gp.connected) continue;

    // directions (from axes or d-pad "buttons")
  	bitmask |= (axis(gp,0) < -0.5 || btn(gp,14)) ? 1 : 0;
  	bitmask |= (axis(gp,0) > 0.5 || btn(gp,15))  ? 2 : 0;
  	bitmask |= (axis(gp,1) < -0.5 || btn(gp,12)) ? 4 : 0;
  	bitmask |= (axis(gp,1) > 0.5 || btn(gp,13))  ? 8 : 0;
    // buttons (mapped twice for user convenience)
  	bitmask |= (btn(gp,0) || btn(gp,2)) ? 16 : 0;
  	bitmask |= (btn(gp,1) || btn(gp,3)) ? 32 : 0;
  }

  // Update actual array and restart next frame.
	pico8_buttons[0] = bitmask;
	requestAnimationFrame(updateGamepads);
}

function clearCanvas(dt) {
  ctx.fillStyle = "rgba(0, 0, 0, 1.0)";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

function followAndZoom(dt) {
  ctx.translate(
    (ctx.canvas.width / 2) - (player.position.x * camera.z),
    (ctx.canvas.height / 2) - (player.position.y * camera.z)
  );
  ctx.scale(camera.z, camera.z);
}

function initEvents() {
  const windowEvents = {
    resize: expandCanvas,
    mousemove: handleMouseMove,
    mousedown: handleMouseDown,
    mouseup: handleMouseUp,
    keydown: handleKeyDown,
    keyup: handleKeyUp
  };
  Object.keys(windowEvents).forEach(k => window.addEventListener(k, windowEvents[k]));
}

function handleMouseMove(ev) {
  mouse.x = ev.clientX;
  mouse.y = ev.clientY;
}

function handleMouseDown(ev) {
  mouse.down = true;
}

function handleMouseUp(ev) {
  mouse.down = false;
}

function handleKeyDown(ev) {
  keys[ev.keyCode] = true;
  // ev.preventDefault();
}

function handleKeyUp(ev) {
  delete keys[ev.keyCode];
  // ev.preventDefault();
}

function drawDebug(dt) {
  document.getElementById('debug').value = `
    ${JSON.stringify(mouse)}
    ${JSON.stringify(keys)}
    ${JSON.stringify(camera)}
    ${JSON.stringify(player)}
    ${getPixelAvgAt(player.position.x, player.position.y)}
  `;
}

function drawMaze(dt) {
  ctx.drawImage(map.img, 0, 0, map.width, map.height);
}

function initPlayer() {
  player.position.x = map.startX;
  player.position.y = map.startY;
}

function updatePlayer(dt) {
  let ox = player.position.x;
  let oy = player.position.y;
  let dx = player.motion.dx;
  let dy = player.motion.dy;

  if (keys[37]) { // left
    dx = 0 - player.motion.maxSpeed;
  } else if (keys[39]) { // right
    dx = player.motion.maxSpeed;
  } else {
    dx = 0;
  }

  if (keys[38]) { // up
    dy = 0 - player.motion.maxSpeed;
  } else if (keys[40]) { // down
    dy = player.motion.maxSpeed;
  } else {
    dy = 0;
  }

  player.motion.dx = dx;
  player.motion.dy = dy;

  updatePlayerZoom(dt);

  if (!isPassableAt(ox + dx, oy)) {
    dx = 0;
  }

  if (!isPassableAt(ox, oy + dy)) {
    dy = 0;
  }

  player.position.x += dx;
  player.position.y += dy;
}

function updatePlayerZoom(dt) {
  if (player.motion.dx !== 0 || player.motion.dy !== 0) {
    camera.zdelay = 20;
    camera.z += 0.3;
    if (camera.z > camera.zmax) { camera.z = camera.zmax; }
  } else {
    if (camera.zdelay > 0) {
      camera.zdelay -= 1;
      return;
    }
    camera.z -= 0.2;
    if (camera.z < camera.zmin) { camera.z = camera.zmin; }
  }
}

function getPixelAt(x, y) {
  const ox = (ctx.canvas.width / 2) - (player.position.x * camera.z);
  const oy = (ctx.canvas.height / 2) - (player.position.y * camera.z);
  return ctx.getImageData(
    Math.floor(ox + x * camera.z),
    Math.floor(oy + y * camera.z),
    1, 1
  ).data;
}

function getPixelAvgAt(x, y) {
  const d = getPixelAt(x, y);
  return (d[0] + d[1] + d[2]) / 3;
}

function isPassableAt(x, y) {
  return getPixelAvgAt(x, y) > 77;
}

function drawPlayer(dt) {
  ctx.strokeStyle = '#fff';
  ctx.fillStyle = '#fff';

  ctx.beginPath();
  ctx.lineWidth = 0.5;
  ctx.arc(player.position.x, player.position.y, 3, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.lineWidth = 2;
  ctx.arc(player.position.x, player.position.y, 9, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.lineWidth = 4;
  ctx.arc(player.position.x, player.position.y, 27, 0, Math.PI * 2);
  ctx.stroke();
}

function expandCanvas() {
  ctx.canvas.width = window.innerWidth;
  ctx.canvas.height = window.innerHeight;
}

// shim layer with setTimeout fallback
window.requestAnimFrame = (function(){
  return  window.requestAnimationFrame       ||
          window.webkitRequestAnimationFrame ||
          window.mozRequestAnimationFrame    ||
          function( callback ){
            window.setTimeout(callback, 1000 / 60);
          };
})();

window.addEventListener('load', init);
