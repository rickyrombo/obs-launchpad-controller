import { createReducer, combineReducers } from '@reduxjs/toolkit'
import { setSelectedRegion, changeCellSettings, addFile, removeFile, setButtonAction } from '../actions/actions'
import { positionToIndex } from '../helpers'

export const cells = createReducer(Array(81).fill({}), {
    [setSelectedRegion]: (state, action) => {
        let newState = state.map(cell => ({...cell, isSelected: false }))
        const {o, d} = action.payload
        for (let i = o.x; i <= d.x; i++) {
            for (let j = o.y; j <= d.y; j++) {
                newState[positionToIndex({x: i, y: j})].isSelected = true;
            }
        }
        return newState;
    },
    [changeCellSettings]: (state, action) => {
        return state.map((cell) => {
            if (cell.isSelected) {
                return {...cell, ...action.payload.settings}
            }
            return cell;
        });
    },
    [setButtonAction]: (state, {payload}) => {
        state[positionToIndex(payload)].pluginAction = { plugin: payload.plugin, action: payload.action };
        state[positionToIndex(payload)].pluginActionOptions = {};
    },
    [removeFile]: (state, action) => {
        state.forEach((cell) => {
            if (cell.sound == action.payload) {
                delete cell.sound
            }
        })
    }
})

export const files = createReducer([], {
    [addFile]: (state, action) => {
        if (state.findIndex(name => name == action.payload) == -1) {
            state.push(action.payload)
        }
    },
    [removeFile]: (state, action) => {
        const index = state.indexOf(action.payload)
        state.splice(index, 1);
    }
})

export const selectedRegion = createReducer({}, {
    [setSelectedRegion]: (_, action) => {
        return action.payload
    }
})

export default combineReducers({cells, files, selectedRegion});