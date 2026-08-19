import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

/**
 * Input Sanitization Plugin — Layer 4 Security
 *
 * Strips dangerous characters from all incoming string values before they
 * reach route handlers. Prevents:
 *  - XSS: removes <script> tags and HTML event handlers
 *  - HTML injection: strips all HTML tags
 *  - Null byte injection: removes \0 characters
 */

function sanitizeString(value: string): string {
  return value
    // Remove null bytes
    .replace(/\0/g, '')
    // Strip HTML tags (including <script>, <iframe>, <img onerror=...>, etc.)
    .replace(/<[^>]*>/g, '')
    // Remove javascript: protocol in values
    .replace(/javascript\s*:/gi, '')
    // Remove on* event handlers (onclick=, onmouseover=, etc.)
    .replace(/\bon\w+\s*=/gi, '')
    // Trim leading/trailing whitespace
    .trim();
}

function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key of Object.keys(obj)) {
      // Sanitize the key itself too (prevents prototype pollution)
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue; // Drop prototype pollution attempts entirely
      }
      sanitized[key] = sanitizeObject(obj[key]);
    }
    return sanitized;
  }

  // Numbers, booleans, etc. pass through as-is
  return obj;
}

const sanitizePlugin: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', async (request, _reply) => {
    if (request.body && typeof request.body === 'object') {
      request.body = sanitizeObject(request.body);
    }
    if (request.query && typeof request.query === 'object') {
      request.query = sanitizeObject(request.query);
    }
  });
};

export default fp(sanitizePlugin, { name: 'sanitize' });
