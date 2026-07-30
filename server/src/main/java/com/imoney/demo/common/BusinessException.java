package com.imoney.demo.common;

/**
 * 业务异常，默认 code = 50001，映射 HTTP 500。
 *
 * <p>专表 5xxxx 类业务错误。
 * 参数非法类错误（4xxxx）请使用 {@link ParamException}，避免同一异常类承载两种语义。
 */
public class BusinessException extends RuntimeException {

    private final int code;

    public BusinessException(String message) {
        super(message);
        this.code = 50001;
    }

    public BusinessException(int code, String message) {
        super(message);
        if (code < 50000) {
            throw new IllegalArgumentException("BusinessException code must be >= 50000; use ParamException for 4xxxx codes");
        }
        this.code = code;
    }

    public int getCode() {
        return code;
    }
}
