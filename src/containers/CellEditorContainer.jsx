import { connect } from 'react-redux'
import { changeCellSettings, addFile, removeFile } from '../actions/actions'
import CellEditor from '../components/cell-editor'

const mapStateToProps = state => {
    const selected = state.cells.filter(cell => cell.isSelected)
    return {
        cells: selected,
    }
}
const mapDispatchToProps = dispatch => {
    return {
        onCellSettingsChanged: (settings) => dispatch(changeCellSettings({settings})),
        onFileAdded: (filename) => dispatch(addFile(filename)),
        onFileRemoved: (filename) => dispatch(removeFile(filename))
    }
}
const CellEditorContainer = connect(mapStateToProps, mapDispatchToProps)(CellEditor)
export default CellEditorContainer