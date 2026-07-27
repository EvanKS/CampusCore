/**
 * Diagnostic script: checks DB phone numbers and sends a test WhatsApp message.
 * Run: npx ts-node src/scripts/testWhatsApp.ts
 */
import 'dotenv/config';
import twilio from 'twilio';
import { supabase } from '../db/supabase';

async function main() {
  console.log('\n=== CampusFlow WhatsApp Diagnostic ===\n');

  // 1. Check Twilio credentials
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

  console.log(`TWILIO_ACCOUNT_SID  : ${sid ? sid.slice(0, 8) + '...' : '❌ MISSING'}`);
  console.log(`TWILIO_AUTH_TOKEN   : ${token ? token.slice(0, 6) + '...' : '❌ MISSING'}`);
  console.log(`TWILIO_WHATSAPP_FROM: ${from}`);

  // 2. Check phones in DB
  console.log('\n--- Users with phone numbers ---');
  const { data: users, error } = await supabase
    .from('users')
    .select('id, full_name, email, role, phone, notification_prefs, is_active')
    .not('phone', 'is', null);

  if (error) {
    console.error('DB error:', error.message);
  } else if (!users || users.length === 0) {
    console.log('❌ No users have a phone number stored in the DB!');
    console.log('   → Users registered without a phone, or the phone column is empty.');
  } else {
    for (const u of users) {
      const prefs = u.notification_prefs as { whatsapp?: boolean } | null;
      const wa = prefs === null || prefs === undefined
        ? '✅ default (enabled)'
        : (prefs.whatsapp !== false ? '✅ enabled' : '❌ disabled');
      console.log(`  [${u.role}] ${u.full_name} | phone: ${u.phone} | whatsapp pref: ${wa} | active: ${u.is_active}`);
    }
  }

  // 3. Try sending a test message to the first phone found
  const target = users?.find(u => u.phone);
  if (!target) {
    console.log('\n❌ Cannot run WhatsApp test — no phone numbers found in DB.');
    process.exit(1);
  }

  const toNumber = target.phone!.startsWith('whatsapp:') ? target.phone! : `whatsapp:${target.phone}`;
  console.log(`\n--- Sending test WhatsApp to ${toNumber} ---`);

  try {
    const client = twilio(sid, token);
    const msg = await client.messages.create({
      from,
      to: toNumber,
      body: `🧪 CampusFlow Test\n\nThis is a diagnostic message sent at ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}.\n\nIf you received this, WhatsApp notifications are working! ✅`,
    });
    console.log(`✅ Message sent! SID: ${msg.sid} | Status: ${msg.status}`);
  } catch (err: unknown) {
    const e = err as { code?: number; message?: string; moreInfo?: string };
    console.error(`\n❌ Twilio Error:`);
    console.error(`   Code   : ${e.code}`);
    console.error(`   Message: ${e.message}`);
    console.error(`   Info   : ${e.moreInfo}`);

    if (e.code === 63007 || e.code === 21408) {
      console.error('\n💡 FIX: The recipient has NOT opted into the Twilio Sandbox.');
      console.error('   Ask them to WhatsApp: +14155238886');
      console.error('   with the message: join <your-sandbox-keyword>');
      console.error('   (Find the keyword at Twilio Console → Messaging → Try it out → Send a WhatsApp message)');
    } else if (e.code === 21211 || e.code === 21614) {
      console.error('\n💡 FIX: Invalid phone number format. Use E.164 format: +91XXXXXXXXXX');
    } else if (e.code === 20003) {
      console.error('\n💡 FIX: Auth failed. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env');
    }
  }

  process.exit(0);
}

main().catch(console.error);
