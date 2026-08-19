import { TelemetryRepository } from '../repositories/telemetry.repository';
import { BessService } from './bess.service';
import { TelemetrySample } from 'shared';
import { runAnalysisJob } from '../jobs/analysis.job';
import { dataIntegrityService } from './data-integrity.service';
import { alertService } from './alert.service';

const telemetryRepository = new TelemetryRepository();
const bessService = new BessService();

// Custom error class for data integrity rejections
class DataIntegrityError extends Error {
  statusCode = 422;
  code = 'DATA_INTEGRITY_VIOLATION';
  constructor(message: string) {
    super(message);
    this.name = 'DataIntegrityError';
  }
}

export class TelemetryService {
  async addTelemetry(
    ownerId: string,
    bessId: string,
    sampleData: Partial<TelemetrySample>
  ): Promise<TelemetrySample> {
    // Verify BESS ownership first (throws 404/403 if not owned)
    await bessService.getAsset(bessId, ownerId);

    // ── DATA INTEGRITY VALIDATION ──────────────────────────────────────────
    // Fetch recent history for statistical Z-score analysis
    const recentHistory = await telemetryRepository.list(bessId, { limit: 20 });

    const validationResult = dataIntegrityService.validate(
      sampleData as any,
      recentHistory as any[],
      null, // prevSoh can be pulled from state if needed
    );

    // Log all warnings (stored but not blocking)
    if (validationResult.warnings.length > 0) {
      console.warn(`[DataIntegrity] BESS ${bessId} — Warnings for sample at ${sampleData.recordedAt}:`);
      validationResult.warnings.forEach(w => console.warn(`  ⚠️  ${w}`));
    }

    // Hard reject if any fatal errors found
    if (!validationResult.valid) {
      console.error(`[DataIntegrity] BESS ${bessId} — REJECTED sample at ${sampleData.recordedAt}:`);
      validationResult.errors.forEach(e => console.error(`  ❌ ${e}`));
      throw new DataIntegrityError(
        `Data integrity validation failed: ${validationResult.errors.join(' | ')}`
      );
    }

    // Attach quality tag based on warnings
    const quality = validationResult.warnings.length > 0 ? 'QUESTIONABLE' : 'GOOD';
    const enrichedSample = { ...sampleData, quality };

    // Save telemetry
    const sample = await telemetryRepository.insert(bessId, enrichedSample);

    // ── ALERT CHECKS ──────────────────────────────────────────────────────
    const asset = await bessService.getAsset(bessId, ownerId).catch(() => null);
    const code = (asset as any)?.bessCode ?? bessId;
    const tempC = sampleData.batteryTemperatureC ?? 0;
    const socPct = typeof (sampleData as any).soc === 'number' ? (sampleData as any).soc * 100 : null;
    const socMax = (asset as any)?.socMax ?? 0.95;
    const socMin = (asset as any)?.socMin ?? 0.10;

    // Fire-and-forget alerts (non-blocking)
    if (tempC > 55) {
      alertService.alertTemperatureCritical(bessId, code, tempC).catch(console.error);
    }
    if (socPct != null && socPct < socMin * 100 + 2) {
      alertService.alertSocLow(bessId, code, socPct).catch(console.error);
    }
    if (socPct != null && socPct > socMax * 100 - 2) {
      alertService.alertSocHigh(bessId, code, socPct).catch(console.error);
    }

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

    // ── DATA INTEGRITY VALIDATION (per sample in batch) ───────────────────
    const recentHistory = await telemetryRepository.list(bessId, { limit: 20 });
    const validSamples: Partial<TelemetrySample>[] = [];
    const rejectedCount = { count: 0, reasons: [] as string[] };

    for (const sampleData of samplesData) {
      const result = dataIntegrityService.validate(
        sampleData as any,
        [...recentHistory as any[], ...validSamples as any[]],
        null,
      );

      if (result.warnings.length > 0) {
        console.warn(`[DataIntegrity] Batch sample at ${sampleData.recordedAt} has warnings:`,
          result.warnings.join(' | '));
      }

      if (!result.valid) {
        rejectedCount.count++;
        rejectedCount.reasons.push(...result.errors);
        console.error(`[DataIntegrity] Batch sample REJECTED at ${sampleData.recordedAt}:`,
          result.errors.join(' | '));
        // Alert on integrity violations in batch
        const asset2 = await bessService.getAsset(bessId, ownerId).catch(() => null);
        const code2 = (asset2 as any)?.bessCode ?? bessId;
        alertService.alertDataIntegrityViolation(bessId, code2, result.errors[0]).catch(console.error);
        continue; // Skip bad sample, process rest
      }

      const quality = result.warnings.length > 0 ? 'QUESTIONABLE' : 'GOOD';
      validSamples.push({ ...sampleData, quality });
    }

    // If ALL samples are bad, reject the entire batch
    if (validSamples.length === 0) {
      throw new DataIntegrityError(
        `All ${samplesData.length} samples failed data integrity validation. ` +
        `Reasons: ${rejectedCount.reasons.slice(0, 3).join(' | ')}`
      );
    }

    // Insert only valid samples
    const samples = await telemetryRepository.insertBatch(bessId, validSamples);

    // Trigger analysis on the last sample
    if (samples.length > 0) {
      try {
        await this.triggerAnalysis(bessId, samples[samples.length - 1]);
      } catch (err) {
        console.error(`Batch analysis trigger failed for asset ${bessId}:`, err);
      }
    }

    // Return with metadata about rejected samples
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
