import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.24.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExtractionResult {
  people: Array<{
    name: string;
    context?: string;
  }>;
  projects: Array<{
    name: string;
    context?: string;
  }>;
  action_items: Array<{
    description: string;
    person_name?: string;
    due_date?: string;
    priority: "high" | "medium" | "low";
  }>;
  mentions: Array<{
    person_name?: string;
    project_name?: string;
    snippet: string;
  }>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { input_id } = await req.json();

    if (!input_id) {
      throw new Error("input_id is required");
    }

    // Initialize clients
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const anthropic = new Anthropic({
      apiKey: Deno.env.get("ANTHROPIC_API_KEY")!,
    });

    // Get the raw input
    const { data: input, error: inputError } = await supabase
      .from("raw_inputs")
      .select("*")
      .eq("id", input_id)
      .single();

    if (inputError || !input) {
      throw new Error(`Input not found: ${inputError?.message}`);
    }

    // Get existing people and projects for context
    const [{ data: existingPeople }, { data: existingProjects }] = await Promise.all([
      supabase.from("people").select("name, aliases").limit(100),
      supabase.from("projects").select("name").limit(50),
    ]);

    const peopleContext = existingPeople?.map(p => p.name).join(", ") || "none yet";
    const projectsContext = existingProjects?.map(p => p.name).join(", ") || "none yet";

    // Call Claude for extraction
    const message = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Extract structured information from this note. Be thorough but accurate.

EXISTING PEOPLE IN SYSTEM: ${peopleContext}
EXISTING PROJECTS IN SYSTEM: ${projectsContext}

NOTE TO PROCESS:
"""
${input.content}
"""

Extract and return as JSON:
1. people: Array of {name, context?} - any person mentioned (match to existing if similar)
2. projects: Array of {name, context?} - any project/initiative mentioned (match to existing if similar, use UPPERCASE for project names)
3. action_items: Array of {description, person_name?, due_date?, priority} - any tasks or follow-ups. priority is "high", "medium", or "low". due_date should be ISO format if mentioned.
4. mentions: Array of {person_name?, project_name?, snippet} - specific snippets about people or projects

Return ONLY valid JSON, no markdown or explanation. Example:
{
  "people": [{"name": "John Smith", "context": "works on backend"}],
  "projects": [{"name": "ALMAZ", "context": "LLM platform"}],
  "action_items": [{"description": "Follow up with John", "person_name": "John Smith", "priority": "medium"}],
  "mentions": [{"person_name": "John Smith", "project_name": "ALMAZ", "snippet": "John is leading the ALMAZ backend work"}]
}`
        }
      ],
    });

    // Parse the extraction result
    const extractionText = message.content[0].type === "text" ? message.content[0].text : "";
    let extraction: ExtractionResult;
    
    try {
      extraction = JSON.parse(extractionText);
    } catch {
      console.error("Failed to parse extraction:", extractionText);
      extraction = { people: [], projects: [], action_items: [], mentions: [] };
    }

    // Calculate week_of
    const inputDate = new Date(input.created_at);
    const dayOfWeek = inputDate.getDay();
    const diff = inputDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Monday
    const weekOf = new Date(inputDate.setDate(diff)).toISOString().split("T")[0];

    // Process people
    const personIdMap = new Map<string, string>();
    for (const person of extraction.people) {
      const { data } = await supabase.rpc("find_or_create_person", {
        p_name: person.name,
        p_context: person.context || null,
      });
      if (data) {
        personIdMap.set(person.name.toLowerCase(), data);
      }
    }

    // Process projects
    const projectIdMap = new Map<string, string>();
    for (const project of extraction.projects) {
      const { data } = await supabase.rpc("find_or_create_project", {
        p_name: project.name,
        p_context: project.context || null,
      });
      if (data) {
        projectIdMap.set(project.name.toLowerCase(), data);
      }
    }

    // Create mentions
    for (const mention of extraction.mentions) {
      const personId = mention.person_name 
        ? personIdMap.get(mention.person_name.toLowerCase()) 
        : null;
      const projectId = mention.project_name 
        ? projectIdMap.get(mention.project_name.toLowerCase()) 
        : null;

      if (personId || projectId) {
        await supabase.from("mentions").insert({
          input_id: input.id,
          person_id: personId,
          project_id: projectId,
          snippet: mention.snippet,
          week_of: weekOf,
        });
      }
    }

    // Create action items
    for (const action of extraction.action_items) {
      const personId = action.person_name
        ? personIdMap.get(action.person_name.toLowerCase())
        : null;

      await supabase.from("action_items").insert({
        input_id: input.id,
        description: action.description,
        person_id: personId,
        due_date: action.due_date || null,
        priority: action.priority || "medium",
      });
    }

    // Mark input as processed
    await supabase
      .from("raw_inputs")
      .update({ processed: true })
      .eq("id", input.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        extracted: {
          people: extraction.people.length,
          projects: extraction.projects.length,
          action_items: extraction.action_items.length,
          mentions: extraction.mentions.length,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Extraction error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
