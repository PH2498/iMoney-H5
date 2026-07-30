package com.imoney.demo.controller;

import com.imoney.demo.common.ApiResult;
import com.imoney.demo.common.ParamException;
import com.imoney.demo.model.HashResult;
import com.imoney.demo.model.SortResult;
import com.imoney.demo.service.DemoService;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

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

    private static final Logger log = LoggerFactory.getLogger(DemoController.class);

    private final DemoService demoService;

    @Autowired
    public DemoController(DemoService demoService) {
        this.demoService = demoService;
    }

    /** HelloWorld 接口 */
    @GetMapping("/helloworld")
    public ApiResult<Map<String, Object>> helloworld() {
        return ApiResult.success(Collections.singletonMap("message", "Hello, World!"));
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
                    throw new ParamException("参数类型错误: " + trimmed);
                }
            }
        }
        SortResult result = demoService.bubbleSort(parsed);
        return ApiResult.success(result);
    }

    /**
     * 导出接口：CSV 文件流。
     *
     * <p>先执行 exportToCsv（含 type 校验），确保异常在写流之前抛出，
     * 由 GlobalExceptionHandler 捕获并返回 JSON 错误体。
     * 写流阶段用 try-catch 防护：若 response 已 committed 则仅记日志。
     */
    @GetMapping("/export")
    public void export(
            @RequestParam("type") String type,
            @RequestParam(value = "format", defaultValue = "csv") String format,
            HttpServletResponse response) throws IOException {
        if (!"csv".equalsIgnoreCase(format)) {
            throw new ParamException("不支持的导出格式: " + format + "，仅支持 csv");
        }
        String csv = demoService.exportToCsv(type);
        String filename = type + ".csv";
        response.setContentType("text/csv");
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Content-Disposition", "attachment; filename=" + filename);
        try (OutputStream os = response.getOutputStream()) {
            os.write(csv.getBytes(StandardCharsets.UTF_8));
            os.flush();
        } catch (IOException e) {
            if (response.isCommitted()) {
                log.warn("导出写流阶段 IOException（response 已 committed）: {}", e.getMessage());
            } else {
                throw e;
            }
        }
    }
}
