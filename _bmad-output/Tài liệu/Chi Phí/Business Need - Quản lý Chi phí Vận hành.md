# Business Need: Chức năng Quản lý Chi phí Vận hành

**Dự án:** DPT SOFT – Kỳ Tốc Logistics
**Phiên bản:** 1.1
**Ngày:** 05/05/2026
**Người soạn:** Business Analyst

---

## 1. Bối cảnh & Vấn đề

Kỳ Tốc Logistics vận hành hành lang logistics xuyên biên giới Trung Quốc – Việt Nam. Quy trình vận hành được tổ chức thành **các chặng** (5 chặng: từ kho TQ → lưu kho TQ → xe container TQ → xe container VN → kho VN & giao chặng cuối). Trên mỗi chặng phát sinh nhiều khoản chi phí gắn với các **đối tượng vận hành** khác nhau (đơn hàng, xe container, tờ khai nhập khẩu, hàng hóa…).

Mục tiêu cuối cùng: **mọi chi phí đều được phân bổ về từng đơn hàng** để xác định lãi/lỗ chính xác.

**Vấn đề hiện tại:**
- Chi phí được quản lý phân tán trên nhiều file Excel, không có nguồn dữ liệu chuẩn (master data) cho danh mục chi phí và bảng giá NCC.
- Không có cơ chế kiểm soát chênh lệch giữa **Chi phí dự kiến** (lúc tạo trên đối tượng vận hành) và **Chi phí thực tế** (sau khi đối chiếu công nợ với NCC).
- Phân bổ chi phí chung của xe / tờ khai về từng đơn hàng làm thủ công, dễ sai sót.
- Mỗi đầu mục chi phí có nhiều bảng giá khác nhau (theo NCC, loại xe, khoảng cách, kg/m³, bậc thang…) nhưng chưa được hệ thống hóa.
- Kế toán phải xác định tài khoản và mã phân loại quản trị bằng tay, tốn thời gian và dễ nhầm.

**Business Value:**
- Chuẩn hóa danh mục chi phí và bảng giá NCC → giảm sai sót, dễ tra cứu, dễ điều chỉnh khi giá thị trường thay đổi.
- Tự động tính chi phí dự kiến ngay khi nghiệp vụ phát sinh trên đối tượng vận hành.
- Đối chiếu chi phí thực tế khi nhận bảng đối chiếu công nợ NCC, kiểm soát chênh lệch.
- Phân bổ tự động chi phí về đơn hàng theo quy tắc cấu hình → minh bạch lãi/lỗ.

---

## 2. Phạm vi Chức năng

Chức năng Quản lý Chi phí Vận hành bao gồm **4 nhóm chức năng chính**:

1. Quản lý Danh mục Chi phí (mô hình hóa giống Dịch vụ)
2. Quản lý Bảng giá NCC cho Chi phí
3. Ghi nhận Chi phí theo Chặng trên Đối tượng Vận hành (dự kiến & thực tế)
4. Phân bổ Chi phí về Đơn hàng

---

## 3. Quản lý Danh mục Chi phí

Đầu mục chi phí được mô hình hóa **giống cấu trúc của Dịch vụ** đã có trong hệ thống — tận dụng cùng cách tổ chức master data và cùng cơ chế cấu hình bảng giá đa dạng. Điều này giúp:
- Tái sử dụng UI / quy trình quản lý đã quen thuộc.
- Hỗ trợ nhiều bảng giá song song trên cùng một đầu mục chi phí.
- Đồng bộ dữ liệu Doanh thu (Dịch vụ) ↔ Chi phí (1-1 mapping) khi cùng phát sinh trên một nghiệp vụ.

### 3.1 Các trường thông tin của Đầu mục Chi phí

| Trường | Mô tả |
|--------|-------|
| Mã chi phí | Mã định danh duy nhất |
| Tên chi phí | Tên hiển thị nghiệp vụ |
| Nhóm / Danh mục cha | Phân nhóm theo cây danh mục (cho phép nhiều cấp) |
| Chặng áp dụng | Một hoặc nhiều chặng vận hành |
| Phòng ban quản lý | Đơn vị nghiệp vụ chịu trách nhiệm |
| Đối tượng ghi nhận | Đơn hàng / Xe container / Tờ khai nhập khẩu / Hàng hóa / … (cấu hình được) |
| Cơ sở phân bổ về đơn | Theo kg / Theo m³ / Theo giá trị / Theo số đơn / Trực tiếp |
| Mô tả / Định nghĩa | Diễn giải nghiệp vụ |
| Trạng thái | Đang dùng / Ngưng dùng |
| Liên kết Dịch vụ tương ứng | (Tùy chọn) — tham chiếu Dịch vụ sinh doanh thu cùng nghiệp vụ |
| **Danh sách Bảng giá** | Tập các bảng giá NCC gắn với đầu mục chi phí này (1-n). Mỗi bảng giá có NCC, hiệu lực thời gian, phương pháp định giá, đơn vị tiền tệ — chi tiết tại mục 4. |
| **Danh sách Trường thông tin** | Tập các trường tùy biến gắn với đầu mục chi phí — dùng làm **tham số tính giá** (đầu vào cho công thức bảng giá) hoặc **trường ghi chú** (chỉ lưu thông tin). Chi tiết tại mục 3.3. |

> Ghi chú: Các trường mang tính tài chính/kế toán (đơn vị tính, loại chi phí, tài khoản kế toán, mã BFC/BLC/SFC, thời điểm ghi nhận) **không thuộc về đầu mục chi phí**. Chúng được cấu hình ở các tầng phù hợp khác (bảng giá, quy tắc hạch toán, cấu hình kế toán).

### 3.3 Danh sách Trường thông tin (Custom Fields) của Đầu mục Chi phí

Mỗi đầu mục chi phí có thể khai báo một tập **trường thông tin tùy biến** để mô tả các thuộc tính nghiệp vụ riêng. Các trường này phục vụ 2 mục đích:

1. **Tham số tính giá** — là đầu vào cho công thức tra bảng giá (ví dụ: loại xe, khoảng cách, trọng lượng, cửa khẩu, tuyến…).
2. **Trường ghi chú** — chỉ lưu thông tin nghiệp vụ, không tham gia tính giá (ví dụ: số phiếu, mã chuyến, ghi chú phát sinh…).

**Thuộc tính của mỗi trường thông tin:**

| Thuộc tính | Mô tả |
|------------|-------|
| Mã trường | Định danh duy nhất trong phạm vi đầu mục |
| Tên hiển thị | Nhãn hiển thị trên form ghi nhận |
| Kiểu dữ liệu | Số / Văn bản / Ngày / Lựa chọn (dropdown) / Tham chiếu master data (NCC, Loại xe, Cửa khẩu, Tuyến…) |
| Vai trò | **Tham số tính giá** / **Ghi chú** |
| Bắt buộc | Có / Không |
| Giá trị mặc định | (Tùy chọn) |
| Danh sách giá trị | Áp dụng cho kiểu Lựa chọn |
| Thứ tự hiển thị | Sắp xếp trên form |

**Cách sử dụng:**
- Khi ghi nhận chi phí trên đối tượng vận hành, hệ thống render form theo các trường khai báo trên đầu mục.
- Các trường có vai trò **Tham số tính giá** sẽ được truyền vào engine tra bảng giá để xác định đơn giá phù hợp (xem mục 4.3 – Tiêu chí áp dụng bảng giá).
- Các trường có vai trò **Ghi chú** chỉ được lưu để tra cứu / báo cáo.

### 3.2 Cấu trúc cây danh mục
- Hỗ trợ phân cấp nhiều tầng (ví dụ: Chặng → Nhóm dịch vụ → Đầu mục chi tiết).
- Cho phép thêm/sửa/xóa đầu mục mà không cần can thiệp dev.
- Đầu mục chi phí là master data dùng chung cho toàn hệ thống ghi nhận chi phí.

---

## 4. Quản lý Bảng giá NCC

Bảng giá chi phí được cấu hình **giống bảng giá Dịch vụ**, hỗ trợ đa dạng cách định giá và đa dạng NCC.

### 4.1 Yêu cầu chung
- Một đầu mục chi phí có thể có **nhiều bảng giá** từ **nhiều NCC** khác nhau, hoặc nhiều bảng giá theo điều kiện áp dụng khác nhau.
- Mỗi bảng giá có **hiệu lực theo thời gian** (Valid From – Valid To).
- Hệ thống tự động chọn bảng giá phù hợp khi tính chi phí dự kiến dựa trên các tiêu chí áp dụng.
- Lưu **lịch sử bảng giá** để đối soát chi phí quá khứ.

### 4.2 Các phương pháp định giá cần hỗ trợ

| Loại định giá | Mô tả | Ví dụ |
|---------------|-------|-------|
| Đơn giá cố định | Một mức giá theo đơn vị tính | 10 CNY/m³ |
| Đơn giá theo bậc thang | Giá thay đổi theo khối lượng/kích thước/số lượng | <3.000kg: giá A; 3.000–4.000kg: giá B; >4.000kg: giá C |
| Đơn giá theo loại xe | Khác nhau theo loại phương tiện | Xe 9.6m / 13m / 17m / 20m |
| Đơn giá theo khoảng cách | Theo cự ly vận chuyển | <5km / 5–9km / 10–14km / … / >300km |
| Đơn giá ma trận | Kết hợp 2+ tiêu chí (loại xe × khoảng cách) | Bảng cước chặng cuối |
| Đơn giá theo tuyến | Theo cặp điểm đầu – điểm cuối | Kho HN → HCM nội thành; Kho HN → Ga Sóng Thần |
| Đơn giá theo điều kiện đặc biệt | Theo cửa khẩu, kho, loại hàng… | Hữu Nghị vs Tân Thanh |
| Báo giá riêng (Custom Quote) | Không có giá cố định, nhập khi phát sinh | Hàng quá khổ, kiểm tra chuyên ngành |
| Giá tham chiếu định mức | Dùng để ước tính khi không có bảng giá NCC | Định mức nội bộ |

### 4.3 Tiêu chí áp dụng bảng giá (cấu hình được)
- Nhà cung cấp
- Loại xe / Loại hàng / Loại đối tượng
- Cửa khẩu / Tuyến / Điểm đầu – điểm cuối
- Khoảng kg / khoảng m³ / khoảng giá trị
- Khách hàng (nếu giá đặc thù theo khách)
- Khoảng thời gian hiệu lực

### 4.4 Đơn vị tiền tệ
- Hỗ trợ đa tệ (VND, CNY, USD, …) — đơn vị tiền tệ thuộc về **bảng giá**, không thuộc về đầu mục chi phí.
- Mỗi bút toán chi phí cho phép chọn lại tiền tệ (mặc định lấy từ bảng giá), kèm **tỷ giá vốn** dùng quy đổi sang VND. Tỷ giá vốn mặc định lấy theo tỷ giá hiện hành của tiền tệ đó tại ngày ghi nhận, cho phép override tay vì giá vốn có thể khác tỷ giá hạch toán.
- **Phân bổ chi phí về đơn hàng và tổng hợp giá vốn luôn tính bằng VND** sau khi đã quy đổi — đảm bảo nhất quán khi 1 đơn gánh chi phí từ nhiều tệ khác nhau (CNY chặng 1-3, VND chặng 4-5).

---

## 5. Ghi nhận Chi phí Dự kiến theo Chặng

> **Phạm vi giai đoạn này:** chỉ ghi nhận **chi phí dự kiến** (do nhân viên vận hành tạo trên đối tượng vận hành). Phần ghi nhận **chi phí thực tế** (đối chiếu công nợ NCC, sinh bút toán kế toán) thuộc nghiệp vụ kế toán và sẽ được triển khai ở **giai đoạn sau** dưới dạng *"Ghi nhận công nợ dự kiến và đối soát công nợ thực tế"*. Tuy nhiên schema dữ liệu (DB) cần được thiết kế sao cho không phải refactor lớn khi mở rộng phase 2.

### 5.1 Luồng ghi nhận Chi phí Dự kiến
1. Người dùng tạo/cập nhật đối tượng vận hành (đơn hàng, phiếu vận chuyển, tờ khai XNK).
2. Hệ thống xác định các đầu mục chi phí áp dụng (theo chặng và đối tượng).
3. Với mỗi đầu mục:
   - Nếu có **bảng giá** áp dụng → hệ thống tự động tra bảng giá NCC còn hiệu lực, lấy đơn giá phù hợp với tiêu chí áp dụng và tính thành tiền dự kiến = đơn giá × khối lượng/số lượng.
   - Nếu **không có bảng giá** (chi phí phát sinh / báo giá riêng) → nhân viên tự tính ngoài và **nhập tay giá trị** vào đối tượng vận hành.
4. Lưu bút toán chi phí dự kiến gắn với đối tượng vận hành.
5. Cho phép người dùng điều chỉnh tay khi cần (ghi log thay đổi).

### 5.2 Đối tượng ghi nhận
Giai đoạn này tập trung vào 3 đối tượng vận hành chính:
- **Đơn hàng** (`sale.order`)
- **Phiếu vận chuyển / Xe** (`dpt.shipping.slip`)
- **Tờ khai XNK** (`dpt.export.import`)

Mỗi đối tượng có một **tab Chi phí** liệt kê toàn bộ các đầu mục chi phí dự kiến phát sinh.

### 5.3 (Phase 2) Ghi nhận Chi phí Thực tế — *out of scope giai đoạn này*
Sẽ làm sau khi hoàn thiện luồng dự kiến. Hướng triển khai dự kiến:
- Cuối kỳ kế toán nhận bảng đối chiếu công nợ NCC → import vào hệ thống.
- Match dòng đối chiếu ↔ bút toán chi phí dự kiến tương ứng.
- Đối chiếu Dự kiến vs. Thực tế trên từng đối tượng; chênh lệch quá ngưỡng → cảnh báo + giải trình + block thanh toán.
- Sinh bút toán kế toán (account.move) khi chốt thực tế.

---

## 6. Phân bổ Chi phí về Đơn hàng

### 6.1 Nguyên tắc
Tất cả chi phí — dù được ghi nhận trên đối tượng nào — cuối cùng đều phải quy về từng đơn hàng để tính giá vốn và lãi/lỗ.

| Loại chi phí | Phương pháp phân bổ |
|--------------|---------------------|
| Ghi nhận đích danh trên đơn hàng (chặng 2, 5, thủ tục) | Giữ nguyên (không phân bổ) |
| Ghi nhận trên xe (chở nhiều đơn — chặng 3, 4) | Phân bổ về đơn theo **sản lượng tính phí** (xem mục 6.2) |
| Ghi nhận trên tờ khai (gồm nhiều đơn) | Phân bổ về đơn theo **sản lượng tính phí** (xem mục 6.2) |

### 6.2 Quy tắc phân bổ chi phí xe / tờ khai về đơn hàng

Phân bổ theo **Sản lượng tính phí** — chuẩn hóa giữa kg và m³ theo tỷ trọng của xe / tờ khai. Công thức gồm 4 bước:

**Bước 1 — Tính Tỷ trọng xe:**
```
Tỷ trọng xe = Tổng kg trên xe (hoặc tờ khai) / Tổng m³ trên xe (hoặc tờ khai)
```

**Bước 2 — Tính Sản lượng tính phí của mỗi đơn:**
```
Sản lượng tính phí (đơn i) = MAX( Tỷ trọng xe × m³ của đơn i , kg của đơn i )
```
Quy tắc MAX đảm bảo đơn hàng nào "nặng" hơn so với mặt bằng tỷ trọng xe sẽ tính theo kg, đơn hàng nào "nhẹ và cồng kềnh" sẽ tính theo m³ đã quy đổi.

**Bước 3 — Tính Tỷ lệ phân bổ:**
```
Tỷ lệ phân bổ (đơn i) = Sản lượng tính phí (đơn i) / Tổng Sản lượng tính phí của tất cả đơn trên xe (tờ khai)
```

**Bước 4 — Tính Chi phí phân bổ cho mỗi đơn:**
```
Chi phí phân bổ (đơn i) = Tổng chi phí cha (xe / tờ khai) × Tỷ lệ phân bổ (đơn i)
```

> Quy tắc này áp dụng cho **toàn bộ chi phí ghi nhận trên xe và trên tờ khai** (chặng 1, 3, 4 — kèm theo các dịch vụ chặng cuối). Chi phí ghi nhận đích danh trên đơn hàng (chặng 2, chặng 5, một số khoản thủ tục) giữ nguyên không qua bước phân bổ.

### 6.3 Tab Chi phí trên Đơn hàng

Mỗi đơn hàng có một **tab "Chi phí"** chứa **2 bảng tách biệt** để hiển thị rõ ràng nguồn gốc chi phí:

**Bảng 1 — Chi phí đích danh trên đơn**
Liệt kê các bút toán chi phí ghi nhận trực tiếp trên đơn này (chặng 2, chặng 5, thủ tục…).

| Cột | Nội dung |
|-----|----------|
| Đầu mục chi phí | Tên chi phí |
| Chặng | 1 → 5 |
| NCC | Đối tác |
| Số lượng / Đơn vị | Theo bảng giá |
| Đơn giá | |
| Thành tiền (Dự kiến) | |
| **Tổng cộng** | **Tổng chi phí đích danh dự kiến trên đơn** |

**Bảng 2 — Chi phí phân bổ từ các đối tượng**
Liệt kê các khoản chi phí được phân bổ về đơn này từ xe / tờ khai (chặng 1, 3, 4).

| Cột | Nội dung |
|-----|----------|
| Đầu mục chi phí | Tên chi phí |
| Đối tượng gốc | Xe / Tờ khai (link đến đối tượng nguồn) |
| Tổng chi phí đối tượng gốc (Dự kiến) | |
| Tỷ lệ phân bổ | Theo Sản lượng tính phí |
| Phân bổ về đơn (Dự kiến) | |
| **Tổng cộng** | **Tổng chi phí phân bổ dự kiến về đơn** |

**Phần tổng hợp ở đầu/cuối tab:**

| Trường | Nội dung |
|--------|----------|
| Tổng chi phí đích danh (Dự kiến) | Từ Bảng 1 |
| Tổng chi phí phân bổ (Dự kiến) | Từ Bảng 2 |
| **Tổng chi phí trên đơn — Giá vốn dự kiến** | = Đích danh + Phân bổ |
| Doanh thu | Tổng doanh thu từ các Dịch vụ trên đơn |
| **Lợi nhuận gộp dự kiến** | Doanh thu − Tổng chi phí dự kiến |
| **% Biên lợi nhuận dự kiến** | Lợi nhuận gộp / Doanh thu |

Mục đích: cho phép theo dõi **giá vốn và lãi/lỗ dự kiến** trên từng đơn hàng ngay khi đơn được tạo, đối chiếu trực tiếp giữa Doanh thu (sinh từ Dịch vụ) và Chi phí (sinh từ đầu mục Chi phí), đồng thời truy vết được nguồn gốc từng khoản chi phí.

> Phase 2 sẽ bổ sung các cột Thực tế / Chênh lệch vào cùng 2 bảng và phần tổng hợp.

### 6.4 Thời điểm phân bổ
- Phân bổ ngay khi đối tượng cha có chi phí dự kiến → có giá vốn dự kiến để báo giá / theo dõi.
- Cho phép **rerun** phân bổ khi danh sách đơn trên đối tượng cha thay đổi.

### 6.5 Báo cáo (giai đoạn này)
- Chi phí dự kiến theo đơn hàng (chi tiết từng đầu mục, từng chặng).
- Chi phí dự kiến theo xe / theo tờ khai / theo chặng.
- Lãi/lỗ dự kiến theo đơn hàng / theo xe / theo kỳ.

---

## 7. Yêu cầu nghiệp vụ tóm tắt

| Mã | Yêu cầu |
|----|---------|
| BN-01 | Quản lý danh mục chi phí dạng cây phân cấp, mô hình hóa giống Dịch vụ; cấu hình được không cần dev |
| BN-02 | Quản lý bảng giá NCC cho từng đầu mục chi phí, hỗ trợ đa NCC, đa phương pháp định giá (cố định, bậc thang, ma trận, theo tuyến, theo điều kiện…) |
| BN-03 | Bảng giá có hiệu lực theo thời gian, có lịch sử, hỗ trợ đa tệ |
| BN-04 | Tự động tính chi phí dự kiến khi người dùng tạo/cập nhật nghiệp vụ trên đối tượng vận hành |
| BN-05 | Hỗ trợ ghi nhận chi phí dự kiến trên 3 đối tượng: đơn hàng, phiếu vận chuyển, tờ khai XNK |
| BN-06 | Phân bổ chi phí dự kiến về đơn hàng theo công thức Sản lượng tính phí |
| BN-07 | Cho phép rerun phân bổ khi danh sách đơn trên đối tượng cha thay đổi |
| BN-08 | Báo cáo chi phí dự kiến theo đơn / xe / chặng / kỳ; báo cáo lãi/lỗ dự kiến |
| BN-09 | Đầu mục chi phí có liên kết tùy chọn với Dịch vụ tương ứng để đảm bảo mapping Doanh thu ↔ Chi phí 1-1 |
| BN-10 | Đơn hàng có tab "Chi phí" hiển thị: chi phí đích danh, chi phí phân bổ, tổng giá vốn dự kiến, doanh thu, lợi nhuận gộp dự kiến, % biên dự kiến |
| BN-11 | Mô hình dữ liệu các đối tượng chi phí được thiết kế **học theo mô hình Dịch vụ** (master data, custom fields, bảng giá) để đồng nhất cấu trúc và dễ mở rộng |
| BN-12 | Schema DB phải hỗ trợ mở rộng phase 2 (ghi nhận thực tế + đối soát công nợ NCC) mà không phải refactor lớn |

---

## 8. Out of Scope (Giai đoạn này)

- Tích hợp tự động API với phần mềm kế toán bên ngoài (chỉ xuất file).
- Quản lý hoàn thuế (đã có module riêng).
- Forecasting / dự báo nhu cầu vận chuyển.
- Quản lý hợp đồng NCC (chỉ lưu bảng giá đính kèm).

---

## 9. Phụ lục – Tham chiếu

> File `Chi phí .xlsx` đính kèm là **ví dụ minh họa** dữ liệu chi phí thực tế hiện tại của doanh nghiệp (5 sheet tương ứng 5 chặng + sheet bảng quy đổi xe + sheet hoàn thuế). Tài liệu Business Need này được viết ở mức tổng quát: cấu trúc danh mục, cách thức cấu hình bảng giá, cách ghi nhận và phân bổ — không liệt kê chi tiết từng đầu mục/đơn giá cụ thể vì các giá trị đó sẽ được nhập vào hệ thống dưới dạng master data và sẽ thay đổi theo thời gian.

| Nguồn | Nội dung |
|-------|----------|
| `Chi phí .xlsx` | Ví dụ minh họa dữ liệu chi phí 5 chặng và bảng giá NCC |
| `Tài liệu FS v1.md` | Functional Spec v1 – User Stories & Functional Requirements liên quan |
