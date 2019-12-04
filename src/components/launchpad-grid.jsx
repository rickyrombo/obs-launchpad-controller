import React, { useState } from 'react'
import './launchpad-grid.css'
import launchpadColorsPreview from 'file-loader!../img/launchpad-colors-preview.png'
import { positionToIndex } from '../helpers'

function getColorPreviewStyles(colorCode) {
    const beforeSizing = {
        x: 0 - (colorCode % 4) + -4 * Math.floor(colorCode / 32),
        y: 1 + Math.floor(colorCode % 32 / 4)
    }
    const gridSize = 64;
    return {
        backgroundPositionX: beforeSizing.x * gridSize + "px",
        backgroundPositionY: beforeSizing.y * gridSize + "px",
        backgroundImage: `url("${launchpadColorsPreview}")`,
        backgroundSize: '1600%'
    }
}

export const LaunchpadGridCell = ({pluginActionOptions, x, y, onMouseDragStart, onMouseDragOver, onActionDropped}) => {
    const [highlight, setHighlight] = useState(false);
    const [isActive, setActive] = useState(false);
    let spritePosition = {};
    let light = false;
    if (pluginActionOptions) {
        light = isActive ? pluginActionOptions.on : pluginActionOptions.off;
        spritePosition = light ? getColorPreviewStyles(light.color - 1) : {};
    }
    let classNames = [
        "launchpad-grid-cell",
        (highlight) ? "launchpad-grid-cell-highlight" : "",
        (light && light.animation == 'Flash') ? "launchpad-grid-cell-flash" : "",
        (light && light.animation == 'Pulse') ? "launchpad-grid-cell-pulse" : ""
    ];
    function onDrop(e) {
        if (!!e.dataTransfer) {
            e.preventDefault();
            const data = e.dataTransfer.getData('application/json');
            const {action, plugin} = data ? JSON.parse(data) : {}
            if (action)
                onActionDropped({x, y, plugin, action});
        }
        setHighlight(false);
    }
    return <div onMouseDown={() => onMouseDragStart(x, y)} 
                onMouseOver={() => onMouseDragOver(x, y)}
                onDragEnter={(e) => { setHighlight(true); e.preventDefault(); return false; }}
                onDragLeave={() => setHighlight(false)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDrop(e)}
                onClick={() => setActive(!isActive)}
                className={classNames.join(" ")} 
                style={{...spritePosition}}>
            </div>
}

export const LaunchpadGridSelector = ({a, b, gridSize}) => {
    if (a && b) {
        const o = {
            x: Math.min(a.x, b.x),
            y: Math.min(a.y, b.y)
        }
        const d = {
            x: Math.max(a.x, b.x),
            y: Math.max(a.y, b.y)
        }
        const styles = {
            left:  o.x * gridSize + "px",
            top:  o.y * gridSize + "px",
            width: (d.x - o.x + 1) * gridSize - 2 + "px",
            height: (d.y - o.y + 1) * gridSize - 2 + "px"
        }
        return <div style={styles} className="launchpad-grid-selector"></div>
    }
    return ''
}

const LaunchpadGrid = ({cells, selectedRegion, setSelectedRegion, setButtonAction}) => {
    const width = 8;
    const height = 8;
    /**
     * @var {x, y} a the origin of the drag
     * @var {x, y} b the (current) end of the drag
     */
    let [a, setOrigin] = useState(selectedRegion.o);
    let [b, setDestination] = useState(selectedRegion.d);
    let [mouseHeld, setMouseHeld] = useState(false);
    let [shiftHeld, setShiftHeld] = useState(false);
    let [ctrlHeld, setCtrlHeld] = useState(false);

    function updateSelectedRegion() {
        const o = {
            x: Math.min(a.x, b.x),
            y: Math.min(a.y, b.y)
        }
        const d = {
            x: Math.max(a.x, b.x),
            y: Math.max(a.y, b.y)
        }
        setSelectedRegion({o, d})
    }
    const mouseListeners = {
        onMouseDragStart: (x, y) => {
            if (mouseHeld) return;
            setOrigin({x, y})
            setDestination({x, y})
            setMouseHeld(true)
        },
        onMouseDragOver: (x, y) => {
            if (!mouseHeld) return;
            setDestination({x, y})
        },
    }
    function onMouseUp() {
        if (mouseHeld) {
            setMouseHeld(false);
            updateSelectedRegion();
        }
    }
    function onKeyDown(e) {
        if (e.key == "Shift") {
            setShiftHeld(true);
        }
        else if (e.key == "Control") {
            setCtrlHeld(true);
        }
        else if (e.keyCode >= 37 && e.keyCode <= 40) {
            const m = {
                h: (e.keyCode - 38) % 2,
                v: (e.keyCode - 39) % 2
            }
            const move = (pos) => ({
                x: Math.min(Math.max(pos.x + m.h, 0), width - 1), 
                y: Math.min(Math.max(pos.y + m.v, 0), height - 1)
            });
            setDestination(move(b))
            if (!shiftHeld && !ctrlHeld) {
                setOrigin(move(b))
            } else if (ctrlHeld) {
                setOrigin(move(a))
            }
        }
    }
    function onKeyUp(e) {
        if (e.key == "Shift") {
            setShiftHeld(false);
        }
        else if (e.key == "Control") {
            setCtrlHeld(false);
        }
        else if (e.keyCode >= 37 && e.keyCode <= 40) {
            updateSelectedRegion();
        }
    }

    function handleActionDrop({x, y, plugin, action}) {
        setOrigin({x, y}); 
        setDestination({x, y});
        setButtonAction({x, y, plugin, action})
        setSelectedRegion({o: {x, y}, d: {x, y} })
    }

    return <div className="launchpad-grid" onMouseUp={onMouseUp} onKeyUp={onKeyUp} onKeyDown={onKeyDown} tabIndex="0">
        {Array(height).fill().map((_, y) => 
            <div key={y} className="launchpad-grid-row">
                {Array(width).fill().map((_, x) =>
                    <LaunchpadGridCell {...mouseListeners} key={positionToIndex({x, y})}
                        {...cells[positionToIndex({x, y})] }
                        onActionDropped={handleActionDrop}
                        x={x} y={y} />
                )}
            </div>
        )}
        <LaunchpadGridSelector a={a} b={b} gridSize={65} />
    </div>
}

export default LaunchpadGrid;