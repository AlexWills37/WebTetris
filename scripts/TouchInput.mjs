/**
 * @fileoverview Callback functions and management for registering touch and swipe inputs.
 * 
 * @author Alex Wills
 */
export class TouchInput {
    
    /********* Output variables (query these variables to register input) *********/
    leftQueue = 0;  // How many "left" inputs the user has activated (resets on touch release or change in swipe direction)
    rightQueue = 0; // How many "right" inputs the user has activated (resets on touch release or change in swipe direction)
    moveDown = false;   // True if the user has swiped down (resets on touch release or change in swipe direction (including upwards))
    // Whether the left or right half of the screen has been "tapped" (does not reset! manually reset after processing the rotation)
    rotate = {
        left: false,
        right: false
    }
    hardDrop = false;   // True if the user has flicked down (hard drop) and released (does not reset! reset manually after processing)
    
    /********* Sensitivity settings (change these to adjust the feel of the controls) *********/
    dragSensitivity = 40;   // How many pixels (page coords) to move before a direction is registered
    slamThreshold = 150;    // How many pixels (page coords) to move before a hard drop is registered
    slamTimeLimit = 400;    // How many milliseconds to allow for a hard drop to register (from tap to release)

    #parent;
    #prevPageX;
    #prevAnchorX;
    #prevAnchorY;
    #currentlyLeft = false;
    #currentTouchId = null;
    #slamDownInfo = {
        startTime: 0,
        startY: 0,
        endY: 0
    };
    #tapStart;
    #tapIsLeft = false;
    
    /**
     * Creates and sets up an object to manage touch inputs.
     * 
     * @param {HTMLElement} parentHtml The HTML Element to add touch and drag event listeners.
     */
    constructor(parentHtml) {
        parentHtml.addEventListener("touchmove", (event) => {this.dragEvent(event)});
        parentHtml.addEventListener("touchstart", (event) => {this.touchStart(event)});
        parentHtml.addEventListener("touchend", (event) => {this.touchEnd(event)});
        parentHtml.addEventListener("touchcancel", (event) => {this.touchEnd(event)});
        this.#parent = parentHtml;
    }

    /**
     * Logs which Touch to track for input and sets initial values for tracking.
     * 
     * @param {TouchEvent} event 
     */
    touchStart(event) {
        if (this.#currentTouchId === null && event.target.closest(".blockGestures") === null) {
            let mainTouch = event.touches.item(0);
            this.#currentTouchId = mainTouch.identifier;
            this.#prevAnchorX = mainTouch.pageX;
            this.#prevAnchorY = mainTouch.pageY;
            this.#prevPageX = mainTouch.pageX;
            this.#tapStart = Date.now();
            
            // Get which half the tap is on (used for rotating clockwise/anticlockwise)
            this.#tapIsLeft = (mainTouch.clientX < this.#parent.getBoundingClientRect().x + this.#parent.getBoundingClientRect().width * 0.5); 
            
            this.#slamDownInfo = {
                startTime: Date.now(),
                startY: mainTouch.pageY,
                endY: mainTouch.pageY
            };
        }
    }

    /**
     * Detects the end of certain events and resets tracking values to allow the user to start a new gesture.
     * 
     * @param {TouchEvent} event 
     */
    touchEnd(event) {
        // See if our main touch has been released
        let released = true;
        for (let i = 0; i < event.touches.length && released; i++) {
            if (event.touches.item(i).identifier === this.#currentTouchId) {
                released = false;
            }
        }

        if (released) {
            // Process a tap for detecting rotation
            if (Date.now() - this.#tapStart < 300 && this.leftQueue == 0 && this.rightQueue == 0) {
                // Rotate event
                if (this.#tapIsLeft) {
                    this.rotate.left = true;
                } else {
                    this.rotate.right = true;
                }
            }
            
            // Detect hard drops
            if (Date.now() - this.#slamDownInfo.startTime <= this.slamTimeLimit && (this.#slamDownInfo.endY - this.#slamDownInfo.startY > this.slamThreshold)) {
                this.hardDrop = true;    
            }
            
            // Reset values
            this.#currentTouchId = null;
            this.leftQueue = 0;
            this.rightQueue = 0;
            this.moveDown = false;
        }      
    }

    /**
     * Detects the user's swipes and updates tracking values for other gestures.
     * 
     * @param {TouchEvent} event 
     */
    dragEvent(event) {

        let updateAnchor = false;

        // Identify the main touch
        let touch = null;
        for (let i = 0; i < event.changedTouches.length; i++) {
            if (event.changedTouches.item(i).identifier === this.#currentTouchId) {
                touch = event.changedTouches.item(i);
                break;
            }
        }
        // If the main touch hasn't changed, stop the function because the touch we're tracking has not changed.
        if (touch === null) {
            return;
        }

        // Switching directions of left/right updates the anchor for a tighter turn-around and a greater feeling of control.        
        if ((touch.pageX - this.#prevPageX) * (this.#currentlyLeft ? 1 : -1) > 0) {
            this.#currentlyLeft = !this.#currentlyLeft;
            this.#prevAnchorX = touch.pageX + (this.dragSensitivity * 0.5) * (this.#currentlyLeft ? 1 : -1);
            this.#prevAnchorY = touch.pageY;
        } 

        // Moving far enough past the anchor left/right will move the piece in that direction.
        if (Math.abs(touch.pageX - this.#prevAnchorX) > this.dragSensitivity) {
            // Moving another increment
            if (this.#currentlyLeft) {
                this.leftQueue++;
                this.rightQueue = 0;
            } else {
                this.rightQueue++;
                this.leftQueue = 0;
            }
            updateAnchor = true;

            this.#slamDownInfo.startTime = 0;   // If a sideways gesture is registered, we will not hard drop (even if the other conditions are met)
            this.moveDown = false;  // Moving sideways will cancel a soft drop
        } 
        
        // Moving down will start to soft drop the piece
        if (touch.pageY - this.#prevAnchorY > this.dragSensitivity) {    
            this.moveDown = true;
            this.leftQueue = 0;
            this.rightQueue = 0;
            updateAnchor = true;
        } else if (this.#prevAnchorY - touch.pageY > this.dragSensitivity) {    // Moving back up will stop the soft drop
            this.moveDown = false;
            updateAnchor = true;
        }

        if (updateAnchor) {
            this.#prevAnchorX = touch.pageX;
            this.#prevAnchorY = touch.pageY;
            this.#tapStart = 0;
        }

        this.#prevPageX = touch.pageX;  // Record each X value for quick turnarounds in sideways swiping
        this.#slamDownInfo.endY = touch.pageY;  // Record each Y value to get the final Y value for a flicking gesture (hard drop)
    }
}