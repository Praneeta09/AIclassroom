import React from 'react';
import { DashboardIcon } from './Icons';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  title: React.ReactNode;
  navItems: NavItem[];
  isOfflineMode?: boolean;
  toggleOfflineMode?: (val: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate, title, navItems, isOfflineMode, toggleOfflineMode }) => {
  return (
    <aside className="w-64 bg-brand-dark-blue p-6 flex flex-col fixed top-0 left-0 h-full border-r border-brand-border">
      <div className="flex items-center gap-3 mb-10">
        <div className="p-2 bg-brand-cyan/20 rounded-lg"><DashboardIcon /></div>
        <h1 className="text-xl font-bold text-white leading-tight">{title}</h1>
      </div>
      <nav className="flex-1 overflow-y-auto pr-2 custom-scrollbar scroll-smooth">
        <ul>
          {navItems.map(item => (
            <li key={item.id}>
              <button
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 my-1 rounded-xl text-left transition-all duration-300 ${
                  activePage === item.id
                    ? 'bg-brand-cyan text-white shadow-[0_0_20px_rgba(6,182,212,0.3)]'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className={`${activePage === item.id ? 'text-white' : 'text-brand-cyan/70'}`}>{item.icon}</span>
                <span className="font-semibold text-sm">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {toggleOfflineMode && (
        <div className="mt-auto pt-6 border-t border-brand-border space-y-4">
          <div className="flex items-center justify-between">
             <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Network Status</span>
             <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 font-medium">{isOfflineMode ? 'Local AI' : 'Cloud Sync'}</span>
                <span className={`h-2.5 w-2.5 rounded-full ring-2 ring-brand-dark shadow-[0_0_8px_rgba(6,182,212,0.5)] ${isOfflineMode ? 'bg-brand-cyan animate-pulse' : 'bg-green-500'}`}></span>
             </div>
          </div>
          <button 
            onClick={() => toggleOfflineMode(!isOfflineMode)}
            className={`w-full group relative overflow-hidden flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-500 ${
              isOfflineMode 
                ? 'bg-brand-cyan/10 border-brand-cyan/50 text-brand-cyan shadow-[inset_0_0_12px_rgba(6,182,212,0.1)]' 
                : 'bg-brand-dark/50 border-brand-border text-gray-400 hover:border-brand-cyan/30'
            }`}
          >
            <div className={`absolute inset-0 bg-gradient-to-r from-brand-cyan/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`}></div>
            <span className="text-lg relative z-10">{isOfflineMode ? '⚡' : '☁️'}</span>
            <div className="flex flex-col relative z-10">
              <span className="font-bold text-xs uppercase tracking-tight">{isOfflineMode ? 'Offline Active' : 'Online Mode'}</span>
              <span className="text-[9px] font-medium opacity-60">Mistral local core</span>
            </div>
          </button>
          
          {isOfflineMode && (
             <div className="p-3 bg-brand-cyan/5 rounded-xl border border-brand-cyan/10 animate-in fade-in duration-700">
                <p className="text-[10px] text-brand-cyan/90 leading-tight font-semibold text-center italic">🧠 Local Node: Ollama is running</p>
             </div>
          )}
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
