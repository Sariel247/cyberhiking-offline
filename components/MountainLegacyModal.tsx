import React, { useRef, useState } from 'react';
import { SHOP_ITEMS } from '../constants';
import type { Achievement } from '../types';
import type { MountainHistoryRecord, MountainLegacyBank, MountainLegacyBackup } from '../services/mountainLegacy';
import { createMountainLegacyBackup, isMountainLegacyBackup } from '../services/mountainLegacy';

interface Props {
  show: boolean;
  bank: MountainLegacyBank;
  records: MountainHistoryRecord[];
  achievements: Achievement[];
  onClose: () => void;
  onImportBackup: (backup: MountainLegacyBackup) => boolean;
}

const ROUTE_RIGHTS = [
  { name: '北坡下撤路线', note: '专属下撤路线', integrated: false },
  { name: '厚畛子铺路线', note: '专属路线', integrated: false },
  { name: '黄柏塬镇路线', note: '23km 登山口 · 练驴坡 · 导航架', integrated: true },
  { name: '都督门路线', note: '专属路线与下撤选择', integrated: false },
  { name: '太白山景区路线', note: '景区方向专属路线', integrated: false }
];

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const MountainLegacyModal: React.FC<Props> = ({ show, bank, records, achievements, onClose, onImportBackup }) => {
  const [tab, setTab] = useState<'routes' | 'assets' | 'history'>('routes');
  const [message, setMessage] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  if (!show) return null;

  const unlockedAchievements = achievements.filter(a => a.unlocked);
  const assetNames = new Map(SHOP_ITEMS.map(item => [item.id, item.name.zh]));
  const exportBackup = () => {
    const backup = createMountainLegacyBackup(bank, records, achievements);
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = '赛博徒步-山神刻石备份.json';
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage('备份文件已生成，请妥善保存。');
  };
  const importBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isMountainLegacyBackup(parsed)) throw new Error('文件格式不正确');
      const ok = onImportBackup(parsed);
      setMessage(ok ? '历史刻石与行囊资产已恢复。' : '恢复失败，请检查备份文件。');
    } catch {
      setMessage('无法读取备份：文件格式不正确或内容已损坏。');
    } finally {
      event.target.value = '';
    }
  };

  return <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/80 p-3 backdrop-blur-md">
    <section className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-amber-100/20 bg-[#151a17] text-stone-100 shadow-2xl">
      <header className="border-b border-white/10 bg-gradient-to-r from-[#30291d] to-[#17221b] p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-[9px] font-bold tracking-[.3em] text-amber-200/70">BLESSING OF THE MOUNTAIN GOD</p><h2 className="mt-2 text-2xl font-black tracking-wider text-amber-100">山神通行证</h2><p className="mt-1 text-[10px] text-stone-400">三大权能 · 离线赞助者档案</p></div>
          <button onClick={onClose} aria-label="关闭" className="rounded-full border border-white/10 px-3 py-2 text-sm text-stone-400 hover:text-white">✕</button>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <button onClick={()=>setTab('routes')} className={'rounded-xl px-2 py-3 text-[11px] font-bold '+(tab==='routes'?'bg-sky-400/15 text-sky-200 ring-1 ring-sky-300/30':'bg-black/20 text-stone-400')}>🛡️ 先登山径</button>
          <button onClick={()=>setTab('assets')} className={'rounded-xl px-2 py-3 text-[11px] font-bold '+(tab==='assets'?'bg-amber-400/15 text-amber-100 ring-1 ring-amber-200/30':'bg-black/20 text-stone-400')}>📦 行囊继承</button>
          <button onClick={()=>setTab('history')} className={'rounded-xl px-2 py-3 text-[11px] font-bold '+(tab==='history'?'bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-300/30':'bg-black/20 text-stone-400')}>◷ 历史刻石</button>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
        {tab==='routes'&&<div className="space-y-3">
          <div className="rounded-2xl border border-sky-300/15 bg-sky-950/20 p-4"><b className="text-sm text-sky-100">先登山径 · 专属路线资格</b><p className="mt-2 text-xs leading-6 text-stone-400">山神赐福已为本地档案记录五条专属路线资格，并开放从黄柏塬镇出发的多起点入口。路线资格与地图内容接入状态分开显示，避免把尚未完成的路线误标为可玩。</p></div>
          {ROUTE_RIGHTS.map(route=><div key={route.name} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-3"><div className="min-w-0"><b className="block text-xs text-stone-100">{route.name}</b><p className="mt-1 text-[10px] text-stone-500">{route.note}</p></div><div className="shrink-0 text-right"><span className="block text-[9px] font-bold text-emerald-200">资格已解锁</span><span className={'mt-1 block text-[9px] '+(route.integrated?'text-emerald-300':'text-amber-200/70')}>{route.integrated?'地图已接入':'地图数据待接入'}</span></div></div>)}
          <p className="text-[10px] leading-5 text-stone-500">注：目前黄柏塬镇路线已接入离线地图。其余路线已纳入权益清单，但仍需补齐官方路线节点、分支与事件数据后才能开放实际游玩。</p>
        </div>}
        {tab==='assets'&&<div className="space-y-4">
          <div className="rounded-2xl border border-amber-200/20 bg-amber-950/20 p-4"><p className="text-[10px] text-amber-100/70">可继承资金</p><p className="mt-1 text-3xl font-black tabular-nums text-amber-100">{bank.balance.toLocaleString('zh-CN')} <span className="text-xs font-medium text-amber-100/60">金币</span></p><p className="mt-2 text-[10px] text-stone-500">每次挑战结束后结算，作为下一段征程的初始资金。</p></div>
          <div><div className="flex items-center justify-between"><b className="text-sm">高价值装备</b><span className="text-[10px] text-stone-500">{bank.equipment.length} 类</span></div>
            {bank.equipment.length? <div className="mt-3 space-y-2">{bank.equipment.map(asset=><div key={asset.itemId} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2.5"><span className="text-xs">{assetNames.get(asset.itemId)||asset.itemId}</span><b className="text-xs text-amber-100">× {asset.quantity}</b></div>)}</div>:<p className="mt-3 rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-stone-500">完成第一局挑战后，高价值装备将自动登记。</p>}
          </div>
          <p className="text-[10px] leading-5 text-stone-500">继承范围：背包、外骨骼、帐篷、睡袋、防潮垫、导航仪、卫星电话、相机及望远镜等指定高价值装备。消耗品不会自动继承。</p>
        </div>}
        {tab==='history'&&<div className="space-y-4">
          <div className="grid grid-cols-2 gap-2"><div className="rounded-xl border border-emerald-300/15 bg-emerald-950/20 p-3"><p className="text-[10px] text-stone-500">历史挑战</p><b className="mt-1 block text-2xl text-emerald-100">{records.length}</b></div><div className="rounded-xl border border-emerald-300/15 bg-emerald-950/20 p-3"><p className="text-[10px] text-stone-500">已收集称号</p><b className="mt-1 block text-2xl text-emerald-100">{unlockedAchievements.length}</b></div></div>
          <div><b className="text-sm">称号与成就</b>{unlockedAchievements.length?<div className="mt-3 flex flex-wrap gap-2">{unlockedAchievements.map(a=><span key={a.id} className="rounded-full border border-emerald-200/20 bg-emerald-950/30 px-3 py-1.5 text-[10px] text-emerald-100">{a.icon} {a.name.zh}</span>)}</div>:<p className="mt-2 text-xs text-stone-500">尚未解锁称号。完成挑战、探索与救援目标，留下你的第一枚刻石。</p>}</div>
          <div><b className="text-sm">征程记录</b>{records.length?<div className="mt-3 space-y-2">{records.map(record=><article key={record.id} className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="flex items-center justify-between gap-2"><b className="text-xs">{record.routeName}</b><span className={'text-[9px] font-bold '+(record.outcome==='success'?'text-emerald-300':'text-rose-300')}>{record.outcome==='success'?'成功归来':'挑战结束'}</span></div><p className="mt-1 text-[10px] text-stone-500">{formatDate(record.endedAt)} · 生存 {record.days} 天 · 功德 {record.merit}</p><p className="mt-2 text-[10px] text-stone-400">剩余资金 {record.gold.toLocaleString('zh-CN')} · 到达地标 {record.landmarksReached}</p>{record.titles.length>0&&<p className="mt-2 text-[10px] text-emerald-200/80">称号：{record.titles.join('、')}</p>}</article>)}</div>:<p className="mt-2 rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-stone-500">完成或结束一局挑战后，历史记录会自动刻在这里。</p>}</div>
        </div>}
      </div>
      <footer className="border-t border-white/10 p-4">
        <div className="flex flex-wrap gap-2"><button onClick={exportBackup} className="flex-1 rounded-xl border border-emerald-200/25 bg-emerald-950/25 px-3 py-3 text-[10px] font-bold text-emerald-100">导出刻石备份</button><button onClick={()=>fileRef.current?.click()} className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-[10px] font-bold text-stone-200">导入备份</button><input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={importBackup}/></div>
        {message&&<p className="mt-2 text-center text-[10px] text-emerald-200">{message}</p>}
        <p className="mt-2 text-center text-[9px] leading-5 text-stone-600">档案默认保存在当前浏览器。更换设备或清理网站数据前，请先导出备份文件。</p>
      </footer>
    </section>
  </div>;
};

export default MountainLegacyModal;
