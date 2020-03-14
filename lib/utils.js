/* --------------------
 * google-drive-uploader module
 * Utility functions
 * ------------------*/

'use strict';

// Exports

module.exports = {
	isObject,
	isString,
	isFullString,
	isInteger,
	isPositiveInteger,
	isPositiveIntegerString,
	isType
};

/*
 * Is of type
 */
function isObject(val) {
	return val !== null && isType('object', val);
}

function isString(val) {
	return isType('string', val);
}

function isFullString(val) {
	return isString(val) && val !== '';
}

function isInteger(val) {
	return Number.isInteger(val);
}

function isPositiveInteger(val) {
	return isInteger(val) && val >= 0;
}

const INTEGER_STRING_REGEX = /^\d+$/;
function isPositiveIntegerString(val) {
	return isString(val) && INTEGER_STRING_REGEX.test(val);
}

function isType(type, val) {
	return typeof val === type; // eslint-disable-line valid-typeof
}
