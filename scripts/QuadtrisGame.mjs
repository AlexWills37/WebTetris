/**
 * @fileoverview Contains 2 classes: QuadtrisGame and QuadPiece, for running a game of Quadtris.
 * 
 * Note: {@link QuadtrisGame.runTick()} is dependent on the QuadtrisInput class.
 * 
 * @author Alex Wills
 * @version 1.0.0
 */

import {QuadtrisInput} from './QuadtrisInput.mjs'

/**
 * Creates and manages a game of Quadtris.
 * 
 * By default, gameState.gameOver is true and gameState.isPaused is false.
 * 
 * At a rate consistent with {@link QuadtrisGame.gameTickTime}, run the
 * {@link QuadtrisGame.runTick()} function to run the game. If gameState.isPaused is true,
 * running the tick will check for the game to unpause.
 * 
 * To visualize the game, you can use {@link QuadtrisGame.gameState} to access
 * all of the relevant data for visualization, and you can use {@link QuadtrisGame.isStateChanged}
 * once every frame to determine if the game's state has changed and the visualization should be updated.
 * 
 * @example
 * let game = new QuadtrisGame();
 * let inputMod = new QuadtrisInput();
 * // In the gameplay loop, at a fixed interval
 * game.runTick(inputMod);
 * 
 * @example
 * // In the render loop, every frame
 * if (game.isStateChanged) {
 *      let newState = game.gameState;
 *      // Update the visuals
 * }
 */
export class QuadtrisGame {

    /**
     * Number of rows in the grid.
     * 
     * @type {number}
     */
    numRows = 21;

    /**
     * Time (in seconds) for the grace timer to start with.
     * 
     * @see {@link QuadtrisGame.graceTimer}
     * @type {number}
     */
    graceTimerDuration = 0.5;

    /**
     * Time (in seconds) between game ticks.
     * 
     * Used to update the grace timer from {@link QuadtrisGame.runTick()}.
     * 
     * @type {number}
     */
    gameTickTime = 1.0 / 30.0;

    /**
     * Map between piece shapes (char) and their 3-bit ID (1-7).
     * 
     * @type {Map<string, number>}
     */
    pieceMap = new Map();


    /**
     * The data required to run and display the game.
     */
    gameState = {
        /**
         * Whether the game is running.
         * @type {boolean}
         */
        isPaused: false,

        gameOver: true,

        /**
         * The game's board.
         * 
         * Each row is 10 3-bit values, with 2 extra bits at the end.
         * 
         * @type {Uint32Array}
         */
        gridData: new Uint32Array(this.numRows),

        /**
         * The player's currently moving and controllable piece.
         * 
         * @see {@link QuadPiece}
         * 
         * @type {QuadPiece}
         */
        playerPiece: null,

        /**
         * List of the next pieces, represented by their shape (char).
         * 
         * @type {string[]}
         */
        pieceQueue: [],

        /**
         * The piece currently held (stored away).
         * 
         * Represented as the shape of the piece:
         * O, I, T, L, J, S, Z are the valid shapes.
         * 
         * @see {@link QuadtrisGame.holdPiece()}
         * @type {string | null}
         */
        heldPiece: null,

        /**
         * Grid coordinates of the ghost blocks, used to project the player piece's landing spot.
         * 
         * @type {number[][]}
         */
        ghostBlocks: [[0, 0],[0, 0],[0, 0],[0, 0]],

        /**
         * The number of lines the player has cleared.
         * 
         * @type {number}
         */
        linesCleared: 0,


        /**
         * The level of speed the pieces fall at.
         * 
         * @type {number}
         */
        speedLevel: 1
    }

    /**
     * Returns whether the game's state has changed since this property was last accessed.
     * 
     * @see {@link QuadtrisGame.#isStateChanged}
     * @type {boolean}
     */
    get isStateChanged() {
        const value = this.#isStateChanged;
        this.#isStateChanged = false;
        return value;
    }

    static levels = {
        1: 15,
        2: 14,
        3: 13,
        4: 12,
        5: 11,
        6: 10,
        7: 9,
        8: 7,
        9: 5,
        10: 3,
        11: 1,
        max: 11
    }

    // Private properties
    /**
     * The number of ticks between the game automatically moving the player's piece down.
     * 
     * This number decreases to increase the falling speed of the pieces.
     * 
     * @type {number}
     */
    #ticksPerGravity = 15;

    /**
     * Whether the game's state has changed since the last time this flag was checked.
     * 
     * The public getter {@link QuadtrisGame.isStateChanged} will clear this flag when called.
     */
    #isStateChanged = true;

    /**
     * How many ticks have passed since gravity was last applied.
     * 
     * @type {number}
     */
    #gravityTickCounter = 0;

    


    /**
     * Timer used to give the player time to move the piece after it lands.
     * 
     * @see {@link QuadtrisGame.#startGraceTimer}
     * @see {@link QuadtrisGame.#updateGraceTimer}
     * @see {@link QuadtrisGame.#boostGraceTimer}
     * @type {number}
     */
    #graceTimer = -1;

    /**
     * Number of times the grace timer has been extended.
     * 
     * @see {@link QuadtrisGame.graceTimer}
     * @type {number}
     */
    #graceBoostCount = 0;

    /**
     * Whether the grace timer is running.
     * 
     * @see {@link QuadtrisGame.graceTimer}
     * @type {number}
     */
    #timerRunning = false;

    /**
     * Whether the game is playing its game over animation, before setting the game state's game over to true.
     */
    #gameOverAnimation = false;


    /**
     * Represents the data needed to run the game.
     * 
     * This constructor also sets up the color and piece maps, used
     * to represent the different piece shapes as 3-bit integers with color values.
     * 
     * @constructor
     */
    constructor() {

        // Set up the piece queue and initialize the first piece.
        this.#refillPieceQueue();
        this.#grabNextPiece();
        this.#updateGhostProjections();
        
        this.#ticksPerGravity = 15;

        this.pieceMap.set('Z', 1);
        this.pieceMap.set('S', 2);
        this.pieceMap.set('O', 3);
        this.pieceMap.set('J', 4);
        this.pieceMap.set('T', 5);
        this.pieceMap.set('I', 6);
        this.pieceMap.set('L', 7);
        this.gameState.isPaused = true;
    }
    

    /**
     * Progresses the game by 1 tick.
     * 
     * @param {QuadtrisInput} inputMod 
     */
    runTick(inputMod) {


        // If game is paused, only the input mod will update
        inputMod.updateCounters();
        if (!this.gameState.isPaused) {

            let pieceMoved = false;
    
            // Handle player input
            if (this.#gameOverAnimation) {
                // Game over animation
                if (this.animationCount == null || this.rowCount == null) {
                    this.animationCount = 0;
                    this.rowCount = 0;
                } else {
                    this.animationCount++;
                    if (this.rowCount < this.numRows && this.animationCount % 4 == 0) {
                        this.clearRow(0);
                        this.rowCount++;
                        this.#isStateChanged = true;
                    } else if (this.rowCount == this.numRows) {
                        // True game over; the animation is finished
                        this.rowCount++;
                        this.gameState.gameOver = true;
                    }
                } 
    
            }
            else if (inputMod.getCounter("HardDrop") == 1) {
                this.hardDropPlayerPiece();// Do hard drop
                this.finishWithPiece();
                pieceMoved = true;
            }
            else if (inputMod.getCounter("Hold") == 1) {
                this.holdPiece();
                pieceMoved = true;
            }
            else {
                // 1 - check for soft drop
                if (inputMod.getInputState("SoftDrop")) {
                    pieceMoved = this.tryMovePiece(0, -1) || pieceMoved;
                }
        
                // 2 - rotate piece
                let rotation = 0;
                if (inputMod.getCounter("RotateClockwise") == 1)
                    rotation += 1;
                if (inputMod.getCounter("RotateAntiClockwise") == 1)
                    rotation -= 1;
    
                if (rotation != 0)
                    pieceMoved = this.tryRotatePiece(rotation == 1) || pieceMoved;
    
                // 3 - move piece
                let movement = 0;
                if (inputMod.getCounter("MoveLeft") == 1 || inputMod.getCounter("MoveLeft") > 5)
                    movement -= 1;
                if (inputMod.getCounter("MoveRight") == 1 || inputMod.getCounter("MoveRight") > 5)
                    movement += 1;
    
                if (movement != 0)
                    pieceMoved = this.tryMovePiece(movement, 0) || pieceMoved;
    
    
                // Count ticks for gravity
                this.#gravityTickCounter++;
                if (this.#gravityTickCounter >= this.#ticksPerGravity) {
                    let atBottom = !this.tryMovePiece(0, -1);
                    pieceMoved ||= !atBottom;
                    this.#gravityTickCounter = 0;
        
                    if (atBottom && !this.#timerRunning) {
                        this.#startGraceTimer();
                    }
                }
    
                // Deposit piece if lock timer has elapsed AND piece cannot move down
                if (this.#timerRunning) {
                    this.#updateGraceTimer(this.gameTickTime);
                    if (this.#graceTimer <= 0) {
                        let atBottom = !this.tryMovePiece(0, -1);
                        pieceMoved = true; 
                        if (atBottom) {
                            this.finishWithPiece();
                        }
                    }
                }
    
            }
            if (pieceMoved) {
                this.#updateGhostProjections();
                this.#isStateChanged = true;
            }
        } // End of unpause block.

        //     if (inputMod.getCounter("Pause") == 1) {
        //         this.gameState.isPaused = true;
        //     }
        // } else {    // If isPaused is false, 
        //     if (inputMod.getCounter("Pause") == 1) {
        //         this.gameState.isPaused = false;
        //     }
        // }

    }

    pauseGame(pause) {
        this.gameState.isPaused = pause;
    }

    /**
     * Resets the game's data and begins a new game.
     * 
     * After calling this function, consistently call {@link QuadtrisGame.runTick()}
     * to play the game, and access the data to render with {@link QuadtrisGame.isStateChanged}
     * and {@link QuadtrisGame.gameState}.
     */
    startNewGame() {
        this.gameState.gameOver = false;
        this.gameState.isPaused = false;
        this.#gameOverAnimation = false;
        this.animationCount = null;
        this.rowCount = null;

        // Reset grid
        for (let i = 0; i < this.gameState.gridData.length; i++) {
            this.gameState.gridData[i] = 0;
        }

        this.gameState.linesCleared = 0;
        this.gameState.speedLevel = 0;
        this.gameState.pieceQueue = [];
        this.#refillPieceQueue();
        this.#grabNextPiece();
        this.#updateGhostProjections();
        this.#updateSpeedLevel();
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
            let x = this.gameState.playerPiece.blocks[i][0] + dx;
            let y = this.gameState.playerPiece.blocks[i][1] + dy;
            if (this.isBlockHere(x, y))
                canMove = false;
        }

        if (canMove) {
            this.#movePlayerPiece(dx, dy);
            if (dx != 0)
                this.#boostGraceTimer();
            if (dy != 0){
                this.#timerRunning = false;
            }
        }
        return canMove;
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
    }

    /**
     * Attempts to rotate the piece on the grid.
     * 
     * @param {boolean} clockwise Whether the rotation should be -90 degrees.
     * @returns {boolean} Whether the rotation succeeded and the player's piece has been moved.
     */
    tryRotatePiece(clockwise) {
        let rotated = this.#resolveRotation(clockwise);
        if (rotated) {
            this.#boostGraceTimer();
        }
        
        return rotated;
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
        if (this.gameState.heldPiece == null) {
            // Hold the current piece and grab the next one
            this.gameState.heldPiece = this.gameState.playerPiece.shape;
            this.#grabNextPiece();
        
            // Otherwise, we can only hold a piece that hasn't been held before (it came from the queue)
        } else if (!this.gameState.playerPiece.wasHeld) {
            let nextPiece = this.gameState.heldPiece;
            this.gameState.heldPiece = this.gameState.playerPiece.shape;

            // Construct the new piece from the held piece data, and prevent it from being held again
            this.gameState.playerPiece = new QuadPiece(nextPiece);
            this.gameState.playerPiece.wasHeld = true;

            // Check if move is possible, otherwise game over
            // Note: this should realistically never happen (the grid has not changed since the last piece),
            //      but it is possible due to different piece shapes
            if (!this.isPlayerPieceValid()) {
                this.gameState.playerPiece.active = false;
                this.#gameOverAnimation = true;
            }

        }
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
     * @see {@link QuadtrisGame.#depositPlayerPiece}
     * @see {@link QuadtrisGame.#grabNextPiece}
     * @see {@link QuadtrisGame.#resolveLineClears}
     */
    finishWithPiece() {
        const previousLinesCleared = this.gameState.linesCleared;
        this.#depositPlayerPiece();
        this.#grabNextPiece();
        this.#timerRunning = false;
        this.#resolveLineClears();

        if (this.gameState.linesCleared != previousLinesCleared) {
            this.#updateSpeedLevel();
        }
    }

    /**
     * Removes the blocks from a row, moving the above rows down.
     * 
     * @param {number}  row The index of the row to clear (0 represents the bottom row). 
     */
    clearRow(row) {
        // Copy every row down one
        for (let y = row; y < this.numRows - 1; y++) {
            this.gameState.gridData[y] = this.gameState.gridData[y + 1]
        }
        // Remove last row
        this.gameState.gridData[this.numRows - 1] = 0;
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
        const row = this.gameState.gridData[y];
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
        const row = this.gameState.gridData[y];
        const bitshift = (32 - (3 + 3 * x));
        const bitmask = 0b111 << bitshift;
        return (row & bitmask) >>> bitshift;
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
            if (this.isBlockHere(this.gameState.playerPiece.blocks[i][0], this.gameState.playerPiece.blocks[i][1])) {
                valid = false;
            }
        }

        return valid;
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
    #placeBlockHere(x, y, color) {
        const bitshift = 32 - (3 + 3 * x);
        // Clear the old bits
        const clearmask = ~(0b111 << bitshift);
        this.gameState.gridData[y] &= clearmask;

        // Set new bits
        const newData = color << (32 - (3 + 3 * x));
        this.gameState.gridData[y] |= newData;
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
            this.gameState.playerPiece.blocks[i][0] += dx;
            this.gameState.playerPiece.blocks[i][1] += dy;
        }
        
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
     * 
     * @returns {boolean} Whether or not the rotation was successful and the piece moved.
     */
    #resolveRotation(clockwise) {
        let rotationTargetIndex =  (this.gameState.playerPiece.rotationIndex + 4 + (clockwise ? 1 : -1)) % 4;
        let centerOffset = [...this.gameState.playerPiece.blocks[0]];

        // Deeply copy the active blocks for location tests
        let testBlocks = [];
        for (let i = 0; i < 4; i++) {
            testBlocks.push([...this.gameState.playerPiece.blocks[i]]);
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
        switch(this.gameState.playerPiece.shape) {
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
            offset = [offsetRow[this.gameState.playerPiece.rotationIndex][0] - offsetRow[rotationTargetIndex][0],
                        offsetRow[this.gameState.playerPiece.rotationIndex][1] - offsetRow[rotationTargetIndex][1]];

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
                this.gameState.playerPiece.blocks[i] = [...testBlocks[i]];
            }
            this.gameState.playerPiece.rotationIndex = rotationTargetIndex;
        }

        return canRotate;
    }

    

    /**
     * Copies the state of the player's piece into the game's grid data.
     * 
     * The color to set comes from the game's maps, and the locations come from the
     * blocks in the player piece.
     */
    #depositPlayerPiece() {
        let x, y;
        let color = this.pieceMap.get(this.gameState.playerPiece.shape);
        for (let i = 0; i < 4; i++) {
            x = this.gameState.playerPiece.blocks[i][0];
            y = this.gameState.playerPiece.blocks[i][1];
            this.#placeBlockHere(x, y, color);
        }
    }

    /**
     * Adds the next 7 pieces to the piece queue.
     * 
     * The piece queue is semi-random. The queue is always refilled with
     * each of the 7 piece shapes, but in a random order.
     */
    #refillPieceQueue() {
        let pieces = ['O', 'I', 'T', 'J', 'L', 'S', 'Z'];
        let choice;
        for (let i = 0; i < 7; i++) {
            choice = Math.floor(Math.random() * pieces.length);
            this.gameState.pieceQueue.push(pieces[choice]);
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
    #grabNextPiece() {
        let nextPiece = this.gameState.pieceQueue[0];
        this.gameState.pieceQueue.splice(0, 1);
        if (this.gameState.pieceQueue.length < 7) {
            this.#refillPieceQueue();
        }
        delete this.gameState.playerPiece;
        this.gameState.playerPiece = new QuadPiece(nextPiece);
        // Check if move is possible, otherwise game over
        if (!this.isPlayerPieceValid()) {
            this.gameState.playerPiece.active = false;
            this.#gameOverAnimation = true;
        }
    }
    
    

    /**
     * Activates the grace timer.
     * 
     * Also resets the boost count, used to limit the number of boosts the player is allowed.
     * Note: the timer's value must be manually updated every tick with {@link QuadtrisGame.#updateGraceTimer}.
     */
    #startGraceTimer() {
        this.#graceTimer = this.graceTimerDuration;
        this.#timerRunning = true;
        this.#graceBoostCount = 0;
    }

    /**
     * Lower's the timer's value.
     * 
     * @param {number} deltaTime The time (in seconds) to lower the timer by.
     */
    #updateGraceTimer(deltaTime) {
        this.#graceTimer -= deltaTime;
    }

    /**
     * Extends the grace timer to allow the player to continue moving the piece.
     * 
     * Once the player's piece hits the ground, before locking into place, a grace timer is
     * started, and it must finish before locking the piece. If the player moves their piece, 
     * the timer is extended. The player is only allowed to extend this timer a certain
     * number of times (to prevent infinite stalling).
     */    
    #boostGraceTimer() {
        if (this.#timerRunning && this.#graceBoostCount < 30) {
            this.#graceTimer = Math.min(this.#graceTimer + 0.5, this.graceTimerDuration);
            this.#graceBoostCount++;
        }
    }

    

    

    /**
     * Scans the game board, clearing full rows and updating score.
     * 
     * Also updates the ghost projections, since the board's data may have changed.
     * 
     * @see {@link QuadtrisGame.clearRow}
     */
    #resolveLineClears() {
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
                this.gameState.linesCleared++;
                y--; // Decrease the row to stay at the same coordinate for the next iteration
            }
        }
    }

    /**
     * Recalculates the positions of the ghost blocks.
     * 
     * The ghost blocks indicate where the player's current piece will land if the player
     * does not move or rotate it.
     */
    #updateGhostProjections() {
        // Start with a copy of the player's block pieces
        for (let i = 0; i < 4; i++) {
            this.gameState.ghostBlocks[i] = [...this.gameState.playerPiece.blocks[i]];
        }

        // Move ghost blocks down until they can't anymore
        let willCollide = false;
        while (!willCollide) {
            // Check blocks below
            for (let i = 0; i < 4; i++) {
                if (this.isBlockHere(this.gameState.ghostBlocks[i][0], this.gameState.ghostBlocks[i][1] - 1)) {
                    willCollide = true;
                }
            }

            // If blocks won't collide, move ghosts down and iterate again
            if (!willCollide) {
                for (let i = 0; i < 4; i++) {
                    this.gameState.ghostBlocks[i][1] -= 1;
                }
            }
        }
    }

    
    #updateSpeedLevel() {
        this.gameState.speedLevel = Math.min(Math.floor(this.gameState.linesCleared / 10) + 1, QuadtrisGame.levels.max);
        this.#ticksPerGravity = QuadtrisGame.levels[this.gameState.speedLevel];
    }
    
}

/**
 * A standard piece containing 4 adjacent blocks.
 * 
 * A piece can be constructed from a valid shape with `new QuadPiece(shape)`, where
 * `shape` is a string, either O, I, T, J, L, S, or Z.
 * 
 * The base relative values for the shapes (fitting in a 4x2 grid with (0, 0) in the bottom left)
 * can be retrieved with `QuadPiece.getBaseShape(shape)`.
 * 
 * This class also contains offset data for the SRS.
 * @see {@link QuadPiece.offsets}
 * @see {@link QuadPiece.getBaseShape()}
 */
export class QuadPiece {
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
