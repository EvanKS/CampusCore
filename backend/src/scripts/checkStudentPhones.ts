import { supabase } from '../db/supabase';

async function checkPhones() {
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, email, role, phone');

  if (error) {
    console.error('Error fetching users:', error);
  } else {
    console.log('All Users and Phone Numbers in Database:');
    console.table(data);
  }
  process.exit(0);
}

checkPhones();
