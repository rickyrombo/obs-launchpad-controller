import React from 'react'

export default function LightInput({option, name, value, onCellSettingsChanged}) {  
  function onColorNumberChanged(e) {
    onCellSettingsChanged({[name]: {...value, color: e.target.value }})
  }
  function onLightAnimationChanged(e) {
      onCellSettingsChanged({[name]: {...value, animation: e.target.value }})
  }
  return (
    <div className="input-group">
      <label className="label">
          <span>{option.label}</span>
          <input min="0" max="127" value={value ? value.color : 0} onChange={onColorNumberChanged} type="number" />
      </label>
      <select value={value ? value.animation : 0} onChange={onLightAnimationChanged}>
          <option>Normal</option>
          <option>Flash</option>
          <option>Pulse</option>
      </select>
    </div>
  )
}