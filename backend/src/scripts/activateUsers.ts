/**
 * Activates all users whose is_active = false but have a real phone number.
 * Run: npx ts-node --project tsconfig.json src/scripts/activateUsers.ts
 */
import 'dotenv/config';
import { supabase } from '../db/supabase';

async function main() {
  console.log('\n=== Activating Inactive Real Users ===\n');

  // Find inactive users with real phones
  const { data: inactive } = await supabase
    .from('users')
    .select('id, full_name, email, role, phone, is_active')
    .eq('is_active', false)
    .not('phone', 'is', null);

  console.log(`Found ${inactive?.length ?? 0} inactive users with phones:`);
  for (const u of inactive ?? []) {
    console.log(`  [${u.role}] ${u.full_name} (${u.email}) — phone: ${u.phone}`);
  }

  if (!inactive || inactive.length === 0) {
    console.log('Nothing to fix.');
    process.exit(0);
  }

  const ids = inactive.map(u => u.id);
  const { error } = await supabase
    .from('users')
    .update({ is_active: true })
    .in('id', ids);

  if (error) {
    console.error('❌ Failed:', error.message);
  } else {
    console.log(`\n✅ Activated ${ids.length} users.`);
  }

  process.exit(0);
}

main().catch(console.error);
