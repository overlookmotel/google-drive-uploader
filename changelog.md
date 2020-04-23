# Changelog

## 0.2.3

Docs:

* Fix wrong package name

## 0.2.2

Docs:

* Correct requirements for `auth` option [fix]

## 0.2.1

Bug fixes:

* Error if `uploadUrl` and `auth` options both not provided

Docs:

* Document `uploadUrl` option

## 0.2.0

Breaking changes:

* Drop support for Node v8

Features:

* `getUploadUrl` method `origin` option
* `getFinal` function and option

Refactor:

* Replace `request` with `axios`
* Replace `throw` statements with `invariant`
* Function validation method

Dependencies:

* Update dependencies

Dev:

* Update dev dependencies

No code:

* Add missing param to JSDoc comment

Docs:

* Versioning policy
* Fix typo in Changelog

## 0.1.4

Tests:

* Simplify unhandled rejection handling

Dev:

* Update dev dependencies
* Remove `sudo` from Travis CI config
* ESLint ignore coverage dir
* Run tests on CI on Node v13

Docs:

* Update license year

## 0.1.3

Bug fixes:

* Call `onData` even if `md5` option provided

## 0.1.2

Bug fixes:

* Accept auth objects created by older Google API library

## 0.1.1

Features:

* Add `fileId` prop to error if failure after uploaded

Bug fixes:

* Handle if no data yet uploaded when checking progress

Docs:

* Fix README typo

## 0.1.0

* Initial release
