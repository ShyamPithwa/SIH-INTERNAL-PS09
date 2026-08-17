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
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const DEMO_EMAIL = 'demo@example.com';
const DEMO_PASSWORD = 'Password123!';

const DEMO_ASSET_SEED = {
  bessCode: 'BESS-DEMO-001',
  manufacturer: 'Demo Energy',
  model: 'MVP-500',
  batteryChemistry: 'Li-ion',
  moduleCount: 10,
  cellsPerModule: 96,
  ratedEnergyKwh: 500,
  usableEnergyKwh: 450,
  ratedPowerKw: 250,
  maxChargePowerKw: 200,
  maxDischargePowerKw: 200,
  nominalVoltageV: 720,
  minVoltageV: 620,
  maxVoltageV: 820,
  maxChargeCurrentA: 300,
  maxDischargeCurrentA: 300,
  minTemperatureC: 0,
  maxTemperatureC: 50,
  roundTripEfficiency: 0.92,
  socMin: 0.10,
  socMax: 0.90,
  socInitial: 0.50,
  sohInitial: 1.00,
  nominalGridFrequencyHz: 50,
  frequencyDeadbandHz: 0.05,
  droopGainKwPerHz: 100,
  degradationCoefficient: 0.0001
};

async function getAuthToken(): Promise<string> {
  console.log(`Authenticating user: ${DEMO_EMAIL}...`);
  
  // Try logging in
  let { data, error } = await supabase.auth.signInWithPassword({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
  });

  if (error) {
    console.log('Login failed, attempting auto sign-up...');
    // Attempt sign up if login fails
    const signUpResult = await supabase.auth.signUp({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });

    if (signUpResult.error) {
      throw new Error(`Auth failed: ${signUpResult.error.message}`);
    }

    // Try logging in again
    const retryLogin = await supabase.auth.signInWithPassword({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });

    if (retryLogin.error) {
      throw new Error(`Auth retry failed: ${retryLogin.error.message}`);
    }
    
    data = retryLogin.data;
  }

  return data.session!.access_token;
}

async function getOrCreateDemoAsset(token: string): Promise<string> {
  console.log('Checking for existing BESS assets...');
  
  const res = await fetch(`${apiUrl}/bess`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to list BESS assets: ${errText}`);
  }

  const assets = await res.json();
  const existing = assets.find((a: any) => a.bessCode === DEMO_ASSET_SEED.bessCode);

  if (existing) {
    console.log(`Found existing demo asset: ${existing.id}`);
    return existing.id;
  }

  console.log('Registering seed demo BESS asset...');
  const createRes = await fetch(`${apiUrl}/bess`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(DEMO_ASSET_SEED)
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create BESS asset: ${errText}`);
  }

  const newAsset = await createRes.json();
  console.log(`Demo asset registered: ${newAsset.id}`);
  return newAsset.id;
}

// Generate smooth simulation telemetry
function runSimulation(assetId: string, token: string) {
  console.log('\n--- Starting Live Telemetry Stream ---');
  console.log('Sending 1 sample every 5 seconds. Press Ctrl+C to terminate.');
  
  let step = 0;

  setInterval(async () => {
    try {
      const now = new Date();
      
      // 1. Renewable: diurnal solar curve representation
      // Max at noon (step = 12), min at night
      const timeHours = (step % 24);
      const solarStrength = Math.max(0, Math.sin((timeHours - 6) * Math.PI / 12));
      const renewableBase = solarStrength * 150; // Max 150 kW
      const renewableNoise = (Math.random() - 0.5) * 10;
      const renewablePowerKw = Math.max(0, renewableBase + renewableNoise);

      // 2. Load: peak in morning and evening
      const loadBase = 60 + Math.sin(timeHours * Math.PI / 12) * 20 + Math.sin(timeHours * Math.PI / 6) * 10; // 30-90 kW range
      const loadNoise = (Math.random() - 0.5) * 5;
      const loadPowerKw = Math.max(0, loadBase + loadNoise);

      // 3. Grid Frequency: nominal 50Hz with minor fluctuations, occasional dip
      let gridFrequencyHz = 50.0 + (Math.random() - 0.5) * 0.04;
      if (step % 15 === 0) {
        // Occasional disturbance dip
        gridFrequencyHz -= 0.12; 
        console.log('⚡ Simulated Grid Disturbance (Frequency Dip)');
      }

      // 4. Battery Voltage & Current:
      // Simple physics simulator to match expected values
      // If renewable surplus -> charge (negative current). If deficit -> discharge (positive current)
      const balance = renewablePowerKw - loadPowerKw;
      let batteryCurrentA = 0;
      let batteryPowerKw = 0;
      
      if (balance > 10) {
        // Charge candidate
        batteryPowerKw = -Math.min(balance, 100); // Max 100 kW charging
        batteryCurrentA = (batteryPowerKw * 1000) / 720;
      } else if (balance < -10) {
        // Discharge candidate
        batteryPowerKw = Math.min(Math.abs(balance), 100); // Max 100 kW discharging
        batteryCurrentA = (batteryPowerKw * 1000) / 720;
      }

      const batteryVoltageV = 720 + (batteryCurrentA * 0.05); // voltage rises with charging, drops with discharging
      
      // 5. Temperature: base ambient + load-based thermal dissipation
      const ambient = 22.0 + Math.sin((timeHours - 8) * Math.PI / 12) * 3;
      const thermalRise = Math.abs(batteryCurrentA) * 0.02;
      const batteryTemperatureC = ambient + thermalRise;

      const payload = {
        recordedAt: now.toISOString(),
        batteryVoltageV,
        batteryCurrentA,
        batteryPowerKw,
        batteryTemperatureC,
        gridFrequencyHz,
        gridVoltageV: 415.0 + (Math.random() - 0.5) * 5,
        renewablePowerKw,
        loadPowerKw,
        source: 'simulator',
        quality: 'GOOD'
      };

      const res = await fetch(`${apiUrl}/bess/${assetId}/telemetry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`Telemetry post failed: ${res.statusText}`, errorText);
      } else {
        const data = await res.json();
        console.log(`[SIM] Posted sample: Time=${payload.recordedAt} | Ren=${payload.renewablePowerKw.toFixed(1)}kW | Load=${payload.loadPowerKw.toFixed(1)}kW | Freq=${payload.gridFrequencyHz.toFixed(2)}Hz | Current=${payload.batteryCurrentA.toFixed(1)}A`);
      }

      step++;
    } catch (err: any) {
      console.error('Error in simulation cycle:', err.message);
    }
  }, 5000);
}

async function main() {
  try {
    const token = await getAuthToken();
    const assetId = await getOrCreateDemoAsset(token);
    runSimulation(assetId, token);
  } catch (err: any) {
    console.error('Simulator fatal error:', err.message);
    process.exit(1);
  }
}

main();
