import Redis, { RedisOptions } from 'ioredis';
import { config } from './env.js';

export const redisOptions: RedisOptions = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 3000);
    return delay;
  },
};

// Primary Redis client for application counters & general usage
export const redisClient = new Redis(redisOptions);

redisClient.on('connect', () => {
  console.log('✅ Connected to Redis at', `${config.redis.host}:${config.redis.port}`);
});

redisClient.on('error', (err) => {
  console.error('❌ Redis error:', err.message);
});
