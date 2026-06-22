// GET /api/graph/search?q=keyword
//   - 大小写不敏感匹配 name / aliases.term，返回匹配节点列表（最多 20 条）
//   - 静态路由优先于 [id] 动态路由，因此 /api/graph/search 不会被 [id] 拦截
import { NextResponse } from "next/server";
import { searchNodes } from "@/lib/graph-data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";

  const results = searchNodes(q);
  return NextResponse.json(results, {
    headers: { "Cache-Control": "no-store" },
  });
}
