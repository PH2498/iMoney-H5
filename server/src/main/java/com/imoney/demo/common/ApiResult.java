package com.imoney.demo.common;

/**
 * 统一响应封装：{code, message, data}。
 *
 * <p>code = 0 表示成功，非 0 表示业务/系统错误。
 * 可变对象：提供全参构造器和工厂方法 success()/error()，仅暴露 getter。
 */
public class ApiResult<T> {

    private int code;
    private String message;
    private T data;

    public ApiResult() {
    }

    public ApiResult(int code, String message, T data) {
        this.code = code;
        this.message = message;
        this.data = data;
    }

    public static <T> ApiResult<T> success(T data) {
        return new ApiResult<>(0, "success", data);
    }

    public static <T> ApiResult<T> error(int code, String message) {
        return new ApiResult<>(code, message, null);
    }

    public int getCode() {
        return code;
    }

    public String getMessage() {
        return message;
    }

    public T getData() {
        return data;
    }
}
