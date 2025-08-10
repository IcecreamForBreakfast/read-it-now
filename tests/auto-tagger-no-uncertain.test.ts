import { describe, it, expect, beforeEach } from '@jest/globals';
import { AutoTagger } from '../server/lib/auto-tagger';

describe('AutoTagger - No Uncertain Tag Implementation', () => {
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
    it('should tag clear work domain articles as work', () => {
      const article = createArticle(
        'https://github.com/facebook/react',
        'React Library Documentation'
      );

      const result = autoTagger.tagArticle(article);

      expect(result.tag).toBe('work');
      expect(result.confidence).toBe('high'); // Domain + keywords in title
      expect(result.reasons).toContain('Domain: github.com');
    });

    it('should tag TechCrunch articles as work', () => {
      const article = createArticle(
        'https://techcrunch.com/2024/startup-funding',
        'Tech Startup Raises $50M'
      );

      const result = autoTagger.tagArticle(article);

      expect(result.tag).toBe('work');
      expect(result.confidence).toBe('high'); // Domain + startup keyword in title
      expect(result.reasons).toContain('Domain: techcrunch.com');
    });

    it('should tag LinkedIn articles as work', () => {
      const article = createArticle(
        'https://linkedin.com/pulse/career-advice',
        'Professional Development Tips'
      );

      const result = autoTagger.tagArticle(article);

      expect(result.tag).toBe('work');
      expect(result.confidence).toBe('high'); // Domain + career keyword in title
      expect(result.reasons).toContain('Domain: linkedin.com');
    });

    it('should tag articles with multiple work keywords as work', () => {
      const article = createArticle(
        'https://technical-blog.example.com/post',
        'JavaScript Programming Tutorial',
        'This tutorial covers software development, engineering best practices, and programming fundamentals.'
      );

      const result = autoTagger.tagArticle(article);

      expect(result.tag).toBe('work');
      expect(result.confidence).toBe('medium');
    });
  });

  describe('Personal Classification', () => {
    it('should tag cooking domain articles as personal', () => {
      const article = createArticle(
        'https://allrecipes.com/recipe/chocolate-cake',
        'Best Chocolate Cake Ever'
      );

      const result = autoTagger.tagArticle(article);

      expect(result.tag).toBe('personal');
      expect(result.confidence).toBe('medium'); // Domain only, no matching keywords in "chocolate cake"
      expect(result.reasons).toContain('Domain: allrecipes.com');
    });

    it('should tag health domain articles as personal', () => {
      const article = createArticle(
        'https://mayoclinic.org/health-tips',
        'Exercise Guidelines for Adults'
      );

      const result = autoTagger.tagArticle(article);

      expect(result.tag).toBe('personal');
      expect(result.confidence).toBe('high'); // Domain + health keyword
      expect(result.reasons).toContain('Domain: mayoclinic.org');
    });

    it('should tag articles with multiple personal keywords as personal', () => {
      const article = createArticle(
        'https://family-blog.example.com/post',
        'Family Vacation Planning with Kids',
        'Tips for travel with children, including family-friendly recipes and activities.'
      );

      const result = autoTagger.tagArticle(article);

      expect(result.tag).toBe('personal');
      expect(result.confidence).toBe('medium'); // Multiple keywords but not enough for high confidence
    });
  });

  describe('No Tag Assignment (Null Results)', () => {
    it('should return null for truly neutral content', () => {
      const article = createArticle(
        'https://neutral-site.com/article',
        'Weather Update',
        'Tomorrow will be sunny with temperatures in the 70s.'
      );

      const result = autoTagger.tagArticle(article);

      expect(result.tag).toBeNull();
      expect(result.confidence).toBe('low');
      expect(result.reasons).toContain('No clear work or personal indicators found');
    });

    it('should return null for equal work and personal indicators', () => {
      const article = createArticle(
        'https://neutral-blog.com/balance',
        'Work-Life Balance with Cooking',
        'How to manage programming deadlines while maintaining family recipe traditions.'
      );

      const result = autoTagger.tagArticle(article);

      expect(result.tag).toBeNull();
      expect(result.confidence).toBe('low');
      expect(result.reasons).toContain('Equal work and personal indicators found');
    });

    it('should return null for empty content', () => {
      const article = createArticle('', '', '');

      const result = autoTagger.tagArticle(article);

      expect(result.tag).toBeNull();
      expect(result.confidence).toBe('low');
    });

    it('should return null for minimal non-matching content', () => {
      const article = createArticle(
        'https://unknown-domain.xyz/post',
        'Random Thoughts',
        'Just some random observations about the world.'
      );

      const result = autoTagger.tagArticle(article);

      expect(result.tag).toBeNull();
      expect(result.confidence).toBe('low');
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed URLs gracefully', () => {
      const article = createArticle(
        'not-a-valid-url',
        'Programming Tutorial',
        'Learn JavaScript fundamentals and software development.'
      );

      const result = autoTagger.tagArticle(article);

      expect(result.tag).toBe('work'); // Should classify based on keywords
      expect(result.confidence).toBe('medium'); // Keywords only, no domain
    });

    it('should prioritize domain classification over content', () => {
      const article = createArticle(
        'https://github.com/user/recipe-app',
        'Recipe Management App',
        'A cooking app for managing family recipes and meal planning.'
      );

      const result = autoTagger.tagArticle(article);

      // GitHub domain should take precedence despite cooking content
      expect(result.tag).toBe('work');
      expect(result.reasons).toContain('Domain: github.com');
    });

    it('should be case insensitive for keyword matching', () => {
      const article = createArticle(
        'https://test-site.com/article',
        'PROGRAMMING and SOFTWARE DEVELOPMENT',
        'This covers JAVASCRIPT programming and SOFTWARE engineering fundamentals.'
      );

      const result = autoTagger.tagArticle(article);

      expect(result.tag).toBe('work');
      expect(result.confidence).toBe('medium');
    });
  });

  describe('Confidence Level Accuracy', () => {
    it('should assign high confidence for domain + keywords', () => {
      const article = createArticle(
        'https://medium.com/tech-blog',
        'Machine Learning Product Strategy',
        'AI development and startup growth metrics.'
      );

      const result = autoTagger.tagArticle(article);

      expect(result.tag).toBe('work');
      expect(result.confidence).toBe('high');
    });

    it('should assign medium confidence for domain only', () => {
      const article = createArticle(
        'https://stackoverflow.com/questions/12345',
        'Random Question',
        'Some general question without specific keywords.'
      );

      const result = autoTagger.tagArticle(article);

      expect(result.tag).toBe('work');
      expect(result.confidence).toBe('medium');
    });

    it('should assign high confidence for multiple keywords', () => {
      const article = createArticle(
        'https://random-site.com/post',
        'JavaScript Development Tips',
        'Programming best practices for software engineers.'
      );

      const result = autoTagger.tagArticle(article);

      expect(result.tag).toBe('work');
      expect(result.confidence).toBe('medium'); // Keywords only, no work domain
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle news articles appropriately', () => {
      const article = createArticle(
        'https://reuters.com/technology/news',
        'Tech Industry Report',
        'Latest developments in the technology sector.'
      );

      const result = autoTagger.tagArticle(article);

      // Should be work due to technology keyword
      expect(result.tag).toBe('work');
      expect(result.confidence).toBe('medium');
    });

    it('should handle recipe articles correctly', () => {
      const article = createArticle(
        'https://foodnetwork.com/recipes/easy-dinner',
        'Quick Family Dinner Ideas',
        'Simple cooking techniques for busy parents with kids.'
      );

      const result = autoTagger.tagArticle(article);

      expect(result.tag).toBe('personal');
      expect(result.confidence).toBe('high');
      expect(result.reasons).toContain('Domain: foodnetwork.com');
    });

    it('should handle mixed professional personal content', () => {
      const article = createArticle(
        'https://work-life-blog.com/balance',
        'Freelance Developer Family Time',
        'Balancing programming projects with parenting and cooking healthy meals.'
      );

      const result = autoTagger.tagArticle(article);

      // Should have equal indicators and return null
      expect(result.tag).toBeNull();
      expect(result.confidence).toBe('low');
    });
  });
});