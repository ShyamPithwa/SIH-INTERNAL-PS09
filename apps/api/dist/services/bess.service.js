"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BessService = void 0;
const bess_repository_1 = require("../repositories/bess.repository");
const bessRepository = new bess_repository_1.BessRepository();
class BessService {
    async createAsset(ownerId, assetData) {
        return bessRepository.create(ownerId, assetData);
    }
    async listAssets(ownerId) {
        return bessRepository.list(ownerId);
    }
    async getAsset(id, ownerId) {
        const asset = await bessRepository.getById(id, ownerId);
        if (!asset) {
            const err = new Error('BESS asset not found');
            err.statusCode = 404;
            err.code = 'NOT_FOUND';
            throw err;
        }
        return asset;
    }
    async updateAsset(id, ownerId, assetData) {
        // Verify existence first
        await this.getAsset(id, ownerId);
        return bessRepository.update(id, ownerId, assetData);
    }
    async deleteAsset(id, ownerId) {
        // Verify existence first
        await this.getAsset(id, ownerId);
        await bessRepository.delete(id, ownerId);
    }
}
exports.BessService = BessService;
