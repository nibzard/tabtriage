import { logger } from '@/utils/logger';

/**
 * URL Sanitization Service
 * Cleans URLs by removing tracking parameters, tokens, and unnecessary query strings
 */

// Common tracking parameters to remove
const TRACKING_PARAMS = new Set([
  // Analytics and tracking
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'utm_name', 'utm_cid', 'utm_reader', 'utm_referrer',
  'gclid', 'gclsrc', 'dclid', 'wbraid', 'gbraid',
  'fbclid', 'igshid', 'twclid', 'li_fat_id',
  'mc_cid', 'mc_eid', '_ga', '_gl',
  
  // Social media tracking
  'ref', 'ref_src', 'ref_url', 'referrer',
  'share', 'shared', 'via', 'from',
  'source', 'medium', 'campaign',
  
  // Email and newsletter tracking
  'email_source', 'email_campaign', 'newsletter',
  'mkt_tok', 'trk', 'trkid', 'trkinfo',
  
  // Session and temporary tokens
  'session', 'sessionid', 'sess', 'token', 'auth_token',
  'access_token', 'sharing_token', 'share_token',
  'temp_token', 'tmp_token', 'nonce',
  
  // Affiliate and referral tracking
  'affiliate', 'aff', 'ref_id', 'referral',
  'partner', 'promo', 'discount',
  
  // Platform-specific tracking
  'hl', 'gl', 'ie', 'oe', // Google
  'feature', 't', 'app', // YouTube
  'si', 'context', // Spotify
  'version', 'v', 'ver', // Generic version
  
  // Timestamps and cache busters
  'timestamp', 'ts', 'time', '_t', 'cb', 'cachebuster',
  
  // Debug and testing
  'debug', 'test', 'preview', 'draft'
]);

// Parameters that should be preserved for functionality
const PRESERVE_PARAMS = new Set([
  // Essential query parameters
  'q', 'query', 'search', 's',
  'id', 'user_id', 'item_id', 'post_id', 'product_id',
  'page', 'p', 'offset', 'limit', 'size',
  'sort', 'order', 'filter', 'category', 'type',
  'lang', 'language', 'locale', 'region',
  'format', 'output', 'view', 'mode',
  
  // Platform-specific essential params
  'v', // YouTube video ID (when it's the main identifier)
  'list', // YouTube playlist
  'index', // YouTube playlist index
  'doi', // Academic papers DOI
  'isbn', // Book identifier
  'pmid', // PubMed ID
  'arxiv', // ArXiv paper ID
]);

// Domains that require special handling
const SPECIAL_DOMAINS = {
  'doi.org': {
    preserveParams: ['*'], // Preserve all params for DOI links
    cleanPath: false
  },
  'pubmed.ncbi.nlm.nih.gov': {
    preserveParams: ['term', 'sort', 'size', 'pmid'],
    cleanPath: false
  },
  'arxiv.org': {
    preserveParams: ['*'],
    cleanPath: false
  },
  'scholar.google.com': {
    preserveParams: ['q', 'hl', 'as_sdt', 'cluster'],
    cleanPath: false
  },
  'youtube.com': {
    preserveParams: ['v', 'list', 'index', 't'],
    cleanPath: false
  },
  'youtu.be': {
    preserveParams: ['t'],
    cleanPath: false
  },
  'github.com': {
    preserveParams: ['tab', 'readme-ov-file'],
    cleanPath: false
  },
  'stackoverflow.com': {
    preserveParams: ['*'], // SO URLs are usually fine
    cleanPath: false
  },
  'amazon.com': {
    preserveParams: ['*'], // Amazon URLs often break without params
    cleanPath: false
  }
};

export interface SanitizationResult {
  originalUrl: string;
  sanitizedUrl: string;
  removedParams: string[];
  wasModified: boolean;
  domain: string;
}

/**
 * Sanitize a URL by removing tracking parameters and cleaning up the structure
 */
export function sanitizeUrl(urlString: string): SanitizationResult {
  const result: SanitizationResult = {
    originalUrl: urlString,
    sanitizedUrl: urlString,
    removedParams: [],
    wasModified: false,
    domain: ''
  };

  try {
    const url = new URL(urlString);
    result.domain = url.hostname;

    // Check if domain has special handling rules
    const domainRules = SPECIAL_DOMAINS[url.hostname] || 
                       SPECIAL_DOMAINS[url.hostname.replace('www.', '')];

    if (domainRules?.preserveParams.includes('*')) {
      // Preserve all parameters for this domain
      return result;
    }

    // Process query parameters
    const preserveParams = domainRules?.preserveParams || [];
    const newParams = new URLSearchParams();
    const removedParams: string[] = [];

    for (const [key, value] of url.searchParams) {
      const keyLower = key.toLowerCase();
      
      // Check if this parameter should be preserved
      if (PRESERVE_PARAMS.has(keyLower) || preserveParams.includes(key)) {
        newParams.set(key, value);
      } else if (TRACKING_PARAMS.has(keyLower)) {
        // This is a known tracking parameter
        removedParams.push(key);
      } else if (isLikelyTrackingParam(key, value)) {
        // This looks like a tracking parameter
        removedParams.push(key);
      } else {
        // When in doubt, preserve the parameter
        newParams.set(key, value);
      }
    }

    // Update the URL with cleaned parameters
    url.search = newParams.toString();

    // Clean up the URL structure
    const sanitizedUrl = cleanUrlStructure(url.toString());

    result.sanitizedUrl = sanitizedUrl;
    result.removedParams = removedParams;
    result.wasModified = removedParams.length > 0 || sanitizedUrl !== urlString;

    if (result.wasModified) {
      logger.debug(`Sanitized URL: ${urlString} -> ${sanitizedUrl}`, {
        removedParams: removedParams
      });
    }

    return result;

  } catch (error) {
    logger.warn(`Failed to sanitize URL: ${urlString}`, error);
    return result;
  }
}

/**
 * Check if a parameter looks like tracking based on its name and value
 */
function isLikelyTrackingParam(key: string, value: string): boolean {
  const keyLower = key.toLowerCase();
  
  // Check for tracking-like patterns in key names
  const trackingPatterns = [
    /^utm_/, /^ga_/, /^fb/, /^tw/, /^ig/,
    /track/, /campaign/, /source/, /medium/,
    /token/, /session/, /auth/, /temp/,
    /affiliate/, /promo/, /ref/,
    /timestamp/, /cache/, /debug/
  ];

  for (const pattern of trackingPatterns) {
    if (pattern.test(keyLower)) {
      return true;
    }
  }

  // Check for tracking-like patterns in values
  if (value.length > 50 && /^[a-zA-Z0-9+/=_-]+$/.test(value)) {
    // Looks like a long encoded token
    return true;
  }

  return false;
}

/**
 * Clean up URL structure (remove fragments, fix encoding, etc.)
 */
function cleanUrlStructure(url: string): string {
  try {
    const urlObj = new URL(url);
    
    // Remove fragment (hash) unless it's meaningful
    if (urlObj.hash && !isMeaningfulFragment(urlObj.hash)) {
      urlObj.hash = '';
    }

    // Clean up path encoding
    urlObj.pathname = decodeURIComponent(urlObj.pathname);

    // Remove trailing slashes unless it's the root
    if (urlObj.pathname !== '/' && urlObj.pathname.endsWith('/')) {
      urlObj.pathname = urlObj.pathname.slice(0, -1);
    }

    return urlObj.toString();
  } catch {
    return url;
  }
}

/**
 * Check if a URL fragment (hash) is meaningful and should be preserved
 */
function isMeaningfulFragment(fragment: string): boolean {
  // Preserve fragments that look like section anchors or meaningful navigation
  return fragment.length > 1 && 
         fragment.length < 50 && 
         /^#[a-zA-Z][\w-]*$/.test(fragment);
}

/**
 * Batch sanitize multiple URLs
 */
export function sanitizeUrls(urls: string[]): SanitizationResult[] {
  return urls.map(url => sanitizeUrl(url));
}

/**
 * Get sanitization statistics for a batch of URLs
 */
export function getSanitizationStats(results: SanitizationResult[]) {
  const total = results.length;
  const modified = results.filter(r => r.wasModified).length;
  const totalParamsRemoved = results.reduce((sum, r) => sum + r.removedParams.length, 0);
  
  const domainStats = results.reduce((stats, r) => {
    stats[r.domain] = (stats[r.domain] || 0) + 1;
    return stats;
  }, {} as Record<string, number>);

  return {
    total,
    modified,
    modificationRate: total > 0 ? (modified / total) * 100 : 0,
    totalParamsRemoved,
    avgParamsRemovedPerUrl: total > 0 ? totalParamsRemoved / total : 0,
    domainStats
  };
}