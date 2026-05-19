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
