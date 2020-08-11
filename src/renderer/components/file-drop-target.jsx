import React, { useState } from 'react'
import localforage from 'localforage/dist/localforage'
import './file-drop-target.css'

export default function FileDropTarget({name, value, option, onChange}) {
  let input;
  const [highlighted, setHighlight] = useState(false);
  const dragAndDropEvents = {
    onDragEnter: (e) => {
        // e.preventDefault()
        setHighlight(true);
        console.log('enter', e.target)
    },
    onDragLeave: (e) => {
        // e.preventDefault()
        setHighlight(false);
        console.log('leave', e.target)
    },
    // onDragOver: (e) => {
    //     setHighlight(true);
    //     console.log('over')
    // },
    onDrop: async (e) => {
        setHighlight(false);
        if (e.dataTransfer.files.length > 0) {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          onChange({[name]: file.name});
          await localforage.setItem(file.name, file)
          // Clean out old file
          if(value) { await localforage.removeItem(value) }
        }
    },
    onDragOver: (e) => { e.preventDefault() },
    onClick: (e) => { input.click() }
  }
  async function onFileChange(e) {
    const file = e.target.files[0];
    onChange({[name]: file.name});
    await localforage.setItem(file.name, file)
    // Clean out old file
    if (value) { await localforage.removeItem(value) }
  }
  const className = 'input-group file-drop-area' + (highlighted ? ' file-drop-area-targeted' : '')
  return <div className={className} {...dragAndDropEvents}>
    <label className="label">{option.label}:
      <input ref={(ref) => input = ref} style={{display: 'none'}} onChange={onFileChange} type="file" />
    </label>
    {typeof value == 'string' ? value: 'Choose file'}
  </div>
}