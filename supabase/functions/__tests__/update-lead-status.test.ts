import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSupabase = {
  from: vi.fn(),
};

const mockGetUser = vi.fn();
const mockCreateServiceClient = vi.fn(() => mockSupabase);

vi.mock('../_shared/auth.ts', () => ({
  getUser: mockGetUser,
  createServiceClient: mockCreateServiceClient,
}));

vi.mock('../_shared/cors.ts', () => ({
  getCorsHeaders: vi.fn(() => ({
    'Access-Control-Allow-Origin': '*',
  })),
}));

describe('update-lead-status Edge Function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue(null);

    const req = new Request('http://localhost/functions/v1/update-lead-status', {
      method: 'POST',
      body: JSON.stringify({ lead_id: 'lead-1', status: 'qualified' }),
    });

    const { default: handler } = await import('../update-lead-status/index.ts');
    const res = await handler(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('No autorizado');
  });

  it('returns 400 when lead_id is missing', async () => {
    mockGetUser.mockResolvedValue({ id: 'user-1' });

    const req = new Request('http://localhost/functions/v1/update-lead-status', {
      method: 'POST',
      body: JSON.stringify({ status: 'qualified' }),
    });

    const { default: handler } = await import('../update-lead-status/index.ts');
    const res = await handler(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('lead_id y status son requeridos');
  });

  it('returns 400 when status is invalid', async () => {
    mockGetUser.mockResolvedValue({ id: 'user-1' });

    const req = new Request('http://localhost/functions/v1/update-lead-status', {
      method: 'POST',
      body: JSON.stringify({ lead_id: 'lead-1', status: 'invalid' }),
    });

    const { default: handler } = await import('../update-lead-status/index.ts');
    const res = await handler(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Status invalido');
  });

  it('returns 404 when lead does not exist', async () => {
    mockGetUser.mockResolvedValue({ id: 'user-1' });
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: new Error('Not found') }),
        }),
      }),
    });

    const req = new Request('http://localhost/functions/v1/update-lead-status', {
      method: 'POST',
      body: JSON.stringify({ lead_id: 'lead-1', status: 'qualified' }),
    });

    const { default: handler } = await import('../update-lead-status/index.ts');
    const res = await handler(req);

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Lead no encontrado');
  });

  it('updates status successfully', async () => {
    mockGetUser.mockResolvedValue({ id: 'user-1' });
    
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'crm_leads') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ 
                data: { lead_id: 'lead-1', tenant_id: 'tenant-1', status: 'new' }, 
                error: null 
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({}),
          }),
        };
      }
      return {};
    });

    const req = new Request('http://localhost/functions/v1/update-lead-status', {
      method: 'POST',
      body: JSON.stringify({ lead_id: 'lead-1', status: 'qualified' }),
    });

    const { default: handler } = await import('../update-lead-status/index.ts');
    const res = await handler(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.status).toBe('qualified');
  });

  it('accepts all valid statuses', async () => {
    const validStatuses = ['new', 'contacted', 'qualified', 'proposal_sent', 'won', 'lost'];
    
    for (const status of validStatuses) {
      mockGetUser.mockResolvedValue({ id: 'user-1' });
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ 
              data: { lead_id: 'lead-1', tenant_id: 'tenant-1', status: 'new' }, 
              error: null 
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({}),
        }),
      });

      const req = new Request('http://localhost/functions/v1/update-lead-status', {
        method: 'POST',
        body: JSON.stringify({ lead_id: 'lead-1', status }),
      });

      const { default: handler } = await import('../update-lead-status/index.ts');
      const res = await handler(req);

      expect(res.status).toBe(200);
    }
  });

  it('handles OPTIONS request', async () => {
    const req = new Request('http://localhost/functions/v1/update-lead-status', {
      method: 'OPTIONS',
    });

    const { default: handler } = await import('../update-lead-status/index.ts');
    const res = await handler(req);

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('ok');
  });
});
