const dotenv = require('dotenv');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');
global.WebSocket = ws;

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const apiPort = process.env.PORT || 4000;
const apiUrl = `http://127.0.0.1:${apiPort}/api/v1`;

const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL, SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY in environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const TEST_EMAIL = 'smoke.test.sih@gmail.com';
const TEST_PASSWORD = 'Password123!';

const TEST_ASSET = {
  bessCode: `SMOKE-TEST-${Date.now()}`,
  manufacturer: 'Smoke Test Ltd',
  model: 'SM-500',
  batteryChemistry: 'LFP',
  moduleCount: 8,
  cellsPerModule: 120,
  ratedEnergyKwh: 400,
  usableEnergyKwh: 360,
  ratedPowerKw: 200,
  maxChargePowerKw: 150,
  maxDischargePowerKw: 150,
  nominalVoltageV: 680,
  minVoltageV: 580,
  maxVoltageV: 780,
  maxChargeCurrentA: 250,
  maxDischargeCurrentA: 250,
  minTemperatureC: -10,
  maxTemperatureC: 55,
  roundTripEfficiency: 0.94,
  socMin: 0.12,
  socMax: 0.88,
  socInitial: 0.45,
  sohInitial: 1.00,
  nominalGridFrequencyHz: 50,
  frequencyDeadbandHz: 0.05,
  droopGainKwPerHz: 120,
  degradationCoefficient: 0.0001
};

async function runSmokeTest() {
  console.log('=======================================');
  console.log('   BESS PLATFORM INTEGRATION TEST     ');
  console.log('=======================================');
  
  try {
    // 1. Sign in or Sign up
    console.log(`[1/5] Ensuring test user is created & confirmed: ${TEST_EMAIL}...`);
    
    // Deleting existing test user first if it exists to reset confirmation state
    try {
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (!listError && users) {
        const existing = users.find(u => u.email === TEST_EMAIL);
        if (existing) {
          await supabaseAdmin.auth.admin.deleteUser(existing.id);
          console.log('✅ Existing unconfirmed test user cleared!');
        }
      }
    } catch (e) {}

    // Create fresh user via admin API with email confirmation bypassed
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true
    });
    
    if (createError) {
      throw new Error(`Failed to create test user: ${createError.message}`);
    }
    console.log('✅ New test user created and confirmed!');

    let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    if (authError) {
      throw new Error(`Failed to log in: ${authError.message}`);
    }

    const token = authData.session.access_token;
    console.log('✅ Authentication successful!');

    // 2. Create BESS Asset
    console.log('[2/5] Registering test BESS asset...');
    const createRes = await fetch(`${apiUrl}/bess`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(TEST_ASSET)
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`Failed to create BESS asset: ${errText}`);
    }

    const asset = await createRes.json();
    console.log(`✅ BESS asset created with ID: ${asset.id}`);

    // 3. Post Telemetry Sample (Diurnal solar surplus condition)
    console.log('[3/5] Ingesting solar surplus telemetry sample...');
    const telemetryPayload = {
      recordedAt: new Date().toISOString(),
      batteryVoltageV: 680.0,
      batteryCurrentA: -50.0, // charging
      batteryPowerKw: -34.0,
      batteryTemperatureC: 28.5,
      gridFrequencyHz: 50.0,
      gridVoltageV: 415.0,
      renewablePowerKw: 120.0, // Surplus: 120kW gen > 80kW load
      loadPowerKw: 80.0,
      source: 'smoke-test',
      quality: 'GOOD'
    };

    const telemetryRes = await fetch(`${apiUrl}/bess/${asset.id}/telemetry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(telemetryPayload)
    });

    if (!telemetryRes.ok) {
      const errText = await telemetryRes.text();
      throw new Error(`Failed to post telemetry: ${errText}`);
    }

    const sample = await telemetryRes.json();
    console.log(`✅ Telemetry sample ingested with ID: ${sample.id}`);

    // 4. Retrieve automatically generated BESS state and dispatch decision
    console.log('[4/5] Retrieving automatically generated state & decisions...');
    
    const stateRes = await fetch(`${apiUrl}/bess/${asset.id}/state/latest`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!stateRes.ok) {
      const errText = await stateRes.text();
      throw new Error(`Failed to fetch latest state: ${errText}`);
    }
    const stateData = await stateRes.json();

    const decisionRes = await fetch(`${apiUrl}/bess/${asset.id}/decisions/latest`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!decisionRes.ok) {
      const errText = await decisionRes.text();
      throw new Error(`Failed to fetch latest decision: ${errText}`);
    }
    const decisionData = await decisionRes.json();

    console.log('✅ Background C++ dispatch engine pipeline outputs verified!');
    console.log('---------------------------------------');
    console.log('  State Estimation Output:');
    console.log(`    SOC: ${(stateData.soc * 100).toFixed(2)}%`);
    console.log(`    SOH: ${(stateData.soh * 100).toFixed(2)}%`);
    console.log(`    Available Energy: ${stateData.availableEnergyKwh.toFixed(1)} kWh`);
    console.log('  Dispatch Decision Output:');
    console.log(`    Action: ${decisionData.action}`);
    console.log(`    Target Power: ${decisionData.targetPowerKw} kW`);
    console.log(`    Reason: ${decisionData.reasonText}`);
    console.log('---------------------------------------');

    // 5. Clean up BESS asset to keep DB clean
    console.log('[5/5] Cleaning up test BESS asset...');
    const deleteRes = await fetch(`${apiUrl}/bess/${asset.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!deleteRes.ok) {
      console.warn('⚠️ Warning: Failed to clean up BESS asset.');
    } else {
      console.log('✅ Clean up complete!');
    }

    console.log('=======================================');
    console.log('      SMOKE TEST COMPLETED SUCCESSFULLY!  ');
    console.log('=======================================');
    process.exit(0);

  } catch (err) {
    console.error('\n❌ Smoke test failed:');
    console.error(err.message);
    process.exit(1);
  }
}

runSmokeTest();
