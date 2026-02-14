import { describe, it, expect } from 'vitest';
import * as http from './http.js';

describe('HTTP Client', () => {
  it('initializes without errors', () => {
    expect(() => http.init('https://api.example.com')).not.toThrow();
  });

  it('handles network errors gracefully', async () => {
    http.init('https://invalid-domain-12345.test');
    
    const result = await http.get('/test', { showFeedback: false });
    
    // Should return error result, not throw
    expect(result.success).toBe(false);
  });
});
