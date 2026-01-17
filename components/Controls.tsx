import React from 'react';
import { SimulationConfig } from '../types';

interface ControlsProps {
  config: SimulationConfig;
  onChange: (newConfig: SimulationConfig) => void;
  onReset: () => void;
}

export const Controls: React.FC<ControlsProps> = ({ config, onChange, onReset }) => {
  const handleChange = (key: keyof SimulationConfig, value: number) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 h-full flex flex-col gap-6">
      <div className="flex justify-between items-center border-b pb-4 border-gray-100">
        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            Fluid Controls
        </h3>
        <button 
            onClick={onReset}
            className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold hover:bg-emerald-50 px-2 py-1 rounded transition-colors"
        >
            Reset
        </button>
      </div>

      <div className="space-y-6 flex-1 overflow-y-auto pr-2">
        
        {/* Render Mode */}
        <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
            <label className="text-xs font-bold text-emerald-800 uppercase tracking-wide mb-2 block">Visualization</label>
            <div className="flex gap-2">
                {['blob', 'particles', 'debug'].map((mode) => (
                    <button
                        key={mode}
                        onClick={() => onChange({...config, renderMode: mode as any})}
                        className={`flex-1 py-1.5 text-xs font-medium rounded capitalize transition-all ${
                            config.renderMode === mode 
                            ? 'bg-emerald-500 text-white shadow-md' 
                            : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                        }`}
                    >
                        {mode}
                    </button>
                ))}
            </div>
        </div>

        {/* Viscosity */}
        <div className="space-y-2">
            <div className="flex justify-between">
                <label className="text-sm font-medium text-gray-700">Viscosity (Damping)</label>
                <span className="text-sm text-gray-500 font-mono">{(config.damping * 100).toFixed(0)}%</span>
            </div>
            <input
                type="range"
                min="0.80"
                max="0.99"
                step="0.01"
                value={config.damping}
                onChange={(e) => handleChange('damping', Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <p className="text-xs text-gray-400">Controls how thick/runny the fluid feels.</p>
        </div>

        {/* Attraction */}
        <div className="space-y-2">
            <div className="flex justify-between">
                <label className="text-sm font-medium text-gray-700">Cohesion Strength</label>
                <span className="text-sm text-gray-500 font-mono">{config.attractionStrength}</span>
            </div>
            <input
                type="range"
                min="0.1"
                max="5.0"
                step="0.1"
                value={config.attractionStrength}
                onChange={(e) => handleChange('attractionStrength', Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <p className="text-xs text-gray-400">How strongly particles clump together.</p>
        </div>

        {/* Repulsion */}
        <div className="space-y-2">
            <div className="flex justify-between">
                <label className="text-sm font-medium text-gray-700">Repulsion (Pressure)</label>
                <span className="text-sm text-gray-500 font-mono">{config.repulsionStrength}</span>
            </div>
            <input
                type="range"
                min="100"
                max="2000"
                step="100"
                value={config.repulsionStrength}
                onChange={(e) => handleChange('repulsionStrength', Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <p className="text-xs text-gray-400">Force pushing particles apart to maintain volume.</p>
        </div>

        {/* Gravity */}
        <div className="space-y-2">
            <div className="flex justify-between">
                <label className="text-sm font-medium text-gray-700">Gravity</label>
                <span className="text-sm text-gray-500 font-mono">{config.gravity}</span>
            </div>
            <input
                type="range"
                min="0"
                max="1000"
                step="50"
                value={config.gravity}
                onChange={(e) => handleChange('gravity', Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
        </div>

         {/* Particle Count */}
         <div className="space-y-2 pt-4 border-t border-gray-100">
            <div className="flex justify-between">
                <label className="text-sm font-medium text-gray-700">Particle Count</label>
                <span className="text-sm text-gray-500 font-mono">{config.particleCount}</span>
            </div>
            <input
                type="range"
                min="50"
                max="300"
                step="10"
                value={config.particleCount}
                onChange={(e) => handleChange('particleCount', Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
        </div>
      </div>
    </div>
  );
};
