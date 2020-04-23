[![NPM version](https://img.shields.io/npm/v/google-drive-uploader.svg)](https://www.npmjs.com/package/google-drive-uploader)
[![Build Status](https://img.shields.io/travis/overlookmotel/google-drive-uploader/master.svg)](http://travis-ci.org/overlookmotel/google-drive-uploader)
[![Dependency Status](https://img.shields.io/david/overlookmotel/google-drive-uploader.svg)](https://david-dm.org/overlookmotel/google-drive-uploader)
[![Dev dependency Status](https://img.shields.io/david/dev/overlookmotel/google-drive-uploader.svg)](https://david-dm.org/overlookmotel/google-drive-uploader)
[![Greenkeeper badge](https://badges.greenkeeper.io/overlookmotel/google-drive-uploader.svg)](https://greenkeeper.io/)
[![Coverage Status](https://img.shields.io/coveralls/overlookmotel/google-drive-uploader/master.svg)](https://coveralls.io/r/overlookmotel/google-drive-uploader)

# Upload large files to Google Drive

## What's it for

When uploading large files (GB+) to Google Drive, it's best to use their chunked upload method (aka "[resumable](https://developers.google.com/drive/api/v3/manage-uploads#resumable)").

This package handles uploading a file to Google Drive in chunks, and automatically resumes upload if the connection is interrupted.

## Installation

```
npm install google-drive-uploader
```

## Usage

### Uploading a file from disc

```js
const upload = require('google-drive-uploader');

const {id, size, md5, mimeType} = await upload({
  path: '/path/to/file.mov',
  folderId: '...Google Drive folder ID...',
  auth: /* Google Drive auth object */
});
```

`folderId` option is optional.

`upload()` returns a promise which resolves to an object of form `{id, size, md5, mimeType}`.

* `id` is Google Drive's ID for the file
* `size` is size of the file uploaded in bytes
* `md5` is MD5 hash of the uploaded file, as reported by Google Drive
* `mimeType` is MIME Type file is stored with on Google Drive

### Uploading from another data source

Files are uploaded in chunks. If a chunk fails to transfer, it will be sent again.

For this reason, it's not possible to stream into the uploader, as the stream may need to be "rewound" if sending of a chunk fails and it needs to be sent again. Instead you need to provide a stream factory function which provides a stream of a certain section of the file.

```js
const fs = require('fs');

const {id, size, md5, mimeType} = await upload({
  streamFactory(start, len) {
    return fs.createReadStream(
	  '/path/to/file.mov',
	  {start, end: start + len - 1}
    );
  },
  filename: 'file.mov',
  size: 2000000000,
  folderId: '...Google Drive folder ID...',
  auth: /* Google Drive auth object */
});
```

`filename` and `size` options are required.

If a stream is no longer required, its `.destroy()` method will be called.

### Authentication

Before you can upload, you must authenticate with Google APIs.

For convenience, this package provides a simple authentication method:

```js
const auth = await upload.authenticate({
  email: 'me@gmail.com',
  privateKey: '...private key...'
});

// Now use `auth` in calls to `upload()`
```

You can also use Google's own libraries. e.g.:

```js
const {JWT} = require('google-auth-library');

const auth = new JWT(
  'me@gmail.com',
  null,
  '...private key...',
  ['https://www.googleapis.com/auth/drive']
);

await auth.authorize();
```

### Options

#### `path`

Path of file to upload (see example above).

#### `streamFactory`

Function to produce streams of content to be uploaded (see example above).

Either `path` or `streamFactory` must be provided.

#### `uploadUrl`

If you've already created a Google Drive upload URL, you can provide it with this option.

Optional. If no upload URL provided, `upload()` will create one automatically.

#### `auth`

Authorization object (see example above). Required unless `uploadUrl` provided and `getFinal` option is used.

#### `chunkSize`

Set size of chunks data should be uploaded in, in bytes. Optional.

Must be a multiple of 256 KiB.

Default is 256 KiB (Google Drive's minimum). Usually a larger chunk size will result in a faster upload.

#### `md5`

Optional.

Google Drive calculates the MD5 hash of the data uploaded. This package calculates the MD5 as it's uploading, and verifies the hashes calculated locally and by Google Drive match, to ensure upload has completed successfully.

If you already know the MD5 of the file, you can provide it with the `md5` option to avoid the computational overhead of recalculating it.

`md5` should be provided as a hex-encoded string.

#### `noMd5`

Optional. Set to `true` to skip computation and checking of the MD5 hash of uploaded file.

#### `filename`

When calling `upload()` with `path` option, filename of the file in Google Drive defaults to the local filename. `filename` option can be used to override this.

`filename` must be provided when using `streamFactory` as there is no `path` to deduce the filename from.

#### `size`

Required when calling `upload()` with `streamFactory` option. The size of the data to be uploaded in bytes.

When calling `upload()` with `path` option, by default `size` is deterined by stat-ing the file. If the file size is already known, you can provide it with `size` option to skip the stat call.

#### `folderId`

Google Drive ID for folder to put file in. Optional.

#### `mimeType`

MIME Type of file. Optional. If not provided, Google Drive will choose based on file content/file name.

#### `getFinal`

By default, `upload()` will check the size and MD5 hash of final file against Google Drive's API after transfer, to ensure no corruption in transfer.

You can disable this check with `getFinal: false`.

You can alternatively provide your own function to get the final file details. The function will be called with arguments `(id, auth, log)` and must return an object of form `{size, md5, mimeType}` (`mimeType` is optional).

#### `progress`

Callback for progress reporting. Optional.

Will be called with `(done, total)`. `done` is number of bytes transferred, `total` is length of file in bytes.

#### `log`

Logging function. Optional. Will be called with args `(message, properties)`.

#### `onData`

Callback function which will be called every time data is pushed to the Google Drive API. Optional.

Called with arguments `(data, encoding)`.

This can be used, for example, to hash the data as it's uploaded, to ensure it matches known hash value.

If a chunk fails to transfer and has to be sent again, `onData` will not be called again with this data.

### Individual stages

Uploading happens in 3 stages:

1. Get an upload URL from Google Drive API
2. Upload file to the upload URL
3. Check file is transferred correctly

`upload()` by default performs all 3 steps together.

If you prefer, you can do the 3 steps separately.

```js
// Get upload URL
const size = 2048;
const uploadUrl = await upload.getUploadUrl({
  filename: 'file.mov',
  size,
  folderId: '...Google Drive folder ID...',
  auth: /* Google Drive auth object */
});

// Upload file
const {id, md5} = await upload({
  uploadUrl,
  path: '/path/to/file.mov',
  getFinal: false
  // `auth` prop not required when `getFinal` is false
});

// Check hash
const {size: gDriveSize, md5: gDriveMd5} = await upload.getFinal({
 id,
 auth: /* Google Drive auth object */
});

if (gDriveSize === size && gDriveMd5 === md5) {
  console.log('Success!');
} else {
  throw new Error('Transfer failed');
}
```

The main purpose is to allow the 3 steps to be done on different servers. In particular, only stages 1 + 3 require authorization, so it's possible to do these steps on a secure server, and the upload itself on a client, without giving the client access to API keys.

## Versioning

This module follows [semver](https://semver.org/). Breaking changes will only be made in major version updates.

All active NodeJS release lines are supported (v10+ at time of writing). After a release line of NodeJS reaches end of life according to [Node's LTS schedule](https://nodejs.org/en/about/releases/), support for that version of Node may be dropped at any time, and this will not be considered a breaking change. Dropping support for a Node version will be made in a minor version update (e.g. 1.2.0 to 1.3.0). If you are using a Node version which is approaching end of life, pin your dependency of this module to patch updates only using tilde (`~`) e.g. `~1.2.3` to avoid breakages.

## Tests

Use `npm test` to run the tests. Use `npm run cover` to check coverage.

## Changelog

See [changelog.md](https://github.com/overlookmotel/google-drive-uploader/blob/master/changelog.md)

## Issues

If you discover a bug, please raise an issue on Github. https://github.com/overlookmotel/google-drive-uploader/issues

## Contribution

Pull requests are very welcome. Please:

* ensure all tests pass before submitting PR
* add tests for new features
* document new functionality/API additions in README
* do not add an entry to Changelog (Changelog is created when cutting releases)
