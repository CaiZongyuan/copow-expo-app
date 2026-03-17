# API Spec Template

Save to: `docs/api/{feature}.md`

---

# API Specification: [Feature Name]

**Version**: 1.0  
**Date**: [YYYY-MM-DD]  
**Source PRD**: `docs/prd/{feature}.md`  

## Overview
- **Auth**: [None/JWT/Cookie/OAuth/...]
- **Base URL**: [e.g., /api]
- **Error Format**: [统一错误结构]

## Conventions
- **Idempotency**: [哪些接口要求幂等]
- **Pagination**: [offset/limit | cursor]
- **Rate Limit**: [如有]

## Endpoints

### [METHOD] /path
- **Purpose**: [一句话说明]
- **Permission**: [谁能调用]
- **Request**
  - Headers: [...]
  - Path params: [...]
  - Query params: [...]
  - Body (JSON): [Schema + 示例]
- **Response**
  - 200: [Schema + 示例]
  - 4xx/5xx: [错误码、含义、示例]
- **Edge Cases**
  - [边界情况与约束]

## Data Models
- [DTO/Schema 定义]

## Non-Functional
- 性能目标、缓存策略（如有）
- 安全：鉴权、审计、敏感字段

