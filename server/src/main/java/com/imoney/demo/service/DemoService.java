package com.imoney.demo.service;

import com.imoney.demo.common.BusinessException;
import com.imoney.demo.common.ParamException;
import com.imoney.demo.model.HashResult;
import com.imoney.demo.model.SortResult;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.List;

/**
 * Demo 业务服务：哈希、冒泡排序、CSV 导出。
 *
 * <p>入参为空/缺失时用默认值兜底，不报错，体现容错。
 */
@Service
public class DemoService {

    private static final String DEFAULT_HASH_INPUT = "hello";
    private static final List<Integer> DEFAULT_BUBBLE_ARR = Arrays.asList(5, 3, 8, 1, 9, 2, 7);

    /**
     * 计算 SHA-256 哈希。input 为空时默认 "hello"。
     */
    public HashResult hashString(String input) {
        if (input == null || input.isEmpty()) {
            input = DEFAULT_HASH_INPUT;
        }
        String digest = sha256(input);
        return new HashResult(input, "SHA-256", digest);
    }

    /**
     * 冒泡排序并统计交换次数。arr 为空时用默认数据 [5,3,8,1,9,2,7]。
     *
     * <p>方法内部创建入参副本（{@code new ArrayList<>(arr)}），不会修改传入的 List。
     * 调用方传入不可变 List（如 {@code List.of} / {@code Arrays.asList}）亦安全。
     */
    public SortResult bubbleSort(List<Integer> arr) {
        if (arr == null || arr.isEmpty()) {
            arr = new ArrayList<>(DEFAULT_BUBBLE_ARR);
        }
        List<Integer> a = new ArrayList<>(arr);
        int swaps = 0;
        for (int i = 0; i < a.size() - 1; i++) {
            for (int j = 0; j < a.size() - 1 - i; j++) {
                if (a.get(j) > a.get(j + 1)) {
                    int tmp = a.get(j);
                    a.set(j, a.get(j + 1));
                    a.set(j + 1, tmp);
                    swaps++;
                }
            }
        }
        return new SortResult(new ArrayList<>(arr), a, swaps);
    }

    /**
     * 根据类型生成 CSV 字符串。
     *
     * <p>导出为默认数据快照（DEFAULT_HASH_INPUT / DEFAULT_BUBBLE_ARR），
     * 不反映前端用户当前输入值。导出接口为无状态 GET，无法携带会话状态。
     *
     * @param type helloworld | hash | bubble | all
     */
    public String exportToCsv(String type) {
        if (type == null || type.isEmpty()) {
            throw new ParamException("导出类型不能为空");
        }
        switch (type) {
            case "helloworld":
                return "message\nHello, World!\n";
            case "hash":
                HashResult r = hashString(DEFAULT_HASH_INPUT);
                return "input,algorithm,hash\n" + r.getInput() + "," + r.getAlgorithm() + "," + r.getHash() + "\n";
            case "bubble":
                SortResult s = bubbleSort(null);
                String inputCsv = quote(join(s.getInput()));
                String sortedCsv = quote(join(s.getSorted()));
                return "input,sorted,swaps\n" + inputCsv + "," + sortedCsv + "," + s.getSwaps() + "\n";
            case "all":
                return exportAll();
            default:
                throw new ParamException("unknown export type: " + type);
        }
    }

    /**
     * 全量导出：多段 CSV，每类型一段带各自表头和完整数据。
     */
    private String exportAll() {
        StringBuilder sb = new StringBuilder();

        // HelloWorld 段
        sb.append("# HelloWorld\n");
        sb.append("message\n");
        sb.append("Hello, World!\n\n");

        // Hash 段
        HashResult r = hashString(DEFAULT_HASH_INPUT);
        sb.append("# Hash\n");
        sb.append("input,algorithm,hash\n");
        sb.append(r.getInput()).append(",").append(r.getAlgorithm()).append(",").append(r.getHash()).append("\n\n");

        // Bubble 段
        SortResult s = bubbleSort(null);
        sb.append("# Bubble\n");
        sb.append("input,sorted,swaps\n");
        sb.append(quote(join(s.getInput()))).append(",");
        sb.append(quote(join(s.getSorted()))).append(",");
        sb.append(s.getSwaps()).append("\n");

        return sb.toString();
    }

    private static String sha256(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] bytes = md.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(bytes);
        } catch (NoSuchAlgorithmException e) {
            throw new BusinessException(50000, "SHA-256 not available");
        }
    }

    private static String join(List<Integer> list) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < list.size(); i++) {
            if (i > 0) {
                sb.append(",");
            }
            sb.append(list.get(i));
        }
        return sb.toString();
    }

    private static String quote(String s) {
        return "\"" + s + "\"";
    }
}
