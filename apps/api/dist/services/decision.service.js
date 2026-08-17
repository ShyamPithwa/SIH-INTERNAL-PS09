"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DecisionService = void 0;
const decision_repository_1 = require("../repositories/decision.repository");
const decisionRepository = new decision_repository_1.DecisionRepository();
class DecisionService {
    async getLatestDecision(bessId) {
        return decisionRepository.getLatest(bessId);
    }
    async listDecisions(bessId, limit = 50) {
        return decisionRepository.list(bessId, limit);
    }
    async saveDecision(bessId, batteryStateId, decision) {
        return decisionRepository.insert(bessId, batteryStateId, decision);
    }
}
exports.DecisionService = DecisionService;
