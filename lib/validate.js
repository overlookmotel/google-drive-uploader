/* --------------------
 * google-drive-uploader module
 * Utilities
 * ------------------*/

'use strict';

// Exports

module.exports = {
	validateString,
	validateObject,
	validateFunction,
	validateFunctionNoopDefault,
	validateInteger,
	validateBoolean,
	validateType
};

/*
 * Is of type
 */
function isInteger(val) {
	return Number.isInteger(val);
}

/*
 * Input validation
 */
function validateString(name, val, required) {
	return validateType(name, 'string', val, required);
}

function validateObject(name, val, required) {
	return validateType(name, 'object', val, required);
}

function validateFunction(name, val, required) {
	return validateType(name, 'function', val, required);
}

function validateFunctionNoopDefault(name, val) {
	return validateFunction(name, val) || noop;
}

function validateInteger(name, val, required) {
	val = validateType(name, 'number', val, required);
	if (val != null && !isInteger(val)) {
		throw new Error(`\`${name}\` must be an integer${required ? '' : ' if provided'}`);
	}
	return val;
}

function validateBoolean(name, val, required) {
	return validateType(name, 'boolean', val, required);
}

function validateType(name, type, val, required) {
	if (val == null) {
		if (required) throw new Error(`\`${name}\` must be a ${type}`);
		return null;
	}

	// eslint-disable-next-line valid-typeof
	if (typeof val !== type) throw new Error(`\`${name}\` must be a ${type} if provided`);
	return val;
}

function noop() {}
