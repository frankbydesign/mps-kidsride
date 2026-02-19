import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Server-side volunteer deletion endpoint.
 * Deletes a volunteer from auth.users (cascades to volunteers table).
 * Only accessible by approved admins; admins cannot delete themselves.
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseServer = await createClient();
    const { data } = await supabaseServer.auth.getClaims();
    const user = data?.claims;

    if (!user || !user.sub) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    const { data: admin, error: adminError } = await supabaseServer
      .from('volunteers')
      .select('is_admin, approved')
      .eq('id', user.sub)
      .single();

    if (adminError || !admin?.is_admin || !admin?.approved) {
      return NextResponse.json(
        { error: 'Forbidden - Admin privileges required' },
        { status: 403 }
      );
    }

    const { volunteerId } = await request.json();

    if (!volunteerId) {
      return NextResponse.json(
        { error: 'Missing volunteerId' },
        { status: 400 }
      );
    }

    if (volunteerId === user.sub) {
      return NextResponse.json(
        { error: 'Cannot delete yourself' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
      volunteerId
    );

    if (deleteError) {
      console.error('Error deleting volunteer:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete volunteer' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Delete volunteer error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
