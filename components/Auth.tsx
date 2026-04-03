import React, { useState } from 'react';
import { Role } from '../types';
import { ArrowLeftIcon, TeacherIcon, StudentIcon } from './Icons';

interface AuthProps {
  role: Role;
  onAuthSuccess: (authData: { name: string, email: string, password?: string, imageUrl?: string }, isLogin: boolean) => Promise<void>;
  onBack: () => void;
}

const Auth: React.FC<AuthProps> = ({ role, onAuthSuccess, onBack }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => setImageUrl(reader.result as string);
      reader.readAsDataURL(selectedFile);
    }
  };

  const validatePassword = (password: string) => {
    const errors = [];
    if (password.length < 8) errors.push("at least 8 characters");
    if (!/[a-z]/.test(password)) errors.push("a lowercase letter");
    if (!/[A-Z]/.test(password)) errors.push("an uppercase letter");
    if (!/\d/.test(password)) errors.push("a number");
    if (!/[@$!%*?&]/.test(password)) errors.push("a special character (e.g., @$!%*?&)");

    if (errors.length > 0) {
        return `Password must contain ${errors.join(', ')}.`;
    }
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (!isLogin && !name.trim()) {
        throw new Error('Please enter your full name.');
      }

      if (!email.trim() || !password) {
        throw new Error('Please fill in email and password.');
      }

      let finalImageUrl = imageUrl;
      if (!isLogin && role === 'student') {
        if (!file) {
          throw new Error('Please upload an image for face recognition attendance.');
        }
        const formData = new FormData();
        formData.append('image', file);
        const res = await fetch('/api/upload-image', {
          method: 'POST',
          body: formData
        });
        if (!res.ok) {
           const errData = await res.json().catch(() => ({}));
           throw new Error(errData.error || 'Failed to upload image.');
        }
        const data = await res.json();
        finalImageUrl = data.url;
      }

      if (!isLogin) {
        const passwordError = validatePassword(password);
        if (passwordError) {
          throw new Error(passwordError);
        }
      }

      await onAuthSuccess({ name, email, password, imageUrl: finalImageUrl || undefined }, isLogin);

    } catch (err: any) {
      setError(err.message || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const portalName = role === 'teacher' ? 'Teacher Portal' : 'Student Portal';
  const portalIcon = role === 'teacher' ? <TeacherIcon /> : <StudentIcon />;

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh]">
      <div className="w-full max-w-md relative">
        <button onClick={onBack} className="absolute top-4 left-4 text-gray-400 hover:text-white transition-colors flex items-center gap-2">
            <ArrowLeftIcon />
            Back to Role Selection
        </button>
        <div className="bg-brand-dark-blue border border-brand-border rounded-2xl p-8 pt-16">
          <div className="text-center mb-8">
            <div className="inline-block mb-4">{portalIcon}</div>
            <h1 className="text-3xl font-bold">{portalName}</h1>
            <p className="text-gray-400">{isLogin ? 'Sign in to your account' : 'Create a new account'}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:outline-none"
                  disabled={isLoading}
                />
              </div>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:outline-none"
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="password"className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:outline-none"
                disabled={isLoading}
              />
            </div>
            {!isLogin && role === 'student' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Profile Image (Required for Face Attendance)
                </label>
                <input
                  type="file"
                  accept="image/jpeg, image/png, image/webp"
                  onChange={handleImageChange}
                  className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-cyan file:text-white hover:file:bg-cyan-500"
                  disabled={isLoading}
                />
              </div>
            )}
            
            {!isLogin && (
              <div className="text-xs text-gray-400 pt-1 space-y-1">
                <ul className="list-disc list-inside pl-1">
                  <li>At least 8 characters</li>
                  <li>An uppercase and lowercase letter</li>
                  <li>A number and a special character</li>
                </ul>
              </div>
            )}

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-brand-cyan text-white font-bold py-3 px-6 rounded-lg hover:bg-cyan-500 transition-colors duration-300 disabled:bg-cyan-800 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : (isLogin ? 'Login' : 'Sign Up')}
            </button>
          </form>

          <p className="text-center mt-6 text-sm text-gray-400">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
              }}
              className="font-semibold text-brand-cyan hover:underline ml-1"
              disabled={isLoading}
            >
              {isLogin ? 'Sign Up' : 'Login'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
