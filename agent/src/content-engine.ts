// ============================================================
// CONTENT ENGINE — Personality-Driven Content Generation
// ============================================================
// Generates tweets, replies, and threads that match the
// agent's personality profile. Uses templates + LLM for
// natural variation.
// ============================================================

import { PersonalityProfile } from './config';

export class ContentEngine {
  private personality: PersonalityProfile;
  private recentPosts: string[] = []; // Avoid repetition
  private maxRecentPosts = 50;

  constructor(personality: PersonalityProfile) {
    this.personality = personality;
  }

  // ── POST FORMATTING ────────────────────────────────────────
  async formatPost(rawContent: string, type: PostType): Promise<string> {
    let content = rawContent;

    // Apply personality modifiers
    content = this.applyTone(content);
    content = this.applyEmojiDensity(content);
    content = this.addCatchphrase(content);
    content = this.ensureUniqueness(content);

    // Enforce character limit
    content = this.truncate(content, 280);

    // Track for uniqueness
    this.recentPosts.push(content);
    if (this.recentPosts.length > this.maxRecentPosts) {
      this.recentPosts.shift();
    }

    return content;
  }

  // ── MEME GENERATION ────────────────────────────────────────
  async generateMeme(trending: string[], onChainData: any): Promise<string> {
    const templates = this.getMemeTemplates();
    const template = templates[Math.floor(Math.random() * templates.length)];

    const token = onChainData?.trackedTokens?.[0]?.symbol || 'SOL';
    const trend = trending[Math.floor(Math.random() * trending.length)] || 'crypto';

    let meme = template
      .replace('{TOKEN}', token)
      .replace('{TREND}', trend);

    meme = this.applyEmojiDensity(meme);
    return this.truncate(meme, 280);
  }

  // ── REPLY GENERATION ───────────────────────────────────────
  async generateReply(
    tweet: { text: string; author: { handle: string; followers: number } },
    personality: PersonalityProfile
  ): Promise<string> {
    const { text, author } = tweet;

    // Determine reply strategy based on tweet content
    const strategy = this.analyzeReplyStrategy(text, author);

    let reply: string;

    switch (strategy) {
      case 'agree-and-add':
        reply = this.generateAgreeReply(text);
        break;
      case 'counter-take':
        reply = this.generateCounterReply(text);
        break;
      case 'alpha-drop':
        reply = this.generateAlphaReply(text);
        break;
      case 'humor':
        reply = this.generateHumorReply(text);
        break;
      case 'question':
        reply = this.generateQuestionReply(text);
        break;
      default:
        reply = this.generateGenericReply(text);
    }

    reply = this.applyTone(reply);
    reply = this.applyEmojiDensity(reply);

    return this.truncate(reply, 280);
  }

  // ── THREAD GENERATION ──────────────────────────────────────
  async generateThread(topic: string, points: string[]): Promise<string[]> {
    const tweets: string[] = [];

    // Hook tweet
    tweets.push(this.truncate(
      `${topic}\n\nA thread 🧵👇`,
      280
    ));

    // Content tweets
    for (let i = 0; i < points.length; i++) {
      tweets.push(this.truncate(
        `${i + 1}/ ${points[i]}`,
        280
      ));
    }

    // Closing tweet
    const closers = [
      `That's it for now.\n\nLike + RT if this was useful.\nFollow for more alpha. 🫡`,
      `End of thread.\n\nIf you found this valuable, a follow goes a long way. 🤝`,
      `TLDR: ${topic}\n\nBookmark this.\nFollow for more. 🔖`,
    ];
    tweets.push(closers[Math.floor(Math.random() * closers.length)]);

    return tweets;
  }

  // ── PERSONALITY MODIFIERS ──────────────────────────────────
  private applyTone(content: string): string {
    const { tone, slangLevel } = this.personality;

    if (slangLevel > 0.5) {
      content = content
        .replace(/\bgreat\b/gi, 'fire')
        .replace(/\bvery good\b/gi, 'bussin')
        .replace(/\bincreasing\b/gi, 'pumping')
        .replace(/\bdecreasing\b/gi, 'dumping')
        .replace(/\bpeople\b/gi, 'degens');
    }

    if (tone === 'degen') {
      content = content
        .replace(/\binvestors\b/gi, 'apes')
        .replace(/\bpurchased\b/gi, 'aped into')
        .replace(/\bdo your own research\b/gi, 'DYOR NFA');
    }

    return content;
  }

  private applyEmojiDensity(content: string): string {
    const density = this.personality.emojiDensity;
    if (density < 0.2) return content; // Minimal emoji

    const emojiMap: Record<string, string[]> = {
      bullish: ['📈', '🚀', '💹', '🐂'],
      bearish: ['📉', '🐻', '💀', '😤'],
      alpha: ['👀', '🎯', '💎', '🧠'],
      degen: ['🦍', '🫡', '🔥', '⚡'],
      caution: ['⚠️', '🚨', '👆', '🤔'],
      general: ['✨', '💫', '🌟', '⭐'],
    };

    // Add contextual emojis based on content
    const lowerContent = content.toLowerCase();
    let category = 'general';
    if (lowerContent.includes('pump') || lowerContent.includes('bull')) category = 'bullish';
    if (lowerContent.includes('dump') || lowerContent.includes('bear')) category = 'bearish';
    if (lowerContent.includes('alpha') || lowerContent.includes('watch')) category = 'alpha';
    if (lowerContent.includes('ape') || lowerContent.includes('degen')) category = 'degen';
    if (lowerContent.includes('rug') || lowerContent.includes('alert')) category = 'caution';

    const emojis = emojiMap[category];

    // Add emoji based on density probability
    if (Math.random() < density && !content.match(/[\u{1F600}-\u{1F64F}]/u)) {
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      content = `${content} ${emoji}`;
    }

    return content;
  }

  private addCatchphrase(content: string): string {
    const { catchphrases } = this.personality;
    if (catchphrases.length === 0) return content;

    // 20% chance to append a catchphrase
    if (Math.random() < 0.2) {
      const phrase = catchphrases[Math.floor(Math.random() * catchphrases.length)];
      if (content.length + phrase.length + 2 <= 280) {
        content = `${content}\n\n${phrase}`;
      }
    }

    return content;
  }

  private ensureUniqueness(content: string): string {
    // Check similarity with recent posts
    const isDuplicate = this.recentPosts.some((post) => {
      const similarity = this.calculateSimilarity(content, post);
      return similarity > 0.7;
    });

    if (isDuplicate) {
      // Add variation
      const variations = [
        () => content + ' 👆',
        () => `Quick update:\n\n${content}`,
        () => `Thoughts:\n\n${content}`,
        () => content.replace(/\.\s/, '!\n\n'),
      ];
      const vary = variations[Math.floor(Math.random() * variations.length)];
      return this.truncate(vary(), 280);
    }

    return content;
  }

  // ── REPLY STRATEGIES ───────────────────────────────────────
  private analyzeReplyStrategy(text: string, author: any): string {
    const lower = text.toLowerCase();

    if (lower.includes('?')) return 'alpha-drop';
    if (lower.includes('bearish') || lower.includes('dump')) return 'counter-take';
    if (author.followers > 10000) return 'agree-and-add';
    if (this.personality.humor > 0.6 && Math.random() < 0.3) return 'humor';
    if (Math.random() < 0.2) return 'question';
    return 'agree-and-add';
  }

  private generateAgreeReply(text: string): string {
    const replies = [
      'This. People are sleeping on this.',
      'Been saying this for weeks. Finally someone gets it.',
      'Based take. The data backs this up too.',
      'Underrated observation. Most aren\'t paying attention.',
      'Real ones know. This is the play.',
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  }

  private generateCounterReply(text: string): string {
    const replies = [
      'Interesting take but I\'d push back here. The on-chain data tells a different story.',
      'Respectfully disagree. Zoom out and look at the bigger picture.',
      'Counter-point: the smart money is actually doing the opposite rn.',
      'I see where you\'re coming from but the fundamentals say otherwise.',
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  }

  private generateAlphaReply(text: string): string {
    const replies = [
      'Good question. Here\'s what I\'m seeing on-chain...',
      'The answer might surprise you. Look at the whale wallets.',
      'Follow the money. The on-chain data is clear on this one.',
      'I\'ve been tracking this. Short answer: yes, but timing matters.',
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  }

  private generateHumorReply(text: string): string {
    const replies = [
      'Me reading this while my portfolio bleeds',
      'Sir this is a Wendy\'s',
      'Instructions unclear, aped into a new memecoin',
      'My therapist needs a therapist after reading CT',
      'Based and chain-pilled',
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  }

  private generateQuestionReply(text: string): string {
    const replies = [
      'Curious — what timeframe are you looking at?',
      'What\'s your conviction level on this? 1-10?',
      'Have you looked at the on-chain data for this?',
      'Interesting. What changed your mind on this?',
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  }

  private generateGenericReply(text: string): string {
    const replies = [
      'Good to see this perspective.',
      'Noted. Watching closely.',
      'Adding this to the watchlist.',
      'The market is speaking. Time to listen.',
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  }

  // ── MEME TEMPLATES ─────────────────────────────────────────
  private getMemeTemplates(): string[] {
    return [
      'Me explaining {TOKEN} to my normie friends:\n\n"Just trust me bro"',
      'POV: You bought {TOKEN} at the top and now you\'re "in it for the tech"',
      '{TOKEN} holders rn: 📈\nEveryone else: "what did I miss"',
      'Nobody:\nAbsolutely nobody:\n{TOKEN}: *pumps 50%*',
      'Stages of grief:\n1. Denial (it\'s just a dip)\n2. Anger (who dumped?)\n3. Bargaining (if it hits X I\'ll sell)\n4. Depression\n5. Buying more {TOKEN}',
      'How it started: "I\'ll just put $100 in {TOKEN}"\nHow it\'s going: *refreshes chart at 3am*',
      'CT is sleeping on {TREND}\n\nScreenshot this tweet',
      '"I\'ll take profits this time"\n\n*{TOKEN} pumps 20%*\n\n"Okay maybe one more day"',
    ];
  }

  // ── UTILITIES ──────────────────────────────────────────────
  private truncate(text: string, limit: number): string {
    if (text.length <= limit) return text;
    return text.slice(0, limit - 3) + '...';
  }

  private calculateSimilarity(a: string, b: string): number {
    // Simple Jaccard similarity on words
    const wordsA = new Set(a.toLowerCase().split(/\s+/));
    const wordsB = new Set(b.toLowerCase().split(/\s+/));
    const intersection = new Set([...wordsA].filter((w) => wordsB.has(w)));
    const union = new Set([...wordsA, ...wordsB]);
    return intersection.size / union.size;
  }
}

type PostType = 'alpha' | 'meme' | 'shill' | 'on-chain' | 'engagement' | 'thread';
