export class TouchInput {
    
    #parent;
    #prevPageX;
    #prevAnchorX;
    #prevAnchorY;
    #currentlyLeft = false;
    #currentTouchId = null;
    leftQueue = 0;
    rightQueue = 0;
    moveDown = false;
    rotate = {
        left: false,
        right: false
    }

    #tapStart;
    #tapIsLeft = false;

    dragSensitivity = 40;   // How many pixels (page coords) to move before a direction is registered
    
    /**
     * 
     * @param {HTMLElement} parentHtml 
     */
    constructor(parentHtml) {
        parentHtml.addEventListener("touchmove", (event) => {this.dragEvent(event)});
        parentHtml.addEventListener("touchstart", (event) => {this.touchStart(event)});
        parentHtml.addEventListener("touchend", (event) => {this.touchEnd(event)});
        parentHtml.addEventListener("touchcancel", (event) => {this.touchEnd(event)});
        this.#parent = parentHtml;

        document.addEventListener(
        "dblclick",
        function (event) {
            event.preventDefault();
        },
        { passive: false }
        );
    }

    /**
     * Log which Touch to track for input.
     * @param {TouchEvent} event 
     */
    touchStart(event) {
        if (this.#currentTouchId === null) {
            let mainTouch = event.touches.item(0);
            this.#currentTouchId = mainTouch.identifier;
            this.#prevAnchorX = mainTouch.pageX;
            this.#prevPageX = mainTouch.pageX;
            this.#tapStart = Date.now();
            // Get which half the tap is on (used for rotating clockwise/anticlockwise)
            this.#tapIsLeft = (mainTouch.clientX < this.#parent.getBoundingClientRect().x + this.#parent.getBoundingClientRect().width * 0.5); 
        }
        
    }

    /**
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
            if (Date.now() - this.#tapStart < 300 && this.leftQueue == 0 && this.rightQueue == 0) {
                // Rotate event
                if (this.#tapIsLeft) {
                    this.rotate.left = true;
                } else {
                    this.rotate.right = true;
                }
            }
            this.#currentTouchId = null;
            this.leftQueue = 0;
            this.rightQueue = 0;
            this.moveDown = false;
        }      
    }


    /**
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
        if (!this.moveDown && Math.abs(touch.pageX - this.#prevAnchorX) > this.dragSensitivity) {
            // Moving another increment
            if (this.#currentlyLeft) {
                this.leftQueue++;
                this.rightQueue = 0;
            } else {
                this.rightQueue++;
                this.leftQueue = 0;
            }
            updateAnchor = true;
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

        this.#prevPageX = touch.pageX;
    }
}