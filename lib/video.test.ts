import { describe, it, expect } from 'vitest';
import { parseYouTubeId } from './video';

const VALID = 'ABCDEFGHIJK';

describe('parseYouTubeId', () => {
  // Accepted inputs
  it('accepts full watch URL', () => {
    expect(parseYouTubeId(`https://www.youtube.com/watch?v=${VALID}`)).toBe(VALID);
  });
  it('accepts watch URL with t= param', () => {
    expect(parseYouTubeId(`https://www.youtube.com/watch?v=${VALID}&t=42s`)).toBe(VALID);
  });
  it('accepts watch URL with extra params before v=', () => {
    expect(parseYouTubeId(`https://www.youtube.com/watch?feature=share&v=${VALID}`)).toBe(VALID);
  });
  it('accepts youtu.be short URL', () => {
    expect(parseYouTubeId(`https://youtu.be/${VALID}`)).toBe(VALID);
  });
  it('accepts embed URL', () => {
    expect(parseYouTubeId(`https://www.youtube.com/embed/${VALID}`)).toBe(VALID);
  });
  it('accepts mobile URL', () => {
    expect(parseYouTubeId(`https://m.youtube.com/watch?v=${VALID}`)).toBe(VALID);
  });
  it('accepts shorts URL', () => {
    expect(parseYouTubeId(`https://www.youtube.com/shorts/${VALID}`)).toBe(VALID);
  });
  it('accepts raw 11-char id', () => {
    expect(parseYouTubeId(VALID)).toBe(VALID);
  });
  it('accepts 11-char id with allowed special chars', () => {
    expect(parseYouTubeId('aBcDeF_-123')).toBe('aBcDeF_-123');
  });

  // Rejected inputs
  it('rejects empty string', () => {
    expect(parseYouTubeId('')).toBeNull();
  });
  it('rejects null', () => {
    expect(parseYouTubeId(null)).toBeNull();
  });
  it('rejects undefined', () => {
    expect(parseYouTubeId(undefined)).toBeNull();
  });
  it('rejects whitespace only', () => {
    expect(parseYouTubeId('   ')).toBeNull();
  });
  it('rejects too-short id', () => {
    expect(parseYouTubeId('ABCDEFGHIJ')).toBeNull();
  });
  it('rejects too-long id', () => {
    expect(parseYouTubeId('ABCDEFGHIJKL')).toBeNull();
  });
  it('rejects invalid charset', () => {
    expect(parseYouTubeId('ABCDEFGHIJ!')).toBeNull();
  });
  it('rejects unknown host', () => {
    expect(parseYouTubeId(`https://vimeo.com/${VALID}`)).toBeNull();
  });
  it('rejects garbage text', () => {
    expect(parseYouTubeId('not a youtube link at all')).toBeNull();
  });
  // Truncation guard: a 12-char id in a URL must NOT silently drop the last char.
  it('rejects watch URL with 12-char v= value (no silent truncation)', () => {
    expect(parseYouTubeId('https://www.youtube.com/watch?v=ABCDEFGHIJKL')).toBeNull();
  });
  it('rejects youtu.be URL with 12-char id (no silent truncation)', () => {
    expect(parseYouTubeId('https://youtu.be/ABCDEFGHIJKL')).toBeNull();
  });
  it('rejects embed URL with 12-char id (no silent truncation)', () => {
    expect(parseYouTubeId('https://www.youtube.com/embed/ABCDEFGHIJKL')).toBeNull();
  });
  it('rejects shorts URL with 12-char id (no silent truncation)', () => {
    expect(parseYouTubeId('https://www.youtube.com/shorts/ABCDEFGHIJKL')).toBeNull();
  });

  // Fragment consistency: all four URL forms must accept a # fragment.
  it('accepts watch URL with #t= fragment', () => {
    expect(parseYouTubeId(`https://www.youtube.com/watch?v=${VALID}#t=10s`)).toBe(VALID);
  });
  it('accepts youtu.be URL with #t= fragment', () => {
    expect(parseYouTubeId(`https://youtu.be/${VALID}#t=10s`)).toBe(VALID);
  });
  it('accepts embed URL with # fragment', () => {
    expect(parseYouTubeId(`https://www.youtube.com/embed/${VALID}#fragment`)).toBe(VALID);
  });
  it('accepts shorts URL with # fragment', () => {
    expect(parseYouTubeId(`https://www.youtube.com/shorts/${VALID}#fragment`)).toBe(VALID);
  });
});
