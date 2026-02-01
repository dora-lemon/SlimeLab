import React from 'react';

interface MainMenuProps {
  onSettings: () => void;
  onResume: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onSettings, onResume }) => {
  return (
    <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center">
      <div className="text-center">
        {/* 游戏标题 */}
        <div className="mb-12">
          <div className="inline-block mb-4">
            <div className="w-24 h-24 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-2xl mx-auto">
              <span className="text-white text-5xl font-bold">S</span>
            </div>
          </div>
          <h1 className="text-6xl font-bold text-white mb-2">Slime Physics</h1>
          <p className="text-emerald-400 text-xl">互动物理实验室</p>
        </div>

        {/* 菜单按钮 */}
        <div className="space-y-4 max-w-xs mx-auto">
          <button
            onClick={onResume}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 px-8 rounded-xl shadow-lg transition-all transform hover:scale-105 flex items-center justify-center gap-3"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            继续游戏
          </button>

          <button
            onClick={onSettings}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-4 px-8 rounded-xl shadow-lg transition-all transform hover:scale-105 flex items-center justify-center gap-3"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            设置
          </button>
        </div>

        {/* 操作提示 */}
        <div className="mt-12 text-gray-400 text-sm space-y-2">
          <p>按 <kbd className="px-2 py-1 bg-gray-700 rounded font-mono">A</kbd> / <kbd className="px-2 py-1 bg-gray-700 rounded font-mono">D</kbd> 移动</p>
          <p>按 <kbd className="px-2 py-1 bg-gray-700 rounded font-mono">空格</kbd> 跳跃</p>
          <p>按住鼠标左键蓄力，释放发射粒子</p>
          <p>按 <kbd className="px-2 py-1 bg-gray-700 rounded font-mono">ESC</kbd> 切换菜单</p>
        </div>
      </div>
    </div>
  );
};
