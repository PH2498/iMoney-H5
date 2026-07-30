package com.imoney.demo.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * 全局 CORS 配置：允许所有来源，便于前端联调。
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins("*")
                .allowedMethods("*")
                .allowedHeaders("*")
                // 暴露 Content-Disposition 头，支撑前端从响应头读取导出文件名
                .exposedHeaders("Content-Disposition")
                .maxAge(3600);
    }
}
