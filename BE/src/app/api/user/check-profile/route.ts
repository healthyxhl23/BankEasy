// app/api/user/check-profile/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if supabaseAdmin is available
    if (!supabaseAdmin) {
      console.error('Supabase admin client not initialized');
      return NextResponse.json({ 
        onboarded: false, 
        error: 'Database connection issue' 
      });
    }

    // Check if profile exists
    const { data: profile, error: selectError } = await supabaseAdmin
      .from('profiles')
      .select('onboarded')
      .eq('user_id', session.user.id)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      console.error('Error checking profile:', selectError);
      return NextResponse.json({ 
        onboarded: false, 
        error: 'Database error' 
      });
    }

    // If no profile exists, create one
    if (!profile) {
      const { error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert({
          user_id: session.user.id,
          onboarded: false
        });

      if (insertError) {
        console.error('Error creating profile:', insertError);
        return NextResponse.json({ 
          onboarded: false, 
          error: 'Failed to create profile' 
        });
      }

      return NextResponse.json({ onboarded: false, newUser: true });
    }

    return NextResponse.json({ 
      onboarded: profile.onboarded === true 
    });
  } catch (error) {
    console.error('Profile check error:', error);
    return NextResponse.json({ 
      onboarded: false, 
      error: 'Server error' 
    });
  }
}