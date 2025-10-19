import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(bodyParser.json());

// 👇 ให้ Express เสิร์ฟไฟล์จากโฟลเดอร์ web
app.use(express.static(path.join(__dirname, "web")));

// ---------- DATABASE CONFIG ----------
const db = new pg.Pool({
  connectionString: process.env.DATABASE_URL || "postgres://postgres:2406@localhost:5433/t_shop",
});
db.connect()
  .then(() => console.log("✅ Connected to PostgreSQL database successfully"))
  .catch((err) => console.error("❌ Failed to connect to database:", err.message));

// ---------- REGISTER ----------
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.json({ error: "กรุณากรอกข้อมูลให้ครบ" });

  try {
    const hash = await bcrypt.hash(password, 10);
    await db.query(
      "INSERT INTO users (username, password, role) VALUES ($1, $2, 'user')",
      [username, hash]
    );
    res.json({ message: "สมัครสมาชิกสำเร็จ" });
  } catch (err) {
    if (err.code === "23505") res.json({ error: "มีชื่อผู้ใช้นี้อยู่แล้ว" });
    else res.json({ error: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์" });
  }
});

// ---------- LOGIN ----------
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.json({ error: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน" });

  try {
    const result = await db.query("SELECT * FROM users WHERE username=$1", [username]);
    if (result.rows.length === 0)
      return res.json({ error: "ไม่พบชื่อผู้ใช้นี้" });

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.json({ error: "รหัสผ่านไม่ถูกต้อง" });

    res.json({ message: "เข้าสู่ระบบสำเร็จ", role: user.role });
  } catch (err) {
    res.json({ error: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์" });
  }
});

// ---------- RUN SERVER ----------
const PORT = 3000;
app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
