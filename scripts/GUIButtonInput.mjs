/**
 * @fileoverview Callback functions and management to handle input through on-screen HTML buttons.
 * 
 * @author Alex Wills
 */
export class GUIButtonInput {

    /**
     * Map between input names and their boolean value.
     * @type {Map<string, boolean>}
     */
    inputStates = new Map();

    frameCounter = {
        moveLeft: 0,
        moveRight: 0,
        softDrop: 0
    };

    /**
     * Creates an input module using on-screen buttons.
     * 
     * @param {HTMLButtonElement} hold                  The button to hold a piece.
     * @param {HTMLButtonElement} moveLeft              The button to move a piece left.
     * @param {HTMLButtonElement} moveRight             The button to move a piece right.
     * @param {HTMLButtonElement} softDrop              The button to move a piece 1 space down.
     * @param {HTMLButtonElement} hardDrop              The button to move a piece down as far as it goes.
     * @param {HTMLButtonElement} rotateClockwise       The button to rotate a piece clockwise.
     * @param {HTMLButtonElement} rotateAnticlockwise   The button to rotate a piece anti-clockwise.
     */
    constructor(hold, moveLeft, moveRight, softDrop, hardDrop, rotateClockwise, rotateAnticlockwise) {
        
        // These 3 states represent the inputs themselves, if they are being held down or not.
        this.inputStates.set("moveLeft", false);
        this.inputStates.set("moveRight", false);
        this.inputStates.set("softDrop", false);

        // These states act as "flags", representing whether the input was pressed since the flags were last reset.
        this.inputStates.set("hold", false);
        this.inputStates.set("hardDrop", false);
        this.inputStates.set("rotateClockwise", false);
        this.inputStates.set("rotateAnticlockwise", false);
        
        // Adds the listeners to the buttons.
        console.log("adding listeners");
        this.addStateListeners(moveLeft, "moveLeft");
        this.addStateListeners(moveRight, "moveRight");
        this.addStateListeners(softDrop, "softDrop");
        this.addFlagListners(hardDrop, "hardDrop");
        this.addFlagListners(rotateClockwise, "rotateClockwise");
        this.addFlagListners(rotateAnticlockwise, "rotateAnticlockwise");
        this.addFlagListners(hold, "hold");
        console.log("listeners added");
    }

    /**
     * Adds the common events for all GUI buttons (touch => state change, touchstart => prevent default).
     * 
     * @param {HTMLButtonElement} button the button ot add events for.
     * @param {String} inputBind the name of the input key to change.
     */
    addCommonListeners(button, inputBind) {
        // In both types of inputs, touching the button should immediately update the state.
        button.addEventListener("pointerdown", (event) => {
            this.inputStates.set(inputBind, true);
            button.classList.add("pressed");
        });

        button.addEventListener("pointerleave", (e) => {
            button.classList.remove("pressed");
        });
        
        // Blocks touch-hold events that would bring up the context menu to save button icons as images
        // This is to allow the user to hold down the controls like a controller, not to block image saving, although that is a side effect.
        button.addEventListener("touchstart", (e) => {
            e.preventDefault();
        });
    }

    /**
     * Adds the callbacks to raise an input flag when the button is pressed, either on pointerdown or click (but not both).
     * These inputs do not repeat actions, as the input flags are cleared by this.resetFlags().
     * 
     * @param {HTMLButtonElement} button the button to be clicked.
     * @param {String} inputBind the name of the input flag to raise.
     */
    addFlagListners(button, inputBind) {
        button.addEventListener("click", (event) => {
            // If there IS a pointer type, the input will be handled by the pointerDown listener.
            if (event.pointerType !== "") {
                return; 
            }
            // Otherwise (like when hitting the button with keyboard controls), we can process the input here
            this.inputStates.set(inputBind, true);
        });

        this.addCommonListeners(button, inputBind);
    }
    
    
    /**
     * Adds the callbacks specifically for moveLeft, moveRight, and softDrop.
     * These inputs can be held down for repeated action, based on how many frames they are held.
     * Instead of raising a flag that gets cleared by this.resetFlags(), these inputs will represent the precise state
     * of the button. this.countFrame() can be used to capture the state of these inputs by querying the precise state
     * and incrementing a frame counter. The frame counter can then be used to evaluate these inputs. 
     * 
     * @param {HTMLButtonElement} button the button to be clicked.
     * @param {String} inputBind the name of the input state to change.
    */
    addStateListeners(button, inputBind) {
        
        button.addEventListener("pointerleave", (event) => {
            this.inputStates.set(inputBind, false);
            button.classList.remove("pressed");
            switch (inputBind) {
                case "moveLeft":
                    this.frameCounter.moveLeft = 0;
                    break;
                case "moveRight":
                    this.frameCounter.moveRight = 0;
                    break;
                case "softDrop":
                    this.frameCounter.softDrop = 0;
                    break;
                default:
                    break;
            }
        });
        
        button.addEventListener("click", (event) => {
            // If there IS a pointer type, the input will be handled by the pointerDown listener.
            if (event.pointerType !== "") {
                return; 
            }
            // Otherwise (like when hitting the button with keyboard controls), we can process the input here
            
            // For moving left/right, clicking the button with keyboard controls will count the frame immediately
            if (inputBind === "moveLeft") {
                this.frameCounter.moveLeft++;
            } else if (inputBind === "moveRight") {
                this.frameCounter.moveRight++;
            } else if (inputBind === "softDrop") {
                this.frameCounter.softDrop++;
            }   // Note: the frame counter will be reset back to 0 when resetFlags() is called, because we are not "holding" the button down.
        });

        this.addCommonListeners(button, inputBind);
    }
    
    /**
     * Captures the state of moveLeft and moveRight to handle repeatable action. On the first frame held, the action
     * will fire, and then for a few frames the action will not fire, and then the action will fire on every frame after.
    */
    countFrame() {
        if (this.inputStates.get("moveLeft")) {
            this.frameCounter.moveLeft++;
        } 

        if (this.inputStates.get("moveRight")) {
            this.frameCounter.moveRight++;
        } 

        if (this.inputStates.get("softDrop")) {
            this.frameCounter.softDrop++;
        }
    }

    /**
     * Clears the input flags to allow buttons to be pressed again.
     */
    resetFlags() {
        this.inputStates.set("hold", false);
        this.inputStates.set("hardDrop", false);
        this.inputStates.set("rotateClockwise", false);
        this.inputStates.set("rotateAnticlockwise", false);
    }

    /**
     * Queries the state of the input flag.
     * @param {*} inputBind the flag to query.
     * @returns true if the flag has been raised, false if not.
     */
    getInput(inputBind) {
        return this.inputStates.get(inputBind);
    }
}