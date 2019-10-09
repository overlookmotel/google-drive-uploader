/* --------------------
 * google-drive-uploader module
 * `Upload` class
 * ------------------*/

'use strict';

// Modules
const {createHash} = require('crypto'),
	googleDrive = require('googleapis').google.drive('v3'),
	{Transform} = require('readable-stream');

// Imports
const request = require('./request');

// Exports

/**
 * Upload class
 */
module.exports = class Upload {
	constructor(url, auth, streamFactory, size, md5, noMd5, chunkSize, onData, progress, log) {
		// Save details
		this.url = url;
		this.auth = auth;
		this.streamFactory = streamFactory;
		this.size = size;
		this.chunkSize = chunkSize;
		this.onData = onData;
		this.progress = progress;
		this.log = (msg, obj) => log(msg, {url, ...obj});

		// Init state
		this.position = 0;

		// Create hash object
		this.md5 = md5;
		this.bytesHashed = 0;
		this.hash = (!md5 && !noMd5) ? createHash('md5') : null;
	}

	/**
	 * Upload.
	 * @returns {Promise}
	 */
	async run() {
		// Upload file
		const {size, log} = this;
		log('Uploading file', {size});

		let fileId;
		while (true) { // eslint-disable-line no-constant-condition
			fileId = await this.uploadChunk();
			if (fileId) break;
		}

		log('Uploaded file', {fileId});

		// Check completed correctly
		let md5, mimeType;
		try {
			({md5, mimeType} = await this.checkUpload(fileId));
		} catch (err) {
			err.fileId = fileId;
			throw err;
		}

		log('Completed upload', {fileId, size, md5, mimeType});

		// Return details of file
		return {id: fileId, size, md5, mimeType};
	}

	async checkUpload(fileId) {
		const {log} = this;

		// Get MD5 of uploaded content
		let {md5} = this;
		const {hash, size} = this;
		if (hash) {
			md5 = hash.digest('hex');
			if (this.bytesHashed !== size) {
				throw new Error('Failed to hash all uploaded data');
			}
		}

		// Get hash + file size from API and check correct
		log('Getting file info from API', {fileId});

		let res;
		try {
			res = await googleDrive.files.get({
				auth: this.auth,
				fileId,
				fields: 'size,md5Checksum,mimeType'
			});
		} catch (err) {
			throw Object.assign(new Error('Failed to get file info from API'), {err});
		}

		if (res.status !== 200) {
			throw new Error(`Getting file attributes failed with status code ${res.status}`);
		}

		const file = res.data;

		log('Got file info from API', {fileId, file});

		if (file.size !== `${size}`) {
			throw new Error(`File transfer size mismatch: Expected ${size}, actual ${file.size}`);
		}

		if (!md5) {
			md5 = file.md5Checksum;
		} else if (file.md5Checksum !== md5) {
			throw new Error(`File transfer MD5 mismatch: Expected ${md5}, actual ${file.md5Checksum}`);
		}

		return {md5, mimeType: file.mimeType};
	}

	/**
	 * Upload the next chunk.
	 * @returns {Promise}
	 */
	async uploadChunk() {
		const {position: chunkStart, size} = this,
			chunkSize = Math.min(this.chunkSize, size - chunkStart);

		const {progress, log} = this;
		log('Uploading chunk', {chunkStart, chunkSize});

		// Open input stream
		const inputStream = this.streamFactory.call(null, chunkStart, chunkSize);

		// Pipe through stream to report progress and calculate MD5 of data uploaded
		const self = this,
			{hash, onData} = this;
		let position = chunkStart;
		const stream = new Transform({
			transform(buffer, encoding, cb) {
				const bufferSize = buffer.length,
					bufferEnd = position + bufferSize;

				// If calculating MD5, push data to hash
				if (hash) {
					const {bytesHashed} = self;
					if (bytesHashed === position) {
						// Whole buffer needs to be hashed
						hash.update(buffer, encoding);
						onData(buffer, encoding);
						self.bytesHashed = bufferEnd;
					} else if (bufferEnd > bytesHashed) {
						// Only part of buffer needs to be hashed
						const partBuffer = buffer.slice(bytesHashed - position);
						hash.update(partBuffer, encoding);
						onData(partBuffer, encoding);
						self.bytesHashed = bufferEnd;
					}
				}

				// Update position
				position = bufferEnd;
				progress(position, size);

				// Push data out
				this.push(buffer);
				cb();
			}
		});

		let inputStreamErrored = false;
		inputStream.on('error', (err) => {
			inputStreamErrored = true;
			stream.destroy(err);
		});
		stream.on('error', () => {
			if (!inputStreamErrored) inputStream.destroy();
		});

		inputStream.pipe(stream);

		// Upload chunk
		let streamErrored = false;
		const streamPromise = new Promise((resolve, reject) => {
			stream.on('error', (err) => {
				streamErrored = true;
				reject(err);
			});
			stream.on('end', resolve);
		});

		const inputClosePromise = new Promise(resolve => inputStream.on('close', resolve));
		const uploadPromise = this.put(stream, chunkSize, `${chunkStart}-${chunkStart + chunkSize - 1}`);

		let fileId = null,
			endedNormally = false;
		try {
			const [res] = await Promise.all([uploadPromise, streamPromise]);
			fileId = res.fileId;
			endedNormally = res.endedNormally;
		} catch (err) {
			log('Error uploading chunk', {err});
			if (!streamErrored) {
				stream.destroy();
				if (inputStream !== stream) inputStream.destroy();
			}
		}

		// If did not end normally, check where got up to
		if (!endedNormally) {
			log('Checking position');

			// TODO Implement retry

			const res = await this.put(null, 0, '*');
			if (!res.endedNormally) {
				throw new Error('Did not succeed in checking continuation point');
			}
		}

		// Update progress
		progress(this.position, size);

		// Wait for input stream to close
		await inputClosePromise;

		// Return fileId (will be null if upload not complete)
		return fileId;
	}

	/**
	 * Make PUT request to API
	 * @param {Stream|null} stream - Chunk stream to put to API
	 * @param {number} size - Size of chunk data in bytes
	 * @param {string} range - Range header e.g. `0-1023` or `*`
	 * @returns {Promise} - Always resolves, never rejects.
	 *   Resolves to object of form `{fileId, endedNormally}`.
	 *   File
	 */
	async put(stream, size, range) {
		const {log} = this;
		log('Putting to API', {size, range});

		let res;
		try {
			res = await request(this.url, {
				method: 'put',
				body: stream,
				headers: {
					'Content-Length': size,
					'Content-Range': `bytes ${range}/${this.size}`
				}
			});
		} catch (err) {
			log('Put error', {err});
			return {fileId: null, endedNormally: false};
		}

		const {statusCode, headers} = res,
			resRange = headers ? headers.range : null;
		log('Put result', {statusCode, range: resRange, headers, body: res.body});

		if ([200, 201].includes(statusCode)) {
			// Upload is complete - save fileId
			let fileId;
			try {
				const body = JSON.parse(res.body);
				fileId = body.id;
				if (!fileId) throw new Error('No file ID');
				this.position = this.size;
				log('Put complete:', {statusCode, fileId, body});
				return {fileId, endedNormally: true};
			} catch (err) {
				log('Put could not parse file ID on completion', {err});
				return {fileId: null, endedNormally: false};
			}
		}

		if (statusCode === 308) {
			// More chunks needed to complete - get where up to from Range header
			let position;
			if (!resRange) {
				position = 0;
			} else {
				try {
					position = resRange.match(/^bytes=0-(\d+)$/)[1] * 1 + 1;
				} catch (err) {
					log('Put could not parse range header', {range: resRange});
					return {fileId: null, endedNormally: false};
				}
			}

			log('Put needs resume', {position});
			this.position = position;
			return {fileId: null, endedNormally: true};
		}

		// Any other status code is abnormal
		log('Put invalid status code', {statusCode});
		return {fileId: null, endedNormally: false};
	}
};
