/**
 * @fileoverview Manages most of the input settings and their HTML components.
 * 
 * @author Alex Wills
 */
import { TouchInput } from "./TouchInput.mjs";
export class SettingsModule {

    // Divs to show/hide the different settings categories
    #keyboardMenu;
    #gestureMenu;
    #buttonMenu;

    #defaultSettingsValues = {
        gestureEnable: false,
        buttonEnable: true,
        keyboardRepeatDelay: 5,         // Frames
        gestureGridIncrement: 40,       // Pixels
        gestureDirectionSwapAssist: 0,  // Percent
        gestureHardDropDistance: 150,   // Pixels
        gestureHardDropTimer: 200,      // Milliseconds
        buttonRepeatDelay: 5,           // Frames
    }
    /**
     * The currently selected settings.
     */
    settingsValues;

    /**
     * The module managing gesture controls.
     * @type { TouchInput }
     */
    #gestureModule;

    // The div to add/remove the .giveControllerSpace class for the button controls.
    #canvasSpace;
    // The div to show/hide for button controls.
    #controller;
    // The previous controller state to detect when the button controls are toggled.
    #previousControllerState;

    /**
     * Initializes the settings module.
     * @param {string} keyboardClass 
     * @param {string} gestureClass 
     * @param {string} buttonClass 
     * @param {TouchInput} gestureModule 
     */
    constructor(keyboardClass, gestureClass, buttonClass, gestureModule) {

        // Enable touchscreen buttons by default if there is a coarse pointer; disable them otherwise
        this.#defaultSettingsValues.buttonEnable = window.matchMedia('(pointer: coarse)').matches;

        this.#keyboardMenu = document.querySelector("div." + keyboardClass);
        this.#gestureMenu = document.querySelector("div." + gestureClass);
        this.#buttonMenu = document.querySelector("div." + buttonClass);
        document.querySelector("button." + keyboardClass).addEventListener("click", (e) => {toggleElement(this.#keyboardMenu);});
        document.querySelector("button." + gestureClass).addEventListener("click", (e) => {toggleElement(this.#gestureMenu);});
        document.querySelector("button." + buttonClass).addEventListener("click", (e) => {toggleElement(this.#buttonMenu);});

        // Load default/found values
        this.settingsValues = {...this.#defaultSettingsValues};
        this.loadValues();
        
        
        // Link up HTML input and update events
        Object.keys(this.#defaultSettingsValues).forEach((val, index, arr) => {
            this.linkInput(val);
        });

        this.#gestureModule = gestureModule;
        this.#canvasSpace = document.querySelector(".canvasSpace");
        this.#controller = document.querySelector(".controller");
        // this.#previousControllerState = !this.#controller.classList.contains("hide");
        this.#previousControllerState = this.settingsValues.buttonEnable;

        // Apply initial values
        this.updateValues();
    }

    /**
     * Links an input element with a display value and its settings value.
     * @param {string} inputClass The unique class shared by the input element and a span to dispaly the input value.
     */
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
                this.settingsValues[inputClass] = inputElement.checked;
                if (inputElement.checked) {
                    menu.classList.remove("disabled");
                } else {
                    menu.classList.add("disabled");
                }
                this.updateValues();
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
        text.innerHTML = inputElement.value; 

        inputElement.addEventListener("input", (e) => {
            text.innerHTML = inputElement.value; 
            this.settingsValues[inputClass] = inputElement.value;
            this.updateValues();
        });
    }

    /**
     * Updates the HTML and gesture module with the current settings values.
     */
    updateValues() {
        this.#gestureModule.dragSensitivity = this.settingsValues.gestureGridIncrement;
        this.#gestureModule.slamThreshold = this.settingsValues.gestureHardDropDistance;
        this.#gestureModule.slamTimeLimit = this.settingsValues.gestureHardDropTimer;
        this.#gestureModule.turnaroundFactor = this.settingsValues.gestureDirectionSwapAssist / 100;

        if (this.#previousControllerState !== this.settingsValues.buttonEnable) {
            this.#previousControllerState = this.settingsValues.buttonEnable;
            if (this.settingsValues.buttonEnable) {
                this.#controller.classList.remove("hide");
                this.#canvasSpace.classList.add("giveControllerSpace");
            } else {
                this.#controller.classList.add("hide");
                this.#canvasSpace.classList.remove("giveControllerSpace");
            }
        }

        this.saveValues();
    }

    /**
     * Stores the current settings in local storage.
     */
    saveValues() {
        localStorage.setItem("settings", JSON.stringify(this.settingsValues));
    }

    /**
     * Retrieves and parses the settings stored in local storage.
     */
    loadValues() {
        let foundSettings = JSON.parse(localStorage.getItem("settings"));
        if (foundSettings === null) {
            return;
        }
        Object.keys(foundSettings).forEach((val, index, arr) => {
            this.settingsValues[val] = foundSettings[val];
        });
    }

    /**
     * Resets all settings to their default values.
     */
    resetToDefault() {
        this.settingsValues = {...this.#defaultSettingsValues};
        this.updateValues();

        // Update the HTML elements to reflect the new settings.
        Object.keys(this.#defaultSettingsValues).forEach((val, index, arr) => {
            let inputElement = document.querySelector("input." + val);
            if (inputElement === null) {
                return;
            }
            if (inputElement.getAttribute("type") === "checkbox") {
                inputElement.checked = this.#defaultSettingsValues[val]; 
                let menu = inputElement.closest(".menu");
                if (inputElement.checked) {
                    menu.classList.remove("disabled");
                } else {
                    menu.classList.add("disabled");
                }
            } else {
                inputElement.value = this.#defaultSettingsValues[val];
            }
            
            let inputText = document.querySelector("span." + val);
            if (inputText === null) {
                return;
            }
            inputText.innerHTML = inputElement.value;
        });
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
