package com.imoney.demo.common;

/**
 * 统一响应封装：{code, message, data}。
 *
 * <p>code = 0 表示成功，非 0 表示业务/系统错误。
 *
 * <p>响应体保留全字段 setter 以兼容 Jackson 反序列化与框架兼容；
 * 生产环境建议后续迭代引入 Lombok {@code @Data} 或改为不可变对象
 * （当前无实际安全风险，仅在工厂方法内构造）。
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

    public void setCode(int code) {
        this.code = code;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public T getData() {
        return data;
    }

    public void setData(T data) {
        this.data = data;
    }
}
