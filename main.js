import * as THREE from 'three';
import WebGL from 'three/addons/capabilities/WebGL.js';
import * as twgl from 'twgl.js/dist/5.x/twgl-full.js'

function resizeCanvasToDisplaySize(canvas) {
    // Lookup the size the browser is displaying the canvas in CSS pixels.
    const displayWidth  = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;

    // Check if the canvas is not the same size.
    const needResize = canvas.width  !== displayWidth ||
                    canvas.height !== displayHeight;

    if (needResize) {
    // Make the canvas the same size
    canvas.width  = displayWidth;
    canvas.height = displayHeight;
    }

    return needResize;
}

function createShader(gl, type, source) {
    let shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    let success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
        return shader;
    }

    console.log(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
}

function createProgram(gl, vertexShader, fragmentShader) {
    let program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    let success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
        return program;
    }
    
    console.log(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
}

class ActivePiece {
    constructor(shape) {
        this.blocks = [];
        this.shape = shape;
        this.rotationIndex = 0;
        this.active = true;
        this.wasHeld = false;

        let baseShape = ActivePiece.getBaseShape(shape);

        // Create the block at the top/middle of the grid 5, 18
        for (let i = 0; i < 4; i++) {
            this.blocks.push([...baseShape[i]]);
            this.blocks[i][0] += 3;
            this.blocks[i][1] += 19;
        }
    }


    static offsets = {
        O: [[[0, 0],
            [0, -1],
            [-1, -1],
            [-1, 0]]],
        I: [[[0, 0], [-1, 0], [-1, 1], [0, 1]], 
            [[-1, 0], [0, 0], [1, 1], [0, 1]],
            [[2, 0], [0, 0], [-2, 1], [0, 1]],
            [[-1, 0], [0, 1], [1, 0], [0, -1]],
            [[2, 0], [0, -2], [-2, 0], [0, 2]]],
        OTHER: [[[0, 0], [0, 0], [0, 0], [0, 0]],
            [[0, 0], [1, 0], [0, 0], [-1, 0]],
            [[0, 0], [1, -1], [0, 0], [-1, 1]],
            [[0, 0], [0, 2], [0, 0], [0, 2]],
            [[0, 0], [1, 2], [0, 0], [-1, 2]]
    ]


    }

    static pieces = {
        O: [[1, 0], [1, 1], [2, 1], [2, 0]],
        I: [[1, 0], [0, 0], [2, 0], [3, 0]],
        L: [[1, 0], [0, 0], [2, 0], [2, 1]],
        J: [[1, 0], [0, 0], [0, 1], [2, 0]],
        T: [[1, 0], [0, 0], [2, 0], [1, 1]],
        S: [[1, 0], [0, 0], [1, 1], [2, 1]],
        Z: [[1, 0], [2, 0], [1, 1], [0, 1]]
    }

    static getBaseShape(shape) {
        let baseShape;
        switch(shape) {
            case 'O':
                baseShape = ActivePiece.pieces.O;
                break;
            case 'I':
                baseShape = ActivePiece.pieces.I;
                break;
            case 'L':
                baseShape = ActivePiece.pieces.L;
                break;
            case 'J':
                baseShape = ActivePiece.pieces.J;
                break;
            case 'T':
                baseShape = ActivePiece.pieces.T;
                break;
            case 'S':
                baseShape = ActivePiece.pieces.S;
                break;
            case 'Z':
                baseShape = ActivePiece.pieces.Z;
                break;
            default:
                baseShape = [[0, 0], [0, 0], [0, 0], [0, 0]];
        }
        return baseShape;
    }
}

class TetrisGame {
    constructor() {
        this.numRows = 21;
        this.gameRunning = true;
        this.grid = new Uint32Array(this.numRows);
        this.rgbGrid = new Uint8Array(600);
        this.colorMap = new Map();
        this.pieceMap = new Map();
        this.pieceQueue = [];
        this.ghostBlocks = [[0, 0],[0, 0],[0, 0],[0, 0]];

        this.lockTimer = -1;
        this.lockTimerDuration = 0.5;
        this.lockBoostCounter = 0;
        this.timerRunning = false;

        this.lineClearCount = 0;
        this.ticksPerGravity = 15;

        this.heldPiece = null;

        this.refillPieceQueue();
        this.grabNextPiece();

        this.colorMap.set(1, [255, 0, 0]);
        this.colorMap.set(2, [0, 255, 0]);
        this.colorMap.set(3, [255, 255, 0]);
        this.colorMap.set(4, [0, 0, 255]);
        this.colorMap.set(5, [180, 90, 246]);
        this.colorMap.set(6, [0, 255, 255]);
        this.colorMap.set(7, [255, 140, 40]);

        this.pieceMap.set('Z', 1);
        this.pieceMap.set('S', 2);
        this.pieceMap.set('O', 3);
        this.pieceMap.set('J', 4);
        this.pieceMap.set('T', 5);
        this.pieceMap.set('I', 6);
        this.pieceMap.set('L', 7);
    }

    isBlockHere(x, y) {
        if (x < 0 || y < 0 || x >= 10 || y >= this.numRows) {
            return true;
        }
        const row = this.grid[y];
        const bitmask = 0b111 << (32 - (3 + 3 * x));
        return (row & bitmask) != 0;
    }

    getBlockData(x, y) {
        const row = this.grid[y];
        const bitshift = (32 - (3 + 3 * x));
        const bitmask = 0b111 << bitshift;
        return (row & bitmask) >>> bitshift;
    }

    placeBlockHere(x, y, color) {
        const bitshift = 32 - (3 + 3 * x);
        // Clear the old bits
        const clearmask = ~(0b111 << bitshift);
        this.grid[y] &= clearmask;

        // Set new bits
        const newData = color << (32 - (3 + 3 * x));
        this.grid[y] |= newData;
    }

    generateRGBGrid() {
        for (let iy = 0; iy < 20; iy++){
            for (let ix = 0; ix < 10; ix++) {
                let blockData = this.getBlockData(ix, iy);

                let startIndex = 30 * iy + 3 * ix;
                if (blockData != 0){
                    let color = this.colorMap.get(blockData);
                    this.rgbGrid[startIndex] = color[0];
                    this.rgbGrid[startIndex + 1] = color[1];
                    this.rgbGrid[startIndex + 2] = color[2];
                } else {
                    this.rgbGrid[startIndex] = 0;
                    this.rgbGrid[startIndex + 1] = 0;
                    this.rgbGrid[startIndex + 2] = 0;
                }
            }
        }

        if (this.playerPiece.active) {

            // Draw ghost blocks to texture
            for (let i = 0; i < 4; i++ ) {
                let grey = 200;
                let ghostStartIndex = 30 * this.ghostBlocks[i][1] + 3 * this.ghostBlocks[i][0];
                this.rgbGrid[ghostStartIndex] = grey;
                this.rgbGrid[ghostStartIndex + 1] = grey;
                this.rgbGrid[ghostStartIndex + 2] = grey;
            }
    
            // Draw player blocks to texture
            let playerBlocks = this.playerPiece.blocks;
            for (let i = 0; i < 4; i++){
                let color = this.colorMap.get(this.pieceMap.get(this.playerPiece.shape));
                let startIndex = 30 * playerBlocks[i][1] + 3 * playerBlocks[i][0];
                this.rgbGrid[startIndex] = color[0];
                this.rgbGrid[startIndex + 1] = color[1];
                this.rgbGrid[startIndex + 2] = color[2];
    
            }
        }


        

        return this.rgbGrid;
    }

    generateRainbowGrid(offset) {
        for(let y = 0; y < 20; y++) {
            for (let x = 0; x < 10; x++) {
                let startIndex = 30 * y + 3 * x;
                this.rgbGrid[startIndex] = (Math.sin((x + (y * 10) + offset) * 3.14 / 200) * 0.5 + 0.5) * 255;
                this.rgbGrid[startIndex + 1] = (Math.sin((x + (y * 10) + offset) * 3.14 / 200 + 3.14/2) * 0.5 + 0.5) * 255;
                this.rgbGrid[startIndex + 2] = (Math.sin((x + (y * 10) + offset) * 3.14 / 200 + 3.14/3) * 0.5 + 0.5) * 255;
            }
        }

        return this.rgbGrid;
    }

    #movePlayerPiece(dx, dy) {
        for (let i = 0; i < 4; i++){
            this.playerPiece.blocks[i][0] += dx;
            this.playerPiece.blocks[i][1] += dy;
        }
        this.updateGhostProjections();
    }

    tryMovePiece(dx, dy) {
        let canMove = true;
        for (let i = 0; i < 4 && canMove; i++) {
            let x = this.playerPiece.blocks[i][0] + dx;
            let y = this.playerPiece.blocks[i][1] + dy;
            if (this.isBlockHere(x, y))
                canMove = false;
        }

        if (canMove) {
            this.#movePlayerPiece(dx, dy);
            if (dx != 0)
                this.boostTimer();
            if (dy != 0){
                this.timerRunning = false;
            }
        }
        return canMove;
    }

    #resolveRotation(clockwise) {
        let canRotate = true;
        let rotationTargetIndex =  (this.playerPiece.rotationIndex + 4 + (clockwise ? 1 : -1)) % 4;
        let centerOffset = [...this.playerPiece.blocks[0]];
        // Deeply copy the blocks to test locations
        let testBlocks = [];
        for (let i = 0; i < 4; i++) {
            testBlocks.push([...this.playerPiece.blocks[i]]);
        }

        let xMod = 1;
        let yMod = 1;
        if (clockwise) {
            yMod = -1;
        } else {
            xMod = -1;
        }
        let temp;

        // Pure rotation around the center block
        for (let i = 0; i < 4; i++) {
            // Move block to sample space
            testBlocks[i][0] -= centerOffset[0];
            testBlocks[i][1] -= centerOffset[1];

            // Rotate around the center piece
            temp = testBlocks[i][0];
            testBlocks[i][0] = xMod * testBlocks[i][1];
            testBlocks[i][1] = yMod * temp;

            // Move back to game space
            testBlocks[i][0] += centerOffset[0];
            testBlocks[i][1] += centerOffset[1];

            // // Apply initial offset
            // if(this.playerPiece.shape == 'O') {
            //     let kickOffset = [];
            //     for (let i = 0; i < 2; i++){
            //         kickOffset.push( ActivePiece.offsets.O[this.playerPiece.rotationIndex][i] - ActivePiece.offsets.O[rotationTargetIndex][i]);
            //     }
            //     testBlocks[i][0] += kickOffset[0];
            //     testBlocks[i][1] += kickOffset[1];
            // }

            // if (this.isBlockHere(testBlocks[i][0], testBlocks[i][1])) {
            //     canRotate = false;
            // }
        }
        // Test 5 offsets and stop at earliest one
        let offsetTable;
        switch(this.playerPiece.shape) {
            case 'O':
                offsetTable = ActivePiece.offsets.O;
                break;
            case 'I':
                offsetTable = ActivePiece.offsets.I;
                break;
            default:
                offsetTable = ActivePiece.offsets.OTHER;
                break;
        }

        let offsetRow;
        let offset;
        canRotate = false;
        // Test up to 5 offsets, stopping early if the test succeeds
        for (let i = 0; i < 5 && !canRotate; i++) {
            // Get offset from SRS table
            offsetRow = offsetTable[i];
            offset = [offsetRow[this.playerPiece.rotationIndex][0] - offsetRow[rotationTargetIndex][0],
                        offsetRow[this.playerPiece.rotationIndex][1] - offsetRow[rotationTargetIndex][1]];

            // Apply offset and test blocks
            canRotate = true;
            for (let j = 0; j < 4; j++) {
                testBlocks[j][0] += offset[0];
                testBlocks[j][1] += offset[1];
                if (this.isBlockHere(testBlocks[j][0], testBlocks[j][1])) {
                    canRotate = false;
                }
            }

            // If any of the blocks failed, undo the offset for the next test
            if (!canRotate) {
                for (let j = 0; j < 4; j++) {
                    testBlocks[j][0] -= offset[0];
                    testBlocks[j][1] -= offset[1];
                }
            }
            // If none of the blocks failed, canRotate will be true, testBlocks will be in the right location,
            // and this test loop will stop
        }

        // // If needed, test moving to the left
        // if (!canRotate){
        //     canRotate = true;
        //     for (let i = 0; i < 4; i++){
        //         testBlocks[i][0] += 1;
        //         if (this.isBlockHere(testBlocks[i][0], testBlocks[i][1])) {
        //             canRotate = false;
        //         }
        //     }
        // }

        // // If needed, test moving to the right
        // if (!canRotate) {
        //     canRotate = true;
        //     for (let i = 0; i < 4; i++){
        //         testBlocks[i][0] -= 2;
        //         if (this.isBlockHere(testBlocks[i][0], testBlocks[i][1])) {
        //             canRotate = false;
        //         }
        //     }
        // }

        // Rotate if one of the positions worked
        if (canRotate) {
            // Set block positions to the successful test
            for (let i = 0; i < 4; i++) {
                this.playerPiece.blocks[i] = [...testBlocks[i]];
            }
            this.playerPiece.rotationIndex = rotationTargetIndex;
            this.updateGhostProjections();
            this.boostTimer();
        }
    }

    tryRotatePiece(clockwise) {
        this.#resolveRotation(clockwise);
    }

    depositPlayerPiece() {
        let x, y;
        let color = this.pieceMap.get(this.playerPiece.shape);
        for (let i = 0; i < 4; i++) {
            x = this.playerPiece.blocks[i][0];
            y = this.playerPiece.blocks[i][1];
            this.placeBlockHere(x, y, color);
        }
    }

    refillPieceQueue() {
        let pieces = ['O', 'I', 'T', 'J', 'L', 'S', 'Z'];
        let choice;
        for (let i = 0; i < 7; i++) {
            choice = Math.floor(Math.random() * pieces.length);
            this.pieceQueue.push(pieces[choice]);
            pieces.splice(choice, 1);
        }
    }

    grabNextPiece() {
        let nextPiece = this.pieceQueue[0];
        this.pieceQueue.splice(0, 1);
        if (this.pieceQueue.length < 7) {
            this.refillPieceQueue();
        }
        delete this.playerPiece;
        this.playerPiece = new ActivePiece(nextPiece);
        // Check if move is possible, otherwise game over
        if (!this.isPlayerPieceValid()) {
            this.playerPiece.active = false;
            this.gameRunning = false;
        }
        this.updateGhostProjections();
    }
    
    isPlayerPieceValid() {
        let valid = true;
        for (let i = 0; i < 4 && valid; i++) {
            if (this.isBlockHere(this.playerPiece.blocks[i][0], this.playerPiece.blocks[i][1])) {
                valid = false;
            }
        }

        return valid;
    }

    startLockTimer() {
        this.lockTimer = this.lockTimerDuration;
        this.timerRunning = true;
        this.lockBoostCounter = 0;
    }

    updateLockTimer(deltaTime) {
        this.lockTimer -= deltaTime;
    }

    boostTimer() {
        if (this.timerRunning && this.lockBoostCounter < 30) {
            this.lockTimer = Math.min(this.lockTimer + 0.5, this.lockTimerDuration);
            this.lockBoostCounter++;
        }
    }

    hardDropPlayerPiece() {
        while (this.tryMovePiece(0, -1)) {}
        this.finishWithPiece();
    }

    finishWithPiece() {
        let previousClearCount = this.lineClearCount;
        this.depositPlayerPiece();
        this.grabNextPiece();
        this.timerRunning = false;
        this.resolveLineClears();

        // if (previousClearCount != this.lineClearCount) {
        //     this.ticksPerGravity = Math.max(0, this.ticksPerGravity - 1);
        // }
    }
    resolveLineClears() {
        // Search from the bottom for full lines
        for (let y = 0; y < 20; y++) {
            let fullRow = true;
            for (let x = 0; x < 10 && fullRow; x++) {
                if (!this.isBlockHere(x, y)) {
                    fullRow = false;
                }
            }
            // If row is full, clear it
            if (fullRow) {
                this.clearRow(y);
                this.lineClearCount++;
                y--; // Decrease the row to stay at the same coordinate for the next iteration
            }
        }
        this.updateGhostProjections();
    }

    clearRow(row) {
        // Copy every row down one
        for (let y = row; y < this.numRows - 1; y++) {
            this.grid[y] = this.grid[y + 1]
        }
        // Remove last row
        this.grid[this.numRows - 1] = 0;
    }

    updateGhostProjections() {
        // Start with the player's block pieces
        for (let i = 0; i < 4; i++) {
            this.ghostBlocks[i] = [...this.playerPiece.blocks[i]];
        }

        // Move ghost blocks down until they can't anymore
        let willCollide = false;
        while (!willCollide) {
            // Check blocks below
            for (let i = 0; i < 4; i++) {
                if (this.isBlockHere(this.ghostBlocks[i][0], this.ghostBlocks[i][1] - 1)) {
                    willCollide = true;
                }
            }

            // If ready for next loop, move ghosts down
            if (!willCollide) {
                for (let i = 0; i < 4; i++) {
                    this.ghostBlocks[i][1] -= 1;
                }
            }
        }
    }

    holdPiece() {
        if (this.heldPiece == null) {
            // Hold the current piece and grab the next one
            this.heldPiece = this.playerPiece.shape;
            this.grabNextPiece();
        } else if (!this.playerPiece.wasHeld) {
            let nextPiece = this.heldPiece;
            this.heldPiece = this.playerPiece.shape;
            this.playerPiece = new ActivePiece(nextPiece);
            this.playerPiece.wasHeld = true;
            // Check if move is possible, otherwise game over
            if (!this.isPlayerPieceValid()) {
                this.playerPiece.active = false;
                this.gameRunning = false;
            }
            this.updateGhostProjections();
        }
    }

    get gameState() {
        return {
            board: this.grid,
            queue: this.pieceQueue,
            held: this.heldPiece,
            linesCleared: this.lineClearCount
        };
    }
}

class Input {
    constructor() {
        this.inputStates = new Map();
        this.inputStates.set("HardDrop", false);
        this.inputStates.set("SoftDrop", false);
        this.inputStates.set("MoveLeft", false);
        this.inputStates.set("MoveRight", false);
        this.inputStates.set("Hold", false);
        this.inputStates.set("RotateClockwise", false);
        this.inputStates.set("RotateAntiClockwise", false);

        this.inputKeys = new Map();
        this.inputKeys.set("A", "MoveLeft");
        this.inputKeys.set("D", "MoveRight");
        this.inputKeys.set("W", "HardDrop");
        this.inputKeys.set("S", "SoftDrop");
        this.inputKeys.set("E", "Hold");
        this.inputKeys.set("ArrowLeft", "RotateAntiClockwise");
        this.inputKeys.set("J", "RotateAntiClockwise");
        this.inputKeys.set("ArrowRight", "RotateClockwise");
        this.inputKeys.set("L", "RotateClockwise");
        
        this.counters = new Map();
        this.counters.set("MoveLeft", 0);
        this.counters.set("MoveRight", 0);
        this.counters.set("RotateClockwise", 0);
        this.counters.set("RotateAntiClockwise", 0);
        this.counters.set("HardDrop", 0);
        this.counters.set("Hold", 0);
    }

    keyToState(key) {
        if (key.length == 1) {
            key = key.toUpperCase();
        }

        return this.inputKeys.get(key);
    }

    setInputState(key, value) {
        let action = this.keyToState(key);
        if (action != null) {
            this.inputStates.set(action, value);
        }
    }

    getInputState(inputAction) {
        if (this.inputStates.has(inputAction)) {
            return this.inputStates.get(inputAction);
        } else {
            console.log("ERROR: trying to access an input action that doesn't exist (" + inputAction + "). The allowed options are:");
            this.inputStates.forEach(function(value, key, map) {
                console.log("    - " + key);
            });
        }
        return null;
    }

    updateCounters() {      
        for (const [key, value] of this.counters) {
            if (this.getInputState(key)) {
                this.counters.set(key, value + 1);
            } else {
                this.counters.set(key, 0);
            }
        }
    }

    getCounter(inputAction) {
        if (this.counters.has(inputAction)) {
            return this.counters.get(inputAction);
        } else {
            console.log("ERROR: trying to access input action that doesn't have a counter (" + inputAction + "). The counters are:" );
            this.counters.forEach(function(value, key, map) {
                console.log("    - " + key + ": " + value);
            });
        }
        return null;
    }

    
}

function createQueueTextureData(heldPiece, queue, colorMap, pieceMap) {
    // Each piece is fits in a 4x2 space, with a possible 0.5 offset for the O or I pieces.
    // This offset will be handled in the shader?
    let data = new Uint8Array(8 * 3 * 5);
    let rowSize = 4 * 3;
    function encodePiece(piece, startingIndex) {
        let locations = ActivePiece.getBaseShape(piece);
        let color = colorMap.get(pieceMap.get(piece));
        for (let i = 0; i < 4; i++) {
            let relativeBlock = locations[i];
            let texStartIndex = startingIndex + relativeBlock[1] * rowSize + relativeBlock[0] * 3;
            data[texStartIndex] = color[0];
            data[texStartIndex + 1] = color[1];
            data[texStartIndex + 2] = color[2];
        }
    }

    // Encode the held piece first
    if (heldPiece != null)
        encodePiece(heldPiece, 0);
    // Encode the queued pieces
    for (let i = 0; i < 4; i++) {
        encodePiece(queue[i], 24 * (1 + i));
    }

    return data;
}

function main() {
    let inputMod = new Input();
    document.addEventListener('keydown', function(event) {
        inputMod.setInputState(event.key, true);
    });
    document.addEventListener('keyup', function(event) {
        inputMod.setInputState(event.key, false);
    });

    
    let canvas = document.querySelector("#canvas");

    /**@type {WebGLRenderingContext} */
    const gl = canvas.getContext("webgl");
    if(!gl) {
        const warning = WebGL.getWebGLErrorMessage();
        document.body.appendChild(warning);
    }

    
    // Specify the viewport size to convert from clip space [-1, 1] to canvas pixels
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // Create shader
    let vsSource = document.querySelector("#vertex-shader-2d").text;
    let fsSource = document.querySelector("#fragment-shader-2d").text;
    const programInfo = twgl.createProgramInfo(gl,[vsSource, fsSource]);


    // Create buffers

    const arrays = {
        a_Position: {numComponents: 2, data:[
            -0.5, -1,
            0.5, -1,
            0.5, 1,
            -0.5, 1,
            -0.75, 1 - 0.2,
            -0.55, 1 - 0.2,
            -0.55, 1,
            -0.75, 1,
            0.55, 1 - 0.2,
            0.75, 1 - 0.2,
            0.75, 1,
            0.55, 1,
            0.55, 0.50,
            0.75, 0.50,
            0.75, 0.70,
            0.55, 0.70,
            0.55, 0.30,
            0.75, 0.30,
            0.75, 0.50,
            0.55, 0.50]},
        a_GridPos: {numComponents: 2, data: [0, 0, 10, 0, 10, 20, 0, 20, 
            0, 0, 4, 0, 4, 4, 0, 4, 
            0, 0, 4, 0, 4, 4, 0, 4,
            0, 0, 4, 0, 4, 4, 0, 4,
            0, 0, 4, 0, 4, 4, 0, 4]},
        a_QueueID: {numComponents: 1 , data: [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3]},
        a_ShaderID: {numComponents: 1, data: [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]},
        indices: {numComponents: 3, data: [0, 1, 2, 2, 3, 0, 4, 5, 6, 6, 7, 4, 8, 9, 10, 10, 11, 8, 12, 13, 14, 14, 15, 12,
            16, 17, 18, 18, 19, 16]}
    };

    const bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);

    let gridDataTex = gl.createTexture();
    let gridData = new Uint8Array(200 * 3);
    gl.bindTexture(gl.TEXTURE_2D, gridDataTex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 10, 20, 0, gl.RGB, gl.UNSIGNED_BYTE, gridData);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    let queueDataTex = gl.createTexture();
    let queueData = new Uint8Array(3 * 4 * 2 * 5);
    gl.bindTexture(gl.TEXTURE_2D, queueDataTex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 4, 2 * 5, 0, gl.RGB, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    let blockImg = {src: "textures/block.png", mag: gl.LINEAR};
    let blockTexture = twgl.createTexture(gl, blockImg);

    let Tetris = new TetrisGame();
    // Tetris.placeBlockHere(0, 5, 1);
    // Tetris.placeBlockHere(1, 5, 2);
    // Tetris.placeBlockHere(2, 5, 3);
    // Tetris.placeBlockHere(3, 5, 4);
    // Tetris.placeBlockHere(4, 5, 5);
    // Tetris.placeBlockHere(5, 5, 6);
    // Tetris.placeBlockHere(6, 5, 7);
    // Tetris.placeBlockHere(6, 6, 7);
    // Tetris.placeBlockHere(6, 7, 7);
    // Tetris.placeBlockHere(5, 7, 7);

    
    
    let gravityCounter = 0;
    //let ticksPerGravity = 15;
    let animationCount = 0;
    let rowCount = 0;

    function updateGame(deltaTime) {
        // Handle player input
        inputMod.updateCounters();
        if (!Tetris.gameRunning) {
            animationCount++;
            if (rowCount < Tetris.numRows && animationCount % 4 == 0) {
                Tetris.clearRow(0);
                rowCount++;
            }
        }
        else if (inputMod.getCounter("HardDrop") == 1)
            Tetris.hardDropPlayerPiece();// Do hard drop
        else if (inputMod.getCounter("Hold") == 1) {
            Tetris.holdPiece();
        }
        else {
            // 1 - check for soft drop
            if (inputMod.getInputState("SoftDrop")) {
                Tetris.tryMovePiece(0, -1);
            }
    
            // 2 - rotate piece
            let rotation = 0;
            if (inputMod.getCounter("RotateClockwise") == 1)
                rotation += 1;
            if (inputMod.getCounter("RotateAntiClockwise") == 1)
                rotation -= 1;

            if (rotation != 0)
                Tetris.tryRotatePiece(rotation == 1);

            // 3 - move piece
            let movement = 0;
            if (inputMod.getCounter("MoveLeft") == 1 || inputMod.getCounter("MoveLeft") > 5)
                movement -= 1;
            if (inputMod.getCounter("MoveRight") == 1 || inputMod.getCounter("MoveRight") > 5)
                movement += 1;

            if (movement != 0)
                Tetris.tryMovePiece(movement, 0);


            // Count ticks for gravity
            gravityCounter++;
            if (gravityCounter >= Tetris.ticksPerGravity) {
                let atBottom = !Tetris.tryMovePiece(0, -1);
                gravityCounter = 0;
    
                if (atBottom && !Tetris.timerRunning) {
                    Tetris.startLockTimer();
                }
            }

            // Deposit piece if lock timer has elapsed AND piece cannot move down
            if (Tetris.timerRunning) {
                Tetris.updateLockTimer(deltaTime);
                if (Tetris.lockTimer <= 0 && !Tetris.tryMovePiece(0, -1)) {
                    // Timer up!
                    Tetris.finishWithPiece();
                }
            }
    
            // Deposit piece if timer is elapsed
            // if (Tetris.isLockTimerElapsed()) {
            //     Tetris.depositPlayerPiece();
            //     Tetris.grabNextPiece();
            //     Tetris.stopLockTimer();
            // }

        }


    }

    function renderFrame(time) {
        // Get the game state
        gridData = Tetris.generateRGBGrid();
        queueData = createQueueTextureData(Tetris.heldPiece, Tetris.pieceQueue, Tetris.colorMap, Tetris.pieceMap);

        // Resize canvas if it changes
        twgl.resizeCanvasToDisplaySize(gl.canvas);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        // Send the game state to the GPU as a texture
        gl.bindTexture(gl.TEXTURE_2D, gridDataTex);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 10, 20, gl.RGB, gl.UNSIGNED_BYTE, gridData);
        gl.bindTexture(gl.TEXTURE_2D, queueDataTex);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 4, 10, gl.RGB, gl.UNSIGNED_BYTE, queueData);
        
        // Create uniform list
        const uniforms = {
            u_Time: time * 0.001,
            u_Resolution: [gl.canvas.width, gl.canvas.height],
            u_GridData: gridDataTex,
            u_QueueData: queueDataTex,
            u_BlockTexture: blockTexture,
        };
    
        // Draw the frame
        gl.useProgram(programInfo.program); // Bind the shader program
        twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);  // Enable/create the attribute pointers
        twgl.setUniforms(programInfo, uniforms);    // Set the shader uniforms
        twgl.drawBufferInfo(gl, bufferInfo);    // Call the appropriate draw function

    }


    let timeSinceGameTick = 0;
    let gameTickTime = 1.0 / 30.0;
    let lastFrameTime = 0;
    function processFrame(time) {
        let deltaTime = (time - lastFrameTime) * 0.001;
        lastFrameTime = time;
        timeSinceGameTick += deltaTime;

        // Run game tick when time elapses
        if (timeSinceGameTick >= gameTickTime) {
            updateGame(gameTickTime);
            
            timeSinceGameTick = Math.min(timeSinceGameTick - gameTickTime, gameTickTime);

        }

        // Render graphics every frame
        renderFrame(time);
        
        // Queue up the next frame
        requestAnimationFrame(processFrame);
    }
    requestAnimationFrame(processFrame);

    // let trueLastTime = 0;
    // let trueTime2 = 0;
    // let deltaTimeTrue = 0;
    // while (true) {
    //     deltaTimeTrue = Date.now() * 0.001 - trueLastTime;
    //     if( deltaTimeTrue > gameTickTime) {
    //         updateGame();
    //         avg += deltaTimeTrue;

    //         count++;
    //         trueLastTime = deltaTimeTrue + trueLastTime;
            
    //         if (count >= 100) {
    //             console.log("avg tick rate: " + (count / avg));
    //             avg = 0;
    //             count = 0;
    //         }
    //     }
    // }

    // DEVON'S COMMENT ABOUT SEPARATING RENDER AND GAME LOOP
    

}



main();