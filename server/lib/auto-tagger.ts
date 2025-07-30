import type { Article } from "@shared/schema";

export interface TaggingRules {
  work: {
    domains: string[];
    keywords: string[];
  };
  personal: {
    domains: string[];
    keywords: string[];
  };
}

export interface TaggingResult {
  tag: string;
  confidence: 'high' | 'medium' | 'low';
  reasons: string[];
}

export interface TaggingStats {
  totalArticles: number;
  workCount: number;
  personalCount: number;
  uncertainCount: number;
  suggestions: TaggingSuggestion[];
}

export interface TaggingSuggestion {
  id: string;
  type: 'domain' | 'keyword';
  category: 'work' | 'personal';
  value: string;
  count: number;
  description: string;
}

export class AutoTagger {
  private rules: TaggingRules = {
    work: {
      domains: [
        'linkedin.com',
        'medium.com',
        'substack.com',
        'techcrunch.com',
        'venturebeat.com',
        'firstround.com',
        'a16z.com',
        'hbr.org',
        'mckinsey.com',
        'stratechery.com',
        'github.com',
        'stackoverflow.com',
        'dev.to',
        'hackernews.com',
        'news.ycombinator.com',
        'thenextweb.com',
        'wired.com',
        'ars-technica.com',
        'blog.google',
        'engineering.uber.com',
        'netflixtechblog.com',
        'eng.uber.com',
        'spotify.engineering',
        'slack.engineering'
      ],
      keywords: [
        'ai', 'artificial intelligence', 'machine learning', 'ml',
        'product management', 'product manager', 'pm', 'product',
        'startup', 'saas', 'growth', 'metrics', 'kpi',
        'roadmap', 'user experience', 'ux', 'ui', 'design',
        'analytics', 'strategy', 'business', 'enterprise',
        'technology', 'software', 'development', 'programming',
        'marketing', 'sales', 'revenue', 'b2b', 'b2c',
        'engineering', 'architecture', 'scalability', 'performance',
        'javascript', 'python', 'react', 'node', 'api',
        'cloud', 'aws', 'azure', 'devops', 'docker',
        'data', 'database', 'sql', 'nosql', 'analytics',
        'mobile', 'ios', 'android', 'flutter', 'react native',
        'security', 'cybersecurity', 'privacy', 'compliance',
        'agile', 'scrum', 'kanban', 'project management',
        'leadership', 'management', 'team', 'hiring', 'career'
      ]
    },
    personal: {
      domains: [
        'allrecipes.com',
        'foodnetwork.com',
        'tripadvisor.com',
        'booking.com',
        'airbnb.com',
        'strava.com',
        'myfitnesspal.com',
        'peloton.com',
        'nytimes.com/section/food',
        'seriouseats.com',
        'reddit.com',
        'youtube.com',
        'netflix.com',
        'spotify.com',
        'pinterest.com',
        'instagram.com',
        'goodreads.com',
        'imdb.com',
        'yelp.com',
        'zillow.com',
        'realtor.com',
        'expedia.com',
        'kayak.com',
        'rei.com',
        'amazon.com',
        'etsy.com',
        'target.com',
        'costco.com',
        'webmd.com',
        'mayoclinic.org',
        'healthline.com'
      ],
      keywords: [
        'recipe', 'recipes', 'cooking', 'food', 'baking', 'chef',
        'travel', 'vacation', 'trip', 'hotel', 'flight', 'tourism',
        'workout', 'exercise', 'fitness', 'gym', 'running', 'yoga',
        'kids', 'children', 'family', 'parenting', 'baby', 'toddler',
        'restaurant', 'dining', 'meal', 'breakfast', 'lunch', 'dinner',
        'health', 'wellness', 'meditation', 'mental health', 'therapy',
        'hobby', 'leisure', 'entertainment', 'movies', 'music', 'books',
        'shopping', 'deals', 'sale', 'discount', 'fashion', 'style',
        'home', 'garden', 'diy', 'decor', 'interior design',
        'sports', 'football', 'basketball', 'baseball', 'soccer',
        'gaming', 'games', 'xbox', 'playstation', 'nintendo',
        'pets', 'dog', 'cat', 'puppy', 'kitten', 'animal',
        'photography', 'camera', 'photo', 'instagram', 'art',
        'wedding', 'marriage', 'anniversary', 'birthday', 'party',
        'finance', 'money', 'budget', 'investment', 'savings',
        'education', 'school', 'university', 'college', 'learning'
      ]
    }
  };

  tagArticle(article: Article): TaggingResult {
    const domain = article.url ? this.extractDomain(article.url) : '';
    const text = `${article.title} ${article.content || ''}`.toLowerCase();
    
    // Check work rules
    const workReasons = this.checkRules(domain, text, this.rules.work, 'work');
    const personalReasons = this.checkRules(domain, text, this.rules.personal, 'personal');
    
    if (workReasons.length > personalReasons.length) {
      return {
        tag: 'work',
        confidence: workReasons.length >= 2 ? 'high' : 'medium',
        reasons: workReasons
      };
    } else if (personalReasons.length > workReasons.length) {
      return {
        tag: 'personal',
        confidence: personalReasons.length >= 2 ? 'high' : 'medium',
        reasons: personalReasons
      };
    }
    
    return {
      tag: 'uncertain',
      confidence: 'low',
      reasons: ['No clear work or personal indicators found']
    };
  }

  private checkRules(domain: string, text: string, rules: { domains: string[], keywords: string[] }, category: string): string[] {
    const reasons: string[] = [];
    
    // Check domains
    const matchingDomain = rules.domains.find(d => domain.includes(d));
    if (matchingDomain) {
      reasons.push(`Domain: ${matchingDomain}`);
    }
    
    // Check keywords
    const matchingKeywords = rules.keywords.filter(keyword => 
      text.includes(keyword.toLowerCase())
    );
    
    if (matchingKeywords.length > 0) {
      reasons.push(`Keywords: ${matchingKeywords.slice(0, 3).join(', ')}`);
    }
    
    return reasons;
  }

  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return '';
    }
  }

  // Generate analytics and suggestions based on user's articles
  generateAnalytics(articles: Article[]): TaggingStats {
    const workCount = articles.filter(a => a.tag === 'work').length;
    const personalCount = articles.filter(a => a.tag === 'personal').length;
    const uncertainCount = articles.filter(a => a.tag === 'uncertain').length;
    
    const suggestions = this.generateSuggestions(articles);
    
    return {
      totalArticles: articles.length,
      workCount,
      personalCount,
      uncertainCount,
      suggestions
    };
  }

  private generateSuggestions(articles: Article[]): TaggingSuggestion[] {
    const suggestions: TaggingSuggestion[] = [];
    const domainCounts: { [key: string]: { work: number, personal: number } } = {};
    const keywordCounts: { [key: string]: { work: number, personal: number } } = {};
    
    // Analyze domain patterns
    articles.forEach(article => {
      if (article.tag === 'work' || article.tag === 'personal') {
        const domain = article.url ? this.extractDomain(article.url) : '';
        if (domain && !this.isDomainInRules(domain)) {
          if (!domainCounts[domain]) {
            domainCounts[domain] = { work: 0, personal: 0 };
          }
          domainCounts[domain][article.tag as 'work' | 'personal']++;
        }
      }
    });
    
    // Generate domain suggestions
    Object.entries(domainCounts).forEach(([domain, counts]) => {
      const total = counts.work + counts.personal;
      if (total >= 3) { // Minimum 3 articles from same domain
        const category = counts.work > counts.personal ? 'work' : 'personal';
        const dominantCount = Math.max(counts.work, counts.personal);
        
        if (dominantCount / total >= 0.7) { // 70% or more in one category
          suggestions.push({
            id: `domain-${domain}`,
            type: 'domain',
            category,
            value: domain,
            count: dominantCount,
            description: `Add ${domain} to ${category} domains (${dominantCount}/${total} articles tagged as ${category})`
          });
        }
      }
    });
    
    return suggestions.slice(0, 5); // Limit to 5 suggestions
  }

  private isDomainInRules(domain: string): boolean {
    return [...this.rules.work.domains, ...this.rules.personal.domains]
      .some(ruleDomain => domain.includes(ruleDomain));
  }

  // Add new rule based on user feedback
  addRule(type: 'domain' | 'keyword', category: 'work' | 'personal', value: string): void {
    if (type === 'domain') {
      this.rules[category].domains.push(value);
    } else {
      this.rules[category].keywords.push(value);
    }
  }

  // Get current rules for display
  getRules(): TaggingRules {
    return this.rules;
  }
}

export const autoTagger = new AutoTagger();