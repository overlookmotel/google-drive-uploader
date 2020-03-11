/* --------------------
 * google-drive-uploader module
 * `getUploadUrl` function
 * ------------------*/

'use strict';

// Modules
const axios = require('axios'),
	invariant = require('tiny-invariant').default;

// Imports
const {
	validateString, validateObject, validateInteger, validateFunctionNoopDefault
} = require('./validate');

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
	log = validateFunctionNoopDefault('log', log);

	return _getUploadUrl(auth, filename, size, folderId, mimeType, origin, log);
}

async function _getUploadUrl(auth, filename, size, folderId, mimeType, origin, log) {
	log('Getting upload URL', {filename, size, folderId, mimeType, origin});

	const token = (auth.gtoken.rawToken || auth.gtoken.raw_token).access_token;

	const params = {
		method: 'post',
		url: GET_UPLOAD_API_URL,
		data: {
			name: filename
		},
		headers: {
			Authorization: `Bearer ${token}`,
			'X-Upload-Content-Length': size
		},
		validateStatus
	};
	if (folderId) params.data.parents = [folderId];
	if (mimeType) params.headers['X-Upload-Content-Type'] = mimeType;
	if (origin) params.headers.Origin = origin;

	const res = await axios(params);

	const uploadUrl = res.headers.location;
	invariant(uploadUrl, 'No upload URL returned');
	invariant(uploadUrl.match(UPLOAD_URL_REGEX), `Received invalid upload URL '${uploadUrl}'`);

	log('Got upload URL', {filename, size, folderId, mimeType, uploadUrl});
	return uploadUrl;
}

function validateStatus(statusCode) {
	return statusCode === 200;
}
