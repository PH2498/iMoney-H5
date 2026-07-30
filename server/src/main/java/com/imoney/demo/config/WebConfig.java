package com.imoney.demo.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * 全局 CORS 配置：仅允许本地开发来源，便于前端联调。
 * TODO 生产环境需配置具体 allowedOriginPatterns 或通过 Nginx 同源代理。
 */
@Configuration
@Profile("dev")
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOriginPatterns("http://localhost:*", "http://127.0.0.1:*")
                .allowedMethods("*")
                .allowedHeaders("*")
                // 暴露 Content-Disposition 头，支撑前端从响应头读取导出文件名
                .exposedHeaders("Content-Disposition")
                .maxAge(3600);
    }
}
