// GET /api/graph/[id]
//   - 找到则返回 200 + { node, upstream, downstream, related, edges }
//   - 找不到则返回 404 + { error: "Node not found" }
import { NextResponse } from "next/server";
import { getNodeWithNeighbors } from "@/lib/graph-data";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const result = getNodeWithNeighbors(id);

  if (!result) {
    return NextResponse.json(
      { error: "Node not found" },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}
