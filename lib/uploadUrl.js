/* --------------------
 * google-drive-uploader module
 * `getUploadUrl` function
 * ------------------*/

'use strict';

// Imports
const request = require('./request');

// Imports
const {validateString, validateObject, validateFunction, validateInteger} = require('./validate');

// Constants
const GET_UPLOAD_API_URL = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable',
	UPLOAD_URL_REGEX = /^https:\/\/www\.googleapis\.com\/upload\/drive\/v3\/files\?uploadType=resumable&upload_id=.+$/;

// Exports
module.exports = {
	getUploadUrl,
	_getUploadUrl
};

function getUploadUrl({auth, filename, size, folderId, mimeType, origin, log}) {
	// Validate input
	validateObject('auth', auth, true);
	validateString('filename', filename, true);
	validateInteger('size', size, true);
	folderId = validateString('folderId', folderId);
	mimeType = validateString('mimeType', mimeType);
	origin = validateString('origin', origin);
	validateFunction('log', log);
	if (!log) log = () => {};

	return _getUploadUrl(auth, filename, size, folderId, mimeType, origin, log);
}

async function _getUploadUrl(auth, filename, size, folderId, mimeType, origin, log) {
	const token = (auth.gtoken.rawToken || auth.gtoken.raw_token).access_token;

	const params = {
		method: 'post',
		body: {
			name: filename
		},
		json: true,
		headers: {
			Authorization: `Bearer ${token}`,
			'X-Upload-Content-Length': size
		}
	};
	if (folderId) params.body.parents = [folderId];
	if (mimeType) params.headers['X-Upload-Content-Type'] = mimeType;
	if (origin) params.headers.Origin = origin;

	log('Getting upload URL', {filename, size, folderId, mimeType, origin});
	const res = await request(GET_UPLOAD_API_URL, params);

	if (res.statusCode !== 200) {
		throw new Error(`Bad status code ${res.statusCode} returned when getting upload URL`);
	}

	const uploadUrl = res.headers.location;
	if (!uploadUrl) throw new Error('No upload URL returned');

	const match = uploadUrl.match(UPLOAD_URL_REGEX);
	if (!match) throw new Error(`Received invalid upload URL '${uploadUrl}'`);

	log('Got upload URL', {filename, size, folderId, mimeType, uploadUrl});
	return uploadUrl;
}
