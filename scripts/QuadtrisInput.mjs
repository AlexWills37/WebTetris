/**
 * @fileoverview Contains a class definition for QuadtrisInput.
 * 
 * QuadtrisInput abstracts from pure key inputs to input actions, allowing for easy remapping
 * of keybindings. Input actions can be accessed to get a boolean if the button is pressed,
 * or a counter that is updated externally.
 * 
 * By calling `updateCounters()` every tick, when input is checked, the counters help
 * determine how long a button has been pressed (for delayed inputs, intervaled inputs, or inputs
 * that should only activate on key down).
 * 
 * @author Alex Wills
 * @version 1.0.0
 */

/**
 * Input module to for the various actions in the Quadtris game.
 * 
 * The input is currently used in QuadtrisGame.runTick().
 * 
 * To set up this class, create a QuadtrisInput object and add the following functions
 * to the keyboard events:
 * @example
 * let inputMod = new Input();
 * document.addEventListener('keydown', function(event) {
 *      inputMod.setInputState(event.key, true);
 * });
 * document.addEventListener('keyup', function(event) {
 *      inputMod.setInputState(event.key, false);
 * });
 * 
 * @example
 * let game = QuadtrisGame();
 * //...
 * game.runTick(inputMod);
 */
export class QuadtrisInput {

    selectedKey = "";
    originalKeybind = "";
    selectedAction = "";

    /** @type {HTMLElement} */
    selectedSpan = null;

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
        this.actionStates.set("Pause", false);

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
        this.inputKeys.set("Escape", "Pause");
        
        /**
         * Counters for connecting action states to tick counts.
         * 
         * When {@link QuadtrisInput.updateCounters()} is called, the counters for any
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
        this.counters.set("Pause", 0);
    }

    /**
     * Accesses the input action that a key is bound to.
     * 
     * If the key is a single character, it will be set to uppercase,
     * so 'a' and 'A' both correspond to the same action.
     * 
     * @param {string} key The key being pressed.
     * @returns {string} The input action this key is bound to in {@link QuadtrisInput.inputKeys}.
     */
    keyToState(key) {
        if (key.length == 1) {
            key = key.toUpperCase();
        }

        return this.inputKeys.get(key);
    }

    rebindControl(action, key) {
        // Find existing control map and remove it
        let rebindSuccessful = false;
        let oldKey = "";
        this.inputKeys.forEach(function(value, key, map) {
            if (value == action) {
                oldKey = key;
            }
        });

        if (oldKey != "") {

            // If the key exists for another action, do not rebind (can't have 1 key with 2 values)
            if (this.inputKeys.has(key) && key != oldKey) {

            } else {
                // Key is either the same, or the key is not in the control scheme yet
                this.inputKeys.delete(oldKey);

                // Add new key
                this.inputKeys.set(key, action);
                rebindSuccessful = true;
            }

        }

        return rebindSuccessful;
    }

    /**
     * Updates the state of an input action from a key.
     * 
     * This will override the current value of the input action, so if you have multiple keys
     * bound to the same action, the action's state will match the most recent keyboard event.
     * 
     * @see {@link QuadtrisInput.inputKeys}
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
     * @see {@link QuadtrisInput.actionStates}.
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
     * inputMod = new QuadtrisInput();
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
     * @see {@link QuadtrisInput.counters}
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
     * If {@link QuadtrisInput.updateCounters()} is called once at the start of every game tick,
     * the counters will represent the number of ticks an input has been held.
     * 
     * @see {@link QuadtrisInput.counters}
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
     * (assuming {@link QuadtrisInput.updateCounters()} has been called once each tick).
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