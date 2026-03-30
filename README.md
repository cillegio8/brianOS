# BrainOS

Your second brain that actually thinks. A weekly journal + Personal CRM powered by AI.

## Features

- **Quick Capture**: Dump thoughts via text or voice
- **AI Extraction**: Automatically extracts people, projects, and action items
- **Personal CRM**: Auto-generated person cards with context and interaction history  
- **Weekly Journal**: AI-synthesized weekly summaries
- **Action Items**: Tasks extracted from your notes with priorities and due dates

## Tech Stack

- **Frontend**: Next.js 14 (static export) → Cloudflare Pages
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **AI**: Claude API (Haiku for extraction, Sonnet for synthesis)
- **Styling**: Tailwind CSS

## Setup

### 1. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)

2. Run the migration to create tables:
   - Go to SQL Editor in Supabase Dashboard
   - Copy contents of `supabase/migrations/001_initial_schema.sql`
   - Run the query

3. Enable the pgvector extension:
   - Go to Database → Extensions
   - Search for "vector" and enable it

4. Deploy Edge Functions:
   ```bash
   # Install Supabase CLI
   npm install -g supabase
   
   # Login
   supabase login
   
   # Link to your project
   supabase link --project-ref YOUR_PROJECT_ID
   
   # Deploy functions
   supabase functions deploy extract
   supabase functions deploy generate-journal
   ```

5. Set Edge Function secrets in Supabase Dashboard → Edge Functions → Secrets:
   - `ANTHROPIC_API_KEY`: Your Claude API key from console.anthropic.com

### 2. Local Development

1. Clone and install:
   ```bash
   git clone <repo>
   cd brainos
   npm install
   ```

2. Create `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

3. Run development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000)

### 3. Deploy to Cloudflare Pages

1. Build the static export:
   ```bash
   npm run build
   ```

2. Deploy to Cloudflare Pages:
   - Connect your GitHub repo to Cloudflare Pages
   - Build command: `npm run build`
   - Output directory: `out`
   - Add environment variables in Cloudflare Pages settings

## Project Structure

```
brainos/
├── src/
│   ├── app/                 # Next.js pages
│   │   ├── page.tsx         # Home (quick capture + dashboard)
│   │   ├── people/          # People list and cards
│   │   ├── actions/         # Action items
│   │   └── journal/         # Weekly journals
│   ├── components/          # React components
│   │   ├── QuickCapture.tsx # Main input component
│   │   ├── PersonCard.tsx   # CRM card
│   │   ├── ActionItems.tsx  # Task list
│   │   ├── WeeklyJournal.tsx# Journal view
│   │   └── Navigation.tsx   # Nav bar
│   └── lib/                 # Utilities
│       ├── supabase.ts      # Supabase client
│       ├── database.types.ts# TypeScript types
│       └── utils.ts         # Helpers
├── supabase/
│   ├── migrations/          # Database schema
│   └── functions/           # Edge Functions
│       ├── extract/         # AI extraction
│       └── generate-journal/# Weekly synthesis
└── package.json
```

## How It Works

1. **Capture**: You type/speak a note in Quick Capture
2. **Extract**: Edge Function calls Claude Haiku to extract:
   - People mentioned → creates/updates Person cards
   - Projects mentioned → creates/updates Project records
   - Action items → creates tasks with priority/due dates
   - Mentions → links snippets to people/projects
3. **Synthesize**: Weekly journal generator calls Claude Sonnet to create summary
4. **Display**: Frontend shows your data with cross-references

## Cost Estimate

For ~50 captures/week:
- Claude Haiku (extraction): ~$0.01/capture = $0.50/week
- Claude Sonnet (weekly journal): ~$0.03/week
- Supabase: Free tier covers most single-user usage
- Cloudflare Pages: Free

**Total: ~$2-3/month**

## Roadmap

- [ ] Voice transcription (Whisper integration)
- [ ] Email forwarding capture
- [ ] Calendar integration
- [ ] Mobile app (React Native)
- [ ] Meeting bot
- [ ] Authentication (for multi-user)

## License

MIT
