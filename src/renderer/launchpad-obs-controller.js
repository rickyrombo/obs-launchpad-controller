import Launchpad, { Events, Layout, FaderType} from './launchpad';
import OBSWebSocket from 'exports-loader?OBSWebSocket!obs-websocket-js/dist/obs-websocket.js'
import { positionToIndex, indexToPosition, getFileFromSandbox } from './helpers'
import { EventEmitter } from 'events';
import Nanoleaf from './nanoleaf';

function toRGB(hue, saturation, brightness) {
    /* accepts parameters
    * h  Object = {h:x, s:y, v:z}
    * OR 
    * h, s, v
    */
    function HSVtoRGB(h, s, v) {
        var r, g, b, i, f, p, q, t;
        if (arguments.length === 1) {
            s = h.s, v = h.v, h = h.h;
        }
        i = Math.floor(h * 6);
        f = h * 6 - i;
        p = v * (1 - s);
        q = v * (1 - f * s);
        t = v * (1 - (1 - f) * s);
        switch (i % 6) {
            case 0: r = v, g = t, b = p; break;
            case 1: r = q, g = v, b = p; break;
            case 2: r = p, g = v, b = t; break;
            case 3: r = p, g = q, b = v; break;
            case 4: r = t, g = p, b = v; break;
            case 5: r = v, g = p, b = q; break;
        }
        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }
    const {r, g, b} = HSVtoRGB(
        {
            h: hue / 360.0,
            s: saturation / 100.0,
            v: brightness / 100.0,
        }
    )
    return [r, g, b];
}

const isAudioSource = (source) => source.type ? source.type.search(/input|wasapi/g) > -1 : source.sourceType.search(/input|wasapi/g) > -1;

const Page = {
    SOURCE_VISIBILITY: 0,
    NANOLEAF: 1,
    MIXER: 3,
    SOURCE_VOLUME_FADERS: 4,
    NANOLEAF_FADERS: 5
};

class LaunchpadOBSController extends EventEmitter {
    constructor(config) {
        super();
        this.obs = new OBSWebSocket();
        this.lp = new Launchpad({debug: true});
        this.nanoleaf = new Nanoleaf();
        this.scenes = [];
        this.currentScene = 0;
        this.specialSources = [];
        this.config = config;
        this.samples = [];
        this.currentSceneSources = [];
        this.nanoleafEffects = [];
        this.favoriteEffects = [{
            name: "Fireworks",
            color: 62,
        },{
            name: "Prydz",
            color: 64,
        },{
            name: "Nightclub",
            color: 58,
        },{
            name: "Nightclub 2",
            color: 71,
        },{
            name: "Pulse Pop Beats",
            color: 107,
        }, {
            name: "Duo RED EDM",
            color: 60,
        },{
            name: "Shooting Stars",
            color: 81,
        },{ 
            name: "Energize", 
            color: 41,
        },{
            name: "80s Burst Synth",
            color: 12,
        },{
            name: "Purple Moonbeams",
            color: 81,
        },{
            name: "Thunder",
            color: 103,
        },{
            name: "Quarks",
            color: 17,
        },{
            name: "Sonic Sunset",
            color: 108,
        },{
            name: "Electric purple",
            color: 57,
        },{
            name: "Higgs Boson",
            color: 114,
        },{
            name: "Rave",
            color: 74,
        }];
    }
    
    isLayoutButton(x, y) { return x >=4 && y == -1; }
    isSceneButton(x, y) { return x == 8 && y < this.scenes.length; }

    async connect(config) {
        const nanoleafAuth = this.nanoleaf.authenticate().catch(e => {
            if (e.status == 403) {
                console.log('You need to hold the power button and reauthenticate with your nano leaf');
            }
        })
        await Promise.all([this.obs.connect(config), nanoleafAuth, this.lp.connect()]);
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
        const { studioMode } = await this.obs.send('GetStudioModeStatus');
        this.studioMode = studioMode;
        if (this.studioMode) {
            const previewScene = await this.obs.send('GetPreviewScene');
            this.previewScene = this.scenes.findIndex(el => el.name == previewScene.name);
        }
        // Get Desktop Audio and Mic/Aux
        const specialSourcesNames = await this.obs.send('GetSpecialSources')
        for (let key of Object.keys(specialSourcesNames)) {
            if (key.startsWith("desktop") || key.startsWith("mic")) {
                let source = await this.obs.send('GetSourceSettings', { sourceName: specialSourcesNames[key] });
                const volumeInfo = await this.obs.send('GetVolume', { source: specialSourcesNames[key] });
                this.specialSources.push({...source, ...volumeInfo})
            }
        }
        await this.setupPage(Page.SOURCE_VISIBILITY);
    }

    setupLaunchpadListeners() {
        let interval;
        this.lp.on(Events.BUTTON_PRESSED, ({x, y, note}) => {
            clearInterval(interval);
            if (this.isLayoutButton(x, y)) {
                const page = x - 4;
                this.setPage(page);
            } else if (this.page === Page.SOURCE_VISIBILITY) {
                if (this.isSceneButton(x, y)) {
                    this.changePreviewScene(y);
                } else {
                    let sceneName = this.scenes[this.currentScene].name;
                    if (this.studioMode) {
                        sceneName = this.scenes[this.previewScene].name;
                    }
                    this.obs.send('SetSceneItemProperties', {
                        'scene-name': sceneName,
                        item: this.currentSceneSources[x + y * 8].name,
                        visible: !this.currentSceneSources[x + y * 8].visible
                    });
                }
            } else if (this.page === Page.MIXER) {
                if (x === 8 && y === 0) {
                    this.setPage(Page.SOURCE_VOLUME_FADERS);
                } else if (x < 8 && y == 5) {
                    const source = this.getAllSceneSources().filter(isAudioSource)[x];    
                    let sceneName = this.scenes[this.currentScene].name;
                    if (this.studioMode) {
                        sceneName = this.scenes[this.previewScene].name;
                    }
                    this.obs.send('SetMute', { 'scene-name': sceneName, source: source.name, mute: !source.muted });
                } else if (x == 8 && y == 5) {
                    let targetMute = true;
                    if (this.getAllSceneSources().filter(isAudioSource).every(s => s.muted)) {
                        targetMute = false;
                    }    
                    let sceneName = this.scenes[this.currentScene].name;
                    if (this.studioMode) {
                        sceneName = this.scenes[this.previewScene].name;
                    }
                    for (let source of this.getAllSceneSources().filter(isAudioSource)) {
                        this.obs.send('SetMute', { 'scene-name': sceneName, source: source.name, mute: targetMute })
                    }
                } else if (x == 8 && y == 7) {
                    this.obs.send('StartStopRecording');
                }
            } else if (this.page === Page.SOURCE_VOLUME_FADERS) {
                if (x === 8 && y === 0) {
                    this.setPage(Page.MIXER);
                }
            } else if (this.page === Page.NANOLEAF) {
                if ((x == 0 || x == 1) && y == -1) {
                    this.nanoleaf.setState({brightness: {increment: 5 * (x * -2 + 1)}});
                } else if (this.isSceneButton(x, y)) {
                    this.changePreviewScene(y);
                } else {
                    const effect = this.nanoleafEffects.filter(e => e.pluginType == 'rhythm')[x + y * 8];
                    const color = effect.palette.find(c => c.brightness > 0);
                    const { hue, saturation, brightness } = color;
                    const rgb = toRGB(hue, saturation, brightness);
                    interval = setInterval(() => {
                        this.lp.setButtonColor(x, y, 0);
                        setTimeout(() => {
                            this.lp.setButtonColorRGB(x, y, rgb);
                        }, 200);
                    }, 400);
                    this.nanoleaf.setSelectedEffect(effect.animName);
                    console.log(effect.animName);
                }
            }
        });

        this.lp.on(Events.BUTTON_RELEASED, () => {
        })

        this.lp.on(Events.LAYOUT_CHANGED, (layout) => {
            // this.setupLayout(layout);
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
            if (this.updateStoredSource(sourceName, { muted }) && this.page === Page.MIXER) {
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
        this.obs.on('StudioModeSwitched', ({newState}) => {
            this.studioMode = newState;
        });
        this.obs.on('PreviewSceneChanged', ({sceneName}) => {
            this.previewScene = this.scenes.findIndex(s => s.name == sceneName);
        });
    }

    setPage(page) {
        if (page !== this.page) {
            this.lp.setAllColor(0);
            this.page = page;
            this.setupPage(page);
        }
    }

    refreshPage = () => {
        this.lp.setAllColor(0);
        this.setupPage(this.page);
    }

    updateStoredSource(sourceName, update) {
        let scene = this.studioMode ? this.previewScene : this.currentScene;
        let i = this.specialSources.findIndex(s => s.name == sourceName);
        if (i > -1) {
            this.specialSources[i] = {...this.specialSources[i], ...update };
            return true;
        }
        i = this.scenes[scene].sources.findIndex(s => s.name == sourceName);
        if (i > -1) {
            this.scenes[scene].sources[i] = { ...this.scenes[scene].sources[i], ...update };
            return true;
        }
        console.error('Could not find sourceName', sourceName);
        return false;
    }

    getAudioSourceIndex(sourceName) {
        return this.getAllSceneSources().filter(isAudioSource).findIndex(s => s.name == sourceName)
    }

    async setupPage(page) {
        switch (page) {
            case Page.SOURCE_VISIBILITY:
                this.setupSourceVisibilityPage();
                break;
            case Page.NANOLEAF:
                await this.setupNanoleafPage();
                break;
            case Page.MIXER:
                await this.setupMixerPage();
                break;
            case Page.SOURCE_VOLUME_FADERS:
                this.setupSourcesVolumesPage();
                break;
        }
        this.lp.setButtonColor(page + 4, -1, 9);
    }

    setupSourceVisibilityPage() {
        this.lp.setLayout(Layout.SESSION);
        this.setupSceneButtons();
        this.setupSceneItemVisibilityButtons();
    }

    async setupNanoleafPage() {
        this.lp.setLayout(Layout.USER_1);
        this.setupSceneButtons();
        await this.setupNanoleafRhythmButtons();
    }

    async setupMixerPage() {
        this.lp.setLayout(Layout.ABLETON_LIVE);
        this.lp.setButtonColor(8, 0, 2);
        this.lp.setButtonColor(8, 5, 2);
        this.lp.setButtonColor(8, 7, 2);
        await this.setupMutes();
    }

    setupSourcesVolumesPage() {
        this.lp.setLayout(Layout.VOLUME_FADERS);
        this.lp.setButtonColor(7, -1, 9);
        this.lp.setButtonColor(8, 0, 64);
        this.setupVolumeFaders();
    }

    async setupNanoleafRhythmButtons() {
        if (this.nanoleafEffects.length == 0) {
            try {
                this.nanoleafEffects = await this.nanoleaf.getAllEffects();
            } catch (err) {
                console.error(err);
                return;
            }
        }
        this.nanoleafEffects.filter(e => e.pluginType === 'rhythm').forEach(async(effect, i) => {
            const color = effect.palette.find(c => c.brightness > 0);
            const { hue, saturation, brightness } = color;
            const rgb = toRGB(hue, saturation, brightness);
            this.lp.setButtonColorRGB(i % 8, Math.floor(i/8), rgb);
        })
    }

    setupSceneButtons() {
        for (let i = 0; i < this.scenes.length; i++) {
            this.lp.setButtonColor(8, i, 64);
        }
        this.lp.setButtonColor(8, this.previewScene, 4);
        this.lp.setButtonColor(8, this.currentScene, 72);
    }

    setupSceneItemVisibilityButtons() {
        for (let index = 0; index < 64; index++) {
            const x = index % 8;
            const y = Math.floor(index / 8);
            this.lp.setButtonColor(x, y, 0);
        }
        this.currentSceneSources = [];
        let sceneName = this.scenes[this.currentScene].name;
        if (this.studioMode) {
            sceneName = this.scenes[this.previewScene].name;
        }
        const sources = this.getAllSceneSources();
        const addSource = (source) => {
            this.currentSceneSources.push(source);
            this.obs.send('GetSceneItemProperties', { 'scene-name': sceneName, item: source.name }).then(properties => {
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
        this.currentSceneSources[index].visible = isVisible;
        const x = index % 8;
        const y = Math.floor(index / 8);
        if (isVisible) {
            this.lp.pulseButtonColor(x, y, this._getSourceTypeVisibilityColor(source.type));
        } else {
            this.lp.setButtonColor(x, y, this._getSourceTypeVisibilityColor(source.type));
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
                let sceneName = this.scenes[this.currentScene].name;
                if (this.studioMode) {
                    sceneName = this.scenes[this.previewScene].name;
                }
                source = await this.obs.send('GetMute', {
                    'scene-name': sceneName,
                    source: source.name
                });
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
            case "image_source":
                return 68;
            case "browser_source":
                return 69;
            case "text_gdiplus":
                return 70;
            default:
                return 2;
        }
    }

    getAllSceneSources() {
        let scene = this.currentScene;
        if (this.studioMode) {
            scene = this.previewScene;
        }
        return [
            ...this.specialSources, 
            ...this.scenes[scene].sources
        ]; 
    }

    changeScene(newScene) {
        this.currentScene = newScene;
        return this.obs.send('SetCurrentScene', { "scene-name": this.scenes[this.currentScene].name })
            .then(this.refreshPage);
    }

    changePreviewScene(newScene) {
        console.log(this.previewScene, this.currentScene, newScene);
        if (!this.studioMode || newScene == this.previewScene) {
            this.previewScene = newScene;
            return this.changeScene(newScene);
        }
        this.previewScene = newScene;
        return this.obs.send('SetPreviewScene', { "scene-name": this.scenes[this.previewScene].name })
            .then(this.refreshPage);
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
                        //if (sampler)     
                            this.lp.setButtonColor(x, y, cell.color);
                    }
                }
            })
        }
    }
}

export default LaunchpadOBSController