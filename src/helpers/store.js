import storage from 'redux-persist/lib/storage'
import thunk from 'redux-thunk'
import autoMergeLevel1 from 'redux-persist/es/stateReconciler/autoMergeLevel1'
import { persistStore, persistReducer } from 'redux-persist'
import { configureStore } from '@reduxjs/toolkit'
import rootReducer from '../reducers/reducers'

export const persistConfig = {
    key: ['cells', 'files', 'selectedRegion'],
    version: 2,
    storage,
    stateReconciler: autoMergeLevel1
}

export const store = configureStore({
    reducer: persistReducer(persistConfig, rootReducer),
    devTools: process.env.NODE_ENV !== 'production',
    middleware: [thunk],
})
export const persistor = persistStore(store)