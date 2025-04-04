
import {QuadtrisGame} from './scripts/QuadtrisGame.mjs'
import {QuadtrisInput as Input} from './scripts/QuadtrisInput.mjs'
import {QuadtrisRenderer} from './scripts/QuadtrisRenderer.mjs'
import { TouchInput } from './scripts/TouchInput.mjs'
import { GUIButtonInput } from './scripts/GUIButtonInput.mjs'

import * as RebindMod from './scripts/RebindControls.mjs'
import { SettingsModule } from './scripts/SettingsModule.mjs'

/**
 * Game state:
 *      Grid
 *      Player piece (locations + color)
 *      Ghost piece (locations)
 *      Queue + held
 *      Lines cleared
 */

function main() {
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
    
    
    let touchInput = new TouchInput(document.querySelector(".container"), document.querySelector("#heldPiece"));
    let guiInput = new GUIButtonInput(document.querySelector("#tib_hold"),
        document.querySelector("#tib_moveLeft"),
        document.querySelector("#tib_moveRight"),
        document.querySelector("#tib_softDrop"),
        document.querySelector("#tib_hardDrop"),
        document.querySelector("#tib_rotateClockwise"),
        document.querySelector("#tib_rotateAnticlockwise")
    );

    // Create settings
    let settingsMod = new SettingsModule("keyboardSettings", "gestureSettings", "buttonSettings", touchInput);
    document.querySelector("#resetDefaultSettings").addEventListener("click", (e) => {
        settingsMod.resetToDefault();
    });

    
    // Create game and renderer
    let game = new QuadtrisGame();
    let renderer = new QuadtrisRenderer();
    
    const titleScreen = document.querySelector("#titleScreen");
    const pauseScreen = document.querySelector("#pauseScreen");
    const gameOverScreen = document.querySelector("#gameOverScreen");
    const settingsScreen = document.querySelector("#settingsScreen");
    const howToScreen = document.querySelector("#howToScreen");
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
            if (inputMod.getCounter("pause") == 1) {
                settingsScreen.classList.add("hide");
            }
            
            // If the game is running, update the game:
        } else if (!game.gameState.gameOver) {
            
            // Run game ticks at a fixed interval
            if (timeSinceGameTick >= game.gameTickTime) {
                timeSinceGameTick = Math.min(timeSinceGameTick - game.gameTickTime, game.gameTickTime);
                
                inputMod.updateCounters();
                updateInputs(game, inputMod, touchInput, guiInput, settingsMod.settingsValues);
                game.runTick();
                
                // Handle pause/unpause
                if (inputMod.getCounter("pause") == 1) {
                    if (!game.gameState.isPaused) {
                        // Pause game
                        game.pauseGame(true);
                        pauseScreen.classList.remove("hide");
                    } else {
                        // Unpause game
                        game.pauseGame(false);
                        pauseScreen.classList.add("hide");
                        howToScreen.classList.add("hide");
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
        requestAnimationFrame(runGameFrame);
        onTitleScreen = false;
    }
    
    startButton.addEventListener("click", startGame);
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

    // Pause button
    document.querySelector("#pauseButton").addEventListener("click", (e) => {
        game.pauseGame(true);
        pauseScreen.classList.remove("hide");
    });
    
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

    document.querySelectorAll(".closeHowTo").forEach((button, key, parent) => {
        button.addEventListener("click", (e) => {howToScreen.classList.add("hide")});
    });
    document.querySelectorAll(".howToButton").forEach((button, key, parent) => {
        button.addEventListener("click", (e) => {howToScreen.classList.remove("hide")});
    });

}

/**
 * Processes input modules to update the game's state.
 * @param {QuadtrisGame} game
 * @param {QuadtrisInput} inputMod
 * @param {TouchInput} touchInput
 * @param {GUIButtonInput} guiInput
 */
function updateInputs(game, inputMod, touchInput, guiInput, settings) {
    let keyboardRepeatDelay = settings.keyboardRepeatDelay;    // The number of frames before moving left/right repeats if held down.
    let guiRepeatDelay = settings.buttonRepeatDelay;
    
    // Single inputs (holding input does not activate multiple actions)
    if (inputMod.getCounter("hardDrop") == 1) {
        game.input.hardDrop = true;
    }
    if (inputMod.getCounter("hold") == 1) {
        game.input.hold = true;
    }
    if (inputMod.getCounter("rotateClockwise") == 1) {
        game.input.rotateClockwise = true;
    }
    if (inputMod.getCounter("rotateAnticlockwise") == 1) {
        game.input.rotateAnticlockwise= true;
    }
    
    // Continuous inputs (holding input activates repeatedly)
    if (inputMod.getInputState("softDrop")) {
        game.input.softDrop = true;
    }
    if (inputMod.getCounter("moveLeft") == 1 || inputMod.getCounter("moveLeft") > keyboardRepeatDelay) {
        game.input.moveLeft = true;
    }
    if (inputMod.getCounter("moveRight") == 1 || inputMod.getCounter("moveRight") > keyboardRepeatDelay) {
        game.input.moveRight = true;
    }

    // Touch controls
    if (settings.gestureEnable) {
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
            game.input.rotateAnticlockwise = true;
        } else if (touchInput.rotate.right) {
            game.input.rotateClockwise = true;
        }
        touchInput.rotate = {left: false, right: false};
    
        if (touchInput.hardDrop) {
            game.input.hardDrop = true;
            touchInput.hardDrop = false;
        }
    }
    // The hold space will always be active as an input
    if (touchInput.hold) {
        game.input.hold = true;
        touchInput.hold = false;
    }

    // GUI controls
    if (settings.buttonEnable) {
        guiInput.countFrame();  // Count frame for horizontal movement
        if (guiInput.frameCounter.moveLeft == 1 || guiInput.frameCounter.moveLeft > guiRepeatDelay) {
            game.input.moveLeft = true;
        }
        if (guiInput.frameCounter.moveRight == 1 || guiInput.frameCounter.moveRight > guiRepeatDelay) {
            game.input.moveRight = true;
        }
        if (guiInput.frameCounter.softDrop >= 1) {
            game.input.softDrop = true;
        }
        if (guiInput.getInput("hold")) {
            game.input.hold = true;   
        }
        if (guiInput.getInput("rotateClockwise")) {
            game.input.rotateClockwise = true;
        }
        if (guiInput.getInput("rotateAnticlockwise")) {
            game.input.rotateAnticlockwise = true;   
        }
        if (guiInput.getInput("hardDrop")) {
            game.input.hardDrop = true;
        }
    
        guiInput.resetFlags();
    }
}

main();