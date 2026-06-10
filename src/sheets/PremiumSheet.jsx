import { Crown, Check } from 'lucide-react';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';

export const PremiumSheet = ({ onClose, onActivate }) => (
  <Sheet onClose={onClose} dark>
    <div className="px-6 pt-2 pb-7" style={{ color: C.cream }}>
      <div className="flex justify-center mb-3">
        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: C.saffron, color: C.ink }}>
          <Crown size={20}/>
        </div>
      </div>
      <h3 className="text-center" style={{ fontFamily:'Fraunces', fontSize: 28, fontWeight:500, letterSpacing:'-.02em' }}>
        Go Mama <span style={{ fontStyle:'italic', color: C.saffron }}>Plus</span>
      </h3>
      <div className="mt-1 text-center text-[13px]" style={{ fontFamily:'Albert Sans', opacity:.75 }}>
        Stay close to the moms you click with.
      </div>

      <div className="mt-5 space-y-2.5">
        {[
          ['Advanced filters', 'Tune Explore + Connect by stage, distance, amenities, and more'],
          ['Unlimited messages', 'Beyond the first 3 — ongoing chat with every match'],
          ['Full profiles', 'Bio, all values & interests, every free time slot'],
          ['Full group attendees', "See exactly who's going · DM them ahead"],
          ['Met-up history', "Social proof — how active each mom is"],
        ].map(([t,s],i)=>(
          <div key={i} className="rounded-2xl p-3.5 flex items-center gap-3" style={{ background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.08)' }}>
            <Check size={16} style={{ color: C.saffron }}/>
            <div>
              <div className="text-[14px]" style={{ fontFamily:'Fraunces', fontWeight:500 }}>{t}</div>
              <div className="text-[11.5px]" style={{ fontFamily:'Albert Sans', opacity:.7 }}>{s}</div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={()=>{ onActivate && onActivate(); onClose(); }} className="mt-5 w-full rounded-2xl"
        style={{ height: 54, background: C.saffron, color: C.ink, fontFamily:'Albert Sans', fontWeight:600, fontSize: 15 }}>
        Try free for 7 days
      </button>
      <div className="mt-2 text-center text-[11.5px]" style={{ fontFamily:'Albert Sans', opacity:.55 }}>
        Then $7.99/mo · cancel anytime
      </div>
    </div>
  </Sheet>
);
