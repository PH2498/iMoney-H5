# imoney-demo-server — Demo 后端服务（Java / Spring Boot 3）

为 iMoney-H5 Demo 页面提供四个接口：helloworld / 哈希 / 冒泡排序 / CSV 导出。

## 接口

| 接口 | 方法 | 路径 | 入参（默认值） | 返回 |
|------|------|------|----------------|------|
| HelloWorld | GET | `/api/v1/helloworld` | 无 | `{code:0,message:"success",data:{message:"Hello, World!"}}` |
| 哈希 | GET | `/api/v1/hash?input=hello` | `input`（默认 `"hello"`） | `{code:0,...,data:{input,algorithm:"SHA-256",hash}}` |
| 冒泡排序 | GET | `/api/v1/bubble?arr=5,3,8,1,9,2,7` | `arr` 逗号分隔 int（默认 `[5,3,8,1,9,2,7]`） | `{code:0,...,data:{input,sorted,swaps}}` |
| 导出 | GET | `/api/v1/export?type=all&format=csv` | `type: helloworld\|hash\|bubble\|all` | CSV 文件流 `Content-Disposition: attachment` |

## 运行

```bash
cd server
mvn spring-boot:run
# 或构建后运行
mvn clean package
java -jar target/imoney-demo-server-0.1.0.jar
```

默认端口 8080，CORS 全开（`*`），便于前端联调。

## 测试

```bash
cd server
mvn test
```

## 联调

前端 iMoney-H5 的 `.umirc.ts` 已配置 proxy `/api`→`http://localhost:8080`，
后端未启动时前端 `mock/demo.ts` 兜底。
