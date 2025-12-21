import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, AlertCircle } from 'lucide-react';
import { IpEntry } from '../types';

// --- Sortable Row Component ---
interface SortableRowProps {
  entry: IpEntry;
  onRemove: (id: string) => void;
  onUpdate: (id: string, field: keyof IpEntry, value: any) => void;
}

const SortableRow: React.FC<SortableRowProps> = ({ entry, onRemove, onUpdate }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: entry.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 'auto',
    position: isDragging ? 'relative' as const : 'static' as const,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`group hover:bg-slate-50 transition-colors ${isDragging ? 'bg-blue-50 shadow-md ring-1 ring-blue-200' : ''} ${!entry.active ? 'opacity-60 bg-slate-50' : ''}`}
    >
      <td className="px-3 py-4 w-20 text-center">
        <button
          {...attributes}
          {...listeners}
          className="text-slate-300 hover:text-slate-600 cursor-grab active:cursor-grabbing p-1 rounded inline-flex"
        >
          <GripVertical size={20} />
        </button>
      </td>
      <td className="px-3 py-4 w-20 text-center">
        <input 
          type="checkbox"
          checked={entry.active}
          onChange={(e) => onUpdate(entry.id, 'active', e.target.checked)}
          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
        />
      </td>
      <td className="px-4 py-3">
        <input 
            className="bg-transparent border-transparent border hover:border-slate-300 focus:border-blue-400 focus:ring-0 rounded px-2 py-1 w-full text-slate-700"
            value={entry.ip}
            onChange={(e) => onUpdate(entry.id, 'ip', e.target.value)}
        />
      </td>
      <td className="px-4 py-3 w-32">
        <input 
            className="bg-transparent border-transparent border hover:border-slate-300 focus:border-blue-400 focus:ring-0 rounded px-2 py-1 w-full text-slate-700"
            value={entry.port}
            onChange={(e) => onUpdate(entry.id, 'port', e.target.value)}
        />
      </td>
      <td className="px-4 py-3 w-32">
        <input 
            className="bg-transparent border-transparent border hover:border-slate-300 focus:border-blue-400 focus:ring-0 rounded px-2 py-1 w-full text-slate-700"
            value={entry.region}
            placeholder="地区"
            onChange={(e) => onUpdate(entry.id, 'region', e.target.value)}
        />
      </td>
      <td className="px-4 py-3 w-16 text-center">
        <button
          onClick={() => onRemove(entry.id)}
          className="text-slate-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors"
          title="删除"
        >
          <Trash2 size={18} />
        </button>
      </td>
    </tr>
  );
};

// --- Main List Component ---
interface IpListProps {
  entries: IpEntry[];
  setEntries: (entries: IpEntry[]) => void;
  onClear: () => void;
}

export const IpList: React.FC<IpListProps> = ({ entries, setEntries, onClear }) => {
  const [clearConfirm, setClearConfirm] = useState(false);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
        // Prevent drag when editing inputs
        activationConstraint: {
            distance: 8,
        }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = entries.findIndex((item) => item.id === active.id);
      const newIndex = entries.findIndex((item) => item.id === over.id);
      setEntries(arrayMove(entries, oldIndex, newIndex));
    }
  };

  const handleRemove = (id: string) => {
    setEntries(entries.filter(e => e.id !== id));
  };

  const handleUpdate = (id: string, field: keyof IpEntry, value: any) => {
    setEntries(entries.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const handleClearClick = () => {
    if (clearConfirm) {
        onClear();
        setClearConfirm(false);
    } else {
        setClearConfirm(true);
        setTimeout(() => setClearConfirm(false), 3000);
    }
  };

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300 text-slate-400">
        暂无数据，请从上方添加 IP
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
                <tr>
                <th scope="col" className="w-20 px-1 py-3 text-center">
                    <button 
                        onClick={handleClearClick}
                        className={`text-xs p-1.5 rounded transition-colors flex items-center justify-center mx-auto ${
                            clearConfirm 
                            ? 'bg-red-600 text-white hover:bg-red-700' 
                            : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
                        }`}
                        title="清空列表"
                    >
                        {clearConfirm ? <span className="font-bold text-[10px]">确定?</span> : <Trash2 size={16} />}
                    </button>
                </th>
                <th scope="col" className="w-20 px-3 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">启用</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">IP 地址</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">端口</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">地区</th>
                <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">操作</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
                <SortableContext
                items={entries.map(e => e.id)}
                strategy={verticalListSortingStrategy}
                >
                {entries.map((entry) => (
                    <SortableRow
                        key={entry.id}
                        entry={entry}
                        onRemove={handleRemove}
                        onUpdate={handleUpdate}
                    />
                ))}
                </SortableContext>
            </tbody>
            </table>
        </div>
      </DndContext>
      <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 text-right">
        共 {entries.length} 个节点 ({entries.filter(e => e.active).length} 个可用)
      </div>
    </div>
  );
};