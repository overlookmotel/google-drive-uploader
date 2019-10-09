/* --------------------
 * google-drive-uploader module
 * Promisified request function
 * ------------------*/

'use strict';

// Modules
const {promisify} = require('util'),
	request = require('request');

// Exports
module.exports = promisify(request);
