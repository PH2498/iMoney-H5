package com.imoney.demo.service;

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
    void exportToCsv_all() {
        String csv = service.exportToCsv("all");
        assertTrue(csv.startsWith("type,summary"));
        assertTrue(csv.contains("helloworld,Hello World!"));
        assertTrue(csv.contains("hash,SHA-256"));
        assertTrue(csv.contains("swaps"));
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
}
