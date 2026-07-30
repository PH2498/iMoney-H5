package com.imoney.demo.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/**
 * 全局异常处理，统一返回 ApiResult，不泄漏堆栈。
 *
 * <ul>
 *   <li>参数非法（IllegalArgumentException / MethodArgumentTypeMismatchException / ParamException）→ code=40001, HTTP 400</li>
 *   <li>业务异常 BusinessException → code=50001, HTTP 500（5xxxx 类按段映射 HTTP 500）</li>
 *   <li>未知异常（含 NullPointerException）→ code=50000, HTTP 500</li>
 * </ul>
 *
 * <p>HTTP 状态码按 code 段映射：4xxxx → HTTP 400，5xxxx → HTTP 500。
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler({IllegalArgumentException.class, MethodArgumentTypeMismatchException.class, ParamException.class})
    public ResponseEntity<ApiResult<Object>> handleBadRequest(Exception e) {
        int code = (e instanceof ParamException) ? ((ParamException) e).getCode() : 40001;
        log.warn("参数非法: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResult.error(code, "参数非法: " + e.getMessage()));
    }

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResult<Object>> handleBusiness(BusinessException e) {
        HttpStatus status = resolveHttpStatus(e.getCode());
        log.warn("业务异常: code={}, {}", e.getCode(), e.getMessage());
        return ResponseEntity.status(status)
                .body(ApiResult.error(e.getCode(), e.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResult<Object>> handleUnknown(Exception e) {
        log.error("未知异常", e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResult.error(50000, "服务器内部错误"));
    }

    /**
     * 按 code 段映射 HTTP 状态：4xxxx → 400，5xxxx → 500。
     */
    private static HttpStatus resolveHttpStatus(int code) {
        if (code >= 40000 && code < 50000) {
            return HttpStatus.BAD_REQUEST;
        }
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }
}
