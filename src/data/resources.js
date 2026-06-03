import {
  BookOpen, Scale, DollarSign, Brain, Stethoscope,
  Baby, Moon, Apple, Briefcase, GraduationCap,
  ShieldAlert, Heart, Sparkles, LifeBuoy,
} from 'lucide-react';

// ==========================================================================
// RESOURCES — curated *challenge-based* support layer. No physical locations:
// these are guides, hotlines, courses, apps, directories, and rights that
// help moms through the hard parts. Categories split into two tiers:
//   - primary  (visible: true)  → shown as inline filter chips
//   - extended (visible: false) → surfaced through the sliders-icon sheet
// Each resource carries a `link` (external) and `reviews` (peer trust).
// ==========================================================================

export const RESOURCE_CATEGORIES = [
  // Primary — always visible as chips
  { id: 'parenting',     label: 'Parenting',     icon: BookOpen,     accent: 'navy',    visible: true },
  { id: 'legal',         label: 'Legal',         icon: Scale,        accent: 'navy',    visible: true },
  { id: 'financial',     label: 'Financial',     icon: DollarSign,   accent: 'saffron', visible: true },
  { id: 'mental-health', label: 'Mental Health', icon: Brain,        accent: 'coral',   visible: true },
  { id: 'kid-health',    label: 'Kid Health',    icon: Stethoscope,  accent: 'coral',   visible: true },

  // Extended — opened via the sliders icon
  { id: 'postpartum',    label: 'Postpartum',         icon: Baby,         accent: 'coral'   },
  { id: 'breastfeeding', label: 'Breastfeeding',      icon: Heart,        accent: 'coral'   },
  { id: 'sleep',         label: 'Sleep',              icon: Moon,         accent: 'navy'    },
  { id: 'nutrition',     label: 'Nutrition & feeding',icon: Apple,        accent: 'sage'    },
  { id: 'childcare',     label: 'Childcare',          icon: Baby,         accent: 'sage'    },
  { id: 'education',     label: 'Education',          icon: GraduationCap,accent: 'navy'    },
  { id: 'career',        label: 'Career & work',      icon: Briefcase,    accent: 'navy'    },
  { id: 'special-needs', label: 'Special needs',      icon: Sparkles,     accent: 'navy'    },
  { id: 'self-care',     label: 'Self-care',          icon: Sparkles,     accent: 'sage'    },
  { id: 'safety',        label: 'Safety & crisis',    icon: ShieldAlert,  accent: 'coral'   },
  { id: 'hotlines',      label: 'Hotlines',           icon: LifeBuoy,     accent: 'coral'   },
];

export const RESOURCES = [
  // ─── PARENTING ─────────────────────────────────────────────────────────
  {
    id: 'r-big-little-feelings',
    title: 'Big Little Feelings — toddler course',
    category: 'parenting',
    summary: 'The viral tantrum survival course from two child therapists. Specific scripts you can use today.',
    link: 'https://biglittlefeelings.com',
    badge: 'Mom favorite',
    reviews: [
      { mom: 'Sara',  kids: '2y, 4y', stars: 5, text: 'Cut tantrum length in half within a week. The scripts actually work.' },
      { mom: 'Maya',  kids: '3y',     stars: 5, text: 'Finally something concrete instead of just "stay calm".' },
      { mom: 'Priya', kids: '18mo',   stars: 4, text: 'Pricey but worth it if you watch it twice.' },
    ],
  },
  {
    id: 'r-good-inside',
    title: 'Dr. Becky — Good Inside',
    category: 'parenting',
    summary: 'Membership app + podcast for navigating big feelings, sibling fights, and parental guilt.',
    link: 'https://goodinside.com',
    reviews: [
      { mom: 'Ana',   kids: '5y, 2y', stars: 5, text: 'The "two things are true" reframe changed how I parent.' },
      { mom: 'Lena',  kids: '4y',     stars: 4, text: 'Some episodes are gold, some feel repetitive.' },
    ],
  },
  {
    id: 'r-janet-lansbury',
    title: 'Janet Lansbury — Unruffled podcast',
    category: 'parenting',
    summary: 'Free podcast on respectful parenting — real listener questions answered with calm scripts.',
    link: 'https://www.janetlansbury.com/podcast-audio/',
    badge: 'Free',
    reviews: [
      { mom: 'Rin',   kids: '2y',  stars: 5, text: 'I listen on the school run. Resets me every time.' },
      { mom: 'Cami',  kids: '6mo', stars: 4, text: 'Easier to digest than her books.' },
    ],
  },

  // ─── LEGAL ─────────────────────────────────────────────────────────────
  {
    id: 'r-fmla-rights',
    title: 'FMLA & maternity leave rights — plain English',
    category: 'legal',
    summary: 'A Mother Honestly\'s breakdown of what your employer legally owes you, and how to ask for more.',
    link: 'https://amothershonestly.com',
    reviews: [
      { mom: 'Dani', kids: '1y',  stars: 5, text: 'Used the email template to negotiate 4 extra weeks paid.' },
      { mom: 'Toni', kids: '3mo', stars: 5, text: 'Wish I\'d read this *before* I told HR I was pregnant.' },
    ],
  },
  {
    id: 'r-bay-area-legal',
    title: 'Bay Area Legal Services — free family law',
    category: 'legal',
    summary: 'Free civil legal aid for low-income Florida moms: custody, divorce, restraining orders, housing.',
    link: 'https://bals.org',
    badge: 'Free',
    reviews: [
      { mom: 'Mel',   kids: '6y, 2y', stars: 5, text: 'They got my custody filing done when I couldn\'t afford a lawyer. Lifesaver.' },
      { mom: 'Jas',   kids: '4y',     stars: 4, text: 'Wait was long but the attorney was excellent once we connected.' },
    ],
  },
  {
    id: 'r-custody-101',
    title: 'Florida custody & divorce 101',
    category: 'legal',
    summary: 'A no-jargon guide to parenting plans, child support, and what mediation actually looks like.',
    link: 'https://www.flcourts.gov/Resources-Services/Family-Court',
    reviews: [
      { mom: 'Nadia', kids: '7y', stars: 4, text: 'Helped me show up to mediation knowing the actual rules.' },
    ],
  },

  // ─── FINANCIAL ─────────────────────────────────────────────────────────
  {
    id: 'r-wic-florida',
    title: 'WIC Florida — apply online',
    category: 'financial',
    summary: 'Monthly food benefits + breastfeeding support for moms and kids under 5. Higher income limits than most assume.',
    link: 'https://www.floridahealth.gov/programs-and-services/wic/',
    badge: 'Free',
    reviews: [
      { mom: 'Bea',  kids: '2y, 6mo', stars: 5, text: 'Application took 20 min. We qualified and didn\'t think we would.' },
      { mom: 'Ros',  kids: '1y',      stars: 4, text: 'The peer counselor for breastfeeding was incredible.' },
    ],
  },
  {
    id: 'r-florida-kidcare',
    title: 'Florida KidCare — child health insurance',
    category: 'financial',
    summary: 'Low-cost or free health insurance for kids 0–18. Premiums start at $15/mo for many families.',
    link: 'https://www.floridakidcare.org',
    reviews: [
      { mom: 'Em',  kids: '4y, 1y', stars: 5, text: '$15/mo for both kids, full coverage, dentist included.' },
      { mom: 'Sof', kids: '8y',     stars: 4, text: 'Renewal paperwork is annoying but worth it.' },
    ],
  },
  {
    id: 'r-ctc-guide',
    title: 'Child Tax Credit + dependent care guide',
    category: 'financial',
    summary: 'What you can claim, what childcare counts, and how to amend a return if you missed it.',
    link: 'https://www.irs.gov/credits-deductions/individuals/child-tax-credit',
    reviews: [
      { mom: 'Lex', kids: '3y', stars: 5, text: 'Got $2,400 back amending last year\'s return after reading this.' },
    ],
  },
  {
    id: 'r-mom-budget',
    title: 'The first-year baby budget worksheet',
    category: 'financial',
    summary: 'Realistic line items most baby checklists miss — formula, daycare deposits, leave gaps.',
    link: 'https://www.nerdwallet.com/article/finance/cost-of-having-a-baby',
    reviews: [
      { mom: 'Tara', kids: '3mo', stars: 4, text: 'The "leave gap" calculation alone saved us from a credit card spiral.' },
    ],
  },

  // ─── MENTAL HEALTH ─────────────────────────────────────────────────────
  {
    id: 'r-postpartum-collective',
    title: 'Postpartum Support International',
    category: 'mental-health',
    summary: 'Free virtual PPD/PPA support groups every weekday + a vetted maternal mental health therapist directory.',
    link: 'https://www.postpartum.net',
    badge: 'Free',
    reviews: [
      { mom: 'Ivy',  kids: '4mo', stars: 5, text: 'The "Mom & Baby" group on Tuesdays got me through month 3.' },
      { mom: 'Joss', kids: '1y',  stars: 5, text: 'Found my therapist through their directory. She specializes in PPA.' },
    ],
  },
  {
    id: 'r-talkspace-maternal',
    title: 'Talkspace — maternal mental health',
    category: 'mental-health',
    summary: 'Text + video therapy with therapists trained specifically in pregnancy, postpartum, and matrescence.',
    link: 'https://www.talkspace.com',
    reviews: [
      { mom: 'Kira', kids: '8mo', stars: 4, text: 'Texting my therapist at 3am during a feed was honestly the format I needed.' },
      { mom: 'Han',  kids: '2y',  stars: 3, text: 'Took two therapist switches to find the right fit.' },
    ],
  },
  {
    id: 'r-therapy-black-moms',
    title: 'Therapy for Black Moms — directory',
    category: 'mental-health',
    summary: 'Vetted directory of Black women therapists. Filter by state, telehealth, sliding scale.',
    link: 'https://therapyforblackgirls.com',
    reviews: [
      { mom: 'Imani', kids: '5y, 1y', stars: 5, text: 'First therapist who didn\'t need me to explain everything.' },
    ],
  },
  {
    id: 'r-headspace-parents',
    title: 'Headspace — new parents pack',
    category: 'mental-health',
    summary: '3–10 min guided meditations built for breastfeeding sessions, 3am wakeups, and identity shifts.',
    link: 'https://www.headspace.com',
    reviews: [
      { mom: 'Pia',  kids: '7mo', stars: 4, text: 'The "5 minute reset" pack is my middle-of-the-day reset.' },
      { mom: 'Vee',  kids: '2y',  stars: 4, text: 'Used the sleep ones for me, not the baby.' },
    ],
  },

  // ─── KID HEALTH ────────────────────────────────────────────────────────
  {
    id: 'r-healthychildren',
    title: 'HealthyChildren.org (AAP)',
    category: 'kid-health',
    summary: 'The American Academy of Pediatrics\' parent site — symptoms, milestones, screen time, all evidence-based.',
    link: 'https://www.healthychildren.org',
    badge: 'Free',
    reviews: [
      { mom: 'Mara', kids: '3y, 1y', stars: 5, text: 'My first stop before Googling — actual pediatricians, not blog spam.' },
      { mom: 'Kit',  kids: '5y',     stars: 4, text: 'Better than my pediatrician\'s portal for general questions.' },
    ],
  },
  {
    id: 'r-cdc-milestones',
    title: 'CDC Milestone Tracker app',
    category: 'kid-health',
    summary: 'Free app to track developmental milestones 2mo–5yr. Updated 2022 with current screening guidance.',
    link: 'https://www.cdc.gov/ncbddd/actearly/milestones-app.html',
    badge: 'Free',
    reviews: [
      { mom: 'Yui',  kids: '14mo', stars: 5, text: 'Caught a speech delay early. Got my son into therapy at 18mo.' },
      { mom: 'Bree', kids: '3y',   stars: 4, text: 'Helpful for the "is this normal?" 2am spirals.' },
    ],
  },
  {
    id: 'r-kidshealth',
    title: 'KidsHealth.org — Nemours',
    category: 'kid-health',
    summary: 'Symptom checker + when-to-call-the-doctor guides. Three voices: parents, kids, teens.',
    link: 'https://kidshealth.org',
    reviews: [
      { mom: 'Cleo', kids: '6y, 4y', stars: 4, text: 'The fever guidance is the one I bookmark.' },
    ],
  },

  // ─── EXTENDED ──────────────────────────────────────────────────────────
  {
    id: 'r-taking-cara-babies',
    title: 'Taking Cara Babies — sleep classes',
    category: 'sleep',
    summary: 'Newborn → toddler sleep classes from a pediatric nurse. Pick the class for your kid\'s age.',
    link: 'https://takingcarababies.com',
    reviews: [
      { mom: 'Nia',  kids: '5mo', stars: 5, text: 'Slept through the night by week 2 of the ABC class.' },
      { mom: 'Dee',  kids: '10mo',stars: 3, text: 'Worked for nights, naps still a battle.' },
    ],
  },
  {
    id: 'r-la-leche',
    title: 'La Leche League — helpline + groups',
    category: 'breastfeeding',
    summary: 'Free peer-led breastfeeding support. Call or text a leader, or join a virtual group.',
    link: 'https://www.llli.org',
    badge: 'Free',
    reviews: [
      { mom: 'Sage', kids: '3mo', stars: 5, text: 'A leader spent an hour on FaceTime fixing our latch. Free.' },
    ],
  },
  {
    id: 'r-solid-starts',
    title: 'Solid Starts — baby-led weaning',
    category: 'nutrition',
    summary: 'Searchable database: "Can my 8-month-old eat ___?" with how-to-cut photos. Free app + paid courses.',
    link: 'https://solidstarts.com',
    reviews: [
      { mom: 'Maeve', kids: '9mo', stars: 5, text: 'I check it before every new food. Confidence-builder.' },
      { mom: 'Rina',  kids: '11mo',stars: 4, text: 'The free database is enough. The paid course is nice-to-have.' },
    ],
  },
  {
    id: 'r-mom-project',
    title: 'The Mom Project — back-to-work',
    category: 'career',
    summary: 'Job board + community for moms looking for flexible, remote, or returnship roles.',
    link: 'https://themomproject.com',
    reviews: [
      { mom: 'Sim',  kids: '2y',     stars: 4, text: 'Landed a 4-day-week role here after 18 months out.' },
      { mom: 'Liv',  kids: '4y, 1y', stars: 4, text: 'Worth setting up alerts — best roles go fast.' },
    ],
  },
  {
    id: 'r-understood',
    title: 'Understood.org — learning & thinking differences',
    category: 'special-needs',
    summary: 'For ADHD, dyslexia, sensory processing — what an IEP is, how to ask for one, scripts for school meetings.',
    link: 'https://www.understood.org',
    badge: 'Free',
    reviews: [
      { mom: 'Tess', kids: '7y', stars: 5, text: 'The IEP meeting prep guide got my son the services he needed.' },
    ],
  },
  {
    id: 'r-careaware',
    title: 'Child Care Aware — find & afford care',
    category: 'childcare',
    summary: 'Search licensed daycares + in-home providers, plus state-by-state info on subsidies you may qualify for.',
    link: 'https://www.childcareaware.org',
    reviews: [
      { mom: 'Jules', kids: '15mo', stars: 4, text: 'Found three options I didn\'t know existed within 2 miles.' },
    ],
  },
  {
    id: 'r-dv-hotline',
    title: 'National Domestic Violence Hotline',
    category: 'safety',
    summary: 'Call 1-800-799-7233 or text START to 88788. 24/7, confidential, free. Trained advocates, safety planning.',
    link: 'https://www.thehotline.org',
    badge: 'Hotline',
    reviews: [
      { mom: 'Anonymous', kids: '—', stars: 5, text: 'They helped me build a safety plan I could actually use with kids in the house.' },
    ],
  },
  {
    id: 'r-poison-control',
    title: 'Poison Control — 1-800-222-1222',
    category: 'hotlines',
    summary: 'Save this in your phone now. 24/7, free, faster than the ER for most "did they swallow ___?" calls.',
    link: 'https://www.poison.org',
    badge: 'Hotline',
    reviews: [
      { mom: 'Hana', kids: '2y', stars: 5, text: 'Called at 11pm about toothpaste. Saved us an ER trip.' },
    ],
  },
  {
    id: 'r-postpartum-hotline',
    title: 'PSI helpline — 1-800-944-4773',
    category: 'hotlines',
    summary: 'Postpartum Support International. Call or text. English + Spanish. Connects you to a local coordinator.',
    link: 'https://www.postpartum.net/get-help/help-for-moms/',
    badge: 'Hotline',
    reviews: [
      { mom: 'Ren', kids: '5mo', stars: 5, text: 'Texted at 2am. Got a real person within minutes.' },
    ],
  },
];

export const findResource = (id) => RESOURCES.find(r => r.id === id) || null;

// Helper — average rating across a resource's reviews.
export const avgRating = (resource) => {
  if (!resource?.reviews?.length) return null;
  const sum = resource.reviews.reduce((s, r) => s + r.stars, 0);
  return sum / resource.reviews.length;
};
