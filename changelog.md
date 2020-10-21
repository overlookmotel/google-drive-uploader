# Changelog

## 0.1.6

* Do not stall on put error [fix]
* Do not crash on multiple stream errors [fix]

## 0.1.5

* Ensure streams always destroyed on error [fix]
* Log stream events [improve]

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

* Call `onData` even if `md5` option provided [fix]

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
