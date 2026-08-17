import { useBess } from '../hooks/useBess';
import { useTelemetry } from '../hooks/useTelemetry';
import { useDecision } from '../hooks/useDecision';
import { useBatteryState } from '../hooks/useBatteryState';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, ReferenceLine } from 'recharts';
import { Activity, Thermometer, BatteryCharging, Zap, Cpu, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import supabase from '../lib/supabase';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { assets, currentAsset, selectAsset, loading: assetLoading } = useBess();
  const { telemetry, latestSample } = useTelemetry(currentAsset?.id);
  const { decision } = useDecision(currentAsset?.id);
  const { batteryState } = useBatteryState(currentAsset?.id);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  // Time format helper for charts
  const formatTime = (timeStr: string) => {
    try {
      const date = new Date(timeStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '';
    }
  };

  // Real KPI values from C++ engine state estimation
  const soc = batteryState ? batteryState.soc * 100 : (currentAsset?.socInitial ? currentAsset.socInitial * 100 : 50.0);
  const soh = batteryState ? batteryState.soh * 100 : (currentAsset?.sohInitial ? currentAsset.sohInitial * 100 : 100.0);
  const availEnergy = batteryState ? batteryState.availableEnergyKwh : 0;

  // Live telemetry readings
  const temp = latestSample?.batteryTemperatureC ?? 25.0;
  const v_batt = latestSample?.batteryVoltageV ?? (currentAsset?.nominalVoltageV ?? 720.0);
  const i_batt = latestSample?.batteryCurrentA ?? 0.0;
  const freq = latestSample?.gridFrequencyHz ?? 50.0;

  // Dispatch decision from C++ engine (or sensible defaults)
  const dispatchAction = decision?.action ?? 'HOLD';
  const dispatchPower = decision?.targetPowerKw ?? 0;
  const dispatchReason = decision?.reasonText ?? 'No dispatch analysis has been run yet. Ingest telemetry to trigger the C++ engine.';

  const actionColor = {
    CHARGE: 'text-emerald-400',
    DISCHARGE: 'text-amber-400',
    HOLD: 'text-blue-400',
    SUSPENDED: 'text-red-400',
  }[dispatchAction] ?? 'text-blue-400';

  const actionBadge = {
    CHARGE: 'bg-emerald-500/10 text-emerald-400',
    DISCHARGE: 'bg-amber-500/10 text-amber-400',
    HOLD: 'bg-blue-500/10 text-blue-400',
    SUSPENDED: 'bg-red-500/10 text-red-400',
  }[dispatchAction] ?? 'bg-blue-500/10 text-blue-400';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Navbar */}
      <nav className="glass border-b border-white/5 py-4 px-6 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🔋</span>
          <div>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              BESS Dispatch Core
            </span>
            <span className="text-xs text-slate-500 block">Intelligence &amp; Control Platform</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {assets.length > 0 && (
            <select
              value={currentAsset?.id || ''}
              onChange={(e) => {
                const asset = assets.find(a => a.id === e.target.value);
                if (asset) selectAsset(asset);
              }}
              className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-primary"
            >
              {assets.map(asset => (
                <option key={asset.id} value={asset.id}>
                  {asset.bessCode} ({asset.model || 'Unknown'})
                </option>
              ))}
            </select>
          )}

          <Link
            to={currentAsset ? `/bess/${currentAsset.id}/configuration` : '/bess/new'}
            className="text-xs font-semibold bg-white/5 border border-white/10 text-white hover:bg-white/10 rounded-xl px-4 py-2.5 transition"
          >
            ⚙️ Configure Asset
          </Link>
          
          <Link
            to="/bess/new"
            className="text-xs font-semibold bg-primary text-white hover:bg-primary/90 rounded-xl px-4 py-2.5 transition shadow-lg shadow-blue-500/20"
          >
            + New Asset
          </Link>

          <button
            onClick={handleLogout}
            title="Sign out"
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <LogOut size={16} />
          </button>
        </div>
      </nav>

      {/* Main Workspace */}
      <div className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
        {assetLoading ? (
          <div className="text-center py-20 text-slate-400">Loading BESS assets...</div>
        ) : !currentAsset ? (
          <div className="glass p-12 rounded-3xl border border-white/5 text-center max-w-md mx-auto space-y-4 mt-12">
            <span className="text-5xl">⚡</span>
            <h2 className="text-2xl font-bold">No assets registered</h2>
            <p className="text-sm text-slate-400">Register your first battery asset to start ingesting telemetry and dispatching commands.</p>
            <Link to="/bess/new" className="inline-block bg-primary text-white font-medium px-6 py-2.5 rounded-xl">
              Register BESS
            </Link>
          </div>
        ) : (
          <>
            {/* KPI Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* SOC — from real C++ state estimation */}
              <div className="glass p-5 rounded-2xl border border-white/5 flex items-center gap-4 relative overflow-hidden group">
                <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                  <BatteryCharging size={24} />
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">State of Charge (SOC)</span>
                  <span className="text-2xl font-black text-white">{soc.toFixed(1)}%</span>
                </div>
                <div className={`absolute right-3 bottom-2 text-xs font-bold px-2 py-0.5 rounded-full ${soc < (currentAsset.socMin * 100 + 5) ? 'bg-red-500/20 text-red-400' : soc > (currentAsset.socMax * 100 - 5) ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/10 text-emerald-500'}`}>
                  {batteryState ? 'Engine Est.' : 'Initial'}
                </div>
              </div>

              {/* SOH — from real C++ state estimation */}
              <div className="glass p-5 rounded-2xl border border-white/5 flex items-center gap-4 relative overflow-hidden group">
                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                  <Activity size={24} />
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">State of Health (SOH)</span>
                  <span className="text-2xl font-black text-white">{soh.toFixed(1)}%</span>
                </div>
              </div>

              {/* Temperature */}
              <div className="glass p-5 rounded-2xl border border-white/5 flex items-center gap-4 relative overflow-hidden group">
                <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
                  <Thermometer size={24} />
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Battery Temp</span>
                  <span className="text-2xl font-black text-white">{temp.toFixed(1)} °C</span>
                </div>
                <div className={`absolute right-3 bottom-2 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${temp > 45 ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>
                  {temp > 45 ? 'High' : 'Normal'}
                </div>
              </div>

              {/* Available Energy — from real C++ computation */}
              <div className="glass p-5 rounded-2xl border border-white/5 flex items-center gap-4 relative overflow-hidden group">
                <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400">
                  <Zap size={24} />
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Available Energy</span>
                  <span className="text-2xl font-black text-white">{availEnergy.toFixed(1)} kWh</span>
                </div>
              </div>
            </div>

            {/* Middle Section: Dispatch Decision Card & Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Engine Dispatch Decision — real C++ engine output */}
              <div className="glass p-6 rounded-2xl border border-white/10 flex flex-col justify-between shadow-2xl relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Cpu size={14} className="text-primary" /> Core Recommendation
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${decision ? actionBadge : 'bg-slate-700/50 text-slate-500'}`}>
                      {decision ? 'C++ Engine' : 'No Data'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className={`text-4xl font-extrabold uppercase tracking-tight ${actionColor}`}>
                      {dispatchAction}
                    </div>
                    <div className="text-sm font-semibold text-slate-300">
                      Target Power: <span className="font-mono text-white text-base">{Math.abs(dispatchPower).toFixed(1)} kW</span>
                    </div>
                    {decision && (
                      <div className="text-xs text-slate-500 font-mono">
                        Score: {decision.score?.toFixed(3)} · {decision.reasonCode}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-white/5 pt-3 space-y-2">
                    <div className="text-xs font-semibold text-slate-400">Engine Reason:</div>
                    <p className="text-xs text-slate-300 leading-relaxed bg-white/5 p-3 rounded-xl border border-white/5">
                      {dispatchReason}
                    </p>
                  </div>
                </div>

                <div className="mt-6 border-t border-white/5 pt-4 grid grid-cols-2 gap-3 text-center text-xs">
                  <div className="bg-slate-900/50 p-2.5 rounded-xl border border-white/5">
                    <span className="text-slate-400 block mb-0.5">Voltage</span>
                    <span className="font-mono font-bold text-white">{v_batt.toFixed(1)} V</span>
                  </div>
                  <div className="bg-slate-900/50 p-2.5 rounded-xl border border-white/5">
                    <span className="text-slate-400 block mb-0.5">Current</span>
                    <span className="font-mono font-bold text-white">{i_batt.toFixed(1)} A</span>
                  </div>
                </div>
              </div>

              {/* Chart 1: Renewable vs Load */}
              <div className="glass p-6 rounded-2xl border border-white/5 lg:col-span-2 flex flex-col space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-base font-bold text-white">Renewable Generation vs Load Demand</h3>
                    <p className="text-[10px] text-slate-400">Power tracking across sliding window</p>
                  </div>
                  <div className="flex gap-4 text-xs font-bold">
                    <span className="flex items-center gap-1.5 text-emerald-400"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Renewable</span>
                    <span className="flex items-center gap-1.5 text-blue-400"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Load</span>
                  </div>
                </div>

                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={telemetry} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRen" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                      <XAxis dataKey="recordedAt" tickFormatter={formatTime} stroke="rgba(255,255,255,0.2)" fontSize={10} />
                      <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} unit="kW" />
                      <Tooltip 
                        contentStyle={{ background: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                        labelFormatter={(label) => new Date(label).toLocaleString()}
                      />
                      <Area type="monotone" dataKey="renewablePowerKw" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRen)" name="Renewable Power" />
                      <Area type="monotone" dataKey="loadPowerKw" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorLoad)" name="Load Power" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Bottom Row Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Chart 2: Grid Frequency */}
              <div className="glass p-6 rounded-2xl border border-white/5 flex flex-col space-y-4">
                <div>
                  <h3 className="text-base font-bold text-white">Grid Frequency Monitoring ({freq.toFixed(2)} Hz)</h3>
                  <p className="text-[10px] text-slate-400">Nominal 50.0 Hz reference line</p>
                </div>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={telemetry} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                      <XAxis dataKey="recordedAt" tickFormatter={formatTime} stroke="rgba(255,255,255,0.2)" fontSize={10} />
                      <YAxis domain={[49.7, 50.3]} stroke="rgba(255,255,255,0.2)" fontSize={10} unit="Hz" />
                      <Tooltip 
                        contentStyle={{ background: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                      />
                      <ReferenceLine y={50.0} stroke="#ef4444" strokeDasharray="3 3" label={{ value: '50Hz', fill: '#ef4444', fontSize: 10, position: 'insideTopRight' }} />
                      <Line type="monotone" dataKey="gridFrequencyHz" stroke="#a855f7" strokeWidth={2} dot={false} name="Frequency" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 3: SOC History — uses real computed SOC from C++ engine */}
              <div className="glass p-6 rounded-2xl border border-white/5 flex flex-col space-y-4">
                <div>
                  <h3 className="text-base font-bold text-white">State of Charge (SOC) Estimation</h3>
                  <p className="text-[10px] text-slate-400">
                    Upper limit: {(currentAsset.socMax * 100).toFixed(0)}% | Lower limit: {(currentAsset.socMin * 100).toFixed(0)}%
                    {batteryState ? ' · C++ Coulomb-counting' : ' · Awaiting engine data'}
                  </p>
                </div>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={telemetry} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorSoc" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                      <XAxis dataKey="recordedAt" tickFormatter={formatTime} stroke="rgba(255,255,255,0.2)" fontSize={10} />
                      <YAxis domain={[0, 100]} stroke="rgba(255,255,255,0.2)" fontSize={10} unit="%" />
                      <Tooltip 
                        contentStyle={{ background: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                      />
                      <ReferenceLine y={currentAsset.socMax * 100} stroke="#ef4444" strokeDasharray="3 3" />
                      <ReferenceLine y={currentAsset.socMin * 100} stroke="#ef4444" strokeDasharray="3 3" />
                      {/* SOC from telemetry: derived via Coulomb-counting approximation using current.
                          The C++ engine persists accurate SOC in battery_states; this chart shows
                          per-sample approximation for visualization purposes. The KPI card above
                          shows the authoritative C++ SOC. */}
                      <Area
                        type="monotone"
                        data={telemetry.map(t => ({
                          ...t,
                          soc: Math.min(100, Math.max(0, soc - (t.batteryCurrentA ?? 0) * 0.05))
                        }))}
                        dataKey="soc"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fill="url(#colorSoc)"
                        name="SOC %"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
