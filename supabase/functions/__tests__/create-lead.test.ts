import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSupabase = {
  from: vi.fn(),
  rpc: vi.fn(),
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

describe('create-lead Edge Function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue(null);

    const req = new Request('http://localhost/functions/v1/create-lead', {
      method: 'POST',
      body: JSON.stringify({ package_id: 'pkg-1' }),
    });

    const { default: handler } = await import('../create-lead/index.ts');
    const res = await handler(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('No autorizado');
  });

  it('returns 400 when package_id is missing', async () => {
    mockGetUser.mockResolvedValue({ id: 'user-1' });

    const req = new Request('http://localhost/functions/v1/create-lead', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const { default: handler } = await import('../create-lead/index.ts');
    const res = await handler(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('package_id es requerido');
  });

  it('returns 404 when package does not exist', async () => {
    mockGetUser.mockResolvedValue({ id: 'user-1' });
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: new Error('Not found') }),
          }),
        }),
      }),
    });

    const req = new Request('http://localhost/functions/v1/create-lead', {
      method: 'POST',
      body: JSON.stringify({ package_id: 'pkg-1' }),
    });

    const { default: handler } = await import('../create-lead/index.ts');
    const res = await handler(req);

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Paquete no encontrado o no disponible');
  });

  it('creates lead successfully', async () => {
    mockGetUser.mockResolvedValue({ id: 'user-1' });
    
    const mockPackage = {
      package_id: 'pkg-1',
      tenant_id: 'tenant-1',
      title: 'Cancún All-Inclusive',
      region: 'Caribe Mexicano',
      price: 30000,
      currency: 'MXN',
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'travel_packages') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockPackage, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { full_name: 'Juan Pérez' } }),
            }),
          }),
        };
      }
      if (table === 'crm_leads') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { lead_id: 'lead-1' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'crm_activities') {
        return {
          insert: vi.fn().mockResolvedValue({}),
        };
      }
      if (table === 'crm_ai_qualification_sessions') {
        return {
          insert: vi.fn().mockResolvedValue({}),
        };
      }
      if (table === 'chat_messages') {
        return {
          insert: vi.fn().mockResolvedValue({}),
        };
      }
      if (table === 'notifications') {
        return {
          insert: vi.fn().mockResolvedValue({}),
        };
      }
      return {};
    });

    mockSupabase.rpc.mockResolvedValue({ data: 'agent-1' });

    const req = new Request('http://localhost/functions/v1/create-lead', {
      method: 'POST',
      body: JSON.stringify({ package_id: 'pkg-1' }),
    });

    const { default: handler } = await import('../create-lead/index.ts');
    const res = await handler(req);

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.lead_id).toBe('lead-1');
    expect(body.conversation_id).toBeDefined();
    expect(body.assigned_to).toBe('agent-1');
  });

  it('handles OPTIONS request', async () => {
    const req = new Request('http://localhost/functions/v1/create-lead', {
      method: 'OPTIONS',
    });

    const { default: handler } = await import('../create-lead/index.ts');
    const res = await handler(req);

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('ok');
  });
});
