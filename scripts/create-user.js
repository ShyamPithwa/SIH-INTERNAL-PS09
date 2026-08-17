const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');
global.WebSocket = ws;


const sb = createClient(
  'https://keuogjmullesdwhgzgmc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtldW9nam11bGxlc2R3aGd6Z21jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njk4ODM4MiwiZXhwIjoyMTAyNTY0MzgyfQ.suXn8MIVkpilDyy6XegUFBbcjc8Yl18hqkOY3Hd6Zbc',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  const email = 'bess@sih.dev';
  const password = 'BessAdmin@2024';

  // Remove existing user with this email if exists
  const { data: list } = await sb.auth.admin.listUsers();
  const existing = list && list.users && list.users.find(u => u.email === email);
  if (existing) {
    await sb.auth.admin.deleteUser(existing.id);
    console.log('Removed existing user.');
  }

  // Create a fresh, email-confirmed user
  const result = await sb.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true
  });

  if (result.error) {
    console.error('FAILED:', result.error.message);
    process.exit(1);
  }

  console.log('');
  console.log('========================================');
  console.log('  LOGIN ACCOUNT CREATED SUCCESSFULLY!  ');
  console.log('========================================');
  console.log('  Email   : ' + email);
  console.log('  Password: ' + password);
  console.log('  URL     : http://localhost:5173/login');
  console.log('========================================');
}

main().catch(err => { console.error(err); process.exit(1); });
