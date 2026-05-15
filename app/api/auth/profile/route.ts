import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  createServerAppRepository,
  createServerUsersProfileRepository,
} from '@/repositories/factory';

type SelfServiceProfileUpdate = {
  name?: string;
  baseCurrency?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function buildSelfServiceProfileUpdate(
  body: unknown
): SelfServiceProfileUpdate {
  const update: SelfServiceProfileUpdate = {};

  if (!isRecord(body)) {
    return update;
  }

  if (body.name !== undefined) {
    update.name = String(body.name);
  }

  if (body.baseCurrency !== undefined) {
    update.baseCurrency = String(body.baseCurrency);
  }

  return update;
}

function hasProfileUpdateFields(update: SelfServiceProfileUpdate) {
  return Object.keys(update).length > 0;
}

function getWelcomeNotifications(userId: string, userName: string) {
  return [
    {
      user_id: userId,
      title: `¡Bienvenido/a ${userName}! 🎉`,
      message:
        'Tu cuenta ha sido creada exitosamente. ¡Estás listo/a para gestionar tus finanzas de manera inteligente!',
      type: 'success' as const,
      action_url: '/profile',
    },
    {
      user_id: userId,
      title: 'Comienza tu viaje financiero 💰',
      message:
        'Te recomendamos empezar creando tus primeras cuentas y categorías para organizar mejor tus finanzas.',
      type: 'info' as const,
      action_url: '/accounts',
    },
    {
      user_id: userId,
      title: 'Tutorial disponible 📚',
      message:
        'Aprende a usar todas las funciones con nuestro tutorial interactivo. ¡No te pierdas ninguna característica!',
      type: 'info' as const,
    },
  ];
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const usersProfileRepository = createServerUsersProfileRepository({
      supabase,
    });

    await usersProfileRepository.upsert({
      id: user.id,
      email: user.email || '',
      name: body?.name || user.user_metadata?.name || user.email?.split('@')[0],
      baseCurrency: body?.baseCurrency || 'USD',
    });

    if (body?.createWelcomeNotifications) {
      const appRepository = createServerAppRepository({ supabase });
      const userName = body?.name || user.email?.split('@')[0] || 'Usuario';

      for (const notification of getWelcomeNotifications(user.id, userName)) {
        await appRepository.notifications.create(user.id, {
          title: notification.title,
          message: notification.message,
          type: notification.type,
          action_url: notification.action_url,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to upsert profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    const profileUpdate = buildSelfServiceProfileUpdate(body);

    if (!hasProfileUpdateFields(profileUpdate)) {
      return NextResponse.json(
        {
          success: false,
          error: 'No valid profile fields provided',
        },
        { status: 400 }
      );
    }

    const usersProfileRepository = createServerUsersProfileRepository({
      supabase,
    });

    await usersProfileRepository.update(user.id, profileUpdate);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update profile' },
      { status: 500 }
    );
  }
}
