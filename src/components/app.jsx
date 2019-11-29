import React from 'react'
import LaunchpadGridContainer from '../containers/LaunchpadGridContainer'
import PluginList from '../components/plugin-list'
import plugins from '../plugins'
import "./app.css"
import CellEditorContainer from '../containers/CellEditorContainer'

export default function App() {
    return <div className="contents">
        <div className="column-container">
            <LaunchpadGridContainer />
            <CellEditorContainer />
        </div>
        <PluginList plugins={plugins} />
    </div>
}