# Database & UI Design — Quản lý Chi phí Vận hành

**Phiên bản:** 1.1
**Ngày:** 05/05/2026
**Tài liệu liên quan:** `Business Need - Quản lý Chi phí Vận hành.md`

---

## 1. Nguyên tắc thiết kế

Hệ thống hiện đã có sẵn **bộ khung quản lý Dịch vụ + Bảng giá + Trường thông tin** rất linh hoạt. Mục tiêu của thiết kế này là **mở rộng nguyên trạng** để đầu mục Chi phí dùng chung hạ tầng đó:

| Hạ tầng có sẵn | Vai trò hiện tại | Mở rộng cho Chi phí |
|----------------|------------------|----------------------|
| `dpt.service.management` | Master Dịch vụ | Tạo model **mới** `dpt.cost.management` cùng cấu trúc |
| `dpt.service.management.required.fields` | Trường thông tin của Dịch vụ (đã có `service_id`, `combo_id`) | **Thêm trường `cost_id`** — cùng bảng dùng cho cả 3 owner |
| `product.pricelist` | Bảng giá khách hàng (state, version, partner, item_ids domain service) | **Thêm `cost_item_ids`** (domain `cost_id != False`) |
| `product.pricelist.item` | Dòng bảng giá (đã có `service_id`, `combo_id`) | **Thêm trường `cost_id`** — cùng bảng dùng cho cả 3 owner |
| `product.pricelist.item.detail` | Chi tiết tier/condition (`field_ids` → required.fields, `condition_type` simple/or/and) | Tự động dùng được nhờ `field_ids` đã hỗ trợ trường có `cost_id` |
| `dpt.sale.order.fields` | Giá trị trường nhập trên SO (đã có `sale_service_id`, `sale_combo_id`) | **Thêm `cost_line_id`** — tái sử dụng cho việc nhập giá trị trường khi ghi nhận chi phí |
| `dpt.sale.order.fields.selection` | Tập giá trị Selection cho trường | Dùng nguyên |

Mới hoàn toàn:
- `dpt.cost.management` — Master Đầu mục Chi phí
- `dpt.cost.line` — Bút toán chi phí trên đối tượng vận hành
- `dpt.cost.allocation.line` — Dòng phân bổ chi phí về Đơn hàng

---

## 2. Cơ sở dữ liệu

### 2.1 Sơ đồ tổng quan

```
┌─────────────────────────────┐         ┌─────────────────────────────┐
│  dpt.service.management     │         │  dpt.cost.management        │
│  (HIỆN CÓ)                  │         │  (MỚI — học theo Service)   │
└──────────────┬──────────────┘         └──────────────┬──────────────┘
               │                                       │
               │   ┌───────────────────────────────────┘
               │   │
               ▼   ▼
   ┌─────────────────────────────────────────────────┐
   │  dpt.service.management.required.fields         │  HIỆN CÓ
   │   • service_id  (đã có)                         │
   │   • combo_id    (đã có)                         │
   │   • cost_id     ← THÊM (tương đương service_id) │
   └─────────────────────────────────────────────────┘
                   ▲
                   │ field_ids (m2m) — đã có
                   │
   ┌────────────────────────────────────────┐
   │  product.pricelist.item.detail         │  HIỆN CÓ — không sửa
   │   • condition_type, field_ids, ...     │
   │   • compared_field_id                  │
   └─────────────────┬──────────────────────┘
                     │ item_id
                     ▼
   ┌─────────────────────────────────────────────────┐
   │  product.pricelist.item                         │  HIỆN CÓ
   │   • service_id  (đã có)                         │
   │   • combo_id    (đã có)                         │
   │   • cost_id     ← THÊM                          │
   │   • compute_price: fixed / times_pricing_fields │
   │     / percentage / formula / table              │
   └─────────────────┬───────────────────────────────┘
                     │ pricelist_id
                     ▼
   ┌─────────────────────────────────────────────────┐
   │  product.pricelist                              │  HIỆN CÓ
   │   • partner_id, state, version                  │
   │   • item_ids       (service)  — đã có           │
   │   • combo_item_ids (combo)    — đã có           │
   │   • cost_item_ids  (cost)     ← THÊM            │
   └─────────────────────────────────────────────────┘


┌──────────────┐  ┌────────────────────────┐  ┌────────────────────┐
│  sale.order  │  │  dpt.shipping.slip     │  │  dpt.export.import │
│              │  │  (Phiếu vận chuyển/Xe) │  │  (Tờ khai XNK)     │
│              │  │  total_weight,         │  │  dpt_n_w_kg,       │
│              │  │  total_volume,         │  │  total_cubic_meters│
│              │  │  sale_ids (m2m)        │  │  sale_ids (m2m)    │
└──────┬───────┘  └────────┬───────────────┘  └─────────┬──────────┘
       │                   │                            │
       └─────────┬─────────┴────────────┬───────────────┘
                 │                      │
                 ▼                      ▼
       ┌────────────────────┐  ┌─────────────────────────────┐
       │  dpt.cost.line     │──│ dpt.cost.allocation.line    │
       │  (bút toán CP)     │  │ (phân bổ về SO)             │
       └─────────┬──────────┘  └─────────────────────────────┘
                 │ fields_ids
                 ▼
       ┌────────────────────────────────┐
       │  dpt.sale.order.fields         │  HIỆN CÓ — THÊM cost_line_id
       │  (giá trị các trường nhập tay) │
       └────────────────────────────────┘
```

### 2.2 Mở rộng các model có sẵn

#### 2.2.1 `dpt.service.management.required.fields` — thêm `cost_id`

```python
class RequiredField(models.Model):
    _inherit = 'dpt.service.management.required.fields'

    cost_id = fields.Many2one('dpt.cost.management', string='Cost', ondelete='cascade', tracking=True)

    @api.constrains('service_id', 'combo_id', 'cost_id')
    def _check_owner_unique(self):
        for r in self:
            owners = [bool(r.service_id), bool(r.combo_id), bool(r.cost_id)]
            if sum(owners) != 1:
                raise ValidationError(_("Trường thông tin chỉ được thuộc về 1 trong 3: Service, Combo, Cost"))
```

`unlink()` cần được mở rộng tương tự để log lên cost_id.

#### 2.2.2 `product.pricelist.item` — thêm `cost_id`

```python
class ProductPricelistItem(models.Model):
    _inherit = 'product.pricelist.item'

    cost_id = fields.Many2one('dpt.cost.management', 'Cost Item', tracking=True, copy=True)
```

- Thừa hưởng nguyên trạng: `compute_price` (fixed/times_pricing_fields/percentage/formula/table), `pricelist_table_detail_ids`, `last_pricelist_item_id` (kế thừa bảng giá gốc), `price_unit2/3`, các logic phê duyệt.
- Hàm `onchange_service_get_root_information` cần nhân bản thành `onchange_cost_get_root_information` (tương tự combo).

#### 2.2.3 `product.pricelist` — thêm `cost_item_ids`

```python
class ProductPricelist(models.Model):
    _inherit = 'product.pricelist'

    cost_item_ids = fields.One2many('product.pricelist.item', 'pricelist_id', string='Bảng giá Chi phí',
                                    domain=[('cost_id', '!=', False)], copy=True)
```

- Pricelist có thể là **bảng giá khách hàng** (chứa item Service/Combo) hoặc **bảng giá NCC chi phí** (chứa item Cost).
- Có thể bổ sung trường `pricelist_kind` (`customer` / `vendor_cost`) để filter UI rõ ràng, nhưng KHÔNG bắt buộc — cùng pricelist có thể chứa cả 3 loại item.
- Validation `action_validation_pricelist` mở rộng: với pricelist NCC kiểm tra theo `partner_id` (NCC) thay vì khách hàng.

#### 2.2.4 `dpt.sale.order.fields` — thêm `cost_line_id`

```python
class SaleOrderField(models.Model):
    _inherit = 'dpt.sale.order.fields'

    cost_line_id = fields.Many2one('dpt.cost.line', ondelete='cascade')
```

- Giữ nguyên `sale_id`, `sale_service_id`, `sale_combo_id` cho luồng cũ.
- Khi ghi nhận chi phí trên đối tượng vận hành → tạo `dpt.cost.line` + nhiều `dpt.sale.order.fields` với `cost_line_id` set, `sale_id` để trống (hoặc set theo đối tượng cha nếu là SO).
- Hàm tính giá trên cost.line tái sử dụng `valid_pricelist_detail()` của `product.pricelist.item.detail` (truyền type='cost').

### 2.3 Model mới

#### 2.3.1 `dpt.cost.management` — Đầu mục Chi phí

```python
class DPTCostManagement(models.Model):
    _name = 'dpt.cost.management'
    _inherit = ['mail.thread', 'mail.activity.mixin', 'utm.mixin']
    _description = 'DPT Cost Item'
    _order = 'create_date DESC'

    code = fields.Char('Code', default='NEW', copy=False, index=True, tracking=True)
    name = fields.Char('Name', required=True, tracking=True)
    stage_ids = fields.Many2many('dpt.cost.stage', string='Stages', tracking=True)  # 1..5
    department_id = fields.Many2one('hr.department', 'Department', tracking=True)
    object_type = fields.Selection([
        ('order',         'Đơn hàng'),
        ('shipping_slip', 'Phiếu vận chuyển (Xe)'),
        ('export_import', 'Tờ khai XNK'),
    ], 'Đối tượng ghi nhận', required=True, tracking=True,
       help='Quy tắc phân bổ được suy ra từ trường này:\n'
            '  • order  → đích danh (không phân bổ)\n'
            '  • shipping_slip / export_import → phân bổ về SO theo Sản lượng tính phí')
    service_id = fields.Many2one('dpt.service.management', 'Dịch vụ tương ứng',
                                 help='Mapping doanh thu ↔ chi phí (1-1)')
    description = fields.Text('Description')
    active = fields.Boolean('Active', default=True)

    # Reuse pattern của Service
    required_fields_ids = fields.One2many('dpt.service.management.required.fields', 'cost_id',
                                          string='Required Fields', copy=True)
    pricelist_item_ids = fields.One2many('product.pricelist.item', 'cost_id',
                                         string='Bảng giá', copy=False)

    allow_edit_without_approval = fields.Boolean('Cho sửa bảng giá không cần duyệt', default=False)

    _sql_constraints = [('code_uniq', 'unique (code)', "Code already exists!")]
```

#### 2.3.2 `dpt.cost.stage` — Master Chặng (1..5)

```python
class DPTCostStage(models.Model):
    _name = 'dpt.cost.stage'
    _order = 'sequence'
    sequence = fields.Integer()
    code = fields.Char()    # C1..C5
    name = fields.Char()    # Mô tả chặng
```

#### 2.3.3 `dpt.cost.line` — Bút toán chi phí

```python
class DPTCostLine(models.Model):
    _name = 'dpt.cost.line'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _description = 'DPT Cost Line'

    cost_id = fields.Many2one('dpt.cost.management', 'Đầu mục chi phí', required=True, tracking=True)
    object_type = fields.Selection([
        ('order','Đơn hàng'),
        ('shipping_slip','Phiếu vận chuyển (Xe)'),
        ('export_import','Tờ khai XNK'),
    ], related='cost_id.object_type', store=True)

    sale_id = fields.Many2one('sale.order', 'Đơn hàng', tracking=True, ondelete='cascade')
    shipping_slip_id = fields.Many2one('dpt.shipping.slip', 'Phiếu vận chuyển', tracking=True, ondelete='cascade')
    export_import_id = fields.Many2one('dpt.export.import', 'Tờ khai XNK', tracking=True, ondelete='cascade')

    partner_id = fields.Many2one('res.partner', 'NCC', tracking=True)
    pricelist_id = fields.Many2one('product.pricelist', 'Bảng giá áp dụng', tracking=True)
    pricelist_item_id = fields.Many2one('product.pricelist.item', 'Item bảng giá đã match')

    fields_ids = fields.One2many('dpt.sale.order.fields', 'cost_line_id', 'Trường thông tin')

    quantity = fields.Float('Số lượng', default=1.0, tracking=True,
                            help='Mặc định lấy theo đơn vị tính của bảng giá (kg, m³, kiện, lượt, xe…). '
                                 'Nếu không có bảng giá → mặc định 1.')
    uom_id = fields.Many2one('uom.uom', 'Đơn vị',
                             help='Lấy từ bảng giá đã match. Khi không có bảng giá có thể bỏ trống.')

    # ─── Đa tệ & quy đổi giá vốn ───
    currency_id = fields.Many2one('res.currency', 'Tiền tệ', required=True, tracking=True,
                                  default=lambda s: s.env.company.currency_id,
                                  help='Lấy mặc định từ bảng giá NCC; user có thể chọn lại '
                                       '(VD: chặng 1+2 thường là CNY, chặng 4+5 thường là VND).')
    company_currency_id = fields.Many2one('res.currency', related='env.company.currency_id',
                                          string='Tiền tệ công ty (VND)')
    exchange_rate = fields.Float('Tỷ giá vốn', digits=(12, 6), tracking=True,
                                 help='Tỷ giá quy đổi từ Tiền tệ sang VND (đây là **tỷ giá vốn**, '
                                      'có thể khác tỷ giá hạch toán). Mặc định lấy từ '
                                      '`res.currency.rate` của Tiền tệ tại ngày ghi nhận; '
                                      'user có thể override.')
    rate_date = fields.Date('Ngày tỷ giá', default=fields.Date.context_today, tracking=True)

    unit_price = fields.Monetary('Đơn giá', currency_field='currency_id', tracking=True)
    amount = fields.Monetary('Thành tiền', currency_field='currency_id',
                             compute='_compute_amount', store=True, readonly=False, tracking=True)
    amount_company_currency = fields.Monetary('Thành tiền (VND)', currency_field='company_currency_id',
                                              compute='_compute_amount_company_currency', store=True,
                                              help='= amount × exchange_rate — dùng cho phân bổ và tổng hợp giá vốn.')

    state = fields.Selection([
        ('draft',   'Nháp'),
        ('planned', 'Dự kiến'),
    ], default='draft', tracking=True)

    manual_input = fields.Boolean('Nhập tay (không có bảng giá)')

    allocation_line_ids = fields.One2many('dpt.cost.allocation.line', 'source_cost_line_id')

    @api.depends('quantity', 'unit_price')
    def _compute_amount(self):
        for r in self:
            r.amount = (r.quantity or 0) * (r.unit_price or 0)

    @api.depends('amount', 'exchange_rate')
    def _compute_amount_company_currency(self):
        for r in self:
            r.amount_company_currency = (r.amount or 0) * (r.exchange_rate or 1)

    @api.onchange('currency_id', 'rate_date')
    def _onchange_currency_get_default_rate(self):
        """Lấy tỷ giá mặc định của currency_id tại rate_date (từ res.currency.rate)."""
        for r in self:
            if r.currency_id and r.currency_id != r.company_currency_id:
                rate = r.currency_id._get_rates(r.env.company, r.rate_date or fields.Date.today())
                r.exchange_rate = rate.get(r.currency_id.id) or 1.0
            else:
                r.exchange_rate = 1.0

    def action_compute_price_from_pricelist(self):
        """Tra bảng giá theo cost_id + partner_id + fields_ids → set currency_id (từ pricelist),
        unit_price, uom_id, quantity (mặc định). Tỷ giá lấy từ currency_id."""
        # Tái sử dụng valid_pricelist_detail() của product.pricelist.item.detail
        ...
```

#### 2.3.4 `dpt.cost.allocation.line` — Dòng phân bổ về SO

```python
class DPTCostAllocationLine(models.Model):
    _name = 'dpt.cost.allocation.line'
    _description = 'DPT Cost Allocation Line'

    source_cost_line_id = fields.Many2one('dpt.cost.line', 'CP gốc', required=True, ondelete='cascade')
    sale_id = fields.Many2one('sale.order', 'Đơn hàng', required=True, ondelete='cascade')

    chargeable_quantity = fields.Float('Sản lượng tính phí')
    allocation_ratio = fields.Float('Tỷ lệ phân bổ')

    # Phân bổ luôn quy về VND (tiền tệ công ty) để tổng hợp giá vốn nhất quán
    amount = fields.Monetary('Phân bổ (VND)', currency_field='currency_id',
                             help='= source_cost_line_id.amount_company_currency × allocation_ratio')
    currency_id = fields.Many2one('res.currency', related='source_cost_line_id.company_currency_id', store=True)

    # Lưu thêm nguyên tệ để truy vết
    source_currency_id = fields.Many2one('res.currency', related='source_cost_line_id.currency_id')
    amount_source_currency = fields.Monetary('Phân bổ (nguyên tệ)', currency_field='source_currency_id',
                                             help='= source_cost_line_id.amount × allocation_ratio (dùng để audit)')
```

### 2.4 Mở rộng các đối tượng vận hành

`sale.order`, `dpt.shipping.slip`, `dpt.export.import` — thêm:

| Field | sale.order | dpt.shipping.slip | dpt.export.import |
|-------|------------|-------------------|--------------------|
| `cost_line_ids` | One2many → cost.line (sale_id) | One2many → cost.line (shipping_slip_id) | One2many → cost.line (export_import_id) |
| `cost_allocation_ids` | One2many → allocation.line | — | — |
| `total_direct_cost` (VND) | sum cost_line.amount_company_currency | sum cost_line.amount_company_currency | sum cost_line.amount_company_currency |
| `total_allocated_cost` (VND) | sum cost_allocation.amount | — | — |
| `total_cost` (VND) | direct + allocated | total of cost_line (VND) | total of cost_line (VND) |
| `chargeable_qty` | MAX(density × m³, kg) | computed (sử dụng `total_weight` / `total_volume` đã có sẵn → density) | computed (sử dụng `dpt_n_w_kg` / `total_cubic_meters` đã có sẵn → density) |
| `gross_profit` | revenue − total_cost | — | — |
| `gross_margin_pct` | gross_profit / revenue | — | — |

> Trên `dpt.shipping.slip`: **tận dụng** `total_weight`, `total_volume`, `sale_ids` đã có sẵn để tính tỷ trọng và lặp qua các đơn.
> Trên `dpt.export.import`: dùng `dpt_n_w_kg` / `total_cubic_meters` (đã có sẵn) làm tổng kg/m³, dùng `sale_ids` (m2m) hoặc `line_ids → sale_id` để lấy danh sách đơn cần phân bổ.

---

## 3. Thiết kế Giao diện

### 3.1 Master Data

**MH-01: Tree Đầu mục Chi phí** — Menu `Quản lý Chi phí → Đầu mục Chi phí`

```
┌────────────────────────────────────────────────────────────────────────┐
│ Đầu mục Chi phí                                  [+ Tạo] [Import]      │
├────────────────────────────────────────────────────────────────────────┤
│ Filters: [Chặng ▾] [Phòng ban ▾] [Đối tượng ▾] [Active ▾]   🔍         │
├──────┬──────────────────────────┬──────┬───────────┬──────────┬────────┤
│ Code │ Name                     │ Stage│ Object         │ Active │
├──────┼──────────────────────────┼──────┼────────────────┼────────┤
│ C001 │ Phí kéo hàng từ kho TC   │ C1   │ Order          │ ✓      │
│ C003 │ Cước xe container TQ     │ C3   │ Shipping Slip  │ ✓      │
│ ...  │                          │      │                │        │
└──────┴──────────────────────────┴──────┴────────────────┴────────┘
```

**MH-02: Form Đầu mục Chi phí** — clone bố cục form `dpt.service.management`

```
┌────────────────────────────────────────────────────────────────────────┐
│ Đầu mục: Cước xe container TQ                          [Lưu] [Hủy]     │
├────────────────────────────────────────────────────────────────────────┤
│ Code:        [C003          ]   Active: ●                              │
│ Name:        [Cước xe container TQ                                    ]│
│ Stages:      [☑ C3] [☐ C4]                                             │
│ Department:  [Chứng từ ▾]                                              │
│ Object type: (●) Shipping Slip ( ) Order ( ) Export Import             │
│ Service map: [DV-VC-TQ — Vận chuyển TQ ▾]                              │
├─ Tab: Required Fields ─────────────────────────────────────────────────┤
│  (Reuse view của dpt.service.management.required.fields, lọc theo cost)│
│ ┌────┬──────────┬───────┬───────────────┬───────────┬───────────┐      │
│ │Code│ Name     │ Type  │ Pricing Param │ Required  │ Selection │      │
│ ├────┼──────────┼───────┼───────────────┼───────────┼───────────┤      │
│ │NCC │ NCC      │ sel.  │ ✓             │ ✓         │ A Thành…  │      │
│ │XE  │ Loại xe  │ sel.  │ ✓             │ ✓         │ 9.6m, 13m │      │
│ │NOTE│ Ghi chú  │ char  │ ☐             │ ☐         │           │      │
│ └────┴──────────┴───────┴───────────────┴───────────┴───────────┘      │
├─ Tab: Bảng giá ────────────────────────────────────────────────────────┤
│ (Reuse view product.pricelist.item, filter [cost_id = self])           │
│ ┌──────────┬────────┬──────────────────┬──────────┬───────┬──────────┐ │
│ │Pricelist │ Partner│ Compute price    │ UoM      │Price  │ State    │ │
│ ├──────────┼────────┼──────────────────┼──────────┼───────┼──────────┤ │
│ │NCC AThanh│A Thành │ Table (theo loại)│ CNY/xe   │       │ Active   │ │
│ │NCC XK2   │ XK2    │ Table            │ CNY/xe   │       │ Active   │ │
│ └──────────┴────────┴──────────────────┴──────────┴───────┴──────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

**MH-03: Form Bảng giá Chi phí** — `product.pricelist` view hiện có
- Mở từ tab Bảng giá ở MH-02 với context `default_cost_id = active_id` → form `product.pricelist.item` mở ra; logic `onchange_cost_get_root_information` (clone từ service) tự fill từ pricelist gốc.
- Thêm menu phụ: `Quản lý Chi phí → Bảng giá NCC` — list `product.pricelist` filter `cost_item_ids != False`.

### 3.2 Ghi nhận Chi phí trên Đối tượng Vận hành

**MH-04: Tab Chi phí trên Đơn hàng (`sale.order`)**

```
┌────────────────────────────────────────────────────────────────────────┐
│ Sale Order: SO-S13079                       Doanh thu: 15.000.000 VND  │
│ ┌─[Info]─[Items]─[Services]─[Cost ⬤]─[Acct]─┐                         │
├────────────────────────────────────────────────────────────────────────┤
│ ▼ TỔNG HỢP                                                             │
│ ┌────────────────────────────────────────┬───────────────────────┐     │
│ │ Tổng CP đích danh                      │  1.675.106            │     │
│ │ Tổng CP phân bổ                        │  3.086.786            │     │
│ │ TỔNG CHI PHÍ (Giá vốn)                 │  4.761.892            │     │
│ │ Doanh thu                              │ 15.000.000            │     │
│ │ Lợi nhuận gộp                          │ 10.238.108            │     │
│ │ % Biên                                 │      68.3%            │     │
│ └────────────────────────────────────────┴───────────────────────┘     │
│                                                                        │
│ ▼ BẢNG 1 — CHI PHÍ ĐÍCH DANH (cost_line_ids object_type='order')       │
│ [+ Thêm chi phí]                                                       │
│ ┌─────┬─────────────┬────┬────┬────┬─────┬─────┬─────┬──────┬─────────┐│
│ │Stage│ Cost Item   │NCC │Qty │UoM │Price│ CCY │Rate │Amt   │Amt(VND) ││
│ ├─────┼─────────────┼────┼────┼────┼─────┼─────┼─────┼──────┼─────────┤│
│ │ C2  │ Bốc xếp TQ  │BX1 │5.19│ m³ │  10 │ CNY │3.550│ 51.9 │ 184.245 ││
│ │ C2  │ Gia cố pall.│ -  │ 2  │pal.│  50 │ CNY │3.550│  100 │ 355.000 ││
│ │ C5  │ Giao c.cuối │ADZ │ 1  │ xe │     │ VND │1    │1.135k│1.135.861││
│ ├─────┴─────────────┴────┴────┴────┴─────┴─────┴─────┴──────┼─────────┤│
│ │ Tổng (VND)                                                 │1.675.106││
│ └────────────────────────────────────────────────────────────┴─────────┘│
│                                                                        │
│ ▼ BẢNG 2 — CHI PHÍ PHÂN BỔ (cost_allocation_ids)                       │
│ ┌──────────────┬───────────┬─────┬───────────┬──────┬─────────┐        │
│ │ Cost Item    │ Source    │ CCY │Total src  │ Ratio│ Amt(VND)│        │
│ ├──────────────┼───────────┼─────┼───────────┼──────┼─────────┤        │
│ │ Cước xe TQ C3│ Xe CL21II↗│ CNY │ 20.704 CNY│0.042 │3.086.786│        │
│ │ Phí thông qua│ TK 12345 ↗│ VND │11.000.000 │0.042 │  462.000│        │
│ │ ...          │           │     │           │      │         │        │
│ ├──────────────┴───────────┴─────┴───────────┴──────┼─────────┤        │
│ │ Tổng (VND)                                         │3.086.786│        │
│ └────────────────────────────────────────────────────┴─────────┘        │
└────────────────────────────────────────────────────────────────────────┘
```

Khi click `[+ Thêm chi phí]`:
- Popup form `dpt.cost.line` (object_type=order, sale_id=current).
- Chọn `cost_id` → load các required field qua `onchange` (giống cách SO load required field từ service).
- User nhập giá trị các trường vào `fields_ids` (dùng widget hiện có của `dpt.sale.order.fields`).
- Click `Tính giá` → engine tra `product.pricelist.item` matching `cost_id`, `partner_id`, validity → trả `unit_price`, `uom_id`, `quantity` (mặc định) → `amount = qty × unit_price` (computed). Nếu không match → `manual_input=True`, `quantity=1`, user tự nhập `unit_price` hoặc `amount`.

**MH-05: Tab Chi phí trên Phiếu vận chuyển (`dpt.shipping.slip`)**

```
┌────────────────────────────────────────────────────────────────────────┐
│ Shipping Slip: CL21II   (delivery_slip_type=container_tq)              │
│ total_weight: 25.890   total_volume: 118.27   Density: 218.94          │
│ ┌─[Info]─[Orders]─[Cost ⬤]─[Allocation]─┐                             │
├────────────────────────────────────────────────────────────────────────┤
│ ▼ CHI PHÍ TRÊN XE (cost_line_ids)                  [+ Thêm chi phí]   │
│ ┌─────┬─────────────┬────┬───┬────┬─────┬─────┬─────┬──────┬─────────┐│
│ │Stage│ Cost Item   │NCC │Qty│UoM │Price│ CCY │Rate │Amt   │Amt(VND) ││
│ ├─────┼─────────────┼────┼───┼────┼─────┼─────┼─────┼──────┼─────────┤│
│ │ C3  │ Cước xe TQ  │A T.│ 1 │ xe │1.500│ CNY │3.550│ 1.500│5.325.000││
│ │ C3  │ Lưu ca xe TQ│A T.│ 2 │ngày│  500│ CNY │3.550│ 1.000│3.550.000││
│ │ C4  │ Cước xe VN  │H Y.│ 1 │ xe │     │ VND │1    │9.000k│9.000.000││
│ ├─────┴─────────────┴────┴───┴────┴─────┴─────┴─────┴──────┼─────────┤│
│ │ Tổng (VND)                                                │xx.xxx.k ││
│ └───────────────────────────────────────────────────────────┴─────────┘│
│                                                                        │
│ ▼ PHÂN BỔ VỀ ĐƠN HÀNG                          [Tính lại phân bổ]     │
│ ┌────────┬──────┬──────┬──────────┬──────┬──────────────┐              │
│ │ Order  │ Kg   │ m³   │ Charge.Q │ Ratio│ Phân bổ      │              │
│ ├────────┼──────┼──────┼──────────┼──────┼──────────────┤              │
│ │ S13079 │  750 │ 5.19 │ 1.136,30 │0.042 │   3.086.786  │              │
│ │ S13174 │   73 │ 0.11 │     73   │0.003 │     198.306  │              │
│ │ ...    │      │      │          │      │              │              │
│ └────────┴──────┴──────┴──────────┴──────┴──────────────┘              │
└────────────────────────────────────────────────────────────────────────┘
```

**MH-06: Tab Chi phí trên Tờ khai XNK (`dpt.export.import`)** — bố cục giống MH-05, đối tượng cha là tờ khai. Dùng `dpt_n_w_kg`/`total_cubic_meters` để tính density, lặp qua `sale_ids` (hoặc `line_ids.sale_id` distinct) để phân bổ.

### 3.3 Báo cáo
- **MH-07**: Pivot `Lãi/lỗ dự kiến theo SO` — Sale × (Revenue / Direct Cost / Allocated Cost / Total Cost / GP / GM%).
- **MH-08**: Báo cáo Chi phí dự kiến theo Stage / Shipping Slip / Export Import / NCC — drill-down.

### 3.4 (Phase 2) Ghi nhận Thực tế & Đối soát Công nợ NCC — *out of scope*
Phase 2 sẽ bổ sung các trường thực tế (`unit_price_actual`, `amount_actual`, `variance`…) và màn hình Đối chiếu công nợ NCC. Schema `dpt.cost.line` ở giai đoạn này **chưa chứa** các trường này — sẽ được bổ sung khi triển khai phase 2.

---

## 4. Luồng nghiệp vụ chính

### 4.1 Tạo bút toán chi phí dự kiến
```
[User Vận hành] mở Sale Order → tab Cost → "+ Thêm chi phí"
   ↓ chọn cost_id
[onchange cost_id] load required_fields_ids → render form fields_ids
   ↓ user nhập giá trị + chọn NCC
[Click "Tính giá"]
   ↓
   Tìm product.pricelist.item match: cost_id, partner_id (NCC), pricelist active, validity
   ↓
   For mỗi pricelist_table_detail_id: gọi valid_pricelist_detail(self, cost_line, cost_id, type='cost')
   ↓
   Match → uom_id (lấy từ pricelist), quantity (mặc định lấy theo trường tính giá tương ứng:
              kg / m³ / số kiện…), unit_price → amount = qty × unit_price (computed)
   No match → manual_input=True, quantity=1 (mặc định), uom_id=None,
              user nhập tay unit_price (hoặc trực tiếp amount)
   ↓
state='planned'
```

### 4.2 Phân bổ chi phí Phiếu vận chuyển / Tờ khai XNK → SO
```
Trigger: shipping_slip.write hoặc click [Tính lại phân bổ]
   ↓
Compute trên shipping_slip (dpt.shipping.slip):
  Σkg = total_weight, Σm³ = total_volume   (đã có sẵn — _compute_information)
  density = Σkg / Σm³
  For mỗi sale_id ∈ shipping_slip.sale_ids:
    chargeable_qty(đơn) = MAX(density × m³_đơn, kg_đơn)
  Σchargeable = Σ chargeable_qty các đơn

For mỗi cost_line ∈ shipping_slip.cost_line_ids:
  For mỗi sale_id:
    ratio = chargeable_qty / Σchargeable
    upsert dpt.cost.allocation.line(
        source_cost_line_id, sale_id, chargeable_quantity, allocation_ratio=ratio,
        amount_source_currency = cost_line.amount × ratio,            # nguyên tệ (audit)
        amount = cost_line.amount_company_currency × ratio,           # VND (dùng tổng hợp giá vốn)
    )
```

Lặp lại tương tự cho `dpt.export.import`: lấy Σkg = `dpt_n_w_kg` (hoặc `dpt_g_w_kg`), Σm³ = `total_cubic_meters`, danh sách đơn lấy từ `sale_ids` (m2m) hoặc `line_ids.sale_id` distinct.

### 4.3 (Phase 2) Đối chiếu công nợ cuối kỳ — *out of scope*
Hướng triển khai dự kiến: kế toán import bảng đối chiếu NCC → match dòng ↔ `cost.line(state='planned')` → cập nhật giá trị thực tế → rerun phân bổ → block thanh toán nếu chênh lệch vượt ngưỡng → chốt → sinh `account.move`.

---

## 5. Tóm tắt mở rộng so với hệ thống hiện có

| Loại | Đối tượng | Hành động |
|------|-----------|-----------|
| **Thêm field** | `dpt.service.management.required.fields` | `cost_id` (m2o → cost.management) + constraint XOR với service_id/combo_id |
| **Thêm field** | `product.pricelist.item` | `cost_id` (m2o → cost.management) + clone onchange logic từ service |
| **Thêm field** | `product.pricelist` | `cost_item_ids` (one2many domain cost_id≠False) |
| **Thêm field** | `dpt.sale.order.fields` | `cost_line_id` (m2o → cost.line) |
| **Mới** | Model `dpt.cost.management`, `dpt.cost.stage` | Master data |
| **Mới** | Model `dpt.cost.line`, `dpt.cost.allocation.line` | Transaction |
| **Mới** | View MH-01..MH-08 (giai đoạn này) | UI |
| **Mới** | Tab "Cost" trên `sale.order` / `dpt.shipping.slip` / `dpt.export.import` (chỉ Dự kiến) | View extension |
| **Tái sử dụng 100%** | `product.pricelist.item.detail` (tier/condition logic) | Không sửa, chỉ truyền type='cost' khi gọi |
| **Tái sử dụng 100%** | View `dpt.sale.order.fields` (widget nhập giá trị trường) | Dùng nguyên |
| **Tái sử dụng 100%** | Approval workflow của `product.pricelist` | Dùng nguyên (có thể cấu hình sequence_code riêng cho NCC) |

---

## 6. Roadmap triển khai

### Phase 1 — Ghi nhận Chi phí Dự kiến (giai đoạn này)

| Sprint | Hạng mục | Output |
|--------|----------|--------|
| 1 | Mở rộng schema: thêm `cost_id` vào required.fields & pricelist.item; thêm `cost_item_ids` vào pricelist; tạo `dpt.cost.management`, `dpt.cost.stage`, `dpt.cost.line`, `dpt.cost.allocation.line` | DB schema + migration |
| 2 | Form Cost Item (MH-01, MH-02) — tab Required Fields & Bảng giá. Clone `onchange_cost_get_root_information` | UI master data |
| 3 | Tích hợp UI bảng giá ở context Cost (MH-03). Import master data từ Excel ví dụ | Test với data thật |
| 4 | `dpt.cost.line` + Tab Cost (chỉ Dự kiến) trên SO, Shipping Slip, Export Import (MH-04, 05, 06). Engine tra giá tái dùng `valid_pricelist_detail` | Ghi nhận dự kiến hoạt động |
| 5 | `dpt.cost.allocation.line` + thuật toán Sản lượng tính phí. Computed totals + GP/GM dự kiến trên SO | Phân bổ + lãi/lỗ dự kiến |
| 6 | Reports MH-07, MH-08 (dự kiến) | Báo cáo |

### Phase 2 — Ghi nhận Thực tế & Đối soát Công nợ NCC (giai đoạn sau, do kế toán)
- Bổ sung các field thực tế (`unit_price_actual`, `amount_actual`, `variance`…) vào `dpt.cost.line` và `dpt.cost.allocation.line`.
- Thêm màn hình Đối chiếu công nợ NCC (import bảng đối chiếu, match dòng dự kiến ↔ thực tế).
- Logic block thanh toán + giải trình + bằng chứng + phê duyệt khi vượt định mức.
- Sinh `account.move` khi chốt thực tế.
