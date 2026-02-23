import { s as supabase } from '../../../chunks/supabase_C4BMIjoJ.mjs';
import { c as corsHeaders } from '../../../chunks/cors_CyQSzBcn.mjs';
export { renderers } from '../../../renderers.mjs';

const GET = async ({ request }) => {
  const cors = corsHeaders(request);
  if (!supabase) {
    return json({ error: "Database not configured" }, 503, cors);
  }
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const { data, error } = await supabase.from("puzzles").select("id, title, description, difficulty, input_data, release_date, created_at").eq("release_date", today).single();
  if (error || !data) {
    return json({ error: "No puzzle available for today", date: today }, 404, cors);
  }
  return json(data, 200, {
    ...cors,
    "Cache-Control": "public, max-age=60, stale-while-revalidate=300"
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
