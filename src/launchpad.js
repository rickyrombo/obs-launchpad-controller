import { EventEmitter } from "events";

const CONTROL_NOTE_START = 104
const GRID_NOTE_START = 89
const SYSEX_HEADER = [240, 0, 32, 41, 2, 24]
const SYSEX_END = 247;
const FADER_NOTE_START = 21;
const FADER_NOTE_END = 28;

const Commands = {
    SET_COLOR: 10,
    SET_RGB: 11,
    SET_COLUMN_COLOR: 12,
    SET_ROW_COLOR: 13,
    SET_ALL_COLOR: 14,
    FLASH_COLOR: 35,
    PULSE_COLOR: 40,
    SCROLL_TEXT: 20,
    SET_LAYOUT: 34,
    FADER_SETUP: 43
};

export const FaderType = {
    VOLUME: 0,
    PAN: 1
};

export const Layout = {
    SESSION: 0,
    USER_1: 1,
    USER_2: 2,
    ABLETON_LIVE: 3,
    VOLUME_FADERS: 4,
    PAN_FADERS: 5
}

export const LayoutCode = [176, 181, 189, 176, 176, 176]

export const Events = {
    BUTTON_PRESSED: 'button-pressed',
    BUTTON_RELEASED: 'button-released',
    CONNECTION_STATE_CHANGED: 'connection-state-changed',
    FADER_CHANGED: 'fader-changed',
    LAYOUT_CHANGED: 'layout-changed'
}
// _________________________________________________________
// ############     NOTES (SESSION, USER_2)     ############
// _________________________________________________________
//
//        +---+---+---+---+---+---+---+---+ 
//        |104|   |106|   |   |   |   |111|
//        +---+---+---+---+---+---+---+---+ 
//         
//        +---+---+---+---+---+---+---+---+  +---+
//        | 81|   |   |   |   |   |   |   |  | 89|
//        +---+---+---+---+---+---+---+---+  +---+
//        | 71|   |   |   |   |   |   |   |  | 79|
//        +---+---+---+---+---+---+---+---+  +---+
//        | 61|   |   |   |   |   | 67|   |  | 69|
//        +---+---+---+---+---+---+---+---+  +---+
//        | 51|   |   |   |   |   |   |   |  | 59|
//        +---+---+---+---+---+---+---+---+  +---+
//        | 41|   |   |   |   |   |   |   |  | 49|
//        +---+---+---+---+---+---+---+---+  +---+
//        | 31|   |   |   |   |   |   |   |  | 39|
//        +---+---+---+---+---+---+---+---+  +---+
//        | 21|   | 23|   |   |   |   |   |  | 29|
//        +---+---+---+---+---+---+---+---+  +---+
//        | 11|   |   |   |   |   |   |   |  | 19|
//        +---+---+---+---+---+---+---+---+  +---+
//
// _________________________________________________________
// ############          NOTES (USER1)          ############
// _________________________________________________________
//
//        +---+---+---+---+---+---+---+---+ 
//        |104|   |106|   |   |   |   |111|
//        +---+---+---+---+---+---+---+---+ 
//         
//        +---+---+---+---+---+---+---+---+  +---+
//        | 64|   |   |   | 67|   |   |   |  | 89|
//        +---+---+---+---+---+---+---+---+  +---+
//        | 60|   |   |   |   |   |   |   |  | 79|
//        +---+---+---+---+---+---+---+---+  +---+
//        | 56|   |   |   |   |   | 67|   |  | 69|
//        +---+---+---+---+---+---+---+---+  +---+
//        | 52|   |   |   |   |   |   |   |  | 59|
//        +---+---+---+---+---+---+---+---+  +---+
//        | 48|   |   |   |   |   |   |   |  | 49|
//        +---+---+---+---+---+---+---+---+  +---+
//        | 44|   |   |   |   |   |   |   |  | 39|
//        +---+---+---+---+---+---+---+---+  +---+
//        | 40|   | 42|   |   |   |   |   |  | 29|
//        +---+---+---+---+---+---+---+---+  +---+
//        | 36|   |   | 39| 68|   |   |   |  | 19|
//        +---+---+---+---+---+---+---+---+  +---+
//
// _________________________________________________________
// ############          BUTTONS (X/Y)          ############
// _________________________________________________________

// #          0   1   2   3   4   5   6   7      8   
// #        +----+---+----+---+---+---+---+---+ 
// #        |0/-1|   |2/-1|   |   |   |   |   |      -1
// #        +----+---+----+---+---+---+---+---+ 
// #         
// #        +---+---+---+---+---+---+---+---+  +---+
// #        |0/0|   |   |   |   |   |   |   |  |   |  0
// #        +---+---+---+---+---+---+---+---+  +---+
// #        |   |   |   |   |   |   |   |   |  |   |  1
// #        +---+---+---+---+---+---+---+---+  +---+
// #        |   |   |   |   |   |5/2|   |   |  |   |  2
// #        +---+---+---+---+---+---+---+---+  +---+
// #        |   |   |   |   |   |   |   |   |  |   |  3
// #        +---+---+---+---+---+---+---+---+  +---+
// #        |   |   |   |   |   |   |   |   |  |   |  4
// #        +---+---+---+---+---+---+---+---+  +---+
// #        |   |   |   |   |4/5|   |   |   |  |   |  5
// #        +---+---+---+---+---+---+---+---+  +---+
// #        |   |   |   |   |   |   |   |   |  |   |  6
// #        +---+---+---+---+---+---+---+---+  +---+
// #        |   |   |   |   |   |   |   |   |  |8/7|  7
// #        +---+---+---+---+---+---+---+---+  +---+

class Launchpad extends EventEmitter {
    constructor(options) {
        super();
        this.log = options.debug ? console.log : () => {};
        this.enableLayoutButtons = options.enableLayoutButtons;
        this.layout = options.layout || Layout.SESSION;
    }

    async connect() {
        this.midiAccess = await navigator.requestMIDIAccess({ sysex: true })
        this.midiAccess.onstatechange = this._onMidiStateChange.bind(this);
        for (let input of this.midiAccess.inputs.values()) {
            if (input.name.search("Launchpad") > -1) {
                this.input = input;
                this.input.onmidimessage = this._onMidiMessage.bind(this);
                this.log("Input connected", this.input.name);
            }
        }
        for (let output of this.midiAccess.outputs.values()) {
            if (output.name.search("Launchpad") > -1) {
                this.output = output;
                this.log("Output connected", this.output.name);
                this.setLayout(this.layout)
            }
        }
        if (!this.input || !this.output) {
            throw new Error('Launchpad: Device not found');
        }
    }

    _isInALayoutThatHasFaders() {
        return (this.layout == Layout.VOLUME_FADERS || this.layout == Layout.PAN_FADERS);
    }

    _isNoteAFader(note) {
        return note >= FADER_NOTE_START && note <= FADER_NOTE_END;
    }

    _onMidiMessage(event) {
        const [layout, note, velocity] = event.data;
        let {x, y} = this.getButtonXY(note, layout);
        if (this._isNoteAFader(note) && this._isInALayoutThatHasFaders()) {
            this.emit(Events.FADER_CHANGED, note - 21, velocity);
        } else {
            if (velocity == 127) {
                this.emit(Events.BUTTON_PRESSED, {x, y, note, layout})
            } else {
                this.emit(Events.BUTTON_RELEASED, {x, y, note, layout})
            }
        }
        this.log("Note Event:", event.data, {x, y})
    }

    _onMidiStateChange(event) {
        this.emit(Events.CONNECTION_STATE_CHANGED, event.port)
        this.log("State Change:", event.port.name, event.port.state)
    }

    getButtonXY(note, mode) {
        // Always the same note code no matter what
        if (note >= CONTROL_NOTE_START && mode >= 160) {
            return {
                x: note - CONTROL_NOTE_START,
                y: -1
            }
        }
        if (this.layout == Layout.SESSION || this.layout == Layout.USER_2 || this.layout == Layout.ABLETON_LIVE) {
            return {
                x: (note - 1) % 10,
                y: Math.floor((GRID_NOTE_START - note) / 10)
            }
        } else if (this.layout == Layout.USER_1) {
            return {
                x: note % 4 + 4 * Math.floor(note / 68),
                y: note >= 100 ? note - 100 : Math.floor((31 - (note - 36) % 32) / 4)
            }
        }
        // Faders scene buttons
        return {x: 8, y: (89 - note) / 10}
    }

    getNote(x, y) {
        if (y == -1) {
            return CONTROL_NOTE_START + x;
        }
        return x - 8 + y * -10 + GRID_NOTE_START
    }
    
    setButtonColorRGB(x, y, color) {
        color = [color[0] / 4 >> 0, color[1] / 4 >> 0, color[2] / 4 >> 0];
        this.sendSysEx([Commands.SET_RGB, this.getNote(x, y), ...color]);
    }

    setButtonColor(x, y, color) {
        this.sendSysEx([Commands.SET_COLOR, this.getNote(x, y), color]);
    }

    setNoteColor(note, color) {
        this.output.send([LayoutCode[this.layout], note, color]);
    }

    flashButtonColor(x, y, color) {
        this.sendSysEx([Commands.FLASH_COLOR, 0, this.getNote(x, y), color]);
    }
    
    pulseButtonColor(x, y, color) {
        this.sendSysEx([Commands.PULSE_COLOR, 0, this.getNote(x, y), color]);
    }

    scrollText(text, color, loop = false) {
        if (typeof text == "string")
            text = [...Buffer.from(text)]
        else if (Array.isArray(text)) {
            text = text.flatMap(el => {
                if (typeof el == "string") {
                    return Array.prototype.map.call(el, e => e.charCodeAt(0));
                }
                return el;
            });
        }
        this.log(text)
        this.sendSysEx([Commands.SCROLL_TEXT, color, loop, ...text]);
    }
    
    setLayout(layout) {
        this.layout = layout;
        this.sendSysEx([Commands.SET_LAYOUT, layout]);
        this.emit(Events.LAYOUT_CHANGED, layout);
        this.log("Layout changed", layout);
    }

    setupFader(fader, type, color, initialValue) {
        this.sendSysEx([Commands.FADER_SETUP, fader, type, color, initialValue]);
        this.log('Setup Fader', fader, type, color, initialValue)
    }

    setColumnColor(col, color) {
        this.sendSysEx([Commands.SET_COLUMN_COLOR, col, color])
    }

    setRowColor(row, color) {
        this.sendSysEx([Commands.SET_ROW_COLOR, row, color])
    }

    setAllColor(color) {
        this.sendSysEx([Commands.SET_ALL_COLOR, color]);
    }

    sendSysEx(data) {
        this.output.send([...SYSEX_HEADER, ...data, SYSEX_END]);
    }
}

export default Launchpad;