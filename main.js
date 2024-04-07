
import {QuadtrisGame} from './scripts/QuadtrisGame.mjs'
import {QuadtrisInput as Input} from './scripts/QuadtrisInput.mjs'
import {QuadtrisRenderer} from './scripts/QuadtrisRenderer.mjs'

/**
 * Game state:
 *      Grid
 *      Player piece (locations + color)
 *      Ghost piece (locations)
 *      Queue + held
 *      Lines cleared
 */


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


function main() {
    let debugLog = document.createTextNode('');
    document.querySelector("#debug").appendChild(debugLog);

    // Create input module
    let inputMod = new Input();
    document.addEventListener('keydown', function(event) {
        inputMod.setInputState(event.key, true);
    });
    document.addEventListener('keyup', function(event) {
        inputMod.setInputState(event.key, false);
    });

    // Create game and renderer
    let game = new QuadtrisGame();
    let renderer = new QuadtrisRenderer();
    
    // Create the engine loop
    let timeSinceGameTick = 0;
    let lastFrameTime = 0;
    function processFrame(time) {
        let deltaTime = (time - lastFrameTime) * 0.001;
        lastFrameTime = time;
        timeSinceGameTick += deltaTime;

        // Run game ticks at a fixed interval
        if (timeSinceGameTick >= game.gameTickTime) {
            game.runTick(inputMod);
            timeSinceGameTick = Math.min(timeSinceGameTick - game.gameTickTime, game.gameTickTime);
        }

        // Update buffers if the game state changes
        if (game.isStateChanged) {
            renderer.updateData(game.gameState);
        } 

        // Render frame
        renderer.renderGame();

        // Queue up next frame
        requestAnimationFrame(processFrame);
    }
    requestAnimationFrame(processFrame);

}



main();