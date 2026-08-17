import { supabase } from '../plugins/supabase';
import { BatteryState } from 'shared';

export function mapStateFromDb(db: any): BatteryState {
  return {
    id: Number(db.id),
    bessId: db.bess_id,
    telemetryId: db.telemetry_id ? Number(db.telemetry_id) : null,
    calculatedAt: db.calculated_at,
    soc: db.soc,
    soh: db.soh,
    efc: db.efc,
    internalResistanceOhm: db.internal_resistance_ohm,
    usableCapacityKwh: db.usable_capacity_kwh,
    availableEnergyKwh: db.available_energy_kwh,
    chargePowerAvailableKw: db.charge_power_available_kw,
    dischargePowerAvailableKw: db.discharge_power_available_kw,
    cumulativeEnergyThroughputKwh: db.cumulative_energy_throughput_kwh,
    calculationVersion: db.calculation_version,
    createdAt: db.created_at,
  };
}

export function mapStateToDb(state: Partial<BatteryState>) {
  const db: any = {};
  if (state.id !== undefined) db.id = state.id;
  if (state.bessId !== undefined) db.bess_id = state.bessId;
  if (state.telemetryId !== undefined) db.telemetry_id = state.telemetryId;
  if (state.calculatedAt !== undefined) db.calculated_at = state.calculatedAt;
  if (state.soc !== undefined) db.soc = state.soc;
  if (state.soh !== undefined) db.soh = state.soh;
  if (state.efc !== undefined) db.efc = state.efc;
  if (state.internalResistanceOhm !== undefined) db.internal_resistance_ohm = state.internalResistanceOhm;
  if (state.usableCapacityKwh !== undefined) db.usable_capacity_kwh = state.usableCapacityKwh;
  if (state.availableEnergyKwh !== undefined) db.available_energy_kwh = state.availableEnergyKwh;
  if (state.chargePowerAvailableKw !== undefined) db.charge_power_available_kw = state.chargePowerAvailableKw;
  if (state.dischargePowerAvailableKw !== undefined) db.discharge_power_available_kw = state.dischargePowerAvailableKw;
  if (state.cumulativeEnergyThroughputKwh !== undefined) db.cumulative_energy_throughput_kwh = state.cumulativeEnergyThroughputKwh;
  if (state.calculationVersion !== undefined) db.calculation_version = state.calculationVersion;
  return db;
}

export class StateRepository {
  async getLatest(bessId: string): Promise<BatteryState | null> {
    const { data, error } = await supabase
      .from('battery_states')
      .select()
      .eq('bess_id', bessId)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data ? mapStateFromDb(data) : null;
  }

  async insert(bessId: string, telemetryId: number, state: Partial<BatteryState>): Promise<BatteryState> {
    const dbState = mapStateToDb({ ...state, bessId, telemetryId });
    const { data, error } = await supabase
      .from('battery_states')
      .insert(dbState)
      .select()
      .single();

    if (error) throw error;
    return mapStateFromDb(data);
  }
}
export default StateRepository;
