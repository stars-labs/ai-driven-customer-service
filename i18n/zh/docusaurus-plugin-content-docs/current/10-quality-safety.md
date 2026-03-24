---
sidebar_position: 12
title: 质量与安全
---

# 质量与安全护栏

在 AI 客户服务 (Customer Service, CS) 中防止幻觉、确保合规并维护品牌声调。

## 幻觉问题

LLM (大语言模型) 可能会生成看似合理但错误的信息。在 CS 中，这意味着：

- 错误的产品信息
- 不正确的定价或政策
- 编造的流程
- 虚假承诺（退款、时间线）

:::danger CS 中的幻觉 = 信任破裂
一个自信的错误答案可能会永久失去一个客户。与娱乐性质的聊天机器人不同，CS 的准确性是不容商量的。
:::

## 防御层

```mermaid
flowchart TB
    subgraph Layer1["第 1 层：接地（Grounding）"]
        L1A[RAG - 仅使用经过批准的文档]
        L1B[要求来源归属]
        L1C[不使用通用知识]
    end

    subgraph Layer2["第 2 层：验证"]
        L2A[置信度评分]
        L2B["对照 KB（知识库）进行事实核查"]
        L2C[一致性检查]
    end

    subgraph Layer3["第 3 层：输出控制"]
        L3A[响应过滤]
        L3B[政策合规性检查]
        L3C[语气/品牌声调]
    end

    subgraph Layer4["第 4 层：人工监督"]
        L4A[低置信度 → 转人工]
        L4B["定期 QA（质量保证）抽样"]
        L4C[客户反馈循环]
    end

    Layer1 --> Layer2
    Layer2 --> Layer3
    Layer3 --> Layer4
```

## 实现

### 系统提示词工程 (System Prompt Engineering)

系统提示词是您的第一道防线：

```python
SYSTEM_PROMPT = """You are a customer service assistant for [Company].

## CRITICAL RULES
1. ONLY use information from the provided knowledge base articles
2. If the knowledge base doesn't contain the answer, say "I don't have that information. Let me connect you with a specialist."
3. NEVER make up information, procedures, or policies
4. NEVER promise specific outcomes (refunds, credits) unless explicitly stated in the knowledge base
5. ALWAYS cite the source article when providing information
6. If unsure, escalate to a human agent

## RESPONSE FORMAT
- Be concise and direct
- Use the customer's name
- Provide step-by-step instructions when applicable
- Include relevant links to help articles
- End with "Is there anything else I can help with?"

## TONE
- Friendly but professional
- Empathetic to frustrations
- Never defensive or argumentative
- Never say "I'm just an AI" unprompted

## PROHIBITED
- Don't discuss competitors
- Don't provide legal advice
- Don't make commitments about future features
- Don't share internal company information
- Don't process refunds > $50 without human approval
"""
```

### 基于知识的响应

```python
async def generate_safe_response(
    query: str,
    retrieved_chunks: list[Chunk],
    conversation_history: list[Message],
    customer_context: dict
) -> Response:
    # If no relevant chunks found, escalate
    if not retrieved_chunks or max(c.score for c in retrieved_chunks) < 0.5:
        return Response(
            content=None,
            action="escalate",
            reason="no_relevant_knowledge"
        )
    
    # Build context with source attribution
    context = format_chunks_with_sources(retrieved_chunks)
    
    response = await llm.generate(
        system=SYSTEM_PROMPT,
        user=f"""Answer based ONLY on these articles:

{context}

Customer question: {query}

Remember: If these articles don't contain the answer, say so and escalate."""
    )
    
    # Validate response
    validation = await validate_response(response, retrieved_chunks)
    
    if not validation.is_grounded:
        return Response(
            content=None,
            action="escalate",
            reason="hallucination_detected"
        )
    
    return Response(
        content=response,
        action="send",
        sources=validation.cited_sources,
        confidence=validation.confidence
    )
```

### 响应验证

```python
class ResponseValidator:
    async def validate(self, response: str, source_chunks: list[Chunk]) -> ValidationResult:
        checks = [
            self.check_groundedness(response, source_chunks),
            self.check_no_made_up_facts(response, source_chunks),
            self.check_policy_compliance(response),
            self.check_no_promises(response),
            self.check_source_attribution(response, source_chunks),
        ]
        
        results = await asyncio.gather(*checks)
        
        return ValidationResult(
            is_valid=all(r.passed for r in results),
            is_grounded=results[0].passed,
            confidence=self.calculate_confidence(results),
            issues=[r for r in results if not r.passed],
            cited_sources=self.extract_citations(response)
        )
    
    async def check_groundedness(self, response: str, chunks: list[Chunk]) -> Check:
        """Verify response content exists in source chunks."""
        # Use LLM to check if response claims are supported by chunks
        result = await llm.generate(
            prompt=f"""Does this response make claims NOT supported by the sources?

Response: {response}

Sources: {format_chunks(chunks)}

Answer YES if response contains unsupported claims, NO if all claims are supported.
Also list any unsupported claims."""
        )
        
        return Check(
            name="groundedness",
            passed="NO" in result.upper(),
            details=result
        )
    
    async def check_no_promises(self, response: str) -> Check:
        """Check for unauthorized commitments."""
        promise_patterns = [
            r"\b(will|shall|guarantee)\s+(refund|credit|compensate)\b",
            r"\b(I'?ll?|we'?ll?)\s+(give|provide|send)\s+you\b",
            r"\bwithin\s+\d+\s+(hours?|days?)\s+you'?ll?\b",
        ]
        
        has_promises = any(
            re.search(pattern, response, re.IGNORECASE) 
            for pattern in promise_patterns
        )
        
        return Check(
            name="no_promises",
            passed=not has_promises,
            details="Response contains unauthorized commitments" if has_promises else None
        )
```

## PII (个人身份信息) 保护

### 检测与脱敏

```python
import re

class PIIDetector:
    PATTERNS = {
        "email": r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
        "phone": r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b',
        "ssn": r'\b\d{3}-\d{2}-\d{4}\b',
        "credit_card": r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b',
        "ip_address": r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b',
    }
    
    def detect(self, text: str) -> list[dict]:
        findings = []
        for pii_type, pattern in self.PATTERNS.items():
            for match in re.finditer(pattern, text):
                findings.append({
                    "type": pii_type,
                    "value": match.group(),
                    "start": match.start(),
                    "end": match.end()
                })
        return findings
    
    def mask(self, text: str) -> str:
        """Replace PII with placeholders."""
        for pii_type, pattern in self.PATTERNS.items():
            text = re.sub(pattern, f"[{pii_type.upper()}]", text)
        return text
```

### PII 处理政策

| PII 类型 | 日志记录 | AI 处理 | 响应 |
|---|---|---|---|
| 电子邮件 | 脱敏 | 允许（脱敏） | 绝不回显 |
| 电话 | 脱敏 | 允许（脱敏） | 绝不回显 |
| SSN (社会安全号码) | 绝不记录 | 绝不处理 | 转人工 |
| 信用卡 | 绝不记录 | 绝不处理 | 转人工 |
| 地址 | 脱敏 | 允许（脱敏） | 确认，不重复 |

## 合规护栏

### 行业特定规则

```python
COMPLIANCE_RULES = {
    "healthcare": {
        "prohibited_topics": ["diagnosis", "treatment", "medication"],
        "required_disclaimer": "I'm not a medical professional. Please consult your doctor.",
        "escalation_keywords": ["symptoms", "pain", "medication", "diagnosis"],
    },
    "financial": {
        "prohibited_topics": ["investment advice", "tax advice", "legal advice"],
        "required_disclaimer": "This is general information, not financial advice.",
        "escalation_keywords": ["invest", "tax", "legal", "lawsuit"],
    },
    "general": {
        "prohibited_topics": ["legal advice", "guaranteed outcomes"],
        "required_disclaimer": None,
        "escalation_keywords": ["lawyer", "sue", "legal action"],
    }
}

def apply_compliance_rules(response: str, industry: str, query: str) -> str:
    rules = COMPLIANCE_RULES.get(industry, COMPLIANCE_RULES["general"])
    
    # Check if query touches prohibited topics
    for topic in rules["prohibited_topics"]:
        if topic.lower() in query.lower():
            return None  # Escalate
    
    # Add disclaimer if required
    if rules["required_disclaimer"]:
        response = f"{response}\n\n{rules['required_disclaimer']}"
    
    return response
```

## 质量监控

### 抽样与审查

```mermaid
flowchart TB
    subgraph Sampling["QA 抽样"]
        S1[随机 5% 的 AI 响应]
        S2[所有低置信度响应]
        S3[所有升级转接的对话]
        S4["所有负面 CSAT（客户满意度）"]
    end

    subgraph Review["人工审查"]
        R1[准确性检查]
        R2[语气检查]
        R3[政策合规性]
        R4[完整性]
    end

    subgraph Feedback["反馈循环"]
        F1["更新 KB（知识库）"]
        F2[调整提示词]
        F3[如果需要，重新训练]
    end

    Sampling --> Review
    Review --> Feedback
```

### 质量指标仪表盘

| 指标 | 目标 | 衡量方式 |
|---|---|---|
| 准确率 | > 95% | 样本的人工审查 |
| 接地性 (Groundedness) | > 98% | 自动化 + 人工审查 |
| 政策合规性 | 100% | 自动化检查 |
| 语气合规性 | > 95% | 人工审查 |
| PII 泄露率 | 0% | 自动化扫描 |
| 客户满意度 (CSAT) | > 4.0/5 | CSAT 调查 |

## 下一步

为了支持所有这些护栏，您需要一个精心设计的 [知识库](./knowledge-base) —— 准确 AI 响应的基石。
