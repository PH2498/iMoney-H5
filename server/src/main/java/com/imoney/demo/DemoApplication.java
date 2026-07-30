package com.imoney.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * iMoney Demo API Server 启动类。
 *
 * <p>启动方式：mvn spring-boot:run 或 java -jar target/imoney-demo-server-0.1.0.jar
 * 默认端口 8080。
 */
@SpringBootApplication
public class DemoApplication {

    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args);
    }
}
