import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REFERRAL_TIERS, REFERRAL_GOAL, referralProgress } from './referral-rewards.js';

test('tiers are ascending and well-formed', () => {
  for (let i = 1; i < REFERRAL_TIERS.length; i++) {
    assert.ok(REFERRAL_TIERS[i].count > REFERRAL_TIERS[i - 1].count, 'counts ascend');
  }
  for (const t of REFERRAL_TIERS) {
    assert.ok(t.count > 0 && t.title && t.perk, 'tier has count/title/perk');
    if (t.kind === 'plus') assert.ok(t.plusMonths > 0, 'plus tier grants months');
  }
  assert.equal(REFERRAL_GOAL, REFERRAL_TIERS[REFERRAL_TIERS.length - 1].count);
});

test('zero verified: nothing unlocked, next is the first tier', () => {
  const p = referralProgress(0);
  assert.equal(p.verifiedCount, 0);
  assert.equal(p.unlocked.length, 0);
  assert.equal(p.current, null);
  assert.equal(p.next.count, REFERRAL_TIERS[0].count);
  assert.equal(p.toNext, REFERRAL_TIERS[0].count);
  assert.equal(p.pctToNext, 0);
  assert.equal(p.pctToGoal, 0);
});

test('partway into a band reports correct within-band progress', () => {
  // 2 verified: tier@1 unlocked, next is tier@3, 1 of the 2-step band done.
  const p = referralProgress(2);
  assert.equal(p.current.count, 1);
  assert.equal(p.next.count, 3);
  assert.equal(p.toNext, 1);
  assert.equal(p.pctToNext, 50);
});

test('exactly on a threshold unlocks that tier', () => {
  const p = referralProgress(3);
  assert.deepEqual(p.unlocked.map((t) => t.count), [1, 3]);
  assert.equal(p.current.count, 3);
  assert.equal(p.next.count, 5);
});

test('at/above the goal: all unlocked, no next, full progress', () => {
  const p = referralProgress(REFERRAL_GOAL + 5);
  assert.equal(p.unlocked.length, REFERRAL_TIERS.length);
  assert.equal(p.next, null);
  assert.equal(p.toNext, 0);
  assert.equal(p.pctToNext, 100);
  assert.equal(p.pctToGoal, 100);
});

test('guards against junk input', () => {
  assert.equal(referralProgress(undefined).verifiedCount, 0);
  assert.equal(referralProgress(-4).verifiedCount, 0);
  assert.equal(referralProgress(2.9).verifiedCount, 2);
  assert.equal(referralProgress('5').current.count, 5);
});
