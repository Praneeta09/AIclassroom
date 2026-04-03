import React, { useState } from 'react';
import { User } from '../types';
import { LogoutIcon } from './Icons';

interface JoinClassProps {
  user: User;
  onJoinClass: (classCode: string) => Promise<void>;
  onLogout: () => void;
}

const JoinClass: React.FC<JoinClassProps> = ({ user, onJoinClass, onLogout }) => {
  const [classCode, setClassCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const code = classCode.trim().toUpperCase();
    if (!code) {
      setError('Please enter a class code.');
      setIsLoading(false);
      return;
    }
    
    try {
        await onJoinClass(code);
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
            <h1 className="text-3xl font-bold">Join a Classroom</h1>
            <p className="text-gray-400 mt-2">Welcome, {user.name}! Enter the code from your teacher to continue.</p>
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
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-brand-cyan text-white font-bold py-3 px-6 rounded-lg hover:bg-cyan-500 transition-colors duration-300 disabled:bg-cyan-800 disabled:cursor-not-allowed flex justify-center items-center"
            >
                {isLoading ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Join Class'}
            </button>
        </form>
        <div className="absolute top-4 right-4">
             <button onClick={onLogout} className="flex items-center gap-2 text-gray-400 hover:text-brand-cyan" aria-label="Logout" disabled={isLoading}>
                <LogoutIcon />
              </button>
        </div>
      </div>
    </div>
  );
};

export default JoinClass;
