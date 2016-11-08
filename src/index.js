/**
 * fx-maze
 *
 * TODO: see https://github.com/lmorchard/fx-maze/issues
 */
import Dat from 'dat-gui';
import Stats from 'stats.js';

import { requestAnimFrame } from './lib/utils';
import Input from './lib/input';

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
  baseMapSrc: 'mazes/Firefox.png',
  baseMapTilePath: 'mazes/Firefox',
  pathSrc: 'mazes/Firefox.path.png',
  solutionSrc: 'mazes/Firefox.green.png',
  passableMin: 67,
  startX: 499, startY: 432,
  width: 4000, height: 4000,
  tileWidth: 512, tileHeight: 512,
  tiles: {},
  pathData: [],
  solutionData: []
};

const camera = { x: 0, y: 0, z: 0.75, zmin: 0.75, zmax: 5, zdelay: 0, zdelaymax: 500 };
const player = {
  x: 0,
  y: 0,
  r: 0,
  v: 0,
  maxSpeed: 100 / 1000,
  vibrating: 0,
  vibrateBaseLocation: [0,0],
  breadcrumb_stack: new Stack(),
  color: 4095,
  colorHintingTimer: false,
  colorHinting: true,
  used_paths: [],
  current_path: []
};
const updateTimer = { };
const drawTimer = { };
const debugOut = { avg: '', keys: '', gamepad: '', gamepadAxis0: '', gamepadAxis1: '', lars_sez: '' };

let gui, statsDraw, statsUpdate;

const ctx = document.getElementById('viewport').getContext('2d');
ctx.canvas.width = map.width;
ctx.canvas.height = map.height;


function load() {
  // HACK: Render the whole path map at original scale and grab image data
  // array to consult for navigation. Seems wasteful of memory, but performs
  // way better than constant getImageData() calls
  map.pathImg = new Image();
  map.pathImg.src = map.pathSrc;

  map.solutionImg = new Image();
  map.solutionImg.src = map.solutionSrc;

  const loadBaseMapImg = e => {
    ctx.drawImage(map.solutionImg, 0, 0);
    map.solutionData = ctx.getImageData(0, 0, map.width, map.height).data;

    ctx.drawImage(map.pathImg, 0, 0);
    map.pathData = ctx.getImageData(0, 0, map.width, map.height).data;

    map.pathImg.removeEventListener('load', loadBaseMapImg);

    player.preferredMap = map.pathImg;

    init();
  }

  map.pathImg.addEventListener('load', loadBaseMapImg);
}

function init() {
  document.body.className = 'loaded';

  expandCanvas();
  window.addEventListener('resize', expandCanvas);

  Input.init();
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

    Input.update(dt);
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
    drawUsedPaths(dt);
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

function expandCanvas() {
  ctx.canvas.width = window.innerWidth;
  ctx.canvas.height = window.innerHeight;
}

function drawDebug(dt) {
}

function drawMazeOld(dt) {
  ctx.drawImage(map.baseMapImg,
    player.x - (ctx.canvas.width / 2 / camera.z),
    player.y - (ctx.canvas.height / 2 / camera.z),
    ctx.canvas.width / camera.z,
    ctx.canvas.height / camera.z,
    0, 0, ctx.canvas.width, ctx.canvas.height
  );
}

function drawMaze(dt) {
  // Find the rectangle of visible map
  const mapX = player.x - (ctx.canvas.width / 2 / camera.z);
  const mapY = player.y - (ctx.canvas.height / 2 / camera.z);
  const mapW = ctx.canvas.width / camera.z;
  const mapH = ctx.canvas.height / camera.z;

  // Find the start/end indices for tiles in visible map
  const colStart = Math.floor(mapX / map.tileWidth);
  const rowStart = Math.floor(mapY / map.tileHeight);
  const colEnd = Math.ceil(colStart + (mapW / map.tileWidth));
  const rowEnd = Math.ceil(rowStart + (mapH / map.tileHeight));

  const scaledTileWidth = map.tileWidth * camera.z;
  const scaledTileHeight = map.tileHeight * camera.z;

  // Calculate the offset where tile drawing should begin
  let drawOffX = (mapX % map.tileWidth) * camera.z;
  if (drawOffX < 0) { drawOffX = scaledTileWidth + drawOffX; }
  let drawOffY = (mapY % map.tileHeight) * camera.z;
  if (drawOffY < 0) { drawOffY = scaledTileHeight + drawOffY; }

  for (let row = rowStart; row <= rowEnd; row++) {
    for (let col = colStart; col <= colEnd; col++) {
      const x = ((col - colStart) * scaledTileWidth) - drawOffX;
      const y = ((row - rowStart) * scaledTileHeight) - drawOffY;

      if (col >= 0 && row >= 0) {
        const tileKey = `${row}x${col}`;
        if (!map.tiles[tileKey]) {
          const img = new Image();
          img.src = `${map.baseMapTilePath}/${tileKey}.png`;
          map.tiles[tileKey] = img;
        }
        ctx.drawImage(map.tiles[tileKey],
          0, 0, map.tileWidth, map.tileHeight,
          x, y, map.tileWidth * camera.z, map.tileHeight * camera.z
        );
      }
    }
  }
}

function draw_a_path(a_path) {
  if (a_path.length > 1) {
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.beginPath();
    ctx.lineWidth = "8";
    ctx.lineCap = 'round';
    ctx.lineJoin = "round";
    ctx.strokeStyle = '#0f0';

    ctx.moveTo(a_path[0][0], a_path[0][1]);
    for (let j = 1; j < a_path.length; j++) {
      ctx.lineTo(a_path[j][0], a_path[j][1]);
    }
    ctx.stroke();
    ctx.restore();
  }
}

function log_it(message) {
    ctx.save();
    ctx.strokeStyle = '#fff';
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(message, 40, 40);
    ctx.restore();
}

function drawUsedPaths(dt) {
  if (player.current_path.length > 1) {
    let [last_x, last_y] = player.current_path[player.current_path.length - 1];
      if (Math.abs(last_x - player.x) > 6 || Math.abs(last_y - player.y) > 6) {
        player.current_path.push([player.x, player.y]);
      }
      draw_a_path(player.current_path);
  } else {
    player.current_path.push([player.x, player.y]);
  }

  for (let i = 0; i < player.used_paths.length; i++) {
    draw_a_path(player.used_paths[i]);
  }
  if (player.current_path.length > 40) {
    player.used_paths.push(player.current_path);
    player.current_path = [[player.x, player.y]];
  }
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
  /*Math.PI * 1/6, -Math.PI * 1/6,
  Math.PI * 1/4, -Math.PI * 1/4,
  Math.PI * 1/3, -Math.PI * 1/3*/
];

function updatePlayer(dt) {
  updatePlayerFromControls(dt);
  updatePlayerZoom(dt);
  updatePlayerMotion(dt);
}

function updatePlayerFromControls(dt) {
  // Start from zero velocity if no controls are applied
  player.v = 0

  // Query cursor keys & WASD & gamepad d-pad
  const dleft  = (Input.keys[65] || Input.keys[37] || Input.gamepad.button13);
  const dright = (Input.keys[68] || Input.keys[39] || Input.gamepad.button14);
  const dup    = (Input.keys[87] || Input.keys[38] || Input.gamepad.button11);
  const ddown  = (Input.keys[83] || Input.keys[40] || Input.gamepad.button12);
  const dir = (dup ? 'u' : (ddown ? 'd' : '')) +
              (dleft ? 'l' : (dright ? 'r' : ''));
  // the '.' key drops a numbered breadcrumb
  const drop_breadcrumb = Input.keys[190] || false;
  // the '<backspace>' key jumps the player to the most recent breadcrumb
  const jump_to_breadcrumb = Input.keys[8] || Input.keys[46] || false;
  const color_hinting = Input.keys[67] || false;


  if (drop_breadcrumb) {
    delete Input.keys[190]; // ensure keystroke happens only once
    player.breadcrumb_stack.push([player.x, player.y]);
  } else if (jump_to_breadcrumb) {
    delete Input.keys[8]; // ensure keystroke happens only once
    delete Input.keys[46]; // ensure keystroke happens only once
    if (player.breadcrumb_stack.stack.length > 0) {
      player.used_paths.push(player.current_path);
      [player.x, player.y] = player.breadcrumb_stack.pop();
      player.current_path = [[player.x, player.y]];
    }
  } else if (color_hinting) {
    delete Input.keys[67]; // ensure keystroke happens only once
    player.colorHinting = ! player.colorHinting;

  } else if (dir) {
    // Cursor keys or gamepad d-pad input
    player.v = player.maxSpeed;
    player.r = directions[dir];
  } else if (Input.touch.active) {
    // Chase touch when active
    const mx = player.x - (ctx.canvas.width / 2 / camera.z) + (Input.touch.x / camera.z);
    const my = player.y - (ctx.canvas.height / 2 / camera.z) + (Input.touch.y / camera.z);

    player.v = player.maxSpeed; // TODO: velocity from pointer distance?
    player.r = Math.atan2(my - player.y, mx - player.x)
  } else if (Input.mouse.down || Input.keys[32]) {
    // Chase mouse on button down or spacebar
    const mx = player.x - (ctx.canvas.width / 2 / camera.z) + (Input.mouse.x / camera.z);
    const my = player.y - (ctx.canvas.height / 2 / camera.z) + (Input.mouse.y / camera.z);

    player.v = player.maxSpeed; // TODO: velocity from pointer distance?
    player.r = Math.atan2(my - player.y, mx - player.x)
  } else if (typeof(Input.gamepad.axis0) != 'undefined' && typeof(Input.gamepad.axis1) != 'undefined') {
    // Gamepad analog stick for rotation & velocity
    const jx = Math.abs(Input.gamepad.axis0) > 0.2 ? Input.gamepad.axis0 : 0;
    const jy = Math.abs(Input.gamepad.axis1) > 0.2 ? Input.gamepad.axis1 : 0;

    if (Math.abs(jx) > 0 || Math.abs(jy) > 0) {
      player.v = player.maxSpeed; // TODO: velocity from stick intensity?
      player.r = Math.atan2(Input.gamepad.axis1, Input.gamepad.axis0)
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

  if (player.vibrating > 10)
    var [px, py] = player.vibrateBaseLocation;
  else
    var [px, py] = [player.x, player.y];

  let tx = Math.cos(player.r) * player.v * dt + px;
  let ty = Math.sin(player.r) * player.v * dt + py;

  // is the player even moving?
  if (px == tx && py == ty) {
    player.vibrating = 0;
    return;
  }

  //prevent overrun
  dx = px - tx;
  dy = py - ty;
  let largerDelta = Math.max(Math.abs(dx), Math.abs(dy));
  let dxStep = dx / largerDelta;
  let dyStep = dy / largerDelta;

  // check every point along the player path to ensure
  // that no boundary wall was crossed
  let overrunX = px;
  let everrunY = py;
  for (let i = 1; i <= largerDelta ; i++) {
    let testX = Math.trunc(dxStep * i + px);
    let testY = Math.trunc(dyStep * i + py);
    if (isPassableAt(testX, testY)) {
      overrunX = testX;
      everrunY = testY;
    } else {
      tx = overrunX;
      ty = everrunY;
      break;
    }
  }

  [tx, ty] = suggestBetter(tx, ty);
  if (!isPassableAt(tx, ty)) return;

  // stop vibration
  let vdx = Math.abs(player.x - tx);
  let vdy = Math.abs(player.y - ty);
  debugOut.lars_sez = vdx.toString() + ", " + vdy.toString() + " [" + player.vibrateBaseLocation.toString() + "]";
  if (vdx < 2 && vdy < 2) {
    player.vibrating += 1;
    if (player.vibrating > 10) {
      player.vibrateBaseLocation = [tx, ty];
      return;
    }
    player.x = tx;
    player.y = ty;
    return;
  }
  player.x = tx;
  player.y = ty;
  player.vibrating = 0;

  debugOut.avg = getPixelAvgAt(player.x, player.y, map.pathData);
}

function getPixelAt(x, y, pixelData) {
  /*
  const ox = (ctx.canvas.width / 2) - (player.x * camera.z);
  const oy = (ctx.canvas.height / 2) - (player.y * camera.z);
  return ctx.getImageData(
    Math.ceil(ox + x * camera.z),
    Math.ceil(oy + y * camera.z),
    1, 1
  ).data;
  */
  const pos = 4 * (Math.round(x) + (Math.round(y) * map.width));
  return pixelData.slice(pos, pos + 4);
}

function getPixelAvgAt(x, y, pixelData) {
  const d = getPixelAt(x, y, pixelData);
  return (d[0] + d[1] + d[2]) / 3;
}

function getPixelSumAt(x, y, pixelData) {
  const d = getPixelAt(x, y, pixelData);
  return d[0] + d[1] + d[2];
}

function isPassableAt(x, y) {
  return getPixelSumAt(x, y, map.pathData) > map.passableMin;
}

function suggestBetter(x, y) {
  var i;
  var xAxis = [
    [x-3, getPixelSumAt(x-3, y, map.pathData)],
    [x-2, getPixelSumAt(x-2, y, map.pathData)],
    [x-1, getPixelSumAt(x-1, y, map.pathData)],
    [x,   getPixelSumAt(x,   y, map.pathData)],
    [x+1, getPixelSumAt(x+1, y, map.pathData)],
    [x+2, getPixelSumAt(x+2, y, map.pathData)],
    [x+3, getPixelSumAt(x+3, y, map.pathData)],
  ];
  var yAxis = [
    [y-3, getPixelSumAt(x,   y-3, map.pathData)],
    [y-2, getPixelSumAt(x,   y-2, map.pathData)],
    [y-1, getPixelSumAt(x,   y-1, map.pathData)],
    [y,   xAxis[2][2]],
    [y+1, getPixelSumAt(x,   y+1, map.pathData)],
    [y+2, getPixelSumAt(x,   y+2, map.pathData)],
    [y+3, getPixelSumAt(x,   y+3, map.pathData)],
  ];

  let lowX = xAxis.length;
  for (i = 0; i < xAxis.length; i++) {
    if (xAxis[i][1] > map.passableMin){
      lowX = i;
      break;
    }
  }
  let highX = 0;
  for (i = xAxis.length - 1; i >= 0; i--) {
    if (xAxis[i][1] > map.passableMin){
      highX = i;
      break;
    }
  }
  // this nothing is good
  if (lowX > highX) return [x, y];

  let lowY = yAxis.length;
  for (i = 0; i < yAxis.length; i++) {
    if (yAxis[i][1] > map.passableMin){
      lowY = i;
      break;
    }
  }
  let highY = 0;
  for (i = yAxis.length - 1; i >= 0; i--) {
    if (yAxis[i][1] > map.passableMin){
      highY = i;
      break;
    }
  }
  // nothing is better
  if (lowY > highY) return [x, y];

  let betterX = Math.trunc((highX - lowX) / 2) + lowX;
  let betterY = Math.trunc((highY - lowY) / 2) + lowY;

  //debugOut.lars_sez = betterX.toString() + ": " + Math.trunc(xAxis[betterX][0]).toString() + "  " + betterY.toString() + ": " + Math.trunc(yAxis[betterY][0]).toString();

  return [xAxis[betterX][0], yAxis[betterY][0]];

}

function degradeHintingColor() {
  if (player.color > 3840) {
    player.color -= 17;
  }
}

function drawPlayer(dt) {
  let inSolutionPath = getPixelAvgAt(player.x, player.y, map.solutionData) != 0;

  if (player.colorHinting && !player.colorHintingTimer && !inSolutionPath) {
    // degrade the player color every 60 seconds with a timer
    player.colorHintingTimer = window.setInterval(degradeHintingColor, 20000);
  }
  if (player.colorHintingTimer && inSolutionPath) {
    // the player has moved back onto a solution path
    // kill the timer and restore the color
    window.clearInterval(player.colorHintingTimer);
    player.colorHintingTimer = false;
    player.color = 4095;
  }

  let color_str = "#".concat(player.color.toString(16));
  ctx.strokeStyle = color_str;
  ctx.fillStyle = color_str;

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
  listenAll(ftouch, Input.touch);

  const fplayer = gui.addFolder('player');
  fplayer.open();
  listenAll(fplayer, player, ['x', 'y', 'r', 'v', 'color', 'colorHinting', 'vibrating']);


  const fcamera = gui.addFolder('camera');
  fcamera.open();
  listenAll(fcamera, camera, ['x', 'y', 'z', 'zdelay']);

  const fmouse = gui.addFolder('mouse');
  fmouse.open();
  listenAll(fmouse, Input.mouse);

  const fkeys = gui.addFolder('debug');
  fkeys.open();
  listenAll(fkeys, debugOut);
}

function updateDebug(dt) {
  if (!DEBUG) { return; }

  Object.assign(debugOut, {
    keys: JSON.stringify(Input.keys),
    gamepad: JSON.stringify(Input.gamepad),
    gamepadAxis0: Input.gamepad.axis0,
    gamepadAxis1: Input.gamepad.axis1
  });
}

window.addEventListener('load', load);
