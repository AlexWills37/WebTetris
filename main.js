
import {QuadtrisGame} from './scripts/QuadtrisGame.mjs'
import {QuadtrisInput as Input} from './scripts/QuadtrisInput.mjs'
import {QuadtrisRenderer} from './scripts/QuadtrisRenderer.mjs'
import { TouchInput } from './scripts/TouchInput.mjs'

import * as RebindMod from './scripts/RebindControls.mjs'

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

    const startButton = document.querySelector("#startButton");
    

    // Create input module
    let inputMod = new Input();
    RebindMod.loadInputSettings(inputMod);
    document.addEventListener('keydown', function(event) {
        inputMod.setInputState(event.key, true);
    });
    document.addEventListener('keyup', function(event) {
        inputMod.setInputState(event.key, false);
    });

    
    let touchInput = new TouchInput(document.querySelector("#gameGUI"));

    // Create game and renderer
    let game = new QuadtrisGame();
    let renderer = new QuadtrisRenderer();

    const titleScreen = document.querySelector("#titleScreen");
    const pauseScreen = document.querySelector("#pauseScreen");
    const gameOverScreen = document.querySelector("#gameOverScreen");
    const settingsScreen = document.querySelector("#settingsScreen");
    let onTitleScreen = true;
    let onSettings = false;

    const finalScoreNode = document.createTextNode('0');
    const finalLinesNode = document.createTextNode('0');
    document.querySelector("#finalScore").appendChild(finalScoreNode);
    document.querySelector("#finalLines").append(finalLinesNode);


    

    // Create the engine loop
    let timeSinceGameTick = 0;
    let lastFrameTime = 0;
    function runGameFrame(time) {
        let deltaTime = (time - lastFrameTime) * 0.001;
        lastFrameTime = time;
        timeSinceGameTick += deltaTime;

        // If settings screen is open, only process escape key
        if (!settingsScreen.classList.contains("hide")) {
            inputMod.updateCounters();
            if (inputMod.getCounter("Pause") == 1) {
                settingsScreen.classList.add("hide");
            }
        

        // If the game is running, update the game:
        } else if (!game.gameState.gameOver) {

            // Run game ticks at a fixed interval
            if (timeSinceGameTick >= game.gameTickTime) {
                timeSinceGameTick = Math.min(timeSinceGameTick - game.gameTickTime, game.gameTickTime);
                


                inputMod.updateCounters();
                updateInputs(game, inputMod, touchInput);
                game.runTick();


                // Handle pause/unpause
                if (inputMod.getCounter("Pause") == 1) {
                    if (!game.gameState.isPaused) {
                        // Pause game
                        game.pauseGame(true);
                        pauseScreen.classList.remove("hide");
                    } else {
                        // Unpause game
                        game.pauseGame(false);
                        pauseScreen.classList.add("hide");
                    }
                } // End of pause/unpause logic
            }
    
            // Update buffers if the game state changes
            if (game.isStateChanged) {
                renderer.updateData(game.gameState);
            } 
        } else if (!onTitleScreen) { // Game is over, AND the game was started (not on title screen)
            // Game over! Stop running the game and load the game over screen
            if (gameOverScreen.classList.contains("hide")) {
                // Display game over screen
                gameOverScreen.classList.remove("hide");
                finalScoreNode.textContent = game.gameState.score;
                finalLinesNode.textContent = game.gameState.linesCleared;
            }
        } else {    // Game is "over" and not started (on the title screen)

        }

        // Render frame
        renderer.renderGame();

        // Queue up next frame
        requestAnimationFrame(runGameFrame);
    }

    function startGame() {
        game.startNewGame();
        renderer.updateData(game.gameState);
        renderer.renderGame();
        document.querySelector("#titleScreen").classList.add("hide");
        document.querySelector("#gameGUI").classList.remove("hide");
        requestAnimationFrame(runGameFrame);
        onTitleScreen = false;
    }
    
    startButton.addEventListener("click", startGame);
    // startButton.addEventListener("touchstart", startGame);
    document.querySelector("#heldPieceOverlay").addEventListener("click", function() {
        game.holdPiece();
    });
    document.querySelector("#unpauseButton").addEventListener("click", function() {
        game.gameState.isPaused = false;
        pauseScreen.classList.add("hide");
    });
    document.querySelector("#replayButton").addEventListener("click", function() {
        game.startNewGame();
        renderer.updateData(game.gameState);
        renderer.renderGame();
        gameOverScreen.classList.add("hide");
    });

    document.querySelector("#returnToTitleButton").addEventListener("click", function() {
        titleScreen.classList.remove("hide");
        gameOverScreen.classList.add("hide");
        onTitleScreen = true;
    });

    requestAnimationFrame(runGameFrame);

    // Setup settings page
    let settingsDebugMessage = document.createTextNode('');
    document.querySelector("#settingsConsoleText").appendChild(settingsDebugMessage);
    RebindMod.connectHTMLElements(".controlRebind", inputMod, settingsDebugMessage, settingsScreen);
    
    

    document.querySelector("#exitSettingsButton").addEventListener("click", function(){
        settingsScreen.classList.add("hide");
    });

    document.querySelectorAll(".settingsButton").forEach(function(button, key, parent) {
        button.addEventListener("click", function() {settingsScreen.classList.remove("hide")});
    });
}

/**
 * Processes input modules to update the game's state.
 * @param {QuadtrisGame} game
 * @param {QuadtrisInput} inputMod
 * @param {TouchInput} touchInput
 */
function updateInputs(game, inputMod, touchInput) {
    // Single inputs (holding input does not activate multiple actions)
    if (inputMod.getCounter("HardDrop") == 1) {
        game.input.hardDrop = true;
    }
    if (inputMod.getCounter("Hold") == 1) {
        game.input.hold = true;
    }
    if (inputMod.getCounter("RotateClockwise") == 1) {
        game.input.rotClockwise = true;
    }
    if (inputMod.getCounter("RotateAntiClockwise") == 1) {
        game.input.rotAntiClockwise= true;
    }
    
    // Continuous inputs (holding input activates repeatedly)
    if (inputMod.getInputState("SoftDrop")) {
        game.input.softDrop = true;
    }
    if (inputMod.getCounter("MoveLeft") == 1 || inputMod.getCounter("MoveLeft") > 5) {
        game.input.moveLeft = true;
    }
    if (inputMod.getCounter("MoveRight") == 1 || inputMod.getCounter("MoveRight") > 5) {
        game.input.moveRight = true;
    }

    // Touch controls
    if (touchInput.leftQueue > 0) {
        game.input.moveLeft = true;
        touchInput.leftQueue--;
    }
    if (touchInput.rightQueue > 0) {
        game.input.moveRight = true;
        touchInput.rightQueue--;
    }

    if (touchInput.moveDown) {
        game.input.softDrop = true;
    }

    if (touchInput.rotate.left) {
        game.input.rotAntiClockwise = true;
    } else if (touchInput.rotate.right) {
        game.input.rotClockwise = true;
    }
    touchInput.rotate = {left: false, right: false};

    if (touchInput.hardDrop) {
        game.input.hardDrop = true;
        touchInput.hardDrop = false;
    }
    
}


main();