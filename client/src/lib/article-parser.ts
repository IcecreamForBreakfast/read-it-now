// Frontend utility for article parsing and validation
// This complements the server-side article parser

export interface ArticleMetadata {
  title: string;
  domain: string;
  isValid: boolean;
}

export function extractDomain(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return domain.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function extractArticleMetadata(url: string): ArticleMetadata {
  const domain = extractDomain(url);
  const isValid = validateUrl(url);
  
  // Extract a potential title from the URL path
  let title = domain;
  if (isValid) {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      if (pathParts.length > 0) {
        // Use the last path segment as a potential title
        const lastPart = pathParts[pathParts.length - 1];
        if (lastPart && lastPart !== 'index.html') {
          title = lastPart
            .replace(/[-_]/g, ' ')
            .replace(/\.[^/.]+$/, '') // Remove file extension
            .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize words
        }
      }
    } catch {
      // Fallback to domain if URL parsing fails
      title = domain;
    }
  }
  
  return {
    title,
    domain,
    isValid,
  };
}

export function formatArticleUrl(url: string): string {
  // Ensure the URL has a protocol
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
}

export function getArticlePreview(content: string, maxLength: number = 150): string {
  if (!content || content.length <= maxLength) {
    return content;
  }
  
  const truncated = content.substring(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(' ');
  
  if (lastSpaceIndex > maxLength * 0.8) {
    return truncated.substring(0, lastSpaceIndex) + '...';
  }
  
  return truncated + '...';
}

export function sanitizeArticleContent(content: string): string {
  // Remove excessive whitespace and clean up the content
  return content
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
}

export function getReadingTime(content: string): number {
  // Estimate reading time based on average reading speed (200 words per minute)
  const wordsPerMinute = 200;
  const wordCount = content.split(/\s+/).length;
  const minutes = Math.ceil(wordCount / wordsPerMinute);
  return Math.max(1, minutes);
}

export function formatReadingTime(minutes: number): string {
  if (minutes < 1) return "Less than 1 min read";
  if (minutes === 1) return "1 min read";
  return `${minutes} min read`;
}
