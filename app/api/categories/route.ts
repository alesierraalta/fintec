import { NextRequest, NextResponse } from 'next/server';
import { CreateCategoryDTO } from '@/repositories/contracts';
import { CategoryKind } from '@/types';
import { getServerRepository } from '@/lib/backend/repository';
import { withErrorHandling } from '@/lib/api-middleware';
import { successResponse } from '@/lib/api-response';
import { ValidationError } from '@/lib/errors/validation-error';
import { AuthError } from '@/lib/errors/auth-error';

// GET /api/categories - Fetch all categories
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { repository } = await getServerRepository();
  const { searchParams } = new URL(request.url);
  const kind = searchParams.get('kind') as CategoryKind | null;
  const parentId = searchParams.get('parentId');
  const active = searchParams.get('active');

  let categories;

  if (kind) {
    categories = await repository.categories.findByKind(kind);
  } else if (parentId) {
    categories = await repository.categories.findByParentId(parentId);
  } else if (active === 'true') {
    categories = await repository.categories.findActive();
  } else {
    categories = await repository.categories.findAll();
  }

  return NextResponse.json(
    successResponse({ categories, count: categories.length })
  );
});

// POST /api/categories - Create new category
export const POST = withErrorHandling(async (request: NextRequest) => {
  const { repository, user } = await getServerRepository();

  if (!user) {
    throw new AuthError('Unauthorized');
  }

  const body = await request.json();

  // Validate required fields
  if (!body.name || !body.kind) {
    throw new ValidationError('Missing required fields: name, kind');
  }

  // Validate privacy rules: default categories cannot have user_id
  if (body.isDefault && body.userId) {
    throw new ValidationError('Default categories cannot have a user_id');
  }

  // Validate privacy rules: user categories cannot be default
  if (body.userId && body.isDefault) {
    throw new ValidationError('User categories cannot be marked as default');
  }

  const categoryData: CreateCategoryDTO = {
    name: body.name,
    kind: body.kind as CategoryKind,
    color: body.color || '#6b7280',
    icon: body.icon || 'Tag',
    parentId: body.parentId,
    active: body.active !== false,
    isDefault: body.isDefault || false,
  };

  const category = await repository.categories.create(categoryData);

  return NextResponse.json(
    successResponse(category),
    { status: 201 }
  );
});

// PUT /api/categories - Update category
export const PUT = withErrorHandling(async (request: NextRequest) => {
  const { repository, user } = await getServerRepository();

  if (!user) {
    throw new AuthError('Unauthorized');
  }

  const body = await request.json();

  if (!body.id) {
    throw new ValidationError('Missing required field: id');
  }

  const category = await repository.categories.update(body.id, body);

  return NextResponse.json(successResponse(category));
});

// DELETE /api/categories - Delete category
export const DELETE = withErrorHandling(async (request: NextRequest) => {
  const { repository, user } = await getServerRepository();

  if (!user) {
    throw new AuthError('Unauthorized');
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    throw new ValidationError('Missing required parameter: id');
  }

  // Check if category can be deleted
  const canDelete = await repository.categories.canDelete(id);

  if (!canDelete) {
    throw new ValidationError(
      'Cannot delete category: it has associated transactions or subcategories'
    );
  }

  await repository.categories.delete(id);

  return NextResponse.json(successResponse({ message: 'Category deleted successfully' }));
});
