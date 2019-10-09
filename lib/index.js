/* --------------------
 * google-drive-uploader module
 * Entry point
 * ------------------*/

'use strict';

// Imports
const upload = require('./upload'),
	authenticate = require('./auth'),
	{getUploadUrl} = require('./uploadUrl');

// Exports
upload.authenticate = authenticate;
upload.getUploadUrl = getUploadUrl;

module.exports = upload;
