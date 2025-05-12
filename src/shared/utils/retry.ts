const retry = async <T>(fn: () => Promise<T>, options: { retries: number; delay: number }) => {
  try {
    return await fn();
  } catch (err) {
    if (options.retries <= 0) throw err;
    await new Promise(res => setTimeout(res, options.delay));
    return retry(fn, { ...options, retries: options.retries - 1 });
  }
};

export retry;
