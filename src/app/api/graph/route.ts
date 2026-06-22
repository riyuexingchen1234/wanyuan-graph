// GET /api/graph
//   - 无 query：返回完整图谱 { nodes, edges }
//   - ?q=keyword：返回匹配的节点列表（大小写不敏感匹配 name / aliases.term，最多 20 条）
import { NextResponse } from "next/server";
import { getFullGraph, searchNodes } from "@/lib/graph-data";

// 始终动态渲染，不缓存
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  const headers = { "Cache-Control": "no-store" };

  // 搜索分支：?q= 参数存在即触发搜索（空字符串也视为搜索，返回空列表）
  if (q !== null) {
    const results = searchNodes(q);
    return NextResponse.json(results, { headers });
  }

  // 默认分支：返回全图
  const graph = getFullGraph();
  return NextResponse.json(graph, { headers });
}
