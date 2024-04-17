import {QuadtrisInput} from "./QuadtrisInput.mjs"


/** @type {Text | null} */
let outputText = null;

/** @type {Map<string, NodeListOf<Element>} */
let controlLabels = new Map();

/** @type {HTMLElement} */
let settingsScreen;

/**
 * 
 * @param {QuadtrisInput} inputModule 
 */
export function saveInputSettings(inputModule) {
    const toSave = inputModule.inputKeys;
    
    toSave.forEach(function(action, key, map) {
        localStorage.setItem(action, key);
    });
    
}

/**
 * 
 * @param {QuadtrisInput} inputModule 
 */
export function loadInputSettings(inputModule) {
    let overrides = [];

    // Search through all of the input module's actions,
    // recording any pairs to override.
    inputModule.inputKeys.forEach(function(action, key, map) {
        const savedKey = localStorage.getItem(action);
        if (savedKey != null) {
            // If there is a saved replacement, prepare to swap it out!
            overrides.push({action: action,
                            oldKey: key,
                            newKey: savedKey});
        }
    });

    // Delete the old bindings
    for (let i = 0; i < overrides.length; i++) {
        inputModule.inputKeys.delete(overrides[i].oldKey);
    }

    // Add new bindings
    for (let i = 0; i < overrides.length; i++) {
        inputModule.inputKeys.set(overrides[i].newKey, overrides[i].action);
    }
}

/**
 * 
 * @param {string}          selectorText    The shared selector for the button elements.
 * @param {QuadtrisInput}   inputMod        The game's input module.
 */
function connectAllRebindButtons(selectorText, inputMod){
    const controlRebindElements = document.querySelectorAll(selectorText);

    // Add click events and set starting text for each button
    for (let i = 0; i < controlRebindElements.length; i++) {
        let rebindButton = controlRebindElements[i];
        rebindButton.classList.add("ready");
        rebindButton.addEventListener("click", function() {

            // If rebind is in progress, cancel the old one
            if (inputMod.selectedSpan != null) {
                inputMod.selectedKey = "Escape";
                resolveRebind();
            } 

            // Start rebind process - save the starting parameters
            inputMod.originalKeybind = rebindButton.innerText;
            inputMod.selectedSpan = rebindButton;
            inputMod.selectedAction = rebindButton.id.substring(2);
            outputText.textContent = "Rebinding " + inputMod.selectedAction + " action (press key to rebind)...";

            // Prime the document to read and store the next keypress
            document.addEventListener("keydown", rebindControlKeypress);

            // Change the visual state of the button
            rebindButton.classList.remove("ready");
            rebindButton.classList.add("waiting");
            rebindButton.innerText = "...";
        });

        // Also update the button's text with the correct key
        rebindButton.innerText = inputMod.actionToKey(rebindButton.id.substring(2));
        if (rebindButton.innerText == " ")
            rebindButton.innerText = "Space";

        // Keypress event functions
        /**
         * Saves the selected key and resolves the rebind.
         * 
         * @param {*} event 
         */
        function rebindControlKeypress(event) {
            inputMod.selectedKey = event.key.length > 1 ? event.key : event.key.toUpperCase();
            resolveRebind();
        }

        /**
         * Processes the rebind request, removing the keydown event listener if successful.
         */
        function resolveRebind() {

            // If escape is pressed or the settings was closed, cancel the rebinding process
            if (inputMod.selectedKey == "Escape" || settingsScreen.classList.contains("hide")) {
                inputMod.selectedKey = inputMod.originalKeybind;
                endRebindProcess();
                // console.log("Rebind canceled.");
                outputText.textContent = "Rebind canceled.";
                // Prevent the counter from thinking escape was pressed on the next frame
                inputMod.updateCounters();
    
                // Otherwise, try to rebind key
            } else if (inputMod.rebindControl(inputMod.selectedAction, inputMod.selectedKey)){
                    // Rebind was successful!
                    outputText.textContent = "Rebind successful!";
                    endRebindProcess();
                    saveInputSettings(inputMod);
                    // console.log("Rebind complete!");

            } else {
                // Rebind did not succeed - key is already bound to another action
                // console.log("Rebind failed...");
                outputText.textContent = '\'' + inputMod.selectedKey + "\' is already in use (press another key)..."
            }

            function endRebindProcess() {
                // Remove listener to prevent further calls
                document.removeEventListener("keydown", rebindControlKeypress);
                
                // Update text for control
                const newKeyLabel = inputMod.selectedKey == " " ? "Space" : inputMod.selectedKey;
                inputMod.selectedSpan.innerText = newKeyLabel;
                controlLabels.get(inputMod.selectedAction).forEach(function(element, key, parent) {
                    element.innerText = newKeyLabel;
                });
        
                // Deselect everything
                inputMod.selectedAction = "";
                inputMod.selectedKey = "";
                inputMod.selectedSpan.classList.add("ready");
                inputMod.selectedSpan.classList.remove("waiting");
                inputMod.selectedSpan = null;
            }
            
        }
    }
}



/**
 * 
 * 
 * Any span elements in the HTML with the class "cd_<Action>" (replace <Action> with an input action)
 * will be connected to the input and rebind module, displaying only the key the input is bound to.
 * 
 * @param {string}          rebindSelectorText 
 * @param {QuadtrisInput}   inputMod 
 * @param {Text}            rebindOutputTextNode 
 */
export function connectHTMLElements(rebindSelectorText, inputMod, rebindOutputTextNode, settingsScreenElement) {
    settingsScreen = settingsScreenElement;
    outputText = rebindOutputTextNode;
    connectAllRebindButtons(rebindSelectorText, inputMod);

    // Store every span element with the class "cd_<action>" under its matching action
    inputMod.actionStates.forEach(function(state, action, map) {
        controlLabels.set(action, document.querySelectorAll("span.cd_" + action));

        // Update the text with the initial controls
        controlLabels.get(action).forEach(function(element, key, parent) {
            const keyLabel = inputMod.actionToKey(action);
            element.innerText = keyLabel == " " ? "Space" : keyLabel;
            
        });
    });
}
