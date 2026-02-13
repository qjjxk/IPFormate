import React, { memo, useState } from 'react';
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
import { GripVertical, Trash2, MapPin, Hash, Globe, CheckCircle2 } from 'lucide-react';
import { IpEntry } from '../types';

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

  return (
    <>
      <td className="pl-6 pr-1 py-5 w-14 text-center">
        {/* 关键修复：确保 attributes 和 listeners 展开到此元素 */}
        <div 
          {...attributes}
          {...listeners}
          className="text-slate-300 hover:text-indigo-500 cursor-grab active:cursor-grabbing p-1.5 rounded-lg transition-colors touch-none inline-flex items-center justify-center"
        >
          <GripVertical size={18} />
        </div>
      </td>
      <td className="px-4 py-5 w-36">
        <div className="flex items-center space-x-2.5 justify-center">
          <input 
            type="checkbox"
            checked={entry.active}
            onChange={(e) => !isOverlay && onUpdate?.(entry.id, 'active', e.target.checked)}
            className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 transition-all cursor-pointer"
            onClick={(e) => e.stopPropagation()} 
          />
          <span className="text-[13px] font-bold text-slate-500 whitespace-nowrap select-none">启用</span>
        </div>
      </td>
      <td className="px-6 py-5 min-w-[220px]">
        <div className="flex items-center space-x-4">
          <Globe size={18} className="text-slate-300 shrink-0" />
          <input 
              className="bg-transparent border-none focus:ring-0 p-0 w-full text-slate-900 font-bold font-mono text-[16px] tracking-tight outline-none"
              value={entry.ip}
              onChange={(e) => !isOverlay && onUpdate?.(entry.id, 'ip', e.target.value)}
              onClick={(e) => e.stopPropagation()}
          />
        </div>
      </td>
      <td className="px-6 py-5 w-40">
        <div className="flex items-center space-x-3">
          <Hash size={14} className="text-slate-300 shrink-0" />
          <input 
              className="bg-transparent border-none focus:ring-0 p-0 w-full text-slate-600 font-mono text-[15px] font-medium outline-none"
              value={entry.port}
              onChange={(e) => !isOverlay && onUpdate?.(entry.id, 'port', e.target.value)}
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
                isUnknown ? 'text-red-400' : 'text-slate-900 uppercase'
              }`}
              value={entry.region || ''}
              placeholder="待识别"
              onChange={(e) => !isOverlay && onUpdate?.(entry.id, 'region', e.target.value)}
              onClick={(e) => e.stopPropagation()}
          />
        </div>
      </td>
      <td className="pr-6 pl-2 py-5 w-14 text-right">
        {!isOverlay && (
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
  } = useSortable({ id: entry.id });

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
  
  const sensors = useSensors(
    useSensor(PointerSensor, { 
      activationConstraint: { 
        distance: 4 // 设定最小移动距离触发拖拽，防止干扰普通点击
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
      setEntries(arrayMove(entries, oldIndex, newIndex));
    }
    setActiveId(null);
  };

  return (
    <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/40 border border-slate-200 overflow-hidden mb-20 relative">
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
              <SortableContext items={entries.map(e => e.id)} strategy={verticalListSortingStrategy}>
                {entries.map((entry) => (
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

          <DragOverlay dropAnimation={{
            duration: 200,
            easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
            sideEffects: defaultDropAnimationSideEffects({
              styles: {
                active: {
                  opacity: '0.4',
                },
              },
            }),
          }}>
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
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[11px]">列表为空</p>
        </div>
      )}
    </div>
  );
};