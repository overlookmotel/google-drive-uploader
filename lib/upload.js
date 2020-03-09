/* --------------------
 * google-drive-uploader module
 * `upload` function
 * ------------------*/

'use strict';

// Modules
const {promisify} = require('util'),
	pathModule = require('path'),
	fs = require('fs'),
	stat = promisify(fs.stat);

// Imports
const Upload = require('./uploadClass'),
	{_getUploadUrl} = require('./uploadUrl'),
	{
		validateString, validateObject, validateFunction, validateInteger, validateBoolean
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
 * @param {Object} options.auth - Auth object
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
 * @param {function} [options.log] - Logging function
 * @returns {Promise} - Promise resolving to upload properties object of form `{id, size, md5}`
 */
module.exports = async function upload({
	auth, uploadUrl, path, streamFactory, filename, size,
	folderId, mimeType, md5, noMd5, chunkSize, onData, progress, log
}) {
	// Validate input
	validateObject('auth', auth, true);
	validateString('uploadUrl', uploadUrl);
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
	} else if (chunkSize % CHUNK_SIZE_DIVISOR !== 0) {
		throw new Error(`\`chunkSize\` must be a multiple of ${CHUNK_SIZE_DIVISOR} (${CHUNK_SIZE_DIVISOR_TXT})`);
	}
	onData = validateFunction('onData', onData);
	validateFunction('log', log);
	if (!log) log = () => {};
	validateFunction('progress', progress);
	if (!progress) progress = () => {};

	// If no size, stat file to get size
	if (size == null) {
		if (!path) throw new Error('`size` must be provided if using a stream factory');
		log('Stat-ing file', {path});
		const stats = await stat(path);
		size = stats.size;
		log('Stat-ed file', {path, size});
	}

	// If no streamFactory, create one from file
	if (streamFactory == null) {
		if (!path) throw new Error('`path` of `streamFactory` must be provided');
		streamFactory = makeFileStreamFactory(path);
	}

	// Get upload URL
	if (!uploadUrl) {
		if (!filename) {
			if (!path) throw new Error('`path` or `filename` option must be provided');
			filename = pathModule.basename(path);
		}

		uploadUrl = await _getUploadUrl(auth, filename, size, folderId, mimeType, null, log);
	}

	// Create upload object and run
	const uploadObj = new Upload(
		uploadUrl, auth, streamFactory, size, md5, noMd5, chunkSize, onData, progress, log
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
