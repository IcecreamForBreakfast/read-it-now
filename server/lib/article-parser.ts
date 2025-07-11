import { JSDOM } from "jsdom";

export interface ArticleContent {
  title: string;
  content: string;
}

export function extractDomain(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return domain.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

export async function extractArticleContent(url: string): Promise<ArticleContent> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch article: ${response.status}`);
    }
    
    const html = await response.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    // Extract title
    let title = document.querySelector('title')?.textContent?.trim() || 
                document.querySelector('h1')?.textContent?.trim() ||
                document.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
                extractDomain(url);
    
    // Extract content
    let content = '';
    
    // Try to find main content area
    const contentSelectors = [
      'article',
      '[role="main"]',
      '.post-content',
      '.entry-content',
      '.content',
      '.post-body',
      '.article-body',
      'main'
    ];
    
    let contentElement: Element | null = null;
    for (const selector of contentSelectors) {
      contentElement = document.querySelector(selector);
      if (contentElement) break;
    }
    
    if (!contentElement) {
      // Fallback to body
      contentElement = document.body;
    }
    
    if (contentElement) {
      // Remove unwanted elements
      const unwantedSelectors = [
        'script', 'style', 'nav', 'header', 'footer', 
        '.advertisement', '.ads', '.social-share',
        '.comments', '.related-posts', '.sidebar'
      ];
      
      unwantedSelectors.forEach(selector => {
        contentElement!.querySelectorAll(selector).forEach(el => el.remove());
      });
      
      // Extract text content from paragraphs and headings
      const textElements = contentElement.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li');
      const textContent = Array.from(textElements)
        .map(el => el.textContent?.trim())
        .filter(text => text && text.length > 20)
        .join('\n\n');
      
      content = textContent || contentElement.textContent?.trim() || '';
    }
    
    // Clean up content but preserve paragraph breaks
    content = content.replace(/[ \t]+/g, ' ').trim();
    
    // Limit content length for storage
    if (content.length > 10000) {
      content = content.substring(0, 10000) + '...';
    }
    
    return {
      title: title.substring(0, 200), // Limit title length
      content
    };
    
  } catch (error) {
    console.error('Error extracting article content:', error);
    return {
      title: extractDomain(url),
      content: `Failed to extract content from ${url}`
    };
  }
}
