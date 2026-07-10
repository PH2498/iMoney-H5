/**
 * 归并排序算法实现
 * 采用分治法，将数组分成两半分别排序后再合并
 * 时间复杂度: O(n log n)
 * 空间复杂度: O(n)
 */

/**
 * 合并两个已排序的数组
 * @param left 左侧已排序数组
 * @param right 右侧已排序数组
 * @returns 合并后的已排序数组
 */
function merge<T>(left: T[], right: T[], compareFn?: (a: T, b: T) => number): T[] {
  const result: T[] = [];
  let leftIndex = 0;
  let rightIndex = 0;

  while (leftIndex < left.length && rightIndex < right.length) {
    const compareResult = compareFn
      ? compareFn(left[leftIndex], right[rightIndex])
      : (left[leftIndex] as number) - (right[rightIndex] as number);

    if (compareResult <= 0) {
      result.push(left[leftIndex]);
      leftIndex++;
    } else {
      result.push(right[rightIndex]);
      rightIndex++;
    }
  }

  // 添加剩余元素
  return result.concat(left.slice(leftIndex)).concat(right.slice(rightIndex));
}

/**
 * 归并排序主函数
 * @param arr 待排序数组
 * @param compareFn 可选的比较函数，默认按升序排列数字
 * @returns 新的已排序数组（不修改原数组）
 */
export function mergeSort<T>(arr: T[], compareFn?: (a: T, b: T) => number): T[] {
  // 边界条件：空数组或单元素数组直接返回副本
  if (arr.length <= 1) {
    return [...arr];
  }

  // 分割数组
  const middle = Math.floor(arr.length / 2);
  const left = arr.slice(0, middle);
  const right = arr.slice(middle);

  // 递归排序并合并
  return merge(mergeSort(left, compareFn), mergeSort(right, compareFn), compareFn);
}