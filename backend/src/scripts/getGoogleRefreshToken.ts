/**
 * Google Calendar OAuth2 Setup Helper
 * 
 * Step 1: Fill in your CLIENT_ID and CLIENT_SECRET below (from Google Cloud Console)
 * Step 2: Run: npx ts-node --project tsconfig.json src/scripts/getGoogleRefreshToken.ts
 * Step 3: Open the URL it prints, authorize, paste the code back
 * Step 4: Copy the refresh_token into your .env as GOOGLE_CALENDAR_REFRESH_TOKEN
 */
import 'dotenv/config';
import { google } from 'googleapis';
import * as readline from 'readline';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob'; // Desktop/manual flow

async function main() {
  if (!CLIENT_ID || CLIENT_ID.includes('your_')) {
    console.error('❌ GOOGLE_CLIENT_ID is not set in .env');
    console.error('   Follow the setup guide first.');
    process.exit(1);
  }
  if (!CLIENT_SECRET || CLIENT_SECRET.includes('your_')) {
    console.error('❌ GOOGLE_CLIENT_SECRET is not set in .env');
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar'],
  });

  console.log('\n=== Google Calendar OAuth2 Setup ===\n');
  console.log('1. Open this URL in your browser:\n');
  console.log(authUrl);
  console.log('\n2. Sign in with the Google account whose calendar you want to use.');
  console.log('3. Click "Allow" and copy the authorization code shown.\n');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question('Paste the authorization code here: ', async (code) => {
    rl.close();
    try {
      const { tokens } = await oauth2Client.getToken(code.trim());
      console.log('\n✅ Success! Add this to your .env file:\n');
      console.log(`GOOGLE_CALENDAR_REFRESH_TOKEN=${tokens.refresh_token}`);
      console.log('\n⚠️  Keep this token secret — it grants access to your Google Calendar.');
    } catch (err) {
      console.error('\n❌ Failed to exchange code:', err);
    }
    process.exit(0);
  });
}

main().catch(console.error);
