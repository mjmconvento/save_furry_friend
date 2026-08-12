import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCountUp } from './useCountUp';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useCountUp', () => {
  it('starts at zero and climbs to the target', async () => {
    const { result } = renderHook(() => useCountUp(50));

    // No frame has run yet, so the animation is still at its origin.
    expect(result.current).toBe(0);

    await waitFor(() => expect(result.current).toBe(50), { timeout: 5000 });
  });

  it('lands on the exact target rather than an eased approximation', async () => {
    const { result } = renderHook(() => useCountUp(7));

    await waitFor(() => expect(result.current).toBe(7), { timeout: 5000 });
  });

  it('skips the animation when the user prefers reduced motion', () => {
    // Deliberately synchronous: an animation for someone who asked for
    // stillness is a bug, so the value must be there on the first render.
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true }))
    );

    const { result } = renderHook(() => useCountUp(42));

    expect(result.current).toBe(42);
  });

  it('animates when the platform cannot answer the motion query', async () => {
    // jsdom has no `matchMedia` at all; the hook must animate rather than throw.
    const { result } = renderHook(() => useCountUp(5));

    await waitFor(() => expect(result.current).toBe(5), { timeout: 5000 });
  });

  it('continues from the value on screen when the target changes mid-flight', async () => {
    const { result, rerender } = renderHook(
      ({ target }: { target: number }) => useCountUp(target),
      { initialProps: { target: 100 } }
    );

    await waitFor(() => expect(result.current).toBe(100), { timeout: 5000 });

    rerender({ target: 120 });

    // Continuing means never snapping back to zero on the way to the new target.
    await waitFor(() => expect(result.current).toBe(120), { timeout: 5000 });
    expect(result.current).toBe(120);
  });

  it('jumps straight to the target when the duration is zero', () => {
    const { result } = renderHook(() => useCountUp(9, 0));

    expect(result.current).toBe(9);
  });
});
