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
        this.config = config;
        this.samples = [];
        this.currentSceneSources = [];
    }
    
    isLayoutButton(x, y) { return x >=4 && y == -1; }
    isSceneButton(x, y) { return x == 8 && y < this.scenes.length; }

    async connect(config) {
        await Promise.all([this.obs.connect(config), this.lp.connect()]);
        await this.init();
    }

    async init() {
        this.setupLaunchpadListeners();
        this.setupOBSListeners();

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
        this.lp.on(Events.BUTTON_PRESSED, ({x, y}) => {
            if (this.isLayoutButton(x, y)) {
                const layout = x - 4;
                this.lp.setLayout(layout);
            } else if (this.lp.layout == Layout.SESSION) {
                if (this.isSceneButton(x, y)) {
                    this.changeScene(y);
                } else {
                    this.obs.send('SetSceneItemProperties', {
                        item: this.currentSceneSources[x + Math.floor(y / 2) * 8].name,
                        visible: (y % 2 == 0)
                    });
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
                // Samples?
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
            if (this.updateStoredSource(sourceName, { muted }) && this.lp.layout == Layout.ABLETON_LIVE) {
                this.lp.setButtonColor(this.getAudioSourceIndex(sourceName), 5, muted ? 5: 64)
            }
        });
        this.obs.on('SourceVolumeChanged', ({sourceName, volume}) => {
            this.updateStoredSource(sourceName, { volume });
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
        this.obs.on('SceneItemAdded', console.log);
        this.obs.on('SceneItemRemoved', console.log);
        this.obs.on('SceneItemVisibilityChanged', (sceneItem) => {
            this.updateSceneItemVisibilityButton(sceneItem.itemName, sceneItem.itemVisible);
        });
    }

    updateStoredSource(sourceName, update) {
        let i = this.specialSources.findIndex(s => s.name == sourceName);
        if (i > -1) {
            this.specialSources[i] = {...this.specialSources[i], ...update };
            return true;
        }
        i = this.scenes[this.currentScene].sources.findIndex(s => s.name == sourceName);
        if (i > -1) {
            this.scenes[this.currentScene].sources[i] = { ...this.scenes[this.currentScene].sources[i], ...update };
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
            this.setupSceneItemVisibilityButtons();
        }
        if (layout == Layout.USER_1) {
            // Setup samples?
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

    setupSceneItemVisibilityButtons() {
        this.currentSceneSources.forEach((source, index) => {
            const x = index % 8;
            const y = Math.floor(index / 8) * 2;
            this.lp.setButtonColor(x, y, 0);
        });
        this.currentSceneSources = [];
        const sources = this.getAllSceneSources();
        const addSource = (source) => {
            this.currentSceneSources.push(source);
            this.obs.send('GetSceneItemProperties', { item: source.name }).then(properties => {
                this.updateSceneItemVisibilityButton(source.name, properties.visible);
            })
            if (source.type == "group") {
                source.groupChildren.forEach(s => addSource(s));
            }
        }
        sources.forEach((source) => {
            if (!this.specialSources.find(s => s.name == source.name)) {
                addSource(source);
            }
        });
    }

    updateSceneItemVisibilityButton(sourceName, isVisible) {
        const index = this.currentSceneSources.findIndex(s => s.name == sourceName);
        if (index == -1) {
            console.error(`Could not update scene item visibility button. Source "${sourceName}" not tracked`);
            return;
        }
        const source = this.currentSceneSources[index];
        const x = index % 8;
        const y = Math.floor(index / 8) * 2;
        if (isVisible) {
            this.lp.setButtonColor(x, y, this._getSourceTypeVisibilityColor(source.type));
            this.lp.setButtonColor(x, y + 1, 0);
        } else {
            this.lp.setButtonColor(x, y, 0);
            this.lp.setButtonColor(x, y + 1, this._getSourceTypeVisibilityColor(source.type));
        }
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

    _getSourceTypeVisibilityColor(type) {
        switch(type) {
            case "ffmpeg_source":
                return 64;
            case "wasapi_input_capture":
                return 65;
            case "dshow_input":
                return 66;
            case "group":
                return 67;
            default:
                return 68;
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
        this.obs.send('SetCurrentScene', { "scene-name": this.scenes[this.currentScene].name }).then(() => {
            this.setupSceneItemVisibilityButtons();
        })
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