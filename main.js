
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

    const startButton = document.querySelector("#startButton");
    

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

    const titleScreen = document.querySelector("#titleScreen");
    const pauseScreen = document.querySelector("#pauseScreen");
    const gameOverScreen = document.querySelector("#gameOverScreen");
    let onTitleScreen = true;

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

        // If the game is running, update the game:
        if (!game.gameState.gameOver) {
            // Run game ticks at a fixed interval
            if (timeSinceGameTick >= game.gameTickTime) {
                timeSinceGameTick = Math.min(timeSinceGameTick - game.gameTickTime, game.gameTickTime);
                game.runTick(inputMod);

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

    
    function rebindControlKeypress(event) {

        inputMod.selectedKey = event.key.length > 1 ? event.key : event.key.toUpperCase();
        resolveRebind();
    }

    function resolveRebind() {

        function endRebindProcess() {
            // Remove listener to prevent further calls
            document.removeEventListener("keydown", rebindControlKeypress);
            inputMod.selectedSpan.innerText = inputMod.selectedKey;
    
            // Deselect everything
            inputMod.selectedAction = "";
            inputMod.selectedKey = "";
            inputMod.selectedSpan.classList.add("ready");
            inputMod.selectedSpan.classList.remove("waiting");
            inputMod.selectedSpan = null;
        }

        // If escape is pressed, cancel the rebinding process
        if (inputMod.selectedKey == "Escape") {
            inputMod.selectedKey = inputMod.originalKeybind;
            endRebindProcess();
            // console.log("Rebind canceled.");

            // Otherwise, try to rebind key
        } else if (inputMod.rebindControl(inputMod.selectedAction, inputMod.selectedKey)){
                // Rebind was successful!
                endRebindProcess();
                // console.log("Rebind complete!");
        } else {
            // Rebind did not succeed - key is already bound to another action
            // console.log("Rebind failed...");
        }
        
    }


    let controlRebindElements = document.querySelectorAll(".controlRebind");

    for (let i = 0; i < controlRebindElements.length; i++) {
        let rebindButton = controlRebindElements[i];
        rebindButton.classList.add("ready");
        rebindButton.addEventListener("click", function() {
            console.log("Rebind starting...");

            // If rebind is in progress, cancel the old one
            if (inputMod.selectedSpan != null) {

            } else {

            }

            // Start rebind process - save the starting parameters
            inputMod.originalKeybind = rebindButton.innerText;
            inputMod.selectedSpan = rebindButton;
            inputMod.selectedAction = rebindButton.id.substring(2);

            // Prime the document to read and store the next keypress
            document.addEventListener("keydown", rebindControlKeypress);

            // Change the visual state of the button
            rebindButton.classList.remove("ready");
            rebindButton.classList.add("waiting");
            rebindButton.innerText = "...";
        });
    }
    controlRebindElements.forEach(function(value, key, parent) {
        console.log(value.id);
    })


}



main();