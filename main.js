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
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
        return shader;
    }

    console.log(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
}

function createProgram(gl, vertexShader, fragmentShader) {
    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    var success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
        return program;
    }
    
    console.log(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
}

class ActivePiece {
    constructor() {
        this.blocks = [[0, 0], [1, 0], [1, 1], [2, 0]];
    }

    #move(dx, dy) {
        for (let i = 0; i < 4; i++) {
            this.blocks[i][0] += dx;
            this.blocks[i][1] += dy;
        }
    }

    tryMove(dx, dy, game) {
        let canMove = true;
        for (let i = 0; i < 4 && canMove; i++) {
            var x = this.blocks[i][0] + dx;
            var y = this.blocks[i][1] + dy;
            if (x < 0 || x >= 10 || y < 0 || y >= 20 || game.isBlockHere(x, y))
                canMove = false;
        }

        if (canMove) {
            this.#move(dx, dy);
        }
    }

}

class TetrisGame {
    constructor() {
        this.grid = new Uint32Array(20);
        this.rgbGrid = new Uint8Array(600);
        this.colorMap = new Map();
        this.colorMap.set(1, [255, 0, 0]);
        this.colorMap.set(2, [0, 255, 0]);
        this.colorMap.set(3, [255, 255, 0]);
        this.colorMap.set(4, [0, 0, 255]);
        this.colorMap.set(5, [255, 0, 255]);
        this.colorMap.set(6, [0, 255, 255]);
        this.colorMap.set(7, [255, 140, 40]);

        this.playerPiece = new ActivePiece();
    }

    isBlockHere(x, y) {
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
                var blockData = this.getBlockData(ix, iy);

                var startIndex = 30 * iy + 3 * ix;
                if (blockData != 0){
                    var color = this.colorMap.get(blockData);
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

        var playerBlocks = this.playerPiece.blocks;
        for (let i = 0; i < 4; i++){
            var color = this.colorMap.get(5);
            var startIndex = 30 * playerBlocks[i][1] + 3 * playerBlocks[i][0];
            this.rgbGrid[startIndex] = color[0];
            this.rgbGrid[startIndex + 1] = color[1];
            this.rgbGrid[startIndex + 2] = color[2];
        }

        return this.rgbGrid;
    }

    generateRainbowGrid(offset) {
        for(let y = 0; y < 20; y++) {
            for (let x = 0; x < 10; x++) {
                var startIndex = 30 * y + 3 * x;
                this.rgbGrid[startIndex] = (Math.sin((x + (y * 10) + offset) * 3.14 / 200) * 0.5 + 0.5) * 255;
                this.rgbGrid[startIndex + 1] = (Math.sin((x + (y * 10) + offset) * 3.14 / 200 + 3.14/2) * 0.5 + 0.5) * 255;
                this.rgbGrid[startIndex + 2] = (Math.sin((x + (y * 10) + offset) * 3.14 / 200 + 3.14/3) * 0.5 + 0.5) * 255;
            }
        }

        return this.rgbGrid;
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
        this.inputKeys.set("ArrowLeft", "RotateClockwise");
        this.inputKeys.set("L", "RotateClockwise");
        this.inputKeys.set("J", "RotateAntiClockwise");
    }

    keyToState(key) {
        if (key.length == 1) {
            key = key.toUpperCase();
        }

        return this.inputKeys.get(key);
    }

    setInputState(key, value) {
        var action = this.keyToState(key);
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
            })
        }
        return null;
    }

}


function main() {
    var inputMod = new Input();
    document.addEventListener('keydown', function(event) {
        inputMod.setInputState(event.key, true);
    });
    document.addEventListener('keyup', function(event) {
        inputMod.setInputState(event.key, false);
    });

    
    var canvas = document.querySelector("#canvas");

    /**@type {WebGLRenderingContext} */
    const gl = canvas.getContext("webgl");
    if(!gl) {
        const warning = WebGL.getWebGLErrorMessage();
        document.body.appendChild(warning);
    }

    
    // Specify the viewport size to convert from clip space [-1, 1] to canvas pixels
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // Create shader
    var vsSource = document.querySelector("#vertex-shader-2d").text;
    var fsSource = document.querySelector("#fragment-shader-2d").text;
    const programInfo = twgl.createProgramInfo(gl,[vsSource, fsSource]);


    // Create buffers

    const arrays = {
        a_Position: {numComponents: 2, data:[
            -0.5, -1,
            0.5, -1,
            0.5, 1,
            -0.5, 1]},
        a_GridPos: {numComponents: 2, data: [0, 0, 10, 0, 10, 20, 0, 20]},
        indices: {numComponents: 3, data: [0, 1, 2, 2, 3, 0]}
    };

    const bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);

    var gridDataTex = gl.createTexture();
    var gridData = new Uint8Array(200 * 3);
    gl.bindTexture(gl.TEXTURE_2D, gridDataTex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 10, 20, 0, gl.RGB, gl.UNSIGNED_BYTE, gridData);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    var blockImg = {src: "textures/block.png", mag: gl.LINEAR};
    var blockTexture = twgl.createTexture(gl, blockImg);

    var Tetris = new TetrisGame();
    Tetris.placeBlockHere(0, 5, 1);
    Tetris.placeBlockHere(1, 5, 2);
    Tetris.placeBlockHere(2, 5, 3);
    Tetris.placeBlockHere(3, 5, 4);
    Tetris.placeBlockHere(4, 5, 5);
    Tetris.placeBlockHere(5, 5, 6);
    Tetris.placeBlockHere(6, 5, 7);

    const fps = 30;
    const timeBtwnFrames = 1.0 / fps;
    var lastFrameTime = 0;
    var timeSinceInputTick = 0;
    const inputTickTime = 1.0 / 30.0;


    // Render code
    function render(time) {
        var deltaTime = (time - lastFrameTime) * 0.001;
        lastFrameTime = time;

        timeSinceInputTick += deltaTime;
        if (timeSinceInputTick > inputTickTime) {
            // Do input tick
            timeSinceInputTick = 0;
            let movement = [0, 0];
            if (inputMod.getInputState("MoveLeft")) 
                movement[0] -= 1;
            if (inputMod.getInputState("MoveRight"))
                movement[0] += 1;
            if (inputMod.getInputState("HardDrop"))
                movement[1] += 1;
            if (inputMod.getInputState("SoftDrop"))
                movement[1] -= 1;
        
            Tetris.playerPiece.tryMove(movement[0], movement[1], Tetris);
        }


        // Every visual frame


        //gridData = Tetris.generateRainbowGrid(Math.floor(time * 0.1));
        gridData = Tetris.generateRGBGrid();

        // Resize canvas if it changes
        twgl.resizeCanvasToDisplaySize(gl.canvas);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        gl.bindTexture(gl.TEXTURE_2D, gridDataTex);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 10, 20, gl.RGB, gl.UNSIGNED_BYTE, gridData);
        // Create uniform list
        const uniforms = {
            u_Time: time * 0.001,
            u_Resolution: [gl.canvas.width, gl.canvas.height],
            u_GridData: gridDataTex,
            u_BlockTexture: blockTexture,
        };
    
        gl.useProgram(programInfo.program); // Bind the shader program
        twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);  // Enable/create the attribute pointers
        twgl.setUniforms(programInfo, uniforms);    // Set the shader uniforms
        twgl.drawBufferInfo(gl, bufferInfo);    // Call the appropriate draw function
    
        requestAnimationFrame(render);  // Request the next frame
    }

    requestAnimationFrame(render);  // Request the first frame
    

    // Clear the canvas
    //gl.clearColor(0, 0, 0, 0);
    //gl.clear(gl.COLOR_BUFFER_BIT);

}



main();