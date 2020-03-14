import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCog } from '@fortawesome/free-solid-svg-icons'
import './plugin-list.css'

export function ActionListItem({plugin, action}) {
  const dragEventHandlers = {
    onDragStart: (e) => {
      e.dataTransfer.setData('application/json', JSON.stringify({plugin: plugin.name, action: action.name}));
    }
  }
  return (
    <li className="action-list-item" draggable="true" {...dragEventHandlers}>
      {action.name}
    </li>
  )
}

export function PluginListItem({plugin}) {
  return (
    <li className="plugin-list-item">
      <span className="plugin-list-item-name">{plugin.name} 
          {plugin.options
            ? <a className="plugin-list-item-settings" href="#" onClick={(e) => e.preventDefault()}>
                <FontAwesomeIcon icon={faCog} />
              </a> 
            : ''}
      </span>
      <ul className="action-list">
      {plugin.actions.map((action, i) => 
        <ActionListItem key={i} action={action} plugin={plugin} />
      )}
      </ul>
    </li>
  )
}

export default function PluginList({plugins}) {
  return (
    <ul className="plugin-list">
      {plugins.map((plugin, i) => 
        <PluginListItem key={i} plugin={plugin} />  
      )}
    </ul>
  )
}