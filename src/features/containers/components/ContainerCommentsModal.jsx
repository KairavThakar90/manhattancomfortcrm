import React, { useEffect, useState } from 'react';
import { X, ChevronDown } from 'lucide-react';
import ContainerCommentSection from './ContainerCommentSection';
import { getTagUsers } from '../../users/services/user.service';
import { getContainerComments } from '../services/container.service';

// Discussion scopes available for a container — mirrors the PO "Discussion
// Scope" dropdown pattern, but backed by the two fixed comment categories a
// container supports.
const SCOPES = [
  {
    category: 'vendor_credit',
    label: 'Vendor Credit Needed',
    loadMentionOptions: async () => {
      const users = await getTagUsers(/* { role: 'vendor' } */);
      return Array.isArray(users) ? users : [];
    },
  },
  {
    category: 'receiving_closure',
    label: 'Receiving Closure Notes',
    loadMentionOptions: async () => {
      const users = await getTagUsers();
      return Array.isArray(users) ? users : [];
    },
  },
];

/**
 * ContainerCommentsModal
 * Standalone popup — 1-to-1 with the PO "Comments" popup design:
 * a header with the container name/id, a "Discussion Scope" dropdown to
 * switch between the container's comment categories, and a single comment
 * thread (list + input) for whichever scope is selected.
 */
export default function ContainerCommentsModal({ container, onClose }) {
  const [scopeIndex, setScopeIndex] = useState(0);
  const [isScopeDropdownOpen, setIsScopeDropdownOpen] = useState(false);
  const [scopeCounts, setScopeCounts] = useState({});

  useEffect(() => {
    if (!container?.id) return;
    let cancelled = false;
    Promise.all(
      SCOPES.map((scope) =>
        getContainerComments(container.id, scope.category)
          .then((data) => [scope.category, Array.isArray(data) ? data.length : 0])
          .catch(() => [scope.category, 0]),
      ),
    ).then((entries) => {
      if (!cancelled) setScopeCounts(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [container?.id]);

  if (!container) return null;

  const activeScope = SCOPES[scopeIndex];
  const containerLabel =
    container.name || container.sellercloud_container_id || container.id;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 font-sans backdrop-blur-sm">
      <div className="bg-mc-white flex h-[80vh] max-h-[80vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-100 shadow-xl sm:max-w-2xl md:max-w-3xl lg:max-w-4xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 p-5">
          <h3 className="text-mc-black text-base font-bold">
            {containerLabel} - Comments
          </h3>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="custom-scrollbar flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
          {/* Discussion Scope selector */}
          <div className="flex shrink-0 flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <label className="text-[10px] font-bold tracking-wide text-slate-500 uppercase">
              Discussion Scope
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsScopeDropdownOpen((prev) => !prev)}
                className="focus:border-mc-black flex w-full items-center justify-between rounded-md border border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-slate-700 focus:outline-hidden"
              >
                <span className="flex items-center gap-2 truncate">
                  {activeScope.label}
                  {scopeCounts[activeScope.category] > 0 && (
                    <span className="flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-slate-200 px-1 text-[9px] font-bold text-slate-600">
                      {scopeCounts[activeScope.category]}
                    </span>
                  )}
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-slate-400 transition-transform ${
                    isScopeDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isScopeDropdownOpen && (
                <div className="absolute top-full right-0 left-0 z-50 mt-1 overflow-hidden rounded-md border border-slate-200 bg-white text-xs shadow-lg">
                  {SCOPES.map((scope, idx) => (
                    <button
                      key={scope.category}
                      type="button"
                      className={`w-full px-3 py-2 text-left font-bold transition-colors hover:bg-slate-50 ${
                        idx === scopeIndex
                          ? 'text-mc-black bg-slate-100/50'
                          : 'text-slate-700'
                      }`}
                      onClick={() => {
                        setScopeIndex(idx);
                        setIsScopeDropdownOpen(false);
                      }}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="truncate">{scope.label}</span>
                        {scopeCounts[scope.category] > 0 && (
                          <span className="ml-2 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-slate-200 px-1 text-[9px] font-bold text-slate-600">
                            {scopeCounts[scope.category]}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Selected scope's comment thread */}
          <div className="min-h-0 flex-1">
            <ContainerCommentSection
              key={activeScope.category}
              containerId={container?.id}
              category={activeScope.category}
              title={activeScope.label}
              placeholder="Type a message... (Use @ to tag)"
              loadMentionOptions={activeScope.loadMentionOptions}
              onCountChange={(count) =>
                setScopeCounts((prev) =>
                  prev[activeScope.category] === count
                    ? prev
                    : { ...prev, [activeScope.category]: count },
                )
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
