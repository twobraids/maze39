/**
 * fx-maze
 *
 * TODO:
 * - mini-map?
 * - Cut maze up into tiles, render & load only visible tiles?
 * - Websocket server to show other players?
 */
import Dat from 'dat-gui';
import Stats from 'stats.js';

const DEBUG = true;
const TICK = 1000 / 60;
const PASSABLE_MIN = 67;

const ctx = document.getElementById('viewport').getContext('2d');

const map = {
  src: 'mazes/Firefox.png',
  // src: 'mazes/Firefox.solution.png',
  startX: 499, startY: 432,
  // startX: 525, startY: 641,
  width: 4000, height: 4000
};

map.img = new Image();
map.img.src = map.src;

const keys = { };
const gamepad = { };
const mouse = { x: 0, y: 0, down: false };
const camera = { x: 0, y: 0, z: 1, zmin: 1, zmax: 4, zdelay: 0 };
const player = {
  position: { x: 0, y: 0 },
  motion: { maxSpeed: 2, accel: 0.01, dx: 0, dy: 0 }
};

const debugOut = { avg: '', keys: '', gamepad: '', gamepadAxis0: '', gamepadAxis1: '' };
let gui, statsDraw, statsUpdate;

let lastUpdate = Date.now();
let lastDraw = null;

function init() {
  initUIEvents();
  initPlayer();
  initDebugGUI();

  expandCanvas();
  setTimeout(update, TICK);
  window.requestAnimationFrame(draw);
}

function update() {
  const now = Date.now();
  const dt = now - lastUpdate;
  lastUpdate = now;

  if (DEBUG) { statsUpdate.begin(); }

  updateGamepads(dt);
  updatePlayer(dt);
  updateDebug();

  if (DEBUG) { statsUpdate.end(); }

  setTimeout(update, TICK);
}

function draw(ts) {
  if (!lastDraw) { lastDraw = ts; }
  const dt = ts - lastDraw;
  lastDraw = ts;

  if (DEBUG) { statsDraw.begin(); }

  ctx.save();
  clearCanvas();
  drawMaze(dt);
  followAndZoom(dt);
  drawPlayer(dt);
  ctx.restore();

  drawDebug(dt);

  if (DEBUG) { statsDraw.end(); }

  window.requestAnimationFrame(draw);
}

function updateGamepads(dt) {
  // Object.keys(gamepad).forEach(k => delete gamepad[k]);
  var gamepads = navigator.getGamepads ? navigator.getGamepads() : [];

  for (var i = 0; i < gamepads.length; i++) {
  	var gp = gamepads[i];
  	if (!gp || !gp.connected) continue;
    gp.buttons.forEach((val, idx) => gamepad[`button${idx}`] = val.pressed);
    gp.axes.forEach((val, idx) => gamepad[`axis${idx}`] = val);
    break; // stop after the first gamepad
  }

  Object.keys(gamepad).forEach(k => {
    if (!gamepad[k]) { delete gamepad[k]; }
  });
}

function clearCanvas(dt) {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

function followAndZoom(dt) {
  ctx.translate(
    (ctx.canvas.width / 2) - (player.position.x * camera.z),
    (ctx.canvas.height / 2) - (player.position.y * camera.z)
  );
  ctx.scale(camera.z, camera.z);
}

function initUIEvents() {
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

function expandCanvas() {
  ctx.canvas.width = window.innerWidth;
  ctx.canvas.height = window.innerHeight;
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
}

function handleKeyUp(ev) {
  delete keys[ev.keyCode];
}

function drawDebug(dt) {
}

function drawMaze(dt) {
  // ctx.drawImage(map.img, 0, 0, map.width, map.height);
  ctx.drawImage(map.img,
    player.position.x - (ctx.canvas.width / 2 / camera.z),
    player.position.y - (ctx.canvas.height / 2 / camera.z),
    ctx.canvas.width / camera.z,
    ctx.canvas.height / camera.z,
    0, 0, ctx.canvas.width, ctx.canvas.height
  );
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

  if (keys[37] || gamepad.button13) { // left
    dx = 0 - player.motion.maxSpeed;
  } else if (keys[39] || gamepad.button14) { // right
    dx = player.motion.maxSpeed;
  } else {
    dx = 0;
  }

  if (keys[38] || gamepad.button11) { // up
    dy = 0 - player.motion.maxSpeed;
  } else if (keys[40] || gamepad.button12) { // down
    dy = player.motion.maxSpeed;
  } else {
    dy = 0;
  }

  if (gamepad.axis0 && Math.abs(gamepad.axis0) > 0.1) {
    dx = player.motion.maxSpeed * gamepad.axis0;
  }

  if (gamepad.axis1 && Math.abs(gamepad.axis1) > 0.1) {
    dy = player.motion.maxSpeed * gamepad.axis1;
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

  debugOut.avg = getPixelAvgAt(player.position.x, player.position.y);
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
  return getPixelAvgAt(x, y) > PASSABLE_MIN;
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

function initDebugGUI() {
  if (!DEBUG) { return; }

  statsDraw = new Stats();
  statsDraw.showPanel(0);
  document.body.appendChild(statsDraw.dom);

  statsUpdate = new Stats();
  statsUpdate.showPanel(0);
  document.body.appendChild(statsUpdate.dom);
  statsUpdate.dom.style.top = '48px';

  gui = new Dat.GUI();

  const listenAll = (folder, obj, keys) => {
    if (!keys) { keys = Object.keys(obj); }
    keys.forEach(k => folder.add(obj, k).listen());
  };

  const fplayer = gui.addFolder('player');
  fplayer.open();
  listenAll(fplayer, player.position, ['x', 'y']);
  listenAll(fplayer, player.motion, ['dx', 'dy']);

  const fcamera = gui.addFolder('camera');
  fcamera.open();
  listenAll(fcamera, camera, ['x', 'y', 'z', 'zdelay']);

  const fmouse = gui.addFolder('mouse');
  fmouse.open();
  listenAll(fmouse, mouse);

  const fkeys = gui.addFolder('debug');
  fkeys.open();
  listenAll(fkeys, debugOut);
}

function updateDebug(dt) {
  if (!DEBUG) { return; }

  Object.assign(debugOut, {
    keys: JSON.stringify(keys),
    gamepad: JSON.stringify(gamepad),
    gamepadAxis0: gamepad.axis0,
    gamepadAxis1: gamepad.axis1
  });
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
