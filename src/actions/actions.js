import { createAction } from '@reduxjs/toolkit'

export const setSelectedRegion = createAction('cell/select')
export const changeCellSettings = createAction('cell/change-settings')
export const addFile = createAction('file/add')
export const removeFile = createAction('file/remove')