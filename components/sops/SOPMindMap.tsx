'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  X, ChevronRight, ChevronDown, FileText, Hash,
  Layers, ExternalLink,
} from 'lucide-react';

// ====== Types ======
interface HeadingNode {
  level: number;
  text: string;
  children: HeadingNode[];
  index: number;
}

interface SOPMindMapProps {
  title: string;
  content: string;
  isOpen: boolean;
  onClose: () => void;
}

// ====== Parser ======
function parseHeadings(content: string): HeadingNode[] {
  const headingRegex = /^(#{1,4})\s+(.+)$/gm;
  const matches: { level: number; text: string; index: number }[] = [];
  let match: RegExpExecArray | null;
  let idx = 0;
  while ((match = headingRegex.exec(content)) !== null) {
    matches.push({ level: match[1].length, text: match[2].trim(), index: idx++ });
  }
  if (matches.length === 0) return [];

  const root: HeadingNode[] = [];
  const stack: { level: number; node: HeadingNode }[] = [];

  for (const m of matches) {
    const node: HeadingNode = { level: m.level, text: m.text, children: [], index: m.index };
    while (stack.length > 0 && stack[stack.length - 1].level >= m.level) stack.pop();
    if (stack.length === 0) root.push(node);
    else stack[stack.length - 1].node.children.push(node);
    stack.push({ level: m.level, node });
  }
  return root;
}

function countNodes(nodes: HeadingNode[]): number {
  let count = nodes.length;
  for (const n of nodes) { count += countNodes(n.children); }
  return count;
}

const LEVEL_COLORS = [
  { dot: 'bg-indigo-400', line: 'border-indigo-500/40', bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-300', badge: 'bg-indigo-500/20 text-indigo-300' },
  { dot: 'bg-sky-400', line: 'border-sky-500/40', bg: 'bg-sky-500/10', border: 'border-sky-500/30', text: 'text-sky-300', badge: 'bg-sky-500/20 text-sky-300' },
  { dot: 'bg-emerald-400', line: 'border-emerald-500/40', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-300', badge: 'bg-emerald-500/20 text-emerald-300' },
  { dot: 'bg-amber-400', line: 'border-amber-500/40', bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-300', badge: 'bg-amber-500/20 text-amber-300' },
];

// ====== Tree Node ======
function TreeNode({
  node, depth, isLast, expandedSet, onToggle, onScrollTo,
}: {
  node: HeadingNode; depth: number; isLast: boolean;
  expandedSet: Set<number>; onToggle: (i: number) => void; onScrollTo: (t: string) => void;
}) {
  const isExpanded = expandedSet.has(node.index);
  const hasChildren = node.children.length > 0;
  const colors = LEVEL_COLORS[Math.min(depth, LEVEL_COLORS.length - 1)];
  const totalChildCount = countNodes(node.children);

  return (
    <div className="relative">
      {depth > 0 && (
        <div className={`absolute left-[11px] top-0 w-px h-full ${colors.line} ${isLast ? 'h-4' : ''}`} />
      )}
      <div className="relative flex items-start gap-2 py-1 group">
        <div className="relative flex items-center justify-center flex-shrink-0 mt-0.5">
          {depth > 0 && (
            <div className={`absolute right-1/2 top-1/2 h-px ${colors.line}`} style={{ left: '-19px', width: '19px' }} />
          )}
          <div
            className={`w-5 h-5 rounded-full ${colors.bg} border ${colors.border} flex items-center justify-center z-10 cursor-pointer transition-transform hover:scale-110 ${hasChildren ? 'hover:shadow-lg' : ''}`}
            onClick={() => hasChildren && onToggle(node.index)}
          >
            {hasChildren ? (
              isExpanded ? <ChevronDown className="w-2.5 h-2.5 text-current" /> : <ChevronRight className="w-2.5 h-2.5 text-current" />
            ) : (
              <Hash className="w-2 h-2 text-slate-400" />
            )}
          </div>
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <button
            onClick={() => onScrollTo(node.text)}
            className={`text-left text-xs font-semibold leading-snug transition-colors truncate max-w-full block ${colors.text} hover:text-white ${depth === 0 ? 'text-sm font-bold' : ''}`}
            title={`ไปที่ "${node.text}"`}
          >
            {node.text}
          </button>
          {hasChildren && (
            <span className={`inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${colors.badge} opacity-60 group-hover:opacity-100 transition-opacity`}>
              <Layers className="w-2 h-2" />{totalChildCount}
            </span>
          )}
        </div>
      </div>
      {hasChildren && (
        <div className={`ml-5 pl-2 border-l-2 ${colors.line} transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[9999px] opacity-100' : 'max-h-0 opacity-0'}`}>
          {node.children.map((child, i) => (
            <TreeNode key={child.index} node={child} depth={depth + 1} isLast={i === node.children.length - 1} expandedSet={expandedSet} onToggle={onToggle} onScrollTo={onScrollTo} />
          ))}
        </div>
      )}
    </div>
  );
}

// ====== Main Sidebar Component ======
export function SOPMindMap({ title, content, isOpen, onClose }: SOPMindMapProps) {
  const [expandedSet, setExpandedSet] = useState<Set<number>>(new Set());

  const tree = useMemo(() => parseHeadings(content), [content]);
  const totalHeadings = useMemo(() => countNodes(tree), [tree]);
  const totalMain = useMemo(() => tree.length, [tree]);
  const hasHeadings = tree.length > 0;

  const toggleExpand = useCallback((index: number) => {
    setExpandedSet((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    const all = new Set<number>();
    const collect = (nodes: HeadingNode[]) => {
      for (const n of nodes) {
        if (n.children.length > 0) all.add(n.index);
        collect(n.children);
      }
    };
    collect(tree);
    setExpandedSet(all);
  }, [tree]);

  const collapseAll = useCallback(() => setExpandedSet(new Set()), []);

  const scrollToSection = useCallback((headingText: string) => {
    const allHeadings = document.querySelectorAll('h1, h2, h3, h4');
    for (const el of allHeadings) {
      if (el.textContent?.trim() === headingText) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.classList.add('ring-2', 'ring-indigo-500', 'rounded-lg', 'transition-all', 'duration-1000');
        setTimeout(() => el.classList.remove('ring-2', 'ring-indigo-500', 'rounded-lg'), 2000);
        return;
      }
    }
  }, []);

  // Auto-expand all when opened
  React.useEffect(() => {
    if (isOpen && tree.length > 0) expandAll();
  }, [isOpen, tree, expandAll]);

  return (
    <div
      className={`fixed top-0 right-0 h-full w-80 lg:w-96 bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950/60 border-l border-slate-700 shadow-2xl flex flex-col z-40 transition-all duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* ===== Header ===== */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 rounded-lg shrink-0">
            <FileText className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-slate-100 truncate">🧠 Mind Map</h3>
            <p className="text-[10px] text-slate-400 truncate">{totalHeadings} หัวข้อ • {totalMain} หลัก</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={expandAll} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-all" title="ขยายทั้งหมด">
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button onClick={collapseAll} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-all" title="ยุบทั้งหมด">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-all ml-0.5" title="ปิด Mind Map">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ===== Body ===== */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {!hasHeadings ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 mx-auto bg-slate-800 rounded-2xl flex items-center justify-center">
              <Hash className="w-6 h-6 text-slate-500" />
            </div>
            <h4 className="text-xs font-bold text-slate-400">ไม่พบหัวข้อในเอกสารนี้</h4>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              ใช้ <code className="px-1 py-0.5 bg-slate-800 rounded text-indigo-400"># หัวข้อ</code> ในเนื้อหาเพื่อจัดโครงสร้าง
            </p>
          </div>
        ) : (
          <>
            {/* Root: Document Title */}
            <div className="mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center shadow-sm shadow-indigo-600/20 shrink-0">
                  <FileText className="w-3 h-3 text-white" />
                </div>
                <h4 className="text-xs font-bold text-white truncate">{title}</h4>
              </div>
            </div>

            {/* Tree */}
            {tree.map((node, i) => (
              <TreeNode key={node.index} node={node} depth={0} isLast={i === tree.length - 1} expandedSet={expandedSet} onToggle={toggleExpand} onScrollTo={scrollToSection} />
            ))}

            {/* Guide */}
            <div className="mt-6 pt-3 border-t border-slate-800">
              <p className="text-[10px] text-slate-500 flex items-center gap-1.5">
                <ExternalLink className="w-2.5 h-2.5" />
                คลิกหัวข้อเพื่อเลื่อนดูส่วนนั้น
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
