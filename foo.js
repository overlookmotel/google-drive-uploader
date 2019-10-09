/* eslint-disable no-console */

'use strict';

// Throw any unhandled promise rejections
process.on('unhandledRejection', (err) => { throw err; });

// Imports
const upload = require('./index');

// Constants

const email = 'cinebox-downloader-1@cinebox-downloader.iam.gserviceaccount.com',
	privateKey = '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDiHP3bvCvKZAwS\n949Ty4JGXpB18xTLgOsyyI/aCuB2YjWBtAKmqbHRjO2tXHoCHJdbVsQnd8RaRsr+\nfRsijBCFb4GbUsYsR8EjqversrKr5bMeCHDUjaVkJynbPLigYjEVA5MV0ikYTtEf\nQv3QKXgZMU+zQLtAX6Uh/CVdgrsKcuRUrQEVGmh9c1SdyE9E54+bmKttrRsF3MhR\n/1o7gV+d96w3VFnFIKchP6HZ61IOS+Ar8HXzXfHhBbGrwEzucPsAjo0lux4REaaZ\nTLB5ZabC3+0rssqy8t0PAdvd/BtkUsXbX+GEFCubmi9V7B9GxwsnvfodPaxd4UEf\nU2ZS/Os9AgMBAAECggEAWPrLs3LjUKv6TGR7VKBbTdHcy22zGzpKVBu08DsjhbK0\nF6x89pUE0s/AoF4p7TbPITSN0HJDJLuDGo6k5P11au0sdbEnJzm9eYnIGRsjUJ39\n1K3BqQNsuHLo98t3ZDX/1qMneIjRfy1VAhZcx1PqXQ+Yq5OnnHeHBk6xbZEKhdte\n7JCy91PA4drn5nMW23WYuZayuY8JAT5ux+DrV03rZnJSzEXItS4mFQinUGFjxAI7\n3hp0N/RbW0UJvaft26J51ucnVpGJYjGaPlfAk16QVUBdX6tO4Y9rT/TQce6llxjP\nvwxGc0PRJiBhP/psT7HCD1sa6MBG4+Blp6HcRQmbSQKBgQD/FCrY2/+VXF1C8CmE\nJog1RjrrSabhoZ0WtIEQSezzVufrJ/KB7q1ZXdIUNAA7pu899wp4c9NskGoit+j9\nCQ+U3k46TotAiN4yi0syny7ayN10exQugbKAU3nzs21WcfJrTr6AHRRmkHKMSGw1\n8WMYtFa7D18O6LqmnhNTfpCQNwKBgQDi7gtS4tuSdANKdpQy8U1skPg4kHtUVDGO\n+B+osrvNuwsizwOc2IvZVe7o5oge3fEXz3fOBsWMrxUgRF3g0yHva8ulqyo6SUxI\n4C+Zp6NVjq3klrmVnM9kV6GNc7lHUlwoC6rV171bw/fHQqsWjoaSkj4mD6UBl8fp\nOGprlQPeKwKBgEHH7KjSS140XKS3lK1M1pGOlAE7lDrZ184ULLiLp/y1K8f8HFEf\nwTqrtFKbenfnvAjp3ZxkmmCD+asMbJxcqtUEY34r5UN2SH8WZwUeAhJP/LReTT0V\nG3h2jpunaQoDBrZfr0cQuMMeezvsLWPX5WtojnldJHGO2RvA5lEA8b0PAoGAd369\n+8F1ueLZMMbMNx8VlAuqia6bIsbK6ewCT8T+W9EYhhXYYyksSx+TFJUALLDWGaGo\nBpdOQ0yWpU0a2h6Tig2LSQueyt56Cw3yQskhmxXsv6gWxY+zLbVvXpsHf2UBHh02\nsjBOiBnjScvzZ4dZmajkjQpD61jPbiHE+C2Zwc0CgYEAqs8AB/SUb5XgahEfECCq\nbCv4C1lJW8nx5QN4Kb1W8iZmLI60YnB1mEv/e+5drEPGSpbw4YyyMUl6JzoB0sD0\nVl1GKIM7K3EftLOb8vjj2rn1TU7wDbLl9oY9KuUlQ1nWfjatmAAsp74mGlPEuB9N\n6tRkfyJshOPnaS/XrsgyZ8s=\n-----END PRIVATE KEY-----\n',
	asEmail = 'transfer@cinebox.co';

// Run

(async () => {
	function log(msg, obj) {
		console.log(JSON.stringify({name: 'Upload', hostname: 'terrence.local', pid: 0, level: 30, msg, ...obj, time: new Date().toISOString(), v: 0}));
	}

	log('Authenticating');
	const auth = await upload.authenticate({email, privateKey, asEmail});

	const info = await upload({
		// path: `${__dirname}/package.json`,
		// path: '/Cinebox/test_in.mov',
		path: '/Users/jim/Downloads/granary sq photos from kieron\'s camera.zip',
		// path: '/Media/video/Cold War (1080p).mkv',
		folderId: '1eim7J5NxNXCNg-tqJ4HD92ZYTQlwD5E4',
		auth,
		chunkSize: 64 * 1024 * 1024, // 64 MiB
		/*
		progress(done, total) {
			console.log({msg: 'Progress', done, total, percent: `${Math.floor((done / total) * 100)}%`});
		},
		*/
		log
	});

	log('Info', {info});
})();
