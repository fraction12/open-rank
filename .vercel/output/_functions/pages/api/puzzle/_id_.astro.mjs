import { s as supabase } from '../../../chunks/supabase_C4BMIjoJ.mjs';
import { c as corsHeaders } from '../../../chunks/cors_CyQSzBcn.mjs';
export { renderers } from '../../../renderers.mjs';

const GET = async ({ params, request }) => {
  const cors = corsHeaders(request);
  const { id } = params;
  if (!id) {
    return json({ error: "Missing puzzle id" }, 400, cors);
  }
  if (!supabase) {
    return json({ error: "Database not configured" }, 503, cors);
  }
  const { data, error } = await supabase.from("puzzles").select("id, title, description, difficulty, input_data, release_date, created_at").eq("id", id).single();
  if (error || !data) {
    return json({ error: "Puzzle not found" }, 404, cors);
  }
  return json(data, 200, {
    ...cors,
    "Cache-Control": "public, max-age=3600"
  });
};
function json(data, status, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...headers }
  });
}

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
