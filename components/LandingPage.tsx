import React,{useState} from 'react';
import {GameState} from '../types';
interface Props{
 gameState:GameState;
 showAchievements:boolean;
 showQuiz:boolean;
 t:any;
 onStartShopping:()=>void;
 onContinue:()=>void;
 onShowAchievements:(v:boolean)=>void;
 onShowQuiz:(v:boolean)=>void;
 translations:any;
 hasMountainBlessing:boolean;
 onRedeemCode:(code:string)=>boolean;
}
const LandingPage:React.FC<Props>=({gameState,onStartShopping,onContinue,onShowAchievements,onShowQuiz,hasMountainBlessing,onRedeemCode})=>{
 const [notice,setNotice]=useState(()=>{try{return !localStorage.getItem('cyberHike_notice_v0155')}catch{return true}});
 const [panel,setPanel]=useState<'faq'|'about'|'community'|'sponsor'|null>(null);
 const [sponsorCode,setSponsorCode]=useState('');
 const [sponsorMessage,setSponsorMessage]=useState('');
 const dismiss=()=>{setNotice(false);try{localStorage.setItem('cyberHike_notice_v0155','1')}catch{}};
 const hasSave=gameState.log.length>0;
 const redeem=()=>{
  if(hasMountainBlessing){setSponsorMessage('山神赐福已经生效，无需重复兑换。');return;}
  const ok=onRedeemCode(sponsorCode);
  setSponsorMessage(ok?'雾散山现。山神赐福已降临，本机永久解锁赞助者权益。':'兑换码不正确，请检查文字后重试。');
 };
 return <main className="relative flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-[#080b0a] text-white">
  <img src="https://d2oyd22xy9utpf.cloudfront.net/images/backgrounds/splash.webp" alt="" className="absolute inset-0 h-full w-full object-cover"/>
  <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-black/80"/>
  <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-4 sm:px-9"><div><p className="text-[9px] font-bold tracking-[.35em] text-emerald-100/70">CYBER HIKING · QINLING</p><p className="mt-1 text-xs font-bold tracking-widest">秦岭 · 生死鳌太线</p></div><div className="flex items-center gap-2"><span className="rounded-full border border-white/15 bg-black/25 px-3 py-1.5 text-[9px] font-mono text-stone-300">OFFLINE EDITION · BASED ON v0.1.55</span>{hasMountainBlessing&&<span className="rounded-full border border-amber-200/40 bg-amber-950/45 px-3 py-1.5 text-[9px] font-bold text-amber-100">✦ 山神赐福</span>}</div></header>
  <nav className="absolute right-5 top-1/2 z-10 hidden -translate-y-1/2 flex-col gap-5 text-right text-[11px] font-bold tracking-wider text-stone-200/75 md:flex"><button onClick={()=>setPanel('faq')} className="hover:text-white">常见问题</button><button onClick={()=>setPanel('community')} className="hover:text-white">山迹共铸</button><button onClick={()=>onShowQuiz(true)} className="hover:text-white">理论考试</button><button onClick={()=>setPanel('about')} className="hover:text-white">关于游戏</button><button onClick={()=>{setPanel('sponsor');setSponsorMessage('')}} className="text-amber-100 hover:text-amber-50">✦ 山神赐福</button></nav>
  <section className="relative z-10 mx-auto w-full max-w-xl px-5 text-center"><p className="mb-4 text-[10px] font-bold tracking-[.45em] text-emerald-100/80">AOTAI TRAIL · 3767M</p><h1 className="text-5xl font-black italic tracking-tight text-white drop-shadow-2xl sm:text-7xl">赛博徒步</h1><p className="mt-3 text-sm font-bold tracking-[.5em] text-rose-100/90">生 · 死 · 鳌 · 太 · 线</p><p className="mx-auto mt-7 max-w-md text-xs leading-7 text-stone-200/85">“鳌太无情，山神不留任性之人。”<br/>一条山脊，一场关于敬畏、选择与生存的模拟旅程。</p><div className="mx-auto mt-9 flex max-w-xs flex-col gap-3"><button onClick={onStartShopping} className="rounded-xl bg-[#e9e2d3] px-8 py-4 text-xs font-black tracking-[.25em] text-[#211d17] shadow-2xl transition hover:bg-white">开始挑战</button>{hasSave&&<button onClick={onContinue} className="rounded-xl border border-emerald-200/40 bg-emerald-950/45 px-8 py-3.5 text-xs font-black tracking-[.2em] text-emerald-100">继续旅程 · 本地存档</button>}<div className="flex gap-3"><button onClick={()=>onShowAchievements(true)} className="flex-1 rounded-xl border border-white/15 bg-black/25 py-3 text-[10px] font-bold">🏆 成就档案</button><button onClick={()=>onShowQuiz(true)} className="flex-1 rounded-xl border border-white/15 bg-black/25 py-3 text-[10px] font-bold">❓ 理论考试</button></div><button onClick={()=>{setPanel('sponsor');setSponsorMessage('')}} className="rounded-xl border border-amber-200/30 bg-amber-950/30 py-3 text-[10px] font-bold tracking-[.2em] text-amber-100">{hasMountainBlessing?'✦ 山神赐福 · 权益已激活':'✦ 山神赐福 · 输入赞助码'}</button></div><p className="mt-7 text-[9px] leading-5 text-stone-300/60">非官方离线改造版 · 赞助者权益仅在本机离线生效<br/>鳌太线为高风险自然区域，本游戏不构成现实徒步建议</p></section>
  <footer className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between px-5 py-4 text-[9px] text-stone-300/50 sm:px-9"><span>© CYBER HIKING OFFLINE</span><span>THE MOUNTAIN REMEMBERS</span></footer>
  {notice&&<div className="fixed inset-0 z-30 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"><div className="w-full max-w-lg rounded-3xl border border-emerald-200/20 bg-[#151b17] p-6 shadow-2xl"><p className="text-[9px] font-bold tracking-[.3em] text-emerald-200/70">VERSION UPDATE · v0.1.55</p><h2 className="mt-2 text-xl font-black">山路有了新的变化</h2><div className="mt-4 space-y-3 text-xs leading-6 text-stone-300"><p>本次官网更新涉及路线地图、撤退路线、草药探索与识药支线，以及天气表现和沿途场景。</p><p>离线版新增本地赞助码兑换入口，可解锁山神赐福权益；不接入账号登录、支付或在线验证。</p></div><button onClick={dismiss} className="mt-6 w-full rounded-xl bg-emerald-300 py-3 text-xs font-black text-[#102018]">我知道了</button></div></div>}
  {panel&&<div className="fixed inset-0 z-30 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#151b17] p-6 shadow-2xl"><div className="flex justify-between"><h3 className="font-black">{panel==='faq'?'常见问题':panel==='about'?'关于游戏':panel==='sponsor'?'山神赐福':'山迹共铸'}</h3><button onClick={()=>setPanel(null)} aria-label="关闭">✕</button></div>{panel==='sponsor'?<div className="mt-4"><div className="rounded-xl border border-amber-200/20 bg-amber-950/25 p-4 text-center"><p className="text-[9px] tracking-[.3em] text-amber-200/70">BLESSING OF THE MOUNTAIN GOD</p><h4 className="mt-2 text-2xl font-black tracking-[.15em] text-amber-100">雾尽见山神</h4><p className="mt-2 text-[10px] leading-5 text-stone-400">以一段文字，开启山中的另一条路。</p></div>{hasMountainBlessing?<div className="mt-4 rounded-xl border border-emerald-300/25 bg-emerald-950/25 p-4 text-center"><div className="text-2xl">✦</div><b className="mt-1 block text-emerald-200">山神赐福已生效</b><p className="mt-2 text-xs leading-6 text-stone-400">本机赞助者权益已永久解锁。黄柏塬镇专属起点现已开放。</p></div>:<><label className="mt-4 block text-[10px] font-bold text-stone-300">输入赞助兑换码</label><input value={sponsorCode} onChange={e=>{setSponsorCode(e.target.value);setSponsorMessage('')}} onKeyDown={e=>{if(e.key==='Enter')redeem()}} placeholder="请输入赞助码" autoComplete="off" spellCheck={false} className="mt-2 w-full rounded-xl border border-white/15 bg-black/35 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-200/60"/><button onClick={redeem} disabled={!sponsorCode.trim()} className="mt-3 w-full rounded-xl bg-amber-100 py-3 text-xs font-black text-[#2b2418] disabled:opacity-40">确认兑换</button></>}{sponsorMessage&&<p className={'mt-3 text-center text-xs '+(sponsorMessage.includes('不正确')?'text-rose-300':'text-emerald-200')}>{sponsorMessage}</p>}<div className="mt-4 border-t border-white/10 pt-3 text-[10px] leading-5 text-stone-500">兑换记录保存在当前浏览器。清除网站数据会清除本地解锁记录；此兑换码是离线彩蛋，不属于安全的商业授权验证。</div></div>:<p className="mt-4 text-xs leading-7 text-stone-300">{panel==='faq'?'离线版首次访问需要联网加载并缓存网页资源。之后可在同一浏览器中离线游玩。存档保存在当前浏览器，清除网站数据会同时清除存档。':panel==='about'?'《赛博徒步：生死鳌太线》是一款以秦岭鳌太线为背景的生存模拟游戏。本仓库是非官方离线改造版，目标是还原公开版本的玩法与体验。':'社区互动与在线投稿依赖官方网站服务，离线版本暂不接入。'}</p>}<button onClick={()=>setPanel(null)} className="mt-5 w-full rounded-xl bg-white/10 py-3 text-xs">关闭</button></div></div>}
 </main>;
};
export default LandingPage;
