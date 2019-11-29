import { connect } from 'react-redux'
import { setSelectedRegion, setButtonAction } from '../actions/actions'
import LaunchpadGrid from '../components/launchpad-grid'


const mapStateToProps = state => {
    return {
        cells: state.cells,
        selectedRegion: state.selectedRegion || {}
    }
}
const mapDispatchToProps = dispatch => {
    return {
        setSelectedRegion: ({o, d}) => dispatch(setSelectedRegion({o, d})),
        setButtonAction: ({x, y, plugin, action}) => dispatch(setButtonAction({x, y, plugin, action}))
    }
}
const LaunchpadGridContainer = connect(mapStateToProps, mapDispatchToProps)(LaunchpadGrid)
export default LaunchpadGridContainer