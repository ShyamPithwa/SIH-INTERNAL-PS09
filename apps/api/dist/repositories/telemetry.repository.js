"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelemetryRepository = void 0;
exports.mapTelemetryFromDb = mapTelemetryFromDb;
exports.mapTelemetryToDb = mapTelemetryToDb;
const supabase_1 = require("../plugins/supabase");
function mapTelemetryFromDb(db) {
    return {
        id: db.id,
        bessId: db.bess_id,
        recordedAt: db.recorded_at,
        batteryVoltageV: db.battery_voltage_v,
        batteryCurrentA: db.battery_current_a,
        batteryPowerKw: db.battery_power_kw,
        batteryTemperatureC: db.battery_temperature_c,
        gridFrequencyHz: db.grid_frequency_hz,
        gridVoltageV: db.grid_voltage_v,
        renewablePowerKw: db.renewable_power_kw,
        loadPowerKw: db.load_power_kw,
        source: db.source,
        quality: db.quality,
        createdAt: db.created_at,
    };
}
function mapTelemetryToDb(sample) {
    const db = {};
    if (sample.id !== undefined)
        db.id = sample.id;
    if (sample.bessId !== undefined)
        db.bess_id = sample.bessId;
    if (sample.recordedAt !== undefined)
        db.recorded_at = sample.recordedAt;
    if (sample.batteryVoltageV !== undefined)
        db.battery_voltage_v = sample.batteryVoltageV;
    if (sample.batteryCurrentA !== undefined)
        db.battery_current_a = sample.batteryCurrentA;
    if (sample.batteryPowerKw !== undefined)
        db.battery_power_kw = sample.batteryPowerKw;
    if (sample.batteryTemperatureC !== undefined)
        db.battery_temperature_c = sample.batteryTemperatureC;
    if (sample.gridFrequencyHz !== undefined)
        db.grid_frequency_hz = sample.gridFrequencyHz;
    if (sample.gridVoltageV !== undefined)
        db.grid_voltage_v = sample.gridVoltageV;
    if (sample.renewablePowerKw !== undefined)
        db.renewable_power_kw = sample.renewablePowerKw;
    if (sample.loadPowerKw !== undefined)
        db.load_power_kw = sample.loadPowerKw;
    if (sample.source !== undefined)
        db.source = sample.source;
    if (sample.quality !== undefined)
        db.quality = sample.quality;
    return db;
}
class TelemetryRepository {
    async insert(bessId, sample) {
        const dbSample = mapTelemetryToDb({ ...sample, bessId });
        // Automatically calculate power if missing
        if (dbSample.battery_power_kw === undefined || dbSample.battery_power_kw === null) {
            dbSample.battery_power_kw = (dbSample.battery_voltage_v * dbSample.battery_current_a) / 1000.0;
        }
        const { data, error } = await supabase_1.supabase
            .from('telemetry_samples')
            .insert(dbSample)
            .select()
            .single();
        if (error)
            throw error;
        return mapTelemetryFromDb(data);
    }
    async insertBatch(bessId, samples) {
        const dbSamples = samples.map(sample => {
            const dbSample = mapTelemetryToDb({ ...sample, bessId });
            if (dbSample.battery_power_kw === undefined || dbSample.battery_power_kw === null) {
                dbSample.battery_power_kw = (dbSample.battery_voltage_v * dbSample.battery_current_a) / 1000.0;
            }
            return dbSample;
        });
        const { data, error } = await supabase_1.supabase
            .from('telemetry_samples')
            .insert(dbSamples)
            .select();
        if (error)
            throw error;
        return (data || []).map(mapTelemetryFromDb);
    }
    async getLatest(bessId) {
        const { data, error } = await supabase_1.supabase
            .from('telemetry_samples')
            .select()
            .eq('bess_id', bessId)
            .order('recorded_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (error)
            throw error;
        return data ? mapTelemetryFromDb(data) : null;
    }
    async list(bessId, options) {
        let query = supabase_1.supabase
            .from('telemetry_samples')
            .select()
            .eq('bess_id', bessId);
        if (options.from) {
            query = query.gte('recorded_at', options.from);
        }
        if (options.to) {
            query = query.lte('recorded_at', options.to);
        }
        query = query.order('recorded_at', { ascending: false });
        if (options.limit) {
            query = query.limit(options.limit);
        }
        else {
            query = query.limit(100); // default limit
        }
        const { data, error } = await query;
        if (error)
            throw error;
        // Return in chronological order
        return (data || []).map(mapTelemetryFromDb).reverse();
    }
}
exports.TelemetryRepository = TelemetryRepository;
