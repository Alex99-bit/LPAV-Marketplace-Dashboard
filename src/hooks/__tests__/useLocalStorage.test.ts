import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '../useDebounce';

describe('useLocalStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns initial value when localStorage is empty', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
    expect(result.current[0]).toBe('default');
  });

  it('reads value from localStorage on initialization', () => {
    window.localStorage.setItem('test-key', JSON.stringify('stored-value'));
    
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
    expect(result.current[0]).toBe('stored-value');
  });

  it('updates state and localStorage when setValue is called', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
    
    act(() => {
      result.current[1]('new-value');
    });
    
    expect(result.current[0]).toBe('new-value');
    expect(window.localStorage.getItem('test-key')).toBe(JSON.stringify('new-value'));
  });

  it('handles function updater', () => {
    const { result } = renderHook(() => useLocalStorage('counter', 0));
    
    act(() => {
      result.current[1]((prev) => prev + 1);
    });
    
    expect(result.current[0]).toBe(1);
    expect(window.localStorage.getItem('counter')).toBe(JSON.stringify(1));
  });

  it('handles complex objects', () => {
    const initialData = { name: 'test', items: [1, 2, 3] };
    const { result } = renderHook(() => useLocalStorage('complex', initialData));
    
    expect(result.current[0]).toEqual(initialData);
    
    const newData = { name: 'updated', items: [4, 5, 6] };
    act(() => {
      result.current[1](newData);
    });
    
    expect(result.current[0]).toEqual(newData);
    expect(window.localStorage.getItem('complex')).toBe(JSON.stringify(newData));
  });

  it('handles arrays', () => {
    const { result } = renderHook(() => useLocalStorage<string[]>('array', []));
    
    act(() => {
      result.current[1](['item1', 'item2']);
    });
    
    expect(result.current[0]).toEqual(['item1', 'item2']);
    expect(window.localStorage.getItem('array')).toBe(JSON.stringify(['item1', 'item2']));
  });

  it('returns initial value when localStorage contains invalid JSON', () => {
    window.localStorage.setItem('test-key', 'invalid-json{');
    
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
    expect(result.current[0]).toBe('default');
  });

  it('handles null values', () => {
    const { result } = renderHook(() => useLocalStorage<string | null>('null-key', null));
    
    expect(result.current[0]).toBe(null);
    
    act(() => {
      result.current[1]('value');
    });
    
    expect(result.current[0]).toBe('value');
    
    act(() => {
      result.current[1](null);
    });
    
    expect(result.current[0]).toBe(null);
  });

  it('handles boolean values', () => {
    const { result } = renderHook(() => useLocalStorage('bool-key', false));
    
    expect(result.current[0]).toBe(false);
    
    act(() => {
      result.current[1](true);
    });
    
    expect(result.current[0]).toBe(true);
    expect(window.localStorage.getItem('bool-key')).toBe(JSON.stringify(true));
  });

  it('persists data across hook instances', () => {
    const { result: result1 } = renderHook(() => useLocalStorage('shared', 'initial'));
    
    act(() => {
      result1.current[1]('updated');
    });
    
    const { result: result2 } = renderHook(() => useLocalStorage('shared', 'initial'));
    expect(result2.current[0]).toBe('updated');
  });

  it('handles different keys independently', () => {
    const { result: result1 } = renderHook(() => useLocalStorage('key1', 'value1'));
    const { result: result2 } = renderHook(() => useLocalStorage('key2', 'value2'));
    
    act(() => {
      result1.current[1]('updated1');
      result2.current[1]('updated2');
    });
    
    expect(result1.current[0]).toBe('updated1');
    expect(result2.current[0]).toBe('updated2');
  });

  it('handles localStorage errors gracefully', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('localStorage error');
    });
    
    const { result } = renderHook(() => useLocalStorage('error-key', 'default'));
    expect(result.current[0]).toBe('default');
    
    getItemSpy.mockRestore();
    consoleError.mockRestore();
  });
});
