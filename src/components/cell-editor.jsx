import React from 'react'
import { findAction } from '../helpers/plugin-helpers'
import './cell-editor.css'

function ActionOption({option, value}) {
    if (option.type == 'file') {
        return <label className="input-group"><span>{option.label}:</span><input type="file" /></label>
    }
    if (option.type == 'select') {
        return (
        <label className="input-group"><span>{option.label}:</span>
            <select>
                {option.options.map((o, i) => <option key={i}>{o.label}</option>)}
            </select>
        </label>)
    }
    if (option.type == 'color') {
        return <div className="input-group">
            <label className="label"><span>{option.label}</span><input type="number" /></label>
            <div>
                <label><input type="checkbox" /> Flash</label>
                <label><input type="checkbox" /> Pulse</label>
            </div>
        </div>
    }
    return <span>Option type {option.type} not supported.</span>
}

export default function CellEditor({cells, onCellSettingsChanged}) {
    console.log(cells)
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
        {Object.keys(action.options).map(key => 
            <ActionOption key={key} option={action.options[key]} value={cell.pluginActionOptions[key]} />
        )}
    </div>
    )
}