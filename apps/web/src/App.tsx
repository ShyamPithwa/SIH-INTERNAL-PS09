import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ConfigurationPage from './pages/ConfigurationPage';
import DashboardPage from './pages/DashboardPage';

function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
      <div className="glass p-8 rounded-2xl max-w-md w-full border border-white/10 shadow-2xl space-y-6">
        <div className="text-5xl">🔋</div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          BESS Intelligence
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Battery Energy Storage System monitoring, forecasting, and constrained dispatch optimization platform.
        </p>
        <div className="flex flex-col gap-3">
          <a
            href="/dashboard"
            className="w-full bg-primary hover:bg-primary/95 text-white font-medium py-2.5 px-4 rounded-xl transition duration-200 text-center shadow-lg shadow-blue-500/20"
          >
            Enter Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/bess/new" element={<ConfigurationPage />} />
        <Route path="/bess/:id/configuration" element={<ConfigurationPage />} />
      </Routes>
    </BrowserRouter>
  );
}
