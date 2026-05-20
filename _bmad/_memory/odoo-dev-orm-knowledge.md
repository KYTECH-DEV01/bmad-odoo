# Kiến thức Dev ORM Odoo 17 — Lean ORM & Python

Tài liệu chuẩn dành cho Dev khi viết code Odoo 17. Tuân thủ nguyên tắc Guard Clauses, Lean ORM, và xử lý Edge Cases.

## Triết lý cốt lõi

> **Code cho Unhappy Path TRƯỚC, Happy Path SAU.**
> Khi xử lý hết edge cases ở đầu hàm bằng Guard Clauses,
> phần Happy Path còn lại sẽ ngắn hơn, phẳng hơn, không cần nested if/else.

---

## 1. Guard Clauses — Bức tường Phòng thủ

### Pattern chuẩn

```python
def action_confirm(self):
    """Guard Clauses → Early Exit → Happy Path phẳng."""
    self.ensure_one()

    # ── Guard 1: State Machine ──
    if self.state != 'draft':
        raise UserError(_("Chỉ được xác nhận khi ở trạng thái Nháp."))

    # ── Guard 2: Business Rule - thiếu dữ liệu ──
    if not self.line_ids:
        raise UserError(_("Không thể xác nhận đơn hàng không có dòng chi tiết."))

    # ── Guard 3: Boundary check ──
    if self.amount_total <= 0:
        raise UserError(_("Tổng tiền phải lớn hơn 0."))

    # ── Happy Path (phẳng, không else, không nested) ──
    self.state = 'confirmed'
    self.confirmed_date = fields.Datetime.now()
    self.message_post(body=_("Đơn hàng đã được xác nhận."))
```

### ❌ Anti-pattern — Nested Hell

```python
# KHÔNG BAO GIỜ VIẾT THẾ NÀY
def action_confirm(self):
    if self.state == 'draft':
        if self.line_ids:
            if self.amount_total > 0:
                self.state = 'confirmed'  # Happy path bị chôn sâu 3 tầng
            else:
                raise UserError(...)
        else:
            raise UserError(...)
    else:
        raise UserError(...)
```

---

## 2. State Machine Pattern

### Cấu trúc chuẩn

```python
class SaleOrder(models.Model):
    _name = 'sale.order'

    # ── Định nghĩa transitions hợp lệ ──
    _STATE_TRANSITIONS = {
        'draft': ['confirmed', 'cancel'],
        'confirmed': ['done', 'cancel'],
        'cancel': ['draft'],
        # 'done': []  → terminal state, không transition được
    }

    state = fields.Selection([
        ('draft', 'Nháp'),
        ('confirmed', 'Đã xác nhận'),
        ('done', 'Hoàn tất'),
        ('cancel', 'Đã hủy'),
    ], default='draft', required=True, tracking=True)

    def _check_state_transition(self, new_state):
        """Guard: kiểm tra transition hợp lệ."""
        self.ensure_one()
        allowed = self._STATE_TRANSITIONS.get(self.state, [])
        if new_state not in allowed:
            raise UserError(_(
                "Không thể chuyển từ '%(from)s' sang '%(to)s'.",
                from=self.state,
                to=new_state,
            ))

    def action_confirm(self):
        self.ensure_one()
        self._check_state_transition('confirmed')
        # Guards khác...
        self.state = 'confirmed'

    def action_cancel(self):
        self.ensure_one()
        self._check_state_transition('cancel')
        self.state = 'cancel'

    def action_reset_to_draft(self):
        self.ensure_one()
        self._check_state_transition('draft')
        self.state = 'draft'
```

---

## 3. Edge Cases — Bảng "Nhỡ... thì sao?"

| # | Câu hỏi | Guard / Xử lý | Code |
|---|---------|---------------|------|
| 1 | Recordset rỗng? | `if not self: return` hoặc `self.ensure_one()` | `self.ensure_one()` |
| 2 | Many2one = False? | Check trước khi truy cập | `self.partner_id.name if self.partner_id else ''` |
| 3 | Chia cho 0? | Guard hoặc inline check | `x / y if y else 0` |
| 4 | Record archived? | `active_test=False` khi search | `self.with_context(active_test=False).search(...)` |
| 5 | State không hợp lệ? | `_check_state_transition()` | Xem Section 2 |
| 6 | Dữ liệu trùng? | SQL constraint + check | `_sql_constraints = [('name_uniq', 'unique(name)', '...')]` |
| 7 | Multi-company rò rỉ? | `check_company=True` | `partner_id = fields.Many2one('res.partner', check_company=True)` |
| 8 | Race condition? | `FOR UPDATE` | `self.env.cr.execute('SELECT ... FOR UPDATE')` |
| 9 | None/False trong format? | Default value | `field or ''`, `field or 0` |
| 10 | Batch vs Singleton? | `for rec in self:` | Luôn loop khi per-record logic |

---

## 4. Lean ORM — Quy tắc Cứng

### 4.1 Batch Create — `@api.model_create_multi`

```python
# ✅ Đúng
@api.model_create_multi
def create(self, vals_list):
    for vals in vals_list:
        if not vals.get('name') or vals['name'] == '/':
            vals['name'] = self.env['ir.sequence'].next_by_code('sale.order')
    return super().create(vals_list)

# ❌ Sai — không có decorator
def create(self, vals):
    # Override create không có @api.model_create_multi
    return super().create(vals)
```

### 4.2 Command API — Không dùng Tuple cũ

```python
# ✅ Đúng — Odoo 17 Command API
from odoo.fields import Command

# Tạo record mới trong O2M
order.write({'line_ids': [Command.create({'product_id': 1, 'qty': 5})]})

# Liên kết record có sẵn trong M2M
order.write({'tag_ids': [Command.link(tag_id)]})

# Set danh sách M2M (replace toàn bộ)
order.write({'tag_ids': [Command.set([1, 2, 3])]})

# Xóa liên kết (không xóa record)
order.write({'tag_ids': [Command.unlink(tag_id)]})

# Cập nhật record trong O2M
order.write({'line_ids': [Command.update(line_id, {'qty': 10})]})

# Xóa record trong O2M (xóa hẳn)
order.write({'line_ids': [Command.delete(line_id)]})

# Clear toàn bộ O2M/M2M
order.write({'line_ids': [Command.clear()]})


# ❌ Sai — Tuple cũ (KHÔNG DÙNG trong Odoo 17)
order.write({'line_ids': [(0, 0, {'product_id': 1})]})  # Dùng Command.create()
order.write({'tag_ids': [(4, tag_id)]})                   # Dùng Command.link()
order.write({'tag_ids': [(6, 0, [1, 2, 3])]})            # Dùng Command.set()
```

### 4.3 Tránh N+1 Query

```python
# ❌ N+1 — search trong loop
for partner in partners:
    orders = self.env['sale.order'].search([('partner_id', '=', partner.id)])
    total += sum(orders.mapped('amount_total'))

# ✅ Batch — dùng _read_group
results = self.env['sale.order']._read_group(
    domain=[('partner_id', 'in', partners.ids)],
    groupby=['partner_id'],
    aggregates=['amount_total:sum'],
)
# results = [(partner, amount_sum), ...]


# ❌ N+1 — truy cập related field trong loop
for order in orders:
    print(order.partner_id.name)  # 1 query per iteration nếu chưa prefetch

# ✅ Prefetch — dùng mapped trước
partner_names = orders.mapped('partner_id.name')  # 1 query
```

### 4.4 mapped(), filtered(), sorted()

```python
# Lấy tất cả product từ order lines
products = orders.mapped('order_line.product_id')

# Lọc orders có amount > 1000
big_orders = orders.filtered(lambda o: o.amount_total > 1000)

# Lọc bằng field name (nhanh hơn lambda)
confirmed = orders.filtered('is_confirmed')

# Sắp xếp
sorted_orders = orders.sorted('date_order', reverse=True)
```

### 4.5 SQL Constraints ưu tiên hơn Python

```python
# ✅ SQL constraint — nhanh, atomic, race-condition safe
_sql_constraints = [
    ('name_unique', 'unique(name, company_id)',
     'Mã đơn hàng phải là duy nhất trong cùng công ty!'),
    ('amount_positive', 'check(amount_total >= 0)',
     'Tổng tiền không được âm!'),
    ('qty_positive', 'check(product_uom_qty > 0)',
     'Số lượng phải lớn hơn 0!'),
]

# ❌ Python constraint cho logic đơn giản (chậm hơn, race-condition)
@api.constrains('amount_total')
def _check_amount(self):
    for rec in self:
        if rec.amount_total < 0:
            raise ValidationError(...)
```

---

## 5. View Modifiers — Odoo 17

### 5.1 Python Expression (Không dùng attrs cũ)

```xml
<!-- ✅ Đúng — Odoo 17 Python expression -->
<field name="partner_id" readonly="state != 'draft'"/>
<field name="amount" invisible="not show_amount"/>
<field name="date" required="state == 'confirmed'"/>

<!-- ❌ Sai — attrs cũ (Odoo 16 trở về trước) -->
<field name="partner_id" attrs="{'readonly': [('state', '!=', 'draft')]}"/>
```

### 5.2 Column invisible trong Tree view

```xml
<!-- ✅ Đúng — column_invisible cho tree -->
<tree>
    <field name="internal_note" column_invisible="True"/>
    <field name="margin" column_invisible="not show_margin"/>
</tree>

<!-- ❌ Sai — invisible trong tree (ẩn cell, không ẩn cột) -->
<tree>
    <field name="internal_note" invisible="True"/>
</tree>
```

### 5.3 Optional fields trong Tree

```xml
<tree>
    <field name="partner_id"/>
    <field name="date_order"/>
    <field name="amount_total"/>
    <!-- Optional: user tự bật/tắt cột -->
    <field name="partner_shipping_id" optional="hide"/>
    <field name="payment_term_id" optional="show"/>
</tree>
```

---

## 6. Compute Fields — Best Practices

```python
class SaleOrder(models.Model):
    _name = 'sale.order'

    # ── Compute với depends chính xác ──
    amount_untaxed = fields.Monetary(
        compute='_compute_amounts',
        store=True,  # Lưu DB → search/group/sort được
    )
    amount_tax = fields.Monetary(
        compute='_compute_amounts',
        store=True,
    )
    amount_total = fields.Monetary(
        compute='_compute_amounts',
        store=True,
    )

    @api.depends('order_line.price_subtotal', 'order_line.price_tax')
    def _compute_amounts(self):
        for order in self:
            lines = order.order_line
            order.amount_untaxed = sum(lines.mapped('price_subtotal'))
            order.amount_tax = sum(lines.mapped('price_tax'))
            order.amount_total = order.amount_untaxed + order.amount_tax

    # ── Compute Many2one — dùng depends dotted path ──
    partner_country_id = fields.Many2one(
        'res.country',
        compute='_compute_partner_country',
        store=True,
    )

    @api.depends('partner_id.country_id')
    def _compute_partner_country(self):
        for rec in self:
            rec.partner_country_id = rec.partner_id.country_id
```

---

## 7. Security — ACL & Record Rules

### 7.1 Access Control List (ir.model.access.csv)

```csv
id,name,model_id:id,group_id:id,perm_read,perm_write,perm_create,perm_unlink
access_dpt_order_user,dpt.order.user,model_dpt_order,base.group_user,1,1,1,0
access_dpt_order_manager,dpt.order.manager,model_dpt_order,sales_team.group_sale_manager,1,1,1,1
```

**Quy tắc:**
- User thường: **KHÔNG** có quyền `unlink` (perm_unlink=0)
- Chỉ Manager mới có `unlink`
- Mỗi model mới **BẮT BUỘC** phải có ACL

### 7.2 Record Rules (ir.rule)

```xml
<!-- User chỉ thấy record của mình hoặc mình là salesperson -->
<record id="rule_order_user_own" model="ir.rule">
    <field name="name">Order: user own records</field>
    <field name="model_id" ref="model_dpt_order"/>
    <field name="domain_force">[
        '|',
        ('user_id', '=', user.id),
        ('create_uid', '=', user.id)
    ]</field>
    <field name="groups" eval="[(4, ref('base.group_user'))]"/>
</record>

<!-- Manager thấy tất cả (no domain restriction) -->
<record id="rule_order_manager_all" model="ir.rule">
    <field name="name">Order: manager sees all</field>
    <field name="model_id" ref="model_dpt_order"/>
    <field name="domain_force">[(1, '=', 1)]</field>
    <field name="groups" eval="[(4, ref('sales_team.group_sale_manager'))]"/>
</record>
```

---

## 8. Translation — `_()` cho mọi chuỗi hiển thị

```python
from odoo import _, fields, models
from odoo.exceptions import UserError, ValidationError

# ✅ Đúng — wrap _() cho mọi chuỗi user-facing
raise UserError(_("Không thể xác nhận đơn hàng không có dòng chi tiết."))
raise ValidationError(_("Tổng tiền phải lớn hơn 0."))

# ✅ Đúng — format string với named params
raise UserError(_(
    "Đơn hàng %(name)s không thể hủy vì đã thanh toán %(amount)s.",
    name=self.name,
    amount=self.amount_total,
))

# ❌ Sai — hardcode chuỗi tiếng Việt không wrap
raise UserError("Không thể xác nhận")

# ❌ Sai — f-string trong _()
raise UserError(_(f"Đơn hàng {self.name} lỗi"))  # f-string không extract được
```

---

## 9. Cron Job — Scheduled Actions

```python
class HrAttendance(models.Model):
    _inherit = 'hr.attendance'

    @api.model
    def _cron_auto_checkout(self):
        """Cron: tự động checkout nhân viên cuối ngày."""
        # Guard: timezone-safe
        now_utc = fields.Datetime.now()
        tz = pytz.timezone('Asia/Ho_Chi_Minh')
        now_local = now_utc.astimezone(tz)

        # Guard: chỉ chạy trong khung giờ hợp lệ
        if now_local.hour < 17:
            return

        # Batch query — tránh N+1
        open_attendances = self.search([
            ('check_out', '=', False),
            ('check_in', '<=', now_utc),
        ])

        if not open_attendances:
            return

        # Batch write
        checkout_time = now_utc.replace(
            hour=10, minute=30, second=0, microsecond=0  # 17:30 VN = 10:30 UTC
        )
        open_attendances.write({'check_out': checkout_time})
```

---

## 10. Logging — Debug Pattern

```python
import logging
_logger = logging.getLogger(__name__)

def action_confirm(self):
    self.ensure_one()
    _logger.info(
        "=== action_confirm SO=%s state=%s amount=%s lines=%d ===",
        self.name, self.state, self.amount_total, len(self.line_ids)
    )

    # Guards...

    _logger.info("SO=%s confirmed successfully", self.name)
    self.state = 'confirmed'
```

**Quy tắc logging:**
- `_logger.info()` — flow chính, milestones
- `_logger.warning()` — edge case nhưng không crash
- `_logger.error()` — lỗi cần attention
- `_logger.debug()` — chi tiết debug (chỉ hiện khi bật debug level)
- **Dùng `%s` format, KHÔNG dùng f-string** (lazy evaluation)

---

## 11. Lean Code Checklist

Trước khi viết BẤT KỲ method Odoo nào, kiểm tra:

- [ ] **Guard Clauses ở đầu** — state, required fields, boundary values
- [ ] **Edge cases xử lý xong** — None/False, empty recordset, chia 0
- [ ] **Happy Path phẳng** — không nested if/else
- [ ] **Batch-safe** — `for rec in self:`, `@api.model_create_multi`
- [ ] **No N+1** — `mapped()`, `filtered()`, `_read_group()`
- [ ] **Command API** — `Command.create()`, `Command.link()`, không tuple cũ
- [ ] **`_()`** — mọi chuỗi hiển thị phải wrap translation
- [ ] **Security** — ACL + Record Rules cho mọi model mới
- [ ] **View modifiers** — `readonly="state != 'draft'"` (Python expr)
- [ ] **Column ẩn** — `column_invisible="True"` trong tree
- [ ] **SQL constraints** — ưu tiên hơn Python constraints
- [ ] **Logging** — `_logger.info()` ở guard + milestone

---

# PHẦN II: KIẾN THỨC DEV CUSTOM DPT

> Tài liệu bổ sung cho Dev khi viết code trên hệ thống DPT — dịch vụ xuất nhập khẩu, logistics.

---

## 12. Model Registry — Danh sách Model Custom

### 12.1 Model Mới (không inherit)

| Model | Module | Mô tả |
|-------|--------|--------|
| `dpt.service.management` | `dpt_service_management` | Danh mục dịch vụ XNK |
| `dpt.service.management.steps` | `dpt_service_management` | Bước xử lý dịch vụ |
| `dpt.service.management.required.fields` | `dpt_service_management` | Trường bắt buộc theo dịch vụ |
| `dpt.service.management.type` | `dpt_service_management` | Loại dịch vụ |
| `dpt.service.combo` | `dpt_service_management` | Gói combo dịch vụ |
| `dpt.sale.order.fields` | `dpt_sale_management` | Dynamic fields trên SO |
| `dpt.sale.order.fields.selection` | `dpt_service_management` | Giá trị selection cho dynamic fields |
| `dpt.sale.service.management` | `dpt_sale_management` | Dịch vụ gắn trên SO |
| `dpt.sale.order.service.combo` | `dpt_sale_management` | Combo gắn trên SO |
| `dpt.contract.management` | `dpt_contract_management` | Quản lý hợp đồng |
| `dpt.contract.management.line` | `dpt_contract_management` | Chi tiết hợp đồng (file, template) |
| `dpt.contract.type` | `dpt_contract_management` | Loại hợp đồng |
| `dpt.contract.config` | `dpt_contract_management` | Cấu hình template HĐ |
| `dpt.legal.entity.config` | `dpt_contract_management` | Cấu hình pháp nhân |
| `dpt.contract.product.line` | `dpt_contract_management` | Chi tiết hàng hóa HĐ |
| `dpt.export.import` | `dpt_export_import` | Tờ khai hải quan |
| `dpt.export.import.line` | `dpt_export_import` | Dòng tờ khai |
| `dpt.export.import.gate` | `dpt_export_import` | Cửa khẩu |
| `dpt.product.brand` | `dpt_export_import` | Nhãn hiệu sản phẩm |
| `dpt.product.model` | `dpt_export_import` | Model sản phẩm |
| `dpt.product.description` | `dpt_export_import` | Mô tả sản phẩm HQ |
| `dpt.shipping.slip` | `dpt_shipping` | Phiếu vận chuyển |
| `dpt.shipping.slip.lot.quant` | `dpt_shipping` | Nhóm kiện trên phiếu VC |
| `dpt.vehicle.stage` | `dpt_shipping` | Trạng thái xe container |
| `dpt.vehicle.stage.log` | `dpt_shipping` | Log thay đổi stage xe |
| `dpt.okr.node` | `dpt_okr` | Node OKR |
| `dpt.todo` | `dpt_todo` | Todo list |
| `dpt.ai.agent` | `dpt_ai` | AI Agent config |
| `dpt.ai.chat` | `dpt_ai` | AI Chat session |
| `dpt.ai.tool` | `dpt_ai` | AI Tool definitions |
| `dpt.service.discount.policy` | `dpt_sale_discount` | Chính sách chiết khấu |
| `dpt.service.discount.tier` | `dpt_sale_discount` | Tier chiết khấu |
| `purchase.order.line.package` | `dpt_stock_management` | Package lines trên PO/Picking |
| `zalo.oa.template` | `dpt_zalo_oa` | Template Zalo OA |

### 12.2 Model Inherit Chính

| Model gốc | Module inherit | Thay đổi chính |
|-----------|----------------|----------------|
| `sale.order` | `dpt_sale_management` | +service_combo_ids, +sale_service_ids, +fields_ids, +locked, +legal_entity, state extended |
| `sale.order` | `dpt_settlement` | +create_invoice(), +_get_invoiced() |
| `sale.order` | `dpt_shipping` | +shipping liên kết |
| `purchase.order` | `dpt_purchase_management` | +package_line_ids |
| `stock.picking` | `dpt_stock_management` | +packing_lot_name, +sale_purchase_id, +is_main_incoming |
| `stock.warehouse` | `dpt_stock_management` | +is_main_incoming_warehouse, +is_tq_transit_warehouse, etc. |
| `res.currency` | `dpt_currency_management` | +category, +category_code, +legal_entity |
| `res.partner` | `dpt_res_partner` | +vendor_partner_ids, +dpt_type_of_partner, +dpt_gender, +legal_entity |
| `account.payment` | `dpt_account_payment_v2` | +payment flow, risk control |
| `helpdesk.ticket` | `dpt_helpdesk_ticket` | +sale_id liên kết |
| `approval.request` | multiple | +contract_id, +combo_id |

---

## 13. Patterns Code DPT — Thực tế từ Codebase

### 13.1 SO Locked Pattern — Write Guard

```python
# ✅ Pattern chuẩn DPT: kiểm tra locked trước khi write
def write(self, vals):
    if not self.env.context.get('bypass_locked'):
        bypass_fields = self.get_bypass_locked_fields()
        if any(field for field in vals.keys() if field not in bypass_fields):
            for order in self:
                if order.locked:
                    raise ValidationError(_(
                        "Đơn hàng %s đang bị khóa. Vui lòng mở khóa trước khi chỉnh sửa."
                    ) % order.name)
    return super().write(vals)

# ✅ Bypass locked khi cần (ví dụ: cập nhật từ tờ khai)
sale_order.with_context(bypass_locked=True).write({...})

# ✅ Unlock → Modify → Lock lại
sale_order.action_unlock()
sale_order.write({...})
sale_order.action_lock()
```

### 13.2 Dynamic Fields Generation Pattern

```python
# ✅ Pattern: Tự sinh fields từ service/combo
def _generate_fields_from_services(self):
    """Tự động tạo fields_ids từ sale_service_ids và service_combo_ids"""
    fields_dict = {}
    
    # Xử lý dịch vụ
    for sale_service in self.sale_service_ids:
        if not sale_service.service_id:
            continue
        for req_field in sale_service.service_id.required_fields_ids:
            field_key = (req_field.id, sale_service.service_id.id, 'service')
            rec = self._create_field_record(req_field, sale_service, 'service', ...)
            if rec:
                fields_dict[field_key] = rec
    
    # Xử lý combo
    for combo in self.service_combo_ids:
        if not combo.combo_id:
            continue
        for req_field in combo.combo_id.required_fields_ids:
            field_key = (req_field.id, combo.combo_id.id, 'combo')
            rec = self._create_field_record(req_field, combo, 'combo', ...)
            if rec:
                fields_dict[field_key] = rec
    
    # Rebuild fields_ids
    if fields_dict:
        sorted_vals = sorted(fields_dict.values(), key=lambda x: x["sequence"], reverse=True)
        self.fields_ids = [(5, 0, 0)]  # Xóa hết
        self.fields_ids = [(0, 0, item) for item in sorted_vals]
```

### 13.3 Shipping Stage Enforcement Pattern

```python
# ✅ Pattern: Kiểm tra thứ tự stage trong shipping slip write()
def write(self, vals):
    # Lưu stage trước khi write
    stage_before = {
        r.id: (r.vehicle_country, r.cn_vehicle_stage_id, ...)
        for r in self
    }
    res = super().write(vals)
    
    for record in self:
        country, cn_before, vn_before, last_vn_before = stage_before.get(record.id)
        
        if country == 'chinese':
            current_stage_id = cn_before
            next_stage_id = record.cn_vehicle_stage_id
            
            if current_stage_id == next_stage_id:
                continue
            
            # Guard: không skip stage
            if current_stage_id and next_stage_id:
                between = self.env['dpt.vehicle.stage'].search_count([
                    ('country', '=', 'chinese'),
                    ('sequence', '>', current_stage_id.sequence),
                    ('sequence', '<', next_stage_id.sequence),
                    ('can_bypass', '!=', True)
                ])
                if between:
                    raise ValidationError('Vui lòng cập nhật trạng thái theo đúng thứ tự')
                    
                # Guard: không quay lại
                if next_stage_id.sequence < current_stage_id.sequence:
                    raise ValidationError('Không được phép quay trở lại trạng thái trước đó')
            
            # Log stage change
            self.env['dpt.vehicle.stage.log'].create({...})
    
    return res
```

### 13.4 Tax Sync Pattern (Tờ khai → SO)

```python
# ✅ Pattern: Cập nhật thuế từ tờ khai vào dịch vụ SO
def update_tax_to_sale_order(self):
    self.ensure_one()
    
    # Guard: phải có SO
    if not self.sale_ids:
        return notification('warning', 'Tờ khai không liên kết SO')
    
    # Guard: chỉ lấy dòng valid
    valid_lines = self.line_ids.filtered(
        lambda l: l.state != 'draft' and l.sale_id and l.sale_id in self.sale_ids
    )
    
    for sale_order in sale_orders:
        # Unlock nếu cần
        if sale_order.locked:
            locked_orders[sale_order.id] = True
            sale_order.action_unlock()
        
        # Tìm hoặc tạo dịch vụ thuế
        vat_services = sale_order.sale_service_ids.filtered(
            lambda s: s.service_id.is_vat_service
        )
        if not vat_services:
            vat_service = self.env['dpt.service.management'].search(
                [('is_vat_service', '=', True)], limit=1
            )
            # Auto-create...
        
        # Tính và update
        total_vat = sum(eligible_lines.mapped('dpt_amount_tax_vat_customer'))
        vat_services[0].write({'price': total_vat, 'compute_value': 1.0})
        
        # Lock lại
        if locked_orders.get(sale_order.id):
            sale_order.action_lock()
```

### 13.5 Service Code Generation Pattern

```python
# ✅ Pattern: Tạo mã tự động
@api.model
def create(self, vals):
    if vals.get('code', 'NEW') == 'NEW':
        vals['code'] = self._generate_service_code()
    rec = super().create(vals)
    rec.action_create_product_id()  # Auto-create linked product
    return rec

def _generate_service_code(self):
    sequence = self.env['ir.sequence'].next_by_code('dpt.service.management') or '00'
    return f'{sequence}'

# Pattern cho shipping slip:
def _generate_service_code(self):
    date_str = fields.Datetime.now().strftime('%d%m%y')
    code = self.vehicle_id.code if self.vehicle_id else 'C'
    prefix = f"{code}/{date_str}"
    num_shipping = self.env['dpt.shipping.slip'].sudo().search_count(
        [('name', 'ilike', prefix + '/%'), ('id', '!=', self.id)])
    return f'{prefix}/{(num_shipping + 1):02d}'
```

### 13.6 Approval Integration Pattern

```python
# ✅ Pattern: Tạo approval request từ model nghiệp vụ
def action_submit_approval(self):
    self.ensure_one()
    
    # Guard: phải có dữ liệu
    if not self.service_ids:
        raise UserError(_('Không thể gửi phê duyệt khi chưa có dịch vụ nào.'))
    
    # Guard: không tạo trùng
    if self.approval_id and self.approval_id.request_status != 'refused':
        raise UserError(_('Đã tồn tại yêu cầu phê duyệt.'))
    
    # Guard: phải có cấu hình
    approval_type = self.env['approval.category'].search(
        [('sequence_code', '=', 'SCM')], limit=1
    )
    if not approval_type:
        raise UserError(_('Chưa cấu hình loại phê duyệt.'))
    
    # Happy Path: tạo approval
    vals = {
        'name': _('Phê duyệt: %s') % self.name,
        'category_id': approval_type.id,
        'date': fields.Datetime.now(),
        'request_owner_id': self.env.user.id,
        'reference': f'dpt.service.combo,{self.id}',
        'combo_id': self.id,
    }
    approval_request = self.env['approval.request'].create(vals)
    approval_request.action_confirm()
    
    self.write({
        'state': 'pending',
        'approval_id': approval_request.id,
    })
```

---

## 14. SQL Patterns DPT

### 14.1 Direct SQL cho Performance

```python
# ✅ Pattern: Bulk update bằng SQL khi ORM quá chậm
self.env.cr.execute("""
    UPDATE stock_picking sp
    SET total_weight = COALESCE(s.tw, 0),
        total_volume = COALESCE(s.tv, 0)
    FROM (
        SELECT picking_id,
            SUM(CEIL(ROUND((weight * quantity)::numeric, 2))) as tw,
            SUM(CEIL(ROUND((volume * quantity * 100)::numeric, 4)) / 100) as tv
        FROM purchase_order_line_package
        WHERE picking_id IN %s
        GROUP BY picking_id
    ) s
    WHERE sp.id = s.picking_id
""", [tuple(picking_ids.ids)])
picking_ids.invalidate_recordset(['total_weight', 'total_volume'])
```

### 14.2 Delete Move Lines bằng SQL

```python
# ✅ Pattern: Xóa move lines trước khi tạo mới
move_ids = transfer_picking.move_ids_without_package.ids
if move_ids:
    self.env.cr.execute("""
        DELETE FROM stock_move_line 
        WHERE move_id IN %s
    """, [tuple(move_ids)])
    transfer_picking.move_ids_without_package.invalidate_recordset(['move_line_ids'])
```

---

## 15. Cron Jobs DPT

| Module | Method | Mô tả |
|--------|--------|--------|
| `dpt_service_management` | `dpt.service.combo._cron_check_expired_combos()` | Tự động hết hạn combo |
| `dpt_contract_management` | `dpt.contract.management._cron_auto_set_expired()` | Tự động hết hạn hợp đồng |
| `dpt_account_payment_v2` | (cron_data.xml) | Thanh toán tự động |

---

## 16. Context Flags DPT

| Context Key | Mô tả | Module |
|-------------|--------|--------|
| `bypass_locked` | Bỏ qua check locked khi write SO | `dpt_sale_management` |
| `skip_sync_shipping_to_ticket` | Không sync stage khi update shipping | `dpt_shipping` |
| `skip_sync_ticket_to_shipping` | Không sync stage khi update ticket | `dpt_shipping` |
| `skip_move_line_in_confirm` | Bỏ qua tạo move_line khi confirm picking | `dpt_shipping` |
| `creating_tq_ctq_transfer` | Bypass validate khi tạo phiếu Container TQ | `dpt_shipping` |
| `mail_notrack` | Tắt tracking mail (tăng tốc) | Common |
| `mail_create_nolog` | Tắt tạo log note khi create | Common |
| `tracking_disable` | Tắt tracking thay đổi trường | Common |

---

## 17. Anti-patterns DPT — Lỗi thường gặp

### 17.1 ❌ Quên check locked

```python
# ❌ Sai — write trực tiếp không check locked
sale_order.write({'sale_service_ids': [...]})

# ✅ Đúng — hoặc dùng bypass context hoặc unlock/lock
sale_order.with_context(bypass_locked=True).write({...})
# hoặc
sale_order.action_unlock()
sale_order.write({...})
sale_order.action_lock()
```

### 17.2 ❌ Tuple cũ trong M2M (vẫn còn trong codebase)

```python
# ❌ Vẫn còn trong shipping slip — CẦN REFACTOR
item.out_picking_ids = [(6, 0, out_picking_ids.ids)]

# ✅ Nên dùng Command API
item.out_picking_ids = [Command.set(out_picking_ids.ids)]
```

### 17.3 ❌ f-string trong _() 

```python
# ❌ Vẫn còn trong codebase — CẦN SỬA
raise UserError(f"Vui lòng xác nhận phiếu {picking.name}")

# ✅ Đúng
raise UserError(_(
    "Vui lòng xác nhận phiếu %(name)s", name=picking.name
))
```

### 17.4 ❌ Hardcode chuỗi tiếng Việt không _()

```python
# ❌ Vẫn còn nhiều nơi
raise ValidationError("Vui lòng cấu hình kho chuyển phía Trung Quốc")

# ✅ Đúng
raise ValidationError(_("Vui lòng cấu hình kho chuyển phía Trung Quốc"))
```

### 17.5 ❌ create() không có @api.model_create_multi

```python
# ❌ Trong dpt_service_management
@api.model
def create(self, vals):
    ...

# ✅ Đúng Odoo 17
@api.model_create_multi
def create(self, vals_list):
    for vals in vals_list:
        ...
    return super().create(vals_list)
```

---

## 18. Quy tắc Naming Convention DPT

| Thành phần | Pattern | Ví dụ |
|-----------|---------|-------|
| Module name | `dpt_{domain}_{subdomain}` | `dpt_sale_management` |
| Model name | `dpt.{domain}.{entity}` | `dpt.service.management` |
| Field name | snake_case tiếng Anh | `legal_entity`, `declaration_type` |
| Selection key | lowercase + underscore | `'draft'`, `'wait_approve'`, `'container_tq'` |
| Sequence code | Module-specific | `dpt.service.management`, `dpt.service.combo` |
| Approval code | UPPERCASE | `'SCM'`, `'PHEDUYETTATOANDUKIEN'` |
| Boolean flags | `is_{description}` | `is_vat_service`, `is_main_incoming` |

---

## 19. Lean Code Checklist — DPT Extension

Ngoài checklist chuẩn (Section 11), thêm:

- [ ] **Check locked** — `bypass_locked` context khi write SO
- [ ] **Legal entity** — Pháp nhân đúng cho currency rate lookup
- [ ] **Context flags** — `skip_sync_*`, `mail_notrack` khi batch operation
- [ ] **Invalidate recordset** — Sau mọi raw SQL update
- [ ] **Approval category** — Kiểm tra `sequence_code` tồn tại trước khi tạo request
- [ ] **Stage sequence** — Enforce thứ tự khi update vehicle stage
- [ ] **Service flags** — `is_vat_service`, `is_import_tax_service` dùng đúng
- [ ] **Warehouse flags** — `is_main_incoming_warehouse`, `is_tq_transit_warehouse`
- [ ] **Tuple cũ → Command API** — Refactor khi touch file
- [ ] **f-string → _() format** — Refactor khi touch file
