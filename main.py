#ใช้Python3
"""
Main launcher for Gambit Master Chess & AI Training Lab.
"""
import sys
import os
import uvicorn

# สำหรับการแก้ไขปัญหาเกี่ยวกับการนำเข้าโมดูลในโฟลเดอร์เดียวกัน{[บัคบ่อย]}
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))


def main():
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "127.0.0.1")

    print("=" * 65)
    print("♟️  GAMBIT MASTER: TOP STYLE CHESS & AI BOT TRAINING LAB  ♟️")
    print("=" * 65)
    print(f"🚀 Server starting at: http://{host}:{port}")
    print(f"📂 Open your browser and navigate to: http://{host}:{port}")
    print("=" * 65)

    uvicorn.run("app.server:app", host=host, port=port, reload=False, log_level="info")


if __name__ == "__main__":
    main()
