import React from 'react'
import LaunchpadGridContainer from '../containers/LaunchpadGridContainer'
import CellEditorContainer from '../containers/CellEditorContainer'
import "./app.css"

export default function App() {
    return <div className="contents">
        <LaunchpadGridContainer />
        <CellEditorContainer />
    </div>
}