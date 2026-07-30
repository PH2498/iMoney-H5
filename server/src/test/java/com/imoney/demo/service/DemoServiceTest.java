package com.imoney.demo.service;

import com.imoney.demo.common.ParamException;
import com.imoney.demo.model.HashResult;
import com.imoney.demo.model.SortResult;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;

/**
 * DemoService 单元测试：哈希、冒泡排序、导出。
 */
class DemoServiceTest {

    private final DemoService service = new DemoService();

    @Test
    void hashString_defaultInput() {
        HashResult r = service.hashString(null);
        assertEquals("hello", r.getInput());
        assertEquals("SHA-256", r.getAlgorithm());
        assertEquals(64, r.getHash().length());
    }

    @Test
    void hashString_customInput() {
        HashResult r = service.hashString("world");
        assertEquals("world", r.getInput());
        assertFalse(r.getHash().isEmpty());
    }

    @Test
    void bubbleSort_defaultArray() {
        SortResult r = service.bubbleSort(null);
        assertEquals(Arrays.asList(5, 3, 8, 1, 9, 2, 7), r.getInput());
        assertEquals(Arrays.asList(1, 2, 3, 5, 7, 8, 9), r.getSorted());
        assertTrue(r.getSwaps() > 0);
    }

    @Test
    void bubbleSort_alreadySorted() {
        SortResult r = service.bubbleSort(Arrays.asList(1, 2, 3));
        assertEquals(Arrays.asList(1, 2, 3), r.getSorted());
        assertEquals(0, r.getSwaps());
    }

    @Test
    void bubbleSort_emptyInputFallsBackToDefault() {
        SortResult r = service.bubbleSort(Collections.emptyList());
        assertEquals(7, r.getInput().size());
    }

    @Test
    void bubbleSort_reverseArray() {
        SortResult r = service.bubbleSort(Arrays.asList(3, 2, 1));
        assertEquals(Arrays.asList(1, 2, 3), r.getSorted());
        assertEquals(3, r.getSwaps());
    }

    @Test
    void exportToCsv_all_containsAllSections() {
        String csv = service.exportToCsv("all");
        // 多段 CSV：每类型一段带各自表头和完整数据
        assertTrue(csv.contains("# HelloWorld"), "all 导出应包含 HelloWorld 段标题");
        assertTrue(csv.contains("message"), "all 导出应包含 HelloWorld 表头");
        assertTrue(csv.contains("Hello, World!"), "all 导出应包含 HelloWorld 数据");

        assertTrue(csv.contains("# Hash"), "all 导出应包含 Hash 段标题");
        assertTrue(csv.contains("input,algorithm,hash"), "all 导出应包含 Hash 表头");
        assertTrue(csv.contains("SHA-256"), "all 导出应包含算法名");
        // hash 值为 64 位十六进制，确保完整 hash 值在 all 导出中（M2 修复点）
        assertTrue(csv.matches("(?s).*SHA-256,[0-9a-f]{64}.*"), "all 导出应包含完整 hash 值");

        assertTrue(csv.contains("# Bubble"), "all 导出应包含 Bubble 段标题");
        assertTrue(csv.contains("input,sorted,swaps"), "all 导出应包含 Bubble 表头");
        assertTrue(csv.contains("swaps"), "all 导出应包含 swaps 字段");
        // 确保排序前后数组在 all 导出中（M2 修复点：之前仅给摘要）
        assertTrue(csv.contains("\"5,3,8,1,9,2,7\""), "all 导出应包含排序前数组");
        assertTrue(csv.contains("\"1,2,3,5,7,8,9\""), "all 导出应包含排序后数组");
    }

    @Test
    void exportToCsv_bubble() {
        String csv = service.exportToCsv("bubble");
        assertTrue(csv.startsWith("input,sorted,swaps"));
    }

    @Test
    void exportToCsv_hash() {
        String csv = service.exportToCsv("hash");
        assertTrue(csv.startsWith("input,algorithm,hash"));
    }

    @Test
    void exportToCsv_helloworld() {
        String csv = service.exportToCsv("helloworld");
        assertEquals("message\nHello, World!\n", csv);
    }

    @Test
    void exportToCsv_emptyType_throwsParamException() {
        assertThrows(ParamException.class, () -> service.exportToCsv(""));
        assertThrows(ParamException.class, () -> service.exportToCsv(null));
    }

    @Test
    void exportToCsv_unknownType_throwsParamException() {
        assertThrows(ParamException.class, () -> service.exportToCsv("unknown"));
    }
}
