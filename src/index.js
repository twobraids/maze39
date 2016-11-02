/**
 * fx-maze
 *
 * TODO:
 *
 * - pre-loader & progress spinner
 * - wall sliding!
 * - mini-map?
 * - progress breadcrumbs, save to localstorage?
 * - solution hints?
 * - Cut maze up into tiles, render & load only visible tiles
 * - Service Worker to use pre-loaded cached map tiles
 * - Websocket server to show other players if online, option to not show
 */
import Dat from 'dat-gui';
import Stats from 'stats.js';

import { requestAnimFrame } from './lib/utils';

// a simple minded stack structure used to store breadcrumbs
function Stack() {
  this.stack = new Array();
  this.pop = function(){
    return this.stack.pop();
  }
  this.push = function(a_thing){
    return this.stack.push(a_thing);
  }
}

const DEBUG = true;
const TICK = 1000 / 60;

// TODO: Load this from an external JSON URL for Issue #13
const map = {
  src: 'mazes/Firefox.png',
  pathSrc: 'mazes/Firefox.path.png',
  passableMin: 67,
  startX: 499, startY: 432,
  width: 4000, height: 4000,
  data: []
};

const keys = { };
const gamepad = { };
const mouse = { x: 0, y: 0, down: false };
const touch = { active: false, x: 0, y: 0 };
const camera = { x: 0, y: 0, z: 0.75, zmin: 0.75, zmax: 5, zdelay: 0, zdelaymax: 500 };
const player = { 
  x: 0, 
  y: 0, 
  r: 0, 
  v: 0, 
  maxSpeed: 60 / 1000,
  breadcrumb_stack: new Stack()
};
const updateTimer = { };
const drawTimer = { };
const debugOut = { avg: '', keys: '', gamepad: '', gamepadAxis0: '', gamepadAxis1: '' };

let gui, statsDraw, statsUpdate;

const ctx = document.getElementById('viewport').getContext('2d');

function load() {
  // HACK: Render the whole path map at original scale and grab image data
  // array to consult for navigation. Seems wasteful of memory, but performs
  // way better than constant getImageData() calls
  map.img = new Image();
  map.img.src = map.pathSrc;
  const loadPathImg = e => {
    ctx.canvas.width = map.width;
    ctx.canvas.height = map.height;
    ctx.drawImage(map.img, 0, 0);
    map.data = ctx.getImageData(0, 0, map.width, map.height).data;
    map.img.removeEventListener('load', loadPathImg);
    map.img.src = map.src;
    init();
  };
  map.img.addEventListener('load', loadPathImg);
}

function init() {
  document.body.className = 'loaded';

  expandCanvas();

  initUIEvents();
  initPlayer();
  initDebugGUI();
  initTimer(updateTimer);
  initTimer(drawTimer);

  setTimeout(update, TICK);
  requestAnimFrame(draw);
}

function update() {
  handleTimer('update', Date.now(), updateTimer, true, dt => {
    if (DEBUG) { statsUpdate.begin(); }

    updateGamepads(dt);
    updatePlayer(dt);
    updateDebug();

    if (DEBUG) { statsUpdate.end(); }
  });
  setTimeout(update, TICK);
}

function draw(ts) {
  handleTimer('draw', ts, drawTimer, false, dt => {
    if (DEBUG) { statsDraw.begin(); }

    clearCanvas();
    ctx.save();

    drawMaze(dt);
    followAndZoom(dt);
    drawBreadCrumbs(dt);
    drawPlayer(dt);

    ctx.restore();

    drawDebug(dt);

    if (DEBUG) { statsDraw.end(); }
  });
  requestAnimFrame(draw);
}

function initTimer(timer) {
  timer.last = null;
  timer.accum = 0;
}

function handleTimer(type, now, timer, fixed, cb) {
  if (!timer.last) { timer.last = now; }
  const delta = Math.min(now - timer.last, TICK * 3);
  timer.last = now;

  if (!fixed) { return cb(delta); }

  timer.accum += delta;
  while (timer.accum > TICK) {
    cb(TICK);
    timer.accum -= TICK;
  }
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
    (ctx.canvas.width / 2) - (player.x * camera.z),
    (ctx.canvas.height / 2) - (player.y * camera.z)
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
    keyup: handleKeyUp,
    touchstart: handleTouchStart,
    touchmove: handleTouchMove,
    touchend: handleTouchEnd
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
  ev.preventDefault();
}

function handleTouchStart(ev) {
  touch.active = true;
  if (ev.changedTouches.length > 0) {
    touch.x = ev.changedTouches[0].pageX;
    touch.y = ev.changedTouches[0].pageY;
  }
  ev.preventDefault();
}

function handleTouchMove(ev) {
  if (ev.changedTouches.length > 0) {
    touch.x = ev.changedTouches[0].pageX;
    touch.y = ev.changedTouches[0].pageY;
  }
  ev.preventDefault();
}

function handleTouchEnd(ev) {
  touch.active = false;
  ev.preventDefault();
}

function handleMouseDown(ev) {
  mouse.down = true;
  ev.preventDefault();
}

function handleMouseUp(ev) {
  mouse.down = false;
  ev.preventDefault();
}

function handleKeyDown(ev) {
  keys[ev.keyCode] = true;
  ev.preventDefault();
}

function handleKeyUp(ev) {
  delete keys[ev.keyCode];
  ev.preventDefault();
}

function drawDebug(dt) {
}

function drawMaze(dt) {
  ctx.drawImage(map.img,
    player.x - (ctx.canvas.width / 2 / camera.z),
    player.y - (ctx.canvas.height / 2 / camera.z),
    ctx.canvas.width / camera.z,
    ctx.canvas.height / camera.z,
    0, 0, ctx.canvas.width, ctx.canvas.height
  );
}

function drawBreadCrumbs(dt) {
  for (let i = 0; i < player.breadcrumb_stack.stack.length; i++) {
    let [x, y] = player.breadcrumb_stack.stack[i];
    ctx.strokeStyle = '#fff';
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(i.toString(), x, y);
   }
}

function initPlayer() {
  player.x = map.startX;
  player.y = map.startY;
}

const directions = {
  r: 0,
  ur: Math.PI * (7/4),
  u: Math.PI * (3/2),
  ul: Math.PI * (5/4),
  l: Math.PI,
  dl: Math.PI * (3/4),
  d: Math.PI * (1/2),
  dr: Math.PI * (1/4)
};

const slideAngles = [
  0,
  Math.PI * 1/6, -Math.PI * 1/6,
  Math.PI * 1/4, -Math.PI * 1/4,
  Math.PI * 1/3, -Math.PI * 1/3
];

function updatePlayer(dt) {
  updatePlayerFromControls(dt);
  updatePlayerZoom(dt);
  updatePlayerMotion(dt);
}

function updatePlayerFromControls(dt) {
  // Start from zero velocity if no controls are applied
  player.v = 0

  // Query cursor keys & gamepad d-pad
  const dleft  = (keys[37] || gamepad.button13);
  const dright = (keys[39] || gamepad.button14);
  const dup    = (keys[38] || gamepad.button11);
  const ddown  = (keys[40] || gamepad.button12);
  const dir = (dup ? 'u' : (ddown ? 'd' : '')) +
              (dleft ? 'l' : (dright ? 'r' : ''));
  // the '.' key drops a numbered breadcrumb
  const drop_breadcrumb = keys[190] || false;
  // the '<backspace>' key jumps the player to the most recent breadcrumb
  const jump_to_breadcrumb = keys[8] || false;
   
  if (drop_breadcrumb) {
    delete keys[190]; // ensure keystroke happens only once
    player.breadcrumb_stack.push([player.x, player.y]);
  } else if (jump_to_breadcrumb) {
    delete keys[8]; // ensure keystroke happens only once
    if (player.breadcrumb_stack.stack.length > 0) {
      [player.x, player.y] = player.breadcrumb_stack.pop();
    }
  } else if (dir) {
    // Cursor keys or gamepad d-pad input
    player.v = player.maxSpeed;
    player.r = directions[dir];
  } else if (touch.active) {
    // Chase touch when active
    const mx = player.x - (ctx.canvas.width / 2 / camera.z) + (touch.x / camera.z);
    const my = player.y - (ctx.canvas.height / 2 / camera.z) + (touch.y / camera.z);

    player.v = player.maxSpeed; // TODO: velocity from pointer distance?
    player.r = Math.atan2(my - player.y, mx - player.x)
  } else if (mouse.down || keys[32]) {
    // Chase mouse on button down or spacebar
    const mx = player.x - (ctx.canvas.width / 2 / camera.z) + (mouse.x / camera.z);
    const my = player.y - (ctx.canvas.height / 2 / camera.z) + (mouse.y / camera.z);

    player.v = player.maxSpeed; // TODO: velocity from pointer distance?
    player.r = Math.atan2(my - player.y, mx - player.x)
  } else if (typeof(gamepad.axis0) != 'undefined' && typeof(gamepad.axis1) != 'undefined') {
    // Gamepad analog stick for rotation & velocity
    const jx = Math.abs(gamepad.axis0) > 0.1 ? gamepad.axis0 : 0;
    const jy = Math.abs(gamepad.axis1) > 0.1 ? gamepad.axis1 : 0;

    if (Math.abs(jx) > 0 || Math.abs(jy) > 0) {
      player.v = player.maxSpeed; // TODO: velocity from stick intensity?
      player.r = Math.atan2(gamepad.axis1, gamepad.axis0)
    }
  }
}

function updatePlayerZoom(dt) {
  if (player.v !== 0) {
    camera.zdelay = camera.zdelaymax;
    camera.z += 0.3;
    if (camera.z > camera.zmax) { camera.z = camera.zmax; }
  } else {
    if (camera.zdelay > 0) {
      camera.zdelay -= dt;
      return;
    }
    camera.z -= 0.2;
    if (camera.z < camera.zmin) { camera.z = camera.zmin; }
  }
}

function updatePlayerMotion(dt) {
  let dx = 0;
  let dy = 0;

  // Try deflecting at several side angles on collision with a wall.
  for (let idx = 0; idx < slideAngles.length; idx++) {
    const r = player.r + slideAngles[idx];

    let tdx = Math.cos(r) * player.v * dt;
    let tdy = Math.sin(r) * player.v * dt;

    if (isPassableAt(player.x + tdx, player.y + tdy)) {
      dx = tdx;
      dy = tdy;
      break;
    }
  }

  player.x += dx;
  player.y += dy;

  debugOut.avg = getPixelAvgAt(player.x, player.y);
}

function getPixelAt(x, y) {
  /*
  const ox = (ctx.canvas.width / 2) - (player.x * camera.z);
  const oy = (ctx.canvas.height / 2) - (player.y * camera.z);
  return ctx.getImageData(
    Math.ceil(ox + x * camera.z),
    Math.ceil(oy + y * camera.z),
    1, 1
  ).data;
  */
  const pos = 4 * (Math.ceil(x) + (Math.ceil(y) * map.width));
  return map.data.slice(pos, pos + 4);
}

function getPixelAvgAt(x, y) {
  const d = getPixelAt(x, y);
  return (d[0] + d[1] + d[2]) / 3;
}

function isPassableAt(x, y) {
  return getPixelAvgAt(x, y) > map.passableMin;
}

function drawPlayer(dt) {
  ctx.strokeStyle = '#fff';
  ctx.fillStyle = '#fff';

  ctx.beginPath();
  ctx.lineWidth = 0.5;
  ctx.arc(player.x, player.y, 3, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.lineWidth = 2;
  ctx.arc(player.x, player.y, 9, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.lineWidth = 4;
  ctx.arc(player.x, player.y, 27, 0, Math.PI * 2);
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

  const ftouch = gui.addFolder('touch');
  ftouch.open();
  listenAll(ftouch, touch);

  const fplayer = gui.addFolder('player');
  fplayer.open();
  listenAll(fplayer, player, ['x', 'y', 'r', 'v']);

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

window.addEventListener('load', load);
