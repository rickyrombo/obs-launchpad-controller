/**
 * @typedef {{x: number, y: number}} Position
 */

/**
 * Converts an X, Y coordinate into the index in the array
 * @param {Position} position 
 * @returns {number} index
 */
export const positionToIndex = ({x, y}) => {
    return x + (y + 1) * 9
}

/**
 * Converts the given index back into X, Y coordinates
 * @param {number} index 
 * @returns {Position} 
 */
export const indexToPosition = (index) => {
    return {
        x: index % 9,
        y: Math.floor(index / 9) - 1
    }
}

export function hasClass(el, className) {
    if (el.classList)
        return el.classList.contains(className)
    else
        return el.classname && !!el.className.match(new RegExp('(\\s|^)' + className + '(\\s|$)'))
}
/**
 * Adds the class to the element if it doesn't already have it
 * @param {HTMLElement} el 
 * @param {string} className 
 */
export const addClass = (el, className) => {
    if (el.classList)
        el.classList.add(className)
    else if (!hasClass(el, className))
        el.className += " " + className
}

/**
 * Removes the class from the element if it has it
 * @param {HTMLElement} el 
 * @param {string} className 
 */
export const removeClass = (el, className) => {
    if (el.classList)
        el.classList.remove(className)
    else if (hasClass(el, className)) {
        var reg = new RegExp('(\\s|^)' + className + '(\\s|$)')
        el.className=el.className.replace(reg, ' ')
    }
}
/**
 * @typedef {Object<string, any>} FileSystemFileEntry
 * @property {string} name The file name
 * @property {function} file Gets the [File]{@link File} object associated
 */
/**
 * @typedef {Object<string, any>} FileSystemFileHandle
 * @property {string} name The file name
 * @property {function} getFile Gets the [File]{@link File} object associated
 */

/**
 * Copies the given file entry to the sandbox location so that we can access it later without user 
 * interaction. Note that it writes AFTER it responds, so the file is not guaranteed to be ready by
 * the time this function returns.
 * @param {FileSystemFileEntry} fileEntry 
 */
export const copyFileEntryToSandbox = async (fileEntry) => {
    const dir = await FileSystemDirectoryHandle.getSystemDirectory({type: 'sandbox'});
    const newFile = await dir.getFile(fileEntry.name, {create: true});
    const writer = await newFile.createWriter();
    fileEntry.file(async(file) => {
        await writer.write(0, file);
        await writer.close();
    });
    return fileEntry.name;
}

/**
 * Gets the file previously saved to the sandbox
 * @param {string} filename 
 * @returns {Promise<File>} the file saved on the sandbox
 */
export const getFileFromSandbox = async (filename) => {
    const dir = await FileSystemDirectoryHandle.getSystemDirectory({type: 'sandbox'});
    /**
     * @type {FileSystemFileHandle}
     */
    const entry = await dir.getFile(filename, {create: false});
    return await entry.getFile();
}

export const getAllFilesFromSandbox = async () => {
    const dir = await FileSystemDirectoryHandle.getSystemDirectory({type: 'sandbox'});
    const entries = await dir.getEntries()
    let names = []
    for await (let entry of entries) {
        names.push(entry.name);
    }
    return names;
}

export const deleteFileFromSandbox = async (filename) => {
    const dir = await FileSystemDirectoryHandle.getSystemDirectory({type: 'sandbox'});
    /**
     * @type {FileSystemFileHandle}
     */
    await dir.removeEntry(filename, {recursive: false});
}