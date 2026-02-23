import React, { memo, useState, useMemo, useEffect, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis, restrictToWindowEdges } from '@dnd-kit/modifiers';
import { GripVertical, Trash2, MapPin, Hash, Globe, CheckCircle2, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { IpEntry } from '../types';

const ITEMS_PER_PAGE = 10;

interface RowContentProps {
  entry: IpEntry;
  onRemove?: (id: string) => void;
  onUpdate?: (id: string, field: keyof IpEntry, value: any) => void;
  isOverlay?: boolean;
  attributes?: any;
  listeners?: any;
}

const RowContent = ({ entry, onRemove, onUpdate, isOverlay, attributes, listeners }: RowContentProps) => {
  const isIdentifying = entry.region === '识别中...';
  const isPending = !entry.region || entry.region === '待识别';
  const isUnknown = entry.region === '未知' || entry.region === 'FAIL';
  const isLocked = entry.isLocked;

  return (
    <>
      <td className="pl-6 pr-1 py-5 w-14 text-center">
        {!isLocked ? (
          <div 
            {...attributes}
            {...listeners}
            className="text-slate-300 hover:text-indigo-500 cursor-grab active:cursor-grabbing p-1.5 rounded-lg transition-colors touch-none inline-flex items-center justify-center"
          >
            <GripVertical size={18} />
          </div>
        ) : (
          <div className="text-slate-200 p-1.5 inline-flex items-center justify-center">
            <Lock size={16} />
          </div>
        )}
      </td>
      <td className="px-4 py-5 w-36">
        <div className="flex items-center space-x-2.5 justify-center">
          <input 
            type="checkbox"
            checked={entry.active}
            disabled={isLocked}
            onChange={(e) => !isOverlay && !isLocked && onUpdate?.(entry.id, 'active', e.target.checked)}
            className={`w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 transition-all ${isLocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            onClick={(e) => e.stopPropagation()} 
          />
          <span className="text-[13px] font-bold text-slate-500 whitespace-nowrap select-none">启用</span>
        </div>
      </td>
      <td className="px-6 py-5 min-w-[220px]">
        <div className="flex items-center space-x-4">
          <Globe size={18} className="text-slate-300 shrink-0" />
          <input 
              className={`bg-transparent border-none focus:ring-0 p-0 w-full font-bold font-mono text-[16px] tracking-tight outline-none ${isLocked ? 'text-slate-400 cursor-default' : 'text-slate-900'}`}
              value={entry.ip}
              readOnly={isLocked}
              onChange={(e) => !isOverlay && !isLocked && onUpdate?.(entry.id, 'ip', e.target.value)}
              onClick={(e) => e.stopPropagation()}
          />
        </div>
      </td>
      <td className="px-6 py-5 w-40">
        <div className="flex items-center space-x-3">
          <Hash size={14} className="text-slate-300 shrink-0" />
          <input 
              className={`bg-transparent border-none focus:ring-0 p-0 w-full font-mono text-[15px] font-medium outline-none ${isLocked ? 'text-slate-400 cursor-default' : 'text-slate-600'}`}
              value={entry.port}
              readOnly={isLocked}
              onChange={(e) => !isOverlay && !isLocked && onUpdate?.(entry.id, 'port', e.target.value)}
              onClick={(e) => e.stopPropagation()}
          />
        </div>
      </td>
      <td className="px-6 py-5 w-48">
        <div className="flex items-center space-x-3">
          <MapPin size={16} className={isIdentifying ? "text-indigo-500 animate-bounce" : "text-slate-300 shrink-0"} />
          <input 
              className={`bg-transparent border-none focus:ring-0 p-0 w-full text-[14px] font-bold tracking-wide outline-none ${
                isIdentifying ? 'text-indigo-500 animate-pulse' : 
                isPending ? 'text-slate-300 font-normal italic' : 
                isUnknown ? 'text-red-400' : 
                isLocked ? 'text-indigo-400' : 'text-slate-900 uppercase'
              }`}
              value={entry.region || ''}
              readOnly={isLocked}
              placeholder="待识别"
              onChange={(e) => !isOverlay && !isLocked && onUpdate?.(entry.id, 'region', e.target.value)}
              onClick={(e) => e.stopPropagation()}
          />
        </div>
      </td>
      <td className="pr-6 pl-2 py-5 w-14 text-right">
        {!isOverlay && !isLocked && (
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove?.(entry.id); }} 
            className="text-slate-200 hover:text-red-500 transition-all p-2 hover:bg-red-50 rounded-xl"
          >
            <Trash2 size={20} />
          </button>
        )}
      </td>
    </>
  );
};

interface SortableRowProps {
  entry: IpEntry;
  onRemove: (id: string) => void;
  onUpdate: (id: string, field: keyof IpEntry, value: any) => void;
}

const SortableRow = memo(({ entry, onRemove, onUpdate }: SortableRowProps) => {
  const { 
    attributes, 
    listeners, 
    setNodeRef, 
    transform, 
    transition, 
    isDragging 
  } = useSortable({ 
    id: entry.id,
    disabled: entry.isLocked // 禁用锁定项的拖拽功能
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition: isDragging ? 'none' : transition,
    zIndex: isDragging ? 50 : 'auto',
    position: 'relative' as const,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`group border-b border-slate-50 last:border-0 ${
        isDragging 
          ? 'opacity-20 bg-indigo-50/50' 
          : 'bg-white hover:bg-indigo-50/20'
      } ${!entry.active && !isDragging ? 'opacity-30' : ''}`}
    >
      <RowContent 
        entry={entry} 
        onRemove={onRemove} 
        onUpdate={onUpdate} 
        attributes={attributes}
        listeners={listeners}
      />
    </tr>
  );
});

SortableRow.displayName = 'SortableRow';

interface IpListProps {
  entries: IpEntry[];
  setEntries: React.Dispatch<React.SetStateAction<IpEntry[]>>;
}

export const IpList: React.FC<IpListProps> = ({ entries, setEntries }) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  
  const prevLengthRef = useRef(entries.length);

  useEffect(() => {
    if (entries.length > prevLengthRef.current) {
      setCurrentPage(1);
    }
    prevLengthRef.current = entries.length;

    const maxPage = Math.max(1, Math.ceil(entries.length / ITEMS_PER_PAGE));
    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [entries.length, currentPage]);

  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return entries.slice(start, start + ITEMS_PER_PAGE);
  }, [entries, currentPage]);

  const totalPages = Math.max(1, Math.ceil(entries.length / ITEMS_PER_PAGE));

  const sensors = useSensors(
    useSensor(PointerSensor, { 
      activationConstraint: { 
        distance: 3 
      } 
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const activeEntry = activeId ? entries.find(e => e.id === activeId) : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = entries.findIndex((item) => item.id === active.id);
      const newIndex = entries.findIndex((item) => item.id === over.id);
      
      // 检查：不允许将其他项移动到锁定项之前（如果锁定项在第0位）
      // 或者更简单的：如果目标位置是锁定项的位置，不允许放置。
      const targetEntry = entries[newIndex];
      if (targetEntry.isLocked) {
        setActiveId(null);
        return;
      }

      setEntries(arrayMove(entries, oldIndex, newIndex));
    }
    setActiveId(null);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    const tableHeader = document.querySelector('thead');
    tableHeader?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  return (
    <div className="flex flex-col space-y-4 mb-20">
      <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/40 border border-slate-200 overflow-hidden relative">
        <div className="overflow-x-auto scrollbar-hide">
          <DndContext 
            sensors={sensors} 
            collisionDetection={closestCenter} 
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveId(null)}
            modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
          >
            <table className="min-w-full table-fixed border-separate border-spacing-0">
              <thead className="bg-slate-50/80 border-b border-slate-100 sticky top-0 z-10 backdrop-blur-md">
                <tr>
                  <th className="w-14 pl-6 pr-1 py-4"></th>
                  <th className="w-36 px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">状态控制</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">节点地址</th>
                  <th className="w-40 px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">通信端口</th>
                  <th className="w-48 px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">物理区域</th>
                  <th className="w-14 pr-6 pl-2 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                <SortableContext items={paginatedEntries.map(e => e.id)} strategy={verticalListSortingStrategy}>
                  {paginatedEntries.map((entry) => (
                    <SortableRow
                      key={entry.id}
                      entry={entry}
                      onRemove={(id) => setEntries(prev => prev.filter(e => e.id !== id))}
                      onUpdate={(id, f, v) => setEntries(prev => prev.map(e => e.id === id ? { ...e, [f]: v } : e))}
                    />
                  ))}
                </SortableContext>
              </tbody>
            </table>

            <DragOverlay 
              dropAnimation={{
                duration: 200,
                easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
                sideEffects: defaultDropAnimationSideEffects({
                  styles: {
                    active: {
                      opacity: '0.4',
                    },
                  },
                }),
              }}
            >
              {activeEntry ? (
                <table className="min-w-full table-fixed bg-white shadow-2xl ring-2 ring-indigo-500 rounded-xl overflow-hidden pointer-events-none opacity-95">
                  <tbody>
                    <tr className="bg-white">
                      <RowContent entry={activeEntry} isOverlay />
                    </tr>
                  </tbody>
                </table>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
        
        {entries.length === 0 && (
          <div className="py-24 text-center flex flex-col items-center justify-center space-y-4">
            <div className="p-5 bg-slate-50 rounded-full">
              <CheckCircle2 size={40} className="text-slate-200" />
            </div>
            <p className="text-slate-400 font-black uppercase tracking-widest text-[11px]">列表为空</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {entries.length > ITEMS_PER_PAGE && (
        <div className="flex items-center justify-between px-8 py-4 bg-white/60 backdrop-blur-sm rounded-3xl border border-slate-200/60 shadow-sm animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
              第 {currentPage} / {totalPages} 页
            </span>
            <span className="text-[11px] font-bold text-slate-300">|</span>
            <span className="text-[11px] font-bold text-slate-400">
              共 {entries.length} 个节点
            </span>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`p-2 rounded-xl transition-all ${
                currentPage === 1 
                ? "text-slate-200 cursor-not-allowed" 
                : "text-slate-600 hover:bg-white hover:shadow-md active:scale-90"
              }`}
            >
              <ChevronLeft size={20} />
            </button>

            <div className="flex items-center space-x-1 px-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .map((page, index, array) => (
                  <React.Fragment key={page}>
                    {index > 0 && array[index - 1] !== page - 1 && (
                      <span className="text-slate-300 px-1 font-black">...</span>
                    )}
                    <button
                      onClick={() => handlePageChange(page)}
                      className={`min-w-[36px] h-9 rounded-xl text-xs font-black transition-all ${
                        currentPage === page
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100 scale-110"
                        : "text-slate-500 hover:bg-white hover:text-indigo-600 hover:shadow-sm"
                      }`}
                    >
                      {page}
                    </button>
                  </React.Fragment>
                ))}
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`p-2 rounded-xl transition-all ${
                currentPage === totalPages 
                ? "text-slate-200 cursor-not-allowed" 
                : "text-slate-600 hover:bg-white hover:shadow-md active:scale-90"
              }`}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};