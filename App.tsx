import React, { useState, useEffect, useCallback } from 'react';
import { SimulationCanvas } from './components/SimulationCanvas';
import { Controls } from './components/Controls';
import { MainMenu } from './components/MainMenu';
import { SimulationConfig } from './types';
import { DEFAULT_CONFIG } from './constants';

type UIState = 'game' | 'mainMenu' | 'settings';

const App: React.FC = () => {
  const [config, setConfig] = useState<SimulationConfig>(DEFAULT_CONFIG);
  const [uiState, setUiState] = useState<UIState>('mainMenu');

  const handleConfigChange = (newConfig: SimulationConfig) => {
    setConfig(newConfig);
  };

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG);
  };

  // ESC键切换UI状态
  const handleEscapeKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setUiState(prev => prev === 'game' ? 'mainMenu' : 'game');
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleEscapeKey);
    return () => window.removeEventListener('keydown', handleEscapeKey);
  }, [handleEscapeKey]);

  return (
    <div className="w-screen h-screen overflow-hidden bg-gray-900 font-sans text-gray-900">
      {/* 游戏画布层 - 始终渲染 */}
      <SimulationCanvas config={config} isPaused={uiState !== 'game'} />

      {/* UI层 - 根据状态显示不同界面 */}
      {uiState === 'mainMenu' && (
        <MainMenu
          onSettings={() => setUiState('settings')}
          onResume={() => setUiState('game')}
        />
      )}

      {uiState === 'settings' && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-emerald-500 to-teal-600 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                设置
              </h2>
              <button
                onClick={() => setUiState('mainMenu')}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                title="返回主菜单"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <Controls
                config={config}
                onChange={handleConfigChange}
                onReset={handleReset}
              />
            </div>
          </div>
        </div>
      )}

      {/* 游戏中的ESC提示 */}
      {uiState === 'game' && (
        <div className="absolute bottom-4 left-4 pointer-events-none">
          <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
            <span className="text-white text-sm">按 <kbd className="px-2 py-1 bg-white/20 rounded font-mono">ESC</kbd> 打开菜单</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
