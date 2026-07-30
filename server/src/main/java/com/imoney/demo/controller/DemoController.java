package com.imoney.demo.controller;

import com.imoney.demo.common.ApiResult;
import com.imoney.demo.model.HashResult;
import com.imoney.demo.model.SortResult;
import com.imoney.demo.service.DemoService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * Demo 接口路由：/api/v1/*。
 *
 * <ul>
 *   <li>GET /api/v1/helloworld</li>
 *   <li>GET /api/v1/hash?input=</li>
 *   <li>GET /api/v1/bubble?arr=</li>
 *   <li>GET /api/v1/export?type=&format=csv</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/v1")
public class DemoController {

    private final DemoService demoService;

    @Autowired
    public DemoController(DemoService demoService) {
        this.demoService = demoService;
    }

    /** HelloWorld 接口 */
    @GetMapping("/helloworld")
    public ApiResult<java.util.Map<String, Object>> helloworld() {
        return ApiResult.success(java.util.Collections.singletonMap("message", "Hello, World!"));
    }

    /** 哈希接口 */
    @GetMapping("/hash")
    public ApiResult<HashResult> hash(@RequestParam(value = "input", required = false) String input) {
        HashResult result = demoService.hashString(input);
        return ApiResult.success(result);
    }

    /** 冒泡排序接口 */
    @GetMapping("/bubble")
    public ApiResult<SortResult> bubble(@RequestParam(value = "arr", required = false) String arr) {
        List<Integer> parsed = new ArrayList<>();
        if (arr != null && !arr.isEmpty()) {
            for (String part : arr.split(",")) {
                String trimmed = part.trim();
                if (trimmed.isEmpty()) {
                    continue;
                }
                try {
                    parsed.add(Integer.parseInt(trimmed));
                } catch (NumberFormatException e) {
                    throw new com.imoney.demo.common.BusinessException(40001, "参数类型错误: " + trimmed);
                }
            }
        }
        SortResult result = demoService.bubbleSort(parsed);
        return ApiResult.success(result);
    }

    /** 导出接口：CSV 文件流 */
    @GetMapping("/export")
    public void export(
            @RequestParam("type") String type,
            @RequestParam(value = "format", defaultValue = "csv") String format,
            HttpServletResponse response) throws IOException {
        String csv = demoService.exportToCsv(type);
        String filename = type + ".csv";
        response.setContentType("text/csv");
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Content-Disposition", "attachment; filename=" + filename);
        try (OutputStream os = response.getOutputStream()) {
            os.write(csv.getBytes(StandardCharsets.UTF_8));
            os.flush();
        }
    }
}
