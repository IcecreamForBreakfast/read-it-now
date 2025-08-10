import { describe, it, expect, beforeEach } from '@jest/globals';
import { AutoTagger } from '../server/lib/auto-tagger';
import type { Article } from '../shared/schema';

describe('AutoTagger - No Uncertain Tag Logic', () => {
  let autoTagger: AutoTagger;

  beforeEach(() => {
    autoTagger = new AutoTagger();
  });

  // Helper function to create test articles
  const createArticle = (url: string, title: string, content?: string): any => {
    let domain = '';
    try {
      domain = url ? new URL(url).hostname : '';
    } catch {
      // Handle malformed URLs gracefully
      domain = '';
    }
    
    return {
      id: 'test-id',
      userId: 'test-user',
      url,
      title,
      content: content || '',
      domain,
      state: 'inbox',
      annotation: null,
      tag: '',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  };

  describe('Work Classification', () => {
    it('should tag articles from work domains as work', () => {
      const article = createArticle(
        'https://medium.com/engineering/scaling-microservices',
        'How We Scaled Our Microservices Architecture'
      );

      const result = autoTagger.tagArticle(article);

      expect(result.tag).toBe('work');
      expect(result.confidence).toBe('high'); // Domain + title keywords = high confidence
      expect(result.reasons).toContain('Domain: medium.com');
    });

    it('should tag articles with work keywords as work', () => {
      const article = createArticle(
        'https://example.com/article',
        'Introduction to Machine Learning for Product Managers',
        'This article covers artificial intelligence, product management, and startup growth metrics.'
      );

      const result = autoTagger.tagArticle(article);

      expect(result.tag).toBe('work');
      expect(result.confidence).toBe('high'); // Multiple keywords should give high confidence
    });

    it('should tag GitHub articles as work', () => {
      const article = createArticle(
        'https://github.com/facebook/react',
        'React - A JavaScript library for building user interfaces'
      );

      const result = autoTagger.tagArticle(article);

      expect(result.tag).toBe('work');
      expect(result.reasons).toContain('Domain: github.com');
    });

    it('should tag TechCrunch articles as work', () => {
      const article = createArticle(
        'https://techcrunch.com/2024/funding-round',
        'Startup Raises $50M Series B for AI Platform'
      );

      const result = autoTagger.tagArticle(article);

      expect(result.tag).toBe('work');
      expect(result.reasons).toContain('Domain: techcrunch.com');
    });
  });

  describe('Personal Classification', () => {
    it('should tag articles from personal domains as personal', () => {
      const article = createArticle(
        'https://allrecipes.com/recipe/chocolate-cake',
        'Best Chocolate Cake Recipe'
      );

      const result = autoTagger.tagArticle(article);

      expect(result.tag).toBe('personal');
      expect(result.confidence).toBe('medium');
      expect(result.reasons).toContain('Domain: allrecipes.com');
    });

    it('should tag articles with personal keywords as personal', () => {
      const article = createArticle(
        'https://example.com/blog',
        'Planning the Perfect Family Vacation',
        'Tips for travel with kids, family-friendly recipes, and health advice for children.'
      );

      const result = autoTagger.tagArticle(article);

      expect(result.tag).toBe('personal');
      expect(result.confidence).toBe('high'); // Multiple keywords
    });

    it('should tag cooking content as personal', () => {
      const article = createArticle(
        'https://foodnetwork.com/recipe',
        'Quick Dinner Recipe for Busy Families',
        'This recipe is perfect for cooking with kids and family meal planning.'
      );

      const result = autoTagger.tagArticle(article);

      expect(result.tag).toBe('personal');
      expect(result.reasons).toContain('Domain: foodnetwork.com');
    });

    it('should tag health articles as personal', () => {
      const article = createArticle(
        'https://mayoclinic.org/fitness',
        'Exercise Guidelines for Adults',
        'Health and fitness recommendations for maintaining wellness.'
      );

      const result = autoTagger.tagArticle(article);

      expect(result.tag).toBe('personal');
      expect(result.reasons).toContain('Domain: mayoclinic.org');
    });
  });

  describe('No Tag Assignment', () => {
    it('should return null tag for neutral content with no clear indicators', () => {
      const article = createArticle(
        'https://neutral-news.com/article',
        'General News Update',
        'This is a general news article with no specific work or personal indicators.'
      );

      const result = autoTagger.tagArticle(article);

      expect(result.tag).toBeNull();
      expect(result.confidence).toBe('low');
      expect(result.reasons).toContain('No clear work or personal indicators found');
    });

    it('should return null tag for articles with equal work and personal indicators', () => {
      const article = createArticle(
        'https://example.com/mixed',
        'Working from Home: Setting Up Your Kitchen Office',
        'How to balance work productivity with cooking and family time using technology.'
      );

      const result = autoTagger.tagArticle(article);

      expect(result.tag).toBeNull();
      expect(result.confidence).toBe('low');
      expect(result.reasons).toContain('Equal work and personal indicators found');
    });

    it('should return null tag for unknown domains with no keywords', () => {
      const article = createArticle(
        'https://random-blog.xyz/post/123',
        'Random Blog Post',
        'This is just some random content without specific indicators.'
      );

      const result = autoTagger.tagArticle(article);

      expect(result.tag).toBeNull();
      expect(result.confidence).toBe('low');
    });

    it('should return null tag for empty content', () => {
      const article = createArticle(
        'https://example.com/empty',
        '',
        ''
      );

      const result = autoTagger.tagArticle(article);

      expect(result.tag).toBeNull();
      expect(result.confidence).toBe('low');
    });
  });

  describe('Edge Cases', () => {
    it('should handle articles with no URL', () => {
      const article = createArticle(
        '',
        'Article Title with JavaScript Programming',
        'Content about software development and coding.'
      );

      const result = autoTagger.tagArticle(article);

      expect(result.tag).toBe('work'); // Should still classify based on keywords
      expect(result.confidence).toBe('medium');
    });

    it('should handle mixed domains correctly', () => {
      const article = createArticle(
        'https://medium.com/food-blog/recipe',
        'Cooking Tips for Developers',
        'How to cook healthy meals while working in tech, including recipes and nutrition advice.'
      );

      const result = autoTagger.tagArticle(article);

      // Medium.com is a work domain, but content has personal keywords
      // Work domain should take precedence in tie-breaking
      expect(result.tag).toBe('work');
    });

    it('should be case insensitive for keyword matching', () => {
      const article = createArticle(
        'https://example.com/article',
        'MACHINE LEARNING and ARTIFICIAL INTELLIGENCE',
        'This article discusses AI, ML, and PROGRAMMING concepts.'
      );

      const result = autoTagger.tagArticle(article);

      expect(result.tag).toBe('work');
      expect(result.confidence).toBe('high');
    });

    it('should handle special characters in URLs', () => {
      const article = createArticle(
        'https://github.com/user/repo-name_with-special.chars',
        'Open Source Project',
        'A software development project.'
      );

      const result = autoTagger.tagArticle(article);

      expect(result.tag).toBe('work');
      expect(result.reasons).toContain('Domain: github.com');
    });
  });

  describe('Confidence Levels', () => {
    it('should assign high confidence for multiple matching indicators', () => {
      const article = createArticle(
        'https://techcrunch.com/startup-news',
        'AI Startup Raises Funding for Machine Learning Platform',
        'This startup focuses on artificial intelligence, product management, and enterprise software development.'
      );

      const result = autoTagger.tagArticle(article);

      expect(result.tag).toBe('work');
      expect(result.confidence).toBe('high');
    });

    it('should assign medium confidence for single domain match', () => {
      const article = createArticle(
        'https://linkedin.com/post',
        'Random Post',
        'Some general content.'
      );

      const result = autoTagger.tagArticle(article);

      expect(result.tag).toBe('work');
      expect(result.confidence).toBe('medium');
    });

    it('should assign medium confidence for single keyword match', () => {
      const article = createArticle(
        'https://example.com/article',
        'Article about cooking',
        'This discusses some cooking techniques.'
      );

      const result = autoTagger.tagArticle(article);

      expect(result.tag).toBe('personal');
      expect(result.confidence).toBe('medium');
    });
  });

  describe('Domain Extraction', () => {
    it('should extract domain correctly from various URL formats', () => {
      const testCases = [
        { url: 'https://github.com/user/repo', expectedDomain: 'github.com' },
        { url: 'http://medium.com/article', expectedDomain: 'medium.com' },
        { url: 'https://www.techcrunch.com/news', expectedDomain: 'www.techcrunch.com' },
        { url: 'https://subdomain.example.com/path', expectedDomain: 'subdomain.example.com' }
      ];

      testCases.forEach(({ url, expectedDomain }) => {
        const article = createArticle(url, 'Test Title');
        const domain = (autoTagger as any).extractDomain(url);
        expect(domain).toBe(expectedDomain);
      });
    });

    it('should handle malformed URLs gracefully', () => {
      const article = createArticle(
        'not-a-valid-url',
        'Test Title'
      );

      const result = autoTagger.tagArticle(article);

      // Should not crash and should base decision on title/content only
      expect(result).toBeDefined();
      expect(result.tag).toBeNull(); // No domain or keyword matches
    });
  });
});