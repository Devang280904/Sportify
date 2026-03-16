const Redis = require('ioredis');

let redis = null;

const connectRedis = () => {
  try {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) {
          console.log('Redis: Max retries reached, running without cache');
          return null;
        }
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });

    redis.on('connect', () => console.log('Redis Connected'));
    redis.on('error', (err) => {
      console.log('Redis unavailable, running without cache');
      redis = null;
    });

    redis.connect().catch(() => {
      console.log('Redis unavailable, running without cache');
      redis = null;
    });
  } catch (error) {
    console.log('Redis unavailable, running without cache');
    redis = null;
  }
};

const getRedis = () => redis;

const getCache = async (key) => {
  try {
    if (!redis) return null;
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

const setCache = async (key, value, ttl = 300) => {
  try {
    if (!redis) return;
    await redis.set(key, JSON.stringify(value), 'EX', ttl);
  } catch {
    // silently fail
  }
};

const delCache = async (key) => {
  try {
    if (!redis) return;
    await redis.del(key);
  } catch {
    // silently fail
  }
};

module.exports = { connectRedis, getRedis, getCache, setCache, delCache };
