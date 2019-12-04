import React from 'react'
import { findAction } from '../helpers/plugin-helpers'
import './cell-editor.css'
import FileDropTarget from './file-drop-target'
import LightInput from './light-input'
/**
 * 
 * @typedef {{name: string, option: Object, value: Object, onCellSettingsChanged: Function}} ActionOptionProps 
 */
/**
 * 
 * @param {ActionOptionProps} props 
 */
function ActionOption(props) {
    function onChange(e) {
        onCellSettingsChanged({[props.name]: e.target.value})
    }
    if (props.option.type == 'file') {
        return <FileDropTarget {...props}/>
    }
    if (props.option.type == 'select') {
        return (
        <label className="input-group"><span>{props.option.label}:</span>
            <select value={props.value ? props.value : 0} onChange={onChange}>
                {props.option.options.map((o, i) => <option key={i}>{o.label}</option>)}
            </select>
        </label>)
    }
    if (props.option.type == 'light') {
        return <LightInput {...props} />
    }
    return <span>Option type {props.option.type} not supported.</span>
}

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
            <ActionOption key={key} name={key} 
                    option={action.options[key]} 
                    value={cell.pluginActionOptions[key]}
                    onCellSettingsChanged={onCellSettingsChanged} />
        )}
        </div>
    </div>
    )
}