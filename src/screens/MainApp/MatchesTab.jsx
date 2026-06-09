import { useMemo, useState } from 'react';
import { Heart, Users, Bookmark, SlidersHorizontal } from 'lucide-react';
import { C } from '../../theme';
import { SAMPLE_MOMS } from '../../data/moms';
import { SUGGESTED_EVENTS as EVENTS_FALLBACK } from '../../data/events';
import { MatchCardFull } from '../../components/MatchCardFull';
import { GroupCardFull } from '../../components/GroupCardFull';
import { MeetupsFilterSheet, MEETUPS_FILTER_DEFAULT } from '../../sheets/MeetupsFilterSheet';
import { MomCategoryFilterSheet } from '../../sheets/MomCategoryFilterSheet';
import { GroupsFilterSheet } from '../../sheets/GroupsFilterSheet';

// ──────────────────────────────────────────────────────────────────────────
// 1:1 matches — 4 category chips that each open their own mini-sheet.
// Edits the same unified filter state that the advanced sheet also edits,
// so a selection here syncs back into the full sheet.
// ──────────────────────────────────────────────────────────────────────────
const MOM_CATEGORIES = [
  { id: 'momType',   label: 'Mom type'  },
  { id: 'kidAge',    label: 'Kid age'   },
  { id: 'interests', label: 'Interests' },
  { id: 'calendar',  label: 'Calendar'  },
];

// Quick filters for the Groups view — multi-toggle, scrollable.
// "This week" is a no-op for the prototype (all SUGGESTED_EVENTS are
// weekly recurring within the active week) — kept visible so the
// affordance is obvious.
const GROUP_QUICK = [
  { id: 'week',    label: 'This week'    },
  { id: 'weekend', label: 'This weekend' },
  { id: 'indoor',  label: 'Indoor'       },
  { id: 'outdoor', label: 'Outdoor'      },
  { id: 'near5',   label: '< 5 mi'       },
  { id: 'free',    label: 'Free'         },
];

const WEEKEND_DAYS = new Set(['Sat', 'Sun']);

const eventIsFree = (e) => (e.tags || []).some(t => /free/i.test(t));

// Map age-bucket strings (the user picks from these) onto the years that
// appear in a mom's `kids` string. Loose-match — buckets overlap.
const BUCKET_TO_YEARS = {
  '0–1':   [0, 1],
  '1–3':   [1, 2, 3],
  '3–5':   [3, 4, 5],
  '5–8':   [5, 6, 7, 8],
  '8–12':  [8, 9, 10, 11, 12],
  '12–18': [12, 13, 14, 15, 16, 17, 18],
  '13+':   [13, 14, 15, 16, 17, 18],
};

const momKidYears = (kidsStr = '') => {
  const out = [];
  const re = /(\d+)\s*y/gi;
  let m;
  while ((m = re.exec(kidsStr)) !== null) out.push(Number(m[1]));
  if (/(\d+)\s*m/i.test(kidsStr)) {
    const months = Number(/(\d+)\s*m/i.exec(kidsStr)[1]);
    out.push(months >= 12 ? 1 : 0);
  }
  return out;
};

const overlapsAgeBuckets = (mom, ageBuckets) => {
  if (!ageBuckets.length) return true;
  const momYears = momKidYears(mom.kids);
  return ageBuckets.some(bucket => {
    const years = BUCKET_TO_YEARS[bucket] || [];
    return years.some(y => momYears.includes(y));
  });
};

const EMPTY_GROUP_FILTERS = {
  days: [], times: [], kidAges: [], sizes: [], venues: [], costs: [],
  distance: null, strollerOk: false, recurringOnly: false,
};

// Count of selections inside one category — drives the inline "· N" hint
// on each category chip.
const categoryCount = (filters, kind) => {
  if (kind === 'momType')   return filters.momTypes.length;
  if (kind === 'kidAge')    return filters.kidAges.length;
  if (kind === 'interests') return filters.interests.length;
  if (kind === 'calendar')  return (filters.calSameAsMe ? 1 : 0) + filters.calDays.length + filters.calTimes.length;
  return 0;
};

// Total of advanced-sheet-only filters (distance, verified, values). Used
// for the badge on the advanced filter icon button — so it shows _extra_
// active filters beyond the 4 category chips.
const advancedExtraCount = (f) =>
  (f.distance != null ? 1 : 0) + (f.verifiedOnly ? 1 : 0) + f.values.length;

const groupAdvancedCount = (f) =>
  f.days.length + f.times.length + f.kidAges.length + f.sizes.length +
  f.venues.length + f.costs.length +
  (f.distance != null ? 1 : 0) +
  (f.strollerOk ? 1 : 0) + (f.recurringOnly ? 1 : 0);

// ──────────────────────────────────────────────────────────────────────────
// Round filter icon button — same pattern as ActivitiesTab.
// ──────────────────────────────────────────────────────────────────────────
const AdvancedFilterBtn = ({ count, onClick, accent = C.navy }) => (
  <button
    onClick={onClick}
    aria-label="Open advanced filters"
    className="relative flex-shrink-0 flex items-center justify-center rounded-full"
    style={{
      width: 34, height: 34,
      background: count > 0 ? accent : C.paper,
      color: count > 0 ? '#fff' : C.navy,
      border: `1px solid ${count > 0 ? accent : C.divider}`,
    }}
  >
    <SlidersHorizontal size={14}/>
    {count > 0 && (
      <span
        className="absolute"
        style={{
          top: -3, right: -3,
          minWidth: 16, height: 16, padding: '0 4px',
          borderRadius: 8,
          background: C.coralDeep, color: '#fff',
          fontFamily: 'Albert Sans', fontWeight: 800, fontSize: 9.5,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `1.5px solid ${C.cream}`,
        }}
      >
        {count > 9 ? '9+' : count}
      </span>
    )}
  </button>
);

export const MatchesTab = ({
  events,
  profile,
  prefs,
  openSchedule,
  openProfile,
  openMessage,
  joinedEvents,
  setJoinedEvents,
  savedItems = [],
  setSavedItems,
  account,
  requestAccount,
  flash,
}) => {
  const SUGGESTED_EVENTS = events || EVENTS_FALLBACK;
  // Hard default — Groups loads first every time the tab is opened.
  const [view, setView] = useState('groups');

  // Unified filter state for 1:1 matches — both category chips and the
  // advanced sheet read/write the same object.
  const [momFilters, setMomFilters] = useState(MEETUPS_FILTER_DEFAULT);
  // Which category mini-sheet is open: 'momType' | 'kidAge' | 'interests' | 'calendar' | null
  const [categorySheet, setCategorySheet] = useState(null);
  const [advSheetOpen, setAdvSheetOpen] = useState(false);

  // Groups view — multi-toggle quick chips + advanced sheet.
  const [groupQuick, setGroupQuick] = useState({});
  const [groupAdvanced, setGroupAdvanced] = useState(EMPTY_GROUP_FILTERS);
  const [groupSheetOpen, setGroupSheetOpen] = useState(false);

  const toggleGroupQuick = (id) => setGroupQuick(q => ({ ...q, [id]: !q[id] }));

  const toggleSave = (id) => {
    setSavedItems?.(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const isSaved = (id) => savedItems.includes(id);

  const userSlots = prefs?.slots || [];
  const userSlotsCount = userSlots.length;

  // ───── Filtering — 1:1 moms
  const filteredMoms = useMemo(() => {
    return SAMPLE_MOMS.filter(m => {
      // Mom type
      if (momFilters.momTypes.length && !momFilters.momTypes.includes(m.type)) return false;
      // Kid age
      if (momFilters.kidAges.length && !overlapsAgeBuckets(m, momFilters.kidAges)) return false;
      // Interests — at least one match
      if (momFilters.interests.length && !(m.interests || []).some(i => momFilters.interests.includes(i))) return false;
      // Values — at least one match
      if (momFilters.values.length && !(m.values || []).some(v => momFilters.values.includes(v))) return false;
      // Calendar — sameAsMe overlaps with user's own freeSlots
      if (momFilters.calSameAsMe) {
        if (userSlots.length && !m.freeSlots.some(s => userSlots.includes(s))) return false;
      }
      // Calendar — explicit days
      if (momFilters.calDays.length && !m.freeSlots.some(s => momFilters.calDays.includes(s.split('-')[0]))) return false;
      // Calendar — explicit times
      if (momFilters.calTimes.length && !m.freeSlots.some(s => {
        const time = s.split('-').slice(1).join('-');
        return momFilters.calTimes.includes(time);
      })) return false;
      // Distance
      if (momFilters.distance != null && parseFloat(m.distance) >= momFilters.distance) return false;
      // Verified
      if (momFilters.verifiedOnly && !m.verified) return false;

      return true;
    });
  }, [momFilters, userSlots]);

  // ───── Filtering — events
  const filteredEvents = useMemo(() => {
    return SUGGESTED_EVENTS.filter(e => {
      // Quick chips (multi-toggle, AND'd).
      if (groupQuick.weekend && !WEEKEND_DAYS.has(e.day)) return false;
      if (groupQuick.indoor  && !e.indoor) return false;
      if (groupQuick.outdoor &&  e.indoor) return false;
      if (groupQuick.near5   && !(e.mi != null && e.mi < 5)) return false;
      if (groupQuick.free    && !eventIsFree(e)) return false;

      // Advanced sheet.
      if (groupAdvanced.days.length && !groupAdvanced.days.includes(e.day)) return false;
      if (groupAdvanced.times.length && !groupAdvanced.times.includes(e.bucket)) return false;
      if (groupAdvanced.kidAges.length && !(e.kidAges || []).some(a => groupAdvanced.kidAges.includes(a))) return false;
      if (groupAdvanced.sizes.length) {
        const g = e.going || 0;
        const bucket = g < 8 ? 'small' : g <= 15 ? 'mid' : 'large';
        if (!groupAdvanced.sizes.includes(bucket)) return false;
      }
      if (groupAdvanced.venues.length) {
        const v = e.indoor ? 'indoor' : 'outdoor';
        if (!groupAdvanced.venues.includes(v)) return false;
      }
      if (groupAdvanced.costs.length) {
        const c = eventIsFree(e) ? 'free' : 'paid';
        if (!groupAdvanced.costs.includes(c)) return false;
      }
      if (groupAdvanced.distance != null && !(e.mi != null && e.mi < groupAdvanced.distance)) return false;
      if (groupAdvanced.strollerOk && !(e.tags || []).some(t => /stroller/i.test(t))) return false;
      if (groupAdvanced.recurringOnly && !e.recurring) return false;

      return true;
    });
  }, [groupQuick, groupAdvanced]);

  const momCount = filteredMoms.length;
  const groupCount = filteredEvents.length;
  const advExtraCount = advancedExtraCount(momFilters);
  const grpAdvCount = groupAdvancedCount(groupAdvanced);

  const handleJoin = (e) => {
    if ((joinedEvents || []).includes(e.id)) return;
    if (!account && requestAccount) {
      requestAccount({ type: 'group', event: e });
      return;
    }
    setJoinedEvents(j => [...j, e.id]);
    flash && flash(`✦ RSVP'd to ${e.name}`);
  };

  // Merge a partial patch into momFilters (used by category sheets).
  const patchMomFilters = (patch) => setMomFilters(p => ({ ...p, ...patch }));

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top toggle — Groups loads first (default) */}
      <div className="px-5 pt-1 pb-2">
        <div className="rounded-full p-1 flex" style={{ background: C.creamSoft, border: `1px solid ${C.divider}` }}>
          <button
            onClick={() => setView('groups')}
            className="flex-1 rounded-full flex items-center justify-center gap-1.5 transition-all"
            style={{
              height: 36,
              background: view === 'groups' ? `linear-gradient(135deg, ${C.sage}, ${C.sageDark})` : 'transparent',
              color: view === 'groups' ? '#fff' : C.inkMuted,
              fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 12.5,
              boxShadow: view === 'groups' ? '0 4px 12px -4px rgba(94,122,59,.45)' : 'none',
            }}
          >
            <Users size={13}/> Group meetups · {groupCount}
          </button>
          <button
            onClick={() => setView('moms')}
            className="flex-1 rounded-full flex items-center justify-center gap-1.5 transition-all"
            style={{
              height: 36,
              background: view === 'moms' ? `linear-gradient(135deg, ${C.coral}, ${C.coralDeep})` : 'transparent',
              color: view === 'moms' ? '#fff' : C.inkMuted,
              fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 12.5,
              boxShadow: view === 'moms' ? '0 4px 12px -4px rgba(214,68,106,.5)' : 'none',
            }}
          >
            <Heart size={13} fill={view === 'moms' ? 'currentColor' : 'none'}/> 1:1 matches · {momCount}
          </button>
        </div>
      </div>

      {/* Filter row */}
      {view === 'moms' ? (
        // 4 category chips that each open their mini-sheet, plus advanced.
        <div className="px-5 pb-2 flex items-center gap-2">
          <div className="flex-1 flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {MOM_CATEGORIES.map(c => {
              const count = categoryCount(momFilters, c.id);
              const active = count > 0;
              return (
                <button
                  key={c.id}
                  onClick={() => setCategorySheet(c.id)}
                  className="flex items-center rounded-full px-3 py-1.5 transition-all flex-shrink-0"
                  style={{
                    background: active ? C.coral : C.paper,
                    color: active ? '#fff' : C.navy,
                    border: `1px solid ${active ? C.coral : C.divider}`,
                    fontFamily: 'Albert Sans', fontSize: 11.5, fontWeight: 600,
                  }}
                >
                  {c.label}
                  {count > 0 && (
                    <span style={{ marginLeft: 6, opacity: 0.9, fontWeight: 700 }}>
                      · {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <AdvancedFilterBtn
            count={advExtraCount}
            onClick={() => setAdvSheetOpen(true)}
            accent={C.coral}
          />
        </div>
      ) : (
        // Groups — Activities-style scrollable chip row + advanced icon.
        <div className="px-5 pb-2 flex items-center gap-2">
          <div className="flex-1 flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {GROUP_QUICK.map(f => {
              const active = !!groupQuick[f.id];
              return (
                <button
                  key={f.id}
                  onClick={() => toggleGroupQuick(f.id)}
                  className="flex items-center rounded-full px-3 py-1.5 transition-all flex-shrink-0"
                  style={{
                    background: active ? C.sageDark : C.paper,
                    color: active ? '#fff' : C.navy,
                    border: `1px solid ${active ? C.sageDark : C.divider}`,
                    fontFamily: 'Albert Sans', fontSize: 11.5, fontWeight: 600,
                  }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
          <AdvancedFilterBtn
            count={grpAdvCount}
            onClick={() => setGroupSheetOpen(true)}
            accent={C.sageDark}
          />
        </div>
      )}

      {/* Deck — vertical scroll-snap */}
      <div className="flex-1 overflow-y-auto" style={{
        scrollSnapType: 'y mandatory',
        scrollbarWidth: 'none',
      }}>
        {view === 'moms' && filteredMoms.length === 0 && <EmptyState/>}
        {view === 'groups' && filteredEvents.length === 0 && <EmptyState/>}

        {view === 'moms' && filteredMoms.map(mom => {
          const cardId = `s${mom.id}`;
          return (
            <div key={`mom-${mom.id}`} className="px-4 pb-3 relative" style={{
              scrollSnapAlign: 'start',
              height: '100%',
            }}>
              <MatchCardFull
                mom={mom}
                profile={profile}
                onSchedule={openSchedule}
                onMessage={openMessage}
                onProfile={openProfile}
              />
              <SaveButton saved={isSaved(cardId)} onClick={() => toggleSave(cardId)}/>
            </div>
          );
        })}

        {view === 'groups' && filteredEvents.map(event => (
          <div key={`event-${event.id}`} className="px-4 pb-3 relative" style={{
            scrollSnapAlign: 'start',
            height: '100%',
          }}>
            <GroupCardFull
              event={event}
              joined={(joinedEvents || []).includes(event.id)}
              onJoin={handleJoin}
              onChat={() => flash && flash('Group chat coming soon')}
              onDetails={() => flash && flash(`${event.name} · details soon`)}
            />
            <SaveButton saved={isSaved(event.id)} onClick={() => toggleSave(event.id)}/>
          </div>
        ))}
      </div>

      {/* Category mini-sheet for 1:1 chips */}
      {categorySheet && (
        <MomCategoryFilterSheet
          kind={categorySheet}
          filters={momFilters}
          userSlotsCount={userSlotsCount}
          onApply={patchMomFilters}
          onClose={() => setCategorySheet(null)}
        />
      )}

      {/* Full advanced sheet for 1:1 */}
      {advSheetOpen && (
        <MeetupsFilterSheet
          filters={momFilters}
          setFilters={setMomFilters}
          userSlotsCount={userSlotsCount}
          onClose={() => setAdvSheetOpen(false)}
        />
      )}

      {/* Advanced sheet for Groups */}
      {groupSheetOpen && (
        <GroupsFilterSheet
          filters={groupAdvanced}
          setFilters={setGroupAdvanced}
          onClose={() => setGroupSheetOpen(false)}
        />
      )}
    </div>
  );
};

// Floating bookmark button positioned over the card's hero image, top-left.
const SaveButton = ({ saved, onClick }) => (
  <button
    onClick={onClick}
    aria-label={saved ? 'Unsave' : 'Save'}
    style={{
      position: 'absolute',
      top: 12, left: 28,
      width: 32, height: 32, borderRadius: 16,
      background: 'rgba(255,255,255,.92)',
      border: 'none', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 4px 10px rgba(27,42,78,.18)',
      zIndex: 5,
    }}
  >
    <Bookmark size={15} color={saved ? C.coralDeep : C.navy} fill={saved ? C.coralDeep : 'none'}/>
  </button>
);

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center px-5" style={{ paddingTop: 80, gap: 8 }}>
    <Users size={32} color={C.line}/>
    <div className="text-[14px]" style={{ fontFamily: 'Albert Sans', fontWeight: 700, color: C.navy }}>
      Nothing matches those filters
    </div>
    <div className="text-[11.5px] text-center" style={{ fontFamily: 'Albert Sans', color: C.muted }}>
      Tap a chip off or open the filter sheet to widen the search.
    </div>
  </div>
);
