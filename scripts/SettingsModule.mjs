import { TouchInput } from "./TouchInput.mjs";
export class SettingsModule {

    #keyboardMenu;
    #gestureMenu;
    #buttonMenu;
    #defaultSettingsValues = {
        gestureEnable: true,
        buttonEnable: true,
        keyboardRepeatDelay: 5,         // Frames
        gestureGridIncrement: 40,       // Pixels
        gestureDirectionSwapAssist: 0,  // Percent
        gestureHardDropDistance: 150,   // Pixels
        gestureHardDropTimer: 400,      // Milliseconds
        buttonRepeatDelay: 5,           // Frames
    }
    settingsValues;

    /**
     * @type { TouchInput }
     */
    #gestureModule;

    constructor(keyboardClass, gestureClass, buttonClass, gestureModule) {
        this.#keyboardMenu = document.querySelector("div." + keyboardClass);
        this.#gestureMenu = document.querySelector("div." + gestureClass);
        this.#buttonMenu = document.querySelector("div." + buttonClass);
        document.querySelector("button." + keyboardClass).addEventListener("click", (e) => {toggleElement(this.#keyboardMenu);});
        document.querySelector("button." + gestureClass).addEventListener("click", (e) => {toggleElement(this.#gestureMenu);});
        document.querySelector("button." + buttonClass).addEventListener("click", (e) => {toggleElement(this.#buttonMenu);});

        this.settingsValues = {...this.#defaultSettingsValues};
        Object.keys(this.#defaultSettingsValues).forEach((val, index, arr) => {
            this.linkInput(val);
        });

        this.#gestureModule = gestureModule;
    }

    linkInput(inputClass) {
        let inputElement = document.querySelector("input." + inputClass);
        if (inputElement === null) {
            console.log("Could not find input element for the \'" + inputClass + "\' setting.");
            return;
        }

        // Use checkbox to toggle the entire menu
        if (inputElement.getAttribute("type") === "checkbox") {
            
            let menu = inputElement.closest(".menu");            
            
            inputElement.addEventListener("input", (e) => {
                console.log(inputElement.checked);
                if (inputElement.checked) {
                    menu.classList.remove("disabled");
                } else {
                    menu.classList.add("disabled");
                }
            });

            inputElement.checked = this.settingsValues[inputClass];
            if (!inputElement.checked) {
                menu.classList.add("disabled");
            }
            
            return;
        }
        
        // Use sliders for other settings

        // Set initial value
        inputElement.value = this.settingsValues[inputClass];

        let text = document.querySelector("span." + inputClass);
        inputElement.addEventListener("input", (e) => {
            text.innerHTML = inputElement.value; 
            this.settingsValues[inputClass] = inputElement.value;
            this.updateValues();
        });
    }

    updateValues() {
        this.#gestureModule.dragSensitivity = this.settingsValues.gestureGridIncrement;
        this.#gestureModule.slamThreshold = this.settingsValues.gestureHardDropDistance;
        this.#gestureModule.slamTimeLimit = this.settingsValues.gestureHardDropTimer;
        this.#gestureModule.turnaroundFactor = this.settingsValues.gestureDirectionSwapAssist / 100;
    }
}

/**
 * Toggles the "hide" class on an HTML element.
 * @param {HTMLElement} toToggle The element to toggle.
 */
function toggleElement(toToggle) {
    if (toToggle.classList.contains("hide")) {
        toToggle.classList.remove("hide");
    } else {
        toToggle.classList.add("hide");
    }
}
