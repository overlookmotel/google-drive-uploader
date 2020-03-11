/* --------------------
 * google-drive-uploader module
 * Utilities
 * ------------------*/

'use strict';

// Modules
const invariant = require('tiny-invariant').default;

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
	invariant(
		val == null || isInteger(val),
		`\`${name}\` must be an integer${required ? '' : ' if provided'}`
	);
	return val;
}

function validateBoolean(name, val, required) {
	return validateType(name, 'boolean', val, required);
}

function validateType(name, type, val, required) {
	if (val == null) {
		invariant(!required, `\`${name}\` must be a ${type}`);
		return null;
	}

	// eslint-disable-next-line valid-typeof
	invariant(typeof val === type, `\`${name}\` must be a ${type} if provided`);
	return val;
}

function noop() {}
