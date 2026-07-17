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

describe('transfer-lead-to-human Edge Function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue(null);

    const req = new Request('http://localhost/functions/v1/transfer-lead-to-human', {
      method: 'POST',
      body: JSON.stringify({ lead_id: 'lead-1', conversation_id: 'conv-1' }),
    });

    const { default: handler } = await import('../transfer-lead-to-human/index.ts');
    const res = await handler(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('No autorizado');
  });

  it('returns 400 when lead_id is missing', async () => {
    mockGetUser.mockResolvedValue({ id: 'user-1' });

    const req = new Request('http://localhost/functions/v1/transfer-lead-to-human', {
      method: 'POST',
      body: JSON.stringify({ conversation_id: 'conv-1' }),
    });

    const { default: handler } = await import('../transfer-lead-to-human/index.ts');
    const res = await handler(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('lead_id y conversation_id son requeridos');
  });

  it('returns 400 when conversation_id is missing', async () => {
    mockGetUser.mockResolvedValue({ id: 'user-1' });

    const req = new Request('http://localhost/functions/v1/transfer-lead-to-human', {
      method: 'POST',
      body: JSON.stringify({ lead_id: 'lead-1' }),
    });

    const { default: handler } = await import('../transfer-lead-to-human/index.ts');
    const res = await handler(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('lead_id y conversation_id son requeridos');
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

    const req = new Request('http://localhost/functions/v1/transfer-lead-to-human', {
      method: 'POST',
      body: JSON.stringify({ lead_id: 'lead-1', conversation_id: 'conv-1' }),
    });

    const { default: handler } = await import('../transfer-lead-to-human/index.ts');
    const res = await handler(req);

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Lead no encontrado');
  });

  it('transfers lead successfully', async () => {
    mockGetUser.mockResolvedValue({ id: 'user-1' });
    
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'crm_leads') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ 
                data: { lead_id: 'lead-1', tenant_id: 'tenant-1', assigned_to: 'agent-1', status: 'new' }, 
                error: null 
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({}),
          }),
        };
      }
      if (table === 'crm_ai_qualification_sessions') {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({}),
            }),
          }),
        };
      }
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { full_name: 'Agente Test' } }),
            }),
          }),
        };
      }
      if (table === 'chat_messages') {
        return {
          insert: vi.fn().mockResolvedValue({}),
        };
      }
      if (table === 'crm_activities') {
        return {
          insert: vi.fn().mockResolvedValue({}),
        };
      }
      return {};
    });

    const req = new Request('http://localhost/functions/v1/transfer-lead-to-human', {
      method: 'POST',
      body: JSON.stringify({ lead_id: 'lead-1', conversation_id: 'conv-1' }),
    });

    const { default: handler } = await import('../transfer-lead-to-human/index.ts');
    const res = await handler(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('changes lead status from new to contacted', async () => {
    mockGetUser.mockResolvedValue({ id: 'user-1' });
    
    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({}),
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'crm_leads') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ 
                data: { lead_id: 'lead-1', tenant_id: 'tenant-1', assigned_to: 'agent-1', status: 'new' }, 
                error: null 
              }),
            }),
          }),
          update: updateMock,
        };
      }
      return {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({}),
          }),
        }),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { full_name: 'Agente' } }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({}),
      };
    });

    const req = new Request('http://localhost/functions/v1/transfer-lead-to-human', {
      method: 'POST',
      body: JSON.stringify({ lead_id: 'lead-1', conversation_id: 'conv-1' }),
    });

    const { default: handler } = await import('../transfer-lead-to-human/index.ts');
    await handler(req);

    expect(updateMock).toHaveBeenCalledWith({ status: 'contacted' });
  });

  it('handles OPTIONS request', async () => {
    const req = new Request('http://localhost/functions/v1/transfer-lead-to-human', {
      method: 'OPTIONS',
    });

    const { default: handler } = await import('../transfer-lead-to-human/index.ts');
    const res = await handler(req);

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('ok');
  });
});
