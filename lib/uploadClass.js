/* --------------------
 * google-drive-uploader module
 * `Upload` class
 * ------------------*/

'use strict';

// Modules
const axios = require('axios'),
	{createHash} = require('crypto'),
	{Transform} = require('readable-stream'),
	invariant = require('tiny-invariant').default;

// Exports

/**
 * Upload class
 */
module.exports = class Upload {
	constructor(url, auth, streamFactory, size, md5, noMd5, chunkSize, getFinal, onData, progress, log) {
		// Save details
		this.url = url;
		this.auth = auth;
		this.streamFactory = streamFactory;
		this.size = size;
		this.chunkSize = chunkSize;
		this.getFinal = getFinal;
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
		// Get MD5 of uploaded content
		const {hash, size} = this;
		let md5 = hash ? hash.digest('hex') : this.md5;

		invariant(
			(!hash && !this.onData) || this.bytesHashed === size,
			'Failed to hash all uploaded data'
		);

		// Get hash + file size from API and check correct
		const {getFinal} = this;
		if (!getFinal) return {md5};

		const file = await getFinal(fileId, this.auth, this.log);

		invariant(
			file.size === size, `File transfer size mismatch: Expected ${size}, actual ${file.size}`
		);

		if (!md5) {
			md5 = file.md5;
		} else {
			invariant(
				file.md5 === md5,
				`File transfer MD5 mismatch: Expected ${md5}, actual ${file.md5}`
			);
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
				if (hash || onData) {
					const {bytesHashed} = self;
					if (bytesHashed === position) {
						// Whole buffer needs to be hashed
						if (hash) hash.update(buffer, encoding);
						if (onData) onData(buffer, encoding);
						self.bytesHashed = bufferEnd;
					} else if (bufferEnd > bytesHashed) {
						// Only part of buffer needs to be hashed
						const partBuffer = buffer.slice(bytesHashed - position);
						if (hash) hash.update(partBuffer, encoding);
						if (onData) onData(partBuffer, encoding);
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
			invariant(res.endedNormally, 'Did not succeed in checking continuation point');
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
			res = await axios({
				method: 'put',
				url: this.url,
				data: stream,
				headers: {
					'Content-Length': size,
					'Content-Range': `bytes ${range}/${this.size}`
				},
				maxRedirects: 0, // To prevent "Request body larger than maxBodyLength limit" error
				validateStatus
			});
		} catch (err) {
			log('Put error', {err});
			return {fileId: null, endedNormally: false};
		}

		const {status: statusCode, headers, data} = res,
			resRange = headers ? headers.range : null;
		log('Put result', {statusCode, range: resRange, headers, data});

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

		// Upload is complete - save fileId
		let fileId;
		try {
			fileId = data.id;
			invariant(fileId, 'No file ID');
			this.position = this.size;
			log('Put complete:', {statusCode, fileId, data});
			return {fileId, endedNormally: true};
		} catch (err) {
			log('Put could not parse file ID on completion', {err});
			return {fileId: null, endedNormally: false};
		}
	}
};

const VALID_STATUS_CODES = [200, 201, 308];
function validateStatus(statusCode) {
	return VALID_STATUS_CODES.includes(statusCode);
}
