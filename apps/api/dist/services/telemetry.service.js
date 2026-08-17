"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelemetryService = void 0;
const telemetry_repository_1 = require("../repositories/telemetry.repository");
const bess_service_1 = require("./bess.service");
const analysis_job_1 = require("../jobs/analysis.job");
const telemetryRepository = new telemetry_repository_1.TelemetryRepository();
const bessService = new bess_service_1.BessService();
class TelemetryService {
    async addTelemetry(ownerId, bessId, sampleData) {
        // Verify BESS ownership first (throws 404/403 if not owned)
        await bessService.getAsset(bessId, ownerId);
        // Save telemetry
        const sample = await telemetryRepository.insert(bessId, sampleData);
        // Immediate analysis trigger (Mode A)
        try {
            await this.triggerAnalysis(bessId, sample);
        }
        catch (err) {
            console.error(`Immediate analysis failed for asset ${bessId}:`, err);
        }
        return sample;
    }
    async addTelemetryBatch(ownerId, bessId, samplesData) {
        // Verify BESS ownership
        await bessService.getAsset(bessId, ownerId);
        // Insert batch
        const samples = await telemetryRepository.insertBatch(bessId, samplesData);
        // Trigger analysis on the last sample
        if (samples.length > 0) {
            try {
                await this.triggerAnalysis(bessId, samples[samples.length - 1]);
            }
            catch (err) {
                console.error(`Batch analysis trigger failed for asset ${bessId}:`, err);
            }
        }
        return samples;
    }
    async getLatestTelemetry(ownerId, bessId) {
        await bessService.getAsset(bessId, ownerId);
        return telemetryRepository.getLatest(bessId);
    }
    async listTelemetry(ownerId, bessId, options) {
        await bessService.getAsset(bessId, ownerId);
        return telemetryRepository.list(bessId, options);
    }
    async triggerAnalysis(bessId, sample) {
        console.log(`[Telemetry Ingestion] Ingested sample at ${sample.recordedAt}. Invoking C++ dispatch analysis job...`);
        await (0, analysis_job_1.runAnalysisJob)(bessId, sample);
    }
}
exports.TelemetryService = TelemetryService;
