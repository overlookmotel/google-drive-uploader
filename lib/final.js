/* --------------------
 * google-drive-uploader module
 * `getFinal` function
 * ------------------*/

'use strict';

// Modules
const googleDrive = require('googleapis').google.drive('v3'),
	invariant = require('tiny-invariant').default;

// Imports
const {validateString, validateObject, validateFunctionNoopDefault} = require('./validate'),
	{isObject, isString, isFullString, isPositiveIntegerString} = require('./utils');

// Exports
module.exports = {
	getFinal,
	_getFinal
};

/**
 * Get file size, hash and mime type of completed file from Google Drive API.
 * @param {Object} options - Options object
 * @param {string} options.id - File ID
 * @param {Object} options.auth - Auth object
 * @param {Function} [options.log] - Logging function (optional)
 */
function getFinal({id, auth, log}) {
	// Validate input
	id = validateString('id', id, true);
	validateObject('auth', auth, true);
	log = validateFunctionNoopDefault('log', log);

	return _getFinal(id, auth, log);
}

async function _getFinal(id, auth, log) {
	// Get hash, file size from API
	log('Getting file info from API', {fileId: id});

	let res;
	try {
		res = await googleDrive.files.get({
			auth,
			fileId: id,
			fields: 'size,md5Checksum,mimeType'
		});
	} catch (err) {
		throw Object.assign(new Error('Failed to get file info from API'), {err});
	}

	invariant(res.status === 200, `Getting file attributes failed with status code ${res.status}`);

	const file = res.data;
	invariant(isObject(file), 'Invalid response getting file attributes');
	log('Got file info from API', {fileId: id, file});

	const {size, md5Checksum: md5, mimeType} = file;
	invariant(
		isPositiveIntegerString(size) && isMd5(md5) && isFullString(mimeType),
		'Invalid response getting file attributes'
	);

	return {size: size * 1, md5, mimeType};
}

const MD5_REGEX = /^[\da-f]{32}$/;
function isMd5(val) {
	return isString(val) && MD5_REGEX.test(val);
}
