import React, { useState } from 'react';
import { SimulationCanvas } from './components/SimulationCanvas';
import { Controls } from './components/Controls';
import { ChatPanel } from './components/ChatPanel';
import { SimulationConfig } from './types';
import { DEFAULT_CONFIG } from './constants';

const App: React.FC = () => {
  const [config, setConfig] = useState<SimulationConfig>(DEFAULT_CONFIG);

  const handleConfigChange = (newConfig: SimulationConfig) => {
    setConfig(newConfig);
  };

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG);
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 selection:bg-emerald-200 selection:text-emerald-900">
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-sm">
                S
             </div>
             <h1 className="text-xl font-bold tracking-tight text-gray-900">
               Particle Fluid <span className="text-emerald-600">Sim</span>
             </h1>
          </div>
          <div className="text-sm text-gray-500 hidden sm:block">
            Interactive Slime Physics Lab
          </div>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-[calc(100vh-4rem)]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
          
          {/* Left Column: Controls (3 cols) */}
          <div className="lg:col-span-3 h-full overflow-hidden">
            <Controls 
                config={config} 
                onChange={handleConfigChange} 
                onReset={handleReset} 
            />
          </div>

          {/* Center Column: Simulation (6 cols) */}
          <div className="lg:col-span-6 h-full flex flex-col justify-start">
            <SimulationCanvas config={config} />
             <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200 text-sm text-gray-600 shadow-sm">
                <p>
                    <strong>Controls:</strong> Use your mouse or touch to drag the slime.
                    Hold <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded font-mono text-xs">Q</kbd> to charge, release to launch at cursor (max 1 sec = full power).
                    Press <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded font-mono text-xs">Space</kbd> for quick random launch.
                    Adjust parameters to see how <strong>Viscosity</strong>, <strong>Cohesion</strong>, and <strong>Pressure</strong> affect the simulation in real-time.
                </p>
            </div>
          </div>

          {/* Right Column: AI Chat (3 cols) */}
          <div className="lg:col-span-3 h-full overflow-hidden">
             <ChatPanel config={config} />
          </div>

        </div>
      </main>
    </div>
  );
};

export default App;
