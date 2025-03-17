/**
 * @fileoverview Rendering functions for the Quadtris game.
 * 
 * @author Alex Wills
 */
import * as twgl from 'twgl.js/dist/5.x/twgl-full.js';
import {QuadPiece} from './QuadtrisGame.mjs'

export class QuadtrisRenderer {
    
    /** Canvas for rendering. @type {HTMLCanvasElement} */
    canvas = document.querySelector("#canvas");

    /** WebGL context. @type {WebGLRenderingContext} */
    gl;

    /** Map between block type (1-7) and block color. @type {Map<number, number[]>} */
    #colorMap = new Map();

    /** Map between shape (char) and block type (1-7) */
    #pieceMap = new Map();
    

    /** @type {twgl.ProgramInfo} */
    #shaderInfo;

    /** Base vertex information. @type {twgl.BufferInfo} */
    #vertexBufferInfo;

    /** 10x20 texture containing the color of every block on the game board (0, 0, 0 = no block) @type {WebGLTexture | null} */
    #gridDataTex;

    /** RGB data for the gridDataTex. @type {Uint8Array} */
    #gridRGBData = new Uint8Array(600);

    /** 
     * 4x10 texture containing the held/next pieces.
     * 
     * (0, 0) to (4, 1) represents the held piece.
     * (0, 1) to (4, 2) representes the next piece.
     * The following piece is above the previous.
     * @type {WebGLTexture | null}
     */
    #queueDataTex;

    /** RGB data for the queueDataTex. @type {Uint8Array} */
    #queueRGBData = new Uint8Array(3 * 40);

    /** Base texture for the individual blocks. @type {WebGLTexture} */
    #blockTex;

    /** Text to display number of line clears. @type {Text} */
    #lineClearNode = document.createTextNode('0');

    #speedLevelNode = document.createTextNode('1');
    #scoreNode = document.createTextNode("0");  

    constructor() {
        // Attach the line clear count to the HTML
        document.querySelector("#linesCleared").appendChild(this.#lineClearNode);
        document.querySelector("#speedLevel").appendChild(this.#speedLevelNode);
        document.querySelector("#score").appendChild(this.#scoreNode);

        // Create color map
        this.#colorMap.set(1, [255, 0, 0]);
        this.#colorMap.set(2, [0, 255, 0]);
        this.#colorMap.set(3, [255, 255, 0]);
        this.#colorMap.set(4, [0, 0, 255]);
        this.#colorMap.set(5, [180, 90, 246]);
        this.#colorMap.set(6, [0, 255, 255]);
        this.#colorMap.set(7, [255, 140, 40]);
        this.#pieceMap.set('Z', 1);
        this.#pieceMap.set('S', 2);
        this.#pieceMap.set('O', 3);
        this.#pieceMap.set('J', 4);
        this.#pieceMap.set('T', 5);
        this.#pieceMap.set('I', 6);
        this.#pieceMap.set('L', 7);

        // Create WebGL context
        let gl = this.canvas.getContext("webgl");
        this.gl = gl;
        if (!gl) {
            document.body.appendChild(document.createTextNode("WebGL is not supported."));
        }

        function quadFromDimensions(left, top, width, height) {
            let data = [
                left, top + height,
                left + width, top + height,
                left + width, top,
                left, top
            ];
            return data;
        }
        function createGameQuads(gridHeight, spaceFromBoard, pixelsBetween, size) {
            let gridWH = [gridHeight/2, gridHeight];
            let positions = [];
            
            let gridTop = (500 - gridWH[1]) / 2;
            let gridLeft = (400 - gridWH[0]) / 2;
            positions.push(...quadFromDimensions(gridLeft, gridTop, gridWH[0], gridWH[1]));
            
            // Hold square
            positions.push(...quadFromDimensions(gridLeft - spaceFromBoard - size, gridTop, size, size));
            // Queue
            for (let i = 0; i < 3; i++) {
                positions.push(...quadFromDimensions(gridLeft + spaceFromBoard + gridWH[0], gridTop + (i * (size + pixelsBetween)), size, size));
                
            }

            return positions;
        }

        // Create base vertex data
        const vertexArrays = {
            a_Position: {numComponents: 2, data: createGameQuads(500, 5, 0, 70)},
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

        this.#vertexBufferInfo = twgl.createBufferInfoFromArrays(gl, vertexArrays);
        // With the data in the buffer, the original arrays are not needed on the CPU.

        // Create shader program
        let vsSource = document.querySelector("#vertex-shader-2d").text;
        let fsSource = document.querySelector("#fragment-shader-2d").text;
        this.#shaderInfo = twgl.createProgramInfo(gl, [vsSource, fsSource]);

        // Create block image
        let blockImg = {src: "textures/block.png", mag: gl.LINEAR};
        this.#blockTex = twgl.createTexture(this.gl, blockImg);

        // Create data textures
        this.#gridDataTex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.#gridDataTex);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 10, 20, 0, gl.RGB, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        this.#queueDataTex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.#queueDataTex);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 4, 2 * 5, 0, gl.RGB, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        // Bind the buffers to WebGL
        gl.useProgram(this.#shaderInfo.program);
        twgl.setBuffersAndAttributes(gl, this.#shaderInfo, this.#vertexBufferInfo);

        // Set initial uniform variables
        let uniforms = {
            u_GridData: this.#gridDataTex,
            u_QueueData: this.#queueDataTex,
            u_BlockTexture: this.#blockTex,
        };
        twgl.setUniforms(this.#shaderInfo, uniforms);
        }

    /**
     * Updates all of the necessary buffers with the data
     * from the game state.
     * 
     * @param {Object}      gameState               The data needed to render the game.
     * @param {Uint32Array} gameState.gridData      The grid, where every row is a 32 bit integer.
     *                                              From right to left, the bits are in groups of 3,
     *                                              where each group is a block in the row. 0 = no block,
     *                                              and 1-7 represent different colored blocks.
     * @param {QuadPiece}   gameState.playerPiece   The player's currently active piece, with locations and a shape.
     * @param {string[]}    gameState.pieceQueue    The next pieces in the queue.
     * @param {string}      gameState.heldPiece     The piece shape currently on hold.
     * @param {number[][]}  gameState.ghostBlocks   The locations of the 4 ghost blocks, used to project the player piece's 
     *                                              landing spot.
     * @param {number}      gameState.linesCleared  The number of lines the player has cleared.
     * @param {number}      gameState.speedLevel    The speed level the game is on.
     * @param {number}      gameState.score         The player's score.
     */
    updateData(gameState) {
        // Update the grid texture
        this.#updateGridDataTexture(gameState);
        // Update the held/piece queue texture
        this.#updatePieceOverlay(gameState);
        // Update the GUI overlay
        this.#updateGUIOverlay(gameState);
    }

    /**
     * Renders the current data to the WebGL-enabled canvas.
     */
    renderGame() {
        // Update HTML scale
        twgl.resizeCanvasToDisplaySize(this.gl.canvas);
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);

        // Update dynamic uniforms
        let uniforms = {
            u_GridData: this.#gridDataTex,
            u_QueueData: this.#queueDataTex,
            u_BlockTexture: this.#blockTex,
        };

        twgl.setUniforms(this.#shaderInfo, uniforms);
        twgl.drawBufferInfo(this.gl, this.#vertexBufferInfo);
    }

    /**
     * Updates the texture used to determine block placement on the game board.
     * 
     * @param {Object}      gameState               The data needed to render the game.
     * @param {Uint32Array} gameState.gridData      The grid, where every row is a 32 bit integer.
     *                                              From right to left, the bits are in groups of 3,
     *                                              where each group is a block in the row. 0 = no block,
     *                                              and 1-7 represent different colored blocks.
     * @param {QuadPiece}   gameState.playerPiece   The player's currently active piece, with locations and a shape.
     * @param {number[][]}  gameState.ghostBlocks   The locations of the 4 ghost blocks, used to project the player piece's
     *                                              landing spot. 
     */
    #updateGridDataTexture(gameState) {
        // Draw the base grid data
        for (let y = 0; y < 20; y++) {
            let row = gameState.gridData[y];
            for (let x = 0; x < 10; x++) {
                let blockData = this.#getBlockData(row, x);
                let startIndex = 3 * (10 * y + x);
                if (blockData != 0) {
                    // Draw a filled block
                    let color = this.#colorMap.get(blockData);
                    this.#gridRGBData[startIndex] = color[0];
                    this.#gridRGBData[startIndex + 1] = color[1];
                    this.#gridRGBData[startIndex + 2] = color[2];

                } else {
                    // Draw an empty space
                    this.#gridRGBData[startIndex] = 0;
                    this.#gridRGBData[startIndex + 1] = 0;
                    this.#gridRGBData[startIndex + 2] = 0;
                }
            } // End of row
        } // End of grid

        // If the player piece is active, draw it
        if (gameState.playerPiece.active) {
            // Start with the ghost projections, since the piece may be on top
            let grey = 170;
            for (let i = 0; i < 4; i++) {
                let ghostStartIndex = 3 * (10 * gameState.ghostBlocks[i][1] + gameState.ghostBlocks[i][0]);
                this.#gridRGBData[ghostStartIndex] = grey;
                this.#gridRGBData[ghostStartIndex + 1] = grey;
                this.#gridRGBData[ghostStartIndex + 2] = grey;
            }

            // Draw the player blocks, overwriting any overlapping ghost blocks
            let shape = gameState.playerPiece.shape;
            for (let i = 0; i < 4; i++) {
                let color = this.#colorMap.get(this.#pieceMap.get(shape));
                let startIndex = 3 * (10 * gameState.playerPiece.blocks[i][1] + gameState.playerPiece.blocks[i][0]);
                this.#gridRGBData[startIndex] = color[0];
                this.#gridRGBData[startIndex + 1] = color[1];
                this.#gridRGBData[startIndex + 2] = color[2];
            }
        }

        // Update the texture on the GPU
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.#gridDataTex);
        this.gl.texSubImage2D(this.gl.TEXTURE_2D, 0, 0, 0, 10, 20, this.gl.RGB, this.gl.UNSIGNED_BYTE, this.#gridRGBData);
    }

    /**
     * Reads into a row of the grid.
     * 
     * For the row, represented as a 32-bit integer, the leftmost bits are at index 0.
     * 
     * @param {number} row  32-bit representation of a row in the grid.
     * @param {number} x    index of the block in the row (0 = left, 9 = right).
     * @returns {number}    3-bit number (0-7) representing the data at this position.
     */
    #getBlockData(row, x) {
        const bitshift = (32 - (3 + 3 * x));
        const bitmask = 0b111 << bitshift;
        return (row & bitmask) >>> bitshift;
    }

    /**
     * Updates the texture used to determine the held/next pieces.
     * 
     * @param {Object}          gameState               The data needed to render the game.
     * @param {string[]}        gameState.pieceQueue    The next pieces in the queue.
     * @param {string | null}   gameState.heldPiece     The piece shape currently on hold.
     */
    #updatePieceOverlay(gameState) {
        // Erase old rgb data
        for (let i = 0; i < this.#queueRGBData.length; i++) {
            this.#queueRGBData[i] = 0;
        }

        // Overwrite the RGB array
        if (gameState.heldPiece != null) {
            this.#encodePieceToQueueTex(gameState.heldPiece, 0);
        }

        for (let i = 0; i < 4; i++) {
            this.#encodePieceToQueueTex(gameState.pieceQueue[i], 24 * (1 + i));
        }

        // Update the texture on the GPU
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.#queueDataTex);
        this.gl.texSubImage2D(this.gl.TEXTURE_2D, 0, 0, 0, 4, 10, this.gl.RGB, this.gl.UNSIGNED_BYTE, this.#queueRGBData);
    }

    /**
     * 
     * @param {string} piece 
     * @param {number} startingIndex 
     */
    #encodePieceToQueueTex(piece, startingIndex) {
        
        let locations = QuadPiece.getBaseShape(piece);
        let color = this.#colorMap.get(this.#pieceMap.get(piece));
        for (let i = 0; i < 4; i++) {
            let relativeBlock = locations[i];
            let texStartIndex = startingIndex + 3 * (relativeBlock[1] * 4 + relativeBlock[0]);
            this.#queueRGBData[texStartIndex] = color[0];
            this.#queueRGBData[texStartIndex + 1] = color[1];
            this.#queueRGBData[texStartIndex + 2] = color[2];
        }

        // Encode the top right pixel to indicate a 3-wide piece (we will want to move it to the right to center it)
        if (piece != 'I' && piece != 'O') {
            let texStartIndex = startingIndex + 21;
            this.#queueRGBData[texStartIndex] = 255;
        } else if (piece == 'I') { // Encode the top right pixel to indicate an I piece (we will want to move it up to center it)
            this.#queueRGBData[startingIndex + 21 + 1] = 255;
        }
    }

    /**
     * Update the HTML elements for displaying score.
     * 
     * @param {Object}  gameState               The data needed to render the game.
     * @param {number}  gameState.linesCleared  The number of lines the player has cleared.
     * @param {number}  gameState.speedLevel    The speed level the game is on.
     * @param {number}  gameState.score         The player's score.
     */
    #updateGUIOverlay(gameState) {
        this.#lineClearNode.nodeValue = gameState.linesCleared;
        this.#speedLevelNode.nodeValue = gameState.speedLevel == 11 ? "MAX" : gameState.speedLevel;
        this.#scoreNode.nodeValue = gameState.score;
    }
}