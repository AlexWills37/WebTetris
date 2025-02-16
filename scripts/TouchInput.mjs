
export class TouchInput {
    
    #prevClientX;
    #prevAnchorX;
    #currentlyLeft = false;
    #currentTouchId = null;
    leftQueue = 0;
    rightQueue = 0;
    
    constructor(parentHtml) {
        parentHtml.addEventListener("touchmove", (event) => {this.dragEvent(event)});
        parentHtml.addEventListener("touchstart", (event) => {this.touchStart(event)});
        parentHtml.addEventListener("touchend", (event) => {this.touchEnd(event)});
        parentHtml.addEventListener("touchcancel", (event) => {this.touchEnd(event)});
    }

    /**
     * Log which Touch to track for input.
     * @param {TouchEvent} event 
     */
    touchStart(event) {
        if (this.#currentTouchId === null) {
            let mainTouch = event.touches.item(0);
            this.#currentTouchId = mainTouch.identifier;
            this.#prevAnchorX = mainTouch.clientX;
            this.#prevClientX = mainTouch.clientX;
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
            this.#currentTouchId = null;
            this.leftQueue = 0;
            this.rightQueue = 0;
        }      
    }


    /**
     * 
     * @param {TouchEvent} event 
     */
    dragEvent(event) {
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
        
        let movePiece = false;

        // Process movement
        if ((touch.clientX - this.#prevClientX) * (this.#currentlyLeft ? 1 : -1) > 0) {
            // Switching directions of swipe
            this.#currentlyLeft = !this.#currentlyLeft;
            this.#prevAnchorX = touch.clientX + 20 * (this.#currentlyLeft ? 1 : -1);
        } 

        if (Math.abs(touch.clientX - this.#prevAnchorX) > 40) {
            // Moving another increment
            movePiece = true;
        }
        
        if (movePiece) {
            this.#prevAnchorX = touch.clientX;
            if (this.#currentlyLeft) {
                this.leftQueue++;
                this.rightQueue = 0;
            } else {
                this.rightQueue++;
                this.leftQueue = 0;
            }
            // console.log("Moving : " + (this.#currentlyLeft ? "left" : "right"));
        }
        this.#prevClientX = touch.clientX;
    }
}