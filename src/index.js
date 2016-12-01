/**
 * fx-maze
 *
 * TODO: see https://github.com/lmorchard/fx-maze/issues
 */
import Dat from 'dat-gui';
import Stats from 'stats.js';

import { requestAnimFrame } from './lib/utils';
import Input from './lib/input';

// Constants
const DEBUG = false;
const TICK = 1000 / 60;
const PI2 = Math.PI * 2;

// Utilities Section

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

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
}

// TODO: Load this from an external JSON URL for Issue #13
const greenMap = {
  name: 'green',

  baseMapTilePath: 'mazes/Firefox',
  tileWidth: 500, tileHeight: 500,
  width: 4000, height: 4000,
  numberOfTileRows: Math.ceil(4000 / 500),
  numberOfTileColumns: Math.ceil(4000 / 500),
  tiles: {},

  pathSrc: 'mazes/Firefox.green.png',
  solutionColor: "#0f0",
  pathData: [],

  startX: 499, startY: 430,
  // startX: 3258, startY: 435,  // a start very near the end

  startHeadingX: 509, startHeadingY: 420,
  startArrowButt: [530,397],
  startArrowPoint: [509, 420],
  startArrowLeftWing: [522, 419],
  startArrowRightWing: [509, 407],
  startMessageBase: [509, 420],

  endX: 3258, endY: 430,
  endHeadingX: 3256, endHeadingY: 417,
  endArrowButt: [3256, 417],
  endArrowPoint: [3256, 385],
  endArrowLeftWing: [3247,396],
  endArrowRightWing: [3265, 397],
  endMessageBase: [3256, 417],

  cheatX: 3280,
  cheatY: 468,
};

const greenMapBackwards = {
  name: 'green-backwards',

  baseMapTilePath: greenMap.baseMapTilePath,
  tileWidth: greenMap.tileWidth, tileHeight: greenMap.tileHeight,
  width: greenMap.width, height: greenMap.height,
  numberOfTileRows: greenMap.numberOfTileRows,
  numberOfTileColumns: greenMap.numberOfTileColumns,
  tiles: greenMap.tiles,

  pathSrc: 'mazes/Firefox.green.png',
  solutionColor: "#0f0",
  pathData: [],

  startX: 3258, startY: 430,
  startHeadingX: 3258, startHeadingY: 417,
  startArrowButt: [3259, 385],
  startArrowPoint: [3258, 417],
  startArrowLeftWing: [3249, 407],
  startArrowRightWing: [3266, 408],
  startMessageBase: [3258, 417],

  endX: 499, endY: 430,
  endHeadingX: 509, endHeadingY: 420,
  endArrowButt: [509, 420],
  endArrowPoint: [530, 397],
  endArrowLeftWing: [515,399],
  endArrowRightWing: [529, 413],
  endMessageBase: [509, 420],

  cheatX: 476,
  cheatY: 468,
};

const redMap = {
  name: 'red',

  baseMapTilePath: greenMap.baseMapTilePath,
  tileWidth: greenMap.tileWidth, tileHeight: greenMap.tileHeight,
  width: greenMap.width, height: greenMap.height,
  numberOfTileRows: greenMap.numberOfTileRows,
  numberOfTileColumns: greenMap.numberOfTileColumns,
  tiles: greenMap.tiles,

  pathSrc: 'mazes/Firefox.red.png',
  solutionColor: "#f00",
  pathData: greenMap.pathData,

  startX: 486, startY: 424,
  startHeadingX: 490, startHeadingY: 410,
  startArrowButt: [498, 380],
  startArrowPoint: [490, 410],
  startArrowLeftWing: [501, 403],
  startArrowRightWing: [485, 398],
  startMessageBase: [490, 410],

  endX: 3228, endY: 428,
  endHeadingX: 3214, endHeadingY: 416,
  endArrowButt: [3214, 416],
  endArrowPoint: [3190, 393],
  endArrowLeftWing: [3192,408],
  endArrowRightWing: [3204, 395],
  endMessageBase: [3214, 416],

  cheatX: 3261,
  cheatY: 458,
};

const redMapBackwards = {
  name: 'red-backwards',

  baseMapTilePath: greenMap.baseMapTilePath,
  tileWidth: greenMap.tileWidth, tileHeight: greenMap.tileHeight,
  width: greenMap.width, height: greenMap.height,
  numberOfTileRows: greenMap.numberOfTileRows,
  numberOfTileColumns: greenMap.numberOfTileColumns,
  tiles: greenMap.tiles,

  pathSrc: 'mazes/Firefox.red.png',
  solutionColor: "#f00",
  pathData: greenMap.pathData,

  startX: 3228, startY: 428,
  startHeadingX: 3214, startHeadingY: 416,
  startArrowButt: [3190, 393],
  startArrowPoint: [3214, 416],
  startArrowLeftWing: [3212,401],
  startArrowRightWing: [3200, 415],
  startMessageBase: [3214, 416],

  endX: 486, endY: 424,
  endHeadingX: 490, endHeadingY: 410,
  endArrowButt: [490, 410],
  endArrowPoint: [498, 380],
  endArrowLeftWing: [487, 388],
  endArrowRightWing: [505, 392],
  endMessageBase: [490, 410],

  cheatX: 436,
  cheatY: 479,
};

const violetMap = {
  name: 'violet',

  baseMapTilePath: greenMap.baseMapTilePath,
  tileWidth: greenMap.tileWidth, tileHeight: greenMap.tileHeight,
  width: greenMap.width, height: greenMap.height,
  numberOfTileRows: greenMap.numberOfTileRows,
  numberOfTileColumns: greenMap.numberOfTileColumns,
  tiles: greenMap.tiles,

  pathSrc: 'mazes/Firefox.violet.png',
  solutionColor: "#e0f",
  pathData: greenMap.pathData,

  startX: 2802, startY: 212,
  startHeadingX: 2816, startHeadingY: 212,
  startArrowButt: [2843, 192],
  startArrowPoint: [2816, 206],
  startArrowLeftWing: [2830, 209],
  startArrowRightWing: [2822, 194],
  startMessageBase: [2822, 194], // shift up & right to avoid end arrow

  endX: 2776, endY: 200,
  endHeadingX: 2757, endHeadingY: 206,
  endArrowButt: [2770, 187],
  endArrowPoint: [2757, 159],
  endArrowLeftWing: [2751,171],
  endArrowRightWing: [2769, 163],
  endMessageBase: [2770, 187],

  cheatX: 2742,
  cheatY: 205,
};

const blueMap = {
  name: 'blue',

  baseMapTilePath: greenMap.baseMapTilePath,
  tileWidth: greenMap.tileWidth, tileHeight: greenMap.tileHeight,
  width: greenMap.width, height: greenMap.height,
  numberOfTileRows: greenMap.numberOfTileRows,
  numberOfTileColumns: greenMap.numberOfTileColumns,
  tiles: greenMap.tiles,

  pathSrc: 'mazes/Firefox.blue.png',
  solutionColor: "#2ee",
  pathData: greenMap.pathData,

  startX: 2776, startY: 200,
  startHeadingX: 2770, startHeadingY: 187,
  startArrowPoint: [2770, 187],
  startArrowButt: [2757, 159],
  startArrowLeftWing: [2773, 174],
  startArrowRightWing: [2757, 181],
  startMessageBase: [2776, 187],

  endX: 2881, endY: 3822,
  endHeadingX: 2881, endHeadingY: 3833,
  endArrowButt: [2881, 3833],
  endArrowPoint: [2880, 3854],
  endArrowLeftWing: [2873,3846],
  endArrowRightWing: [2887, 3847],
  endMessageBase: [2881, 3933], // shift way down to print under arrow

  cheatX: 2913,
  cheatY: 3785,
};

// repeats in the possibleMaps variable are to make some solutions rarer than others
const possibleMaps = [greenMap, greenMap, greenMap, greenMap, redMap, redMap, redMap, redMapBackwards, greenMapBackwards, blueMap, blueMap, violetMap ];
var map = possibleMaps[getRandomInt(0, possibleMaps.length)];
// map = greenMap;

const animationStartPoints = [[5000, 4000], [-1000, -1000], [0, 5000], [5000, -500]];
const animationStartPoint = animationStartPoints[getRandomInt(0, animationStartPoints.length)];

// the game has states:
//    gamePlay -- in this state the user has control of the cursor
//    openAnimation -- used at the beginning where the movement of the cursor is scripted
//    endAnimation -- used ath the end of the game when a maze is solved

// gamePlay -- the event loops for user game control and screen display
const gamePlay = {
  animationState: false,
  do_redraw: false,

  // it is more efficient to use exact integer pixel positions when drawing
  // however, that can make the player position appear to be shaky.  This is
  // especially apparent during animations.  When the player is being drawn,
  // the drawPlayer routine will look to the current gameState to decide if
  // the player should be drawn at an integer pixel location or go ahead
  // and use the floating point position.  In the gameplay, we're choosing
  // to use the rounded integer position to speed rendering.  Contrast this
  // with the code for the openAnimation state.
  playerPositionHeuristic(singleAxisPosition) {
    return (camera.z >= 1.5) ? singleAxisPosition : Math.round(singleAxisPosition);
  },

  // this is the body of the update event loop.  It's duties are all related to controlling
  // the player - getting commands, updating the player location

  update(dt) {
    if (DEBUG) { statsUpdate.begin(); }

    getCurrentCommands(dt, player, camera);
    actOnCurrentCommands(dt, player, camera);
    updatePlayerZoom(dt);
    updatePlayerMotion(dt);
    updateDebug();
    if (distanceFrom(player.x, player.y, map.endX, map.endY) < 4) {
      gameState = endAnimation;
      camera = endAnimationCamera;
    }
    if (DEBUG) { statsUpdate.end(); }
  },

  // this is the body of the draw event loop - it is run once for each frame displayed
  draw(dt) {
    if (DEBUG) { statsDraw.begin(); }
    if (this.do_redraw) {
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
      if (DEBUG) {
        statsDraw.end();
      }
    }
    this.do_redraw = false;
  },

};

// openAnimation -- this is the code used in the event loops when the opening
// animation is running.
const openAnimation = {
  animationState: "open_credits",
  animationTimer: false,
  do_redraw: true,

  // when the player aborts an animation, the animation must shutdown in an
  // orderly manner.  This constant identifies the shutdown state to jump to
  // during an abort
  endAnimationState: "end_of_start_animation",

  // it is more efficient to use exact integer pixel positions when drawing
  // however, that can make the player position appear to be shaky.  This is
  // especially apparent during animations.  When the player is being drawn,
  // the drawPlayer routine will look to the current gameState to decide if
  // the player should be drawn at an exact integer pixel location or go ahead
  // and use the floating point position.  In this animation, we're choosing
  // to use the exact floating point position.  Contrast this with the
  // code for the gamePlay state.
  playerPositionHeuristic(singleAxisPosition) { return singleAxisPosition; },


  // the body of the update event loop during an animation
  update(dt) {
    if (DEBUG) { statsUpdate.begin(); }
    camera = animationCamera;
    // we get commands, but don't act on them
    // this allows any input to interrupt the opening animation
    getCurrentCommands(dt, player, camera);
    updatePlayerZoom(dt);
    updatePlayerFromScript(dt);
    updateDebug();
    if (
      DEBUG) { statsUpdate.end(); }
  },

  // the body of the draw event loop during animation
  draw(dt) {
    if (DEBUG) { statsDraw.begin(); }
    if (gameState.do_redraw) {
      clearCanvas();
      ctx.save();
      drawMaze(dt);
      followAndZoom(dt);
      drawArrows(dt);
      drawAnimationFrame(dt);
      drawPlayer(dt);
      ctx.restore();
      drawDebug(dt);
      if (DEBUG) {
        statsDraw.end();
      }
    }
  },

  advanceInternalState (nextState) {
    if (this.animationTimer) {
      window.clearInterval(this.animationTimer);
      this.animationTimer = false;
    }
    this.animationState = nextState;
  },

  open_credits(dt) {
    if (!this.animationTimer) {
      player.forceZoomIn = true;
      player.x = animationStartPoint[0];
      player.y = animationStartPoint[1];
      this.animationTimer = window.setInterval(() => this.advanceInternalState('fly_to_start'), 5000);
      this.do_redraw = true;
    }
  },
  open_credits_draw(dt) {
    ctx.save();
    ctx.strokeStyle = '#0bf';
    ctx.fillStyle = '#0bf';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText("The Firefox Maze", player.x, player.y - 20);
    ctx.strokeStyle = '#fb0';
    ctx.fillStyle = '#fb0';
    ctx.fillText("by   Les Orchard   &   K Lars Lohn", player.x, player.y + 20);
    ctx.fillText("Art by K Lars Lohn", player.x, player.y + 35);
    ctx.fillText("Firefox® by Mozilla", player.x, player.y + 50);
    ctx.restore();
    this.do_redraw = false;
  },

  fly_to_start(dt) {
    player.forceZoomIn = false;
    this.do_redraw = true;

    let distanceFromStart = distanceFrom(player.x, player.y, map.startX, map.startY);
    player.r = Math.atan2(map.startY - player.y, (map.startX + distanceFromStart / 2.0) - player.x);
    player.v = 0;
    let tx = Math.cos(player.r) * player.maxSpeed * 5 * dt + player.x;
    let ty = Math.sin(player.r) * player.maxSpeed * 5 * dt + player.y;

    if (distanceFrom(tx, ty, map.startX, map.startY) < distanceFrom(tx, ty, player.x, player.y)) {
      tx = map.startX;
      ty = map.startY;
      this.animationState = "pause_a_second";
    }
    player.x = tx;
    player.y = ty;
  },
  fly_to_start_draw(dt) {
  },

  pause_a_second(dt) {
    if (!this.animationTimer) {
      player.r = Math.atan2(map.startY - map.startHeadingY, map.startX - map.startHeadingX);
      player.forceZoomIn = true;
      this.animationTimer = window.setInterval(() => this.advanceInternalState('start_message'), 1000);
      this.do_redraw = true;
    }
  },
  pause_a_second_draw(dt){
    this.do_redraw = false;
  },

  start_message(dt) {
    if (!this.animationTimer) {
      player.forceZoomIn = true;
      this.animationTimer = window.setInterval(() => this.advanceInternalState('fly_to_end'), 3000);
      this.do_redraw = true;
    }
  },
  start_message_draw(dt) {
    ctx.save();
    ctx.strokeStyle = '#0f0';
    ctx.fillStyle = '#0f0';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText("You're going to start here...", map.startMessageBase[0], map.startMessageBase[1] - 42);
    ctx.restore();
    this.do_redraw = false;
  },

  fly_to_end(dt) {
    player.forceZoomIn = false;
    this.do_redraw = true;

    let distanceFromEnd = distanceFrom(player.x, player.y, map.endX, map.endY);
    player.r = Math.atan2((map.endY + distanceFromEnd / 2.0) - player.y, (map.endX) - player.x);
    player.v = 0;
    let tx = Math.cos(player.r) * player.maxSpeed * 5 * dt + player.x;
    let ty = Math.sin(player.r) * player.maxSpeed * 5 * dt + player.y;

    if (distanceFrom(tx, ty, map.endX, map.endY) < distanceFrom(tx, ty, player.x, player.y)) {
      tx = map.endX;
      ty = map.endY;
      this.animationState = "end_message_one";
    }
    player.x = tx;
    player.y = ty;
  },
  fly_to_end_draw(dt) {
  },

  end_message_one(dt){
    if (!this.animationTimer) {
      player.r = Math.atan2(map.endHeadingY - map.endY, map.endHeadingX - map.endX);
      player.forceZoomIn = true;
      this.animationTimer = window.setInterval(() => this.advanceInternalState('end_message_two'), 3000);
      this.do_redraw = true;
    }
  },
  end_message_one_draw(dt) {
    ctx.save();
    ctx.strokeStyle = '#0f0';
    ctx.fillStyle = '#0f0';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText("The goal is to exit here.",  map.endMessageBase[0], map.endMessageBase[1] - 52);
    ctx.restore();
    this.do_redraw = false;
  },

  end_message_two(dt){
    if (!this.animationTimer){
      player.forceZoomIn = true;
      this.animationTimer = window.setInterval(() => this.advanceInternalState('fly_back_to_start'), 3000);
      this.do_redraw = true;
    }
  },
  end_message_two_draw(dt) {
    ctx.save();
    ctx.strokeStyle = '#ff0';
    ctx.fillStyle = '#ff0';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText("Take all the time you need...", map.endMessageBase[0], map.endMessageBase[1] - 52);
    ctx.restore();
    this.do_redraw = false;
  },

  fly_back_to_start(dt) {
    this.do_redraw = true;
    player.forceZoomIn = false;
    let distanceFromStart = distanceFrom(player.x, player.y, map.startX, map.startY);
    player.r = Math.atan2(map.startY + distanceFromStart / 2.0 - player.y, map.startX - player.x);
    player.v = 0;
    let tx = Math.cos(player.r) * player.maxSpeed * 6 * dt + player.x;
    let ty = Math.sin(player.r) * player.maxSpeed * 6 * dt + player.y;

    if (distanceFrom(tx, ty, map.startX, map.startY) < distanceFrom(tx, ty, player.x, player.y)) {
      tx = map.startX;
      ty = map.startY;
      this.animationState = "start_message_cursor_message_one";
    }
    player.x = tx;
    player.y = ty;
  },
  fly_back_to_start_draw(dt) {
  },

  start_message_cursor_message_one(dt) {
    player.forceZoomIn = true;
    player.r = Math.atan2(map.startY - map.startHeadingY, map.startX - map.startHeadingX);
    if (!this.animationTimer) {
      this.animationTimer = window.setInterval(() => this.advanceInternalState('start_message_cursor_message_two'), 4000);
      player.colorOverride = true;
      player.colorHintingTimer = window.setInterval(degradeHintingColor, 200);
      this.do_redraw = true;
    }
  },
  start_message_cursor_message_one_draw(dt) {
    ctx.save();
    ctx.strokeStyle = '#f00';
    ctx.fillStyle = '#f00';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText("If the cursor gradually turns", map.startMessageBase[0], map.startMessageBase[1] - 62);
    ctx.fillText("red, you're on the wrong path", map.startMessageBase[0], map.startMessageBase[1] - 42);
    ctx.restore();
    this.do_redraw = true;  // we want to see the cusor change color
  },

  start_message_cursor_message_two(dt) {
    player.forceZoomIn = true;
    if (!this.animationTimer) {
      this.animationTimer = window.setInterval(() => this.advanceInternalState('go'), 5000);
      player.colorOverride = true;
      player.colorHintingTimer = window.setInterval(upgradeHintingColor, 150);
      this.do_redraw = true;
    }
  },
  start_message_cursor_message_two_draw(dt) {
    ctx.save();
    ctx.strokeStyle = '#ff0';
    ctx.fillStyle = '#ff0';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText("Jump back to the numbered", map.startMessageBase[0], map.startMessageBase[1] - 57);
    ctx.fillText("breadcrumbs until it turns white again", map.startMessageBase[0], map.startMessageBase[1] - 42);
    ctx.restore();
    this.do_redraw = true;  // we want to see the cusor change color
  },

  go(dt) {
    player.forceZoomIn = false;
    player.x = map.startX;
    player.y = map.startY;
    player.r = Math.atan2(map.startY - map.startHeadingY, map.startX - map.startHeadingX);
    if (player.colorHintingTimer) {
      window.clearInterval(player.colorHintingTimer);
      player.colorHintingTimer = false;
      player.colorOverride = false;
    }
    if (!this.animationTimer) {
      camera.zmin = 1.0;
      this.animationTimer = window.setInterval(() => this.advanceInternalState('end_of_start_animation'), 2000);
      this.do_redraw = true;
    }
  },
  go_draw(dt) {
    ctx.save();
    ctx.strokeStyle = '#0f0';
    ctx.fillStyle = '#0f0';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText("GO!", map.startX, map.startY - 52);
    ctx.restore();
    this.do_redraw = true; // we want to see the zoom change
  },

  end_of_start_animation(dt) {
    initPlayer();
    camera = gameCameraNoAutoZoom;
    gameState = gamePlay;
    this.animationState = "";
    player.forceZoomIn = false;
  },
  end_of_start_animation_draw(dt) {
  },

}

const endAnimation = {
  animationState: "start_of_end_animation",
  animationTimer: false,
  endAnimationState: "done_message",
  do_redraw: false,

  playerPositionHeuristic(singleAxisPosition) {
    return singleAxisPosition;
  },

  update(dt) {
    if (DEBUG) {
      statsUpdate.begin();
    }
    camera = endAnimationCamera;
    // we get commands, but don't act on them
    // this allows any input to interrupt the animation
    //getCurrentCommands(dt, player, camera);
    player.suspendPathTracking = true;
    Commands.attention = false;
    updatePlayerZoom(dt);
    updatePlayerFromScript(dt);
    updateDebug();
    if (
      DEBUG) {
      statsUpdate.end();
    }
  },

  draw(dt) {
    if (DEBUG) {
      statsDraw.begin();
    }
    clearCanvas();
    ctx.save();
    drawMaze(dt);
    followAndZoom(dt);
    drawArrows(dt);
    drawAnimationFrame(dt);
    drawUsedPaths(dt);
    drawPlayer(dt);
    ctx.restore();
    drawDebug(dt);
    if (DEBUG) {
      statsDraw.end();
    }
  },

  advanceInternalState (nextState) {
    if (this.animationTimer) {
      window.clearInterval(this.animationTimer);
      this.animationTimer = false;
    }
    this.animationState = nextState;
  },

  start_of_end_animation (dt) {
    if (!this.animationTimer) {
      player.forceZoomIn = true;
      player.x = map.endX;
      player.y = map.endY;
      this.animationTimer = window.setInterval(() => this.advanceInternalState('fly_to_middle'), 4000);
      this.do_redraw = true;
    }
  },
  start_of_end_animation_draw (dt) {
    ctx.save();
    ctx.strokeStyle = '#0f0';
    ctx.fillStyle = '#0f0';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText("YOU MADE IT TO THE END !", map.endMessageBase[0], map.endMessageBase[1] - 52);
    ctx.restore();
    this.do_redraw = false;
  },

  fly_to_middle(dt) {
    player.forceZoomIn = false;
    this.do_redraw = true;

    let distanceFromMiddle = distanceFrom(player.x, player.y, 2000, 2000);
    player.r = Math.atan2((2000 + distanceFromMiddle / 2.0) - player.y, (2000) - player.x);
    player.v = 0;
    let tx = Math.cos(player.r) * player.maxSpeed * 5 * dt + player.x;
    let ty = Math.sin(player.r) * player.maxSpeed * 5 * dt + player.y;

    if (distanceFrom(tx, ty, 2000, 2000) < distanceFrom(tx, ty, player.x, player.y)) {
      tx = 2000;
      ty = 2000;
      this.animationState = "pause_a_second";
    }
    player.x = tx;
    player.y = ty;
  },
  fly_to_middle_draw(dt) {
  },

  pause_a_second(dt) {
    if (!this.animationTimer) {
      player.forceZoomIn = false;
      this.animationTimer = window.setInterval(() => this.advanceInternalState('fly_away'), 1000);
      this.do_redraw = true;
    }
  },
  pause_a_second_draw(dt){
  },

  fly_away(dt) {
    player.forceZoomIn = false;
    this.do_redraw = true;

    let distanceFromEnd = distanceFrom(player.x, player.y, 2000, -2500);
    if (distanceFromEnd > 20) {
      player.r = Math.atan2((-2500 + distanceFromEnd / 2.0) - player.y, (2000) - player.x);
      player.v = 0;
      let tx = Math.cos(player.r) * player.maxSpeed * 10 * dt + player.x;
      let ty = Math.sin(player.r) * player.maxSpeed * 10 * dt + player.y;

      player.x = tx;
      player.y = ty;
    }

    if (!this.animationTimer) {
      this.animationTimer = window.setInterval(() => this.advanceInternalState('red_cursor'), 3000);
      this.do_redraw = true;
    }
  },
  fly_away_draw(dt) {
  },

  red_cursor() {
    if (!this.animationTimer) {
      player.colorOverride = true;
      player.colorHintingTimer = window.setInterval(degradeHintingColor, 200);
      player.forceZoomIn = true;
      this.do_redraw = true;
      this.animationTimer = window.setInterval(() => this.advanceInternalState('explode'), 3000);
    }
  },
  red_cursor_draw() {
  },

  explode(dt) {
    if (!this.animationTimer) {
      if (player.colorHintingTimer)
        window.clearInterval(player.colorHintingTimer)
      this.animationTimer = window.setInterval(() => this.advanceInternalState('blackout_player'), 2000);
      this.do_redraw = true;
    }
    player.victory = true;
  },
  explode_draw(dt) {
  },

  blackout_player(dt) {
    if (!this.animationTimer) {
      this.animationTimer = window.setInterval(() => this.advanceInternalState('blackout_everything'), 1000);
      player.colorOverride = true;
      player.color = 0;
    }
  },
  blackout_player_draw(draw){
  },

  blackout_everything(dt) {
    if (!this.animationTimer) {
      this.animationTimer = window.setInterval(() => this.advanceInternalState('reset'), 2000);
      player.colorOverride = true;
      player.color = 0;
      player.victory = false;
    }
  },
  blackout_everything_draw(draw){
  },

  reset(dt) {
    document.location.reload(true);
  },
  reset_draw(dt) {
  },
}

const cheatAnimation = {
  animationState: "init_cheat_animation",
  animationTimer: false,
  endAnimationState: "land_on_cheat",
  do_redraw: false,
  saved_camera: false,

  playerPositionHeuristic(singleAxisPosition) {
    return singleAxisPosition;
  },

  update(dt) {
    if (DEBUG) {
      statsUpdate.begin();
    }
    player.suspendPathTracking = true;
    camera = animationCamera;
    getCurrentCommands(dt, player, camera);
    Commands.attention = false;
    updatePlayerZoom(dt);
    updatePlayerFromScript(dt);
    updateDebug();
    if (
      DEBUG) {
      statsUpdate.end();
    }
  },

  draw(dt) {
    if (DEBUG) {
      statsDraw.begin();
    }
    clearCanvas();
    ctx.save();
    drawMaze(dt);
    followAndZoom(dt);
    drawArrows(dt);
    drawAnimationFrame(dt);
    drawUsedPaths(dt);
    drawPlayer(dt);
    ctx.restore();
    drawDebug(dt);
    if (DEBUG) {
      statsDraw.end();
    }
  },

  init_cheat_animation(dt) {
    player.forceZoomIn = false;
    this.do_redraw = true;
    let columnNumber = Math.trunc(player.current_path[0] / map.tileWidth);
    let rowNumber = Math.trunc(player.current_path[1] / map.tileHeight);
    player.used_paths[columnNumber][rowNumber].push(player.current_path);
    player.current_path = [map.cheatX, map.cheatY];
    this.animationState = "fly_to_cheat";
    player.suspendPathTracking = true;
  },
  init_cheat_animation_draw(dt) {
  },


  fly_to_cheat(dt) {

    let distanceFromCheat = distanceFrom(player.x, player.y, map.cheatX, map.cheatY);
    player.r = Math.atan2((map.cheatY + distanceFromCheat / 2.0) - player.y, (map.cheatX) - player.x);
    player.v = 0;
    let tx = Math.cos(player.r) * player.maxSpeed * 5 * dt + player.x;
    let ty = Math.sin(player.r) * player.maxSpeed * 5 * dt + player.y;

    if (distanceFrom(tx, ty, map.cheatX, map.cheatY) < distanceFrom(tx, ty, player.x, player.y)) {
      tx = map.cheatX;
      ty = map.cheatY;
      this.animationState = "land_on_cheat";
    }
    player.x = tx;
    player.y = ty;
  },
  fly_to_cheat_draw(dt) {
  },

  land_on_cheat(dt) {
    camera = gameCameraNoAutoZoom;
    player.forceZoomIn = false;
    player.suspendPathTracking = false;
    gameState = gamePlay;
    gameState.animationState = "";
    gameState.do_redraw = true;
  },
  land_on_cheat_draw(dt) {
  },


}


// the game begins with the opening animation
// When any game state finishes, it is the current game state's responsilibity to set
// the next state.
var gameState = openAnimation;

// Cameras
//    gameCameraNoAutoZoom -- a camera that gives the use the control of the zoom level
//    gameCameraWithAutoZoom -- the original camera that autamatically zoomed in and out
//    animationCamera -- the camera used during the scripted animations
var gameCameraNoAutoZoom = { name: 'game_no_auto_zoom', x: 0, y: 0, z: 1.0, zmin: 1.0, zmax: 1.0, referenceZ: false, zdelay: 0, zdelaymax: 500 };
var gameCameraWithAutoZoom = { name: 'game_auto_zoom', x: 0, y: 0, z: 0.75, zmin: 0.75, zmax: 5, zdelay: 0, zdelaymax: 500 };
var animationCamera = { name: 'animation', x: 0, y: 0, z: 0.75, zmin: 0.75, zmax: 3.75, zdelay: 0, zdelaymax: 500 };
var endAnimationCamera = { name: 'animation_end', x: 0, y: 0, z: 0.75, zmin: 0.2, zmax: 3.75, zdelay: 0, zdelaymax: 500 };
var camera = animationCamera;

// player
const player = {
  // position related data
  x: 0,
  y: 0,
  x_history: [],
  y_history: [],
  restoredX: 0,  // location of most recent jump to breadcrumb
  restoredY: 0,  // location of most recent jump to breadcrumb
  // an array of lists of multisegmented lines indicating where the player has been
  used_paths: [],
  // the most recent data as to where the player has been
  current_path: [],

  // perspective data
  forceZoomIn: false,

  // movement related data
  r: Math.PI * (3/2),
  v: 0,
  maxSpeed: 130 / 1000,
  vibrating: 0,
  vibrateBaseLocation: [0,0],

  // player game state information
  breadcrumb_stack: new Stack(),
  color: 4095,
  colorHintingTimer: false,
  colorHinting: true,
};


const updateTimer = { };
const drawTimer = { };
const debugIn = { tileGrid: false };
const debugOut = { avg: '', keys: '', gamepad: '', gamepadAxis0: '', gamepadAxis1: '', gameState: '' };

let gui, statsDraw, statsUpdate;

const theCanvas = document.getElementById('viewport');
const ctx = theCanvas.getContext('2d');
const offscreenCanvas = document.createElement("canvas");
const offscreenContext = offscreenCanvas.getContext('2d');
const openingDisplayDiv = document.getElementById('explanation');
const theStartButton = document.getElementById('theStartButton');
const theResumeButton = document.getElementById('theResumeButton');


function switchToGamePlayMode() {
  window.scrollTo(0,0);
  openingDisplayDiv.style.visibility = 'hidden';
  // I would have expected this to cascade to the children
  // rather than having to do this manually
  let children = openingDisplayDiv.children;
  for (let i = 0; i < children.length; i++)
    children[i].style.visibility = 'hidden';

  theStartButton.style.visibility = 'hidden';
  theResumeButton.style.visibility = 'hidden';
  theCanvas.style.visibility = "visible";

  gameState.do_redraw = true;

  // startup the animation timers
  // initialize the canvas
  // initialize the player
  init();
}

function switchToPauseMode() {
  // restore all that was visible when the page first
  // loaded.  Plus make the 'resume' button visible
  openingDisplayDiv.style.visiblity = 'visible';
  let children = openingDisplayDiv.children;
  for (let i = 0; i < children.length; i++)
    children[i].style.visibility = 'visible';

  theCanvas.style.visibility = 'hidden';
  theStartButton.style.visibility = 'visible';
  theResumeButton.style.display = 'inline';
  theResumeButton.style.visibility = 'visible';

  // restore normal Web page input handlers
  Input.restoreOriginalHandlers();

}

function switchToResumeMode() {
  // jump back to the game where it was waiting
  // by hiding the opening page and making the
  // canvas visibe again.
  window.scrollTo(0,0);
  //disable window scroll behavior
  openingDisplayDiv.style.visiblity = 'hidden';
  let children = openingDisplayDiv.children;
  for (let i = 0; i < children.length; i++)
    children[i].style.visibility = 'hidden';
  theStartButton.style.visibility = 'hidden';
  theResumeButton.style.visibility = 'hidden';
  theCanvas.style.visibility = 'visible';
  gameState.do_redraw = true;

  // reinitialize the Input handlers
  Input.init();

}

theResumeButton.onclick= function() {
  switchToResumeMode();
}


function loadHandlerForWindow() {

  const activateStartButton = e => {
    offscreenCanvas.width = map.width;
    offscreenCanvas.height = map.height;
    offscreenContext.drawImage(map.pathImg, 0, 0);
    map.pathData = offscreenContext.getImageData(0, 0, map.width, map.height).data;
    const theStartButton = document.getElementById('theStartButton');
    theStartButton.onclick = switchToGamePlayMode;
    theStartButton.style.visibility = "visible";
    map.pathImg.removeEventListener('load', activateStartButton);
  }

  map.pathImg = new Image();
  // we want the user to be reading the instructions while the App loads
  // the large path image.  Make the "START NEW GAME" button visible only
  // after that has and is ready to go.
  map.pathImg.addEventListener("load", activateStartButton);
  map.pathImg.src = map.pathSrc;

}


function init() {
  // setting the canvas width before the play has hit the start button makes the
  // start page text very very small in the FF for iOS.  Not enlarging the canvas
  // until the game starts, solves that problem.
  ctx.canvas.width = map.width;
  ctx.canvas.height = map.height;
  ctx.globalCompositeOperation = 'mulitply';
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

// the update event loop timer runs the loop defined by the gameState
function update() {
  handleTimer('update', Date.now(), updateTimer, true, dt => {
    gameState.update(dt)
  });
  setTimeout(update, TICK);
}

// the draw event loop timer runs the loop defined by the gameState
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
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

function followAndZoom(dt) {
  // setup the parameters for the canvas for the current player location and current camera's zoom level
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

function drawMaze(dt) {
  ctx.globalCompositeOperation = 'source-over'
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

      if (col >= 0 && row >= 0 && col < map.numberOfTileColumns && row < map.numberOfTileRows) {
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
        ctx.strokeStyle = (col >= 0 && row >= 0 && col < map.numberOfTileColumns && row < map.numberOfTileRows) ? '#0a0' : '#a00';
        ctx.strokeRect(x, y, map.tileWidth * camera.z, map.tileHeight * camera.z);

        ctx.strokeStyle = '#fff';
        ctx.strokeText(`${row}x${col}`, x + 12, y + 12);
      }
    }
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

function draw_a_path(a_path) {
  if (typeof a_path == "undefined") {
    console.log('trouble');
    return;
  }
  if (a_path.length > 1) {

    ctx.moveTo(a_path[0], a_path[1]);
    for (let j = 2; j < a_path.length; j+=2) {
      ctx.lineTo(a_path[j], a_path[j+1]);
    }
  }
}

function drawUsedPaths(dt) {
  ctx.save();

  ctx.lineWidth = "8";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = map.solutionColor;
  ctx.globalCompositeOperation = 'color-burn';

  // update used paths
  let lastX = player.current_path[player.current_path.length - 2];
  let lastY = player.current_path[player.current_path.length - 1];
  if (!player.suspendPathTracking && (Math.abs(lastX - player.x) > 6 || Math.abs(lastY - player.y) > 6)) {
    player.current_path.push(Math.round(player.x));
    player.current_path.push(Math.round(player.y));
  }

  ctx.beginPath();
  draw_a_path(player.current_path);

  const mapX = player.x - (ctx.canvas.width / 2 / camera.z);
  const mapY = player.y - (ctx.canvas.height / 2 / camera.z);
  const mapW = ctx.canvas.width / camera.z;
  const mapH = ctx.canvas.height / camera.z;

  // Find the start/end indices for tiles in visible map
  const rowStart = Math.floor(mapY / map.tileHeight) - 1;
  const rowEnd = Math.ceil(rowStart + (mapH / map.tileHeight)) + 1;

  const colStart = Math.floor(mapX / map.tileWidth) - 1;
  const colEnd = Math.ceil(colStart + (mapW / map.tileWidth)) + 1;

  // column
  for (let i = colStart; i <= colEnd; i++) {
    if (i >= 0 && i < map.numberOfTileColumns)
      for (let j = rowStart; j <= rowEnd; j++)
        if (j >= 0 && j < map.numberOfTileRows) {
          let usedPathsForThisTile = player.used_paths[i][j];
          for (let k = 0; k < usedPathsForThisTile.length; k++)
            draw_a_path(usedPathsForThisTile[k]);
        }
  }
  ctx.stroke();

  if (player.current_path.length > 60) {
    let columnNumber = Math.trunc(player.current_path[0] / map.tileWidth);
    let rowNumber = Math.trunc(player.current_path[1] / map.tileHeight);
    player.used_paths[columnNumber][rowNumber].push(player.current_path);
    player.current_path = [player.x, player.y];
  }

  ctx.restore();
}

function drawBreadCrumbs(dt) {
  ctx.save();

  ctx.strokeStyle = '#fff';
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';

  for (let i = 0; i < player.breadcrumb_stack.stack.length; i++) {
    let [x, y] = player.breadcrumb_stack.stack[i];
    ctx.fillText(i.toString(), x, y);
  }

  ctx.restore();
}

function initPlayer() {
  if (player.colorHintingTimer) {
    window.clearInterval(player.colorHintingTimer);
    player.colorHintingTimer = false;
    player.colorOverride = false;
  }
  player.x = map.startX;
  player.y = map.startY;
  player.breadcrumb_stack = new Stack();
  player.current_path = [player.x, player.y];
  player.suspendPathTracking = false;
  player.victory = false;
  player.r = Math.atan2(map.startY - map.startHeadingY, map.startX - map.startHeadingX);
  player.v = 0;
  player.color = 4095;
  player.sprite = {
   rings: [
    { t: 0, delay: 0,   startR: 0, endR: 50, startO: 1.0, endO: 0.0, endT: 3000, color: "white" },
    { t: 0, delay: 300, startR: 0, endR: 50, startO: 1.0, endO: 0.0, endT: 3000, color: "white" },
    { t: 0, delay: 600, startR: 0, endR: 50, startO: 1.0, endO: 0.0, endT: 3000, color: "white" }
   ],
   victoryRings: [
     { t: 0, delay: 0,   startR: 0, endR: 200, startO: 1.0, endO: 1.0, endT: 900, color: "red" },
     { t: 0, delay: 100, startR: 0, endR: 200, startO: 1.0, endO: 1.0, endT: 900, color: "orangered" },
     { t: 0, delay: 200, startR: 0, endR: 200, startO: 1.0, endO: 1.0, endT: 900, color: "orange" },
     { t: 0, delay: 300, startR: 0, endR: 200, startO: 1.0, endO: 1.0, endT: 900, color: "yellow" },
     { t: 0, delay: 300, startR: 0, endR: 200, startO: 1.0, endO: 1.0, endT: 900, color: "gold" },
     { t: 0, delay: 400, startR: 0, endR: 200, startO: 1.0, endO: 1.0, endT: 900, color: "orangered" },
     { t: 0, delay: 500, startR: 0, endR: 200, startO: 1.0, endO: 1.0, endT: 900, color: "white" },
     { t: 0, delay: 600, startR: 0, endR: 200, startO: 1.0, endO: 1.0, endT: 900, color: "pink" }
   ]
  };
  // create a big column ordered grid of lists that mirror the size and shape of the tile
  // maps for use in saving sets of used paths.  This will allow optimization of drawing
  // only the used paths that are actually in view - could be made more efficient by
  // clipping the paths so they don't cross over tile boundaries.
  player.used_paths = [];
  for (let i = 0; i < map.numberOfTileColumns; i++) {
    player.used_paths.push([]); // the X dimension
    for (let j = 0; j < map.numberOfTileRows; j++)
      player.used_paths[i].push([]);  // the Y dimension
  }
}

function abortIntro() {
  if (playerWantsAttention()) {
    if (openAnimation.animationTimer) {
      window.clearInterval(gameState.animationTimer);
      gameState.animationTimer = false;
    }
    if (player.colorHintingTimer) {
      window.clearInterval(player.colorHintingTimer);
      player.colorHintingTimer = false;
      player.colorOverride = false;
      player.color = 4094;
    }
    // jump to the last animation state if the user interrupts the animation
    gameState.animationState = gameState.endAnimationState;
  }
}

function updatePlayerFromScript(dt) {
  // During animation sequences, this method is called in the update event loop. It is
  // in charge of running the commands associated with the animation's current internal state
  abortIntro(); // if the user does anything - abort the animation
  if (gameState.animationState) {
    gameState[gameState.animationState](dt);
  }
}

function drawAnimationFrame(dt) {
  if (gameState.animationState) {
    let animationStateMotion = gameState.animationState + "_draw";
    gameState[animationStateMotion](dt);
  }
}

function updatePlayerZoom(dt) {
  if (camera.name == "game_auto_zoom")
      gameState.do_redraw = true;
 if (camera.z < 0.8)
     gameState.do_redraw = true;
  let zoomInDelta = 0;
  let zoomOutDelta = 0;
  if (player.v !== 0 || player.forceZoomIn) {
    camera.zdelay = camera.zdelaymax;
    if (camera.z == camera.zmax) return;
    gameState.do_redraw = true;
    camera.z += 0.3;
    if (camera.z > camera.zmax) {
      camera.z = camera.zmax;
    }
  } else {
    if (camera.z == camera.zmin) return
    if (camera.zdelay > 0) {
      camera.zdelay -= dt;
      return;
    }
    gameState.do_redraw = true;
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

  let breadcrumbFound = false;
  let detectedBreadcrumbX = false;
  let detectedBreadcrumbY = false;

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
      if (!breadcrumbFound && pixelIsRedAt(testX, testY)) {
        detectedBreadcrumbX = tx;
        detectedBreadcrumbY = ty;
        breadcrumbFound = true;
     }

    } else {
      tx = overrunX;
      ty = overrunY;

      break;
    }
  }

  [tx, ty] = suggestBetter(tx, ty);
  if (!isPassableAt(tx, ty)) return;

  if (breadcrumbFound && Math.abs(distanceFrom(tx, ty, player.restoredX, player.restoredY)) > 15) {
    player.breadcrumb_stack.push([Math.round(detectedBreadcrumbX), Math.round(detectedBreadcrumbY)]);
    markBreadcrumbAsUsed(detectedBreadcrumbX, detectedBreadcrumbY);
  }

  // stop vibration
  let vdx = Math.abs(player.x - tx);
  let vdy = Math.abs(player.y - ty);
  if (vdx < 2 && vdy < 2) {
    player.vibrating += 1;
    if (player.vibrating > 10) {
      player.vibrateBaseLocation = [tx, ty];
      return;
    }
    if (player.x != tx && player.y != tx)
      gameState.do_redraw = true;
    player.x = tx;
    player.y = ty;
    return;
  }

  if (player.x != tx && player.y != tx)
    gameState.do_redraw = true;
  player.x = tx;
  player.y = ty;
  player.vibrating = 0;
}

function redPixel(x, y) {
  return map.pathData[4 * (Math.round(x) + (Math.round(y) * map.width))]
}

function pixelIsRedAt(x, y) {
  try {
    return map.pathData[4 * (Math.round(x) + (Math.round(y) * map.width))] > 128;
  } catch (err) {
    return false;
  }
}

function floodPixelData(x, y, isOrignalValueFn, newValue) {
  let workQueueX = [];
  let workQueueY = [];
  workQueueX.push(x);
  workQueueY.push(y);
  while (workQueueX.length) {
    let testX = workQueueX.pop();
    let testY = workQueueY.pop();
    let position = 4 * (Math.round(testX) + (Math.round(testY) * map.width));
    if (isOrignalValueFn(map.pathData[position])) {
      // this routine will inefficeintly put pixels already tested into the
      // queue - however fixing that makes the algorithm significantly more
      // complicated

      map.pathData[position] = newValue;
      workQueueX.push(testX + 1);
      workQueueY.push(testY + 1);

      workQueueX.push(testX + 1);
      workQueueY.push(testY);

      workQueueX.push(testX + 1);
      workQueueY.push(testY - 1);

      workQueueX.push(testX);
      workQueueY.push(testY + 1);

      workQueueX.push(testX + 1);
      workQueueY.push(testY - 1);

      workQueueX.push(testX - 1);
      workQueueY.push(testY + 1);

      workQueueX.push(testX - 1);
      workQueueY.push(testY);

      workQueueX.push(testX - 1);
      workQueueY.push(testY - 1);
    }
  }
}

function markBreadcrumbAsUsed(x, y) {
  floodPixelData(x, y, v => v > 128, 100)
}

function markBreadcrumbAsAvailable(x, y) {
  floodPixelData(x, y, v => v == 100, 255)
}


function pixelIsGreenAt(x, y) {
  try {
    return map.pathData[4 * (Math.round(x) + (Math.round(y) * map.width)) + 1] > 128;
  } catch (err) {
    return false;
  }
}

function pixelIsBlueAt(x, y) {
  try {
    return map.pathData[4 * (Math.round(x) + (Math.round(y) * map.width)) + 2] > 128;
  } catch (err) {
    console.log(err);
    return false;
  }
}
const isPassableAt = pixelIsBlueAt;

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
  return [betterX, betterY];
}

function degradeHintingColor() {
  if (player.color > 3840) {
    player.color -= 17;
  } else {
    window.clearInterval(player.colorHintingTimer);
    player.colorHintingTimer = false;
  }
}

function upgradeHintingColor() {
  if (player.color < 4094) {
    player.color += 17;
  }
}


function drawRings(dt, px, py, rings) {
  rings.forEach(ring => {
    if (ring.delay > 0) { return ring.delay -= dt; }

    ring.t += dt;
    if (ring.t >= ring.endT) { ring.t = 0; }

    ctx.save();
    ctx.beginPath();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = ring.color;
    ctx.globalAlpha = lerp(ring.startO, ring.endO, ring.t / ring.endT);
    ctx.arc(px, py,
      lerp(ring.startR, ring.endR, ring.t / ring.endT),
      0, PI2);
    ctx.stroke();
    ctx.restore();
  });

}

function drawPlayer(dt) {
  let inSolutionPath = pixelIsGreenAt(player.x, player.y);

  if (player.colorHinting && !player.colorHintingTimer && !inSolutionPath && !player.colorOverride) {
    // degrade the player color every 60 seconds with a timer
    player.colorHintingTimer = window.setInterval(degradeHintingColor, 20000);
  }
  if (inSolutionPath && !player.colorOverride) {
    // the player has moved back onto a solution path
    // kill the timer and restore the color
    if (player.colorHintingTimer) window.clearInterval(player.colorHintingTimer);
    player.colorHintingTimer = false;
    player.color = 4095;
  }

  let color_str = "#".concat(player.color.toString(16));
  ctx.strokeStyle = color_str;
  ctx.fillStyle = color_str;

  var drawR = player.r;

  let px = gameState.playerPositionHeuristic(player.x);
  let py = gameState.playerPositionHeuristic(player.y);

  if (player.v != 0) {
    // Try coming up with a short travel history segment for a
    // smoothed avatar rotation
    player.x_history.unshift(px);
    player.y_history.unshift(py);
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
  ctx.translate(px, py);
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
    drawRings(dt, px, py, player.sprite.rings);
  }
  if (player.victory) {
    drawRings(dt, px, py, player.sprite.victoryRings);
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
// BACKUP -- single
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
Once each has completed the task, the commands are merged into one command object and those
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
  pause: false,
  save: false,
  quit: false,
  cheat: false,
};

function createKeyboardCommands (dt, playerX, playerY, camera) {
  KeyboardCommands.attention = false;
  KeyboardCommands.moveDirection = false;
  KeyboardCommands.moveSpeedFactor = false;
  KeyboardCommands.backup = false;
  KeyboardCommands.zoom = false;
  KeyboardCommands.autozoom = false;
  KeyboardCommands.pause = false;
  KeyboardCommands.save = false;
  KeyboardCommands.cheat = false;

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

  if (Input.keys[8]) {  // backspace for backup
    KeyboardCommands.attention = true;
    KeyboardCommands.backup = true;
    delete Input.keys[8]
  }
  if (Input.keys[46]) { // also for backup
    KeyboardCommands.attention = true;
    KeyboardCommands.backup = true;
    delete Input.keys[46]}

  if (Input.keys[90]) {  // Z key for Auto-zoom toggling
    KeyboardCommands.attention = true;
    KeyboardCommands.auto_zoom = true;
    delete Input.keys[90]
  }

  if (Input.keys[61]) {  // =/+ for zoom in
    KeyboardCommands.attention = true;
    KeyboardCommands.zoom = 0.1;
    delete Input.keys[61]
  }

  if (Input.keys[173]) {  // - for zoom out
    KeyboardCommands.attention = true;
    KeyboardCommands.zoom = -0.1;
    delete Input.keys[173]
  }

  if (Input.keys[80]) {  // - for pause
    KeyboardCommands.attention = true;
    KeyboardCommands.pause = true;
    delete Input.keys[80]
  }

  if (Input.keys[67] && Input.keys[72] && Input.keys[84] && Input.keys[69] && Input.keys[65]) {
    KeyboardCommands.attention = true;
    KeyboardCommands.cheat = true;
    delete Input.keys[67];
    delete Input.keys[72];
    delete Input.keys[84];
    delete Input.keys[69];
    delete Input.keys[65];
  }

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
  pause: false,
  save: false,
  quit: false,
  cheat: false,
};

function createMouseCommands (dt, playerX, playerY, camera) {
  MouseCommands.attention = false;
  MouseCommands.moveSpeedFactor = false;
  MouseCommands.moveDirection = false;
  MouseCommands.backup = false;
  MouseCommands.zoom = false;
  MouseCommands.auto_zoom = false;
  MouseCommands.pause = false;
  MouseCommands.cheat = false;

  if (Input.mouse.down === 0) {
    // left mouse for move
    const mx = playerX - (ctx.canvas.width / 2 / camera.z) + (Input.mouse.x / camera.z);
    const my = playerY - (ctx.canvas.height / 2 / camera.z) + (Input.mouse.y / camera.z);
    let distance = distanceFrom(playerX, playerY, mx, my);
    if (distance > 40) distance = 40;
    MouseCommands.moveSpeedFactor = distance / 40;
    MouseCommands.moveDirection = Math.atan2(my - playerY, mx - playerX);
    MouseCommands.attention = true;
  } else if (Input.mouse.down == 2) {
    // right mouse for backup
    MouseCommands.backup = true;
    Input.mouse.down = false;  // kill repeats
    MouseCommands.attention = true;
  } else if (Input.mouse.down == 1) {
    // middle mouse for autozoom
    MouseCommands.auto_zoom = true;
    Input.mouse.down = false;  // kill repeats
    MouseCommands.attention = true;
  } else if (Input.mouse.wheel) {
    // wheel for zoom
    MouseCommands.zoom = Input.mouse.wheel / 10.0;
    MouseCommands.attention = true;
    Input.mouse.wheel = false;
  }

  // TODO: mouse command for pause
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
  pause: false,
  save: false,
  quit: false,
  cheat: false,
};

function createGameControllerCommands (dt, playerX, playerY, camera) {
  GameControllerCommands.attention = false;
  GameControllerCommands.moveSpeedFactor = false;
  GameControllerCommands.moveDirection = false;
  GameControllerCommands.backup = false;
  GameControllerCommands.zoom = false;
  GameControllerCommands.auto_zoom = false;
  GameControllerCommands.pause = false;
  GameControllerCommands.cheat = false;

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
  if (Input.gamepad.button2) {
    // backup
    if (typeof Input.gamepad.backup == "undefined") {
      Input.gamepad.backup = true;
      GameControllerCommands.backup = true;
    }
  } else if (typeof Input.gamepad.backup != "undefined")
    delete Input.gamepad.backup;

  if (Input.gamepad.button3) {
    // auto-zoom
    if (typeof Input.gamepad.auto_zoom == "undefined") {
      Input.gamepad.auto_zoom = true;
      GameControllerCommands.auto_zoom = true;
    }
  } else if (typeof Input.gamepad.auto_zoom != "undefined")
    delete Input.gamepad.auto_zoom;

  if (Input.gamepad.button0) {
    // green button 0 for zoom in
    if (typeof Input.gamepad.zoom == "undefined") {
      Input.gamepad.zoom = true;
      GameControllerCommands.zoom = 0.1;
    }
  } else if (typeof Input.gamepad.zoom != "undefined")
    delete Input.gamepad.zoom;

  if (Input.gamepad.button1) {
    // red button 1 for zoom in
    if (typeof Input.gamepad.zoom == "undefined") {
      Input.gamepad.zoom = true;
      GameControllerCommands.zoom = -0.1;
    }
  } else if (typeof Input.gamepad.zoom != "undefined")
    delete Input.gamepad.zoom;

  if (Input.gamepad.button6) {
    // back button 6 for pause
    if (typeof Input.gamepad.pause == "undefined") {
      Input.gamepad.pause = true;
      GameControllerCommands.pause = true;
    }
  } else if (typeof Input.gamepad.pause != "undefined")
    delete Input.gamepad.pause;


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
  pause: false,
  save: false,
  quit: false,
  cheat: false,
};

function createTouchCommands (dt, playerX, playerY, camera) {
  TouchCommands.attention = false;
  TouchCommands.moveSpeedFactor = false;
  TouchCommands.moveDirection = false;
  TouchCommands.backup = false;
  TouchCommands.zoom = false;
  TouchCommands.auto_zoom = false;
  TouchCommands.pause = false;
  TouchCommands.cheat = false;

  let timestamp = Date.now();
  let touches = Object.keys(Input.touchEventTracker);
  // one finger section
  if (touches.length == 1) {  // move command
    const mx = playerX - (ctx.canvas.width / 2 / camera.z) + (Input.touchEventTracker[touches[0]].x / camera.z);
    const my = playerY - (ctx.canvas.height / 2 / camera.z) + (Input.touchEventTracker[touches[0]].y / camera.z);
    let distance = distanceFrom(playerX, playerY, mx, my);
    if (distance > 40) distance = 40;
    TouchCommands.attention = true;
    TouchCommands.moveSpeedFactor = distance / 40;
    TouchCommands.moveDirection = Math.atan2(my - playerY, mx - playerX);

  // two finger section
  } else if (touches.length == 2) {
    // zoom or backup command
    TouchCommands.attention = true;
    let first = Input.touchEventTracker[touches[0]];
    let second = Input.touchEventTracker[touches[1]];
    let changeInRelativeDistanceBetweenFingers = distanceFrom(first.x, first.y, second.x, second.y) - distanceFrom(first.xStart, first.yStart, second.xStart, second.yStart);
    let changeInXPositionOfFirstFinger = first.xStart - first.x;
    let changeInXPositionOfSecondFinger = second.xStart - second.x;
    let changeInYPositionOfFirstFinger = first.yStart - first.y;
    let changeInYPositionOfSecondFinger = second.yStart - second.y;
    if (Math.abs(changeInRelativeDistanceBetweenFingers) > 30) {
      // pinch for zoom
      TouchCommands.zoom = changeInRelativeDistanceBetweenFingers / 500; // mostly normalized to 0.0 to 1.0
      if (TouchCommands.zoom > 1.2) TouchCommands.zoom = 1.2;
    } else
    if (changeInXPositionOfFirstFinger > 30 && changeInXPositionOfSecondFinger > 30
      && Math.abs(changeInYPositionOfFirstFinger) < 15 && Math.abs(changeInYPositionOfSecondFinger) < 15) {
      // left swipe for pause
      TouchCommands.pause = true;
    }
    if (first.ended || second.ended)
      // tap for backup
      if (timestamp - first.timestamp < 1500 && Math.abs(changeInRelativeDistanceBetweenFingers) < 30) {
        TouchCommands.backup = true;
      }

  // 3 finger section
  } else if (touches.length == 3) {
    // auto_zoom command
    TouchCommands.attention = true;
    TouchCommands.auto_zoom = true;
  }

  // kill the ended touch trackers
  let n = 0;
  for (let i = 0; i < touches.length; i++) {
    /*if (Input.touchEventTracker[touches[i]].ended || (timestamp - Input.touchEventTracker[touches[i]].timestamp) > 9000 ) {*/
    if (Input.touchEventTracker[touches[i]].ended) {
      delete Input.touchEventTracker[touches[i]];
    }
  }

  // TODO: game controller command for save
  // TODO: game controller command for quit
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
  pause: false,
  save: false,
  quit: false,
  cheat: false,
};

function createMovementCommands (dt, playerX, playerY, camera) {
  // TODO: movement command for moving
  // TODO: movement command for backup
  // TODO: movement command for zoom
  // TODO: movement command for autozoom
  // TODO: movement command for save
  // TODO: movement command for quit

}

// consolidated commands section

function mergeCommands(candidate, target) {
  if (candidate.attention) {
    target.attention = candidate.attention ? candidate.attention : target.attention;
    target.moveDirection = candidate.moveDirection ? candidate.moveDirection : target.moveDirection;
    target.moveSpeedFactor = candidate.moveSpeedFactor ? candidate.moveSpeedFactor : target.moveSpeedFactor;
    target.backup = candidate.backup ? candidate.backup : target.backup;
    target.auto_zoom = candidate.auto_zoom ? candidate.auto_zoom : target.auto_zoom;
    target.zoom = candidate.zoom ? candidate.zoom : target.zoom;
    target.pause = candidate.pause ? candidate.pause : target.pause;
    target.save = candidate.save ? candidate.save : target.save;
    target.quit = candidate.quit ? candidate.quit : target.quit;
    target.cheat = candidate.cheat ? candidate.cheat : target.cheat;
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
  pause: false,
  save: false,
  quit: false,
  cheat: false,
};

function getCurrentCommands(dt, player, currentCamera) {

  Commands.attention = false;
  Commands.moveDirection = false;
  Commands.moveSpeedFactor = false;
  Commands.backup = false;
  Commands.zoom = false;
  Commands.auto_zoom = false;
  Commands.pause = false;
  Commands.save = false;
  Commands.quit = false;
  Commands.cheat = false;

  Input.update(dt);
  InputCommandFunctions.forEach(e => e(dt, player.x, player.y, currentCamera));
  InputCommands.forEach(e => mergeCommands(e, Commands));
}

function playerWantsAttention() {
  return Commands.attention;
}

function actOnCurrentCommands(dt, player, currentCamera) {

  if (Commands.moveSpeedFactor) {
    gameState.do_redraw = true;
    player.v = player.maxSpeed * Commands.moveSpeedFactor;
    player.r = Commands.moveDirection;
  } else {
    player.v = 0;
  }

  if (Commands.backup) {
    gameState.do_redraw = true;
    if (player.breadcrumb_stack.stack.length > 0) {
      let columnNumber = Math.trunc(player.current_path[0] / map.tileWidth);
      let rowNumber = Math.trunc(player.current_path[1] / map.tileHeight);
      player.used_paths[columnNumber][rowNumber].push(player.current_path);
      [player.x, player.y] = player.breadcrumb_stack.pop();
      markBreadcrumbAsAvailable(player.x, player.y);
      player.current_path = [player.x, player.y];
      player.restoredX = player.x;
      player.restoredY = player.y;
    }
  }

  if (Commands.zoom && currentCamera == gameCameraNoAutoZoom) {
    gameState.do_redraw = true;
    try {
      if (currentCamera.referenceZ == false)   // == false because must disambiguate from case 0
        currentCamera.referenceZ = currentCamera.z;
      let newZ = currentCamera.referenceZ * (1 + Commands.zoom);
      if (newZ < 0.1) newZ = 0.1;
      if (newZ > 8.0) newZ = 8.0;
      currentCamera.z = newZ;
      currentCamera.zmin = currentCamera.z;
      currentCamera.zmax = currentCamera.z;

    } catch (err) {
      console.log(err.toString());
    }
  } else
    camera.referenceZ = false;

  if (Commands.auto_zoom) {
    gameState.do_redraw = true;
    camera = (camera == gameCameraNoAutoZoom) ? gameCameraWithAutoZoom : gameCameraNoAutoZoom;
    currentCamera = camera;
  }

  if (Commands.pause) {
    gameState.do_redraw = true;
    switchToPauseMode();
  }

  if (Commands.cheat) {
    gameState = cheatAnimation;
    gameState.animationState = "init_cheat_animation";
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

window.addEventListener('load', loadHandlerForWindow);
