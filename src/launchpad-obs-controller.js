import Launchpad, { Events, Layout, FaderType} from './launchpad';
import OBSWebSocket from 'exports-loader?OBSWebSocket!obs-websocket-js/dist/obs-websocket.js'
import { positionToIndex, indexToPosition, getFileFromSandbox } from './helpers'
import { EventEmitter } from 'events';

const isAudioSource = (source) => source.type ? source.type.search(/input|wasapi/g) > -1 : source.sourceType.search(/input|wasapi/g) > -1;

class LaunchpadOBSController extends EventEmitter {
    constructor(config) {
        super();
        this.obs = new OBSWebSocket();
        this.lp = new Launchpad({debug: true});
        this.scenes = [];
        this.currentScene = 0;
        this.specialSources = [];
        this.setupLaunchpadListeners();
        this.setupOBSListeners();
        this.config = config;
        this.samples = [];
    }
    
    isLayoutButton(x, y) { return x >=4 && y == -1; }
    isSceneButton(x, y) { return x == 8 && y < this.scenes.length; }

    async connect(config) {
        await Promise.all([this.obs.connect(config), this.lp.connect()]);
        await this.init();
    }

    async init() {
        // Get scene info
        const response = await this.obs.send('GetSceneList');
        this.scenes = response.scenes;
        const { name } = await this.obs.send('GetCurrentScene');
        this.currentScene = this.scenes.findIndex(el => el.name == name);
        
        // Get Desktop Audio and Mic/Aux
        const specialSourcesNames = await this.obs.send('GetSpecialSources')
        for (let key of Object.keys(specialSourcesNames)) {
            if (key.startsWith("desktop") || key.startsWith("mic")) {
                let source = await this.obs.send('GetSourceSettings', { sourceName: specialSourcesNames[key] });
                const volumeInfo = await this.obs.send('GetVolume', { source: specialSourcesNames[key] });
                this.specialSources.push({...source, ...volumeInfo})
            }
        }
        await this.setupLayout(this.lp.layout)
    }

    setupLaunchpadListeners() {
        this.lp.on(Events.BUTTON_PRESSED, (x, y) => {
            if (this.isLayoutButton(x, y)) {
                const layout = x - 4;
                this.lp.setLayout(layout);
            } else if (this.lp.layout == Layout.SESSION) {
                if (this.isSceneButton(x, y)) {
                    this.changeScene(y);
                } else {
                    this.playSampleAt(x, y);
                }
            } else if (this.lp.layout == Layout.ABLETON_LIVE) {
                if (x == 8 && y == 0) {
                    this.lp.setLayout(Layout.VOLUME_FADERS);
                } else if (x < 8 && y == 5) {
                    const source = this.getAllSceneSources().filter(isAudioSource)[x];
                    this.obs.send('SetMute', { source: source.name, mute: !source.muted });
                } else if (x == 8 && y == 5) {
                    for (let source of this.getAllSceneSources().filter(isAudioSource)) {
                        this.obs.send('SetMute', { source: source.name, mute: true })
                    }
                } else if (x == 8 && y == 7) {
                    this.obs.send('StartStopRecording');
                }
            } else if (this.lp.layout == Layout.VOLUME_FADERS) {
                if (x == 8 && y == 0) {
                    this.lp.setLayout(Layout.ABLETON_LIVE);
                }
            } else if (this.lp.layout == Layout.USER_1) {
                if (x == 0 && y == 0) {
                    this.obs.send('GetSceneItemProperties', {item: 'pulp fiction'}).then(p => {
                        if (!p.visible) {
                            this.lp.pulseButtonColor(0, 0 , 3);
                        } else {
                            this.lp.setButtonColor(0, 0, 3);
                        }
                        this.obs.send('SetSceneItemProperties', {item: 'pulp fiction', visible: !p.visible})
                    })
                    // this.obs.send('ResetSceneItem', {item: 'pulp fiction'})
                } else if (x==1 && y ==0) {
                    this.obs.send('SetSceneItemProperties', {item: 'Webcam', scale: {x: 2, y: 2}})
                }
            }
        });

        this.lp.on(Events.LAYOUT_CHANGED, (layout) => {
            this.setupLayout(layout);
        });

        this.lp.on(Events.FADER_CHANGED, (fader, value) => {
            const source = this.getAllSceneSources().filter(s => isAudioSource(s))[fader];
            if (!source) return;
            this.obs.send('SetVolume', { source: source.name, volume: value / 127.0 })
        });

        this.lp.on(Events.CONNECTION_STATE_CHANGED, (state) => {
            this.emit('LaunchpadStateChanged', state);
        });
    }

    setupOBSListeners() {
        this.obs.on('SourceMuteStateChanged', ({sourceName, muted}) => {
            if (this.updateSource(sourceName, { muted }) && this.lp.layout == Layout.ABLETON_LIVE) {
                this.lp.setButtonColor(this.getAudioSourceIndex(sourceName), 5, muted ? 5: 64)
            }
        });
        this.obs.on('SourceVolumeChanged', ({sourceName, volume}) => {
            this.updateSource(sourceName, { volume });
        });
        this.obs.on('RecordingStarted', () => {
            if (this.lp.layout == Layout.ABLETON_LIVE) {
                this.lp.pulseButtonColor(8, 7, 5);
            }
        });
        this.obs.on('RecordingStopped', () => {
            if (this.lp.layout == Layout.ABLETON_LIVE) {
                this.lp.setButtonColor(8, 7, 2);
            }
        });
        this.obs.on('Exiting', () => {
            this.emit('ObsClosed');
            this.lp.setAllColor(0);
            this.setupSampleButtons();
        });
        this.obs.on('SourceCreated', console.log);
        this.obs.on('SourceDestroyed', console.log);
        this.obs.on('SceneItemVisibilityChanged', console.log);
    }

    updateSource(sourceName, update) {
        let i = this.specialSources.findIndex(s => s.name == sourceName);
        if (i > -1) {
            this.specialSources[i] = {...this.specialSources[i], ...update };
            return true;
        }
        i = this.scenes[this.currentScene].sources.findIndex(s => s.name == sourceName);
        if (i > -1) {
            this.scenes[this.currentScene].sources[i] = {...this.scenes[this.currentScene].sources[i], ...update };
            return true;
        }
        console.error('Could not find sourceName', sourceName);
        return false;
    }

    getAudioSourceIndex(sourceName) {
        return this.getAllSceneSources().filter(isAudioSource).findIndex(s => s.name == sourceName)
    }

    async setupLayout(layout) {
        this.lp.setButtonColor(4, -1, 0);
        this.lp.setButtonColor(5, -1, 0);
        this.lp.setButtonColor(6, -1, 0);
        this.lp.setButtonColor(7, -1, 0);
        if (layout == Layout.SESSION) {
            this.setupSceneButtons();
            this.setupSampleButtons();
        }
        if (layout == Layout.USER_1) {
            this.lp.setButtonColor(0, 0, 2);
        }
        if (layout == Layout.ABLETON_LIVE) {
            this.lp.setButtonColor(8, 0, 2);
            this.lp.setButtonColor(8, 5, 2);
            this.lp.setButtonColor(8, 7, 2);
            await this.setupMutes();
        }
        if (layout == Layout.VOLUME_FADERS) {
            this.lp.setButtonColor(7, -1, 9);
            this.lp.setButtonColor(8, 0, 64);
            this.setupVolumeFaders();
        } else {
            this.lp.setButtonColor(layout + 4, -1, 9);
        }
    }

    setupSceneButtons() {
        for (let i = 0; i < this.scenes.length; i++) {
            this.lp.setButtonColor(8, i, 64);
        }
        this.lp.setButtonColor(8, this.currentScene, 72);
    }

    setupSampleButtons() {
        this.config.cells.forEach(({color}, index) => {
            if (!color) return;
            const {x, y} = indexToPosition(index);
            this.lp.setButtonColor(x, y, color)
        })
    }

    setupVolumeFaders() {
        let i = 0;
        for (let source of this.getAllSceneSources()) {
            if (!isAudioSource(source)) continue;
            this.lp.setupFader(i, FaderType.VOLUME, 122, source.volume * 127);
            i++;
        }
    }

    async setupMutes() {
        let i = 0;
        for (let source of this.getAllSceneSources()) {
            if (!isAudioSource(source)) continue;
            if (typeof source.muted == "undefined") {
                source = await this.obs.send('GetMute', {source: source.name});
            }
            this.lp.setButtonColor(i++, 5, source.muted ? 5 : 64);
        }
    }

    getAllSceneSources() { 
        return [
            ...this.specialSources, 
            ...this.scenes[this.currentScene].sources
        ]; 
    }

    changeScene(newScene) {
        this.lp.setButtonColor(8, this.currentScene, 64);
        this.lp.setButtonColor(8, newScene, 72);
        this.currentScene = newScene;
        this.obs.send('SetCurrentScene', { "scene-name": this.scenes[this.currentScene].name })
    }

    playSampleAt(x, y) {
        const index = positionToIndex({x, y});
        const cell = this.config.cells[index]
        if (cell.sound) {
            getFileFromSandbox(cell.sound).then((file) => {
                const blobURL = URL.createObjectURL(file);
                const existingAudio = this.samples[index];
                if (existingAudio && cell.secondClickAction && cell.secondClickAction != 'Layer') {
                    if (cell.secondClickAction == 'Stop') {
                        existingAudio.pause()
                        delete this.samples[index];
                    } else if (cell.secondClickAction == 'Restart') {
                        existingAudio.pause();
                        existingAudio.currentTime = 0;
                        existingAudio.play();
                    }
                } else {
                    const audio = new Audio(blobURL);
                    this.samples[index] = audio;
                    audio.play()
                    this.lp.pulseButtonColor(x, y, cell.color);
                    audio.onpause = () => {               
                        if (this.lp.layout == Layout.SESSION)     
                            this.lp.setButtonColor(x, y, cell.color);
                    }
                }
            })
        }
    }
}

export default LaunchpadOBSController


// const body = document.getElementsByTagName('body')[0];
// const table = document.createElement('div');
// table.style.display = 'table';
// //table.style.backgroundImage = "url(\"" + colors + "\")";
// for (let i = 0; i < 8; i++) {
//     const row = document.createElement('div');
//     row.style.display = 'table-row';
//     for (let j = 0; j < 8; j++) {
//         const cell = document.createElement('div');
//         cell.style.display = "table-cell";
//         cell.style.width = "121px";
//         cell.style.height = "121px";
//         cell.style.border = "1px solid black";
//         cell.style.boxSizing = "border-box";
//         // const {x, y} = getSpriteXY(j + 8 * i);
//         // cell.style.backgroundPositionX = x * 120 + "px";
//         // cell.style.backgroundPositionY = y * 121 + "px";
//         // cell.style.backgroundImage = "url(\"" + colors + "\")";
//         cell.style.verticalAlign = "middle";
//         cell.style.padding = "10px";
//         cell.dataset.x = j;
//         cell.dataset.y = i;
//         cell.ondrop = function(event) {
//             this.style.backgroundColor = "#000";
//             this.style.color = "#FFF";
//             const file = event.dataTransfer.items[0].getAsFile();
//             this.append(file.name)
//             this.dataset.file = URL.createObjectURL(file);
//             event.preventDefault();
//         }
//         cell.ondragover = function(event) {
//             this.style.backgroundColor = "#FF0";
//             event.preventDefault();
//         }
//         cell.onclick = function(event) {
//             const audio = new Audio(this.dataset.file);
//             audio.play();
//         }
//         const number = document.createElement('input');
//         number.type = "number";
//         number.style.width = "3em"
//         number.max = 127;
//         number.min = 1;
//         number.value = 1;
//         number.onchange = function(event) {
//             const {x, y} = getSpriteXY(this.value - 1);
//             cell.style.backgroundPositionX = x * 120 + "px";
//             cell.style.backgroundPositionY = y * 122 + "px";
//             cell.style.backgroundImage = "url(\"" + colors + "\")";
//         }
//         // number.style.display = "inline";
//         cell.appendChild(number);
//         row.appendChild(cell);
//     }
//     table.appendChild(row);
// }
// body.appendChild(table);

// (async function() {
//     let specialSources = []
//     let faders = []
//     let currentScene;
//     let scenes = []
//     const obs = new OBSWebSocket();
//     const lp = new Launchpad({debug: true});
//     await obs.connect();
//     console.log('Connected to OBS');
//     await lp.connect();
//     console.log('Connected to Launchpad MK2');
    
//     lp.on(Events.BUTTON_PRESSED, async(x, y) => {
//         console.log('woo')
//         if (x == 8 && y < scenes.length && lp.layout == Layout.SESSION) {
//             lp.setButtonColor(x, currentScene, 64);
//             lp.setButtonColor(x, y, 72);
//             currentScene = y;
//             console.log(currentScene, scenes[currentScene])
//             obs.send('SetCurrentScene', { "scene-name": scenes[currentScene].name })
//         }
//         const isMixerButton = (x, y) => x == 7 && y == -1
//         const isSessionButton = (x, y) => x == 4 && y == -1
//         if (isMixerButton(x, y)) {
//             lp.setLayout(Layout.VOLUME_FADERS)
//             for (let i = 0; i < specialSources.length; i++) {
//                 lp.setupFader(i, FaderType.VOLUME, 15, specialSources[i].volume * 127)
//                 faders.push(specialSources[i]);
//             }
//             for (let i = 0; i < scenes[currentScene].sources.length; i++) {
//                 lp.setupFader(i + specialSources.length, FaderType.VOLUME, 10, scenes[currentScene].sources[i].volume * 127);
//                 faders.push(scenes[currentScene].sources[i]);
//             }
//             lp.setButtonColor(x, y, 42);
//             lp.setButtonColor(8, 0, 54);
//         }
//         else if (isSessionButton(x, y)) {
//             lp.setLayout(Layout.SESSION);
//             const sceneList = await obs.send('GetSceneList');
//             scenes = sceneList.scenes;
//             for (let i = 0; i < scenes.length; i++) {
//                 lp.setButtonColor(8, i, 64);
//             }
//             const { name } = await obs.send('GetCurrentScene');
//             currentScene = scenes.findIndex(el => el.name == name);
//             lp.setButtonColor(8, currentScene, 72);
//             lp.setButtonColor(x, y, 43);
//         }
//     });
//     lp.on(Events.FADER_CHANGED, (fader, value) => {
//         console.log(faders[fader].name, fader, value)
//         obs.send('SetVolume', { source: faders[fader].name, volume: value / 127.0 })
//     });
//     const specialSourcesNames = await obs.send('GetSpecialSources')
//     console.log(specialSourcesNames);
//     for (let key of Object.keys(specialSourcesNames)) {
//         if (key.startsWith("desktop") || key.startsWith("mic")) {
//             let source = await obs.send('GetSourceSettings', { sourceName: specialSourcesNames[key] });
//             const volumeInfo = await obs.send('GetVolume', { source: specialSourcesNames[key] });
//             specialSources.push({...source, ...volumeInfo})
//             console.log(source)
//         }
//     }
// })()