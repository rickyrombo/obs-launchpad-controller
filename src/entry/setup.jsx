import React from 'react'
import ReactDOM from 'react-dom'
import App from '../components/app'
import { Provider } from 'react-redux'
import Launchpad, { Events } from '../launchpad'
import { indexToPosition, positionToIndex, getFileFromSandbox } from '../helpers'
import { PersistGate } from 'redux-persist/es/integration/react'
import { store, persistor } from '../helpers/store'

// If we're loaded as standalone, resize the window to make it look clean
if (window.matchMedia('(display-mode: standalone)').matches) {
    // The height is the size of the grid (521) + the size of 9 * 1px border + the header, I guess?
    window.resizeTo(1024, 521 + 42);
}

// const lp = new Launchpad({debug: false})
// lp.connect().then(() => {
//     function updateLaunchpadLights() {
//         store.getState().cells.forEach(({color}, index) => {
//             const {x, y} = indexToPosition(index);
//             lp.setButtonColor(x, y, color ||  0)
//         })
//     }
//     store.subscribe(updateLaunchpadLights)
//     updateLaunchpadLights()

//     let audioSources = {}
//     lp.on(Events.BUTTON_PRESSED, async (x, y) => {
//         const index = positionToIndex({x, y});
//         const cell = store.getState().cells[index]
//         if (cell.sound) {
//             getFileFromSandbox(cell.sound).then((file) => {
//                 const blobURL = URL.createObjectURL(file);
//                 const existingAudio = audioSources[index];
//                 if (existingAudio && cell.secondClickAction && cell.secondClickAction != 'Layer') {
//                     if (cell.secondClickAction == 'Stop') {
//                         existingAudio.pause()
//                         delete audioSources[index];
//                     } else if (cell.secondClickAction == 'Restart') {
//                         existingAudio.pause();
//                         existingAudio.currentTime = 0;
//                         existingAudio.play();
//                     }
//                 } else {
//                     const audio = new Audio(blobURL);
//                     audioSources[index] = audio;
//                     audio.play()
//                     lp.pulseButtonColor(x, y, cell.color);
//                     audio.onpause = () => {                    
//                         lp.setButtonColor(x, y, cell.color);
//                     }
//                 }
//             })
//         }
//     });

//     window.addEventListener('beforeunload', () => {
//         lp.setAllColor(0);
//     })
// })

ReactDOM.render(
<Provider store={store}>
    <PersistGate persistor={persistor}>
        <App />
    </PersistGate>
</Provider>, document.getElementById('root'));
