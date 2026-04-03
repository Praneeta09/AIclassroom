import React from 'react';
import { Role } from '../types';
import { TeacherIcon, StudentIcon } from './Icons';

interface RoleSelectionProps {
  onSelectRole: (role: Role) => void;
}

const RoleSelection: React.FC<RoleSelectionProps> = ({ onSelectRole }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh]">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-brand-cyan">AI- Smart Classroom</h1>
        <p className="text-xl mt-4 text-gray-400">Select your role to continue</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 w-full max-w-4xl">
        <RoleCard
          icon={<TeacherIcon />}
          title="I'm a Teacher"
          description="Create and manage quizzes using the Gemini AI."
          buttonText="Go to Teacher Portal"
          onClick={() => onSelectRole('teacher')}
        />
        <RoleCard
          icon={<StudentIcon />}
          title="I'm a Student"
          description="Attempt quizzes and track your performance in real-time."
          buttonText="Go to Student Portal"
          onClick={() => onSelectRole('student')}
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
  onClick: () => void;
}

const RoleCard: React.FC<RoleCardProps> = ({ icon, title, description, buttonText, onClick }) => {
  return (
    <div className="bg-brand-dark-blue border border-brand-border rounded-2xl p-8 flex flex-col items-center text-center transform hover:scale-105 hover:shadow-glow-cyan transition-all duration-300">
      <div className="mb-4">{icon}</div>
      <h2 className="text-3xl font-bold mb-2 flex items-center gap-2">
        {title}
      </h2>
      <p className="text-gray-400 mb-8 h-12">{description}</p>
      <button
        onClick={onClick}
        className="bg-brand-cyan text-white font-semibold py-3 px-6 rounded-lg hover:bg-cyan-500 transition-colors duration-300 w-full"
      >
        {buttonText}
      </button>
    </div>
  );
};

export default RoleSelection;