import { mergeSort } from './mergeSort';

describe('mergeSort', () => {
  it('should sort an array of numbers in ascending order', () => {
    const input = [5, 3, 8, 4, 2, 7, 1, 6];
    const expected = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(mergeSort(input)).toEqual(expected);
  });

  it('should handle an empty array', () => {
    expect(mergeSort([])).toEqual([]);
  });

  it('should handle an array with a single element', () => {
    expect(mergeSort([1])).toEqual([1]);
  });

  it('should handle an already sorted array', () => {
    const input = [1, 2, 3, 4, 5];
    expect(mergeSort(input)).toEqual([1, 2, 3, 4, 5]);
  });

  it('should handle a reverse sorted array', () => {
    const input = [5, 4, 3, 2, 1];
    expect(mergeSort(input)).toEqual([1, 2, 3, 4, 5]);
  });

  it('should handle an array with duplicate elements', () => {
    const input = [3, 1, 4, 1, 5, 9, 2, 6, 5];
    const expected = [1, 1, 2, 3, 4, 5, 5, 6, 9];
    expect(mergeSort(input)).toEqual(expected);
  });

  it('should handle an array with negative numbers', () => {
    const input = [3, -1, 4, -5, 2];
    const expected = [-5, -1, 2, 3, 4];
    expect(mergeSort(input)).toEqual(expected);
  });

  it('should not modify the original array', () => {
    const input = [3, 1, 2];
    const original = [...input];
    mergeSort(input);
    expect(input).toEqual(original);
  });
});