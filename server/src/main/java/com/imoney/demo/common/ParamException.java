package com.imoney.demo.common;

/**
 * 参数异常，默认 code = 40001，映射 HTTP 400。
 *
 * <p>专表 4xxxx 类错误（参数非法/类型错误/缺失等），
 * 与 {@link BusinessException}（5xxxx，HTTP 500）分离，避免同一异常类承载两种语义。
 */
public class ParamException extends RuntimeException {

    private final int code;

    public ParamException(String message) {
        super(message);
        this.code = 40001;
    }

    public ParamException(int code, String message) {
        super(message);
        this.code = code;
    }

    public int getCode() {
        return code;
    }
}
