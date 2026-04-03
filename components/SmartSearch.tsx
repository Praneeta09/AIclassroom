import React, { useState } from 'react';
import { Quiz, GeneratedLecture, CaseStudy, SharedContent, FAQ } from '../types';
import { performSmartSearch } from '../services/aiService';
import { SearchIcon, CloseIcon } from './Icons';

interface SmartSearchProps {
    knowledgeBase: {
        quizzes: Quiz[];
        lectures: GeneratedLecture[];
        caseStudies: CaseStudy[];
        sharedContent: SharedContent[];
        faqs: FAQ[];
    };
}

const SmartSearch: React.FC<SmartSearchProps> = ({ knowledgeBase }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<{ answer: string; sources: { name: string; type: string }[] } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setIsModalOpen(true);
        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const searchResult = await performSmartSearch(query, knowledgeBase);
            setResult(searchResult);
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const closeModal = () => {
        setIsModalOpen(false);
        setQuery('');
        setResult(null);
        setError(null);
    }

    return (
        <>
            <form onSubmit={handleSearch} className="w-full max-w-lg">
                <div className="relative">
                    <input
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Ask anything about lectures, quizzes, or content..."
                        className="w-full bg-brand-dark border border-brand-border rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-brand-cyan focus:outline-none"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <SearchIcon />
                    </div>
                </div>
            </form>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
                    <div className="bg-brand-dark-blue border border-brand-border rounded-lg p-6 w-full max-w-3xl max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-2xl font-bold text-brand-cyan">Smart Search Results</h3>
                            <button onClick={closeModal}><CloseIcon/></button>
                        </div>
                        <p className="text-gray-400 mb-4 border-b border-brand-border pb-4">
                            <span className="font-semibold">Your Question:</span> "{query}"
                        </p>
                        
                        <div className="flex-grow overflow-y-auto pr-2">
                            {isLoading && (
                                <div className="flex justify-center items-center h-full">
                                    <div className="w-10 h-10 border-4 border-brand-cyan border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}
                            {error && <p className="text-red-500">{error}</p>}
                            {result && (
                                <div>
                                    <h4 className="text-xl font-semibold mb-2">Answer:</h4>
                                    <p className="whitespace-pre-wrap text-gray-300 bg-brand-dark p-4 rounded-md">{result.answer}</p>

                                    {result.sources.length > 0 && (
                                        <div className="mt-6">
                                            <h4 className="text-xl font-semibold mb-2">Sources:</h4>
                                            <ul className="space-y-2">
                                                {result.sources.map((source, index) => (
                                                    <li key={index} className="bg-brand-dark p-3 rounded-md">
                                                        <span className={`text-xs font-bold px-2 py-1 rounded-full mr-2 ${
                                                            {'Quiz': 'bg-green-600', 'Lecture': 'bg-blue-600', 'Case Study': 'bg-purple-600', 'Shared Content': 'bg-yellow-600 text-black', 'FAQ': 'bg-gray-500'}[source.type] || 'bg-gray-500'
                                                        }`}>{source.type}</span>
                                                        <span className="text-gray-400">{source.name}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default SmartSearch;
