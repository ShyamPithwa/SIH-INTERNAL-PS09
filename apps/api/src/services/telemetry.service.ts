import { TelemetryRepository } from '../repositories/telemetry.repository';
import { BessService } from './bess.service';
import { TelemetrySample } from 'shared';
import { runAnalysisJob } from '../jobs/analysis.job';

const telemetryRepository = new TelemetryRepository();
const bessService = new BessService();

export class TelemetryService {
  async addTelemetry(
    ownerId: string,
    bessId: string,
    sampleData: Partial<TelemetrySample>
  ): Promise<TelemetrySample> {
    // Verify BESS ownership first (throws 404/403 if not owned)
    await bessService.getAsset(bessId, ownerId);

    // Save telemetry
    const sample = await telemetryRepository.insert(bessId, sampleData);

    // Immediate analysis trigger (Mode A)
    try {
      await this.triggerAnalysis(bessId, sample);
    } catch (err) {
      console.error(`Immediate analysis failed for asset ${bessId}:`, err);
    }

    return sample;
  }

  async addTelemetryBatch(
    ownerId: string,
    bessId: string,
    samplesData: Partial<TelemetrySample>[]
  ): Promise<TelemetrySample[]> {
    // Verify BESS ownership
    await bessService.getAsset(bessId, ownerId);

    // Insert batch
    const samples = await telemetryRepository.insertBatch(bessId, samplesData);

    // Trigger analysis on the last sample
    if (samples.length > 0) {
      try {
        await this.triggerAnalysis(bessId, samples[samples.length - 1]);
      } catch (err) {
        console.error(`Batch analysis trigger failed for asset ${bessId}:`, err);
      }
    }

    return samples;
  }

  async getLatestTelemetry(ownerId: string, bessId: string): Promise<TelemetrySample | null> {
    await bessService.getAsset(bessId, ownerId);
    return telemetryRepository.getLatest(bessId);
  }

  async listTelemetry(
    ownerId: string,
    bessId: string,
    options: { from?: string; to?: string; limit?: number }
  ): Promise<TelemetrySample[]> {
    await bessService.getAsset(bessId, ownerId);
    return telemetryRepository.list(bessId, options);
  }

  private async triggerAnalysis(bessId: string, sample: TelemetrySample) {
    console.log(`[Telemetry Ingestion] Ingested sample at ${sample.recordedAt}. Invoking C++ dispatch analysis job...`);
    await runAnalysisJob(bessId, sample);
  }
}
