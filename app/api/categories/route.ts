import { NextRequest, NextResponse } from 'next/server';
import { SupabaseAppRepository } from '@/repositories/supabase';
import { CreateCategoryDTO } from '@/repositories/contracts';
import { CategoryKind } from '@/types';

const repository = new SupabaseAppRepository();

// GET /api/categories - Fetch all categories
export async function GET(request: NextRequest) {
  try {
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
    
    return NextResponse.json({
      success: true,
      data: categories,
      count: categories.length
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch categories', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/categories - Create new category
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.kind) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: name, kind' 
        },
        { status: 400 }
      );
    }
    
    const categoryData: CreateCategoryDTO = {
      name: body.name,
      kind: body.kind as CategoryKind,
      color: body.color || '#6b7280',
      icon: body.icon || 'Tag',
      parentId: body.parentId,
      active: body.active !== false // Default to true
    };
    
    const category = await repository.categories.create(categoryData);
    
    return NextResponse.json({
      success: true,
      data: category,
      message: 'Category created successfully'
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create category', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT /api/categories - Update category
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required field: id' 
        },
        { status: 400 }
      );
    }
    
    const category = await repository.categories.update(body.id, body);
    
    return NextResponse.json({
      success: true,
      data: category,
      message: 'Category updated successfully'
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update category', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/categories - Delete category
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required parameter: id' 
        },
        { status: 400 }
      );
    }
    
    // Check if category can be deleted
    const canDelete = await repository.categories.canDelete(id);
    
    if (!canDelete) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cannot delete category: it has associated transactions or subcategories' 
        },
        { status: 400 }
      );
    }
    
    await repository.categories.delete(id);
    
    return NextResponse.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete category', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}