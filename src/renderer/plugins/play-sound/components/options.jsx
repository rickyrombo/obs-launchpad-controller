import React from 'react'
import PluginSettings from '../../../components/plugin-options'
import { addClass, removeClass, copyFileEntryToSandbox, deleteFileFromSandbox, getAllFilesFromSandbox } from '../helpers'


const confirmDeleteSingleFile = (file) => {
  return confirm("You're about to remove all button mappings to \n\n"
      + `"${file}"` + "\n\nand delete it from local storage.")
}

const confirmDeleteAllFiles = (files) => {
  return confirm("You're about to remove all button mappings to \n\n"
      + `${files.join("\n")}` + "\n\nand delete them from local storage.")
}

export default function ({files, sound}) {
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
  
  return(
    <PluginSettings>
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
    </PluginSettings>
  )
}