import React from 'react';
import { Role } from '../types';
import { TeacherIcon, StudentIcon, ParentIcon } from './Icons';

interface RoleSelectionProps {
  onSelectRole: (role: Role) => void;
}

const RoleSelection: React.FC<RoleSelectionProps> = ({ onSelectRole }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] relative">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="text-center mb-14 relative z-10">
        <div className="inline-flex items-center gap-3 mb-4 px-5 py-2 bg-brand-cyan/10 border border-brand-cyan/30 rounded-full">
          <span className="w-2 h-2 bg-brand-cyan rounded-full animate-pulse" />
          <span className="text-brand-cyan text-xs font-bold uppercase tracking-[0.3em]">AI-Powered Education Platform</span>
        </div>
        <h1 className="text-6xl font-black bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 bg-clip-text text-transparent leading-tight">
          Vidya AI
        </h1>
        <p className="text-2xl mt-3 text-gray-400 font-light">Smart Learning • Infinite Possibilities</p>
        <p className="text-sm mt-3 text-gray-600">Select your role to get started</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl relative z-10">
        <RoleCard
          icon={<TeacherIcon />}
          title="I'm a Teacher"
          description="Create quizzes, generate 3D animations, and manage classes with AI."
          buttonText="Go to Teacher Portal"
          gradient="from-cyan-500/20 to-blue-500/20"
          borderColor="border-cyan-500/30 hover:border-cyan-400"
          btnClass="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400"
          onClick={() => onSelectRole('teacher')}
        />
        <RoleCard
          icon={<StudentIcon />}
          title="I'm a Student"
          description="Take interactive quizzes, watch animations, and track your progress."
          buttonText="Go to Student Portal"
          gradient="from-emerald-500/20 to-teal-500/20"
          borderColor="border-emerald-500/30 hover:border-emerald-400"
          btnClass="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400"
          onClick={() => onSelectRole('student')}
        />
        <RoleCard
          icon={<ParentIcon />}
          title="I'm a Parent"
          description="Monitor your child's progress, attendance, and get AI insights."
          buttonText="Go to Parent Portal"
          gradient="from-purple-500/20 to-pink-500/20"
          borderColor="border-purple-500/30 hover:border-purple-400"
          btnClass="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400"
          onClick={() => onSelectRole('parent')}
        />
      </div>
    </div>
  );
};

interface RoleCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonText: string;
  gradient: string;
  borderColor: string;
  btnClass: string;
  onClick: () => void;
}

const RoleCard: React.FC<RoleCardProps> = ({ icon, title, description, buttonText, gradient, borderColor, btnClass, onClick }) => {
  return (
    <div className={`bg-gradient-to-br ${gradient} backdrop-blur-xl border ${borderColor} rounded-2xl p-8 flex flex-col items-center text-center transform hover:scale-105 hover:shadow-2xl transition-all duration-500 group cursor-pointer`} onClick={onClick}>
      <div className="mb-5 p-4 bg-white/5 rounded-2xl group-hover:scale-110 transition-transform duration-500">{icon}</div>
      <h2 className="text-2xl font-bold mb-3 text-white group-hover:text-brand-cyan transition-colors">
        {title}
      </h2>
      <p className="text-gray-400 mb-8 text-sm leading-relaxed">{description}</p>
      <button
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        className={`${btnClass} text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 w-full shadow-lg hover:shadow-xl`}
      >
        {buttonText}
      </button>
    </div>
  );
};

export default RoleSelection;