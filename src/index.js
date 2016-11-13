/**
 * fx-maze
 *
 * TODO: see https://github.com/lmorchard/fx-maze/issues
 */
import Dat from 'dat-gui';
import Stats from 'stats.js';

import { requestAnimFrame } from './lib/utils';
import Input from './lib/input';

var lars_sez = '';

// a simple minded stack structure used to store breadcrumbs
function Stack() {
  this.stack = [];
  this.pop = function(){
    return this.stack.pop();
  };
  this.push = function(a_thing){
    return this.stack.push(a_thing);
  };
  this.top = function() {
    if (this.stack.length > 0) {
      return this.stack[this.stack.length - 1];
    }
    return [0, 0];
  };
  this.noCloser = function(x, y, topDistance, otherDistance) {
    if (this.stack.length == 0) return true;
    if (distanceFrom(x, y, this.stack[this.stack.length - 1][0], this.stack[this.stack.length - 1][1]) < topDistance)
      return false;

    for (let i = 0; i < this.stack.length - 1; i++)
      if (distanceFrom(x, y, this.stack[i][0], this.stack[i][1]) < otherDistance)
         return false;
    return true;
  }
}

const DEBUG = false;
const TICK = 1000 / 60;
const PI2 = Math.PI * 2;

// TODO: Load this from an external JSON URL for Issue #13
const greenMap = {
  baseMapSrc: 'mazes/Firefox.png',
  baseMapTilePath: 'mazes/Firefox',
  pathSrc: 'mazes/Firefox.png',
  solutionSrc: 'mazes/Firefox.green.png',
  passableMin: 67,
  startX: 496, startY: 435,
  startHeadingX: 499, startHeadingY: 431,
  endX: 3258, endY: 433,
  endHeadingX: 3257, endHeadingY: 427,
  startArrowButt: [521, 401],
  startArrowPoint: [509, 418],
  startArrowLeftWing: [507, 411],
  startArrowRightWing: [517, 417],
  endArrowButt: [3259, 415],
  endArrowPoint: [3262, 394],
  endArrowLeftWing: [3254,400],
  endArrowRightWing: [3268, 402],
  solutionColor: "#0f0",
  width: 4000, height: 4000,
  tileWidth: 512, tileHeight: 512,
  tiles: {},
  pathData: [],
  solutionData: []
};

const redMap = {
  baseMapSrc: greenMap.baseMapSrc,
  baseMapTilePath: greenMap.baseMapTilePath,
  pathSrc: greenMap.pathSrc,
  solutionSrc: 'mazes/Firefox.red.png',
  passableMin: greenMap.passableMin,
  startX: 486, startY: 422,
  startHeadingX: 487, startHeadingY: 417,
  endX: 3229, endY: 429,
  endHeadingX: 3225, endHeadingY: 425,
  startArrowButt: [486, 388],
  startArrowPoint: [487, 412],
  startArrowLeftWing: [495, 404],
  startArrowRightWing: [479, 405],
  endArrowButt: [3219, 419],
  endArrowPoint: [3203, 406],
  endArrowLeftWing: [3204,417],
  endArrowRightWing: [3213, 406],
  solutionColor: "#f00",
  width: greenMap.width, height: greenMap.height,
  tileWidth: greenMap.tileWidth, tileHeight: greenMap.tileHeight,
  tiles: greenMap.tiles,
  pathData: greenMap.pathData,
  solutionData: []
};

const possibleGames = [redMap, greenMap];

var map = possibleGames[getRandomInt(0, possibleGames.length)];


const gamePlay = {
  init: init,

  update(dt) {
    if (DEBUG) { statsUpdate.begin(); }
    //camera = gameCameraNoAutoZoom;
    getCurrentCommands(dt, player, camera);
    updatePlayerZoom(dt);
    updatePlayerMotion(dt);
    updateDebug();
    if (DEBUG) { statsUpdate.end(); }
  },

  draw(dt) {
    if (DEBUG) { statsDraw.begin(); }
    clearCanvas();
    ctx.save();
    drawMaze(dt);
    followAndZoom(dt);
    drawArrows(dt);
    drawUsedPaths(dt);
    drawBreadCrumbs(dt);
    drawPlayer(dt);
    ctx.restore();
    drawDebug(dt);
    if (DEBUG) { statsDraw.end(); }
  }
}

const openAnimation = {
  animationState: 0,
  animationTimer: false,

  init: init,
  update(dt) {
    if (DEBUG) { statsUpdate.begin(); }
    camera = animationCamera;
    updatePlayerFromScript(dt);
    updatePlayerZoom(dt);
    updatePlayerMotionFromScript(dt);
    updateDebug();
    if (DEBUG) { statsUpdate.end(); }
  },
  draw(dt) {
    if (DEBUG) { statsDraw.begin(); }
    clearCanvas();
    ctx.save();
    drawMaze(dt);
    followAndZoom(dt);
    drawArrows(dt);
    drawMessages(dt);
    drawPlayer(dt);
    ctx.restore();
    drawDebug(dt);
    if (DEBUG) { statsDraw.end(); }
  }
}

var gameState = openAnimation;


var gameCameraNoAutoZoom = { name: 'game_no_auto_zoom', x: 0, y: 0, z: 1.0, zmin: 1.0, zmax: 1.0, referenceZ: false, zdelay: 0, zdelaymax: 500 };
var gameCameraWithAutoZoom = { name: 'game_auto_zoom', x: 0, y: 0, z: 0.75, zmin: 0.75, zmax: 5, zdelay: 0, zdelaymax: 500 };
var animationCamera = { name: 'animation', x: 0, y: 0, z: 0.75, zmin: 0.25, zmax: 5, zdelay: 0, zdelaymax: 500 };
var camera = animationCamera;

const player = {
  x: 0,
  y: 0,
  x_history: [],
  y_history: [],
  r: Math.PI * (3/2),
  forceZoomIn: false,
  r_history: [],
  v: 0,
  maxSpeed: 130 / 1000,
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
const debugIn = { tileGrid: false };
const debugOut = { avg: '', keys: '', gamepad: '', gamepadAxis0: '', gamepadAxis1: '', gameState: '', lars_sez: '' };

let gui, statsDraw, statsUpdate;

const ctx = document.getElementById('viewport').getContext('2d');
ctx.canvas.width = map.width;
ctx.canvas.height = map.height;

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

function load() {
  // HACK: Render the whole path map at original scale and grab image data
  // array to consult for navigation. Seems wasteful of memory, but performs
  // way better than constant getImageData() calls

  map.pathImg = new Image();
  map.pathImg.src = map.pathSrc;

  map.solutionImg = new Image();
  map.solutionImg.src = map.solutionSrc;

  map.tileCols = Math.ceil(map.width / map.tileWidth);
  map.tileRows = Math.ceil(map.height / map.tileHeight);

  const loadBaseMapImg = e => {
    ctx.drawImage(map.solutionImg, 0, 0);
    map.solutionData = ctx.getImageData(0, 0, map.width, map.height).data;

    ctx.drawImage(map.pathImg, 0, 0);
    map.pathData = ctx.getImageData(0, 0, map.width, map.height).data;

    map.pathImg.removeEventListener('load', loadBaseMapImg);

    init();
  };

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
    gameState.update(dt)
  });
  setTimeout(update, TICK);
}

function draw(ts) {
  handleTimer('draw', ts, drawTimer, false, dt => {
    gameState.draw(dt)
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

      if (col >= 0 && row >= 0 && col < map.tileCols && row < map.tileRows) {
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

      if (DEBUG && debugIn.tileGrid) {
        ctx.strokeStyle = (col >= 0 && row >= 0 && col < map.tileCols && row < map.tileRows) ? '#0a0' : '#a00';
        ctx.strokeRect(x, y, map.tileWidth * camera.z, map.tileHeight * camera.z);

        ctx.strokeStyle = '#fff';
        ctx.strokeText(`${row}x${col}`, x + 12, y + 12);
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

    ctx.moveTo(a_path[0][0], a_path[0][1]);
    for (let j = 1; j < a_path.length; j++) {
      ctx.lineTo(a_path[j][0], a_path[j][1]);
    }
    ctx.stroke();
    ctx.restore();
  }
}

function drawArrows(dt) {
  ctx.save();
  ctx.lineWidth = "4";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = map.solutionColor;
  ctx.beginPath();
  ctx.moveTo(map.startArrowButt[0], map.startArrowButt[1]);
  ctx.lineTo(map.startArrowPoint[0], map.startArrowPoint[1]);
  ctx.lineTo(map.startArrowLeftWing[0], map.startArrowLeftWing[1]);
  ctx.moveTo(map.startArrowPoint[0], map.startArrowPoint[1]);
  ctx.lineTo(map.startArrowRightWing[0], map.startArrowRightWing[1]);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(map.endArrowButt[0], map.endArrowButt[1]);
  ctx.lineTo(map.endArrowPoint[0], map.endArrowPoint[1]);
  ctx.lineTo(map.endArrowLeftWing[0], map.endArrowLeftWing[1]);
  ctx.moveTo(map.endArrowPoint[0], map.endArrowPoint[1]);
  ctx.lineTo(map.endArrowRightWing[0], map.endArrowRightWing[1]);
  ctx.stroke();
  ctx.restore();
}

function drawUsedPaths(dt) {
  ctx.save();
  ctx.lineWidth = "4";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = map.solutionColor;
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

  ctx.restore();
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
  player.r = Math.atan2(map.startY - map.startHeadingY, map.startX - map.startHeadingX);
  player.v = 0;
  player.color = 4095;
  player.sprite = {
   rings: [
    { t: 0, delay: 0,   startR: 0, endR: 50, startO: 1.0, endO: 0.0, endT: 3000 },
    { t: 0, delay: 300, startR: 0, endR: 50, startO: 1.0, endO: 0.0, endT: 3000 },
    { t: 0, delay: 600, startR: 0, endR: 50, startO: 1.0, endO: 0.0, endT: 3000 }
   ]
  };
}

const slideAngles = [
  0,
  /*Math.PI * 1/6, -Math.PI * 1/6,
  Math.PI * 1/4, -Math.PI * 1/4,
  Math.PI * 1/3, -Math.PI * 1/3*/
];

function incrementAnimationState() {
  if (openAnimation.animationTimer) {
    window.clearInterval(openAnimation.animationTimer);
    openAnimation.animationTimer = false;
  }
  openAnimation.animationState += 1;
}

function hasKeys(aMapping) {
  return Object.keys(aMapping).length > 0;
}

function abortIntro() {
  if (hasKeys(Input.keys) || hasKeys(Input.gamepad) || Input.touch.active) {
    if (openAnimation.animationTimer) {
      window.clearInterval(openAnimation.animationTimer);
      openAnimation.animationTimer = false;
    }
    openAnimation.animationState = 10;
  }
}

function updatePlayerFromScript(dt) {
  let animationState = openAnimation.animationState;
  abortIntro();
  if (openAnimation.animationState == 0) {
    player.forceZoomIn = true;
    player.x = 7000;
    player.y = 5000;
    if (!openAnimation.animationTimer) {
      openAnimation.animationTimer = window.setInterval(incrementAnimationState, 5000);
    }
  } else if (animationState == 1) {
    player.forceZoomIn = false;

  } else if (animationState == 2) {
    player.r = Math.atan2(map.startY - map.startHeadingY, map.startX - map.startHeadingX);
    player.forceZoomIn = true;
    if (!openAnimation.animationTimer)
      openAnimation.animationTimer = window.setInterval(incrementAnimationState, 1e000);

  } else if (animationState == 3) {
    player.forceZoomIn = true;
    if (!openAnimation.animationTimer)
      openAnimation.animationTimer = window.setInterval(incrementAnimationState, 3000);

  } else if (animationState == 4) {
    player.forceZoomIn = false;

  } else if (animationState == 5) {
    player.r = Math.atan2(map.endHeadingY - map.endY, map.endHeadingX - map.endX);
    player.forceZoomIn = true;
    if (!openAnimation.animationTimer)
      openAnimation.animationTimer = window.setInterval(incrementAnimationState, 3000);

  } else if (animationState == 6) {
    player.forceZoomIn = true;
    if (!openAnimation.animationTimer)
      openAnimation.animationTimer = window.setInterval(incrementAnimationState, 3000);

  } else if (animationState == 7) {
    player.forceZoomIn = false;

  } else if (animationState == 8) {
    player.forceZoomIn = true;
    player.r = Math.atan2(map.startY - map.startHeadingY, map.startX - map.startHeadingX);
    if (!openAnimation.animationTimer) {
      openAnimation.animationTimer = window.setInterval(incrementAnimationState, 4000);
      player.colorOverride = true;
      player.colorHintingTimer = window.setInterval(degradeHintingColor, 200);
    }

  } else if (animationState == 9) {
    if (player.colorHintingTimer) {
      window.clearInterval(player.colorHintingTimer);
      player.colorHintingTimer = false;
      player.colorOverride = false;
    }
    player.forceZoomIn = true;
    if (!openAnimation.animationTimer)
      openAnimation.animationTimer = window.setInterval(incrementAnimationState, 3000);

  } else if (animationState == 10) {
    player.x = map.startX;
    player.y = map.startY;
    player.r = Math.atan2(map.startY - map.startHeadingY, map.startX - map.startHeadingX);
    player.forceZoomIn = true;
    if (!openAnimation.animationTimer) {
      openAnimation.animationTimer = window.setInterval(incrementAnimationState, 2000);
      player.colorOverride = true;
      player.colorHintingTimer = window.setInterval(upgradeHintingColor, 150);
    }

  } else if (animationState == 11) {
    player.forceZoomIn = false;
    if (player.colorHintingTimer) {
      window.clearInterval(player.colorHintingTimer);
      player.colorHintingTimer = false;
      player.colorOverride = false;
    }
    initPlayer();
    camera = gameCameraNoAutoZoom;
    gameState = gamePlay
  }
}

function updatePlayerMotionFromScript(dt) {
  let animationState = openAnimation.animationState;
  if (animationState == 1) {
    let distanceFromStart = distanceFrom(player.x, player.y, map.startX, map.startY);
    player.r = Math.atan2(map.startY - player.y, (map.startX + distanceFromStart / 2.0) - player.x);
    player.v = 0;
    let tx = Math.cos(player.r) * player.maxSpeed * 5 * dt + player.x;
    let ty = Math.sin(player.r) * player.maxSpeed * 5 * dt + player.y;

    if (distanceFrom(tx, ty, map.startX, map.startY) < distanceFrom(tx, ty, player.x, player.y)) {
      tx = map.startX;
      ty = map.startY;
      incrementAnimationState();
    }
    player.x = tx;
    player.y = ty;

  } if (animationState == 4) {
    let distanceFromEnd = distanceFrom(player.x, player.y, map.endX, map.endY);
    player.r = Math.atan2((map.endY + distanceFromEnd / 2.0) - player.y, (map.endX) - player.x);
    player.v = 0;
    let tx = Math.cos(player.r) * player.maxSpeed * 5 * dt + player.x;
    let ty = Math.sin(player.r) * player.maxSpeed * 5 * dt + player.y;

    if (distanceFrom(tx, ty, map.endX, map.endY) < distanceFrom(tx, ty, player.x, player.y)) {
      tx = map.endX;
      ty = map.endY;
      incrementAnimationState();
    }
    player.x = tx;
    player.y = ty;

  } if (animationState == 7) {
    let distanceFromStart = distanceFrom(player.x, player.y, map.startX, map.startY);
    player.r = Math.atan2(map.startY + distanceFromStart / 2.0 - player.y, map.startX - player.x);
    player.v = 0;
    let tx = Math.cos(player.r) * player.maxSpeed * 6 * dt + player.x;
    let ty = Math.sin(player.r) * player.maxSpeed * 6 * dt + player.y;

    if (distanceFrom(tx, ty, map.startX, map.startY) < distanceFrom(tx, ty, player.x, player.y)) {
      tx = map.startX;
      ty = map.startY;
      incrementAnimationState();
    }
    player.x = tx;
    player.y = ty;
  }
}

function drawMessages(dt) {
  let animationState = openAnimation.animationState;
  if (animationState == 0) {
    ctx.save();
    ctx.strokeStyle = '#0bf';
    ctx.fillStyle = '#0bf';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText("The Amazing Firefox", player.x, player.y - 20);
    ctx.strokeStyle = '#fb0';
    ctx.fillStyle = '#fb0';
    ctx.fillText("by   Les Orchard   &   K Lars Lohn", player.x, player.y + 20);
    ctx.fillText("Art by K Lars Lohn", player.x, player.y + 35);
    ctx.restore();
  } else if (animationState == 3) {
    ctx.save();
    ctx.strokeStyle = '#0f0';
    ctx.fillStyle = '#0f0';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText("You're going to start here...", map.startX, map.startY - 42);
    ctx.restore();

  } else if (animationState == 5) {
    ctx.save();
    ctx.strokeStyle = '#0f0';
    ctx.fillStyle = '#0f0';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText("The goal is to exit here.",  map.endX, map.endY - 52);
    ctx.restore();

  } else if (animationState == 6) {
    ctx.save();
    ctx.strokeStyle = '#ff0';
    ctx.fillStyle = '#ff0';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText("You've only got an hour.", map.endX, map.endY - 52);
    ctx.restore();

  } else if (animationState == 8) {
    ctx.save();
    ctx.strokeStyle = '#f00';
    ctx.fillStyle = '#f00';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText("If the cursor gradually turns", map.startX, map.startY - 62);
    ctx.fillText("red, you're on the wrong path", map.startX, map.startY - 42);
    ctx.restore();

  } else if (animationState == 9) {
    ctx.save();
    ctx.strokeStyle = '#ff0';
    ctx.fillStyle = '#ff0';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText("Use <backspace> to return", map.startX, map.startY - 62);
    ctx.fillText("to a numbered breadcrumb", map.startX, map.startY - 42);
    ctx.restore();

  } else if (animationState == 10) {
    ctx.save();
    ctx.strokeStyle = '#0f0';
    ctx.fillStyle = '#0f0';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText("GO!", map.startX, map.startY - 52);
    ctx.restore();

  }
}


function updatePlayerZoom(dt) {
  let zoomInDelta = 0;
  let zoomOutDelta = 0;
  if (player.v !== 0 || player.forceZoomIn) {
    camera.zdelay = camera.zdelaymax;
    camera.z += 0.3;
    if (camera.z > camera.zmax) {
      camera.z = camera.zmax;
    }
  } else {
    if (camera.zdelay > 0) {
      camera.zdelay -= dt;
      return;
    }
    camera.z -= 0.2;
    if (camera.z < camera.zmin) {
      camera.z = camera.zmin;
    }
  }
}

function updatePlayerMotion(dt) {
  let dx = 0;
  let dy = 0;

  if (player.vibrating > 10) {
    var [px, py] = player.vibrateBaseLocation;
  } else {
    var [px, py] = [player.x, player.y];
  }

  let tx = Math.cos(player.r) * player.v * dt + px;
  let ty = Math.sin(player.r) * player.v * dt + py;

  // is the player even moving?
  if (px == tx && py == ty) {
    player.vibrating = 0;
    return;
  }

  //prevent overrun
  dx = tx - px;
  dy = ty - py;
  let largerDelta = Math.max(Math.abs(dx), Math.abs(dy));
  let dxStep = dx / largerDelta;
  let dyStep = dy / largerDelta;

  // check every point along the player path to ensure
  // that no boundary wall was crossed
  let overrunX = px;
  let overrunY = py;
  for (let i = 1; i <= largerDelta ; i++) {
    let testX = Math.round(dxStep * i + px);
    let testY = Math.round(dyStep * i + py);
    if (isPassableAt(testX, testY)) {
      overrunX = testX;
      overrunY = testY;

    } else {
      tx = overrunX;
      ty = overrunY;

      break;
    }
  }

  [tx, ty] = suggestBetter(tx, ty);
  if (!isPassableAt(tx, ty)) return;

  // stop vibration
  let vdx = Math.abs(player.x - tx);
  let vdy = Math.abs(player.y - ty);
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

function distanceFrom(x1, y1, x2, y2) {
  return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
}

function suggestBetter(x, y) {
  var i;
  var xAxis = [
    [x-4, isPassableAt(x-4, y)],
    [x-3, isPassableAt(x-3, y)],
    [x-2, isPassableAt(x-2, y)],
    [x-1, isPassableAt(x-1, y)],
    [x,   isPassableAt(x,   y)],
    [x+1, isPassableAt(x+1, y)],
    [x+2, isPassableAt(x+2, y)],
    [x+3, isPassableAt(x+3, y)],
    [x+4, isPassableAt(x+4, y)],
  ];
  for (i = 4; i >= 0; i--)
    if (!xAxis[i][1])
      break;
  let lowX = i;
  for (i = 4; i < xAxis.length; i++)
    if (!xAxis[i][1])
      break;
  let highX = i;
  let middleX =  Math.trunc((highX - lowX) / 2 + lowX);

  var yAxis = [
    [y-4, isPassableAt(xAxis[middleX][0], y-4)],
    [y-3, isPassableAt(xAxis[middleX][0], y-3)],
    [y-2, isPassableAt(xAxis[middleX][0], y-2)],
    [y-1, isPassableAt(xAxis[middleX][0], y-1)],
    [y,   isPassableAt(xAxis[middleX][0], y)],
    [y+1, isPassableAt(xAxis[middleX][0], y+1)],
    [y+2, isPassableAt(xAxis[middleX][0], y+2)],
    [y+3, isPassableAt(xAxis[middleX][0], y+3)],
    [y+4, isPassableAt(xAxis[middleX][0], y+4)],
  ];
  for (i = 4; i >= 0; i--)
    if (!yAxis[i][1])
      break;
  let lowY = i;
  for (i = 4; i < xAxis.length; i++)
    if (!yAxis[i][1])
      break;
  let highY = i;
  let middleY =  Math.trunc((highY - lowY) / 2 + lowY);
  let betterX = xAxis[middleX][0];
  let betterY = yAxis[middleY][0];

  if (lowY == -1 && lowX == -1 && highX == 9 && highY == 9 && player.breadcrumb_stack.noCloser(betterX, betterY, 50, 15)) {
     player.breadcrumb_stack.push([betterX, betterY]);
  }

  return [betterX, betterY];
}

function degradeHintingColor() {
  if (player.color > 3840) {
    player.color -= 17;
  }
}

function upgradeHintingColor() {
  if (player.color < 4094) {
    player.color += 17;
  }
}

function drawPlayer(dt) {
  let inSolutionPath = getPixelAvgAt(player.x, player.y, map.solutionData) != 0;

  if (player.colorHinting && !player.colorHintingTimer && !inSolutionPath && !player.colorOverride) {
    // degrade the player color every 60 seconds with a timer
    player.colorHintingTimer = window.setInterval(degradeHintingColor, 20000);
  }
  if (player.colorHintingTimer && inSolutionPath && !player.colorOverride) {
    // the player has moved back onto a solution path
    // kill the timer and restore the color
    window.clearInterval(player.colorHintingTimer);
    player.colorHintingTimer = false;
    player.color = 4095;
  }

  let color_str = "#".concat(player.color.toString(16));
  ctx.strokeStyle = color_str;
  ctx.fillStyle = color_str;

  //ctx.fillText(lars_sez + " " + camera.z.toString(), player.x, player.y - 10);

  var drawR = player.r;

  if (player.v != 0) {
    // Try coming up with a short travel history segment for a
    // smoothed avatar rotation
    player.x_history.unshift(player.x);
    player.y_history.unshift(player.y);
    if (player.x_history.length > 20) {
      player.x_history.pop();
    }
    if (player.y_history.length > 20) {
      player.y_history.pop();
    }
    drawR = Math.atan2(
      player.y_history[0] - player.y_history[player.y_history.length - 1],
      player.x_history[0] - player.x_history[player.x_history.length - 1]
    );
  } else if (player.x_history.length) {
    // if the player is not moving, the history is irrelevant
    player.x_history.pop();
    player.y_history.pop();
  }


  // Draw a little arrowhead avatar
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(drawR);
  ctx.lineWidth = '1.5';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(5, 0);
  ctx.lineTo(-5, 5);
  ctx.lineTo(0, 0);
  ctx.lineTo(-5, -5);
  ctx.lineTo(5, 0);
  ctx.stroke();
  ctx.fill();
  ctx.restore();

  // When we're zoomed out, animate a ripple to call attention to the avatar.
  if (camera.z < 0.8) {
    player.sprite.rings.forEach(ring => {
      if (ring.delay > 0) { return ring.delay -= dt; }

      ring.t += dt;
      if (ring.t >= ring.endT) { ring.t = 0; }

      ctx.save();
      ctx.beginPath();
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = lerp(ring.startO, ring.endO, ring.t / ring.endT);
      ctx.arc(player.x, player.y,
              lerp(ring.startR, ring.endR, ring.t / ring.endT),
              0, PI2);
      ctx.stroke();
      ctx.restore();
    });
  }
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



// Commands to implement
// ATTENTION  -- continuous
// MOVE direction, speed-factor  -- continuous
// BACKUP [breadcrumb-number]  -- single
// ZOOM up-down-int -- continuous
// AUTOZOOM on-off -- single
// SAVE  -- single
// QUIT  -- single

// input sources
// KEYBOARD
// MOUSE
// GAME-CONTROLLER
// TOUCH
// MOTION


/*
Each method of fetching data from the user has its own section below.  They are considered
indepentently in turn.  Each section interprets its input type and translates into commands.
Once each has completed the task. the commands are merged into one command object and those
are executed.
*/

// Keyboard Section

const KeyboardCommands = {
  name: 'keyboard',
  attention: false,
  moveDirection: 0,
  moveSpeedFactor: 0,
  backup: false,
  zoom: false,
  auto_zoom: false,
  save: false,
  quit: false,
};

function createKeyboardCommands (dt, playerX, playerY, camera) {
  KeyboardCommands.attention = false;
  KeyboardCommands.moveDirection = false;
  KeyboardCommands.moveSpeedFactor = false;
  KeyboardCommands.backup = false;
  KeyboardCommands.autozoom = false;
  KeyboardCommands.save = false;

  // Query cursor keys & WASD
  const dleft  = (Input.keys[65] || Input.keys[37]);
  const dright = (Input.keys[68] || Input.keys[39]);
  const dup    = (Input.keys[87] || Input.keys[38]);
  const ddown  = (Input.keys[83] || Input.keys[40]);
  const dir = (dup ? 'u' : (ddown ? 'd' : '')) +
    (dleft ? 'l' : (dright ? 'r' : ''));

  if (dir) {
    KeyboardCommands.moveDirection = directions[dir];
    KeyboardCommands.moveSpeedFactor = 1;
    KeyboardCommands.attention = true;
  } else {
    KeyboardCommands.moveDirection = false;
    KeyboardCommands.moveSpeedFactor = false;
  }

  if (Input.keys[8]) {
    KeyboardCommands.attention = true;
    KeyboardCommands.backup = true;
    delete Input.keys[8]
  }
  if (Input.keys[46]) {
    KeyboardCommands.attention = true;
    KeyboardCommands.backup = true;
    delete Input.keys[46]}

  if (Input.keys[90]) {  // Z key
    KeyboardCommands.attention = true;
    KeyboardCommands.auto_zoom = true;
    delete Input.keys[90]}

  // TODO: keyboard command for zoom
  // TODO: keyboard command for save
  // TODO: keyboard command for quit

}

// Mouse section

const MouseCommands = {
  name: 'mouse',
  attention: false,
  moveDirection: 0,
  moveSpeedFactor: 0,
  backup: false,
  zoom: false,
  auto_zoom: false,
  save: false,
  quit: false,
};

function createMouseCommands (dt, playerX, playerY, camera) {
  MouseCommands.attention = false;
  MouseCommands.moveSpeedFactor = false;
  MouseCommands.moveDirection = false;
  MouseCommands.backup = false;
  MouseCommands.auto_zoom = false;
  if (Input.mouse.down) {
    const mx = playerX - (ctx.canvas.width / 2 / camera.z) + (Input.mouse.x / camera.z);
    const my = playerY - (ctx.canvas.height / 2 / camera.z) + (Input.mouse.y / camera.z);
    let distance = distanceFrom(playerX, playerY, mx, my);
    if (distance > 40) distance = 40;
    MouseCommands.moveSpeedFactor = distance / 40;
    MouseCommands.moveDirection = Math.atan2(my - playerY, mx - playerX);
    MouseCommands.attention = true;
  }

  // TODO: mouse command for zoom
  // TODO: mouse command for autozoom
  // TODO: mouse command for save
  // TODO: mouse command for quit

}

// game controller section

const GameControllerCommands = {
  name: 'game-controller',
  attention: false,
  moveDirection: 0,
  moveSpeedFactor: 0,
  backup: false,
  zoom: false,
  auto_zoom: false,
  save: false,
  quit: false,
};

function createGameControllerCommands (dt, playerX, playerY, camera) {
  GameControllerCommands.attention = false;
  GameControllerCommands.moveSpeedFactor = false;
  GameControllerCommands.moveDirection = false;
  GameControllerCommands.backup = false;
  GameControllerCommands.auto_zoom = false;

  if (Object.keys(Input.gamepad).length) GameControllerCommands.attention = true;

  const dleft = Input.gamepad.button13;
  const dright = Input.gamepad.button14;
  const dup = Input.gamepad.button11;
  const ddown = Input.gamepad.button12;
  const dir = (dup ? 'u' : (ddown ? 'd' : '')) +
    (dleft ? 'l' : (dright ? 'r' : ''));
  if (dir) { // movement
    GameControllerCommands.moveDirection = directions[dir];
    GameControllerCommands.moveSpeedFactor = 1;
    GameControllerCommands.attention = true;
  } else {
    GameControllerCommands.moveDirection = false;
    GameControllerCommands.moveSpeedFactor = 0;
  }
  if (Input.gamepad.button6 || Input.gamepad.button2) {
    if (typeof Input.gamepad.backup == "undefined") {
      Input.gamepad.backup = true;
      GameControllerCommands.backup = true;
    }
  } else if (typeof Input.gamepad.backup != "undefined")
    delete Input.gamepad.backup;

  if (Input.gamepad.button3) {
    if (typeof Input.gamepad.auto_zoom == "undefined") {
      Input.gamepad.auto_zoom = true;
      GameControllerCommands.auto_zoom = true;
    }

  } else if (typeof Input.gamepad.auto_zoom != "undefined")
    delete Input.gamepad.auto_zoom;


    if (typeof(Input.gamepad.axis0) != 'undefined' && typeof(Input.gamepad.axis1) != 'undefined') {
    // Gamepad analog stick for rotation & velocity
    const jx = Math.abs(Input.gamepad.axis0) > 0.2 ? Input.gamepad.axis0 : 0;
    const jy = Math.abs(Input.gamepad.axis1) > 0.2 ? Input.gamepad.axis1 : 0;
    if (Math.abs(jx) > 0 || Math.abs(jy) > 0) {
      GameControllerCommands.attention = true;
      GameControllerCommands.moveSpeedFactor = 1; // TODO: velocity from stick intensity?
      GameControllerCommands.moveDirection = Math.atan2(Input.gamepad.axis1, Input.gamepad.axis0);
    }
  }
  // TODO: game controller command for backup
  // TODO: game controller command for zoom
  // TODO: game controller command for autozoom
  // TODO: game controller command for save
  // TODO: game controller command for quit
}


// touch section

const TouchCommands = {
  name: 'touch',
  attention: false,
  moveDirection: 0,
  moveSpeedFactor: 0,
  backup: false,
  zoom: false,
  auto_zoom: false,
  save: false,
  quit: false,
};

function createTouchCommands (dt, playerX, playerY, camera) {
  TouchCommands.attention = false;
  TouchCommands.moveSpeedFactor = false;
  TouchCommands.moveDirection = false;
  TouchCommands.backup = false;
  TouchCommands.auto_zoom = false;
  TouchCommands.zoom = false;
  let timestamp = Date.now();
  let touches = Object.keys(Input.touchEventTracker);
  if (touches.length == 1) {  // move command
    const mx = playerX - (ctx.canvas.width / 2 / camera.z) + (Input.touchEventTracker[touches[0]].x / camera.z);
    const my = playerY - (ctx.canvas.height / 2 / camera.z) + (Input.touchEventTracker[touches[0]].y / camera.z);
    let distance = distanceFrom(playerX, playerY, mx, my);
    if (distance > 40) distance = 40;
    TouchCommands.attention = true;
    TouchCommands.moveSpeedFactor = distance / 40;
    TouchCommands.moveDirection = Math.atan2(my - playerY, mx - playerX);

  } else if (touches.length == 2) { // zoom or backup command
    TouchCommands.attention = true;
    let first = Input.touchEventTracker[touches[0]];
    let second = Input.touchEventTracker[touches[1]];
    let changeInDistanceFromStart = distanceFrom(first.x, first.y, second.x, second.y) - distanceFrom(first.xStart, first.yStart, second.xStart, second.yStart);
    if (Math.abs(changeInDistanceFromStart) > 10)
      TouchCommands.zoom = changeInDistanceFromStart;

    if (first.ended || second.ended) // it was a 2 finger tap
      if (timestamp - first.timestamp < 1000 && Math.abs(changeInDistanceFromStart) < 10) {
        TouchCommands.backup = true;
      }
  } else if (touches.length == 3) {  // auto_zoom command
    TouchCommands.attention = true;
    TouchCommands.auto_zoom = true;
  }

  // kill the ended touch trackers
  let n = 0;
  for (let i = 0; i < touches.length; i++) {
    if (Input.touchEventTracker[touches[i]].ended) {
      delete Input.touchEventTracker[touches[i]];
    }
  }
}

// movement / gyroscope / shake section

const MovementCommands = {
  name: 'movement',
  attention: false,
  moveDirection: false,
  moveSpeedFactor: false,
  backup: false,
  zoom: false,
  auto_zoom: false,
  save: false,
  quit: false,
};

function createMovementCommands (dt, playerX, playerY, camera) {
  // TODO: movement command for moving
  // TODO: movement command for backup
  // TODO: movement command for zoom
  // TODO: movement command for autozoom
  // TODO: movement command for save
  // TODO: movement command for quit

}


// consolidate commands section

function mergeCommands(candidate, target) {
  if (candidate.attention) {
    target.attention = candidate.attention ? candidate.attention : target.attention;
    target.moveDirection = candidate.moveDirection ? candidate.moveDirection : target.moveDirection;
    target.moveSpeedFactor = candidate.moveSpeedFactor ? candidate.moveSpeedFactor : target.moveSpeedFactor;
    target.backup = candidate.backup ? candidate.backup : target.backup;
    target.auto_zoom = candidate.auto_zoom ? candidate.auto_zoom : target.auto_zoom;
    target.zoom = candidate.zoom ? candidate.zoom : target.zoom;
    target.save = candidate.save ? candidate.save : target.save;
    target.quit = candidate.quit ? candidate.quit : target.quit;
  }
}

const InputCommandFunctions = [ createKeyboardCommands,  createMouseCommands, createGameControllerCommands, createTouchCommands, createMovementCommands ];
const InputCommands = [ KeyboardCommands , MouseCommands , GameControllerCommands, TouchCommands, MovementCommands  ];

var Commands = {
  attention: false,
  moveDirection: false,
  moveSpeedFactor: false,
  backup: false,
  zoom: false,
  auto_zoom: false,
  save: false,
  quit: false,
};

function getCurrentCommands(dt, player, currentCamera) {

  Commands.attention = false;
  Commands.moveDirection = false;
  Commands.moveSpeedFactor = false;
  Commands.auto_zoom = false;
  Commands.backup = false;
  Commands.zoom = false;

  Input.update(dt);
  InputCommandFunctions.forEach(e =>  e(dt, player.x, player.y, currentCamera));
  InputCommands.forEach(e => mergeCommands(e, Commands));
  if (Commands.moveSpeedFactor) {
    player.v = player.maxSpeed * Commands.moveSpeedFactor;
    player.r = Commands.moveDirection;
  } else {
    player.v = 0;
  }
  if (Commands.backup) {
    if (player.breadcrumb_stack.stack.length > 0) {
      player.used_paths.push(player.current_path);
      [player.x, player.y] = player.breadcrumb_stack.pop();
      player.current_path = [[player.x, player.y]];
    }
  }
  if (Commands.zoom) {
    try {
      if (currentCamera.referenceZ == false)   // == false because must disambiguate from case 0
        currentCamera.referenceZ = currentCamera.z;
      lars_sez = currentCamera.referenceZ.toString() + " " + (1 + Commands.zoom / 500).toString();
      currentCamera.z = currentCamera.referenceZ * (1 + Commands.zoom / 500);
      currentCamera.zmin = currentCamera.z;
      currentCamera.zmax = currentCamera.z;

    } catch (err) {
      console.log(err.toString());
    }
  } else
    camera.referenceZ = false;
  if (Commands.auto_zoom) {
    camera = (camera == gameCameraNoAutoZoom) ? gameCameraWithAutoZoom : gameCameraNoAutoZoom;
    currentCamera = camera;
  }

}





// Linear interpolation from v0 to v1 over t[0..1]
function lerp(v0, v1, t) {
  return (1-t)*v0 + t*v1;
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

  const fdebug = gui.addFolder('debug');
  fdebug.open();
  listenAll(fdebug, debugIn);
  listenAll(fdebug, debugOut);

  const ftouch = gui.addFolder('touch');
  // ftouch.open();
  listenAll(ftouch, Input.touch);

  const fplayer = gui.addFolder('player');
  fplayer.open();
  listenAll(fplayer, player, ['x', 'y', 'r', 'v', 'color', 'colorHinting', 'vibrating']);

  const fcamera = gui.addFolder('camera');
  // fcamera.open();
  listenAll(fcamera, camera, ['x', 'y', 'z', 'zdelay']);

  const fmouse = gui.addFolder('mouse');
  // fmouse.open();
  listenAll(fmouse, Input.mouse);
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
