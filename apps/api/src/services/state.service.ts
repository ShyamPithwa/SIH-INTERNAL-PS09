import { StateRepository } from '../repositories/state.repository';
import { BatteryState } from 'shared';

const stateRepository = new StateRepository();

export class StateService {
  async getLatestState(bessId: string): Promise<BatteryState | null> {
    return stateRepository.getLatest(bessId);
  }

  async saveState(bessId: string, telemetryId: number, stateData: Partial<BatteryState>): Promise<BatteryState> {
    return stateRepository.insert(bessId, telemetryId, stateData);
  }
}
