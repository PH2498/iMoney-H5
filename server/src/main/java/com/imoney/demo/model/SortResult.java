package com.imoney.demo.model;

import java.util.List;

/**
 * 冒泡排序结果。
 */
public class SortResult {

    private List<Integer> input;
    private List<Integer> sorted;
    private int swaps;

    public SortResult() {
    }

    public SortResult(List<Integer> input, List<Integer> sorted, int swaps) {
        this.input = input;
        this.sorted = sorted;
        this.swaps = swaps;
    }

    public List<Integer> getInput() {
        return input;
    }

    public void setInput(List<Integer> input) {
        this.input = input;
    }

    public List<Integer> getSorted() {
        return sorted;
    }

    public void setSorted(List<Integer> sorted) {
        this.sorted = sorted;
    }

    public int getSwaps() {
        return swaps;
    }

    public void setSwaps(int swaps) {
        this.swaps = swaps;
    }
}
