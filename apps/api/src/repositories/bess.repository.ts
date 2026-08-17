import { supabase } from '../plugins/supabase';
import { BessAsset } from 'shared';

export function mapAssetFromDb(db: any): BessAsset {
  return {
    id: db.id,
    ownerId: db.owner_id,
    bessCode: db.bess_code,
    manufacturer: db.manufacturer,
    model: db.model,
    batteryChemistry: db.battery_chemistry,
    moduleCount: db.module_count,
    cellsPerModule: db.cells_per_module,
    ratedEnergyKwh: db.rated_energy_kwh,
    usableEnergyKwh: db.usable_energy_kwh,
    ratedPowerKw: db.rated_power_kw,
    maxChargePowerKw: db.max_charge_power_kw,
    maxDischargePowerKw: db.max_discharge_power_kw,
    nominalVoltageV: db.nominal_voltage_v,
    minVoltageV: db.min_voltage_v,
    maxVoltageV: db.max_voltage_v,
    maxChargeCurrentA: db.max_charge_current_a,
    maxDischargeCurrentA: db.max_discharge_current_a,
    minTemperatureC: db.min_temperature_c,
    maxTemperatureC: db.max_temperature_c,
    roundTripEfficiency: db.round_trip_efficiency,
    socMin: db.soc_min,
    socMax: db.soc_max,
    socInitial: db.soc_initial,
    sohInitial: db.soh_initial,
    nominalGridFrequencyHz: db.nominal_grid_frequency_hz,
    frequencyDeadbandHz: db.frequency_deadband_hz,
    droopGainKwPerHz: db.droop_gain_kw_per_hz,
    degradationCoefficient: db.degradation_coefficient,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export function mapAssetToDb(asset: Partial<BessAsset>) {
  const db: any = {};
  if (asset.id !== undefined) db.id = asset.id;
  if (asset.ownerId !== undefined) db.owner_id = asset.ownerId;
  if (asset.bessCode !== undefined) db.bess_code = asset.bessCode;
  if (asset.manufacturer !== undefined) db.manufacturer = asset.manufacturer;
  if (asset.model !== undefined) db.model = asset.model;
  if (asset.batteryChemistry !== undefined) db.battery_chemistry = asset.batteryChemistry;
  if (asset.moduleCount !== undefined) db.module_count = asset.moduleCount;
  if (asset.cellsPerModule !== undefined) db.cells_per_module = asset.cellsPerModule;
  if (asset.ratedEnergyKwh !== undefined) db.rated_energy_kwh = asset.ratedEnergyKwh;
  if (asset.usableEnergyKwh !== undefined) db.usable_energy_kwh = asset.usableEnergyKwh;
  if (asset.ratedPowerKw !== undefined) db.rated_power_kw = asset.ratedPowerKw;
  if (asset.maxChargePowerKw !== undefined) db.max_charge_power_kw = asset.maxChargePowerKw;
  if (asset.maxDischargePowerKw !== undefined) db.max_discharge_power_kw = asset.maxDischargePowerKw;
  if (asset.nominalVoltageV !== undefined) db.nominal_voltage_v = asset.nominalVoltageV;
  if (asset.minVoltageV !== undefined) db.min_voltage_v = asset.minVoltageV;
  if (asset.maxVoltageV !== undefined) db.max_voltage_v = asset.maxVoltageV;
  if (asset.maxChargeCurrentA !== undefined) db.max_charge_current_a = asset.maxChargeCurrentA;
  if (asset.maxDischargeCurrentA !== undefined) db.max_discharge_current_a = asset.maxDischargeCurrentA;
  if (asset.minTemperatureC !== undefined) db.min_temperature_c = asset.minTemperatureC;
  if (asset.maxTemperatureC !== undefined) db.max_temperature_c = asset.maxTemperatureC;
  if (asset.roundTripEfficiency !== undefined) db.round_trip_efficiency = asset.roundTripEfficiency;
  if (asset.socMin !== undefined) db.soc_min = asset.socMin;
  if (asset.socMax !== undefined) db.soc_max = asset.socMax;
  if (asset.socInitial !== undefined) db.soc_initial = asset.socInitial;
  if (asset.sohInitial !== undefined) db.soh_initial = asset.sohInitial;
  if (asset.nominalGridFrequencyHz !== undefined) db.nominal_grid_frequency_hz = asset.nominalGridFrequencyHz;
  if (asset.frequencyDeadbandHz !== undefined) db.frequency_deadband_hz = asset.frequencyDeadbandHz;
  if (asset.droopGainKwPerHz !== undefined) db.droop_gain_kw_per_hz = asset.droopGainKwPerHz;
  if (asset.degradationCoefficient !== undefined) db.degradation_coefficient = asset.degradationCoefficient;
  return db;
}

export class BessRepository {
  async create(ownerId: string, asset: Partial<BessAsset>): Promise<BessAsset> {
    const dbAsset = mapAssetToDb({ ...asset, ownerId });
    const { data, error } = await supabase
      .from('bess_assets')
      .insert(dbAsset)
      .select()
      .single();

    if (error) throw error;
    return mapAssetFromDb(data);
  }

  async list(ownerId: string): Promise<BessAsset[]> {
    const { data, error } = await supabase
      .from('bess_assets')
      .select()
      .eq('owner_id', ownerId);

    if (error) throw error;
    return (data || []).map(mapAssetFromDb);
  }

  async getById(id: string, ownerId: string): Promise<BessAsset | null> {
    const { data, error } = await supabase
      .from('bess_assets')
      .select()
      .eq('id', id)
      .eq('owner_id', ownerId)
      .maybeSingle();

    if (error) throw error;
    return data ? mapAssetFromDb(data) : null;
  }

  async update(id: string, ownerId: string, asset: Partial<BessAsset>): Promise<BessAsset> {
    const dbAsset = mapAssetToDb(asset);
    dbAsset.updated_at = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('bess_assets')
      .update(dbAsset)
      .eq('id', id)
      .eq('owner_id', ownerId)
      .select()
      .single();

    if (error) throw error;
    return mapAssetFromDb(data);
  }

  async delete(id: string, ownerId: string): Promise<boolean> {
    const { error } = await supabase
      .from('bess_assets')
      .delete()
      .eq('id', id)
      .eq('owner_id', ownerId);

    if (error) throw error;
    return true;
  }
}
