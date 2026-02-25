import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pipeline_id, run_status } = await req.json();

    // Only trigger dependents on successful completion
    if (run_status !== 'completed') {
      return Response.json({ triggered: [] });
    }

    // Get the completed pipeline
    const pipeline = await base44.entities.Pipeline.get(pipeline_id);
    if (!pipeline || !pipeline.dependent_pipeline_ids || pipeline.dependent_pipeline_ids.length === 0) {
      return Response.json({ triggered: [] });
    }

    // Trigger each dependent pipeline
    const triggered = [];
    for (const depPipelineId of pipeline.dependent_pipeline_ids) {
      try {
        const depPipeline = await base44.entities.Pipeline.get(depPipelineId);
        if (depPipeline) {
          // Create a new pipeline run for the dependent pipeline
          const newRun = await base44.entities.PipelineRun.create({
            pipeline_id: depPipelineId,
            run_number: (depPipeline.total_runs || 0) + 1,
            status: 'running',
            started_at: new Date().toISOString(),
            triggered_by: 'dependency',
          });
          triggered.push({
            pipeline_id: depPipelineId,
            pipeline_name: depPipeline.name,
            run_id: newRun.id,
          });
        }
      } catch (err) {
        console.error(`[triggerDependentPipelines] Failed to trigger ${depPipelineId}:`, err.message);
      }
    }

    return Response.json({ triggered });
  } catch (error) {
    console.error('[triggerDependentPipelines] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});