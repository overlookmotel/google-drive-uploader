/* --------------------
 * google-drive-uploader module
 * Tests
 * ------------------*/

'use strict';

// Modules
const googleDriveUpload = require('../index');

// Init
require('./support');

// Tests

describe('tests', () => {
	it.skip('all', () => { // eslint-disable-line jest/no-disabled-tests
		expect(googleDriveUpload).not.toBeUndefined();
	});
});
