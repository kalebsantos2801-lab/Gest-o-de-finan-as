const { createClient } = require('@supabase/supabase-js');

const DEFAULT_SUPABASE_URL = 'https://pelzofhwzcnzgmnlijaz.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlbHpvZmh3emNuemdtbmxpamF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3NzEwOTIsImV4cCI6MjEwMzM0NzA5Mn0.hCpoQUha_pnKqYtpKPpleF9k3ZX2VVSxJAdIHTlmtFE';

const supabase = createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY);

async function run() {
  console.log('Fetching an item from notifications to see column structure...');
  const { data, error } = await supabase.from('notifications').select('*').limit(1);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Sample data:', data);
    if (data && data.length > 0) {
      console.log('Columns:', Object.keys(data[0]));
    } else {
      console.log('Table is empty. Let us check the Postgrest OpenAPI/schema by querying with a select of id.');
      const res = await supabase.from('notifications').select('id').limit(1);
      console.log('Select id res:', res);
    }
  }
}

run();
