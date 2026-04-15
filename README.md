# Zorola

Prototype lay anh tu Zalo Web ve local.

## Project Context

Agent/project context lives in [AGENTS.md](AGENTS.md).

Planning docs:

- [docs/plans/zorola-project-plan.md](docs/plans/zorola-project-plan.md)
- [docs/daily/2026-04-15.md](docs/daily/2026-04-15.md)

## Setup

```bash
npm install
```

Lan dau chay, tool se tu tao `config/app.local.json` tu file mau. Sua `groupName` trong file do de de nho group can mo.

## Chay thu lay anh

```bash
npm run zalo:collect
```

Luồng chạy:

1. Tool mở Chrome/Zalo Web.
2. Bạn login nếu cần.
3. Bạn tự mở đúng group Zalo cần lấy ảnh.
4. Quay lại Terminal và nhấn Enter.
5. Tool cuộn ngược lịch sử vài vòng, tìm ảnh đang load trên trang, lưu ảnh mới vào `data/images/collected/`.

Checkpoint nằm ở `data/checkpoint.json`, dùng để không lưu lại ảnh đã tải ở lần chạy trước.

Nếu tool báo `Tong candidate: 0`, nó sẽ ghi debug vào:

```text
data/debug/<timestamp>/
```

Thư mục này có `page.png`, `report.json`, và `page.html`. Gửi lại `report.json` hoặc ảnh chụp `page.png` để chỉnh selector theo DOM thực tế của Zalo Web.

## Config Chính

```json
{
  "zalo": {
    "groupName": "TEN_GROUP_ZALO",
    "browserChannel": "chrome",
    "headless": false,
    "profileDir": "data/chrome-profile",
    "maxImages": 30,
    "scrollRounds": 8,
    "scrollPauseMs": 1200
  }
}
```

Tăng `scrollRounds` nếu muốn cuộn xa hơn. Tăng `maxImages` nếu muốn tải nhiều ảnh hơn trong một lần chạy thử.

## Luu y khi chay tren server SSH

Prototype hien tai can Chrome co giao dien de ban login Zalo Web va tu mo group. Neu chay tren Ubuntu server qua SSH khong co `$DISPLAY`, Chrome se khong mo duoc.

Co 3 cach thu:

1. Chay project tren may macOS/Windows co giao dien.
2. Cai remote desktop/VNC cho Ubuntu server roi chay trong terminal cua desktop session do.
3. Dung `xvfb-run npm run zalo:collect` chi khi session Zalo da san sang va khong can thao tac tay. Cach nay khong tien cho lan login dau.
