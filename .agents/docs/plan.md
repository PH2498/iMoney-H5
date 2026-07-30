# iMoney-H5 Demo 实施计划

> 阶段：plan（实施计划）｜技能：/writing-plans｜需求来源：`.agents/docs/requirement.md`（v2，后端语言变更）
>
> **Goal:** 跨双仓实现前后端一体 Demo——后端（ArmBasic 仓，Python FastAPI）提供 helloworld/哈希/冒泡排序/CSV导出 四接口，前端（iMoney-H5 仓）新增 `/demo` 页面以三 Tab 展示结果并提供导出。
>
> **Architecture:** 后端在 ArmBasic 仓新增 `APIServer/` 模块（与现有 AISpeechInteraction、FaceRecognitionModule 平级），使用 Python FastAPI + uvicorn 启动，端口 8080；前端在 iMoney-H5 仓 `src/pages/Demo/` 新增页面，复用现有 antd-mobile + framer-motion 范式；双仓通过 iMoney-H5 的 `.umirc.ts` proxy `/api`→`localhost:8080` 联调，mock 层兜底保证前端开发态可独立运行。
>
> **Tech Stack:** 后端 Python 3.10+ / FastAPI / uvicorn / pytest；前端 Umi Max / React 18 / TypeScript / antd-mobile / framer-motion

## Global Constraints

- 后端统一响应 `ApiResult`：`{"code": int, "message": str, "data": T}`，`code=0` 表示成功，禁止返回堆栈
- 哈希算法固定 SHA-256，默认 input `"hello"`
- 冒泡默认数据 `[5,3,8,1,9,2,7]`
- HelloWorld 返回 `message:"Hello, World!"`
- 导出格式固定 CSV，`Content-Disposition: attachment`
- 前端不侵入现有 Home/Stats/AIAssistant/Mine 页面与 `TAB_BARS`
- 路由 `/demo`（name "演示"），component `./Demo`
- npmClient 固定 `yarn`
- 入参为空/缺失时用默认值兜底，不报错
- 后端模块遵循 ArmBasic 仓约定：独立目录 + `requirements.txt` + 入口 `.py` + `README.md`
- ArmBasic 现有 AISpeechInteraction、FaceRecognitionModule 模块不被侵入

## File Structure

### 后端 `ArmBasic/APIServer/` 模块（全部新建，Python FastAPI）

| 文件 | 职责 |
|------|------|
| `APIServer/requirements.txt` | Python 依赖：fastapi、uvicorn、pytest |
| `APIServer/app/__init__.py` | 包初始化 |
| `APIServer/app/models.py` | 统一响应 `ApiResult` + 数据模型（HashResult、SortResult） |
| `APIServer/app/exceptions.py` | BusinessException + 全局异常处理 |
| `APIServer/app/services.py` | 哈希 / 冒泡排序 / 导出逻辑 |
| `APIServer/app/routes.py` | 4 接口路由：helloworld/hash/bubble/export |
| `APIServer/app/main.py` | FastAPI 应用入口 + CORS + 异常注册 |
| `APIServer/tests/__init__.py` | 测试包 |
| `APIServer/tests/test_services.py` | 冒泡排序单测（pytest） |
| `APIServer/README.md` | 模块文档 |

### 前端 `iMoney-H5`（修改 + 新建）

| 文件 | 动作 | 职责 |
|------|------|------|
| `.umirc.ts` | 修改 | 增 `proxy` + routes 增 `/demo` |
| `src/app.ts` | 修改 | 增 `request` errorConfig 统一拦截 |
| `src/pages/Demo/index.tsx` | 新建 | Demo 页，Tabs + 导出按钮 |
| `src/pages/Demo/index.less` | 新建 | Demo 页样式 |
| `src/pages/Demo/components/HelloWorldPanel.tsx` | 新建 | Tab1 |
| `src/pages/Demo/components/HashPanel.tsx` | 新建 | Tab2 |
| `src/pages/Demo/components/BubblePanel.tsx` | 新建 | Tab3 |
| `src/services/demo.ts` | 新建 | 三接口 request 封装 + 导出下载 |
| `mock/demo.ts` | 新建 | 三接口 mock，`code` 格式对齐后端 |

## Task Structure

---

### Task 1: 后端模块骨架与依赖

**Files:**
- Create: `APIServer/requirements.txt`
- Create: `APIServer/app/__init__.py`
- Create: `APIServer/app/main.py`
- Create: `APIServer/README.md`

**Steps:**

- [ ] 创建 `APIServer/requirements.txt`：

```text
fastapi>=0.110.0
uvicorn[standard]>=0.27.0
pytest>=8.0.0
httpx>=0.25.0
```

- [ ] 创建 `APIServer/app/__init__.py`（空文件，标记为 Python 包）：

```python
```

- [ ] 创建 `APIServer/app/main.py`（最小可启动骨架，后续 Task 6 中将被路由注册覆盖）：

```python
"""Demo API Server — FastAPI 应用入口。

启动方式：
    cd APIServer
    uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="iMoney Demo API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/v1/helloworld")
def helloworld():
    """占位路由，Task 6 中将被 routes.py 覆盖。"""
    return {"code": 0, "message": "success", "data": {"message": "Hello, World!"}}
```

- [ ] 创建 `APIServer/README.md`：

```markdown
# APIServer — Demo 后端服务

Python FastAPI 后端，为 iMoney-H5 Demo 页面提供四接口。

## 接口

| 接口 | 方法 | 路径 |
|------|------|------|
| HelloWorld | GET | `/api/v1/helloworld` |
| 哈希 | GET | `/api/v1/hash?input=hello` |
| 冒泡排序 | GET | `/api/v1/bubble?arr=5,3,8,1,9,2,7` |
| 导出 | GET | `/api/v1/export?type=all&format=csv` |

## 运行

```bash
cd APIServer
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload
```

## 测试

```bash
cd APIServer
python -m pytest tests/ -v
```
```

- [ ] 验证：`cd APIServer && pip install -r requirements.txt && uvicorn app.main:app --port 8080`，预期启动成功，访问 `http://localhost:8080/api/v1/helloworld` 返回 `{"code":0,...}`。若无 Python/网络环境则跳过运行验证，记录为环境依赖缺失。

---

### Task 2: 统一响应模型与异常处理

**Files:**
- Create: `APIServer/app/models.py`
- Create: `APIServer/app/exceptions.py`

**Interfaces:**
- Produces: `ApiResult`（后续路由/服务依赖）；`BusinessException`（服务层抛出）

**Steps:**

- [ ] 创建 `APIServer/app/models.py`：

```python
"""统一响应模型与数据模型。"""
from typing import Any, Optional
from pydantic import BaseModel


class ApiResult(BaseModel):
    """统一响应：{code, message, data}。code=0 表示成功。"""
    code: int = 0
    message: str = "success"
    data: Optional[Any] = None

    @classmethod
    def success(cls, data: Any) -> "ApiResult":
        return cls(code=0, message="success", data=data)

    @classmethod
    def error(cls, code: int, message: str) -> "ApiResult":
        return cls(code=code, message=message, data=None)


class HashResult(BaseModel):
    input: str
    algorithm: str
    hash: str


class SortResult(BaseModel):
    input: list[int]
    sorted: list[int]
    swaps: int
```

- [ ] 创建 `APIServer/app/exceptions.py`：

```python
"""业务异常与全局异常处理。"""
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from app.models import ApiResult


class BusinessException(Exception):
    """业务异常，对应 code=50001。"""
    def __init__(self, code: int, message: str):
        self.code = code
        self.message = message


async def business_exception_handler(request: Request, exc: BusinessException):
    return JSONResponse(
        status_code=500,
        content=ApiResult.error(exc.code, exc.message).model_dump(),
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=400,
        content=ApiResult.error(40001, f"参数非法: {exc.errors()}").model_dump(),
    )


async def generic_exception_handler(request: Request, exc: Exception):
    """未知异常兜底，不泄漏堆栈。"""
    return JSONResponse(
        status_code=500,
        content=ApiResult.error(50000, "服务器内部错误").model_dump(),
    )
```

- [ ] 验证：`cd APIServer && python -c "from app.models import ApiResult; print(ApiResult.success({'a':1}))"`，预期输出含 `code=0`。若无 fastapi 环境则跳过，记录为环境依赖缺失。

---

### Task 3: 哈希服务

**Files:**
- Create: `APIServer/app/services.py`（本 Task 创建文件并实现 hash_string，Task 4/5 追加 bubble_sort、export_to_csv）

**Interfaces:**
- Produces: `hash_string(input)` → `HashResult`

**Steps:**

- [ ] 创建 `APIServer/app/services.py`：

```python
"""Demo 业务服务：哈希、冒泡排序、导出。"""
import hashlib

from app.models import HashResult, SortResult


def hash_string(input_str: str | None = None) -> HashResult:
    """计算 SHA-256 哈希。input 为空时默认 "hello"。"""
    if not input_str:
        input_str = "hello"
    digest = hashlib.sha256(input_str.encode("utf-8")).hexdigest()
    return HashResult(input=input_str, algorithm="SHA-256", hash=digest)
```

- [ ] 验证：`cd APIServer && python -c "from app.services import hash_string; print(hash_string('hello').hash)"`，预期输出 64 位十六进制哈希值。若无环境则跳过。

---

### Task 4: 冒泡排序服务与单元测试

**Files:**
- Modify: `APIServer/app/services.py`（追加 `bubble_sort` 函数）
- Create: `APIServer/tests/__init__.py`
- Create: `APIServer/tests/test_services.py`

**Interfaces:**
- Produces: `bubble_sort(arr)` → `SortResult`

**Steps:**

- [ ] 在 `APIServer/app/services.py` 末尾追加冒泡排序函数：

```python
def bubble_sort(arr: list[int] | None = None) -> SortResult:
    """冒泡排序并统计交换次数。arr 为空时用默认数据 [5,3,8,1,9,2,7]。"""
    if not arr:
        arr = [5, 3, 8, 1, 9, 2, 7]
    a = list(arr)
    swaps = 0
    for i in range(len(a) - 1):
        for j in range(len(a) - 1 - i):
            if a[j] > a[j + 1]:
                a[j], a[j + 1] = a[j + 1], a[j]
                swaps += 1
    return SortResult(input=list(arr), sorted=a, swaps=swaps)
```

- [ ] 创建 `APIServer/tests/__init__.py`（空文件）：

```python
```

- [ ] 创建 `APIServer/tests/test_services.py`：

```python
"""冒泡排序单元测试。"""
from app.services import bubble_sort


def test_sort_default_array():
    result = bubble_sort(None)
    assert result.input == [5, 3, 8, 1, 9, 2, 7]
    assert result.sorted == [1, 2, 3, 5, 7, 8, 9]
    assert result.swaps > 0


def test_sort_already_sorted():
    result = bubble_sort([1, 2, 3])
    assert result.sorted == [1, 2, 3]
    assert result.swaps == 0


def test_sort_empty_input_falls_back_to_default():
    result = bubble_sort([])
    assert len(result.input) == 7


def test_sort_reverse_array():
    result = bubble_sort([3, 2, 1])
    assert result.sorted == [1, 2, 3]
    assert result.swaps == 3
```

- [ ] 验证：`cd APIServer && python -m pytest tests/test_services.py -v`，预期 4 个测试全绿。

---

### Task 5: 导出服务

**Files:**
- Modify: `APIServer/app/services.py`（追加 `export_to_csv` 函数）

**Interfaces:**
- Consumes: `hash_string`, `bubble_sort`
- Produces: `export_to_csv(type)` → CSV 字符串

**Steps:**

- [ ] 在 `APIServer/app/services.py` 末尾追加导出函数：

```python
def export_to_csv(type_: str) -> str:
    """根据类型生成 CSV 字符串。"""
    if type_ == "helloworld":
        return "message\nHello, World!\n"
    elif type_ == "hash":
        r = hash_string("hello")
        return f"input,algorithm,hash\n{r.input},{r.algorithm},{r.hash}\n"
    elif type_ == "bubble":
        s = bubble_sort(None)
        input_csv = '"' + ",".join(str(x) for x in s.input) + '"'
        sorted_csv = '"' + ",".join(str(x) for x in s.sorted) + '"'
        return f"input,sorted,swaps\n{input_csv},{sorted_csv},{s.swaps}\n"
    elif type_ == "all":
        s = bubble_sort(None)
        return (
            "type,summary\n"
            "helloworld,Hello World!\n"
            "hash,SHA-256\n"
            f"bubble,{s.swaps} swaps\n"
        )
    else:
        raise ValueError(f"unknown export type: {type_}")
```

- [ ] 验证：`cd APIServer && python -c "from app.services import export_to_csv; print(repr(export_to_csv('all')))"`，预期输出含 `type,summary` 的 CSV 字符串。

---

### Task 6: 路由与完整应用入口

**Files:**
- Create: `APIServer/app/routes.py`
- Modify: `APIServer/app/main.py`（注册路由与异常处理，替换 Task 1 占位路由）

**Interfaces:**
- Consumes: `services` 层函数
- Produces: HTTP 接口 `/api/v1/helloworld`、`/api/v1/hash`、`/api/v1/bubble`、`/api/v1/export`

**Steps:**

- [ ] 创建 `APIServer/app/routes.py`：

```python
"""Demo 接口路由。"""
import io

from fastapi import APIRouter, Query, Request
from fastapi.responses import StreamingResponse

from app.models import ApiResult, HashResult, SortResult
from app.services import bubble_sort, export_to_csv, hash_string
from app.exceptions import BusinessException

router = APIRouter(prefix="/api/v1", tags=["demo"])


@router.get("/helloworld", response_model=ApiResult)
def helloworld():
    return ApiResult.success({"message": "Hello, World!"})


@router.get("/hash", response_model=ApiResult)
def hash_endpoint(input: str | None = Query(default=None)):
    result = hash_string(input)
    return ApiResult.success(result)


@router.get("/bubble", response_model=ApiResult)
def bubble_endpoint(arr: str | None = Query(default=None)):
    parsed: list[int] = []
    if arr:
        for part in arr.split(","):
            part = part.strip()
            if part:
                try:
                    parsed.append(int(part))
                except ValueError:
                    raise BusinessException(40001, f"参数类型错误: {part}")
    result = bubble_sort(parsed)
    return ApiResult.success(result)


@router.get("/export")
def export(
    type: str = Query(..., description="helloworld|hash|bubble|all"),
    format: str = Query(default="csv"),
):
    csv_content = export_to_csv(type)
    output = io.BytesIO(csv_content.encode("utf-8"))
    filename = f"{type}.csv"
    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
```

- [ ] 重写 `APIServer/app/main.py`（注册路由 + 异常处理）：

```python
"""Demo API Server — FastAPI 应用入口。

启动方式：
    cd APIServer
    uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError

from app.exceptions import (
    BusinessException,
    business_exception_handler,
    validation_exception_handler,
    generic_exception_handler,
)
from app.routes import router

app = FastAPI(title="iMoney Demo API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(BusinessException, business_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

app.include_router(router)
```

- [ ] 验证：`cd APIServer && uvicorn app.main:app --port 8080`，分别 curl 四接口：
  - `curl http://localhost:8080/api/v1/helloworld` → `{"code":0,"message":"success","data":{"message":"Hello, World!"}}`
  - `curl http://localhost:8080/api/v1/hash` → `{"code":0,...,"data":{"input":"hello","algorithm":"SHA-256","hash":"2cf2..."}}`
  - `curl "http://localhost:8080/api/v1/bubble"` → `{"code":0,...,"data":{"input":[5,3,8,1,9,2,7],"sorted":[1,2,3,5,7,8,9],"swaps":10}}`
  - `curl "http://localhost:8080/api/v1/export?type=all"` → CSV 文件流
  - 若无 Python/网络环境则跳过运行验证，仅做 `python -c "from app.main import app"` 导入检查。

---

### Task 7: 前端路由与 proxy 配置

**Files:**
- Modify: `.umirc.ts`（iMoney-H5 仓）

**Steps:**

- [ ] 修改 `.umirc.ts`，在 `export default defineConfig({` 内增 `proxy`，并在 `routes` 数组末尾（`mine` 之后）增 `/demo` 路由：

```typescript
import { defineConfig } from '@umijs/max';

export default defineConfig({
  model: {},
  initialState: {},
  request: {},
  proxy: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true,
    },
  },
  extraPostCSSPlugins: [
    require('postcss-px-to-viewport')({
      viewportWidth: 375,
      unitPrecision: 5,
      viewportUnit: 'vw',
      selectorBlackList: [],
      minPixelValue: 1,
      mediaQuery: false,
    }),
  ],
  routes: [
    {
      path: '/',
      redirect: '/home',
    },
    {
      name: '首页',
      path: '/home',
      component: './Home',
    },
    {
      name: '统计',
      path: '/stats',
      component: './Stats',
    },
    {
      name: 'AI助手',
      path: '/ai-assistant',
      component: './AIAssistant',
    },
    {
      name: '我的',
      path: '/mine',
      component: './Mine',
    },
    {
      name: '演示',
      path: '/demo',
      component: './Demo',
    },
  ],
  npmClient: 'yarn',
});
```

- [ ] 验证：`yarn tsc --noEmit`（或 `yarn umi build` 若 tsc 不可用），无类型错误。

---

### Task 8: 前端 request errorConfig 统一拦截

**Files:**
- Modify: `src/app.ts`（iMoney-H5 仓）

**Interfaces:**
- Produces: 全局 request 错误拦截，`code !== 0` 视为业务错误

**Steps:**

- [ ] 修改 `src/app.ts`，新增 `errorConfig`：

```typescript
// 运行时配置
import { Toast } from 'antd-mobile';

/** 全局初始化数据 */
export async function getInitialState(): Promise<{ appName: string }> {
  return { appName: 'iMoney' };
}

/** request 错误统一拦截 */
export const request = {
  errorConfig: {
    errorThrower: (res: any) => {
      const { code, message } = res || {};
      if (code !== 0) {
        throw new Error(message || '请求失败');
      }
    },
    errorHandler: (error: any) => {
      const msg = error?.message || '网络异常，请稍后重试';
      Toast.show({ content: msg, icon: 'fail' });
    },
  },
};
```

- [ ] 验证：`yarn tsc --noEmit`，无类型错误。

---

### Task 9: 前端 services 封装

**Files:**
- Create: `src/services/demo.ts`（iMoney-H5 仓）

**Interfaces:**
- Produces: `fetchHelloworld()`, `fetchHash(input?)`, `fetchBubble(arr?)`, `exportDemo(type)` 供 Demo 页与三个 Panel 调用

**Steps:**

- [ ] 创建 `src/services/demo.ts`：

```typescript
import { request } from '@umijs/max';

export interface HelloWorldResult {
  message: string;
}

export interface HashResult {
  input: string;
  algorithm: string;
  hash: string;
}

export interface BubbleResult {
  input: number[];
  sorted: number[];
  swaps: number;
}

export type ExportType = 'helloworld' | 'hash' | 'bubble' | 'all';

/** HelloWorld 接口 */
export async function fetchHelloworld() {
  return request<HelloWorldResult>('/api/v1/helloworld', { skipErrorHandler: false });
}

/** 哈希接口 */
export async function fetchHash(input?: string) {
  return request<HashResult>('/api/v1/hash', {
    params: input ? { input } : {},
  });
}

/** 冒泡排序接口 */
export async function fetchBubble(arr?: number[]) {
  return request<BubbleResult>('/api/v1/bubble', {
    params: arr && arr.length ? { arr: arr.join(',') } : {},
  });
}

/** 导出接口：触发浏览器下载 CSV */
export async function exportDemo(type: ExportType) {
  const res = await request<Blob>(`/api/v1/export`, {
    params: { type, format: 'csv' },
    responseType: 'blob',
    getResponse: true,
  });
  const blob = res.data as unknown as Blob;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${type}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

- [ ] 验证：`yarn tsc --noEmit`，无类型错误。

---

### Task 10: 前端三个 Panel 组件

**Files:**
- Create: `src/pages/Demo/components/HelloWorldPanel.tsx`（iMoney-H5 仓）
- Create: `src/pages/Demo/components/HashPanel.tsx`
- Create: `src/pages/Demo/components/BubblePanel.tsx`

**Interfaces:**
- Consumes: `src/services/demo.ts` 的 `fetchHelloworld/fetchHash/fetchBubble`

**Steps:**

- [ ] 创建 `HelloWorldPanel.tsx`：

```tsx
import { Button, Empty, Space, Toast } from 'antd-mobile';
import { useEffect, useState } from 'react';
import { fetchHelloworld } from '@/services/demo';

interface Props {
  onLoaded?: (msg: string) => void;
}

const HelloWorldPanel: React.FC<Props> = ({ onLoaded }) => {
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await fetchHelloworld();
      setMessage(data.message);
      onLoaded?.(data.message);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return <Empty description="加载失败" />;
  }

  return (
    <Space direction="vertical" block>
      <div>{message}</div>
      <Button loading={loading} onClick={load} color="primary" size="small">
        刷新
      </Button>
    </Space>
  );
};

export default HelloWorldPanel;
```

- [ ] 创建 `HashPanel.tsx`：

```tsx
import { Button, Empty, Form, Input, Space, Toast } from 'antd-mobile';
import { useState } from 'react';
import { fetchHash, type HashResult } from '@/services/demo';

interface Props {
  onLoaded?: (summary: string) => void;
}

const HashPanel: React.FC<Props> = ({ onLoaded }) => {
  const [input, setInput] = useState('hello');
  const [result, setResult] = useState<HashResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const compute = async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await fetchHash(input);
      setResult(data);
      onLoaded?.(`${data.algorithm}: ${data.input}`);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return <Empty description="计算失败" />;
  }

  return (
    <Space direction="vertical" block>
      <Form layout="horizontal">
        <Form.Item label="输入">
          <Input value={input} onChange={setInput} placeholder="输入待哈希字符串" />
        </Form.Item>
      </Form>
      <Button loading={loading} onClick={compute} color="primary" size="small">
        计算哈希
      </Button>
      {result && (
        <Space direction="vertical" block>
          <div>算法：{result.algorithm}</div>
          <div>输入：{result.input}</div>
          <div style={{ wordBreak: 'break-all' }}>哈希：{result.hash}</div>
        </Space>
      )}
    </Space>
  );
};

export default HashPanel;
```

- [ ] 创建 `BubblePanel.tsx`：

```tsx
import { Button, Empty, Input, Space } from 'antd-mobile';
import { useState } from 'react';
import { fetchBubble, type BubbleResult } from '@/services/demo';

interface Props {
  onLoaded?: (summary: string) => void;
}

const BubblePanel: React.FC<Props> = ({ onLoaded }) => {
  const [arrText, setArrText] = useState('5,3,8,1,9,2,7');
  const [result, setResult] = useState<BubbleResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const sort = async () => {
    setLoading(true);
    setError(false);
    try {
      const arr = arrText
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !Number.isNaN(n));
      const data = await fetchBubble(arr);
      setResult(data);
      onLoaded?.(`swaps: ${data.swaps}`);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return <Empty description="排序失败" />;
  }

  return (
    <Space direction="vertical" block>
      <Input value={arrText} onChange={setArrText} placeholder="逗号分隔的数字，如 5,3,8" />
      <Button loading={loading} onClick={sort} color="primary" size="small">
        冒泡排序
      </Button>
      {result && (
        <Space direction="vertical" block>
          <div>输入：{result.input.join(', ')}</div>
          <div>排序：{result.sorted.join(', ')}</div>
          <div>交换次数：{result.swaps}</div>
        </Space>
      )}
    </Space>
  );
};

export default BubblePanel;
```

- [ ] 验证：`yarn tsc --noEmit`，无类型错误。

---

### Task 11: 前端 Demo 页面（Tabs + 导出按钮）

**Files:**
- Create: `src/pages/Demo/index.tsx`（iMoney-H5 仓）
- Create: `src/pages/Demo/index.less`

**Interfaces:**
- Consumes: 三个 Panel 组件 + `exportDemo`

**Steps:**

- [ ] 创建 `src/pages/Demo/index.less`：

```less
.page {
  padding: 12px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.title {
  font-size: 20px;
  font-weight: 600;
}

.content {
  margin-top: 12px;
}
```

- [ ] 创建 `src/pages/Demo/index.tsx`：

```tsx
import { Button, Dropdown, Tabs, Toast } from 'antd-mobile';
import { useMemo, useState } from 'react';
import MotionWrap from '@/components/base/MotionWrap';
import { exportDemo, type ExportType } from '@/services/demo';
import BubblePanel from './components/BubblePanel';
import HashPanel from './components/HashPanel';
import HelloWorldPanel from './components/HelloWorldPanel';
import styles from './index.less';

type TabKey = 'helloworld' | 'hash' | 'bubble';

const TAB_TO_EXPORT: Record<TabKey, ExportType> = {
  helloworld: 'helloworld',
  hash: 'hash',
  bubble: 'bubble',
};

const DemoPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('helloworld');
  const [exporting, setExporting] = useState(false);

  const handleExport = async (type: ExportType) => {
    setExporting(true);
    try {
      await exportDemo(type);
      Toast.show({ content: '导出成功', icon: 'success' });
    } catch {
      Toast.show({ content: '导出失败', icon: 'fail' });
    } finally {
      setExporting(false);
    }
  };

  const menuItems = useMemo(
    () => [
      { key: 'current', label: '导出当前 Tab' },
      { key: 'all', label: '导出全部' },
    ],
    [],
  );

  return (
    <MotionWrap variant="fade">
      <div className={styles.page}>
        <div className={styles.header}>
          <span className={styles.title}>演示</span>
          <Dropdown
            items={menuItems}
            onChange={(key) => {
              if (key === 'current') {
                handleExport(TAB_TO_EXPORT[activeTab]);
              } else if (key === 'all') {
                handleExport('all');
              }
            }}
          >
            <Button color="primary" size="small" loading={exporting}>
              导出 ▾
            </Button>
          </Dropdown>
        </div>
        <Tabs activeKey={activeTab} onChange={(k) => setActiveTab(k as TabKey)}>
          <Tabs.Tab title="HelloWorld" key="helloworld">
            <div className={styles.content}>
              <HelloWorldPanel />
            </div>
          </Tabs.Tab>
          <Tabs.Tab title="哈希" key="hash">
            <div className={styles.content}>
              <HashPanel />
            </div>
          </Tabs.Tab>
          <Tabs.Tab title="冒泡" key="bubble">
            <div className={styles.content}>
              <BubblePanel />
            </div>
          </Tabs.Tab>
        </Tabs>
      </div>
    </MotionWrap>
  );
};

export default DemoPage;
```

- [ ] 验证：`yarn tsc --noEmit`，无类型错误；`yarn build` 若可用则确认构建通过。

---

### Task 12: 前端 mock 兜底

**Files:**
- Create: `mock/demo.ts`（iMoney-H5 仓）

**Steps:**

- [ ] 创建 `mock/demo.ts`（`code` 格式对齐后端契约）：

```typescript
export default {
  'GET /api/v1/helloworld': (req: any, res: any) => {
    res.json({ code: 0, message: 'success', data: { message: 'Hello, World!' } });
  },
  'GET /api/v1/hash': (req: any, res: any) => {
    res.json({
      code: 0,
      message: 'success',
      data: {
        input: 'hello',
        algorithm: 'SHA-256',
        hash: '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e3c1afa7a8e8b8f0c3a7a8e0d3a',
      },
    });
  },
  'GET /api/v1/bubble': (req: any, res: any) => {
    res.json({
      code: 0,
      message: 'success',
      data: { input: [5, 3, 8, 1, 9, 2, 7], sorted: [1, 2, 3, 5, 7, 8, 9], swaps: 10 },
    });
  },
};
```

> 注意：`export` 接口为文件流，mock 层不提供文件下载兜底，导出功能需后端运行时可用。导出失败由前端 `Toast` 提示。

- [ ] 验证：启动 `yarn dev`，不连后端情况下访问 `/demo`，三 Tab 应展示 mock 数据；点击导出按钮应 `Toast` 提示失败（mock 无导出兜底）。

---

## Self-Review

**1. Spec coverage：**
- R1 后端三接口 → Task 1-5（骨架+模型/异常+Hash+Bubble+Export）+ Task 6（路由）✓
- R2 前端三 Tab 页面 → Task 7-11（路由+errorConfig+services+Panel+Demo页）✓
- R3 导出按钮+后台导出接口 → Task 5（export_to_csv）+ Task 6（export 路由）+ Task 9（exportDemo）+ Task 11（导出按钮）✓
- 异常兜底 → Task 2（exceptions + handlers）+ Task 8（errorConfig）+ Task 12（mock 兜底）✓
- 确认项 D1-D11 → 落点/框架/算法/默认数据/返回/映射/格式/语义/联调/路由/组件全覆盖 ✓
  - D1 落点：后端 ArmBasic/APIServer（Python），前端 iMoney-H5/src/pages/Demo ✓（需求变更：后端语言从 Java 改为 Python，落点从 iMoney-H5/server 改为 ArmBasic/APIServer）
  - D2 框架：FastAPI + uvicorn ✓

**2. Placeholder scan：** 无 TBD/TODO/"实现细节略"。每步含完整代码。✓

**3. 跨仓契约对齐：**
- 后端 `ApiResult{code,message,data}` 与 mock `code` 格式对齐，前端 errorConfig 以 `code!==0` 判失败 ✓
- 后端 ArmBasic/APIServer 监听 8080，前端 iMoney-H5 proxy `/api`→`localhost:8080`，跨仓联调路径一致 ✓
- 现有 `mock/userAPI.ts` 用 `success/errorCode` 不改动（不影响 Demo 链路）✓
- Demo 页不纳入 `TAB_BARS`，不侵入现有 4 页面 ✓
- ArmBasic 现有 AISpeechInteraction、FaceRecognitionModule 模块不被侵入 ✓

---

## Execution Handoff

计划完成并保存至 `.agents/docs/plan.md`。当前为 plan 阶段产物，不执行编码。后续进入「编码实现」阶段时，按 Task 1→12 顺序实施：
- 后端 Task 1-6 先行（ArmBasic/APIServer，可独立运行 `uvicorn` 启动验证 + pytest 测试）
- 前端 Task 7-12 后行（iMoney-H5，依赖接口契约，mock 兜底可并行开发）

> **环境依赖提示**：后端需 Python 3.10+ + pip，前端需 Node + yarn；若环境缺失，降级为静态检查（`python -c "import"` / `yarn tsc --noEmit`），在实施时记录。
>
> **跨仓启动**：后端 `cd ArmBasic/APIServer && uvicorn app.main:app --port 8080`；前端 `cd iMoney-H5 && yarn dev`（proxy 自动转发 `/api`→8080）。
