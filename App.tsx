
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { LANDMARKS, INITIAL_GAME_STATE, SHOP_ITEMS, INITIAL_STATUS, ACHIEVEMENTS, LOCAL_EVENTS, QUIZ_QUESTIONS, DIARY_ITEM, ROOT_ITEM } from './constants';
import { GameState, WeatherType, PlayerStatus, Landmark, InventoryItem, RouteOption, Language, Season, ItemCategory, Achievement, RandomEvent, EventChoice } from './types';
import { generateNarrative, getSurvivalAdvice } from './services/geminiService';
import StatusBar from './components/StatusBar';
import EventDialog from './components/EventDialog';
import LandingPage from './components/LandingPage';
import AchievementModal from './components/AchievementModal';
import QuizModal from './components/QuizModal';
import ShoppingPage from './components/ShoppingPage';
import GameOverModal from './components/GameOverModal';
import IntroSequence from './components/IntroSequence';
import { StartPointModal, StoryScreen, OfficialShop, OfficialGameplay } from './components/ReplicaUI';
import { useGameLogic } from './hooks/useGameLogic';
import { useQuiz } from './hooks/useQuiz';

const LOG_LIMIT = 50;
const SCRIPTED_MISSING_EVENT: RandomEvent = {
  id: 'script_missing_notice',
  title: { zh: '寻人启事', en: 'Missing Person Notice' },
  description: { zh: '公告栏上贴着一张被雨水浸皱的寻人启事。照片中的年轻人已经失联数月，下面的联系电话被风吹得模糊不清。你停下脚步，仔细看了看那张脸。', en: 'A rain-wrinkled missing-person notice is pinned to the board. The young hiker in the photo has been missing for months.' },
  choices: [
    { text: { zh: '拍下照片，记下线索（需要照相机）', en: 'Photograph the notice (Camera required)' }, log: { zh: '你拍下了寻人启事，希望这条线索能在未来派上用场。', en: 'You photograph the notice and keep the clue.' }, healthImpact: 0, staminaImpact: -1, meritImpact: 10, requiredItems: [{ itemId: 'g24', quantity: 1 }] },
    { text: { zh: '匆匆路过', en: 'Pass by' }, log: { zh: '你没有停留太久。那张照片却在脑海里留下了影子。', en: 'You move on, but the face lingers in your mind.' }, healthImpact: 0, staminaImpact: 0, meritImpact: -5 }
  ]
};
const SCRIPTED_BOAR_EVENT: RandomEvent = {
  id: 'script_injured_boar',
  title: { zh: '受伤的野猪', en: 'Injured Wild Boar' },
  description: { zh: '路边的灌木丛里传来沉闷的喘息声。一只野猪倒在湿冷的落叶间，后腿有一道明显的伤口。它警惕地盯着你，随时可能挣扎起身。', en: 'A wounded wild boar lies among wet leaves, watching you warily.' },
  choices: [
    { text: { zh: '保持距离，使用医疗物资处理伤口（需要医疗包）', en: 'Treat from a safe distance (Medical kit required)' }, log: { zh: '你没有贸然靠近，而是谨慎地处理伤口附近的情况，随后慢慢离开。', en: 'You keep a safe distance, help where possible, then leave.' }, healthImpact: 0, staminaImpact: -3, meritImpact: 15, requiredItems: [{ itemId: 'm1', quantity: 1 }] },
    { text: { zh: '放下一份食物后离开（需要食物）', en: 'Leave food and move on (Food required)' }, log: { zh: '你把食物放在远处，等野猪注意到食物后便退回山路。', en: 'You leave food at a distance and retreat.' }, healthImpact: 0, staminaImpact: -2, meritImpact: 8, requiredItems: [{ itemId: 'f1', quantity: 1 }] },
    { text: { zh: '不靠近它，绕路离开', en: 'Keep away and walk around' }, log: { zh: '你绕开了灌木丛，没有惊扰这只受伤的野猪。', en: 'You give the animal space and take another path.' }, healthImpact: 0, staminaImpact: -1, meritImpact: 3 }
  ]
};
const SEARCH_ROOTS_EVENT: RandomEvent = {
  id: 'search_roots',
  title: { zh: '发现可食用草根', en: 'Edible Wild Roots' },
  description: { zh: '你在潮湿的石缝边找到一些根茎。它们看起来可以暂时充饥，但你仍需要谨慎判断。', en: 'You find a few roots near a damp rock crevice. They may help with hunger, but be cautious.' },
  choices: [
    { text: { zh: '立即食用', en: 'Eat now' }, log: { zh: '草根的味道并不好，但至少暂时缓解了饥饿。', en: 'The roots taste rough, but ease your hunger.' }, healthImpact: 0, staminaImpact: 0, meritImpact: 0, energyImpact: 15, hydrationImpact: 3 },
    { text: { zh: '放入背包', en: 'Put them in the backpack' }, log: { zh: '你把草根收进背包，留作之后的补给。', en: 'You store the roots for later.' }, healthImpact: 0, staminaImpact: 0, meritImpact: 0, rewardItems: [{ itemId: 'roots', quantity: 1 }] },
    { text: { zh: '不确定能否食用，放弃', en: 'Leave them' }, log: { zh: '你没有冒险食用来历不明的植物。', en: 'You decide not to eat an unfamiliar plant.' }, healthImpact: 0, staminaImpact: 0, meritImpact: 2 }
  ]
};


const SAVE_KEY='cyberHike_offline_save_v1';
const loadGameState=():GameState=>{
 const base:GameState={...INITIAL_GAME_STATE,status:{...INITIAL_GAME_STATE.status,conditions:[...INITIAL_GAME_STATE.status.conditions]},inventory:INITIAL_GAME_STATE.inventory.map(i=>({...i})),achievements:INITIAL_GAME_STATE.achievements.map(a=>({...a}))};
 try{const raw=localStorage.getItem(SAVE_KEY);if(!raw){const legacy=localStorage.getItem('cyberHike_achievements');const ids:string[]=legacy?JSON.parse(legacy):[];return {...base,achievements:base.achievements.map(a=>({...a,unlocked:ids.includes(a.id)}))}}
 const saved=JSON.parse(raw) as Partial<GameState>;const catalog=new Map([...SHOP_ITEMS,DIARY_ITEM,ROOT_ITEM].map(i=>[i.id,i]));
 const inventory=Array.isArray(saved.inventory)?saved.inventory.map((v:any)=>{const item=catalog.get(v.id);return item?{...item,...v,effect:item.effect}:v}):base.inventory;
 const achievements=base.achievements.map(a=>({...a,unlocked:saved.achievements?.find(v=>v.id===a.id)?.unlocked??a.unlocked}));
 return {...base,...saved,status:{...base.status,...(saved.status||{})},inventory,achievements} as GameState;
 }catch{return base}
};
const App: React.FC = () => {
 const [gameState,setGameState]=useState<GameState>(()=>loadGameState());

  const [currentEvent, setCurrentEvent] = useState<RandomEvent | null>(null);
  const [showAchievements, setShowAchievements] = useState(false);
  const [activeShopCategory, setActiveShopCategory] = useState<ItemCategory>('core');
  const [shoppingCart, setShoppingCart] = useState<{ [key: string]: number }>({ pack65: 1 });
  const [currentEventImage, setCurrentEventImage] = useState<string | null>(null);
  const [guideLoading, setGuideLoading] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  // 使用自定义hooks
  const { calculateWeight, hasItem: hasItemInInventory, useItem: useItemFromInventory, addItem } = useGameLogic();
  const { 
    showQuiz, 
    currentQuizIndex, 
    quizAnswers, 
    showQuizResult,
    handleAnswer,
    handleNext,
    handlePrevious,
    handleSubmit,
    handleStartQuiz,
    handleCloseQuiz,
    setShowQuiz
  } = useQuiz();

  const t = useMemo(() => translations[gameState.language], [gameState.language]);
  const isNight = gameState.time >= 20 || gameState.time < 6;

  useEffect(() => { if(logEndRef.current) logEndRef.current.scrollIntoView({behavior:'auto'}); }, [gameState.log]);
  useEffect(()=>{try{const inventory=gameState.inventory.map(({effect,...item})=>item);localStorage.setItem(SAVE_KEY,JSON.stringify({...gameState,inventory}));localStorage.setItem('cyberHike_achievements',JSON.stringify(gameState.achievements.filter(a=>a.unlocked).map(a=>a.id)))}catch(e){console.warn('Local save failed:',e)}},[gameState]);

  const currentLandmark = LANDMARKS[gameState.currentLandmarkIndex];
  const hasCheckedInCurrent = gameState.checkedInLandmarks.includes(currentLandmark.id);

  const hasItem = useCallback((id: string) => {
    return hasItemInInventory(gameState.inventory, id);
  }, [gameState.inventory, hasItemInInventory]);

  const persistAchievements = (updatedAchievements: Achievement[]) => {
    const unlockedIds = updatedAchievements.filter(a => a.unlocked).map(a => a.id);
    localStorage.setItem('cyberHike_achievements', JSON.stringify(unlockedIds));
  };

  const settleAchievements = useCallback((state: GameState) => {
    let changed = false;
    const newAchievements = state.achievements.map(a => {
      if (a.unlocked) return a;
      let shouldUnlock = false;
      
      if (a.id === 'a2' && state.merit >= 100) shouldUnlock = true;
      if (a.id === 'a3' && state.peopleSaved >= 1) shouldUnlock = true;
      if (a.id === 'a4' && state.phase === 'gameover' && state.status.health > 0 && state.season === Season.WINTER && state.currentLandmarkIndex === LANDMARKS.length - 1) shouldUnlock = true;
      if (a.id === 'a5' && LANDMARKS[state.currentLandmarkIndex].id === 'l6') shouldUnlock = true;
      if (a.id === 'a6' && state.day >= 6) shouldUnlock = true;
      if (a.id === 'a7' && state.startWeight >= 22) shouldUnlock = true;
      if (a.id === 'a8' && state.merit >= 50) shouldUnlock = true;
      
      // 打卡联动成就
      if (a.id === 'a9' && state.checkedInLandmarks.length >= 3) shouldUnlock = true;
      if (a.id === 'a10' && state.checkedInLandmarks.length >= LANDMARKS.length) shouldUnlock = true;
      
      if (state.phase === 'gameover' && state.status.health > 0 && state.currentLandmarkIndex === LANDMARKS.length - 1) {
         if (a.id === 'a1') shouldUnlock = true;
      }
      
      if (shouldUnlock) {
        changed = true;
        return { ...a, unlocked: true };
      }
      return a;
    });
    if (changed) { persistAchievements(newAchievements); return newAchievements; }
    return state.achievements;
  }, []);

  const updateStatus = useCallback((status: PlayerStatus, weather: WeatherType, hours: number, mode: 'active' | 'passive' | 'sleep' = 'active') => {
    let newStatus = { ...status };
    const weightFactor = 1 + (newStatus.weight / Math.max(1,newStatus.maxWeight)) * 0.4;
    const meritFactor = Math.max(0.7, 1 - (gameState.merit / 1000)); 
    const nightShift = (isNight && mode === 'active' && !hasItem('g4')) ? 2.5 : 1.0;

    if (mode === 'active') {
      newStatus.stamina -= (1.3 * hours * weightFactor * nightShift * meritFactor);
      newStatus.hydration -= (3.5 * hours * nightShift);
      newStatus.energy -= (2.5 * hours);
    } else if (mode === 'passive') {
      newStatus.hydration -= (0.8 * hours);
      newStatus.energy -= (0.4 * hours);
    } else {
      const sleepBonus = hasItem('g3') ? 1.8 : 1.0;
      newStatus.stamina = Math.min(100, newStatus.stamina + (25 * hours * sleepBonus));
      newStatus.health = Math.min(100, newStatus.health + (5 * hours * sleepBonus));
    }

    let tempLoss = 0.2;
    if (weather === WeatherType.BLIZZARD) tempLoss = 3.8;
    else if (weather === WeatherType.HAIL) tempLoss = 1.5;
    else if (weather === WeatherType.OVERCAST) tempLoss = 0.3;
    else if (weather === WeatherType.SNOWY) tempLoss = 2.0;
    else if (weather === WeatherType.RAINY) tempLoss = 1.0;
    else if (weather === WeatherType.FOGGY) tempLoss = 0.6;
    if (gameState.season === Season.WINTER) tempLoss += 1.4;
    if (isNight) tempLoss += 0.9;

    if (mode === 'sleep') {
        // 修正：帐篷和睡袋应该减少失温，而不是增加
        const tentBonus = hasItem('g2') ? 0.3 : 1.0; // 有帐篷减少30%失温
        const bagBonus = hasItem('g3') ? 0.4 : 1.0;  // 有睡袋减少60%失温
        const fireHeating = hasItem('g5') ? 0.8 : 0;  // 气罐提供额外保温
        const passiveHeating = (hasItem('g2') && hasItem('g3')) ? 0.5 : 0; // 帐篷+睡袋组合额外加成
        const finalLoss = (tempLoss * tentBonus * bagBonus);
        const totalGain = (fireHeating + passiveHeating);
        newStatus.bodyTemp += (totalGain - finalLoss) * hours * 0.12;
    } else {
        const gearBonus = hasItem('g1') ? 0.35 : 1.0; // 冲锋衣减少65%失温
        newStatus.bodyTemp -= (tempLoss * hours * 0.1 * gearBonus);
    }

    newStatus.bodyTemp = Math.min(37.2, newStatus.bodyTemp);
    const conditions = [...newStatus.conditions];
    if (newStatus.bodyTemp < 36.4 && !conditions.includes('失温')) conditions.push('失温');
    if (newStatus.hydration < 15 && !conditions.includes('脱水')) conditions.push('脱水');
    if (LANDMARKS[gameState.currentLandmarkIndex].elevation > 3000 && Math.random() < 0.05 && !conditions.includes('高反')) conditions.push('高反');

    if (newStatus.bodyTemp >= 36.8 && conditions.includes('失温')) {
        const idx = conditions.indexOf('失温');
        if (idx > -1) conditions.splice(idx, 1);
    }
    newStatus.conditions = conditions;
    
    let hl = 0;
    if (newStatus.conditions.includes('失温')) hl += 4.5; 
    if (newStatus.conditions.includes('脱水')) hl += 2.8;
    if (newStatus.conditions.includes('外伤')) hl += 1.8;
    if (newStatus.conditions.includes('高反')) hl += 1.2;
    if (newStatus.stamina <= 0) hl += 5.5;

    newStatus.health = Math.max(0, Math.min(100, newStatus.health - (hl * hours)));
    newStatus.stamina = Math.max(0, newStatus.stamina);
    newStatus.hydration = Math.max(0, newStatus.hydration);
    return newStatus;
  }, [gameState.season, isNight, hasItem, gameState.currentLandmarkIndex, gameState.merit]);

  const selectWeightedEvent = useCallback(() => {
    // 过滤出未触发的事件（减少重复概率）
    let availableEvents = LOCAL_EVENTS.filter(e => !gameState.triggeredEvents.includes(e.id));
    
    // 如果所有事件都触发过，保留最近触发的5个，其他可以重新触发
    if (availableEvents.length < 5) {
      const recentEvents = gameState.triggeredEvents.slice(-5);
      availableEvents = LOCAL_EVENTS.filter(e => !recentEvents.includes(e.id));
      
      // 如果还是太少，完全重置
      if (availableEvents.length === 0) {
        availableEvents = LOCAL_EVENTS;
        // 清空历史记录（保留在后续的setGameState中处理）
      }
    }
    
    // 根据玩家状态和环境选择合适的事件
    const currentStatus = gameState.status;
    const currentWeather = gameState.weather;
    const currentElevation = LANDMARKS[gameState.currentLandmarkIndex].elevation;
    const isNight = gameState.time >= 20 || gameState.time < 6;
    const currentDay = gameState.day;
    
    // 紧急事件优先（忽略历史记录）
    // 如果体温过低，增加保暖相关事件概率
    if (currentStatus.bodyTemp < 36.0) {
      const coldEvent = availableEvents.find(e => e.id === 'e4');
      if (coldEvent && Math.random() < 0.4) return coldEvent;
    }
    
    // 如果严重脱水，增加水源相关事件概率
    if (currentStatus.hydration < 30) {
      const waterEvent = availableEvents.find(e => e.id === 'e7');
      if (waterEvent && Math.random() < 0.4) return waterEvent;
    }
    
    // 如果体力过低，增加伤病相关事件概率
    if (currentStatus.stamina < 20) {
      const injuryEvent = availableEvents.find(e => e.id === 'e10');
      if (injuryEvent && Math.random() < 0.3) return injuryEvent;
    }
    
    // 如果在高海拔区域，增加高反相关事件概率
    if (currentElevation > 3000 && currentStatus.conditions.includes('高反')) {
      const rescueEvent = availableEvents.find(e => e.id === 'e6');
      if (rescueEvent && Math.random() < 0.35) return rescueEvent;
    }
    
    // 如果是夜晚，增加方向迷失事件概率
    if (isNight && !hasItem('g4')) {
      const lostEvent = availableEvents.find(e => e.id === 'e5');
      if (lostEvent && Math.random() < 0.5) return lostEvent;
    }
    
    // 根据天气调整事件
    if (currentWeather === WeatherType.BLIZZARD || currentWeather === WeatherType.SNOWY) {
      const weatherEvent = availableEvents.find(e => e.id === 'e4');
      if (weatherEvent && Math.random() < 0.4) return weatherEvent;
    }
    
    // 基于真实事件的触发条件
    if (currentDay > 3 && Math.random() < 0.25) {
      const experienceEvent = availableEvents.find(e => ['e11', 'e13', 'e15'].includes(e.id));
      if (experienceEvent) return experienceEvent;
    }
    
    // 如果玩家表现过于自信，增加警示事件
    if (currentStatus.health > 80 && currentStatus.stamina > 70 && currentStatus.conditions.length === 0 && Math.random() < 0.2) {
      const warningEvent = availableEvents.find(e => ['e12', 'e13', 'e15'].includes(e.id));
      if (warningEvent) return warningEvent;
    }
    
    // 长时间穿越后增加孤独感事件
    if (currentDay > 5 && Math.random() < 0.2) {
      const lonelinessEvent = availableEvents.find(e => e.id === 'e14');
      if (lonelinessEvent) return lonelinessEvent;
    }
    
    // 默认随机选择事件（从未触发的事件中选择）
    return availableEvents[Math.floor(Math.random() * availableEvents.length)];
  }, [gameState, hasItem]);

  const checkGameOver = useCallback((status: PlayerStatus, prevStatus?: PlayerStatus, currentEvent?: RandomEvent): { isOver: boolean, message: string, cause?: string } => {
    let cause: string | undefined;
    let message = '';
    
    // 检查死亡原因并构建链条
    if (status.health <= 0) {
      if (prevStatus && prevStatus.health > 0 && currentEvent) {
        // 事件导致的死亡
        cause = `${currentEvent.title.zh} → 伤害致命 → 死亡`;
      } else if (status.conditions.includes('外伤')) {
        cause = '创伤恶化 → 失血过多 → 死亡';
      }
      message = `${t.deathReason.health} [生命值: ${status.health.toFixed(1)}, 体温: ${status.bodyTemp.toFixed(1)}℃, 水分: ${status.hydration.toFixed(1)}%, 体力: ${status.stamina.toFixed(1)}%]`;
      return { isOver: true, message, cause };
    }
    
    if (status.bodyTemp < 34.0) {
      if (prevStatus && prevStatus.bodyTemp >= 34.0) {
        // 新引发的失温
        if (gameState.weather === WeatherType.BLIZZARD) {
          cause = `暴风雪环境 → 体温急剧下降 → 失温性休克 → 死亡`;
        } else if (gameState.weather === WeatherType.SNOWY) {
          cause = `大雪覆盖 → 无法保温 → 严重失温 → 死亡`;
        } else if (currentEvent) {
          cause = `${currentEvent.title.zh} → 体温丧失 → 失温 → 死亡`;
        } else {
          cause = `长期暴露 → 体温持续下降 → 失温性死亡`;
        }
      }
      message = `${t.deathReason.bodyTemp} [体温: ${status.bodyTemp.toFixed(1)}℃, 生命值: ${status.health.toFixed(1)}, 水分: ${status.hydration.toFixed(1)}%, 体力: ${status.stamina.toFixed(1)}%]`;
      return { isOver: true, message, cause };
    }
    
    if (status.hydration <= 0) {
      if (prevStatus && prevStatus.hydration > 0) {
        if (currentEvent?.title.zh.includes('幻觉')) {
          cause = `高原缺氧 → 幻觉导向 → 无法补水 → 脱水昏迷`;
        } else {
          cause = `补给不足 → 长期脱水 → 器官衰竭 → 死亡`;
        }
      }
      message = `${t.deathReason.hydration} [水分: ${status.hydration.toFixed(1)}%, 生命值: ${status.health.toFixed(1)}, 体温: ${status.bodyTemp.toFixed(1)}℃, 体力: ${status.stamina.toFixed(1)}%]`;
      return { isOver: true, message, cause };
    }
    
    if (status.stamina <= 0 && status.health <= 2) {
      if (prevStatus && prevStatus.stamina > 0) {
        if (status.conditions.includes('高反')) {
          cause = `高原反应 → 体力严重消耗 → 缺氧晕迷 → 死亡`;
        } else if (status.weight > status.maxWeight) {
          cause = `严重超重 → 过度疲劳 → 心脏衰竭 → 死亡`;
        } else {
          cause = `连续行军 → 体力耗尽 → 精力衰竭 → 倒地不起`;
        }
      }
      message = `${t.deathReason.stamina} [体力: ${status.stamina.toFixed(1)}%, 生命值: ${status.health.toFixed(1)}, 体温: ${status.bodyTemp.toFixed(1)}℃, 水分: ${status.hydration.toFixed(1)}%]`;
      return { isOver: true, message, cause };
    }
    
    return { isOver: false, message: '' };
  }, [t.deathReason, gameState.weather]);

  const createStatusAlerts = useCallback((prev: PlayerStatus, next: PlayerStatus, lang: Language) => {
    const alerts: string[] = [];
    const newConditions = next.conditions.filter(c => !prev.conditions.includes(c));

    newConditions.forEach(cond => {
      if (cond === '失温') alerts.push(lang === 'zh' ? `[DANGER] 体温降至 ${next.bodyTemp.toFixed(1)}℃，出现失温，立即保暖/扎营。` : `[DANGER] Body temp dropped to ${next.bodyTemp.toFixed(1)}°C. Hypothermia detected, warm up or camp now.`);
      if (cond === '脱水') alerts.push(lang === 'zh' ? `[DANGER] 水分仅剩 ${next.hydration.toFixed(1)}%，出现脱水，立刻补水。` : `[DANGER] Hydration at ${next.hydration.toFixed(1)}%. Dehydration detected, rehydrate now.`);
      if (cond === '外伤') alerts.push(lang === 'zh' ? `[DANGER] 遭受外伤，健康会持续下降，尽快处理伤口。` : `[DANGER] Injury sustained, health will keep dropping. Treat the wound ASAP.`);
      if (cond === '高反') alerts.push(lang === 'zh' ? `[DANGER] 出现高反症状，放慢速度或使用氧气瓶。` : `[DANGER] Altitude sickness detected. Slow down or use oxygen.`);
    });

    if (prev.health > 20 && next.health <= 20) alerts.push(lang === 'zh' ? `[DANGER] 生命值跌至 ${next.health.toFixed(1)}，注意保命操作。` : `[DANGER] Health dropped to ${next.health.toFixed(1)}. Focus on survival actions.`);

    return alerts;
  }, []);

  const addLog = useCallback((msg: string) => {
    setGameState(p => {
      const newLog = [...p.log, msg];
      if (newLog.length > LOG_LIMIT) newLog.shift();
      return { ...p, log: newLog };
    });
  }, []);

  const handleRouteChoice = async (option: RouteOption) => {
    if (gameState.phase !== 'hiking') return;
    if (gameState.isCamping) {
      addLog(`[SYSTEM] 你需要先打包帐篷才能继续前进。点击下方的"收起"按钮。`);
      return;
    }
    let newProgress = gameState.progress + 1;
    let nextLandmarkIndex = gameState.currentLandmarkIndex;
    let isReachedFinalLandmark = false;
    
    if (newProgress >= 3) {
      newProgress = 0;
      nextLandmarkIndex = Math.min(LANDMARKS.length - 1, gameState.currentLandmarkIndex + 1);
      // 判断是否到达终点（已推进到最后一个地标）
      isReachedFinalLandmark = nextLandmarkIndex === LANDMARKS.length - 1;
    }

    const altitudeWeight = LANDMARKS[nextLandmarkIndex].elevation > 3000 ? 0.75 : 0.25;
    const weathers = Object.values(WeatherType);
    const nextWeather = Math.random() < altitudeWeight ? weathers[Math.floor(Math.random() * 3 + 2)] : weathers[Math.floor(Math.random() * 2)];
    
    let newConditions = [...gameState.status.conditions];
    let healthPenalty = 0;
    const risk = (isNight && !hasItem('g4')) ? option.risk * 2.5 : option.risk;
    
    if (Math.random() < risk) {
      if (!newConditions.includes('外伤')) newConditions.push('外伤');
      healthPenalty = 8 + (risk * 15);
    }

    const nextStatus = updateStatus({ ...gameState.status, conditions: newConditions }, gameState.weather, option.timeCost, 'active');
    nextStatus.health -= healthPenalty;
    const alerts = createStatusAlerts(gameState.status, nextStatus, gameState.language);
    alerts.forEach(alert => addLog(alert));
    const gameOver = checkGameOver(nextStatus, gameState.status);

    // 先判断是否死亡，再判断是否通关
    if (gameOver.isOver) {
      const deathChain = gameOver.cause ? [{ zh: gameOver.cause, en: gameOver.cause }] : [];
      const gs = { ...gameState, phase: 'gameover', status: nextStatus, currentLandmarkIndex: nextLandmarkIndex, progress: newProgress, gameMessage: { zh: gameOver.message, en: gameOver.message }, deathCauseChain: deathChain };
      setGameState({ ...gs, achievements: settleAchievements(gs as GameState) } as GameState);
    } else if (isReachedFinalLandmark) {
      // 到达最后一个地标（厚畛子）则游戏胜利
      const gs = { ...gameState, phase: 'gameover', status: nextStatus, currentLandmarkIndex: nextLandmarkIndex, progress: newProgress, gameMessage: { zh: "厚畛子镇的灯火映照在你颤抖的眼眸。你活着从鳌太线走了出来。\n\n秦岭圣山饶恕了你的渺小。但那些再也无法归家的灵魂，永远凝结在3767米的拔仙台。\n\n⛩️ 【圣山之誓】本游戏仅为虚构修行，真实鳌太穿越千倍死寂。2012-2024年58个灵魂永眠于此——他们都曾认为自己能活着回家。秦岭圣山已于2018年下达禁令，但每年仍有挑战者在风雪中消亡。每一具遗骸都在诉说：自然绝不留情。勿以身试法。勿让亲人哭泣。", en: "THE LIGHTS OF HOUZHENZI SHIMMER THROUGH YOUR TEARS. YOU ESCAPED THE AOTAI ALIVE.\n\nThe Sacred Mountain showed mercy to your insignificance. But 58 souls rest eternally at 3767m Baxiantai—all believed they would return.\n\n⛩️ 【OATH TO THE SACRED MOUNTAIN】This is fictional training only. The real Aotai Trail has slaughtered thousands. Between 2012-2024, 58 bodies were recovered—each belonged to someone who thought they would go home. The Sacred Mountain issued a ban in 2018. Yet every year more challengers freeze in the snow. Every skeleton screams the same truth: Nature shows ZERO mercy. Do not test fate. Do not break your family's hearts." } };
      setGameState({ ...gs, achievements: settleAchievements(gs as GameState) } as GameState);
    } else {
      // 检查是否到达新地标
      const shouldAddStory = nextLandmarkIndex !== gameState.currentLandmarkIndex;
      const isStillSameLandmark = nextLandmarkIndex === gameState.currentLandmarkIndex && newProgress > 0;
      
      // 生成AI叙事（仅当到达新地标时）
      if (shouldAddStory) {
        generateNarrative({ ...gameState, status: nextStatus, weather: nextWeather }, LANDMARKS[nextLandmarkIndex], option.label[gameState.language])
          .then(narrative => addLog(`[D${gameState.day}] ${narrative}`));
      }
      
      setGameState(p => {
          const newDay = p.day + Math.floor((p.time + option.timeCost) / 24);
          if (isNight && !hasItem('g4')) addLog(`[DANGER] ${t.noHeadlamp}`);
          
          const newState = {
            ...p,
            currentLandmarkIndex: nextLandmarkIndex,
            progress: newProgress,
            weather: nextWeather,
            time: (p.time + option.timeCost) % 24,
            day: newDay,
            status: nextStatus,
            achievements: settleAchievements({ ...p, status: nextStatus, day: newDay } as GameState)
          };
          
          // 到达新地标时添加地标故事
          if (shouldAddStory) {
            const landmarkStory = triggerLandmarkStory(nextLandmarkIndex);
            if (landmarkStory) {
              setTimeout(() => addLog(landmarkStory), 1200);
            }
          }
          
          // 在同一地标推进时输出进度提示（仅首次）
          if (isStillSameLandmark && newProgress === 1) {
            setTimeout(() => addLog(`[SYSTEM] ${gameState.language === 'zh' ? `开始推进路段，到达 3/3 将抵达下一地标。` : `Started segment progress. Reach 3/3 to move to next landmark.`}`), 100);
          } else if (isStillSameLandmark) {
            setTimeout(() => addLog(`[SYSTEM] ${gameState.language === 'zh' ? `已推进 ${newProgress}/3` : `Progress ${newProgress}/3`}`), 100);
          }
          
          return newState;
      });
      // 仅在未死亡且未完成游戏的情况下触发随机事件
      if (Math.random() < 0.25) {
        const selectedEvent = selectWeightedEvent();
        setCurrentEvent(selectedEvent);
        setGameState(q => ({ ...q, triggeredEvents: [...q.triggeredEvents, selectedEvent.id] }));
      }
    }
  };

  const handleEventChoice = (choice: EventChoice) => {
    let alerts: string[] = [];
    setGameState(p => {
      let newInventory = [...p.inventory];
      
      // 二次验证并消耗所需物资
      if (choice.requiredItems) {
        // 先验证是否所有物资都足够
        const canConsume = choice.requiredItems.every(required => {
          const item = newInventory.find(i => i.id === required.itemId);
          return item && item.quantity >= required.quantity;
        });
        
        if (!canConsume) {
          // 理论上不应该到这里，因为EventDialog已经验证过
          console.error('物资验证失败，但选择已通过UI验证');
          return p; // 不执行任何操作
        }
        
        // 消耗物资
        choice.requiredItems.forEach(required => {
          const item = newInventory.find(i => i.id === required.itemId);
          if (item) {
            item.quantity -= required.quantity;
            // 记录物资消耗日志
            const itemName = item.name[p.language];
            addLog(`[SYSTEM] 消耗了 ${itemName} x${required.quantity}`);
            
            // 如果数量为0，移除该物品
            if (item.quantity === 0) {
              newInventory = newInventory.filter(i => i.id !== required.itemId);
            }
          }
        });
      }
      
      // 获得奖励物资
      if (choice.rewardItems) {
        choice.rewardItems.forEach(reward => {
          const base = SHOP_ITEMS.find(i => i.id === reward.itemId);
          if (base) {
            const existing = newInventory.find(i => i.id === reward.itemId);
            if (existing) {
              existing.quantity += reward.quantity;
            } else {
              newInventory.push({ ...base, quantity: reward.quantity });
            }
            // 记录获得物资日志
            const itemName = base.name[p.language];
            addLog(`[SYSTEM] 获得了 ${itemName} x${reward.quantity}`);
          }
        });
      }

      let newConditions = [...p.status.conditions];
      if (choice.conditionAdded && !newConditions.includes(choice.conditionAdded)) newConditions.push(choice.conditionAdded);
      if (choice.conditionRemoved) newConditions = newConditions.filter(c => c !== choice.conditionRemoved);

      const nextStatus = {
        ...p.status,
        health: Math.max(0, Math.min(100, p.status.health + choice.healthImpact)),
        stamina: Math.max(0, Math.min(100, p.status.stamina + choice.staminaImpact)),
        bodyTemp: choice.bodyTempImpact ? Math.max(34.0, Math.min(37.2, p.status.bodyTemp + choice.bodyTempImpact)) : p.status.bodyTemp,
        hydration: choice.hydrationImpact ? Math.max(0, Math.min(100, p.status.hydration + choice.hydrationImpact)) : p.status.hydration,
        energy: choice.energyImpact ? Math.max(0, Math.min(100, p.status.energy + choice.energyImpact)) : p.status.energy,
        conditions: newConditions
      };
      
      // 统一由calculateWeight计算负重
      // 重量将在最终返回时统一更新
      alerts = createStatusAlerts(p.status, nextStatus, p.language);
      const gameOver = checkGameOver(nextStatus, p.status, currentEvent || undefined);

      if (gameOver.isOver) {
        const deathChain = gameOver.cause ? [{ zh: gameOver.cause, en: gameOver.cause }] : [];
        return { ...p, phase: 'gameover', status: nextStatus, gameMessage: { zh: gameOver.message, en: gameOver.message }, deathCauseChain: deathChain };
      }

      const newLogs = [...p.log, `[EVENT] ${choice.log[p.language]}`].slice(-LOG_LIMIT);

      return {
        ...p,
        inventory: newInventory,
        merit: p.merit + choice.meritImpact,
        peopleSaved: p.peopleSaved + (choice.meritImpact >= 100 ? 1 : 0),
        log: newLogs,
        status: { ...nextStatus, weight: calculateWeight(newInventory) },
        achievements: settleAchievements({ ...p, status: nextStatus, merit: p.merit + choice.meritImpact, peopleSaved: p.peopleSaved + (choice.meritImpact >= 100 ? 1 : 0) } as GameState)
      };
    });
    alerts.forEach(alert => addLog(alert));
    setCurrentEvent(null);
  };

  const handleUseItem = (item: InventoryItem) => {
    if (gameState.phase !== 'hiking') return;
    
    // 装备不应该被"使用"，它们购买后自动装备并持续生效
    if (item.isEquippable && !item.isConsumable) {
      addLog(`[SYSTEM] ${item.name[gameState.language]} 已装备，效果持续生效中`);
      return;
    }
    
    setGameState(p => {
      const invItem = p.inventory.find(i => i.id === item.id);
      if (!invItem || invItem.quantity <= 0) return p;
      const newStatus = invItem.effect(p.status);
      const newInventory = p.inventory.map(i => i.id === item.id ? { ...i, quantity: i.isConsumable ? i.quantity - 1 : i.quantity } : i).filter(i => i.quantity > 0);
      
      const newLogs = [...p.log, `[ACTION] 使用了: ${invItem.name[p.language]}`].slice(-LOG_LIMIT);

      return { 
        ...p, 
        status: { ...newStatus, weight: calculateWeight(newInventory) }, 
        inventory: newInventory, 
        log: newLogs 
      };
    });
  };

  const handleCheckIn = () => {
    if (gameState.phase !== 'hiking') return;
    if (gameState.isCamping) {
      addLog(`[SYSTEM] 你需要先打包帐篷才能继续打卡。点击下方的"收起"按钮。`);
      return;
    }
    if (hasCheckedInCurrent) return;
    setGameState(p => {
      const newCheckInCount = p.checkInCount + 1;
      const newCheckedInLandmarks = [...p.checkedInLandmarks, currentLandmark.id];
      const newMerit = p.merit + 5;
      const nextLogs = [...p.log, `[SYSTEM] 已在 ${currentLandmark.name[p.language]} 留下数字足迹。功德+5`].slice(-LOG_LIMIT);
      const nextState = {
        ...p,
        checkInCount: newCheckInCount,
        checkedInLandmarks: newCheckedInLandmarks,
        merit: newMerit,
        log: nextLogs,
      };
      return {
        ...nextState,
        achievements: settleAchievements(nextState as GameState)
      };
    });
  };

  const updateCart = (id: string, delta: number) => {
    setShoppingCart(prev => {
      const packIds = ['pack45','pack65','pack85','pack100'];
      if (packIds.includes(id) && delta > 0) {
        const next = { ...prev };
        packIds.forEach(pack => delete next[pack]);
        next[id] = 1;
        return next;
      }
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) { const { [id]: _, ...rest } = prev; return rest; }
      return { ...prev, [id]: next };
    });
  };

  const handleExplore = () => {
    if (gameState.phase !== 'hiking') return;
    if (gameState.isCamping) {
      addLog(`[SYSTEM] 你需要先打包帐篷才能探索。点击下方的"收起"按钮。`);
      return;
    }
    addLog(`[ACTION] ${t.explore}...`);
    if (Math.random() < 0.3) {
        const selectedEvent = selectWeightedEvent();
        setCurrentEvent(selectedEvent);
        // 记录已触发的事件
        setGameState(p => ({
          ...p,
          triggeredEvents: [...p.triggeredEvents, selectedEvent.id]
        }));
    } else {
      addLog(`[SYSTEM] 这里的乱石堆中除了积雪和枯草，没有任何发现。`);
    }
    const prevStatus = gameState.status;
    const nextStatus = updateStatus(prevStatus, gameState.weather, 1, 'active');
    const alerts = createStatusAlerts(prevStatus, nextStatus, gameState.language);
    alerts.forEach(alert => addLog(alert));
    setGameState(p => ({
      ...p,
      time: (p.time + 1) % 24,
      status: nextStatus
    }));
  };

  const handleAskGuide = async () => {
    if (guideLoading) return;
    setGuideLoading(true);
    try {
      const advice = await getSurvivalAdvice(gameState);
      addLog(`[GUIDE] ${advice}`);
    } catch (err) {
      addLog(`[SYSTEM] 无法获取生存指南。`);
    } finally {
      setGuideLoading(false);
    }
  };

  const handleSleep = () => {
    const hours = 8;
    const prevStatus = gameState.status;
    const nextStatus = updateStatus(prevStatus, gameState.weather, hours, 'sleep');
    const alerts = createStatusAlerts(prevStatus, nextStatus, gameState.language);
    alerts.forEach(alert => addLog(alert));
    const gameOver = checkGameOver(nextStatus, prevStatus);

    if (gameOver.isOver) {
      const deathChain = gameOver.cause ? [{ zh: gameOver.cause, en: gameOver.cause }] : [];
      setGameState(p => ({ ...p, phase: 'gameover', status: nextStatus, gameMessage: { zh: gameOver.message, en: gameOver.message }, deathCauseChain: deathChain }));
    } else {
      setGameState(p => ({
        ...p,
        time: (p.time + hours) % 24,
        day: p.day + Math.floor((p.time + hours) / 24),
        status: nextStatus,
        isCamping: false
      }));
      addLog(`[SYSTEM] 睡眠充足，体能核心恢复。`);
    }
  };

  const handleRest = () => {
    const hours = 2;
    const prevStatus = gameState.status;
    const nextStatus = updateStatus(prevStatus, gameState.weather, hours, 'passive');
    nextStatus.stamina = Math.min(100, nextStatus.stamina + 20);
    const alerts = createStatusAlerts(prevStatus, nextStatus, gameState.language);
    alerts.forEach(alert => addLog(alert));
    const gameOver = checkGameOver(nextStatus, prevStatus);

    if (gameOver.isOver) {
      const deathChain = gameOver.cause ? [{ zh: gameOver.cause, en: gameOver.cause }] : [];
      setGameState(p => ({ ...p, phase: 'gameover', status: nextStatus, gameMessage: { zh: gameOver.message, en: gameOver.message }, deathCauseChain: deathChain }));
    } else {
      setGameState(p => ({
        ...p,
        time: (p.time + hours) % 24,
        day: p.day + Math.floor((p.time + hours) / 24),
        status: nextStatus
      }));
      addLog(`[ACTION] 原地小憩。`);
    }
  };



  const startJourney = () => {
    const entries = Object.entries(shoppingCart) as [string, number][];
    const cost = entries.reduce((acc, [id, q]) => acc + (SHOP_ITEMS.find(i => i.id === id)?.cost || 0) * q, 0);
    
    const items: InventoryItem[] = entries.map(([id, q]) => {
      const base = SHOP_ITEMS.find(i => i.id === id);
      return base ? { ...base, quantity: q } : null;
    }).filter((i): i is InventoryItem => i !== null && i.quantity > 0);

    const packIds=['pack45','pack65','pack85','pack100'];
    const selectedBackpack=items.filter(i=>packIds.includes(i.id)).slice(-1)[0];
    const mergedInventory=gameState.inventory.filter(i=>!selectedBackpack||!packIds.includes(i.id));
    items.filter(i=>!packIds.includes(i.id)||i.id===selectedBackpack?.id).forEach(item=>{const idx=mergedInventory.findIndex(i=>i.id===item.id);if(idx>-1)mergedInventory[idx].quantity+=item.quantity;else mergedInventory.push(item)});
    const backpack=selectedBackpack||mergedInventory.find(i=>packIds.includes(i.id));
    const maxWeight=backpack?({pack45:15,pack65:25,pack85:40,pack100:50} as Record<string,number>)[backpack.id]:(gameState.status.maxWeight||25);
    const weight=calculateWeight(mergedInventory);
    if(cost>gameState.gold||weight>maxWeight)return;

    // 添加背景故事和出发日志
    const storyLogs = [
      `[STORY] ${gameState.language === 'zh' ? '你站在塘口村的入口处，望着巍峨的秦岭山脉。这条鳌太线被誉为“中华龙脊”，同时也是中国最危险的徒步线路之一。' : 'You stand at the entrance of Tangkou Village, gazing at the majestic Qinling Mountains. This Aotai Trail is known as the "Dragon Spine of China" and also one of the most dangerous hiking routes in the country.'}`,
      `[STORY] ${gameState.language === 'zh' ? '无数徒步者曾在这里留下足迹，也有不少人永远留在了这里。你检查了一遍装备，深吸一口气，踏上了这条充满未知的道路。' : 'Countless hikers have left their footprints here, and many have remained forever. You check your equipment, take a deep breath, and step onto this road full of unknowns.'}`,
      `[SYSTEM] ${gameState.language === 'zh' ? '征途开启。秦岭鳌太线：非经允许严禁穿越。' : 'Journey begins. Qinling Aotai Trail: Unauthorized crossing prohibited.'}`
    ];

    // 自动装备可装备的物品
    let autoEquippedInventory = [...mergedInventory];
    let equippedStatus = {...gameState.status};
    
    // 创建一个Set来跟踪已装备的装备槽位，避免重复装备相同槽位的装备
    const equippedSlots = new Set<string>();
    
    // 第一遍：处理已装备的物品，将它们的效果应用到状态中
    for (const item of autoEquippedInventory) {
      if (item.isEquipped && item.effect) {
        equippedStatus = item.effect(equippedStatus);
      }
    }
    
    // 第二遍：自动装备可装备但尚未装备的物品
    autoEquippedInventory = autoEquippedInventory.map(item => {
      if (item.isEquippable && item.quantity > 0 && !item.isEquipped) {
        // 如果该槽位尚未装备，则进行装备
        const slot = item.equipmentSlot || 'other';
        if (!equippedSlots.has(slot)) {
          // 标记为已装备
          const equippedItem = { ...item, isEquipped: true };
          
          // 应用装备效果（仅对一件装备应用效果，因为装备效果不应随数量叠加）
          if (equippedItem.effect) {
            equippedStatus = equippedItem.effect(equippedStatus);
          }
          
          // 标记此槽位已装备
          equippedSlots.add(slot);
          
          return equippedItem;
        }
      }
      return item;
    });

    setGameState(p => ({ 
      ...p, 
      phase: 'hiking',
      sceneMode: 'inn',
      routeIndex: 0,
      ambientTemp: 2,
      weather: WeatherType.OVERCAST,
      time: 8,
      day: 1,
      progress: 0,
      triggeredEvents: [],
      gold: p.gold - cost, 
      inventory: autoEquippedInventory, 
      startWeight: weight, 
      status: { ...equippedStatus, weight, maxWeight }, 
      log: storyLogs
    }));
    setCurrentEvent(null);
    setCurrentEventImage(null);
  };

  const handleSceneEventChoice = (choice: EventChoice) => {
    const eventId = currentEvent?.id;
    handleEventChoice(choice);
    if (eventId) {
      setGameState(p => {
        const triggered = p.triggeredEvents.includes(eventId) ? p.triggeredEvents : [...p.triggeredEvents, eventId];
        const routeIndex = eventId === 'script_injured_boar' ? Math.max(1, p.routeIndex || 0) : (p.routeIndex || 0);
        return { ...p, triggeredEvents: triggered, routeIndex, currentLandmarkIndex: eventId === 'script_injured_boar' ? 1 : p.currentLandmarkIndex };
      });
    }
    setCurrentEventImage(null);
  };

  const handleSceneAdvance = () => {
    if (gameState.sceneMode === 'inn') {
      setGameState(p => ({ ...p, sceneMode: 'trail', time: p.time + 0.15, ambientTemp: 3, log: [...p.log, '[SCENE] 离开驴友之家，来到塘口山道。'].slice(-LOG_LIMIT) }));
      return;
    }
    const triggered = gameState.triggeredEvents;
    const nextStatus = updateStatus(gameState.status, gameState.weather, 0.25, 'active');
    if (!triggered.includes('script_missing_notice')) {
      setCurrentEvent(SCRIPTED_MISSING_EVENT);
      setCurrentEventImage('https://d2oyd22xy9utpf.cloudfront.net/images/events/missing_person.webp');
      setGameState(p => ({ ...p, time: p.time + 0.25, status: { ...nextStatus, weight: calculateWeight(p.inventory) } }));
      return;
    }
    if (!triggered.includes('script_injured_boar')) {
      setCurrentEvent(SCRIPTED_BOAR_EVENT);
      setCurrentEventImage(null);
      setGameState(p => ({ ...p, time: p.time + 0.35, status: { ...nextStatus, weight: calculateWeight(p.inventory) } }));
      return;
    }
    const nextIndex = Math.min(40, (gameState.routeIndex || 0) + 1);
    const nextTimeRaw = gameState.time + 0.35;
    const nextDay = gameState.day + Math.floor(nextTimeRaw / 24);
    const nextTime = nextTimeRaw % 24;
    const weatherOptions = Object.values(WeatherType);
    const nextWeather = Math.random() < 0.18 ? weatherOptions[Math.floor(Math.random() * weatherOptions.length)] : gameState.weather;
    const nextLandmark = Math.min(LANDMARKS.length - 1, Math.floor(nextIndex / 40 * (LANDMARKS.length - 1)));
    setGameState(p => ({
      ...p, routeIndex: nextIndex, currentLandmarkIndex: nextLandmark, time: nextTime, day: nextDay,
      weather: nextWeather, ambientTemp: Math.max(-12, Math.min(12, 4 - Math.floor(nextIndex / 5) + Math.round((Math.random() - 0.5) * 4))),
      status: { ...nextStatus, weight: calculateWeight(p.inventory) },
      phase: nextIndex >= 40 ? 'gameover' : p.phase,
      gameMessage: nextIndex >= 40 ? { zh: '你终于抵达南塬村。山路在身后渐渐隐入雾中，你带着疲惫与记忆，平安走出了这段旅程。', en: 'You reach Nanyuan Village and make it safely through the journey.' } : p.gameMessage
    }));
    if (nextIndex < 40 && Math.random() < 0.28) {
      const event = selectWeightedEvent();
      setCurrentEvent(event);
      setCurrentEventImage(null);
      setGameState(p => ({ ...p, triggeredEvents: p.triggeredEvents.includes(event.id) ? p.triggeredEvents : [...p.triggeredEvents, event.id] }));
    }
  };

  const handleQuickAction = (action: 'exercise' | 'search' | 'rest') => {
    const hours = action === 'exercise' ? 0.12 : action === 'search' ? 0.18 : 0.3;
    const mode = action === 'rest' ? 'passive' : 'active';
    const next = updateStatus(gameState.status, gameState.weather, hours, mode);
    if (action === 'exercise') next.bodyTemp = Math.min(37.2, next.bodyTemp + 0.15);
    if (action === 'rest') { next.stamina = Math.min(100, next.stamina + 12); next.health = Math.min(100, next.health + 2); }
    const raw = gameState.time + hours;
    setGameState(p => ({ ...p, time: raw % 24, day: p.day + Math.floor(raw / 24), status: { ...next, weight: calculateWeight(p.inventory) }, log: [...p.log, action === 'exercise' ? '[ACTION] 原地活动，尝试保持体温。' : action === 'search' ? '[ACTION] 搜寻附近的物资。' : '[ACTION] 原地休息，恢复体能。'].slice(-LOG_LIMIT) }));
    if (action === 'search') { setCurrentEvent(SEARCH_ROOTS_EVENT); setCurrentEventImage(null); }
  };

  const triggerLandmarkStory = useCallback((landmarkIndex: number) => {
    const landmark = LANDMARKS[landmarkIndex];
    const landmarkStories = {
       0: `[STORY] ${gameState.language === 'zh' ? '塘口村是鳌太线的传统起点，许多徒步者在这里做最后的补给和准备。村里的老人常说："鳌太无情，山神不留任性之人"。' : 'Tangkou Village is the traditional starting point of the Aotai Trail, where many hikers make their final preparations. The elderly villagers often say: "Aotai has no mercy, the mountain god does not spare the reckless."'}`,
       1: `[STORY] ${gameState.language === 'zh' ? '海拔2800米的高度标志着你正式进入了秦岭腹地。这里的空气开始变得稀薄，原始森林展现出原始而神秘的面貌。' : 'At 2800 meters elevation, you officially enter the heart of the Qinling Mountains. The air begins to thin, and the primeval forest reveals its primitive and mysterious appearance.'}`,
       2: `[STORY] ${gameState.language === 'zh' ? '盆景园以其独特的高山灌丛景观闻名，这里的植物因长期受风雪侵蚀而形成奇特的造型，宛如天然盆景。' : 'Sobing Garden is famous for its unique alpine shrub landscape. The plants here have formed peculiar shapes due to long-term erosion by wind and snow, resembling natural bonsai.'}`,
       3: `[STORY] ${gameState.language === 'zh' ? '荞麦梁因其形状酷似荞麦而得名，这里是整个鳌太线上最为险峻的地段之一，稍有不慎就可能坠入万丈深渊。' : 'Buckwheat Ridge got its name from its resemblance to buckwheat. This is one of the most dangerous sections of the entire Aotai Trail, where a slight misstep could lead to a fatal fall.'}`,
       4: `[STORY] ${gameState.language === 'zh' ? '跑马梁是一片广阔的高山草甸，相传古时候有军队在此训练战马。开阔的地势让人一览众山小，但也意味着暴露在恶劣天气中无处可藏。' : 'Paoma Ridge is a vast alpine meadow, said to have been used in ancient times to train war horses. The open terrain offers panoramic views, but also means exposure to harsh weather with nowhere to hide.'}`,
       5: `[STORY] ${gameState.language === 'zh' ? '拔仙台海拔3767米，是秦岭的最高峰。站在这里，仿佛伸手即可触及天际。但高海拔带来的缺氧和严寒也让这里成为徒步者的终极考验。' : 'Baxiantai stands at 3767 meters, the highest peak of the Qinling Mountains. Standing here, it feels like you can reach the sky. But the oxygen deprivation and severe cold brought by high altitude make this the ultimate test for hikers.'}`,
       6: `[STORY] ${gameState.language === 'zh' ? '厚畛子镇标志着鳌太线的终点。无数徒步者带着疲惫的身躯和满载回忆的心灵抵达这里，完成了人生中最难忘的旅程之一。' : 'Houzhenzi Town marks the end of the Aotai Trail. Countless hikers arrive here with exhausted bodies and hearts full of memories, completing one of the most unforgettable journeys of their lives.'}`
     };
    
    return landmarkStories[landmarkIndex as keyof typeof landmarkStories] || '';
  }, [gameState.language]);

  const resetToHome = () => {
    setGameState(p => ({ ...INITIAL_GAME_STATE, achievements: p.achievements }));
    setShoppingCart({ pack65: 1 });
    setCurrentEvent(null);
    setCurrentEventImage(null);
  };

  if (gameState.phase === 'intro') return <IntroSequence onComplete={() => setGameState(p => ({ ...p, phase: 'hiking' }))} />;

  if (gameState.phase === 'landing') {
    return (
      <>
        <QuizModal
          show={showQuiz}
          showResult={showQuizResult}
          questions={QUIZ_QUESTIONS}
          currentIndex={currentQuizIndex}
          answers={quizAnswers}
          language={gameState.language}
          onClose={handleCloseQuiz}
          onAnswer={handleAnswer}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onSubmit={handleSubmit}
          onResultClose={handleCloseQuiz}
        />
        <AchievementModal
          show={showAchievements}
          achievements={gameState.achievements}
          language={gameState.language}
          t={t}
          onClose={() => setShowAchievements(false)}
        />
        <LandingPage
          gameState={gameState}
          showAchievements={showAchievements}
          showQuiz={showQuiz}
          t={t}
          onSeasonChange={(season) => setGameState(p => ({ ...p, season }))}
          onStartShopping={() => setGameState(p => ({ ...p, phase: 'startpoint' }))}
          onContinue={() => setGameState(p => ({ ...p, phase: 'hiking' }))}
          onShowAchievements={setShowAchievements}
          onShowQuiz={handleStartQuiz}
          translations={translations}
        />
      </>
    );
  }

  if (gameState.phase === 'startpoint') {
    return <StartPointModal onCancel={() => setGameState(p => ({ ...p, phase: 'landing' }))} onConfirm={() => setGameState(p => ({ ...p, phase: 'story' }))} />;
  }
  if (gameState.phase === 'story' || gameState.phase === 'intro') {
    return <StoryScreen onBack={() => setGameState(p => ({ ...p, phase: 'startpoint' }))} onContinue={() => setGameState(p => ({ ...p, phase: 'shopping' }))} />;
  }
  if (gameState.phase === 'shopping') {
    return <OfficialShop gameState={gameState} cart={shoppingCart} category={activeShopCategory} onCategory={setActiveShopCategory} onCart={updateCart} onStart={startJourney} onBack={() => setGameState(p => ({ ...p, phase: 'story' }))} />;
  }
  if (gameState.phase === 'gameover') {
    return <GameOverModal gameState={gameState} t={t} landmarks={LANDMARKS} onResetToHome={resetToHome} />;
  }
  if (gameState.phase === 'hiking') {
    return <OfficialGameplay gameState={gameState} sceneMode={gameState.sceneMode || 'inn'} currentEvent={currentEvent} eventImage={currentEventImage} onEventChoice={handleSceneEventChoice} onAdvance={handleSceneAdvance} onQuickAction={handleQuickAction} onUseItem={handleUseItem} onAbandon={resetToHome} onReturnHome={() => setGameState(p => ({ ...p, phase: 'landing' }))} />;
  }

};

export default App;
