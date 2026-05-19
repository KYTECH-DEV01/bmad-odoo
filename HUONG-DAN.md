# 📘 BMAD Odoo — Hướng dẫn Tổng quan & Sử dụng

> **Phiên bản:** 4.0.0-rc.1 · **BMAD Method:** v6.3  
> **Repo:** [github.com/phamdungtk/bmad-odoo](https://github.com/phamdungtk/bmad-odoo)

---

## 📌 BMAD Odoo là gì?

**BMAD Odoo** là một framework AI Agent chuyên dụng cho phát triển Odoo, được xây dựng trên nền tảng BMAD Method (Business Method for Agent Development). Framework này cung cấp **các nhóm agent chuyên gia AI** giúp bạn thực hiện toàn bộ quy trình phát triển phần mềm — từ phân tích yêu cầu → thiết kế → lập kế hoạch → code → kiểm thử.

### Triết lý cốt lõi

```
   Nghiệp vụ (BA)  →  Kiến trúc (DEV)  →  Kiểm thử (QA)
        Sofia              Diego               Elena
```

- **Guard Clauses trước, Happy Path sau** — code phòng thủ ở đầu method
- **Lean & Shift-Left** — BA, DEV, QA đều tham gia sớm nhất có thể
- **Đầu ra chuẩn** — Bảng (tables) và Sơ đồ tuần tự (sequence diagrams)

---

## 🏗️ Cấu trúc Hệ thống

BMAD Odoo gồm **3 tầng module** chính:

```
_bmad/
├── core/           🧠 Lõi hệ thống (cấu hình, agent master)
├── bmm/            📋 BMAD Method Module — Quy trình phát triển 4 pha
├── bme/            🚀 BMAD Enhanced Modules — Agent teams mở rộng
│   ├── _vortex/    🌀 Product Discovery (7 agents, 22 workflows)
│   ├── _gyre/      🔄 Production Readiness (4 agents, 7 workflows)
│   ├── _enhance/   ⚡ Agent Capability Upgrades
│   ├── _artifacts/ 📦 Artifact Management
│   ├── _portability/ 📤 Export & Portability
│   └── _team-factory/ 🏭 Tạo team mới
├── _config/        ⚙️ Cấu hình toàn cục
└── _memory/        🧠 Bộ nhớ agent (standards, conventions)
```

---

## 📋 Module BMM — Quy trình Phát triển 4 Pha

BMM là trái tim của hệ thống, cung cấp **quy trình phát triển phần mềm hoàn chỉnh** qua 4 pha:

### Pha 1: Phân tích (Analysis)

| Mã | Tên | Agent | Mô tả |
|----|-----|-------|--------|
| **BP** | Brainstorm Project | Analyst | Facilitator chuyên gia, brainstorm ý tưởng |
| **MR** | Market Research | Analyst | Phân tích thị trường, cạnh tranh, nhu cầu |
| **DR** | Domain Research | Analyst | Nghiên cứu chuyên sâu lĩnh vực |
| **TR** | Technical Research | Analyst | Đánh giá khả thi kỹ thuật |
| **CB** | Create Brief | Analyst | Tạo product brief — tóm tắt ý tưởng sản phẩm |

### Pha 2: Lập kế hoạch (Planning)

| Mã | Tên | Agent | Mô tả |
|----|-----|-------|--------|
| **CP** | Create PRD | PM | Tạo tài liệu yêu cầu sản phẩm (Product Requirements Document) |
| **VP** | Validate PRD | PM | Kiểm tra PRD toàn diện, lean, nhất quán |
| **EP** | Edit PRD | PM | Chỉnh sửa và cải thiện PRD |
| **CU** | Create UX | UX Designer | Thiết kế UX/UI (khuyến nghị nếu có giao diện) |

### Pha 3: Giải pháp (Solutioning)

| Mã | Tên | Agent | Mô tả |
|----|-----|-------|--------|
| **CA** | Create Architecture | Architect | Tài liệu kiến trúc kỹ thuật |
| **CE** | Create Epics & Stories | PM | Chia nhỏ thành Epics và User Stories |
| **IR** | Check Readiness | Architect | Kiểm tra sẵn sàng triển khai |

### Pha 4: Triển khai (Implementation)

| Mã | Tên | Agent | Mô tả |
|----|-----|-------|--------|
| **SP** | Sprint Planning | SM | Lập kế hoạch sprint |
| **CS** | Create Story | SM | Chuẩn bị story cho dev |
| **VS** | Validate Story | SM | Kiểm tra story trước khi code |
| **DS** | Dev Story | Dev | **Code thực tế** — triển khai story |
| **CR** | Code Review | Dev | Review code, nếu lỗi → quay lại DS |
| **QA** | QA Automation | QA | Tạo test tự động E2E/API |
| **SS** | Sprint Status | SM | Tổng kết sprint, điều hướng tiếp |
| **ER** | Retrospective | SM | Retro cuối epic, rút bài học |

### Các workflow Bất kỳ lúc nào (Anytime)

| Mã | Tên | Agent | Mô tả |
|----|-----|-------|--------|
| **DP** | Document Project | Analyst | Phân tích dự án có sẵn → sinh tài liệu |
| **GPC** | Generate Project Context | Analyst | Scan codebase → tạo `project-context.md` cho AI |
| **QQ** | Quick Dev | Solo Dev | Intent-in → code-out nhanh |
| **CC** | Correct Course | SM | Điều chỉnh hướng đi khi có thay đổi lớn |
| **WD** | Write Document | Tech Writer | Viết tài liệu theo chuẩn |
| **MG** | Mermaid Generate | Tech Writer | Tạo sơ đồ Mermaid |
| **VD** | Validate Document | Tech Writer | Kiểm tra tài liệu theo chuẩn |

---

## 🌀 Vortex — Nhóm Khám phá Sản phẩm

Vortex gồm **7 agent chuyên gia** tạo thành vòng lặp Discovery liên tục:

```
              7 Streams · 7 Agents

  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
  │   Isla   │──▶│   Mila   │──▶│   Liam   │──▶│   Wade   │
  │Thấu cảm │   │Tổng hợp  │   │Giả thuyết│   │Thí nghiệm│
  └──────────┘   └──────────┘   └──────────┘   └──────────┘
       ▲                                              │
       │                                              ▼
  ┌──────────┐   ┌──────────┐   ┌──────────┐         │
  │   Emma   │◀──│   Max    │◀──│   Noah   │◀────────┘
  │Bối cảnh  │   │Hệ thống │   │Tín hiệu  │
  └──────────┘   └──────────┘   └──────────┘
```

| Agent | Tên | Vai trò | Khi nào dùng |
|-------|------|---------|-------------|
| 🔍 **Emma** | Contextualization Expert | Định nghĩa WHO/WHY/WHICH | Bắt đầu dự án, xác định bối cảnh |
| 💜 **Isla** | Discovery Empathy Expert | Nghiên cứu người dùng, empathy map | Hiểu nhu cầu thực tế |
| 🧩 **Mila** | Research Convergence | Tổng hợp research → problem definition | Chốt vấn đề cần giải quyết |
| ⚡ **Liam** | Hypothesis Engineer | Thiết kế giả thuyết kinh doanh | Trước khi build feature |
| 🔬 **Wade** | Lean Experiments | Thiết kế & chạy thí nghiệm MVP | Validate giả thuyết |
| 📊 **Noah** | Production Intelligence | Phân tích tín hiệu production | Sau khi deploy |
| 🎯 **Max** | Learning Decision Expert | Quyết định Pivot/Patch/Persevere | Dựa trên kết quả thí nghiệm |

### 22 Workflows Vortex

Bao gồm: `lean-persona`, `product-vision`, `contextualize-scope`, `empathy-map`, `user-interview`, `user-discovery`, `research-convergence`, `pivot-resynthesis`, `pattern-mapping`, `hypothesis-engineering`, `assumption-mapping`, `experiment-design`, `mvp`, `lean-experiment`, `proof-of-concept`, `proof-of-value`, `signal-interpretation`, `behavior-analysis`, `production-monitoring`, `learning-card`, `pivot-patch-persevere`, `vortex-navigation`.

---

## 🔄 Gyre — Nhóm Sẵn sàng Production

Gyre gồm **4 agent** phân tích mức độ sẵn sàng triển khai của hệ thống:

```
  ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐
  │   Scout   │──▶│   Atlas   │──▶│   Lens    │──▶│   Coach   │
  │ Phát hiện │   │ Mô hình  │   │ Phân tích │   │ Hướng dẫn │
  │  Stack    │   │  hóa     │   │ khoảng hở │   │  review   │
  └───────────┘   └───────────┘   └───────────┘   └───────────┘
```

| Agent | Tên | Vai trò |
|-------|------|---------|
| 🔎 **Scout** | Stack Detective | Phát hiện & phân loại tech stack |
| 🗺️ **Atlas** | Model Curator | Tạo manifest khả năng hệ thống |
| 🔍 **Lens** | Readiness Analyst | Phát hiện thiếu sót, tương quan cross-domain |
| 🏋️ **Coach** | Review Coach | Hướng dẫn review, bổ sung, feedback |

### 7 Workflows Gyre

`full-analysis`, `stack-detection`, `model-generation`, `model-review`, `gap-analysis`, `delta-report`, `accuracy-validation`

---

## 🚀 Hướng dẫn Sử dụng

### 1. Kiểm tra hệ thống

```bash
# Chạy doctor để xác nhận tất cả đã sẵn sàng
node scripts/bmad-doctor.js

# Kết quả mong đợi:
# BMAD Odoo Doctor
# All 26 checks passed. Installation looks healthy!
```

### 2. Kích hoạt Agent trong Claude Code / Cursor

Mỗi agent được đăng ký dưới dạng **skill** trong `.claude/skills/`. Để kích hoạt:

```
/bmad-agent-bme-contextualization-expert     → Emma (Vortex)
/bmad-agent-bme-discovery-empathy-expert     → Isla (Vortex)
/bmad-agent-bme-research-convergence-specialist → Mila (Vortex)
/bmad-agent-bme-hypothesis-engineer          → Liam (Vortex)
/bmad-agent-bme-lean-experiments-specialist  → Wade (Vortex)
/bmad-agent-bme-production-intelligence-specialist → Noah (Vortex)
/bmad-agent-bme-learning-decision-expert     → Max (Vortex)
/bmad-agent-bme-stack-detective              → Scout (Gyre)
/bmad-agent-bme-model-curator                → Atlas (Gyre)
/bmad-agent-bme-readiness-analyst            → Lens (Gyre)
/bmad-agent-bme-review-coach                 → Coach (Gyre)
/bmad-agent-bme-team-factory                 → Team Factory
```

### 3. Quy trình làm việc đề xuất

#### 🆕 Dự án mới (Greenfield)

```
Pha 1: Phân tích
  BP (Brainstorm) → MR (Market Research) → CB (Create Brief)

Pha 2: Lập kế hoạch
  CP (Create PRD) → VP (Validate PRD) → CU (Create UX)

Pha 3: Giải pháp
  CA (Create Architecture) → CE (Create Epics) → IR (Check Readiness)

Pha 4: Triển khai
  SP (Sprint Plan) → CS (Create Story) → DS (Dev Story) → CR (Code Review)
  → QA (Test) → SS (Sprint Status) → ER (Retrospective)
```

#### 🏗️ Dự án có sẵn (Brownfield)

```
1. GPC (Generate Project Context)  → Tạo context cho AI hiểu codebase
2. DP  (Document Project)          → Sinh tài liệu từ code có sẵn
3. CC  (Correct Course)            → Lên kế hoạch cải tiến
4. SP  (Sprint Planning)           → Bắt đầu sprint
```

#### ⚡ Nhanh — Chỉ cần code

```
QQ (Quick Dev)  → Mô tả ý định → Nhận code hoàn chỉnh
```

### 4. Cấu hình cá nhân

Chỉnh sửa file config phù hợp:

```yaml
# _bmad/bme/_vortex/config.yaml
user_name: "Tên của bạn"          # Agent sẽ gọi bạn bằng tên này
communication_language: "vi"       # Ngôn ngữ giao tiếp
party_mode_enabled: true           # Chế độ multi-agent roundtable
```

```yaml
# _bmad/bme/_gyre/config.yaml
user_name: "Tên của bạn"
communication_language: "vi"
```

---

## 📂 Đầu ra (Output)

Tất cả artifacts được lưu trong:

```
_bmad-output/
├── planning-artifacts/     📋 PRD, Architecture, Epics, Stories
├── implementation-artifacts/ 💻 Sprint plans, story details, code reviews
├── vortex-artifacts/       🌀 Personas, visions, hypotheses, experiments
├── gyre-artifacts/         🔄 Stack reports, readiness analysis
└── project-knowledge/      📚 Tài liệu dự án
```

---

## 🔧 Các lệnh CLI chính

| Lệnh | Mô tả |
|-------|--------|
| `node scripts/bmad-doctor.js` | Kiểm tra sức khỏe hệ thống (26 checks) |
| `node scripts/update/bmad-update.js` | Cập nhật phiên bản |
| `node scripts/update/bmad-version.js` | Xem phiên bản hiện tại |
| `node scripts/bmad-register-skill.js` | Đăng ký skill mới |
| `node scripts/portability/bmad-export.js` | Xuất skill ra ngoài |

---

## 🧰 Ánh xạ BA → DEV → QA

Đây là nguyên tắc cốt lõi khi sử dụng BMAD Odoo:

```
BA viết (Nghiệp vụ):
  "Chỉ cho phép thanh toán nếu state = Draft, amount > 0, đã có tỉ giá."
                    ↓
Dev hiểu (Guard Clause):
  if self.state != 'draft': raise UserError(...)
  if self.amount_total <= 0: raise UserError(...)
  if not self.currency_rate: raise UserError(...)
  # Happy Path phẳng ở đây
                    ↓
QA đập phá (Boundary Test):
  amount = 0, amount = -0.01, amount = 0.00001
  currency_rate = null, currency_rate = "abc"
  state = 'confirmed' (invalid)
```

---

## 📝 Lean Code Checklist (cho Odoo 17)

Trước khi viết BẤT KỲ method Odoo nào, hãy kiểm tra:

- [ ] **Guard Clauses ở đầu** — state, required fields, boundary values
- [ ] **Edge cases đã xử lý** — None/False, empty recordset, chia 0
- [ ] **Happy Path phẳng** — không nested if/else
- [ ] **Batch-safe** — `for rec in self:`, `@api.model_create_multi`
- [ ] **No N+1** — `mapped()`, `filtered()`, `_read_group()`
- [ ] **Command API** — `Command.create()`, `Command.link()`, không tuple cũ
- [ ] **`_()`** — mọi chuỗi hiển thị phải wrap
- [ ] **Security** — ACL + Record Rules cho mọi model mới

---

## 🔗 Tài liệu liên quan

- [README.md](README.md) — Tổng quan kỹ thuật (English)
- [INSTALLATION.md](INSTALLATION.md) — Hướng dẫn cài đặt chi tiết
- [UPDATE-GUIDE.md](UPDATE-GUIDE.md) — Hướng dẫn cập nhật
- [project-context.md](project-context.md) — Quy tắc dự án
- [docs/agents.md](docs/agents.md) — Chi tiết từng agent

---

> 💡 **Mẹo:** Bắt đầu bằng `GPC` (Generate Project Context) nếu bạn đang làm việc với codebase Odoo có sẵn. File `project-context.md` được tạo ra sẽ giúp mọi agent AI hiểu rõ hơn về dự án của bạn.
