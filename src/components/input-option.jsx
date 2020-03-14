import React from 'react'
import FileDropTarget from './file-drop-target'
import LightInput from './light-input'

/**
 * 
 * @typedef {{name: string, option: Object, value: Object, onChange: Function}} InputOptionProps 
 */
/**
 * 
 * @param {InputOptionProps} props 
 */
function InputOption(props) {
  function onChange(e) {
      props.onChange({[props.name]: e.target.value})
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
  switch (props.option.type) {
      case 'text':
      case 'number':
      case 'password':
      case 'email':
          return (            
              <label className="label input-group">
                  <span>{props.option.label}</span>
                  <input type={props.option.type} value={props.value} onChange={onChange} />
              </label>);
  }
  return <span>Option type {props.option.type} not supported.</span>
}

export default InputOption;