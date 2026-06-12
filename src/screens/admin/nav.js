// ============================================================================
// Single source of truth for admin console navigation. The Sidebar renders
// from this; the shell routes from this. To add a section: add an entry here
// and a matching case in the shell's section switch. Order within a group is
// the order shown in the rail.
// ============================================================================
import {
  LayoutDashboard, ListChecks, Users, UserCog, MapPin, Calendar, Star,
  Server, Database, Settings, Rocket, Zap, ShieldCheck,
} from 'lucide-react';

export const NAV_GROUPS = [
  {
    label: 'Insights',
    items: [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Community',
    items: [
      { id: 'onboarding', label: 'Onboarding', icon: ListChecks },
      { id: 'mom-profiles', label: 'Mom profiles', icon: Users },
      { id: 'users', label: 'Users', icon: UserCog },
    ],
  },
  {
    label: 'Content',
    items: [
      { id: 'places', label: 'Places', icon: MapPin },
      { id: 'events', label: 'Events', icon: Calendar },
      { id: 'featured', label: 'Featured', icon: Star },
    ],
  },
  {
    label: 'Pipeline',
    items: [
      { id: 'ingestion', label: 'Ingestion', icon: Server },
      { id: 'sources', label: 'Sources', icon: Database },
    ],
  },
  {
    label: 'System',
    items: [
      { id: 'admins', label: 'Admins', icon: ShieldCheck },
      { id: 'config', label: 'Config', icon: Settings },
      { id: 'deployments', label: 'Deployments', icon: Rocket },
      { id: 'actions', label: 'Quick actions', icon: Zap },
    ],
  },
];

// Flat lookup id → { id, label, icon, group } for headers/breadcrumbs.
export const NAV_INDEX = Object.fromEntries(
  NAV_GROUPS.flatMap((g) => g.items.map((it) => [it.id, { ...it, group: g.label }])),
);

export const ALL_SECTION_IDS = NAV_GROUPS.flatMap((g) => g.items.map((it) => it.id));
