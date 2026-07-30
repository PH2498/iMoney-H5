package com.imoney.demo.model;

import java.util.List;

/**
 * 哈希计算结果。
 */
public class HashResult {

    private String input;
    private String algorithm;
    private String hash;

    public HashResult() {
    }

    public HashResult(String input, String algorithm, String hash) {
        this.input = input;
        this.algorithm = algorithm;
        this.hash = hash;
    }

    public String getInput() {
        return input;
    }

    public void setInput(String input) {
        this.input = input;
    }

    public String getAlgorithm() {
        return algorithm;
    }

    public void setAlgorithm(String algorithm) {
        this.algorithm = algorithm;
    }

    public String getHash() {
        return hash;
    }

    public void setHash(String hash) {
        this.hash = hash;
    }
}
