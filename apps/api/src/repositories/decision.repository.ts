import { supabase } from '../plugins/supabase';
import { DispatchDecision } from 'shared';

export function mapDecisionFromDb(db: any): DispatchDecision {
  return {
    id: db.id,
    bessId: db.bess_id,
    batteryStateId: db.battery_state_id ? Number(db.battery_state_id) : null,
    decidedAt: db.decided_at,
    action: db.action,
    targetPowerKw: db.target_power_kw,
    energyBalanceKw: db.energy_balance_kw,
    frequencyDeviationHz: db.frequency_deviation_hz,
    score: db.score,
    reasonCode: db.reason_code,
    reasonText: db.reason_text,
    constraints: db.constraints,
    inputs: db.inputs,
    engineVersion: db.engine_version,
    createdAt: db.created_at,
  };
}

export function mapDecisionToDb(decision: Partial<DispatchDecision>) {
  const db: any = {};
  if (decision.id !== undefined) db.id = decision.id;
  if (decision.bessId !== undefined) db.bess_id = decision.bessId;
  if (decision.batteryStateId !== undefined) db.battery_state_id = decision.batteryStateId;
  if (decision.decidedAt !== undefined) db.decided_at = decision.decidedAt;
  if (decision.action !== undefined) db.action = decision.action;
  if (decision.targetPowerKw !== undefined) db.target_power_kw = decision.targetPowerKw;
  if (decision.energyBalanceKw !== undefined) db.energy_balance_kw = decision.energyBalanceKw;
  if (decision.frequencyDeviationHz !== undefined) db.frequency_deviation_hz = decision.frequencyDeviationHz;
  if (decision.score !== undefined) db.score = decision.score;
  if (decision.reasonCode !== undefined) db.reason_code = decision.reasonCode;
  if (decision.reasonText !== undefined) db.reason_text = decision.reasonText;
  if (decision.constraints !== undefined) db.constraints = decision.constraints;
  if (decision.inputs !== undefined) db.inputs = decision.inputs;
  if (decision.engineVersion !== undefined) db.engine_version = decision.engineVersion;
  return db;
}

export class DecisionRepository {
  async getLatest(bessId: string): Promise<DispatchDecision | null> {
    const { data, error } = await supabase
      .from('dispatch_decisions')
      .select()
      .eq('bess_id', bessId)
      .order('decided_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data ? mapDecisionFromDb(data) : null;
  }

  async insert(bessId: string, batteryStateId: number | null, decision: Partial<DispatchDecision>): Promise<DispatchDecision> {
    const dbDecision = mapDecisionToDb({ ...decision, bessId, batteryStateId });
    const { data, error } = await supabase
      .from('dispatch_decisions')
      .insert(dbDecision)
      .select()
      .single();

    if (error) throw error;
    return mapDecisionFromDb(data);
  }

  async list(bessId: string, limit = 50): Promise<DispatchDecision[]> {
    const { data, error } = await supabase
      .from('dispatch_decisions')
      .select()
      .eq('bess_id', bessId)
      .order('decided_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).map(mapDecisionFromDb);
  }
}
export default DecisionRepository;
