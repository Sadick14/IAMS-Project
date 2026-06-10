import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient, setApiAuthToken, clearApiAuthToken } from './api-client';

// Mock global fetch
global.fetch = vi.fn();

describe('API Client - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearApiAuthToken();
    localStorage.clear();
  });

  describe('Auth Logic', () => {
    it('should set and clear auth token', () => {
      setApiAuthToken('test-token');
      expect(localStorage.getItem('iams_token')).toBe('test-token');
      
      clearApiAuthToken();
      expect(localStorage.getItem('iams_token')).toBeNull();
    });

    it('should handle 401 response and redirect to login', async () => {
      // Mock window.location
      const originalLocation = window.location;
      delete (window as any).location;
      window.location = { ...originalLocation, href: '' };

      (fetch as any).mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve(JSON.stringify({ message: 'Unauthorized' })),
      });

      await apiClient.me();

      expect(window.location.href).toContain('/login?expired=true');
      expect(localStorage.getItem('iams_token')).toBeNull();

      window.location = originalLocation;
    });
  });

  describe('Field Mapping & Normalization', () => {
    it('should normalize createApplication payload to snake_case', async () => {
      const mockResponse = {
        success: true,
        data: { application: { id: 1, status: 'submitted' } },
        message: 'Success'
      };
      
      (fetch as any).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
      });

      const input = {
        companyId: '123',
        termId: '456',
        applicationType: 'individual',
        coverLetter: 'Hello world',
        preferredStartDate: '2026-06-01'
      };

      await apiClient.createApplication(input as any);

      const fetchArgs = (fetch as any).mock.calls[0];
      const body = JSON.parse(fetchArgs[1].body);

      // Verify mapping
      expect(body.company_id).toBe(123);
      expect(body.academic_term_id).toBe(456);
      expect(body.application_type).toBe('individual');
      expect(body.cover_letter).toBe('Hello world');
      expect(body.proposed_start_date).toBe('2026-06-01');
    });

    it('should normalize saveGradingConfig payload to snake_case', async () => {
      const mockResponse = {
        success: true,
        data: { config: { id: 1, status: 'draft' } },
        message: 'Success'
      };
      
      (fetch as any).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
      });

      const input = {
        departmentId: 'CS',
        termId: 'T1',
        structure: 'A',
        structureWeights: { w1: 40, w2: 30, w3: 30 },
        sectionWeights: { a: 25, b: 25, c: 25, d: 25 },
        status: 'draft'
      };

      await apiClient.saveGradingConfig(input);

      const fetchArgs = (fetch as any).mock.calls[0];
      const body = JSON.parse(fetchArgs[1].body);

      // Verify mapping
      expect(body.department_id).toBe('CS');
      expect(body.academic_term_id).toBe('T1');
      expect(body.structure_weights).toEqual({ w1: 40, w2: 30, w3: 30 });
      expect(body.section_weights).toEqual({ a: 25, b: 25, c: 25, d: 25 });
    });

    it('should normalize createTerm payload and map types', async () => {
      const mockResponse = { success: true, data: { term: { id: 1 } } };
      (fetch as any).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
      });

      const input = {
        name: 'Summer 2026',
        type: 'Vacation',
        internshipStart: '2026-06-01',
        internshipEnd: '2026-08-01'
      };

      await apiClient.createTerm(input as any);

      const body = JSON.parse((fetch as any).mock.calls[0][1].body);
      expect(body.type).toBe('short_term');
      expect(body.start_date).toBe('2026-06-01');
    });
  });

  describe('Response Unwrapping', () => {
    it('should unwrap nested entities correctly', async () => {
      const mockResponse = {
        success: true,
        data: { application: { id: 99, status: 'active' } }
      };
      
      (fetch as any).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
      });

      const res = await apiClient.createApplication({ companyId: '1' } as any);
      
      // Should be unwrapped from data.application to data
      expect(res.data?.id).toBe(99);
    });

    it('should extract collections correctly', async () => {
      const mockResponse = {
        success: true,
        data: {
          applications: [
            { id: 1, status: 'pending' },
            { id: 2, status: 'approved' }
          ]
        }
      };

      (fetch as any).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
      });

      const res = await apiClient.getApplications();

      expect(Array.isArray(res.data)).toBe(true);
      expect(res.data.length).toBe(2);
      expect(res.data[0].id).toBe(1);
    });
  });

  describe('Retry Logic with Exponential Backoff', () => {
    it('should retry on 500 error for GET requests', async () => {
      vi.useFakeTimers();

      const mockResponses = [
        { ok: false, status: 500, text: () => Promise.resolve(JSON.stringify({ message: 'Server error' })) },
        { ok: false, status: 500, text: () => Promise.resolve(JSON.stringify({ message: 'Server error' })) },
        { ok: true, status: 200, text: () => Promise.resolve(JSON.stringify({ success: true, data: { id: 1 } })) },
      ];

      let callCount = 0;
      (fetch as any).mockImplementation(() => {
        return Promise.resolve(mockResponses[callCount++]);
      });

      const responsePromise = apiClient.getApplications();

      // Fast-forward through retries
      await vi.runAllTimersAsync();

      const res = await responsePromise;

      expect((fetch as any).mock.calls.length).toBe(3);
      expect(res.success).toBe(true);

      vi.useRealTimers();
    });

    it('should not retry on POST requests with 500 error', async () => {
      (fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve(JSON.stringify({ message: 'Server error' })),
      });

      const res = await apiClient.createApplication({ companyId: '1' } as any);

      // Should only try once (POST is not idempotent)
      expect((fetch as any).mock.calls.length).toBe(1);
      expect(res.success).toBe(false);
    });

    it('should retry on network errors for GET requests', async () => {
      vi.useFakeTimers();

      let callCount = 0;
      (fetch as any).mockImplementation(() => {
        if (callCount++ === 0) {
          throw new TypeError('Network error');
        }
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(JSON.stringify({ success: true, data: { id: 1 } })),
        });
      });

      const responsePromise = apiClient.getApplications();

      await vi.runAllTimersAsync();
      const res = await responsePromise;

      expect(res.success).toBe(true);
      expect((fetch as any).mock.calls.length).toBe(2);

      vi.useRealTimers();
    });

    it('should not retry on 401 errors', async () => {
      const originalLocation = window.location;
      delete (window as any).location;
      window.location = { ...originalLocation, href: '' };

      (fetch as any).mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve(JSON.stringify({ message: 'Unauthorized' })),
      });

      await apiClient.getApplications();

      // Should only try once (401 is not retryable)
      expect((fetch as any).mock.calls.length).toBe(1);
      expect(window.location.href).toContain('/login?expired=true');

      window.location = originalLocation;
    });

    it('should handle max retries and fail gracefully', async () => {
      vi.useFakeTimers();

      (fetch as any).mockResolvedValue({
        ok: false,
        status: 503,
        text: () => Promise.resolve(JSON.stringify({ message: 'Service unavailable' })),
      });

      const responsePromise = apiClient.getApplications();

      await vi.runAllTimersAsync();
      const res = await responsePromise;

      // Should retry 3 times then fail
      expect((fetch as any).mock.calls.length).toBe(4); // Initial + 3 retries
      expect(res.success).toBe(false);

      vi.useRealTimers();
    });
  });
});
