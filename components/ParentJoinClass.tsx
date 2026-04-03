import React, { useState } from 'react';
import { User } from '../types';
import { LogoutIcon } from './Icons';

interface ParentJoinClassProps {
  user: User;
  onJoinClassParent: (classCode: string, studentEmail: string) => Promise<void>;
  onLogout: () => void;
}

const ParentJoinClass: React.FC<ParentJoinClassProps> = ({ user, onJoinClassParent, onLogout }) => {
  const [classCode, setClassCode] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const code = classCode.trim().toUpperCase();
    const email = studentEmail.trim().toLowerCase();

    if (!code || !email) {
      setError('Please enter both Class Code and Student Email.');
      setIsLoading(false);
      return;
    }
    
    try {
        await onJoinClassParent(code, email);
    } catch(err: any) {
        setError(err.message || 'An unknown error occurred.');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh]">
      <div className="w-full max-w-md bg-brand-dark-blue border border-brand-border rounded-2xl p-8 relative">
        <div className="text-center">
            <h1 className="text-3xl font-bold text-brand-cyan">Parent Portal: Join Class</h1>
            <p className="text-gray-400 mt-2">Welcome, {user.name}! Link to your child's classroom.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 mt-8">
            <div>
                <label htmlFor="classCode" className="block text-sm font-medium text-gray-300 mb-2">
                    Class Code
                </label>
                <input
                    type="text"
                    id="classCode"
                    value={classCode}
                    onChange={(e) => setClassCode(e.target.value)}
                    placeholder="e.g., AB12CD"
                    className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:outline-none uppercase"
                    disabled={isLoading}
                />
            </div>
            <div>
                <label htmlFor="studentEmail" className="block text-sm font-medium text-gray-300 mb-2">
                    Student Email
                </label>
                <input
                    type="email"
                    id="studentEmail"
                    value={studentEmail}
                    onChange={(e) => setStudentEmail(e.target.value)}
                    placeholder="child@example.com"
                    className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:outline-none"
                    disabled={isLoading}
                />
            </div>
            {error && <p className="text-red-500 text-sm font-medium bg-red-500/10 p-3 rounded-lg border border-red-500/50">{error}</p>}
            <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-brand-cyan text-white font-bold py-3 px-6 rounded-lg hover:bg-cyan-500 transition-colors duration-300 disabled:bg-cyan-800 disabled:cursor-not-allowed flex justify-center items-center shadow-glow-cyan/20"
            >
                {isLoading ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Link to Child'}
            </button>
        </form>
        <div className="absolute top-4 right-4">
             <button onClick={onLogout} className="flex items-center gap-2 text-gray-400 hover:text-brand-cyan transition-colors" aria-label="Logout" disabled={isLoading}>
                <LogoutIcon />
              </button>
        </div>
      </div>
    </div>
  );
};

export default ParentJoinClass;
