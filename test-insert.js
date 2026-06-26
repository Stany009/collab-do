
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'stanyd910+test@gmail.com',
    password: 'TestPassword123!',
  });

  if (authError) {
    console.error('Login error:', authError);
    return;
  }

  console.log('Logged in as:', authData.user.id);

  const { data, error } = await supabase.from('lists').insert([
    { title: 'Node Test List', owner_id: authData.user.id }
  ]).select();

  console.log('Insert result:', { data, error });
}

test();
