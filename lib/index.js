/* --------------------
 * google-drive-uploader module
 * Entry point
 * ------------------*/

'use strict';

// Imports
const upload = require('./upload'),
	authenticate = require('./auth'),
	{getUploadUrl} = require('./uploadUrl'),
	{getFinal} = require('./final');

// Exports
upload.authenticate = authenticate;
upload.getUploadUrl = getUploadUrl;
upload.getFinal = getFinal;

module.exports = upload;
