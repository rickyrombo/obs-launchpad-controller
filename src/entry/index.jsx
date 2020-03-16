import LaunchpadOBSController from '../launchpad-obs-controller'
import React, { useState } from 'react'
import ReactDOM from 'react-dom'
import { store, persistor } from '../helpers/store'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/es/integration/react'

// If we're loaded as standalone, resize the window to make it look clean
if (window.matchMedia('(display-mode: standalone)').matches) {
    window.resizeTo(320, 200);
}
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('/service-worker.js').then(function(registration) {
            // Registration was successful
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
        }, function(err) {
            // registration failed :(
            console.log('ServiceWorker registration failed: ', err);
        });
    });
}
function App() {
    const [deferredPrompt, setDeferredPrompt] = useState();
    const [password, setPassword] = useState('');
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState(false);
    const [launchpadStatus, setLaunchpadStatus] = useState(false)
    const controller = new LaunchpadOBSController(store.getState());
    window.addEventListener('beforeinstallprompt', (e) => {
        setDeferredPrompt(e);
    });
    window.addEventListener('beforeunload', () => {
        controller.lp.setAllColor(0);
    })
    controller.on('LaunchpadStateChanged', ({state}) =>
        setLaunchpadStatus(`Launchpad ${state}`)
    );
    async function connect() {
        try {
            setError('')
            await controller.connect({password});
            controller.on('ObsClosed', () => {
                setConnected(false);
                setError('OBS was closed');
            });
            setConnected(true);
        } catch (err) {
            setError(err.message || err.error);
        }
    }
    const form = (
        <form action="/config.html" method="post" onSubmit={(e) => e.preventDefault()}>
            <input name="username" type="hidden" />
            <input 
                name="password" 
                autoComplete="current-password" 
                disabled={connected ? 'disabled' : ''} 
                type="password" value={password} 
                onChange={(e) => setPassword(e.target.value)}
            />
            <input onClick={connect} type="submit" value="Connect"/>
        </form>)
    return (
        <div>
            {deferredPrompt 
                ? <button onClick={() => { deferredPrompt.prompt(); setDeferredPrompt(false) }}>Click me</button> 
                : ''}
            <p><a href="/setup.html">Configure</a> <a href="/">Reload</a></p>
            {!connected  ? form : ''}
            <pre style={{color: 'red', fontWeight: 'bold'}}>{error || "\n"}</pre>
            <pre>{connected ? "OBS connected\n" : ''}</pre>
            <pre>{launchpadStatus}</pre>
        </div>
    );
}
//D17az7XqRc1dXAh9Ykmi
ReactDOM.render(
<Provider store={store}>
    <PersistGate persistor={persistor}>
        <App />
    </PersistGate>
</Provider>,
    document.getElementById('root'))