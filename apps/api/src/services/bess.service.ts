import { BessRepository } from '../repositories/bess.repository';
import { BessAsset } from 'shared';

const bessRepository = new BessRepository();

export class BessService {
  async createAsset(ownerId: string, assetData: Partial<BessAsset>): Promise<BessAsset> {
    return bessRepository.create(ownerId, assetData);
  }

  async listAssets(ownerId: string): Promise<BessAsset[]> {
    return bessRepository.list(ownerId);
  }

  async getAsset(id: string, ownerId: string): Promise<BessAsset> {
    const asset = await bessRepository.getById(id, ownerId);
    if (!asset) {
      const err = new Error('BESS asset not found');
      (err as any).statusCode = 404;
      (err as any).code = 'NOT_FOUND';
      throw err;
    }
    return asset;
  }

  async updateAsset(id: string, ownerId: string, assetData: Partial<BessAsset>): Promise<BessAsset> {
    // Verify existence first
    await this.getAsset(id, ownerId);
    return bessRepository.update(id, ownerId, assetData);
  }

  async deleteAsset(id: string, ownerId: string): Promise<void> {
    // Verify existence first
    await this.getAsset(id, ownerId);
    await bessRepository.delete(id, ownerId);
  }
}
