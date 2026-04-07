import { DELETE, GET, POST, PUT } from '@/app/api/categories/route';
import { createClient } from '@/lib/supabase/server';
import { createServerAppRepository } from '@/repositories/factory';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/repositories/factory', () => ({
  createServerAppRepository: jest.fn(),
}));

describe('categories route handlers', () => {
  const mockCreateClient = createClient as jest.MockedFunction<
    typeof createClient
  >;
  const mockCreateServerAppRepository =
    createServerAppRepository as jest.MockedFunction<
      typeof createServerAppRepository
    >;

  const categories = {
    findAll: jest.fn(),
    findByKind: jest.fn(),
    findByParentId: jest.fn(),
    findActive: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    canDelete: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
    } as any);
    mockCreateServerAppRepository.mockReturnValue({ categories } as any);
  });

  it('lists categories across all GET branches', async () => {
    categories.findAll.mockResolvedValue([{ id: 'all' }]);
    categories.findByKind.mockResolvedValue([{ id: 'kind' }]);
    categories.findByParentId.mockResolvedValue([{ id: 'parent' }]);
    categories.findActive.mockResolvedValue([{ id: 'active' }]);

    await GET(new Request('http://localhost/api/categories') as any);
    await GET(
      new Request('http://localhost/api/categories?kind=expense') as any
    );
    await GET(
      new Request('http://localhost/api/categories?parentId=parent-1') as any
    );
    await GET(
      new Request('http://localhost/api/categories?active=true') as any
    );

    expect(categories.findAll).toHaveBeenCalled();
    expect(categories.findByKind).toHaveBeenCalledWith('expense');
    expect(categories.findByParentId).toHaveBeenCalledWith('parent-1');
    expect(categories.findActive).toHaveBeenCalled();
  });

  it('creates a category with defaults', async () => {
    categories.create.mockResolvedValue({ id: 'cat-1' });

    const response = await POST(
      new Request('http://localhost/api/categories', {
        method: 'POST',
        body: JSON.stringify({ name: 'Groceries', kind: 'expense' }),
      }) as any
    );

    expect(response.status).toBe(201);
    expect(categories.create).toHaveBeenCalledWith({
      name: 'Groceries',
      kind: 'expense',
      color: '#6b7280',
      icon: 'Tag',
      parentId: undefined,
      active: true,
      isDefault: false,
    });
  });

  it('rejects category creation without auth or required fields', async () => {
    mockCreateClient.mockResolvedValueOnce({
      auth: {
        getUser: jest
          .fn()
          .mockResolvedValue({ data: { user: null }, error: null }),
      },
    } as any);

    const unauthorized = await POST(
      new Request('http://localhost/api/categories', {
        method: 'POST',
        body: JSON.stringify({ name: 'Groceries', kind: 'expense' }),
      }) as any
    );
    const invalid = await POST(
      new Request('http://localhost/api/categories', {
        method: 'POST',
        body: JSON.stringify({ name: 'Groceries' }),
      }) as any
    );

    expect(unauthorized.status).toBe(401);
    expect(invalid.status).toBe(400);
  });

  it('rejects invalid default/user privacy combinations', async () => {
    const response = await POST(
      new Request('http://localhost/api/categories', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Invalid',
          kind: 'expense',
          isDefault: true,
          userId: 'user-1',
        }),
      }) as any
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Default categories cannot have a user_id');
  });

  it('updates categories by body id', async () => {
    categories.update.mockResolvedValue({ id: 'cat-1' });

    const response = await PUT(
      new Request('http://localhost/api/categories', {
        method: 'PUT',
        body: JSON.stringify({ id: 'cat-1', name: 'Updated' }),
      }) as any
    );

    expect(response.status).toBe(200);
    expect(categories.update).toHaveBeenCalledWith('cat-1', {
      id: 'cat-1',
      name: 'Updated',
    });
  });

  it('rejects category updates without id', async () => {
    const response = await PUT(
      new Request('http://localhost/api/categories', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated' }),
      }) as any
    );

    expect(response.status).toBe(400);
  });

  it('prevents deletion when category is still in use', async () => {
    categories.canDelete.mockResolvedValue(false);

    const response = await DELETE(
      new Request('http://localhost/api/categories?id=cat-1', {
        method: 'DELETE',
      }) as any
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('Cannot delete category');
    expect(categories.delete).not.toHaveBeenCalled();
  });

  it('deletes removable categories and validates missing id', async () => {
    categories.canDelete.mockResolvedValue(true);

    const ok = await DELETE(
      new Request('http://localhost/api/categories?id=cat-1', {
        method: 'DELETE',
      }) as any
    );
    const missing = await DELETE(
      new Request('http://localhost/api/categories', {
        method: 'DELETE',
      }) as any
    );

    expect(ok.status).toBe(200);
    expect(categories.delete).toHaveBeenCalledWith('cat-1');
    expect(missing.status).toBe(400);
  });
});
