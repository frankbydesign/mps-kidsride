import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * CRITICAL SECURITY: Server-side volunteer approval endpoint
 * Prevents client-side privilege escalation
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate and verify user is admin
    const supabaseServer = await createClient();
    const { data } = await supabaseServer.auth.getClaims();
    const user = data?.claims;

    // Verify user has valid session with sub claim (user ID)
    if (!user || !user.sub) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    // Verify requester is an approved admin
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

    // Use admin client to bypass RLS and approve volunteer
    const supabaseAdmin = createAdminClient();
    const { error: updateError } = await (supabaseAdmin
      .from('volunteers') as any)
      .update({ approved: true })
      .eq('id', volunteerId);

    if (updateError) {
      console.error('Error approving volunteer:', updateError);
      return NextResponse.json(
        { error: 'Failed to approve volunteer' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Approval error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
