---
sidebar_position: 2
title: 架构概览
---

# 架构概览

本页描述了 AI (人工智能) 驱动的客户服务的完整系统架构，涵盖了业务决策框架和技术实施栈。

## 系统架构

```mermaid
flowchart TB
    subgraph Channels["客户渠道"]
        CH1[实时聊天]
        CH2[电子邮件]
        CH3[工单门户]
        CH4[电话/短信]
        CH5[社交媒体]
    end

    subgraph Router["智能路由"]
        R[意图分类<br/>复杂度评分<br/>客户层级检测]
    end

    subgraph AI_Core["AI 核心"]
        A1[RAG 管道<br/>知识检索]
        A2[LLM 处理<br/>响应生成]
        A3[置信度评分<br/>质量检查]
    end

    subgraph Human_Loop["人机协同"]
        H1[AI 辅助队列<br/>草稿审核]
        H2[升级队列<br/>复杂问题]
        H3[主管队列<br/>投诉/VIP]
    end

    subgraph Backend["后端系统"]
        B1[工单系统<br/>Zendesk/Freshdesk]
        B2[CRM<br/>客户历史]
        B3[订单系统<br/>状态/支付]
        B4[知识库<br/>文档/FAQ]
    end

    Channels --> Router
    Router -->|高置信度| AI_Core
    Router -->|低置信度| Human_Loop
    AI_Core -->|置信度 < 阈值| Human_Loop
    Human_Loop --> Backend
    AI_Core --> Backend
```

## 设计原则

### 1. 分层自动化

并非所有工单都是平等的。系统对每次交互进行分类：

```mermaid
flowchart LR
    subgraph Tier1["Tier 1: 完全自动化"]
        T1[FAQ<br/>密码重置<br/>订单状态<br/>基础操作指南]
    end

    subgraph Tier2["Tier 2: AI 辅助"]
        T2[AI 草拟<br/>人工审核<br/>复杂但有模式]
    end

    subgraph Tier3["Tier 3: 仅限人工"]
        T3[情感化<br/>边缘案例<br/>VIP<br/>法律]
    end

    T1 -->|置信度下降| T2
    T2 -->|复杂度上升| T3
```

### 2. 基于置信度的路由

每个 AI 响应都会获得一个置信度评分。低于阈值 → 人工审核：

| 置信度 | 操作 | 典型用途 |
|---|---|---|
| 0.90–1.00 | 直接发送 | 明确的 FAQ (常见问题) 匹配，标准流程 |
| 0.70–0.89 | 发送 + 标记审核 | 匹配良好但情况微妙 |
| 0.50–0.69 | 进入人工队列并附带 AI 草稿 | 模棱两可，需要人工判断 |
| < 0.50 | 路由至人工，无草稿 | 无可靠匹配，由人工处理 |

### 3. 上下文保留

从 AI 升级到人工时，完整上下文会进行传输：

```mermaid
sequenceDiagram
    participant Customer as 客户
    participant AI as AI 代理
    participant Human as 人工代理

    Customer->>AI: "我的订单还没到"
    AI->>AI: 检索订单状态
    AI->>AI: 检查物流日志
    AI->>Customer: "您的订单 #12345 已于 1 月 10 日发货。追踪显示在枢纽站延误。"
    Customer->>AI: "这无法接受，我现在就要！"
    AI->>AI: 检测到沮丧情绪 → 升级
    AI->>Human: 传输上下文：
    Note over Human: • 客户历史 (3 年，50 个订单)<br/>• 对话记录<br/>• 订单 #12345 状态<br/>• AI 尝试的解决方案<br/>• 情绪：沮丧
    Human->>Customer: "我理解您的沮丧。让我为您加急..."
```

### 4. 持续学习闭环

```mermaid
flowchart TB
    A[客户交互] --> B[AI 响应]
    B --> C{客户满意吗？}
    C -->|是| D[记录为正面案例]
    C -->|否| E[人工接管]
    E --> F[记录解决方案]
    F --> G[更新知识库]
    G --> H[重新训练/微调]
    H --> B
    D --> I[强化模式]
    I --> B
```

## 组件架构

### AI 处理管道

```mermaid
flowchart TB
    subgraph Input["输入处理"]
        I1[消息摄取<br/>多渠道标准化]
        I2[语言检测<br/>i18n 路由]
        I3[意图分类<br/>主题 + 操作]
    end

    subgraph Retrieval["RAG 检索"]
        R1[嵌入查询<br/>text-embedding-3]
        R2[向量搜索<br/>top-k 分块]
        R3[重排序结果<br/>cross-encoder]
    end

    subgraph Generation["响应生成"]
        G1[上下文组装<br/>系统提示词 + KB + 历史]
        G2[LLM 处理<br/>GPT-4 / Claude / Llama]
        G3[后处理<br/>语气、格式、合规性]
    end

    subgraph Validation["质量门控"]
        V1[置信度评分]
        V2[幻觉检查]
        V3[政策合规性]
    end

    Input --> Retrieval
    Retrieval --> Generation
    Generation --> Validation
    Validation -->|通过| Output[发送给客户]
    Validation -->|失败| Escalate[路由至人工]
```

### 知识库架构

```mermaid
flowchart TB
    subgraph Sources["知识来源"]
        S1[帮助中心文章]
        S2[产品文档]
        S3[过往工单解决方案]
        S4[政策文档]
        S5[社区论坛]
    end

    subgraph Processing["KB 处理"]
        P1[分块<br/>语义边界]
        P2[嵌入<br/>text-embedding-3-small]
        P3[元数据标记<br/>产品、版本、主题]
    end

    subgraph Storage["向量存储"]
        V1[Pinecone / Weaviate / Qdrant]
        V2[过滤搜索<br/>按产品 + 版本]
        V3[混合搜索<br/>向量 + 关键词]
    end

    Sources --> Processing
    Processing --> Storage
```

## 集成点

| 系统 | 集成方法 | 数据流 |
|---|---|---|
| 工单系统 (Zendesk, Freshdesk) | Webhooks + REST API | 双向 |
| 实时聊天 (Intercom, Crisp) | WebSocket + REST | 实时 |
| 电子邮件 | IMAP/SMTP 或 API (SendGrid) | 异步 |
| CRM (客户关系管理) (Salesforce, HubSpot) | REST API | 读取客户上下文 |
| 订单系统 | REST API / GraphQL | 读取订单/支付状态 |
| 知识库 | 向量数据库 + REST | 为 RAG (检索增强生成) 读取 |

## 故障模式与缓解措施

| 故障 | 检测 | 恢复 |
|---|---|---|
| AI 幻觉回答 | 置信度评分低 | 路由至人工 |
| AI 提供错误信息 | 客户反馈 / QA (质量保证) | 标记审核，更新 KB (知识库) |
| 知识库过时 | 解决率下降 | 自动新鲜度检查 |
| LLM API 宕机 | 健康检查超时 | 回退到基于规则的系统 + 人工排队 |
| 高延迟 | 响应时间 > SLA (服务水平协议) | 扩展副本，缓存常见查询 |
| 客户感到沮丧 | 情绪分析 | 立即升级至人工 |

## 安全与合规

```mermaid
flowchart TB
    subgraph Data["数据保护"]
        D1[PII (个人身份信息) 检测与脱敏]
        D2[静态 + 传输中加密]
        D3[数据保留政策]
    end

    subgraph Access["访问控制"]
        A1[基于角色的访问控制]
        A2[审计日志]
        A3[API 密钥轮换]
    end

    subgraph Compliance["监管合规"]
        C1[GDPR (通用数据保护条例) - 被遗忘权]
        C2[CCPA (加州消费者隐私法案) - 数据访问]
        C3[行业 - HIPAA/PCI (如果适用)]
    end
```

## 下一步

在了解了架构之后，让我们检查一下 [当前客服现状](./current-landscape)，以了解为什么 AI 驱动的客服正在成为一种必然，而非选择。
