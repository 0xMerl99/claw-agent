// ============================================================
// IMAGE GENERATOR — AI-Powered Auto Image Generation
// ============================================================
// Generates images for posts using AI APIs.
// Supports: DALL-E 3, Stability AI, Replicate FLUX
//
// The agent auto-generates images when:
// 1. MoltBot determines image posts outperform text-only
// 2. On-chain events warrant visual callouts
// 3. Meme strategy is selected (generates meme images)
// 4. Manual compose includes image generation request
// ============================================================

export interface GeneratedImage {
  url: string;
  localPath?: string;
  prompt: string;
  style: ImageStyle;
  width: number;
  height: number;
  provider: string;
}

export type ImageStyle =
  | 'meme'          // Meme format with bold text overlays
  | 'alpha-card'    // Clean data card with token stats
  | 'chart'         // Price chart screenshot style
  | 'announcement'  // Professional announcement graphic
  | 'degen-art'     // Absurdist crypto art
  | 'infographic'   // Data visualization
  | 'custom';       // Custom prompt

interface ProviderConfig {
  type: 'openai' | 'stability' | 'replicate';
  apiKey: string;
  model?: string;
}

export interface ImageProviderOverride {
  provider: 'openai' | 'stability' | 'replicate';
  apiKey: string;
}

export class ImageGenerator {
  private provider: ProviderConfig;
  private generationCount = 0;
  private cache: Map<string, GeneratedImage> = new Map();

  constructor() {
    this.provider = { type: 'openai', apiKey: '' };
  }

  // ── MAIN GENERATE ──────────────────────────────────────────
  async generate(prompt: string, style: ImageStyle = 'custom', override?: ImageProviderOverride): Promise<GeneratedImage> {
    // Build enhanced prompt based on style
    const enhancedPrompt = this.buildPrompt(prompt, style);

    const provider: ProviderConfig = override
      ? {
        type: override.provider,
        apiKey: override.apiKey,
        model: override.provider === 'openai'
          ? 'dall-e-3'
          : (override.provider === 'replicate' ? 'black-forest-labs/flux-1.1-pro' : undefined),
      }
      : this.provider;

    if (!provider.apiKey) {
      throw new Error('No user image API key configured for this account');
    }

    // Check cache (provider-aware)
    const cacheKey = `${provider.type}:${style}:${prompt.slice(0, 50)}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey)!;

    let result: GeneratedImage;

    switch (provider.type) {
      case 'openai':
        result = await this.generateOpenAI(enhancedPrompt, style, provider);
        break;
      case 'stability':
        result = await this.generateStability(enhancedPrompt, style, provider);
        break;
      case 'replicate':
        result = await this.generateReplicate(enhancedPrompt, style, provider);
        break;
      default:
        throw new Error('No image provider configured');
    }

    this.cache.set(cacheKey, result);
    this.generationCount++;
    return result;
  }

  // ── AUTO-GENERATE FOR AGENT ────────────────────────────────
  // Called by ClawdBot when it decides a post needs an image
  async autoGenerate(context: {
    postContent: string;
    strategy: string;
    tokenData?: any;
    onChainEvent?: any;
  }): Promise<GeneratedImage | null> {
    try {
      let style: ImageStyle;
      let prompt: string;

      switch (context.strategy) {
        case 'meme-post':
          style = 'meme';
          prompt = `crypto meme about: ${context.postContent.slice(0, 100)}`;
          break;

        case 'market-alpha':
          style = 'alpha-card';
          const token = context.tokenData;
          prompt = token
            ? `crypto alpha card: ${token.symbol} price $${token.price} change ${token.change24h}%`
            : `market analysis card: ${context.postContent.slice(0, 80)}`;
          break;

        case 'on-chain-callout':
          style = 'announcement';
          prompt = `blockchain alert graphic: ${context.onChainEvent?.summary || context.postContent.slice(0, 80)}`;
          break;

        case 'shill':
          style = 'announcement';
          prompt = `crypto token spotlight: ${context.postContent.slice(0, 80)}`;
          break;

        default:
          // 30% chance to add image to any post
          if (Math.random() > 0.3) return null;
          style = 'degen-art';
          prompt = `abstract crypto art: ${context.postContent.slice(0, 60)}`;
      }

      return await this.generate(prompt, style);
    } catch (error) {
      console.error('🖼️ [ImageGen] Auto-generate failed:', error);
      return null;
    }
  }

  // ── PROMPT BUILDING ────────────────────────────────────────
  private buildPrompt(basePrompt: string, style: ImageStyle): string {
    const styleModifiers: Record<ImageStyle, string> = {
      'meme': 'Create a bold, viral crypto meme image. Use large impact font text, vibrant colors, humorous tone. Style: internet meme format.',
      'alpha-card': 'Create a sleek, dark-themed data card with neon accents. Professional crypto trading aesthetic. Clean typography, gradient background.',
      'chart': 'Create a realistic-looking price chart with candlesticks, green and red candles, dark background, trading interface aesthetic.',
      'announcement': 'Create a professional crypto announcement graphic. Bold typography, dark gradient background, neon accent colors, modern design.',
      'degen-art': 'Create abstract digital art with crypto/blockchain themes. Glitch effects, neon colors, cyberpunk aesthetic, surreal elements.',
      'infographic': 'Create a clean data infographic with charts and stats. Dark theme, neon accents, modern minimalist style.',
      'custom': '',
    };

    const modifier = styleModifiers[style];
    return modifier ? `${modifier}\n\nContent: ${basePrompt}` : basePrompt;
  }

  // ── PROVIDER: OPENAI (DALL-E 3) ───────────────────────────
  private async generateOpenAI(prompt: string, style: ImageStyle, provider: ProviderConfig): Promise<GeneratedImage> {
    const size = style === 'meme' || style === 'chart' ? '1024x1024' : '1792x1024';

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size,
        quality: 'standard',
      }),
    });

    if (!response.ok) throw new Error(`OpenAI error: ${response.status}`);
    const data = await response.json();

    return {
      url: data.data[0].url,
      prompt,
      style,
      width: parseInt(size.split('x')[0]),
      height: parseInt(size.split('x')[1]),
      provider: 'openai',
    };
  }

  // ── PROVIDER: STABILITY AI ─────────────────────────────────
  private async generateStability(prompt: string, style: ImageStyle, provider: ProviderConfig): Promise<GeneratedImage> {
    const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        text_prompts: [{ text: prompt, weight: 1 }],
        cfg_scale: 7,
        width: 1024,
        height: 1024,
        steps: 30,
        samples: 1,
      }),
    });

    if (!response.ok) throw new Error(`Stability error: ${response.status}`);
    const data = await response.json();

    // Save base64 to file
    const buffer = Buffer.from(data.artifacts[0].base64, 'base64');
    const filename = `gen_${Date.now()}.png`;
    const filepath = `./uploads/${filename}`;
    const fs = require('fs');
    fs.writeFileSync(filepath, buffer);

    return {
      url: `/uploads/${filename}`,
      localPath: filepath,
      prompt,
      style,
      width: 1024,
      height: 1024,
      provider: 'stability',
    };
  }

  // ── PROVIDER: REPLICATE (FLUX) ─────────────────────────────
  private async generateReplicate(prompt: string, style: ImageStyle, provider: ProviderConfig): Promise<GeneratedImage> {
    // Start prediction
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${provider.apiKey}`,
      },
      body: JSON.stringify({
        version: provider.model,
        input: {
          prompt,
          width: 1024,
          height: 1024,
          num_inference_steps: 25,
        },
      }),
    });

    if (!response.ok) throw new Error(`Replicate error: ${response.status}`);
    const prediction = await response.json();

    // Poll for result
    let result = prediction;
    while (result.status !== 'succeeded' && result.status !== 'failed') {
      await new Promise((r) => setTimeout(r, 2000));
      const poll = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
        headers: { Authorization: `Token ${provider.apiKey}` },
      });
      result = await poll.json();
    }

    if (result.status === 'failed') throw new Error('Replicate generation failed');

    return {
      url: result.output[0],
      prompt,
      style,
      width: 1024,
      height: 1024,
      provider: 'replicate',
    };
  }

  // ── STATS ──────────────────────────────────────────────────
  getStats() {
    return {
      totalGenerated: this.generationCount,
      cacheSize: this.cache.size,
      provider: this.provider.type,
      hasApiKey: !!this.provider.apiKey,
    };
  }
}
