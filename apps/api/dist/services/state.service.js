"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StateService = void 0;
const state_repository_1 = require("../repositories/state.repository");
const stateRepository = new state_repository_1.StateRepository();
class StateService {
    async getLatestState(bessId) {
        return stateRepository.getLatest(bessId);
    }
    async saveState(bessId, telemetryId, stateData) {
        return stateRepository.insert(bessId, telemetryId, stateData);
    }
}
exports.StateService = StateService;
