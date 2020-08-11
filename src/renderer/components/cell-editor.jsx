import React from 'react'
import { findAction } from '../helpers/plugin-helpers'
import './cell-editor.css'
import InputOption from './input-option'

export default function CellEditor({cells, onCellSettingsChanged}) {
    if (!cells || cells.length != 1) {
        return <div className="cell-editor"></div>
    }
    const cell = cells[0];
    if (!cell.pluginAction) {
        return <div className="cell-editor"></div>
    }
    const action = findAction(cell.pluginAction);
    if (!action) {
        return <div class="cell-editor">Couldn't find plugin/action pair "{cell.pluginAction.plugin}" and "{cell.pluginAction.action}"</div>
    }
    return (
    <div className="cell-editor">
        <h3>{cell.pluginAction.plugin} : {action.name}</h3>
        <div className="cell-editor-options">
        {Object.keys(action.options).map(key => 
            <InputOption key={key} name={key} 
                    option={action.options[key]} 
                    value={cell.pluginActionOptions[key]}
                    onChange={onCellSettingsChanged} />
        )}
        </div>
    </div>
    )
}