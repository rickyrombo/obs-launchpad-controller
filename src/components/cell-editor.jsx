import React from 'react'
import './cell-editor.css'
import { addClass, removeClass, copyFileEntryToSandbox, deleteFileFromSandbox, getAllFilesFromSandbox } from '../helpers'

const confirmDeleteSingleFile = (file) => {
    return confirm("You're about to remove all button mappings to \n\n"
        + `"${file}"` + "\n\nand delete it from local storage.")
}

const confirmDeleteAllFiles = (files) => {
    return confirm("You're about to remove all button mappings to \n\n"
        + `${files.join("\n")}` + "\n\nand delete them from local storage.")
}

export default function CellEditor({cells, files, onCellSettingsChanged, onFileAdded, onFileRemoved}) {
    const targetedClassName = 'cell-editor-file-drop-area-targeted'
    const dragAndDropEvents = {
        onDragEnter: (e) => {
            addClass(e.target, targetedClassName)
        },
        onDragLeave: (e) => {
            removeClass(e.target, targetedClassName)
        },
        onDrop: (e) => {
            e.preventDefault();
            removeClass(e.target, targetedClassName)
            const data = e.dataTransfer.getData('text/plain');
            if (e.dataTransfer.files.length > 0) {      
                const entry = e.dataTransfer.items[0].webkitGetAsEntry();
                copyFileEntryToSandbox(entry).then((sound) => {
                    onCellSettingsChanged({sound});
                    onFileAdded(sound);
                })
            } else if (data) {
                onCellSettingsChanged({sound: data})
            }
        },
        onDragOver: (e) => { e.preventDefault() }
    }
    function onDragStart(file, e) {
        e.dataTransfer.setData("text/plain", file)
    }
    function deleteFile(file, skipConfirm = false) {
        if (skipConfirm || confirmDeleteSingleFile(file)) {
            onFileRemoved(file);
            deleteFileFromSandbox(file);
        }
    }
    function deleteAllFiles() {
        getAllFilesFromSandbox().then((files) => {
            if (confirmDeleteAllFiles(files)) {
                files.forEach(file => deleteFile(file, true));
            }
        })
    }
    function secondClickChecked(e) {
        onCellSettingsChanged({ secondClickAction: e.target.value })
    }
    function colorChanged(e) {
        onCellSettingsChanged({color: Math.min(parseInt(e.target.value), parseInt(e.target.max))})
    }
    const secondClickOptions = ["Layer", "Restart", "Stop"]
    let color, sound, secondClickAction;
    if (cells && cells.length > 0) {     
        color = cells[0].color;
        color = color && cells.every(cell => cell.color == color) ? color : ''
        sound = cells[0].sound;
        sound = cells.every(cell => cell.sound == sound) ? sound : '<multiple>'
        secondClickAction = cells[0].secondClickAction;
        secondClickAction = cells.every(cell => cell.secondClickAction == secondClickAction) ? secondClickAction : false;   
    }
    return (
    <div className="cell-editor">
        <div className="cell-editor-input-group-right">
            <button tabIndex="1" onClick={() => onCellSettingsChanged({ color: 0 })}>
                Clear Light
            </button>
            <span> </span>
            <button tabIndex="1" onClick={() => onCellSettingsChanged({ sound: undefined })}>
                Clear Sound
            </button>
        </div>
        <div className="cell-editor-input-group">
            <label htmlFor="color-input">Color: </label>
            <input id="color-input" min="0" max="127" tabIndex="0"
                // ref={input => input && input.focus()} 
                disabled={cells && cells.length > 0 ? '' : 'disabled' } 
                type="number" value={color} onChange={colorChanged} />
        </div>
        <div className="cell-editor-input-group">
            <h4>Sample to play:</h4>
            <div id="file-input" className="cell-editor-file-drop-area" {...dragAndDropEvents}>
                {sound ? sound: 'Drag sounds from your sound bank or filesystem here'}
            </div>
            <p style={{textAlign: 'center'}}>If the sound is playing when pressed again:</p>
            <div className="checkbox-horizontal-group">
            {secondClickOptions.map(option =>
                <label key={option}><input type="radio" name="second-click" value={option} checked={option == secondClickAction} onChange={secondClickChecked}/> {option}</label>
            )}
            </div>
            <h4 style={{textAlign: 'center'}}>Sound bank:</h4>
            <div className="cell-editor-sound-bank">
                {files.map(file => 
                <div className="cell-editor-file-entry" 
                        draggable="true" onDragStart={(e) => onDragStart(file, e)} 
                        key={file}>{file} 
                    <button className="cell-editor-file-entry-delete-btn" 
                            onClick={() => deleteFile(file)} title="Delete"></button>
                </div>
                )}
            </div>
            <p><button onClick={deleteAllFiles}>Delete all files in sound bank</button></p>
        </div>
    </div>)

}