import { useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  Check,
  Heart,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { MamaLogo } from './components/icons/MamaLogo';
import './waitlist.css';

const WAITLIST_KEY = 'mama_waitlist_entries';

const featureCards = [
  {
    title: 'Calendar-first matches',
    body: 'Mama starts with the hours you can actually meet, then looks for moms nearby.',
    icon: CalendarDays,
  },
  {
    title: 'Real common ground',
    body: 'Kid stages, values, interests, and preferred places shape every match.',
    icon: Heart,
  },
  {
    title: 'Lower-pressure meetups',
    body: 'Start with a 1:1 coffee, stroller walk, park hang, or a small group event.',
    icon: Users,
  },
];

const launchCities = ['San Francisco', 'Los Angeles', 'New York', 'Austin'];

const audienceOptions = [
  'Expecting',
  'New mom',
  'Toddler mom',
  'Preschool or school-age',
  'Just curious',
];

const readSavedEntries = () => {
  try {
    return JSON.parse(localStorage.getItem(WAITLIST_KEY) || '[]');
  } catch {
    return [];
  }
};

export const WaitlistPage = ({ onOpenPrototype }) => {
  const [navOpen, setNavOpen] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    email: '',
    city: '',
    audience: audienceOptions[1],
  });
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
  const canSubmit = emailOk && status !== 'loading';

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    if (status !== 'idle') setStatus('idle');
    if (error) setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) {
      setError('Enter a valid email to join the waitlist.');
      return;
    }

    const payload = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `wl-${Date.now()}`,
      firstName: form.firstName.trim(),
      email: form.email.trim().toLowerCase(),
      city: form.city.trim(),
      audience: form.audience,
      source: 'marketing-waitlist',
      createdAt: new Date().toISOString(),
    };

    setStatus('loading');
    setError('');

    try {
      const endpoint = import.meta.env.VITE_WAITLIST_ENDPOINT;

      if (endpoint) {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error('Waitlist endpoint rejected the request.');
      } else {
        const entries = readSavedEntries();
        localStorage.setItem(WAITLIST_KEY, JSON.stringify([...entries, payload]));
      }

      setStatus('success');
      setForm({
        firstName: '',
        email: '',
        city: '',
        audience: audienceOptions[1],
      });
    } catch {
      setStatus('error');
      setError('Something went wrong. Try again in a moment.');
    }
  };

  const closeNav = () => setNavOpen(false);

  return (
    <main className="waitlist-page">
      <section className="wl-hero" id="top">
        <div className="wl-product-scene" aria-hidden="true">
          <div className="wl-side-panel wl-side-panel-a">
            <div className="wl-panel-label">This week</div>
            <div className="wl-mini-row">
              <span>Tue</span>
              <strong>9 AM</strong>
              <em>coffee</em>
            </div>
            <div className="wl-mini-row">
              <span>Sat</span>
              <strong>10 AM</strong>
              <em>park</em>
            </div>
          </div>

          <div className="wl-phone-preview">
            <div className="wl-phone-notch" />
            <div className="wl-phone-screen">
              <div className="wl-app-top">
                <span>Mama</span>
                <ShieldCheck size={14} />
              </div>
              <div className="wl-match-card">
                <div className="wl-avatar">SK</div>
                <div>
                  <strong>Sara K.</strong>
                  <span>87% match</span>
                </div>
              </div>
              <div className="wl-schedule-strip">
                <CalendarDays size={16} />
                <div>
                  <strong>Both free Tuesday</strong>
                  <span>Blue Bottle, Mission</span>
                </div>
              </div>
              <div className="wl-chip-grid">
                <span>Same kid ages</span>
                <span>Gentle parenting</span>
                <span>Coffee dates</span>
              </div>
              <div className="wl-phone-cta">Send invite</div>
            </div>
          </div>

          <div className="wl-side-panel wl-side-panel-b">
            <div className="wl-panel-label">Group walk</div>
            <div className="wl-stack">
              <span>ML</span>
              <span>AR</span>
              <span>PN</span>
            </div>
            <strong>8 moms going</strong>
          </div>
        </div>

        <nav className="wl-nav" aria-label="Primary">
          <a className="wl-brand" href="#top" onClick={closeNav}>
            <MamaLogo size={42} />
            <span>Mama</span>
          </a>

          <button
            className="wl-menu-button"
            type="button"
            aria-label={navOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setNavOpen((open) => !open)}
          >
            {navOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className={`wl-nav-links ${navOpen ? 'is-open' : ''}`}>
            <a href="#why" onClick={closeNav}>Why Mama</a>
            <a href="#launch" onClick={closeNav}>Launch cities</a>
            <button type="button" onClick={() => { closeNav(); onOpenPrototype(); }}>
              View prototype
            </button>
            <a className="wl-nav-cta" href="#join" onClick={closeNav}>Join waitlist</a>
          </div>
        </nav>

        <div className="wl-hero-inner">
          <div className="wl-kicker">
            <Sparkles size={16} />
            Private beta waitlist
          </div>
          <h1>Mama</h1>
          <p className="wl-lede">
            Meet nearby moms around real free time, shared values, kid-stage fit,
            and places you would actually go.
          </p>

          <form className="wl-form" id="join" onSubmit={handleSubmit}>
            <div className="wl-form-grid">
              <label>
                <span>First name</span>
                <input
                  value={form.firstName}
                  onChange={updateField('firstName')}
                  type="text"
                  autoComplete="given-name"
                  placeholder="Maya"
                />
              </label>
              <label>
                <span>Email</span>
                <input
                  value={form.email}
                  onChange={updateField('email')}
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  required
                />
              </label>
              <label>
                <span>City or neighborhood</span>
                <input
                  value={form.city}
                  onChange={updateField('city')}
                  type="text"
                  autoComplete="address-level2"
                  placeholder="Mission, SF"
                />
              </label>
              <label>
                <span>I am a</span>
                <select value={form.audience} onChange={updateField('audience')}>
                  {audienceOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
            </div>

            <button className="wl-submit" type="submit" disabled={!canSubmit}>
              {status === 'loading' ? 'Joining...' : 'Join the waitlist'}
              {status !== 'loading' && <ArrowRight size={18} />}
            </button>

            <div className="wl-form-note" role="status">
              {status === 'success' ? (
                <span className="wl-success"><Check size={15} /> You are on the list. We will email you before launch.</span>
              ) : error ? (
                <span className="wl-error">{error}</span>
              ) : (
                <span><Mail size={14} /> Early access, launch updates, and no spam.</span>
              )}
            </div>
          </form>
        </div>
      </section>

      <section className="wl-section wl-section-light" id="why">
        <div className="wl-section-inner">
          <div className="wl-section-heading">
            <span>Built around real life</span>
            <h2>Mom friends should not require endless group texts.</h2>
          </div>
          <div className="wl-feature-grid">
            {featureCards.map((card) => (
              <article className="wl-feature-card" key={card.title}>
                <card.icon size={22} />
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="wl-section wl-section-dark">
        <div className="wl-section-inner wl-two-column">
          <div>
            <span className="wl-section-tag">How it feels</span>
            <h2>Less swiping. More showing up.</h2>
          </div>
          <div className="wl-promise-list">
            <div>
              <Check size={18} />
              <p>See moms who overlap with your available windows.</p>
            </div>
            <div>
              <Check size={18} />
              <p>Pick a suggested place or let Mama find a neutral spot.</p>
            </div>
            <div>
              <Check size={18} />
              <p>Join small recurring groups when 1:1 feels like too much.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="wl-section wl-section-launch" id="launch">
        <div className="wl-section-inner">
          <div className="wl-section-heading">
            <span>Launch focus</span>
            <h2>Starting with dense mom communities, then expanding by demand.</h2>
          </div>
          <div className="wl-city-row">
            {launchCities.map((city) => (
              <div className="wl-city" key={city}>
                <MapPin size={18} />
                <span>{city}</span>
              </div>
            ))}
          </div>
          <a className="wl-secondary-cta" href="#join">
            Get early access
            <ArrowRight size={18} />
          </a>
        </div>
      </section>

      <footer className="wl-footer">
        <div className="wl-footer-inner">
          <div>
            <MamaLogo size={34} />
            <span>Mama</span>
          </div>
          <button type="button" onClick={onOpenPrototype}>
            View prototype
            <MessageCircle size={16} />
          </button>
        </div>
      </footer>
    </main>
  );
};
