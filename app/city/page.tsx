import { redirect } from "next/navigation";

// /city เปล่า ๆ ไม่มีเนื้อหาของตัวเอง — พากลับหน้าเลือกเมือง
export default function CityIndexPage() {
  redirect("/");
}
