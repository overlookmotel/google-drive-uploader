/* --------------------
 * google-drive-uploader module
 * `upload` function
 * ------------------*/

'use strict';

// Modules
const {promisify} = require('util'),
	pathModule = require('path'),
	fs = require('fs'),
	stat = promisify(fs.stat),
	invariant = require('tiny-invariant').default;

// Imports
const Upload = require('./uploadClass'),
	{_getUploadUrl} = require('./uploadUrl'),
	{_getFinal} = require('./final'),
	{
		validateString, validateObject, validateFunction, validateFunctionNoopDefault,
		validateInteger, validateBoolean
	} = require('./validate');

// Constants
const CHUNK_SIZE_DIVISOR = 256 * 1024,
	CHUNK_SIZE_DIVISOR_TXT = '256 KiB',
	DEFAULT_CHUNK_SIZE = CHUNK_SIZE_DIVISOR;

// Exports

/**
 * Upload data to Google Drive.
 * `auth` and one of `path` or `streamFactory` options are required.
 * @param {Object} options - Options object
 * @param {Object} [options.auth] - Auth object (required unless `getFinal` is function or `false`)
 * @param {string} [options.uploadUrl] - Google Drive upload URL
 * @param {string} [options.path] - Path to file to upload
 * @param {function} [options.streamFactory] - Function to produce streams of chunks of the file.
 *   Will be called with args `(start, len)`
 * @param {string} [options.filename] - Filename to save file as in Google Drive
 * @param {number} [options.size] - Size of file in bytes. Required if using `streamFactory`.
 * @param {string} [options.folderId] - ID of Google Drive folder to put file in.
 * @param {string} [options.mimeType] - MIME Type of file. If not provided, Google Drive will deduce
 *   from file contents.
 * @param {string} [options.md5] - MD5 hash of file as a hex-encoded string.
 * @param {boolean} [options.noMd5] - If `true`, skips calculating and checking hash.
 * @param {number} [options.chunkSize] - Size in bytes of each chunk.
 *   If not provided, defaults to 256KiB.
 * @param {function|boolean} [options.getFinal] - Function to call to get final details of file.
 *   `true`, `null` or `undefined` for default. `false` for no final check.
 *   If function, will be called with args (id, auth, log) and should return object
 *   of form `{size, md5, mimeType}` (mimeType is optional).
 * @param {function} [options.onData] - Callback function which will be called every time data
 *   is pushed to the Google Drive API.
 * @param {function} [options.log] - Logging function
 * @returns {Promise} - Promise resolving to upload properties object of form `{id, size, md5}`
 */
module.exports = async function upload({
	auth, uploadUrl, path, streamFactory, filename, size,
	folderId, mimeType, md5, noMd5, chunkSize, getFinal, onData, progress, log
}) {
	// Validate input
	validateObject('auth', auth);
	validateString('uploadUrl', uploadUrl);
	invariant(uploadUrl || auth, '`auth` must be provided unless `uploadUrl` provided');
	path = validateString('path', path);
	validateFunction('streamFactory', streamFactory);
	validateString('filename', filename);
	size = validateInteger('size', size);
	folderId = validateString('folderId', folderId);
	mimeType = validateString('mimeType', mimeType);
	md5 = validateString('md5', md5);
	validateBoolean('noMd5', noMd5);
	noMd5 = !!noMd5;
	chunkSize = validateInteger('chunkSize', chunkSize);
	if (chunkSize == null) {
		chunkSize = DEFAULT_CHUNK_SIZE;
	} else {
		invariant(
			chunkSize % CHUNK_SIZE_DIVISOR === 0,
			`\`chunkSize\` must be a multiple of ${CHUNK_SIZE_DIVISOR} (${CHUNK_SIZE_DIVISOR_TXT})`
		);
	}
	if (getFinal !== false) {
		getFinal = getFinal === true ? null : validateFunction('getFinal', getFinal);
		if (!getFinal) {
			invariant(
				auth,
				'`auth` must be provided unless custom `getValue` function provided or disabled'
			);
			getFinal = _getFinal;
		}
	}
	onData = validateFunction('onData', onData);
	log = validateFunctionNoopDefault('log', log);
	progress = validateFunctionNoopDefault('progress', progress);

	// If no size, stat file to get size
	if (size == null) {
		invariant(path, '`size` must be provided if using a stream factory');
		log('Stat-ing file', {path});
		const stats = await stat(path);
		size = stats.size;
		log('Stat-ed file', {path, size});
	}

	// If no streamFactory, create one from file
	if (streamFactory == null) {
		invariant(path, '`path` or `streamFactory` must be provided');
		streamFactory = makeFileStreamFactory(path);
	}

	// Get upload URL
	if (!uploadUrl) {
		if (!filename) {
			invariant(path, '`path` or `filename` must be provided');
			filename = pathModule.basename(path);
		}

		uploadUrl = await _getUploadUrl(auth, filename, size, folderId, mimeType, null, log);
	}

	// Create upload object and run
	const uploadObj = new Upload(
		uploadUrl, auth, streamFactory, size, md5, noMd5, chunkSize, getFinal, onData, progress, log
	);
	const result = await uploadObj.run();

	return result;
};

/**
 * Create stream factory function for file.
 * @param {string} path - File path
 * @returns {function} - Stream factory function
 */
function makeFileStreamFactory(path) {
	return (start, len) => fs.createReadStream(path, {start, end: start + len - 1});
}
