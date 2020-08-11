import React, { useState } from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/es/integration/react'
import LaunchpadOBSController from './launchpad-obs-controller'
import { store, persistor } from './helpers/store'

let storedPassword = localStorage.getItem('obs-password');
storedPassword = storedPassword ? storedPassword : '';

function App() {
    const [deferredPrompt, setDeferredPrompt] = useState();
    const [password, setPassword] = useState(storedPassword);
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState(false);
    const [launchpadStatus, setLaunchpadStatus] = useState(false);
    const [rememberPassword, setRememberPassword] = useState(true);

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
    async function connect(e) {
        e && e.preventDefault();
        if (rememberPassword) {
            localStorage.setItem('obs-password', password);
        } else {
            localStorage.removeItem('obs-password');
        }
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
    if (storedPassword) {
        storedPassword = null;
        connect();
    }
    const form = (
        <form onSubmit={connect}>
            <input name="username" type="hidden" />
            <input 
                name="password" 
                autoComplete="current-password" 
                disabled={connected ? 'disabled' : ''} 
                type="password" value={password} 
                onChange={(e) => setPassword(e.target.value)}
            />
            <input type="submit" value="Connect"/>
            <label style={{display: "block"}}>
                <input 
                    type="checkbox" 
                    checked={rememberPassword} 
                    onChange={(e) => setRememberPassword(e.value)} 
                /> Remember Password
            </label>
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

ReactDOM.render(
<Provider store={store}>
    <PersistGate persistor={persistor}>
        <App />
    </PersistGate>
</Provider>,
    document.getElementById('app'))