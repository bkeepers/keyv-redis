'use strict';

const EventEmitter = require('events');
const redis = require('redis');
const pify = require('pify');

class KeyvRedis extends EventEmitter {
	constructor(uri, opts) {
		super();
		this.ttlSupport = true;
		opts = Object.assign(
			{},
			(typeof uri === 'string') ? { uri } : uri,
			opts
		);
		if (opts.uri && typeof opts.url === 'undefined') {
			opts.url = opts.uri;
		}

		const client = redis.createClient(opts);

		this.redis = ['get', 'set', 'del', 'keys'].reduce((obj, method) => {
			obj[method] = pify(client[method].bind(client));
			return obj;
		}, {});

		client.on('error', err => this.emit('error', err));
	}

	get(key) {
		return this.redis.get(key)
			.then(value => {
				if (value === null) {
					return undefined;
				}
				return value;
			});
	}

	set(key, value, ttl) {
		if (typeof value === 'undefined') {
			return Promise.resolve(undefined);
		}
		return Promise.resolve()
			.then(() => {
				if (typeof ttl === 'number') {
					return this.redis.set(key, value, 'PX', ttl);
				}
				return this.redis.set(key, value);
			});
	}

	delete(key) {
		return this.redis.del(key).then(items => items > 0);
	}

	clear() {
		return this.redis.keys(`${this.namespace}:*`)
			.then(keys => {
				if (keys.length > 0) {
					this.redis.del(keys);
				}
			})
			.then(() => undefined);
	}
}

module.exports = KeyvRedis;
