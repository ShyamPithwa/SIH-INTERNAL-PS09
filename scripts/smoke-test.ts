import * as dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const apiPort = process.env.PORT || 4000;
const apiUrl = `http://localhost:${apiPort}/api/v1`;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const TEST_EMAIL = 'smoke-test@example.com';
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
    console.log(`[1/5] Authenticating test user: ${TEST_EMAIL}...`);
    let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    if (authError) {
      // Try sign up
      const signUpRes = await supabase.auth.signUp({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });

      if (signUpRes.error) {
        throw new Error(`Failed to sign up: ${signUpRes.error.message}`);
      }

      const retryRes = await supabase.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });

      if (retryRes.error) {
        throw new Error(`Failed to log in after sign up: ${retryRes.error.message}`);
      }
      authData = retryRes.data;
    }

    const token = authData.session!.access_token;
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

    // 4. Force Analysis Pipeline execution
    console.log('[4/5] Executing C++ dispatch analysis pipeline...');
    const analyzeRes = await fetch(`${apiUrl}/bess/${asset.id}/analyze`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!analyzeRes.ok) {
      const errText = await analyzeRes.text();
      throw new Error(`Analysis run failed: ${errText}`);
    }

    const analysis = await analyzeRes.json();
    console.log('✅ C++ dispatch engine pipeline executed successfully!');
    console.log('---------------------------------------');
    console.log('  State Estimation Output:');
    console.log(`    SOC: ${(analysis.newState.soc * 100).toFixed(2)}%`);
    console.log(`    SOH: ${(analysis.newState.soh * 100).toFixed(2)}%`);
    console.log(`    Available Energy: ${analysis.newState.availableEnergyKwh.toFixed(1)} kWh`);
    console.log('  Dispatch Decision Output:');
    console.log(`    Action: ${analysis.decision.action}`);
    console.log(`    Target Power: ${analysis.decision.targetPowerKw} kW`);
    console.log(`    Reason: ${analysis.decision.reasonText}`);
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

  } catch (err: any) {
    console.error('\n❌ Smoke test failed:');
    console.error(err.message);
    process.exit(1);
  }
}

runSmokeTest();
