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
}

const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate, title, navItems }) => {
  return (
    <aside className="w-64 bg-brand-dark-blue p-6 flex flex-col fixed top-0 left-0 h-full border-r border-brand-border">
      <div className="flex items-center gap-3 mb-10">
        <DashboardIcon />
        <h1 className="text-xl font-bold text-white leading-tight">{title}</h1>
      </div>
      <nav>
        <ul>
          {navItems.map(item => (
            <li key={item.id}>
              <button
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 my-2 rounded-lg text-left transition-colors duration-200 ${
                  activePage === item.id
                    ? 'bg-brand-cyan text-white shadow-md'
                    : 'text-gray-400 hover:bg-brand-dark hover:text-white'
                }`}
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
