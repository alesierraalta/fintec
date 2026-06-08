import { GET, POST, PUT, DELETE } from '@/app/api/categories/route';
import { getServerRepository } from '@/lib/backend/repository';

jest.mock('@/lib/backend/repository', () => ({
  getServerRepository: jest.fn(),
}));

describe('categories route - envelope format', () => {
  const mockGetServerRepository = getServerRepository as jest.MockedFunction<typeof getServerRepository>;

  const categories = {
    findAll: jest.fn(),
    findByKind: jest.fn(),
    findByParentId: jest.fn(),
    findActive: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    canDelete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerRepository.mockResolvedValue({
      repository: { categories },
      user: { id: 'user-1' },
    } as any);
  });

  function createRequest(url: string, init?: RequestInit) {
    return new Request(url, init) as any;
  }

  describe('GET /api/categories', () => {
    it('should return success envelope with categories', async () => {
      const mockCategories = [{ id: 'cat-1', name: 'Food' }];
      categories.findAll.mockResolvedValue(mockCategories);

      const request = createRequest('http://localhost:3000/api/categories');
      const response = await GET(request);
      const data = await response.json();

      expect(data.data.categories).toEqual(mockCategories);
      expect(data.error).toBeNull();
      expect(data.meta.timestamp).toBeDefined();
    });
  });

  describe('POST /api/categories', () => {
    it('should return success envelope with created category', async () => {
      const mockCategory = { id: 'cat-1', name: 'Food' };
      categories.create.mockResolvedValue(mockCategory);

      const request = createRequest('http://localhost:3000/api/categories', {
        method: 'POST',
        body: JSON.stringify({ name: 'Food', kind: 'EXPENSE' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data).toEqual(mockCategory);
      expect(data.error).toBeNull();
    });

    it('should return 400 envelope for missing fields', async () => {
      const request = createRequest('http://localhost:3000/api/categories', {
        method: 'POST',
        body: JSON.stringify({ name: 'Food' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 401 envelope when unauthenticated', async () => {
      mockGetServerRepository.mockResolvedValue({
        repository: { categories },
        user: null,
      } as any);

      const request = createRequest('http://localhost:3000/api/categories', {
        method: 'POST',
        body: JSON.stringify({ name: 'Food', kind: 'EXPENSE' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe('AUTH_ERROR');
    });
  });

  describe('DELETE /api/categories', () => {
    it('should return success envelope when deleted', async () => {
      categories.canDelete.mockResolvedValue(true);
      categories.delete.mockResolvedValue(undefined);

      const request = createRequest('http://localhost:3000/api/categories?id=cat-1');
      const response = await DELETE(request);
      const data = await response.json();

      expect(data.data).toBeDefined();
      expect(data.error).toBeNull();
    });

    it('should return 400 envelope when id is missing', async () => {
      const request = createRequest('http://localhost:3000/api/categories');
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 envelope when category cannot be deleted', async () => {
      categories.canDelete.mockResolvedValue(false);

      const request = createRequest('http://localhost:3000/api/categories?id=cat-1');
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
