import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.24.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { week_of } = await req.json();

    if (!week_of) {
      throw new Error("week_of is required (YYYY-MM-DD format)");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const anthropic = new Anthropic({
      apiKey: Deno.env.get("ANTHROPIC_API_KEY")!,
    });

    // Calculate week end
    const weekStart = new Date(week_of);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndStr = weekEnd.toISOString().split("T")[0];

    // Get all raw inputs for the week
    const { data: inputs } = await supabase
      .from("raw_inputs")
      .select("content, created_at")
      .gte("created_at", week_of)
      .lt("created_at", weekEndStr)
      .order("created_at", { ascending: true });

    // Get all mentions for the week with people and projects
    const { data: mentions } = await supabase
      .from("mentions")
      .select(`
        snippet,
        person:people(name),
        project:projects(name)
      `)
      .eq("week_of", week_of);

    // Get action items created this week
    const { data: actions } = await supabase
      .from("action_items")
      .select(`
        description,
        priority,
        completed,
        person:people(name)
      `)
      .gte("created_at", week_of)
      .lt("created_at", weekEndStr);

    if (!inputs || inputs.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "No inputs for this week" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format data for Claude
    const inputsSummary = inputs.map((i, idx) => `[${idx + 1}] ${i.content}`).join("\n\n");
    
    const mentionsSummary = mentions?.map(m => {
      const parts = [];
      if (m.person) parts.push(`Person: ${(m.person as any).name}`);
      if (m.project) parts.push(`Project: ${(m.project as any).name}`);
      parts.push(`"${m.snippet}"`);
      return parts.join(" | ");
    }).join("\n") || "None";

    const actionsSummary = actions?.map(a => {
      const person = a.person ? ` (${(a.person as any).name})` : "";
      const status = a.completed ? "✓" : "○";
      return `${status} [${a.priority}] ${a.description}${person}`;
    }).join("\n") || "None";

    // Generate summary with Claude Sonnet (better for synthesis)
    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Generate a concise weekly journal summary based on these notes. Write in second person ("You..."). Be specific about what happened, who was involved, and what progress was made. Highlight any patterns or themes.

RAW NOTES FROM THE WEEK:
${inputsSummary}

KEY MENTIONS:
${mentionsSummary}

ACTION ITEMS:
${actionsSummary}

Write a 2-3 paragraph summary that:
1. Highlights the main themes and progress
2. Notes key people interactions
3. Identifies what moved forward vs what's still pending
4. Ends with a brief "looking ahead" if relevant

Keep it natural and useful - this is for the person to quickly remember what happened. No headers or bullet points, just flowing prose.`
        }
      ],
    });

    const summary = message.content[0].type === "text" ? message.content[0].text : "";

    // Upsert the weekly journal
    const { error: upsertError } = await supabase
      .from("weekly_journals")
      .upsert({
        week_of: week_of,
        summary: summary,
        generated_at: new Date().toISOString(),
      }, {
        onConflict: "week_of",
      });

    if (upsertError) {
      throw upsertError;
    }

    return new Response(
      JSON.stringify({ success: true, summary }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Generate journal error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
