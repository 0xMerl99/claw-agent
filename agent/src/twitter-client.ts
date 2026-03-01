// ============================================================
// TWITTER CLIENT — X API v2 Wrapper
// ============================================================
// Handles all X/Twitter API interactions with rate limiting,
// retry logic, and queue management.
// ============================================================

export interface TwitterConfig {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
  bearerToken: string;
}

interface RateLimitState {
  remaining: number;
  resetAt: number;
  limit: number;
}

export class TwitterClient {
  private config: TwitterConfig;
  private baseUrl = 'https://api.twitter.com/2';
  private rateLimits: Map<string, RateLimitState> = new Map();
  private queue: QueuedRequest[] = [];
  private processing = false;

  constructor(config: TwitterConfig) {
    this.config = config;
  }

  // ── POSTING ────────────────────────────────────────────────
  async post(text: string, mediaIds?: string[]): Promise<TweetResponse> {
    // Enforce character limit
    const content = this.truncateToLimit(text);

    const body: any = { text: content };
    if (mediaIds?.length) {
      body.media = { media_ids: mediaIds };
    }

    return this.request('POST', '/tweets', body);
  }

  async reply(tweetId: string, text: string): Promise<TweetResponse> {
    const content = this.truncateToLimit(text);

    return this.request('POST', '/tweets', {
      text: content,
      reply: { in_reply_to_tweet_id: tweetId },
    });
  }

  async quote(tweetId: string, text: string): Promise<TweetResponse> {
    const content = this.truncateToLimit(text);

    return this.request('POST', '/tweets', {
      text: content,
      quote_tweet_id: tweetId,
    });
  }

  async like(tweetId: string): Promise<void> {
    const userId = await this.getAuthenticatedUserId();
    await this.request('POST', `/users/${userId}/likes`, {
      tweet_id: tweetId,
    });
  }

  async retweet(tweetId: string): Promise<void> {
    const userId = await this.getAuthenticatedUserId();
    await this.request('POST', `/users/${userId}/retweets`, {
      tweet_id: tweetId,
    });
  }

  // ── READING ────────────────────────────────────────────────
  async getHomeTimeline(maxResults = 20): Promise<any[]> {
    const userId = await this.getAuthenticatedUserId();
    const response = await this.request(
      'GET',
      `/users/${userId}/timelines/reverse_chronological`,
      null,
      {
        max_results: maxResults,
        'tweet.fields': 'public_metrics,created_at,author_id',
        expansions: 'author_id',
        'user.fields': 'public_metrics,username',
      }
    );

    return this.transformTweets(response);
  }

  async getMentions(maxResults = 10): Promise<any[]> {
    const userId = await this.getAuthenticatedUserId();
    const response = await this.request(
      'GET',
      `/users/${userId}/mentions`,
      null,
      {
        max_results: maxResults,
        'tweet.fields': 'public_metrics,created_at,author_id,in_reply_to_user_id',
        expansions: 'author_id',
        'user.fields': 'public_metrics,username',
      }
    );

    return this.transformTweets(response);
  }

  async getTrending(): Promise<string[]> {
    // X API v2 doesn't have a direct trending endpoint for free tier
    // Use search for high-volume crypto topics instead
    const queries = ['solana', 'crypto', 'memecoin', 'defi'];
    const trending: string[] = [];

    for (const q of queries) {
      try {
        const response = await this.request(
          'GET',
          '/tweets/search/recent',
          null,
          { query: q, max_results: 10, 'tweet.fields': 'public_metrics' }
        );
        if (response?.data) {
          trending.push(q);
        }
      } catch {
        // Skip on rate limit
      }
    }

    return trending;
  }

  async searchTweets(query: string, maxResults = 10): Promise<any[]> {
    const response = await this.request(
      'GET',
      '/tweets/search/recent',
      null,
      {
        query,
        max_results: maxResults,
        'tweet.fields': 'public_metrics,created_at,author_id',
        expansions: 'author_id',
        'user.fields': 'public_metrics,username',
      }
    );

    return this.transformTweets(response);
  }

  // ── MEDIA UPLOAD ───────────────────────────────────────────
  async uploadMedia(buffer: Buffer, mimeType: string): Promise<string> {
    // Media upload uses v1.1 endpoint
    const uploadUrl = 'https://upload.twitter.com/1.1/media/upload.json';

    // For simplicity, using INIT/APPEND/FINALIZE for chunked upload
    // INIT
    const initResponse = await this.requestV1(uploadUrl, 'POST', {
      command: 'INIT',
      total_bytes: buffer.length,
      media_type: mimeType,
    });

    const mediaId = initResponse.media_id_string;

    // APPEND
    const chunkSize = 5 * 1024 * 1024; // 5MB chunks
    for (let i = 0; i < buffer.length; i += chunkSize) {
      const chunk = buffer.slice(i, i + chunkSize);
      await this.requestV1(uploadUrl, 'POST', {
        command: 'APPEND',
        media_id: mediaId,
        media_data: chunk.toString('base64'),
        segment_index: Math.floor(i / chunkSize),
      });
    }

    // FINALIZE
    await this.requestV1(uploadUrl, 'POST', {
      command: 'FINALIZE',
      media_id: mediaId,
    });

    return mediaId;
  }

  // ── ANALYTICS ──────────────────────────────────────────────
  async getTweetMetrics(tweetId: string): Promise<any> {
    return this.request('GET', `/tweets/${tweetId}`, null, {
      'tweet.fields': 'public_metrics,non_public_metrics,organic_metrics',
    });
  }

  // ── INTERNAL: REQUEST HANDLING ─────────────────────────────
  private async request(
    method: string,
    endpoint: string,
    body?: any,
    params?: Record<string, any>
  ): Promise<any> {
    // Rate limit check
    await this.checkRateLimit(endpoint);

    let url = `${this.baseUrl}${endpoint}`;
    if (params) {
      const qs = new URLSearchParams(
        Object.entries(params).map(([k, v]) => [k, String(v)])
      ).toString();
      url += `?${qs}`;
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.config.bearerToken}`,
      'Content-Type': 'application/json',
    };

    // For write operations, use OAuth 1.0a
    if (method === 'POST' || method === 'DELETE') {
      headers.Authorization = this.generateOAuth1Header(method, url);
    }

    const options: RequestInit = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(url, options);

    // Update rate limit state
    this.updateRateLimit(endpoint, response.headers);

    if (!response.ok) {
      const rawBody = await response.text().catch(() => '');
      let error: any = {};
      try {
        error = rawBody ? JSON.parse(rawBody) : {};
      } catch {
        error = { raw: rawBody };
      }

      console.error(`❌ [Twitter ${method} ${endpoint}] ${response.status}`, error);
      if (response.status === 429) {
        // Rate limited — queue and retry
        const resetAt = parseInt(response.headers.get('x-rate-limit-reset') || '0') * 1000;
        const waitMs = resetAt - Date.now() + 1000;
        console.log(`⏳ [Twitter] Rate limited on ${endpoint}. Waiting ${waitMs / 1000}s`);
        await this.sleep(waitMs);
        return this.request(method, endpoint, body, params);
      }
      throw new TwitterApiError(response.status, error);
    }

    return response.json();
  }

  private async requestV1(url: string, method: string, body: any): Promise<any> {
    const headers = {
      Authorization: this.generateOAuth1Header(method, url),
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    const response = await fetch(url, {
      method,
      headers,
      body: new URLSearchParams(body).toString(),
    });

    if (!response.ok) {
      const rawBody = await response.text().catch(() => '');
      let error: any = {};
      try {
        error = rawBody ? JSON.parse(rawBody) : {};
      } catch {
        error = { raw: rawBody };
      }
      console.error(`❌ [Twitter V1 ${method}] ${response.status}`, error);
      throw new TwitterApiError(response.status, error);
    }
    return response.json();
  }

  // ── RATE LIMITING ──────────────────────────────────────────
  private async checkRateLimit(endpoint: string): Promise<void> {
    const limit = this.rateLimits.get(endpoint);
    if (limit && limit.remaining <= 1 && Date.now() < limit.resetAt) {
      const waitMs = limit.resetAt - Date.now() + 500;
      console.log(`⏳ [Twitter] Preemptive rate limit wait: ${waitMs / 1000}s for ${endpoint}`);
      await this.sleep(waitMs);
    }
  }

  private updateRateLimit(endpoint: string, headers: Headers): void {
    const remaining = parseInt(headers.get('x-rate-limit-remaining') || '-1');
    const reset = parseInt(headers.get('x-rate-limit-reset') || '0');
    const limit = parseInt(headers.get('x-rate-limit-limit') || '0');

    if (remaining >= 0) {
      this.rateLimits.set(endpoint, {
        remaining,
        resetAt: reset * 1000,
        limit,
      });
    }
  }

  // ── HELPERS ────────────────────────────────────────────────
  private truncateToLimit(text: string, limit = 280): string {
    if (text.length <= limit) return text;
    return text.slice(0, limit - 3) + '...';
  }

  private transformTweets(response: any): any[] {
    if (!response?.data) return [];

    const users = new Map(
      (response.includes?.users || []).map((u: any) => [u.id, u])
    );

    return response.data.map((tweet: any) => {
      const author = users.get(tweet.author_id) || {};
      return {
        id: tweet.id,
        text: tweet.text,
        author: {
          id: tweet.author_id,
          handle: author.username || 'unknown',
          followers: author.public_metrics?.followers_count || 0,
        },
        metrics: {
          likes: tweet.public_metrics?.like_count || 0,
          retweets: tweet.public_metrics?.retweet_count || 0,
          replies: tweet.public_metrics?.reply_count || 0,
        },
        createdAt: tweet.created_at,
      };
    });
  }

  private cachedUserId: string | null = null;
  private async getAuthenticatedUserId(): Promise<string> {
    if (this.cachedUserId) return this.cachedUserId;
    const response = await this.request('GET', '/users/me');
    this.cachedUserId = response.data.id;
    return this.cachedUserId!;
  }

  private generateOAuth1Header(method: string, url: string): string {
    // In production, use a proper OAuth 1.0a library like 'oauth-1.0a'
    // This is a placeholder showing the structure
    // npm install oauth-1.0a
    const OAuth = require('oauth-1.0a');
    const crypto = require('crypto');

    const oauth = OAuth({
      consumer: { key: this.config.apiKey, secret: this.config.apiSecret },
      signature_method: 'HMAC-SHA1',
      hash_function(baseString: string, key: string) {
        return crypto.createHmac('sha1', key).update(baseString).digest('base64');
      },
    });

    const token = {
      key: this.config.accessToken,
      secret: this.config.accessTokenSecret,
    };

    const authHeader = oauth.toHeader(
      oauth.authorize({ url, method }, token)
    );

    return authHeader.Authorization;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

class TwitterApiError extends Error {
  status: number;
  body: any;

  constructor(status: number, body: any) {
    super(`Twitter API Error ${status}: ${JSON.stringify(body)}`);
    this.status = status;
    this.body = body;
  }
}
