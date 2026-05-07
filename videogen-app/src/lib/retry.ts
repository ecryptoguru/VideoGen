interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  jitterMs?: number;
  retryableStatuses?: number[];
  retryableErrors?: string[];
  onRetry?: (attempt: number, error: Error) => void;
  onMaxRetriesReached?: (error: Error) => void;
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 30000,
    backoffMultiplier = 2,
    jitterMs = 100,
    retryableStatuses = [408, 429, 500, 502, 503, 504],
    retryableErrors = ["ECONNREFUSED", "ETIMEDOUT", "ECONNRESET", "ENOTFOUND", "EAI_AGAIN"],
    onRetry,
    onMaxRetriesReached,
  } = options;

  let lastError: Error = new Error("No attempts made");
  let delay = initialDelayMs;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if error is retryable
      const isRetryable = isRetryableError(error as Error, retryableStatuses, retryableErrors);

      if (!isRetryable || attempt === maxRetries) {
        if (onMaxRetriesReached) {
          onMaxRetriesReached(lastError);
        }
        throw lastError;
      }

      // Call onRetry callback if provided
      if (onRetry) {
        onRetry(attempt + 1, lastError);
      }

      // Wait with exponential backoff and jitter
      const jitter = Math.random() * jitterMs;
      await sleep(delay + jitter);
      delay = Math.min(delay * backoffMultiplier, maxDelayMs);
    }
  }

  throw lastError;
}

function isRetryableError(error: Error, retryableStatuses: number[], retryableErrors: string[]): boolean {
  // Check for fetch Response errors with status codes
  if ("status" in error && typeof (error as { status: number }).status === "number") {
    const status = (error as { status: number }).status;
    return retryableStatuses.includes(status);
  }

  // Check for specific retryable error codes
  for (const errCode of retryableErrors) {
    if (error.message.includes(errCode) || error.name === errCode) {
      return true;
    }
  }

  // Check for network errors
  if (error.name === "TypeError" && error.message.includes("fetch")) {
    return true;
  }

  // Check for timeout errors
  if (error.name === "AbortError") {
    return true;
  }

  // Check for network-related errors
  const networkErrorPatterns = ["ECONN", "ETIMEDOUT", "ENOTFOUND", "EAI_AGAIN", "EPIPE", "ECONNRESET"];
  if (networkErrorPatterns.some(pattern => error.message.includes(pattern))) {
    return true;
  }

  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Pre-configured retry options for different scenarios
export const miniMaxRetryOptions: RetryOptions = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitterMs: 200,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
  retryableErrors: ["ECONNREFUSED", "ETIMEDOUT", "ECONNRESET", "ENOTFOUND", "EAI_AGAIN"],
  onRetry: (attempt, error) => {
    console.warn(`MiniMax API retry attempt ${attempt}:`, error.message);
  },
  onMaxRetriesReached: (error) => {
    console.error(`MiniMax API max retries reached:`, error.message);
  },
};

export const quickRetryOptions: RetryOptions = {
  maxRetries: 2,
  initialDelayMs: 500,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};
