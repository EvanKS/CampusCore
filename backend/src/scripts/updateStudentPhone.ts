import { supabase } from '../db/supabase';

async function updatePhone() {
  console.log('Updating student phone number to +919611789501...');
  
  const { data, error } = await supabase
    .from('users')
    .update({ phone: '+919611789501' })
    .or('email.ilike.%rahul.verma%,role.eq.student')
    .select('id, full_name, email, phone');

  if (error) {
    console.error('Error updating student phone:', error);
  } else {
    console.log('Updated students:', data);
  }
  process.exit(0);
}

updatePhone();
