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
 *   <li>参数非法（IllegalArgumentException / MethodArgumentTypeMismatchException）→ code=40001, HTTP 400</li>
 *   <li>业务异常 BusinessException → code=50001, HTTP 500</li>
 *   <li>未知异常（含 NullPointerException）→ code=50000, HTTP 500</li>
 * </ul>
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler({IllegalArgumentException.class, MethodArgumentTypeMismatchException.class})
    public ResponseEntity<ApiResult<Object>> handleBadRequest(Exception e) {
        log.warn("参数非法: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResult.error(40001, "参数非法: " + e.getMessage()));
    }

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResult<Object>> handleBusiness(BusinessException e) {
        log.warn("业务异常: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResult.error(e.getCode(), e.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResult<Object>> handleUnknown(Exception e) {
        log.error("未知异常", e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResult.error(50000, "服务器内部错误"));
    }
}
