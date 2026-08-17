import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { BessAsset } from 'shared';

export default function ConfigurationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<BessAsset>>({
    bessCode: '',
    manufacturer: '',
    model: '',
    batteryChemistry: 'Li-ion',
    moduleCount: 10,
    cellsPerModule: 96,
    ratedEnergyKwh: 500,
    usableEnergyKwh: 450,
    ratedPowerKw: 250,
    maxChargePowerKw: 200,
    maxDischargePowerKw: 200,
    nominalVoltageV: 720,
    minVoltageV: 620,
    maxVoltageV: 820,
    maxChargeCurrentA: 300,
    maxDischargeCurrentA: 300,
    minTemperatureC: 0,
    maxTemperatureC: 50,
    roundTripEfficiency: 0.92,
    socMin: 0.10,
    socMax: 0.90,
    socInitial: 0.50,
    sohInitial: 1.00,
    nominalGridFrequencyHz: 50,
    frequencyDeadbandHz: 0.05,
    droopGainKwPerHz: 100,
    degradationCoefficient: 0.0001
  });

  useEffect(() => {
    if (id) {
      fetchAsset();
    }
  }, [id]);

  const fetchAsset = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/bess/${id}`);
      setFormData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      // For number inputs: store the raw string if empty (allows clearing the field),
      // otherwise parse to float. This prevents NaN from resetting the field.
      [name]: type === 'number'
        ? (value === '' ? '' : parseFloat(value))
        : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Frontend validations with engineering units
    if (!formData.bessCode) {
      setError('BESS Code is required');
      setLoading(false);
      return;
    }
    if (!formData.ratedEnergyKwh || (formData.ratedEnergyKwh as number) <= 0) {
      setError('Rated Energy (kWh) must be greater than 0');
      setLoading(false);
      return;
    }
    if (!formData.usableEnergyKwh || (formData.usableEnergyKwh as number) <= 0) {
      setError('Usable Energy (kWh) must be greater than 0');
      setLoading(false);
      return;
    }
    if ((formData.usableEnergyKwh as number) > (formData.ratedEnergyKwh as number)) {
      setError('Usable Energy (kWh) cannot exceed Rated Energy (kWh)');
      setLoading(false);
      return;
    }
    if (!formData.ratedPowerKw || (formData.ratedPowerKw as number) <= 0) {
      setError('Rated Power (kW) must be greater than 0');
      setLoading(false);
      return;
    }
    if (!formData.roundTripEfficiency || (formData.roundTripEfficiency as number) <= 0 || (formData.roundTripEfficiency as number) > 1) {
      setError('Round-trip efficiency must be in the range (0, 1]');
      setLoading(false);
      return;
    }
    if ((formData.socMin as number) >= (formData.socMax as number)) {
      setError('Minimum SOC (0..1) must be less than Maximum SOC (0..1)');
      setLoading(false);
      return;
    }

    try {
      if (id) {
        await api.patch(`/bess/${id}`, formData);
      } else {
        await api.post('/bess', formData);
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex justify-between items-center pb-4 border-b border-white/10">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              {id ? 'Edit BESS Asset' : 'Register New BESS Asset'}
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Configure hardware ratings, constraints, and calibration parameters
            </p>
          </div>
          <Link to="/dashboard" className="text-sm font-medium text-primary hover:underline">
            Back to Dashboard
          </Link>
        </header>

        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 text-red-400 rounded-xl text-sm font-semibold">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Identification */}
          <div className="glass p-6 rounded-2xl border border-white/5 space-y-4">
            <h2 className="text-lg font-bold text-white border-b border-white/5 pb-2">1. Identification</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">BESS Code *</label>
                <input
                  type="text"
                  name="bessCode"
                  value={formData.bessCode || ''}
                  onChange={handleChange}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Manufacturer</label>
                <input
                  type="text"
                  name="manufacturer"
                  value={formData.manufacturer || ''}
                  onChange={handleChange}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Model</label>
                <input
                  type="text"
                  name="model"
                  value={formData.model || ''}
                  onChange={handleChange}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* 2. Battery Module Parameters */}
          <div className="glass p-6 rounded-2xl border border-white/5 space-y-4">
            <h2 className="text-lg font-bold text-white border-b border-white/5 pb-2">2. Battery Design</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Chemistry</label>
                <select
                  name="batteryChemistry"
                  value={formData.batteryChemistry || 'Li-ion'}
                  onChange={handleChange}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-primary"
                >
                  <option value="Li-ion" className="bg-slate-900">Lithium-Ion (Li-ion)</option>
                  <option value="LFP" className="bg-slate-900">Lithium Iron Phosphate (LFP)</option>
                  <option value="NMC" className="bg-slate-900">Nickel Manganese Cobalt (NMC)</option>
                  <option value="Lead-Acid" className="bg-slate-900">Lead-Acid</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Module Count</label>
                <input
                  type="number"
                  name="moduleCount"
                  value={formData.moduleCount || 0}
                  onChange={handleChange}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Cells per Module</label>
                <input
                  type="number"
                  name="cellsPerModule"
                  value={formData.cellsPerModule || 0}
                  onChange={handleChange}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* 3. Capacity & Power limits */}
          <div className="glass p-6 rounded-2xl border border-white/5 space-y-4">
            <h2 className="text-lg font-bold text-white border-b border-white/5 pb-2">3. Capacity & Power Ratings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Rated Capacity (kWh)</label>
                <input
                  type="number"
                  name="ratedEnergyKwh"
                  value={formData.ratedEnergyKwh || ''}
                  onChange={handleChange}
                  step="0.1"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Usable Capacity (kWh)</label>
                <input
                  type="number"
                  name="usableEnergyKwh"
                  value={formData.usableEnergyKwh || ''}
                  onChange={handleChange}
                  step="0.1"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Rated Power (kW)</label>
                <input
                  type="number"
                  name="ratedPowerKw"
                  value={formData.ratedPowerKw || ''}
                  onChange={handleChange}
                  step="0.1"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Round-trip Efficiency (0..1)</label>
                <input
                  type="number"
                  name="roundTripEfficiency"
                  value={formData.roundTripEfficiency || ''}
                  onChange={handleChange}
                  step="0.01"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-primary"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Max Charge Power (kW)</label>
                <input
                  type="number"
                  name="maxChargePowerKw"
                  value={formData.maxChargePowerKw || ''}
                  onChange={handleChange}
                  step="0.1"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Max Discharge Power (kW)</label>
                <input
                  type="number"
                  name="maxDischargePowerKw"
                  value={formData.maxDischargePowerKw || ''}
                  onChange={handleChange}
                  step="0.1"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* 4. Electrical Limits */}
          <div className="glass p-6 rounded-2xl border border-white/5 space-y-4">
            <h2 className="text-lg font-bold text-white border-b border-white/5 pb-2">4. Electrical Constraints</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Nominal Voltage (V)</label>
                <input
                  type="number"
                  name="nominalVoltageV"
                  value={formData.nominalVoltageV || ''}
                  onChange={handleChange}
                  step="0.1"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Min Voltage Limit (V)</label>
                <input
                  type="number"
                  name="minVoltageV"
                  value={formData.minVoltageV || ''}
                  onChange={handleChange}
                  step="0.1"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Max Voltage Limit (V)</label>
                <input
                  type="number"
                  name="maxVoltageV"
                  value={formData.maxVoltageV || ''}
                  onChange={handleChange}
                  step="0.1"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-primary"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Max Charge Current (A)</label>
                <input
                  type="number"
                  name="maxChargeCurrentA"
                  value={formData.maxChargeCurrentA || ''}
                  onChange={handleChange}
                  step="0.1"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Max Discharge Current (A)</label>
                <input
                  type="number"
                  name="maxDischargeCurrentA"
                  value={formData.maxDischargeCurrentA || ''}
                  onChange={handleChange}
                  step="0.1"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* 5. Thermal & Grid Constants */}
          <div className="glass p-6 rounded-2xl border border-white/5 space-y-4">
            <h2 className="text-lg font-bold text-white border-b border-white/5 pb-2">5. Calibration & Operating Constraints</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Min Temperature (°C)</label>
                <input
                  type="number"
                  name="minTemperatureC"
                  value={formData.minTemperatureC ?? ''}
                  onChange={handleChange}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Max Temperature (°C)</label>
                <input
                  type="number"
                  name="maxTemperatureC"
                  value={formData.maxTemperatureC ?? ''}
                  onChange={handleChange}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Min SOC boundary (0..1)</label>
                <input
                  type="number"
                  name="socMin"
                  value={formData.socMin ?? ''}
                  onChange={handleChange}
                  step="0.01"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Max SOC boundary (0..1)</label>
                <input
                  type="number"
                  name="socMax"
                  value={formData.socMax ?? ''}
                  onChange={handleChange}
                  step="0.01"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Degradation Coeff (per cycle)</label>
                <input
                  type="number"
                  name="degradationCoefficient"
                  value={formData.degradationCoefficient ?? ''}
                  onChange={handleChange}
                  step="0.000001"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-white/5 pt-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Nominal Grid Freq (Hz)</label>
                <input
                  type="number"
                  name="nominalGridFrequencyHz"
                  value={formData.nominalGridFrequencyHz ?? ''}
                  onChange={handleChange}
                  step="0.01"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Frequency Deadband (Hz)</label>
                <input
                  type="number"
                  name="frequencyDeadbandHz"
                  value={formData.frequencyDeadbandHz ?? ''}
                  onChange={handleChange}
                  step="0.001"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Droop Gain (kW/Hz)</label>
                <input
                  type="number"
                  name="droopGainKwPerHz"
                  value={formData.droopGainKwPerHz ?? ''}
                  onChange={handleChange}
                  step="0.1"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium py-2.5 px-6 rounded-xl transition duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-primary hover:bg-primary/95 disabled:opacity-50 text-white font-medium py-2.5 px-6 rounded-xl transition duration-200 shadow-lg shadow-blue-500/20"
            >
              {loading ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
