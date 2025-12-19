
import React, { useState, useCallback, useMemo } from 'react';
import { ESProfileResponse } from './types';
import ProfileNodeView from './components/ProfileNodeView';
import { analyzeESProfile } from './services/geminiService';

const App: React.FC = () => {
  const [jsonInput, setJsonInput] = useState('');
  const [profileData, setProfileData] = useState<ESProfileResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

  const handleParse = useCallback(() => {
    try {
      const parsed = JSON.parse(jsonInput);
      if (!parsed.profile || !parsed.profile.shards) {
        throw new Error("Invalid ES profile JSON structure. Missing 'profile.shards'.");
      }
      setProfileData(parsed as ESProfileResponse);
      setError(null);
      setAiAnalysis(null);
    } catch (e: any) {
      setError(e.message || "Failed to parse JSON");
      setProfileData(null);
    }
  }, [jsonInput]);

  const handleAIAnalysis = async () => {
    if (!profileData) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeESProfile(profileData);
      setAiAnalysis(result);
    } catch (e: any) {
      setError("AI Analysis failed: " + e.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const totalProfileTime = useMemo(() => {
    if (!profileData) return 0;
    // Get max time across all shards and types (query + aggregations) for reference
    const queryTimes = profileData.profile.shards.flatMap(s => 
      s.searches.flatMap(search => search.query.map(q => q.time_in_nanos))
    );
    const aggTimes = profileData.profile.shards.flatMap(s => 
      s.aggregations.map(a => a.time_in_nanos)
    );
    return Math.max(0, ...queryTimes, ...aggTimes);
  }, [profileData]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-slate-900 text-white p-4 shadow-lg flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">ES Profile AI Insight</h1>
            <p className="text-xs text-slate-400">Deep performance analysis for Elasticsearch queries & aggs</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => { setProfileData(null); setJsonInput(''); setAiAnalysis(null); }}
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            Clear
          </button>
          {profileData && (
            <button 
              onClick={handleAIAnalysis}
              disabled={isAnalyzing}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md transition-all flex items-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1.1 14.9h-2.2v-2.2h2.2zm0-4.4h-2.2V7.1h2.2z" />
                  </svg>
                  Ask Gemini AI
                </>
              )}
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Section */}
        {!profileData && (
          <div className="lg:col-span-12 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 p-4">
                <h2 className="font-semibold text-slate-700">Paste Profile JSON</h2>
                <p className="text-xs text-slate-500">Enable "profile": true in your Elasticsearch query and paste the full response here.</p>
              </div>
              <textarea
                className="w-full h-96 p-4 mono text-sm outline-none resize-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder='{ "took": 12, "timed_out": false, "profile": { ... } }'
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
              />
              <div className="p-4 border-t border-slate-200 flex justify-end">
                <button 
                  onClick={handleParse}
                  className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  Visualize Profile
                </button>
              </div>
            </div>
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl text-sm flex items-start gap-3">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}
          </div>
        )}

        {/* Visualization & Analysis Section */}
        {profileData && (
          <>
            {/* Tree View */}
            <div className={`transition-all duration-500 ${aiAnalysis ? 'lg:col-span-7' : 'lg:col-span-12'} flex flex-col gap-4`}>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  Profile Execution Tree
                </h3>
                
                <div className="space-y-8 overflow-y-auto max-h-[calc(100vh-250px)] pr-2">
                  {profileData.profile.shards.map((shard) => (
                    <div key={shard.id} className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                      <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
                        <span className="text-sm font-bold text-slate-600 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                          Shard: {shard.id}
                        </span>
                      </div>

                      {/* Searches / Query Section */}
                      {shard.searches.map((search, searchIdx) => (
                        <div key={`${shard.id}-s-${searchIdx}`} className="mb-8 last:mb-0">
                          <div className="mb-3 text-xs font-semibold text-blue-600 uppercase tracking-wider flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                            Query Breakdown
                          </div>
                          {search.query.map((q, qIdx) => (
                            <ProfileNodeView 
                              key={`${shard.id}-${searchIdx}-${qIdx}`} 
                              node={q} 
                              totalTime={totalProfileTime} 
                              depth={0} 
                            />
                          ))}

                          <div className="mt-6">
                            <div className="mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                              Collectors
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {search.collector.map((c, cIdx) => (
                                <div key={cIdx} className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                                  <div className="text-sm font-bold text-slate-700 truncate">{c.name}</div>
                                  <div className="text-xs text-slate-400 mb-2">{c.reason}</div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-blue-600 font-mono text-xs font-bold">
                                      {(c.time_in_nanos / 1_000_000).toFixed(3)}ms
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="mt-4 p-3 bg-slate-100 rounded-lg flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500">Rewrite Time</span>
                            <span className="text-xs font-mono font-bold text-slate-700">
                              {(search.rewrite_time / 1_000_000).toFixed(3)}ms
                            </span>
                          </div>
                        </div>
                      ))}

                      {/* Aggregations Section */}
                      <div className="mt-8 pt-4 border-t border-slate-200">
                        <div className="mb-3 text-xs font-semibold text-indigo-600 uppercase tracking-wider flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                          Aggregations Breakdown
                        </div>
                        {shard.aggregations && shard.aggregations.length > 0 ? (
                          shard.aggregations.map((agg, aggIdx) => (
                            <ProfileNodeView 
                              key={`${shard.id}-agg-${aggIdx}`} 
                              node={agg} 
                              totalTime={totalProfileTime} 
                              depth={0} 
                            />
                          ))
                        ) : (
                          <div className="text-xs text-slate-400 italic bg-white p-4 rounded-lg border border-dashed border-slate-200 text-center">
                            No aggregations performed in this shard
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* AI Insight Sidepanel */}
            {aiAnalysis && (
              <div className="lg:col-span-5 animate-in slide-in-from-right-4 duration-500">
                <div className="bg-slate-900 text-slate-100 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-160px)] sticky top-24">
                  <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-900 to-indigo-900">
                    <h3 className="font-bold flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1.1 14.9h-2.2v-2.2h2.2zm0-4.4h-2.2V7.1h2.2z" />
                      </svg>
                      Gemini Performance Advisor
                    </h3>
                    <button 
                      onClick={() => setAiAnalysis(null)}
                      className="text-slate-400 hover:text-white"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="p-6 overflow-y-auto prose prose-invert prose-blue max-w-none">
                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                      {aiAnalysis.split('\n').map((line, i) => {
                        if (line.startsWith('#')) {
                          return <h4 key={i} className="text-lg font-bold text-blue-400 mt-4 mb-2">{line.replace(/^#+\s*/, '')}</h4>;
                        }
                        if (line.startsWith('- ') || line.startsWith('* ')) {
                          return <li key={i} className="ml-4 list-disc mb-1">{line.substring(2)}</li>;
                        }
                        return <p key={i} className="mb-3">{line}</p>;
                      })}
                    </div>
                  </div>
                  <div className="p-4 bg-slate-800 border-t border-slate-700 text-[10px] text-slate-500 text-center uppercase tracking-widest font-bold">
                    Analyzing Shards, Queries & Aggregations
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 p-4 text-center text-xs text-slate-400 mt-auto">
        &copy; {new Date().getFullYear()} Elasticsearch AI Profiler &bull; Built with Gemini 3 Pro
      </footer>
    </div>
  );
};

export default App;
