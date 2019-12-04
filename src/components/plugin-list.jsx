import React from 'react';

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
      <h3>{plugin.name}</h3>
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