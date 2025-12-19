
import React, { useState } from 'react';
import { ProfileNode } from '../types';

interface ProfileNodeViewProps {
  node: ProfileNode;
  totalTime: number;
  depth: number;
}

const ProfileNodeView: React.FC<ProfileNodeViewProps> = ({ node, totalTime, depth }) => {
  const [isOpen, setIsOpen] = useState(depth < 2);
  const timeMs = node.time_in_nanos / 1_000_000;
  const percentage = (node.time_in_nanos / totalTime) * 100;

  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="border-l-2 border-slate-200 ml-4 mb-2">
      <div 
        className={`group flex flex-col p-3 rounded-r-lg transition-all hover:bg-slate-50 cursor-pointer ${isOpen ? 'bg-slate-50' : 'bg-white'}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          {hasChildren ? (
            <span className="text-slate-400 w-4 h-4 flex items-center justify-center">
              {isOpen ? '▼' : '▶'}
            </span>
          ) : (
            <span className="w-4" />
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="font-bold text-slate-700 truncate">{node.type}</span>
              <span className="text-xs font-mono text-slate-400 truncate">{node.description}</span>
            </div>
            
            <div className="mt-2 flex items-center gap-3">
              <div className="text-sm font-medium text-slate-900">{timeMs.toFixed(3)}ms</div>
              <div className="flex-1 max-w-[200px] h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${percentage > 50 ? 'bg-red-500' : percentage > 20 ? 'bg-amber-500' : 'bg-blue-500'}`}
                  style={{ width: `${Math.min(100, percentage)}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-500 font-semibold">{percentage.toFixed(1)}%</div>
            </div>
          </div>
        </div>

        {isOpen && (
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px] mono text-slate-500 border-t pt-2">
            {Object.entries(node.breakdown).map(([key, val]) => (
              <div key={key} className="flex justify-between px-2 py-1 bg-white rounded border border-slate-100">
                <span className="opacity-70">{key}:</span>
                {/* Fix: Explicitly cast val to number for the division operation */}
                <span className="font-medium text-slate-700">{(Number(val) / 1_000_000).toFixed(3)}ms</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {isOpen && hasChildren && (
        <div className="mt-1">
          {node.children!.map((child, idx) => (
            <ProfileNodeView 
              key={`${child.type}-${idx}`} 
              node={child} 
              totalTime={totalTime} 
              depth={depth + 1} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProfileNodeView;
