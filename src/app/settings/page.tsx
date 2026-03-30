'use client'

import { useState, useEffect } from 'react'
import { Settings, Zap, BookOpen, Check } from 'lucide-react'
import { Navigation } from '@/components'
import { cn } from '@/lib/utils'

interface Model {
  id: string
  name: string
  provider: string
  cost: '$' | '$$' | '$$$' | '$$$$'
  description: string
}

const MODELS: Model[] = [
  { id: 'google/gemini-flash-1.5',              name: 'Gemini 1.5 Flash',    provider: 'Google',    cost: '$',    description: 'Ultra-fast, great for structured extraction' },
  { id: 'openai/gpt-4o-mini',                   name: 'GPT-4o Mini',         provider: 'OpenAI',    cost: '$',    description: 'Capable and affordable, solid JSON output' },
  { id: 'anthropic/claude-3-haiku',             name: 'Claude 3 Haiku',      provider: 'Anthropic', cost: '$',    description: 'Fast and cheap, reliable for simple tasks' },
  { id: 'deepseek/deepseek-chat',               name: 'DeepSeek V3',         provider: 'DeepSeek',  cost: '$',    description: 'Strong reasoning at very low cost' },
  { id: 'meta-llama/llama-3.1-70b-instruct',   name: 'Llama 3.1 70B',       provider: 'Meta',      cost: '$',    description: 'Open-source, fast, good at instruction following' },
  { id: 'qwen/qwen3-235b-a22b',                name: 'Qwen3 235B',          provider: 'Alibaba',   cost: '$',    description: 'Powerful MoE model, strong multilingual & reasoning' },
  { id: 'z-ai/glm-4-32b',                      name: 'GLM-4 32B',           provider: 'Zhipu AI',  cost: '$',    description: 'Fast Chinese frontier model, solid instruction following' },
  { id: 'anthropic/claude-3.5-haiku',           name: 'Claude 3.5 Haiku',    provider: 'Anthropic', cost: '$$',   description: 'Smarter Haiku — better writing, still affordable' },
  { id: 'google/gemini-pro-1.5',                name: 'Gemini 1.5 Pro',      provider: 'Google',    cost: '$$',   description: 'Long context, strong reasoning and writing' },
  { id: 'openai/o1-mini',                       name: 'o1 Mini',             provider: 'OpenAI',    cost: '$$',   description: 'Reasoning model, good for complex extraction' },
  { id: 'anthropic/claude-3.5-sonnet',          name: 'Claude 3.5 Sonnet',   provider: 'Anthropic', cost: '$$$',  description: 'Excellent writing quality and instruction following' },
  { id: 'openai/gpt-4o',                        name: 'GPT-4o',              provider: 'OpenAI',    cost: '$$$',  description: 'Highly capable, great for nuanced journal writing' },
  { id: 'anthropic/claude-3-opus',              name: 'Claude 3 Opus',       provider: 'Anthropic', cost: '$$$$', description: 'Most capable Claude, best for complex synthesis' },
  { id: 'openai/o1',                            name: 'o1',                  provider: 'OpenAI',    cost: '$$$$', description: 'Advanced reasoning, highest quality output' },
]

const COST_COLORS: Record<string, string> = {
  '$':    'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20',
  '$$':   'text-blue-600   dark:text-blue-400   bg-blue-50   dark:bg-blue-900/20',
  '$$$':  'text-amber-600  dark:text-amber-400  bg-amber-50  dark:bg-amber-900/20',
  '$$$$': 'text-red-600    dark:text-red-400    bg-red-50    dark:bg-red-900/20',
}

const DEFAULT_EXTRACT_MODEL  = 'anthropic/claude-3-haiku'
const DEFAULT_JOURNAL_MODEL  = 'anthropic/claude-3.5-sonnet'
const LS_EXTRACT_KEY         = 'brainos_extract_model'
const LS_JOURNAL_KEY         = 'brainos_journal_model'

function ModelPicker({
  label,
  icon: Icon,
  description,
  selected,
  onChange,
}: {
  label: string
  icon: React.ElementType
  description: string
  selected: string
  onChange: (id: string) => void
}) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-[var(--color-text-secondary)]" />
        <h2 className="font-medium text-[var(--color-text-primary)]">{label}</h2>
      </div>
      <p className="text-sm text-[var(--color-text-secondary)] mb-4 ml-6">{description}</p>

      <div className="grid gap-2">
        {MODELS.map(model => {
          const isSelected = selected === model.id
          return (
            <button
              key={model.id}
              type="button"
              onClick={() => onChange(model.id)}
              className={cn(
                'flex items-center gap-4 px-4 py-3 rounded-xl border text-left transition-colors',
                isSelected
                  ? 'border-brand-600 bg-brand-50 dark:bg-brand-900/20'
                  : 'border-[var(--color-border-secondary)] bg-[var(--color-bg-primary)] hover:bg-[var(--color-bg-secondary)]'
              )}
            >
              {/* Check */}
              <div className={cn(
                'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
                isSelected ? 'border-brand-600 bg-brand-600' : 'border-[var(--color-border-secondary)]'
              )}>
                {isSelected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
              </div>

              {/* Name + description */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">{model.name}</span>
                  <span className="text-xs text-[var(--color-text-tertiary)]">{model.provider}</span>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)] truncate">{model.description}</p>
              </div>

              {/* Cost badge */}
              <span className={cn(
                'text-xs font-semibold px-2 py-0.5 rounded-md shrink-0 font-mono',
                COST_COLORS[model.cost]
              )}>
                {model.cost}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const [extractModel, setExtractModel] = useState(DEFAULT_EXTRACT_MODEL)
  const [journalModel, setJournalModel] = useState(DEFAULT_JOURNAL_MODEL)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setExtractModel(localStorage.getItem(LS_EXTRACT_KEY) || DEFAULT_EXTRACT_MODEL)
    setJournalModel(localStorage.getItem(LS_JOURNAL_KEY) || DEFAULT_JOURNAL_MODEL)
  }, [])

  const handleSave = () => {
    localStorage.setItem(LS_EXTRACT_KEY, extractModel)
    localStorage.setItem(LS_JOURNAL_KEY, journalModel)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <Navigation />

      <main className="flex-1 pb-24 md:pb-0">
        <div className="max-w-2xl mx-auto p-4 md:p-8">
          <div className="flex items-center gap-3 mb-8">
            <Settings className="w-6 h-6 text-[var(--color-text-secondary)]" />
            <div>
              <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">Settings</h1>
              <p className="text-sm text-[var(--color-text-secondary)]">Manage your preferences</p>
            </div>
          </div>

          <div className="bg-[var(--color-bg-primary)] rounded-2xl border border-[var(--color-border-secondary)] p-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)] mb-6">
              AI Models · via OpenRouter
            </h3>

            <ModelPicker
              label="Extraction model"
              icon={Zap}
              description="Used to parse notes and extract people, projects, and action items. Prioritise speed and cost."
              selected={extractModel}
              onChange={setExtractModel}
            />

            <ModelPicker
              label="Journal model"
              icon={BookOpen}
              description="Used to write your weekly journal summaries. Prioritise writing quality."
              selected={journalModel}
              onChange={setJournalModel}
            />

            <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border-secondary)]">
              <p className="text-xs text-[var(--color-text-tertiary)]">
                Cost indicators are approximate per million tokens
              </p>
              <button
                type="button"
                onClick={handleSave}
                className={cn(
                  'px-5 py-2 rounded-xl text-sm font-medium transition-colors',
                  saved
                    ? 'bg-emerald-600 text-white'
                    : 'bg-brand-600 text-white hover:bg-brand-700'
                )}
              >
                {saved ? 'Saved!' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
