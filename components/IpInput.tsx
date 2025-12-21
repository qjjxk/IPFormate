import React, { useState } from 'react';
import { Plus, Upload, AlertCircle } from 'lucide-react';
import { IpEntry } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { parseBatchInput } from '../utils/parser';
import { cn } from '../utils/cn';

interface IpInputProps {
  onAdd: (entries: IpEntry[]) => void;
  existingEntries: IpEntry[];
}

export const IpInput: React.FC<IpInputProps> = ({ onAdd, existingEntries }) => {
  const [mode, setMode] = useState<'single' | 'batch'>('batch');
  const [singleIp, setSingleIp] = useState('');
  const [singlePort, setSinglePort] = useState('');
  const [singleRegion, setSingleRegion] = useState('');
  const [batchText, setBatchText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isDuplicate = (ip: string, port: string) => {
    return existingEntries.some(e => e.ip === ip && e.port === port);
  };

  const handleSingleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!singleIp || !singlePort) {
      setError('IP 和端口是必填项');
      return;
    }

    if (isDuplicate(singleIp, singlePort)) {
      setError(`IP ${singleIp}:${singlePort} 已存在`);
      return;
    }

    onAdd([{
      id: uuidv4(),
      ip: singleIp,
      port: singlePort,
      region: singleRegion || '🏳️',
      active: true
    }]);

    setSingleIp('');
    setSinglePort('');
    setSingleRegion('');
  };

  const handleBatchAdd = () => {
    setError(null);
    if (!batchText.trim()) return;

    const parsed = parseBatchInput(batchText);
    const newEntries: IpEntry[] = [];
    let duplicatesCount = 0;

    parsed.forEach(entry => {
      if (!isDuplicate(entry.ip, entry.port)) {
        // Check for internal duplicates within the batch
        if (!newEntries.some(ne => ne.ip === entry.ip && ne.port === entry.port)) {
          newEntries.push(entry);
        } else {
          duplicatesCount++;
        }
      } else {
        duplicatesCount++;
      }
    });

    if (newEntries.length === 0 && parsed.length > 0) {
      setError('所有输入的 IP 都已存在。');
      return;
    }

    if (duplicatesCount > 0) {
       // Just a gentle warning, but still add the rest
       setError(`成功导入 ${newEntries.length} 个，忽略 ${duplicatesCount} 个重复项。`);
    }

    onAdd(newEntries);
    setBatchText('');
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
      <div className="flex space-x-4 mb-4 border-b border-slate-100 pb-2">
        <button
          onClick={() => setMode('batch')}
          className={cn(
            "pb-2 text-sm font-medium transition-colors",
            mode === 'batch' 
              ? "text-blue-600 border-b-2 border-blue-600" 
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          批量导入
        </button>
        <button
          onClick={() => setMode('single')}
          className={cn(
            "pb-2 text-sm font-medium transition-colors",
            mode === 'single' 
              ? "text-blue-600 border-b-2 border-blue-600" 
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          手动添加
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-md flex items-center">
          <AlertCircle size={16} className="mr-2" />
          {error}
        </div>
      )}

      {mode === 'single' ? (
        <form onSubmit={handleSingleAdd} className="flex flex-col md:flex-row gap-3 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs font-semibold text-slate-500 mb-1">IP 地址</label>
            <input
              type="text"
              value={singleIp}
              onChange={(e) => setSingleIp(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. 1.1.1.1"
            />
          </div>
          <div className="w-full md:w-32">
            <label className="block text-xs font-semibold text-slate-500 mb-1">端口</label>
            <input
              type="text"
              value={singlePort}
              onChange={(e) => setSinglePort(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="443"
            />
          </div>
          <div className="w-full md:w-32">
            <label className="block text-xs font-semibold text-slate-500 mb-1">地区</label>
            <input
              type="text"
              value={singleRegion}
              onChange={(e) => setSingleRegion(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="🇺🇸"
            />
          </div>
          <button
            type="submit"
            className="w-full md:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center transition-colors font-medium h-[42px]"
          >
            <Plus size={18} className="mr-1" /> 添加
          </button>
        </form>
      ) : (
        <div className="space-y-3">
          <textarea
            value={batchText}
            onChange={(e) => setBatchText(e.target.value)}
            className="w-full h-32 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            placeholder={`支持格式：\n1. 表格复制 (IP ...)\n2. 23.106.143.6:443,8.209.232.49:8443\n3. 23.106.143.6:443#🇺🇸,3.113.105.32:443#🇯🇵`}
          />
          <button
            onClick={handleBatchAdd}
            className="px-4 py-2 bg-slate-800 text-white rounded-md hover:bg-slate-900 flex items-center justify-center transition-colors font-medium text-sm"
          >
            <Upload size={16} className="mr-2" /> 识别并导入
          </button>
        </div>
      )}
    </div>
  );
};