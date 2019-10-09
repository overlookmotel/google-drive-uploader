/* --------------------
 * google-drive-uploader module
 * `authenticate` function
 * ------------------*/

'use strict';

// Modules
const {JWT} = require('googleapis').google.auth;

// Imports
const {validateString} = require('./validate');

// Exports
module.exports = async function authenticate({email, privateKey, asEmail}) {
	// Validate input
	validateString('email', email, true);
	validateString('privateKey', privateKey, true);
	asEmail = validateString('asEmail', asEmail);

	// Authenticate with Google API
	const client = new JWT(
		email,
		null,
		privateKey,
		['https://www.googleapis.com/auth/drive'], // Scopes
		asEmail
	);

	await client.authorize();

	// Return auth object
	return client;
};
