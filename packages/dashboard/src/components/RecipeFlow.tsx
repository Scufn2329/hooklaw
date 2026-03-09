import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  type Node,
  type Edge,
  type NodeTypes,
  type OnNodesChange,
  type OnEdgesChange,
  type ReactFlowInstance,
  applyNodeChanges,
  applyEdgeChanges,
  Handle,
  Position,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { api, type Recipe, type McpServer } from '../api/client.ts';

// ── Helpers ───────────────────────────────────────────

function CopyIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, []);
  return { copied, copy };
}

function PencilIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.85 0 114 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  );
}

// ── Custom Nodes ──────────────────────────────────────

function WebhookNode({ data }: NodeProps) {
  const d = data as { label: string; slug: string; url: string };
  const { copied, copy } = useCopy();

  return (
    <div className="bg-zinc-900/90 backdrop-blur border border-blue-500/40 rounded-xl px-4 py-3 min-w-[170px] shadow-lg shadow-blue-500/10">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-[10px] text-blue-400 uppercase tracking-wider font-semibold">Webhook</span>
        </div>
        <span className="text-[10px] text-blue-400/60 bg-blue-500/10 px-1.5 py-0.5 rounded font-bold">POST</span>
      </div>
      <div className="text-sm text-zinc-100 font-mono mb-2">{d.label}</div>
      <button
        onClick={() => copy(d.url)}
        className={`flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-md border transition-all ${
          copied
            ? 'border-blue-500 text-blue-400 bg-blue-500/10'
            : 'border-zinc-700/50 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600'
        }`}
      >
        <CopyIcon size={10} />
        {copied ? 'Copied!' : 'Copy URL'}
      </button>
      <Handle type="source" position={Position.Right} className="!bg-blue-500 !w-2.5 !h-2.5 !border-0" />
    </div>
  );
}

function RecipeNode({ data }: NodeProps) {
  const d = data as { label: string; mode: string; description: string; instructions: string; onEdit: () => void };

  return (
    <div className="bg-zinc-900/90 backdrop-blur border border-emerald-500/40 rounded-xl px-4 py-3 min-w-[180px] max-w-[220px] shadow-lg shadow-emerald-500/10">
      <Handle type="target" position={Position.Left} className="!bg-emerald-500 !w-2.5 !h-2.5 !border-0" />
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-semibold">Recipe</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-emerald-400/60 bg-emerald-500/10 px-1.5 py-0.5 rounded">{d.mode}</span>
          <button
            onClick={d.onEdit}
            className="text-zinc-500 hover:text-emerald-400 transition-colors p-0.5"
            title="Edit recipe"
          >
            <PencilIcon size={11} />
          </button>
        </div>
      </div>
      {d.description && <div className="text-sm text-zinc-100 font-semibold truncate">{d.description}</div>}
      <div className="text-[10px] text-zinc-500 mt-0.5 font-mono">{d.label}</div>
      <Handle type="source" position={Position.Right} className="!bg-emerald-500 !w-2.5 !h-2.5 !border-0" />
    </div>
  );
}

const PROVIDER_FAVICONS: Record<string, string> = {
  anthropic: 'https://anthropic.com/favicon.ico',
  openai: 'https://openai.com/favicon.ico',
  openrouter: 'https://openrouter.ai/favicon.ico',
  ollama: 'https://ollama.com/public/ollama.png',
};

function AgentNode({ data }: NodeProps) {
  const d = data as { model: string; provider: string };
  const favicon = PROVIDER_FAVICONS[d.provider];

  return (
    <div className="bg-zinc-900/90 backdrop-blur border border-amber-500/40 rounded-xl px-4 py-3 min-w-[160px] shadow-lg shadow-amber-500/10">
      <Handle type="target" position={Position.Left} className="!bg-amber-500 !w-2.5 !h-2.5 !border-0" />
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-[10px] text-amber-400 uppercase tracking-wider font-semibold">Agent</span>
      </div>
      <div className="text-sm text-zinc-100 font-mono">{d.model}</div>
      <div className="flex items-center gap-1.5 mt-1">
        {favicon && <img src={favicon} alt={d.provider} className={`w-3.5 h-3.5 rounded-sm ${d.provider === 'ollama' ? 'bg-white p-px' : ''}`} />}
        <span className="text-[10px] text-zinc-500">{d.provider}</span>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-amber-500 !w-2.5 !h-2.5 !border-0" />
    </div>
  );
}

const TOOL_FAVICONS: Record<string, { url: string; invert?: boolean }> = {
  stripe: { url: 'https://stripe.com/favicon.ico' },
  github: { url: 'https://github.com/favicon.ico', invert: true },
  slack: { url: 'https://slack.com/favicon.ico' },
  linear: { url: 'https://linear.app/favicon.ico' },
  notion: { url: 'https://www.notion.so/images/favicon.ico' },
  postgres: { url: 'https://www.postgresql.org/favicon.ico' },
};

function ToolNode({ data }: NodeProps) {
  const d = data as { label: string; serverInfo?: string };
  const fav = TOOL_FAVICONS[d.label];

  return (
    <div className="bg-zinc-900/90 backdrop-blur border border-purple-500/40 rounded-xl px-4 py-3 min-w-[130px] shadow-lg shadow-purple-500/10">
      <Handle type="target" position={Position.Left} className="!bg-purple-500 !w-2.5 !h-2.5 !border-0" />
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-[10px] text-purple-400 uppercase tracking-wider font-semibold">MCP Tool</span>
      </div>
      <div className="flex items-center gap-2">
        {fav
          ? <img src={fav.url} alt={d.label} className={`w-4 h-4 rounded-sm ${fav.invert ? 'invert' : ''}`} />
          : <div className="w-2 h-2 rounded-full bg-purple-500" />
        }
        <span className="text-sm text-zinc-100 font-mono">{d.label}</span>
      </div>
      {d.serverInfo && (
        <div className="text-[10px] text-zinc-500 mt-1 font-mono truncate max-w-[180px]">{d.serverInfo}</div>
      )}
    </div>
  );
}

function EditPanelNode({ data }: NodeProps) {
  const d = data as {
    recipeId: string;
    description: string;
    mode: string;
    instructions: string;
    model: string;
    provider: string;
    tools: string[];
    availableTools: string[];
    onSave: (recipeId: string, update: Record<string, unknown>) => void;
    onClose: () => void;
  };

  const [desc, setDesc] = useState(d.description);
  const [mode, setMode] = useState(d.mode);
  const [instructions, setInstructions] = useState(d.instructions);
  const [model, setModel] = useState(d.model);
  const [tools, setTools] = useState<string[]>(d.tools);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    d.onSave(d.recipeId, { description: desc, mode, instructions, model, tools });
    setSaving(false);
  }

  function toggleTool(name: string) {
    setTools((prev) => prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name]);
  }

  return (
    <div className="bg-zinc-900/95 backdrop-blur-xl border border-emerald-500/30 rounded-xl p-4 w-[300px] shadow-2xl shadow-emerald-500/5">
      <Handle type="target" position={Position.Left} className="!bg-emerald-500 !w-2.5 !h-2.5 !border-0" />

      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Edit: {d.recipeId}</span>
        <button onClick={d.onClose} className="text-zinc-500 hover:text-zinc-300 text-lg leading-none">&times;</button>
      </div>

      <div className="space-y-3">
        <Field label="Title">
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-700 text-zinc-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </Field>

        <Field label="Model">
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-700 text-zinc-200 text-xs font-mono rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </Field>

        <Field label="Mode">
          <div className="flex gap-2">
            {(['sync', 'async'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 text-xs py-1.5 rounded-md border transition-all ${
                  mode === m
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                    : 'border-zinc-700 text-zinc-500 hover:border-zinc-600'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Instructions">
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={4}
            className="w-full bg-zinc-950 border border-zinc-700 text-zinc-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
          />
        </Field>

        {d.availableTools.length > 0 && (
          <Field label="Tools">
            <div className="flex flex-wrap gap-1.5">
              {d.availableTools.map((t) => (
                <button
                  key={t}
                  onClick={() => toggleTool(t)}
                  className={`text-[10px] font-mono px-2 py-1 rounded-md border transition-all ${
                    tools.includes(t)
                      ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                      : 'border-zinc-700 text-zinc-500 hover:border-zinc-600'
                  }`}
                >
                  {tools.includes(t) ? '✓ ' : ''}{t}
                </button>
              ))}
            </div>
          </Field>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium py-2 rounded-md transition-colors"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">{label}</label>
      {children}
    </div>
  );
}

const nodeTypes: NodeTypes = {
  webhook: WebhookNode,
  recipe: RecipeNode,
  agent: AgentNode,
  tool: ToolNode,
  editPanel: EditPanelNode,
};

// ── Build flow from recipes ───────────────────────────

function buildFlow(
  recipes: Recipe[],
  mcpServers: McpServer[],
  onEdit: (recipeId: string) => void,
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  if (recipes.length === 0) return { nodes, edges };

  const serverMap = new Map(mcpServers.map((s) => [s.name, s]));

  const slugMap = new Map<string, Recipe[]>();
  for (const r of recipes) {
    const list = slugMap.get(r.slug) ?? [];
    list.push(r);
    slugMap.set(r.slug, list);
  }

  const COL_WEBHOOK = 0;
  const COL_RECIPE = 250;
  const COL_AGENT = 540;
  const COL_TOOL = 780;
  const ROW_GAP = 160;

  let rowIndex = 0;

  for (const [slug, slugRecipes] of slugMap) {
    const webhookId = `webhook-${slug}`;
    const webhookY = rowIndex * ROW_GAP;
    const webhookUrl = `${window.location.origin}/h/${slug}`;

    nodes.push({
      id: webhookId,
      type: 'webhook',
      position: { x: COL_WEBHOOK, y: webhookY },
      data: { label: `/h/${slug}`, slug, url: webhookUrl },
    });

    for (const recipe of slugRecipes) {
      const recipeId = `recipe-${recipe.id}`;
      const recipeY = rowIndex * ROW_GAP;

      nodes.push({
        id: recipeId,
        type: 'recipe',
        position: { x: COL_RECIPE, y: recipeY },
        data: {
          label: recipe.id,
          mode: recipe.mode,
          description: recipe.description || '',
          instructions: recipe.instructions || '',
          onEdit: () => onEdit(recipe.id),
        },
      });

      edges.push({
        id: `e-${webhookId}-${recipeId}`,
        source: webhookId,
        target: recipeId,
        animated: true,
        style: { stroke: '#3b82f6', strokeWidth: 2 },
      });

      const agentId = `agent-${recipe.id}`;
      nodes.push({
        id: agentId,
        type: 'agent',
        position: { x: COL_AGENT, y: recipeY },
        data: {
          model: recipe.model ?? 'default',
          provider: recipe.provider ?? 'unknown',
        },
      });

      edges.push({
        id: `e-${recipeId}-${agentId}`,
        source: recipeId,
        target: agentId,
        animated: true,
        style: { stroke: '#10b981', strokeWidth: 2 },
      });

      if (recipe.tools.length > 0) {
        recipe.tools.forEach((tool, ti) => {
          const toolId = `tool-${recipe.id}-${ti}`;
          const toolY = recipeY + (ti - (recipe.tools.length - 1) / 2) * 80;
          const server = serverMap.get(tool);
          const serverInfo = server
            ? `${server.command ?? ''} ${(server.args ?? []).slice(0, 2).join(' ')}`
            : undefined;

          nodes.push({
            id: toolId,
            type: 'tool',
            position: { x: COL_TOOL, y: toolY },
            data: { label: tool, serverInfo },
          });

          edges.push({
            id: `e-${agentId}-${toolId}`,
            source: agentId,
            target: toolId,
            animated: true,
            style: { stroke: '#f59e0b', strokeWidth: 2 },
          });
        });
      }

      rowIndex++;
    }
  }

  return { nodes, edges };
}

// ── Component ─────────────────────────────────────────

interface RecipeFlowProps {
  recipes: Recipe[];
  mcpServers?: McpServer[];
  onRecipesChange?: () => void;
}

export function RecipeFlow({ recipes, mcpServers = [], onRecipesChange }: RecipeFlowProps) {
  const [editingRecipe, setEditingRecipe] = useState<string | null>(null);
  const rfInstance = useRef<ReactFlowInstance | null>(null);

  const availableTools = useMemo(() => mcpServers.map((s) => s.name), [mcpServers]);

  const handleEdit = useCallback((recipeId: string) => {
    setEditingRecipe((prev) => (prev === recipeId ? null : recipeId));
  }, []);

  const handleSave = useCallback(async (recipeId: string, update: Record<string, unknown>) => {
    try {
      await api.updateRecipe(recipeId, update as Parameters<typeof api.updateRecipe>[1]);
      setEditingRecipe(null);
      onRecipesChange?.();
    } catch (err) {
      console.error('Failed to save recipe:', err);
    }
  }, [onRecipesChange]);

  const handleClose = useCallback(() => {
    setEditingRecipe(null);
  }, []);

  const { baseNodes, baseEdges } = useMemo(() => {
    const { nodes, edges } = buildFlow(recipes, mcpServers, handleEdit);
    return { baseNodes: nodes, baseEdges: edges };
  }, [recipes, mcpServers, handleEdit]);

  // Add edit panel node + edge when editing
  const finalNodes = useMemo(() => {
    if (!editingRecipe) return baseNodes;

    const recipe = recipes.find((r) => r.id === editingRecipe);
    if (!recipe) return baseNodes;

    const recipeNode = baseNodes.find((n) => n.id === `recipe-${editingRecipe}`);
    if (!recipeNode) return baseNodes;

    const editNode: Node = {
      id: `edit-${editingRecipe}`,
      type: 'editPanel',
      position: { x: recipeNode.position.x - 40, y: recipeNode.position.y - 420 },
      data: {
        recipeId: recipe.id,
        description: recipe.description || '',
        mode: recipe.mode,
        instructions: recipe.instructions || '',
        model: recipe.model || '',
        provider: recipe.provider || '',
        tools: recipe.tools,
        availableTools,
        onSave: handleSave,
        onClose: handleClose,
      },
    };

    return [...baseNodes, editNode];
  }, [baseNodes, editingRecipe, recipes, availableTools, handleSave, handleClose]);

  const finalEdges = useMemo(() => {
    if (!editingRecipe) return baseEdges;

    const editEdge: Edge = {
      id: `e-recipe-${editingRecipe}-edit`,
      source: `recipe-${editingRecipe}`,
      target: `edit-${editingRecipe}`,
      style: { stroke: '#10b981', strokeWidth: 1.5, strokeDasharray: '5 5' },
    };

    return [...baseEdges, editEdge];
  }, [baseEdges, editingRecipe]);

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  // Sync nodes/edges when data changes
  useEffect(() => {
    setNodes(finalNodes);
  }, [finalNodes]);

  useEffect(() => {
    setEdges(finalEdges);
  }, [finalEdges]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );

  // Center on edit panel when it opens
  useEffect(() => {
    if (editingRecipe && rfInstance.current) {
      const editNodeId = `edit-${editingRecipe}`;
      setTimeout(() => {
        const node = rfInstance.current?.getNode(editNodeId);
        if (node) {
          rfInstance.current?.setCenter(
            node.position.x + 150,
            node.position.y + 200,
            { zoom: 1, duration: 300 },
          );
        }
      }, 50);
    }
  }, [editingRecipe, nodes]);

  const onInit = useCallback((instance: ReactFlowInstance) => {
    rfInstance.current = instance;
    setTimeout(() => instance.fitView(), 100);
  }, []);

  return (
    <div className="w-full h-full" style={{ minHeight: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onInit={onInit}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
        panOnDrag
        zoomOnScroll
        minZoom={0.2}
        maxZoom={1.5}
        nodesDraggable
        nodesConnectable={false}
      >
        <Background color="#1a1a1e" gap={24} size={1.5} />
      </ReactFlow>
    </div>
  );
}
