import { DecisionRepository } from '../repositories/decision.repository';
import { DispatchDecision } from 'shared';

const decisionRepository = new DecisionRepository();

export class DecisionService {
  async getLatestDecision(bessId: string): Promise<DispatchDecision | null> {
    return decisionRepository.getLatest(bessId);
  }

  async listDecisions(bessId: string, limit = 50): Promise<DispatchDecision[]> {
    return decisionRepository.list(bessId, limit);
  }

  async saveDecision(
    bessId: string,
    batteryStateId: number | null,
    decision: Partial<DispatchDecision>
  ): Promise<DispatchDecision> {
    return decisionRepository.insert(bessId, batteryStateId, decision);
  }
}
