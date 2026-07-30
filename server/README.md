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

默认端口 8080，CORS 仅允许本地开发来源（`localhost`/`127.0.0.1`），便于前端联调。

## 导出说明

导出接口为无状态 GET 请求，不携带用户会话状态，因此始终导出**默认数据快照**：

| type | 导出内容 |
|------|----------|
| `helloworld` | 固定消息 "Hello, World!" |
| `hash` | 默认输入 "hello" 的 SHA-256 哈希值 |
| `bubble` | 默认数组 [5,3,8,1,9,2,7] 的排序结果 |
| `all` | 以上三段合并为多段 CSV |

> 注意：导出内容不反映前端页面用户实际输入的值。如需导出当前页面数据，后续迭代可改为 POST 接口携带请求体。

## 测试

```bash
cd server
mvn test
```

## 联调

前端 iMoney-H5 的 `.umirc.ts` 已配置 proxy `/api`→`http://localhost:8080`，
后端未启动时前端 `mock/demo.ts` 兜底。
