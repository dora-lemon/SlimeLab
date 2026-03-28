import React from 'react';
import { SimulationConfig, AudioConfig } from '../types';

interface ControlsProps {
  config: SimulationConfig;
  audioConfig: AudioConfig;
  onChange: (newConfig: SimulationConfig) => void;
  onAudioChange: (newConfig: AudioConfig) => void;
  onReset: () => void;
}

export const Controls: React.FC<ControlsProps> = ({ config, audioConfig, onChange, onAudioChange, onReset }) => {
  const handleChange = (key: keyof SimulationConfig, value: number) => {
    onChange({ ...config, [key]: value });
  };

  const handleAudioChange = (key: keyof AudioConfig, value: number) => {
    onAudioChange({ ...audioConfig, [key]: value });
  };

  const modeLabels: Record<string, string> = {
    'blob': '史莱姆',
    'particles': '粒子',
    'debug': '调试'
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center border-b pb-4 border-gray-100">
        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            流体控制
        </h3>
        <button
            onClick={onReset}
            className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold hover:bg-emerald-50 px-2 py-1 rounded transition-colors"
        >
            重置
        </button>
      </div>

      <div className="space-y-6">

        {/* Render Mode */}
        <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
            <label className="text-xs font-bold text-emerald-800 uppercase tracking-wide mb-2 block">可视化模式</label>
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
                        {modeLabels[mode]}
                    </button>
                ))}
            </div>
        </div>

        {/* Viscosity */}
        <div className="space-y-2">
            <div className="flex justify-between">
                <label className="text-sm font-medium text-gray-700">粘度（阻尼）</label>
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
            <p className="text-xs text-gray-400">控制流体的粘稠程度</p>
        </div>

        {/* Attraction */}
        <div className="space-y-2">
            <div className="flex justify-between">
                <label className="text-sm font-medium text-gray-700">内聚强度</label>
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
            <p className="text-xs text-gray-400">粒子聚集的强度</p>
        </div>

        {/* Repulsion */}
        <div className="space-y-2">
            <div className="flex justify-between">
                <label className="text-sm font-medium text-gray-700">排斥力（压力）</label>
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
            <p className="text-xs text-gray-400">推开粒子以保持体积的力</p>
        </div>

        {/* Gravity */}
        <div className="space-y-2">
            <div className="flex justify-between">
                <label className="text-sm font-medium text-gray-700">重力</label>
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
                <label className="text-sm font-medium text-gray-700">粒子数量</label>
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

        {/* Audio Settings */}
        <div className="space-y-4 pt-4 border-t border-gray-100">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2 block">音效设置</label>

            {/* Bounce Volume */}
            <div className="space-y-2">
                <div className="flex justify-between">
                    <label className="text-sm font-medium text-gray-700">落地音量</label>
                    <span className="text-sm text-gray-500 font-mono">{Math.round(audioConfig.bounceVolume * 100)}%</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={audioConfig.bounceVolume}
                    onChange={(e) => handleAudioChange('bounceVolume', Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
            </div>

            {/* SFX Volume */}
            <div className="space-y-2">
                <div className="flex justify-between">
                    <label className="text-sm font-medium text-gray-700">音效音量</label>
                    <span className="text-sm text-gray-500 font-mono">{Math.round(audioConfig.sfxVolume * 100)}%</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={audioConfig.sfxVolume}
                    onChange={(e) => handleAudioChange('sfxVolume', Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
            </div>
        </div>
      </div>
    </div>
  );
};
