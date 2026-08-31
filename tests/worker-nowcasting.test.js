import { describe, it, expect } from 'vitest';
import { normalizeAnmNowcasting } from '../src/providers/anm/anm-nowcasting.js';

describe('ANM nowcasting normalization', ()=>{
  it('preserves official provenance', ()=>{
    const r=normalizeAnmNowcasting({fetchedAt:'2026-08-31T07:00:00Z',items:[{level:'orange',title:'ANM Nowcasting',phenomena:'grindina',official:true}]});
    expect(r[0].official).toBe(true);
    expect(r[0].source).toBe('ANM');
    expect(r[0].sourceType).toBe('official-nowcasting');
  });
});
