import { s as supabase } from '../../../chunks/supabase_C4BMIjoJ.mjs';
export { renderers } from '../../../renderers.mjs';

const GET = async () => {
  if (!supabase) {
    return new Response(JSON.stringify({ error: "Database not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" }
    });
  }
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const { data, error } = await supabase.from("puzzles").select("id, title, description, difficulty, input_data, release_date, created_at").eq("release_date", today).single();
  if (error || !data) {
    return new Response(
      JSON.stringify({ error: "No puzzle available for today", date: today }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300"
    }
  });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
