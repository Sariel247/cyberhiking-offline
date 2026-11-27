import React from 'react';
import { Achievement, GameState } from '../types';

interface AchievementModalProps {
  show: boolean;
  achievements: Achievement[];
  collectibles?: string[];
  language: 'zh' | 'en';
  t: any;
  onClose: () => void;
}

const AchievementModal: React.FC<AchievementModalProps> = ({
  show,
  achievements,
  collectibles = [],
  language,
  t,
  onClose
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 hardware-accel animate-in fade-in duration-300">
      <div className="max-w-2xl w-full cyber-panel p-8 rounded-[2rem] border border-sky-500/30 flex flex-col max-h-[85vh]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black italic text-white uppercase tracking-tighter">🏆 {t.achievementList}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">✕</button>
        </div>
        <div className="flex-grow overflow-y-auto custom-scrollbar pr-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {achievements.map(a => (
              <div
                key={a.id}
                className={`p-4 rounded-2xl border flex items-center gap-4 transition-all ${
                  a.unlocked
                    ? 'bg-sky-500/10 border-sky-500/40 opacity-100'
                    : 'bg-slate-900/50 border-white/5 opacity-40'
                }`}
              >
                <span className="text-2xl">{a.icon}</span>
                <div className="min-w-0">
                  <p className="text-xs font-black text-white uppercase truncate">{a.name[language]}</p>
                  <p className="text-[10px] text-slate-500 leading-tight">{a.description[language]}</p>
                </div>
              </div>
            ))}
          </div>
          <section className="mt-7 border-t border-white/10 pt-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-black text-amber-100">📜 山野纪念物</h3>
              <span className="text-[9px] text-slate-500">{collectibles.length} / 1 已收藏</span>
            </div>
            {collectibles.includes('herb_field_notes') ? (
              <div className="rounded-2xl border border-amber-200/25 bg-amber-950/20 p-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📓</span>
                  <div>
                    <p className="text-xs font-black text-amber-100">《草木识药手札》</p>
                    <p className="mt-1 text-[10px] leading-5 text-stone-400">慕老师协助整理的观察记录。保留已核对的观察方法，并将无法确认的植物信息标记为待核实。</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 p-4 text-center text-[10px] leading-5 text-slate-500">
                尚未获得纪念物。沿途搜寻草木线索，完成识药记录后即可收藏。
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default AchievementModal;
