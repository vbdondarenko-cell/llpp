// InterestCard Component - Premium Reusable Component
export interface Interest {
  id: string;
  name: string;
  icon?: string | null;
  color?: string;
}

export interface InterestCardProps {
  interest: Interest;
  isSelected: boolean;
  animationDelay?: number;
}

export interface InterestGridProps {
  interests: Interest[];
  selectedIds: string[];
  onToggle: (interest: Interest) => void;
  maxSelectable?: number;
}

const INTEREST_ICONS: Record<string, string> = {
  default: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>`,
  food: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>`,
  coffee: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" x2="6" y1="2" y2="4"/><line x1="10" x2="10" y1="2" y2="4"/><line x1="14" x2="14" y1="2" y2="4"/></svg>`,
  music: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
  movies: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="20" x="2" y="2" rx="2.18" ry="2.18"/><line x1="7" x2="7" y1="2" y2="22"/><line x1="17" x2="17" y1="2" y2="22"/><line x1="2" x2="22" y1="12" y2="12"/></svg>`,
  concerts: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v9H4V10Z"/><path d="M8 10v4a4 4 0 0 0 4 4h0a4 4 0 0 0 4-4v-4"/><line x1="12" x2="12" y1="10" y2="19"/><line x1="8" x2="16" y1="19" y2="19"/></svg>`,
  nightlife: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`,
  art: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z"/></svg>`,
  gaming: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="6" x2="10" y1="12" y2="12"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="15" x2="15.01" y1="13" y2="13"/><line x1="18" x2="18.01" y1="11" y2="11"/><rect width="20" height="12" x="2" y="6" rx="2"/></svg>`,
  books: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>`,
  sports: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`,
  fitness: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.4 14.4 9.6 9.6"/><path d="M18.657 21.485a2 2 0 1 1-2.829-2.828l-1.767 1.768a2 2 0 1 1-2.829-2.829l6.364-6.364a2 2 0 1 1 2.829 2.829l-1.768 1.767a2 2 0 1 1 2.828 2.829z"/><path d="m21.5 21.5-1.4-1.4"/><path d="M3.9 3.9 2.5 2.5"/></svg>`,
  nature: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>`,
  travel: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.4-.1.9.3 1.1l4.4 3.1L5 16l-2 5 5-1.5 3.1 4.4c.2.4.7.5 1.1.3l.5-.3c.4-.2.6-.6.5-1.1Z"/></svg>`,
  photography: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>`,
  technology: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="8" x="5" y="2" rx="2"/><rect width="20" height="8" x="2" y="14" rx="2"/><path d="M6 18h2"/><path d="M12 18h6"/></svg>`,
};

export function getInterestIcon(name: string): string {
  const normalized = name.toLowerCase().trim();
  const directMap: Record<string, string> = {
    'food': INTEREST_ICONS.food, 'їжа': INTEREST_ICONS.food,
    'coffee': INTEREST_ICONS.coffee, 'кава': INTEREST_ICONS.coffee,
    'music': INTEREST_ICONS.music, 'музика': INTEREST_ICONS.music,
    'movies': INTEREST_ICONS.movies, 'фільми': INTEREST_ICONS.movies,
    'concerts': INTEREST_ICONS.concerts, 'концерти': INTEREST_ICONS.concerts,
    'nightlife': INTEREST_ICONS.nightlife, 'нічне життя': INTEREST_ICONS.nightlife,
    'art': INTEREST_ICONS.art, 'мистецтво': INTEREST_ICONS.art,
    'gaming': INTEREST_ICONS.gaming, 'ігри': INTEREST_ICONS.gaming,
    'books': INTEREST_ICONS.books, 'книги': INTEREST_ICONS.books,
    'sports': INTEREST_ICONS.sports, 'спорт': INTEREST_ICONS.sports,
    'fitness': INTEREST_ICONS.fitness, 'фітнес': INTEREST_ICONS.fitness,
    'nature': INTEREST_ICONS.nature, 'природа': INTEREST_ICONS.nature,
    'travel': INTEREST_ICONS.travel, 'подорожі': INTEREST_ICONS.travel,
    'photography': INTEREST_ICONS.photography, 'фотографія': INTEREST_ICONS.photography,
    'technology': INTEREST_ICONS.technology, 'технології': INTEREST_ICONS.technology,
  };
  return directMap[normalized] || INTEREST_ICONS.default;
}

export function createInterestCard(props: InterestCardProps): string {
  const { interest, isSelected, animationDelay = 0 } = props;
  const iconSvg = getInterestIcon(interest.name);
  return `<button class="interest-card ${isSelected ? 'selected' : ''}" data-id="${interest.id}" style="animation-delay: ${animationDelay}ms"><div class="card-glow"></div><div class="card-content"><div class="card-icon">${iconSvg}</div><span class="card-label">${interest.name}</span></div><div class="card-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div></button>`;
}

export function createInterestGrid(props: InterestGridProps): string {
  const { interests, selectedIds } = props;
  return `<div class="interest-grid-container"><div class="interest-grid">${interests.map((interest, index) => {
    const isSelected = selectedIds.includes(interest.id);
    return createInterestCard({ interest, isSelected, animationDelay: index * 30 });
  }).join('')}</div></div>`;
}

export function injectInterestCardStyles(): void {
  if (document.getElementById('interest-card-styles')) return;
  const style = document.createElement('style');
  style.id = 'interest-card-styles';
  style.textContent = `
    .interest-grid-container { width: 100%; height: 100%; display: flex; flex-direction: column; overflow: hidden; }
    .interest-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; padding: 0; overflow-y: auto; overflow-x: hidden; -webkit-overflow-scrolling: touch; scrollbar-width: none; flex: 1; align-content: start; }
    .interest-grid::-webkit-scrollbar { display: none; }
    @media (max-width: 360px) { .interest-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; } }
    @media (min-width: 400px) { .interest-grid { grid-template-columns: repeat(4, 1fr); } }
    @media (min-width: 500px) { .interest-grid { grid-template-columns: repeat(5, 1fr); } }
    .interest-card { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 16px 8px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 18px; cursor: pointer; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); overflow: hidden; backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); animation: cardFadeIn 0.4s ease backwards; -webkit-tap-highlight-color: transparent; }
    @keyframes cardFadeIn { from { opacity: 0; transform: translateY(15px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
    .interest-card::before { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(91, 92, 255, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%); opacity: 0; transition: opacity 0.25s ease; border-radius: 18px; }
    .interest-card:hover { background: rgba(255, 255, 255, 0.08); border-color: rgba(91, 92, 255, 0.3); transform: translateY(-2px); }
    .interest-card:hover::before { opacity: 1; }
    .interest-card:active { transform: scale(0.97); transition: transform 0.1s ease; }
    .interest-card.selected { background: linear-gradient(135deg, #5B5CFF 0%, #A855F7 100%); border-color: transparent; box-shadow: 0 8px 32px rgba(91, 92, 255, 0.35); transform: scale(1.02); }
    .interest-card.selected::before { opacity: 1; background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%); }
    .interest-card.selected:hover { transform: scale(1.04); box-shadow: 0 12px 40px rgba(91, 92, 255, 0.45); }
    .interest-card.selected:active { transform: scale(0.98); }
    .card-glow { position: absolute; inset: -1px; background: linear-gradient(135deg, #5B5CFF 0%, #A855F7 100%); opacity: 0; filter: blur(15px); transition: opacity 0.3s ease; z-index: -1; border-radius: 18px; }
    .interest-card.selected .card-glow { opacity: 0.4; animation: glowPulse 2s ease-in-out infinite; }
    @keyframes glowPulse { 0%, 100% { opacity: 0.3; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.05); } }
    .card-content { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; position: relative; z-index: 1; }
    .card-icon { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; color: rgba(255, 255, 255, 0.7); transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); }
    .card-icon svg { width: 100%; height: 100%; }
    .interest-card.selected .card-icon { color: white; transform: scale(1.1); filter: drop-shadow(0 2px 8px rgba(255, 255, 255, 0.3)); }
    .card-label { font-size: 11px; font-weight: 600; color: rgba(255, 255, 255, 0.6); text-align: center; line-height: 1.2; transition: all 0.25s ease; letter-spacing: 0.2px; }
    .interest-card.selected .card-label { color: rgba(255, 255, 255, 0.95); }
    .card-check { position: absolute; top: 6px; right: 6px; width: 20px; height: 20px; border-radius: 50%; background: rgba(255, 255, 255, 0.2); display: flex; align-items: center; justify-content: center; opacity: 0; transform: scale(0) rotate(-90deg); transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
    .card-check svg { width: 12px; height: 12px; stroke: white; stroke-width: 2.5; }
    .interest-card.selected .card-check { opacity: 1; transform: scale(1) rotate(0deg); background: rgba(255, 255, 255, 0.3); box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2); }
    .interest-card::after { content: ''; position: absolute; inset: 0; border-radius: 18px; background: radial-gradient(circle at center, rgba(91, 92, 255, 0.4) 0%, transparent 70%); opacity: 0; transform: scale(0); transition: all 0.4s ease; }
    .interest-card.selected::after { animation: rippleEffect 0.6s ease-out; }
    @keyframes rippleEffect { 0% { opacity: 0.6; transform: scale(0); } 100% { opacity: 0; transform: scale(2); } }
    .interest-card.spring { animation: springBounce 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
    @keyframes springBounce { 0% { transform: scale(1); } 40% { transform: scale(1.08); } 70% { transform: scale(0.97); } 100% { transform: scale(1.02); } }
    .interest-premium-footer { padding: 16px 20px; padding-bottom: calc(16px + var(--safe-area-bottom)); background: linear-gradient(to top, var(--bg-primary) 80%, transparent); border-top: 1px solid rgba(255, 255, 255, 0.05); }
    .interest-counter-premium { display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 12px; font-size: 14px; font-weight: 500; color: rgba(255, 255, 255, 0.6); }
    .counter-number-premium { font-size: 18px; font-weight: 700; color: var(--text-primary); min-width: 24px; text-align: center; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
    .counter-number-premium.ready { color: #22c55e; }
    .counter-number-premium.animate { animation: counterBounce 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
    @keyframes counterBounce { 0% { transform: scale(1); } 50% { transform: scale(1.4); } 100% { transform: scale(1); } }
    .counter-total-premium { font-weight: 600; color: var(--text-tertiary); }
    .counter-label-premium { color: var(--text-tertiary); }
    .counter-label-premium.ready { color: #22c55e; }
    .premium-btn-final { width: 100%; position: relative; overflow: hidden; padding: 16px 32px; border-radius: 14px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); -webkit-tap-highlight-color: transparent; }
    .premium-btn-final:disabled { background: rgba(255, 255, 255, 0.05); border: 1.5px solid rgba(255, 255, 255, 0.08); color: rgba(255, 255, 255, 0.3); cursor: not-allowed; box-shadow: none; }
    .premium-btn-final:not(:disabled) { background: linear-gradient(135deg, #5B5CFF 0%, #A855F7 100%); border: none; color: white; box-shadow: 0 8px 32px rgba(91, 92, 255, 0.4); }
    .premium-btn-final:not(:disabled):active { transform: scale(0.98); box-shadow: 0 4px 20px rgba(91, 92, 255, 0.3); }
    .premium-btn-final.ready { animation: btnReadyPulse 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }
    @keyframes btnReadyPulse { 0% { transform: scale(1); } 50% { transform: scale(1.03); box-shadow: 0 12px 40px rgba(91, 92, 255, 0.5); } 100% { transform: scale(1); } }
    .btn-shimmer { position: absolute; inset: 0; background: linear-gradient(110deg, transparent 20%, rgba(255, 255, 255, 0.3) 50%, transparent 80%); opacity: 0; transform: translateX(-100%); transition: opacity 0.3s ease; }
    .premium-btn-final:not(:disabled) .btn-shimmer { opacity: 1; animation: shimmerEffect 2s infinite; }
    @keyframes shimmerEffect { 0% { transform: translateX(-100%); } 50%, 100% { transform: translateX(100%); } }
    .btn-text-container { position: relative; z-index: 1; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .btn-helper { font-size: 12px; font-weight: 500; opacity: 0.7; }
    .btn-ready-text { display: none; }
    .premium-btn-final:not(:disabled) .btn-helper { display: none; }
    .premium-btn-final:not(:disabled) .btn-ready-text { display: inline; }
  `;
  document.head.appendChild(style);
}

export function cleanupInterestCard(): void {
  const style = document.getElementById('interest-card-styles');
  if (style) style.remove();
}
