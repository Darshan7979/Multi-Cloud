const { createClient } = require('@supabase/supabase-js');

let supabase;

const initSupabase = () => {
    if (supabase) return supabase;

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase URL and Key are required');
    }

    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✓ Supabase client initialized');
    return supabase;
};

module.exports = { initSupabase };
