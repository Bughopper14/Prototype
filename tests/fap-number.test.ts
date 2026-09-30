import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nextFapNumber} from '../src/fap-number';

test('FAP sequence continues for the year and uses the current Roman month', () => {
  const applications = [
    {fapNumber: '006/AF/IX/2026'},
    {fapNumber: '010/AF/VIII/2026'},
    {fapNumber: '004/AF/XII/2025'},
  ];
  assert.equal(nextFapNumber(applications, new Date('2026-09-27T00:00:00Z')), '011/AF/IX/2026');
  assert.equal(nextFapNumber(applications, new Date('2026-10-01T00:00:00Z')), '011/AF/X/2026');
  assert.equal(nextFapNumber(applications, new Date('2027-01-01T00:00:00Z')), '001/AF/I/2027');
});
