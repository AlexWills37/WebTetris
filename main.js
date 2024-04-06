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

class QuadPiece {
    /**
     * Represents a piece with 4 blocks, a shape, a rotation index, whether it is active, and where it came from.
     * 
     * @param {string} shape Character representation of the player's shape (O, I, T, J, L, S, Z)
     * @constructor
     */
    constructor(shape) {
        /**
         * The positions (grid indices) of the piece's 4 blocks.
         * 
         * @type {number[][]}
         */
        this.blocks = [];

        /**
         * The shape of the piece (O, I, T, J, L, S, or Z are valid shapes).
         * 
         * @type {string}
         */
        this.shape = shape;

        /**
         * The rotation index of the piece, in the range [0, 3].
         * 
         * @type {number}
         */
        this.rotationIndex = 0;

        /**
         * Whether the piece should be displayed.
         * 
         * Used to hide the piece during a game over.
         * 
         * @type {boolean}
         */
        this.active = true;

        /**
         * Whether the piece came from the "Hold" spot.
         * 
         * @see {@link QuadtrisGame.holdPiece()}
         * 
         * @type {boolean}
         */
        this.wasHeld = false;

        let baseShape = QuadPiece.getBaseShape(shape);

        // Create the block at the top/middle of the grid 5, 18
        for (let i = 0; i < 4; i++) {
            this.blocks.push([...baseShape[i]]);
            this.blocks[i][0] += 3;
            this.blocks[i][1] += 19;
        }
    }


    /**
     * Offset data for rotating with the SRS.
     * 
     * Note: the offsets for the O piece should result in the piece not moving,
     * so it should always pass the first test.
     * 
     * @see {@link QuadtrisGame.tryRotatePiece()}
     * 
     * @example
     * // calculates the offset to apply to the I piece from rotation index 1 to 2 during the first test.
     * let offsetTable = QuadPiece.offsets.I;
     * let offsetTest = offsetTable[0];
     * let offset = [offsetTest[1] - offsetTest[2]];
     * 
     * @static
     */
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
            [[0, 0], [1, -1], [0, 0], [-1, -1]],
            [[0, 0], [0, 2], [0, 0], [0, 2]],
            [[0, 0], [1, 2], [0, 0], [-1, 2]]]
    }

    /**
     * Relative location for the different piece shapes.
     * 
     * Note: The "middle" block, to rotate the piece around, is in index 0 (always [1, 0]).
     * To access these positions from the shape's representation as a string, use
     * {@link QuadPiece.getBaseShape()}.
     * 
     * @static
     */
    static pieces = {
        O: [[1, 0], [1, 1], [2, 1], [2, 0]],
        I: [[1, 0], [0, 0], [2, 0], [3, 0]],
        L: [[1, 0], [0, 0], [2, 0], [2, 1]],
        J: [[1, 0], [0, 0], [0, 1], [2, 0]],
        T: [[1, 0], [0, 0], [2, 0], [1, 1]],
        S: [[1, 0], [0, 0], [1, 1], [2, 1]],
        Z: [[1, 0], [2, 0], [1, 1], [0, 1]]
    }

    /**
     * Accesses a piece shape's relative positions from its chararacter representation.
     * 
     * @see {@link QuadPiece.pieces}
     * 
     * @static
     * 
     * @example
     * // returns the locations for the L piece
     * QuadPiece.getBaseShape('L');
     * 
     * @param {string} shape Character representation of the piece (O, I, T, J, L, S, or Z are valid).
     * @returns {number[][]} 4-element array of 2-element coordinates with the locations of the shape's blocks.
     */
    static getBaseShape(shape) {
        let baseShape;
        switch(shape) {
            case 'O':
                baseShape = QuadPiece.pieces.O;
                break;
            case 'I':
                baseShape = QuadPiece.pieces.I;
                break;
            case 'L':
                baseShape = QuadPiece.pieces.L;
                break;
            case 'J':
                baseShape = QuadPiece.pieces.J;
                break;
            case 'T':
                baseShape = QuadPiece.pieces.T;
                break;
            case 'S':
                baseShape = QuadPiece.pieces.S;
                break;
            case 'Z':
                baseShape = QuadPiece.pieces.Z;
                break;
            default:
                baseShape = [[0, 0], [0, 0], [0, 0], [0, 0]];
        }
        return baseShape;
    }
}

class QuadtrisGame {
    /**
     * Represents the data needed to run the game.
     * 
     * This constructor also sets up the color and piece maps, used
     * to represent the different piece shapes as 3-bit integers with color values.
     * 
     * @constructor
     */
    constructor() {
        /*  ~~~  Properties for the game's setup    */

        /**
         * Number of rows in the grid.
         * 
         * @type {number}
         */
        this.numRows = 21;

        /**
         * Time (in seconds) for the grace timer to start with.
         * 
         * @see {@link QuadtrisGame.graceTimer}
         * @type {number}
         */
        this.graceTimerDuration = 0.5;

        /*  ~~~  Properties for the game's state    */

        /**
         * State of the game.
         * 
         * @type {boolean}
         */
        this.gameRunning = true;

        /**
         * The game's board.
         * 
         * Each row is 10 3-bit values, with 2 extra bits at the end.
         * 
         * @type {Uint32Array}
         */
        this.grid = new Uint32Array(this.numRows);

        /**
         * The player's currently moving and controllable piece.
         * 
         * @see {@link QuadPiece}
         * 
         * @type {QuadPiece}
         */
        this.playerPiece;
        
        
        /**
         * List of the next pieces, represented by their shape (char).
         * 
         * @type {string[]}
         */
        this.pieceQueue = [];
        
        /**
         * Grid coordinates of the ghost blocks, used to project the player piece's landing spot.
         * 
         * @type {number[][]}
         */
        this.ghostBlocks = [[0, 0],[0, 0],[0, 0],[0, 0]];
        this.refillPieceQueue();
        this.grabNextPiece();
        
        /**
         * The piece currently held (stored away).
         * 
         * @see {@link QuadtrisGame.holdPiece()}
         */
        this.heldPiece = null;
        
        /**
         * The number of lines the player has cleared.
         * 
         * @type {number}
         */
        this.lineClearCount = 0;


        /*  ~~~   Properties for the game's functions   */

        /**
         * The number of ticks between the game automatically moving the player's piece down.
         * 
         * This number decreases to increase the falling speed of the pieces.
         * 
         * @type {number}
         */
        this.ticksPerGravity = 15;

        /**
         * Map between piece shapes (char) and their 3-bit ID (1-7).
         * 
         * @type {Map<string, number>}
         */
        this.pieceMap = new Map();
        this.pieceMap.set('Z', 1);
        this.pieceMap.set('S', 2);
        this.pieceMap.set('O', 3);
        this.pieceMap.set('J', 4);
        this.pieceMap.set('T', 5);
        this.pieceMap.set('I', 6);
        this.pieceMap.set('L', 7);

        /**
         * Timer used to give the player time to move the piece after it lands.
         * 
         * @see {@link QuadtrisGame.startGraceTimer}
         * @see {@link QuadtrisGame.updateGraceTimer}
         * @see {@link QuadtrisGame.boostGraceTimer}
         * @type {number}
         */
        this.graceTimer = -1;

        /**
         * Number of times the grace timer has been extended.
         * 
         * @see {@link QuadtrisGame.graceTimer}
         * @type {number}
         */
        this.graceBoostCount = 0;

        /**
         * Whether the grace timer is running.
         * 
         * @see {@link QuadtrisGame.graceTimer}
         * @type {number}
         */
        this.timerRunning = false;

        

    
        
        this.rgbGrid = new Uint8Array(600);
        this.colorMap = new Map();
        this.colorMap.set(1, [255, 0, 0]);
        this.colorMap.set(2, [0, 255, 0]);
        this.colorMap.set(3, [255, 255, 0]);
        this.colorMap.set(4, [0, 0, 255]);
        this.colorMap.set(5, [180, 90, 246]);
        this.colorMap.set(6, [0, 255, 255]);
        this.colorMap.set(7, [255, 140, 40]);
    }

    /**
     * Checks if a block is in a grid space, or if the space is out of bounds.
     * 
     * @param {number}  x   The space's x index (in range [0, 9] ).
     * @param {number}  y   The space's y index (in range [0, numRows) ).
     * 
     * @returns {boolean}   False if the grid space is empty and in-bounds, true otherwise.
     */
    isBlockHere(x, y) {
        if (x < 0 || y < 0 || x >= 10 || y >= this.numRows) {
            return true;
        }
        const row = this.grid[y];
        const bitmask = 0b111 << (32 - (3 + 3 * x));
        return (row & bitmask) != 0;
    }

    /**
     * Accesses the value of a grid space.
     * 
     * 0 represents an empty space, and 1-7 represent different block colors
     * specified by {@link QuadtrisGame.colorMap}.
     *  
     * @param {number}  x The space's x index.
     * @param {number}  y The space's y index.
     * 
     * @returns {number}    The 3-bit representation of the grid space (0 = no block, 1-7 = different block colors).
     */
    getBlockData(x, y) {
        const row = this.grid[y];
        const bitshift = (32 - (3 + 3 * x));
        const bitmask = 0b111 << bitshift;
        return (row & bitmask) >>> bitshift;
    }

    /**
     * Sets a specific grid space to a block's colors.
     * 
     * Note: the color must be a number in the range [0, 7].
     * Since the colors are stored in 3-bit intervals, exceeding this range
     * may affect unintended parts of the grid.
     * 
     * @param {number} x        The space's x index.
     * @param {number} y        The space's y index.
     * @param {number} color    The 3-bit representation of the color to set (in range [0, 7]). 
     */
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

    /**
     * Moves the player's piece by a set amount.
     * 
     * This method does not check if the destination of the player's piece is valid.
     * 
     * @param {number} dx The number of grid spaces to move horizontally (positive = right, negative = left)
     * @param {number} dy The number of grid spaces to move vertically (positive = up, negative = down)
     */
    #movePlayerPiece(dx, dy) {
        for (let i = 0; i < 4; i++){
            this.playerPiece.blocks[i][0] += dx;
            this.playerPiece.blocks[i][1] += dy;
        }
        
    }

    /**
     * Attempts to move the player's piece by a set amount.
     * 
     * If the player's piece can move, it will move and update the ghost projection.
     * If the piece successfully moves horizontally, it will attempt to boost the grace timer.
     * If the piece successfully moves vertically, it will stop the grace timer entirely.
     * 
     * @param {number} dx The number of grid spaces to move horizontally (positive = right, negative = left)
     * @param {number} dy The number of grid spaces to move vertically (positive = up, negative = down)
     * 
     * @returns {boolean} Whether the piece was successfully moved by this method.
     */
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
            this.updateGhostProjections();
            if (dx != 0)
                this.boostGraceTimer();
            if (dy != 0){
                this.timerRunning = false;
            }
        }
        return canMove;
    }

    /**
     * Attempts to rotate the piece 90 degrees according to the SRS.
     * 
     * The SRS (Super Rotation System) is outlined here: {@link https://harddrop.com/wiki/SRS}.
     * It performs a rotation around a designated center block, then calculates a number of
     * offset translations to test in sequence. The piece will end up in the first position that
     * is valid.
     * 
     * If the rotation succeeds, the grace timer will be boosted and the ghost projection will be updated.
     * 
     * @param {boolean} clockwise True for a clockwise rotation (-90 degrees), false for counterclockwise (+90 degrees).
     */
    #resolveRotation(clockwise) {
        let rotationTargetIndex =  (this.playerPiece.rotationIndex + 4 + (clockwise ? 1 : -1)) % 4;
        let centerOffset = [...this.playerPiece.blocks[0]];

        // Deeply copy the active blocks for location tests
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

        // Mathematically rotate the blocks around the center
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
        }

        // Get the offset table for the right piece
        let offsetTable;
        switch(this.playerPiece.shape) {
            case 'O':
                offsetTable = QuadPiece.offsets.O;
                break;
            case 'I':
                offsetTable = QuadPiece.offsets.I;
                break;
            default:
                offsetTable = QuadPiece.offsets.OTHER;
                break;
        }

        // Test up to 5 offsets, stopping early if the test succeeds
        let offsetRow;
        let offset;
        let canRotate = false;
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


        // Rotate if one of the positions worked
        if (canRotate) {
            // Set block positions to the successful test
            for (let i = 0; i < 4; i++) {
                this.playerPiece.blocks[i] = [...testBlocks[i]];
            }
            this.playerPiece.rotationIndex = rotationTargetIndex;
            this.updateGhostProjections();
            this.boostGraceTimer();
        }
    }

    tryRotatePiece(clockwise) {
        this.#resolveRotation(clockwise);
    }

    /**
     * Copies the state of the player's piece into the game's grid data.
     * 
     * The color to set comes from the game's maps, and the locations come from the
     * blocks in the player piece.
     */
    depositPlayerPiece() {
        let x, y;
        let color = this.pieceMap.get(this.playerPiece.shape);
        for (let i = 0; i < 4; i++) {
            x = this.playerPiece.blocks[i][0];
            y = this.playerPiece.blocks[i][1];
            this.placeBlockHere(x, y, color);
        }
    }

    /**
     * Adds the next 7 pieces to the piece queue.
     * 
     * The piece queue is semi-random. The queue is always refilled with
     * each of the 7 piece shapes, but in a random order.
     */
    refillPieceQueue() {
        let pieces = ['O', 'I', 'T', 'J', 'L', 'S', 'Z'];
        let choice;
        for (let i = 0; i < 7; i++) {
            choice = Math.floor(Math.random() * pieces.length);
            this.pieceQueue.push(pieces[choice]);
            pieces.splice(choice, 1);
        }
    }

    /**
     * Replaces the player's current piece with the next piece in the queue.
     * 
     * This method also checks for a game over, which occurs if there are blocks
     * preventing the next piece from starting in an unblocked position.
     * If the piece queue is running low, it will refill it.
     */
    grabNextPiece() {
        let nextPiece = this.pieceQueue[0];
        this.pieceQueue.splice(0, 1);
        if (this.pieceQueue.length < 7) {
            this.refillPieceQueue();
        }
        delete this.playerPiece;
        this.playerPiece = new QuadPiece(nextPiece);
        // Check if move is possible, otherwise game over
        if (!this.isPlayerPieceValid()) {
            this.playerPiece.active = false;
            this.gameRunning = false;
        }
        this.updateGhostProjections();
    }
    
    /**
     * Checks if the locations of the player piece are valid.
     * 
     * A location is valid if it is within the grid's bounds and not occupied by a block
     * on the grid @see {@link QuadtrisGame.isBlockHere}
     * 
     * @returns {boolean} True if the player piece's locations are all valid.
     */
    isPlayerPieceValid() {
        let valid = true;
        for (let i = 0; i < 4 && valid; i++) {
            if (this.isBlockHere(this.playerPiece.blocks[i][0], this.playerPiece.blocks[i][1])) {
                valid = false;
            }
        }

        return valid;
    }

    /**
     * Activates the grace timer.
     * 
     * Also resets the boost count, used to limit the number of boosts the player is allowed.
     * Note: the timer's value must be manually updated every tick with {@link QuadtrisGame.updateGraceTimer}.
     */
    startGraceTimer() {
        this.graceTimer = this.graceTimerDuration;
        this.timerRunning = true;
        this.graceBoostCount = 0;
    }

    /**
     * Lower's the timer's value.
     * 
     * @param {number} deltaTime The time (in seconds) to lower the timer by.
     */
    updateGraceTimer(deltaTime) {
        this.graceTimer -= deltaTime;
    }

    /**
     * Extends the grace timer to allow the player to continue moving the piece.
     * 
     * Once the player's piece hits the ground, before locking into place, a grace timer is
     * started, and it must finish before locking the piece. If the player moves their piece, 
     * the timer is extended. The player is only allowed to extend this timer a certain
     * number of times (to prevent infinite stalling).
     */    
    boostGraceTimer() {
        if (this.timerRunning && this.graceBoostCount < 30) {
            this.graceTimer = Math.min(this.graceTimer + 0.5, this.graceTimerDuration);
            this.graceBoostCount++;
        }
    }

    /**
     * Moves the player's piece as far down as it can go.
     * 
     * The player's piece will land where the projected ghost blocks are.
     * The piece will also be locked into the board, preventing the player from moving the piece further.
     * 
     * @see {@link QuadtrisGame.finishWithPiece}
     */
    hardDropPlayerPiece() {
        while (this.tryMovePiece(0, -1)) {}
        this.finishWithPiece();
    }

    /**
     * Runs the functions to handle the player's piece being locked into place.
     * 
     * 1. Places the player's piece on the grid.
     * 
     * 2. Deletes the current player piece and replaces it with the next in the queue.
     * 
     * 3. Stops the timer used for giving the player a small grace period to move the piece.
     * 
     * 4. Resolves any line clears.
     * 
     * @see {@link QuadtrisGame.depositPlayerPiece}
     * @see {@link QuadtrisGame.grabNextPiece}
     * @see {@link QuadtrisGame.resolveLineClears}
     */
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

    /**
     * Scans the game board, clearing full rows and updating score.
     * 
     * Also updates the ghost projections, since the board's data may have changed.
     * 
     * @see {@link QuadtrisGame.clearRow}
     */
    resolveLineClears() {
        // Search from the bottom for full lines
        for (let y = 0; y < this.numRows; y++) {
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

    /**
     * Removes the blocks from a row, moving the above rows down.
     * 
     * @param {number}  row The index of the row to clear (0 represents the bottom row). 
     */
    clearRow(row) {
        // Copy every row down one
        for (let y = row; y < this.numRows - 1; y++) {
            this.grid[y] = this.grid[y + 1]
        }
        // Remove last row
        this.grid[this.numRows - 1] = 0;
    }

    /**
     * Recalculates the positions of the ghost blocks.
     * 
     * The ghost blocks indicate where the player's current piece will land if the player
     * does not move or rotate it.
     */
    updateGhostProjections() {
        // Start with a copy of the player's block pieces
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

            // If blocks won't collide, move ghosts down and iterate again
            if (!willCollide) {
                for (let i = 0; i < 4; i++) {
                    this.ghostBlocks[i][1] -= 1;
                }
            }
        }
    }

    /**
     * Stores the player's current piece in the "Hold" space if possible.
     * 
     * The player can only hold a piece once; if the player's piece came from this function,
     * it will not be able to be stored again.
     * If there is already a piece in the "Hold" space, it will be swapped with the player's piece.
     * Otherwise, the player will receive the next piece in the queue. The player's new piece will start
     * at the top of the board, and can possibly trigger a game over.
     */
    holdPiece() {
        // If this is the first time the player is holding a piece, we get the next piece from the queue.
        if (this.heldPiece == null) {
            // Hold the current piece and grab the next one
            this.heldPiece = this.playerPiece.shape;
            this.grabNextPiece();
        
            // Otherwise, we can only hold a piece that hasn't been held before (it came from the queue)
        } else if (!this.playerPiece.wasHeld) {
            let nextPiece = this.heldPiece;
            this.heldPiece = this.playerPiece.shape;

            // Construct the new piece from the held piece data, and prevent it from being held again
            this.playerPiece = new QuadPiece(nextPiece);
            this.playerPiece.wasHeld = true;

            // Check if move is possible, otherwise game over
            // Note: this should realistically never happen (the grid has not changed since the last piece),
            //      but it is possible due to different piece shapes
            if (!this.isPlayerPieceValid()) {
                this.playerPiece.active = false;
                this.gameRunning = false;
            }

            // With a new piece, we need a new projection!
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
        /**
         * Accurate representation of action states based on user input.
         * 
         * @type {Map<string, boolean}
         */
        this.actionStates = new Map();
        this.actionStates.set("HardDrop", false);
        this.actionStates.set("SoftDrop", false);
        this.actionStates.set("MoveLeft", false);
        this.actionStates.set("MoveRight", false);
        this.actionStates.set("Hold", false);
        this.actionStates.set("RotateClockwise", false);
        this.actionStates.set("RotateAntiClockwise", false);

        /**
         * Key bindings from key representations to action states.
         * 
         * Note: single character keys should be uppercase, or they will not be accessed properly.
         * 
         * 
         * @type {Map<string, string>}
         */
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
        
        /**
         * Counters for connecting action states to tick counts.
         * 
         * When {@link Input.updateCounters()} is called, the counters for any
         * active actions will be increased, and the counters for any inactive actions
         * will be cleared.
         * 
         * @example
         * // Every tick, update the counters
         * inputMod.updateCounters();
         * // Check if this is the first tick the player is pressing the hold button
         * if (inputMod.getCounter("Hold") == 1)
         *      // Hold the piece
         * 
         * @type {Map<string, number>}
         */
        this.counters = new Map();
        this.counters.set("MoveLeft", 0);
        this.counters.set("MoveRight", 0);
        this.counters.set("RotateClockwise", 0);
        this.counters.set("RotateAntiClockwise", 0);
        this.counters.set("HardDrop", 0);
        this.counters.set("Hold", 0);
    }

    /**
     * Accesses the input action that a key is bound to.
     * 
     * If the key is a single character, it will be set to uppercase,
     * so 'a' and 'A' both correspond to the same action.
     * 
     * @param {string} key The key being pressed.
     * @returns {string} The input action this key is bound to in {@link Input.inputKeys}.
     */
    keyToState(key) {
        if (key.length == 1) {
            key = key.toUpperCase();
        }

        return this.inputKeys.get(key);
    }

    /**
     * Updates the state of an input action from a key.
     * 
     * This will override the current value of the input action, so if you have multiple keys
     * bound to the same action, the action's state will match the most recent keyboard event.
     * 
     * @see {@link Input.inputKeys}
     * 
     * @param {string} key The key from a keyboard event.
     * @param {boolean} value The new value for the input action (should be true for keydown, false for keyup).
     */
    setInputState(key, value) {
        let action = this.keyToState(key);
        if (action != null) {
            this.actionStates.set(action, value);
        }
    }

    /**
     * Accesses the value of an input state.
     * 
     * @see {@link Input.actionStates}.
     * 
     * @param {string} inputAction The input action to read.
     * @returns {boolean} True if the input action was set to true by a bound key.
     */
    getInputState(inputAction) {
        if (this.actionStates.has(inputAction)) {
            return this.actionStates.get(inputAction);
        } else {
            console.log("ERROR: trying to access an input action that doesn't exist (" + inputAction + "). The allowed options are:");
            this.actionStates.forEach(function(value, key, map) {
                console.log("    - " + key);
            });
        }
        return null;
    }

    /**
     * Updates the values of the counters for input actions.
     * 
     * This function should be called once every game tick, before
     * the counters are checked.
     * 
     * @example
     * inputMod = new Input();
     * // ...
     * // Every tick:
     * inputMod.updateCounters();
     * if (inputMod.getCounter("Action") == 1) {
     *      // This blcok will happen only once each time the player presses the button
     * }
     * 
     * if (inputMod.getCounter("Action2") == 1 || inputMod.getCounter("Action2") > 5) {
     *      // This block will happen immediately when the player presses the button,
     *      // then it will skip the next 4 ticks, and execute again after the player has
     *      // held the button for 5 ticks, every tick.
     * }
     * 
     * @see {@link Input.counters}
     */
    updateCounters() {      
        for (const [key, value] of this.counters) {
            if (this.getInputState(key)) {
                this.counters.set(key, value + 1);
            } else {
                this.counters.set(key, 0);
            }
        }
    }

    /**
     * Accesses the input action's counter.
     * 
     * If {@link Input.updateCounters()} is called once at the start of every game tick,
     * the counters will represent the number of ticks an input has been held.
     * 
     * @see {@link Input.counters}
     * 
     * @example
     * // Run code once when the player presses the button
     * if (inputMod.getCounter("Action") == 1) {
     *      //...
     * }
     * @example
     * // Run code repeatedly after the player has held the button for 10 ticks
     * if (inputMod.getCounter("Action") >= 10) {
     *      //...
     * }
     * 
     * @param {string} inputAction The input action to check.
     * @returns {number} The number of consecutive ticks this action has been held 
     * (assuming {@link Input.updateCounters()} has been called once each tick).
     */
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
        let locations = QuadPiece.getBaseShape(piece);
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

    var lineClearNode = document.createTextNode("1");
    document.querySelector("#linesCleared").appendChild(lineClearNode);
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

    let Tetris = new QuadtrisGame();
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
                    Tetris.startGraceTimer();
                }
            }

            // Deposit piece if lock timer has elapsed AND piece cannot move down
            if (Tetris.timerRunning) {
                Tetris.updateGraceTimer(deltaTime);
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

        lineClearNode.nodeValue = Tetris.lineClearCount;
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