import { Router, Request, Response } from 'express';
import { getSupabaseAdmin } from '../lib/supabase';
import { applyCaptionsWithRemotion } from '../services/remotion-caption-processor';

const router = Router();

/**
 * POST /api/test-captions
 * Test caption processing on an existing completed video
 *
 * Body options:
 * - jobId: The job ID to test (must be completed with video_url)
 * - useConfigFrom: (optional) Copy caption config from another job (e.g., a draft with captions enabled)
 * - forceEnabled: (optional) Force caption_enabled=true for testing
 */
router.post('/test-captions', async (req: Request, res: Response) => {
  try {
    const { jobId, useConfigFrom, forceEnabled } = req.body;

    if (!jobId) {
      return res.status(400).json({ error: 'Job ID required' });
    }

    console.log('[TEST-CAPTIONS] Testing captions for job:', jobId);
    console.log('[TEST-CAPTIONS] Options:', { useConfigFrom, forceEnabled });

    const supabase = getSupabaseAdmin();

    // Fetch job details including new caption columns
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*, scripts(content)')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      console.error('[TEST-CAPTIONS] Job not found:', jobError);
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status !== 'completed') {
      return res.status(400).json({ error: 'Job is not completed yet' });
    }

    if (!job.video_url) {
      return res.status(400).json({ error: 'Job has no video URL' });
    }

    // If useConfigFrom is provided, copy caption config from that job
    let captionEnabled = job.caption_enabled;
    let captionStyle = job.caption_style;
    let captionPosition = job.caption_position;
    let textOverlays = job.text_overlays || [];

    if (useConfigFrom) {
      const { data: sourceJob, error: sourceError } = await supabase
        .from('jobs')
        .select('caption_enabled, caption_style, caption_position, text_overlays')
        .eq('id', useConfigFrom)
        .single();

      if (sourceError || !sourceJob) {
        console.error('[TEST-CAPTIONS] Source job not found:', sourceError);
        return res.status(404).json({ error: 'Source job for config not found' });
      }

      captionEnabled = sourceJob.caption_enabled;
      captionStyle = sourceJob.caption_style;
      captionPosition = sourceJob.caption_position;
      textOverlays = sourceJob.text_overlays || [];

      console.log('[TEST-CAPTIONS] Using config from job:', useConfigFrom, {
        captionEnabled,
        captionStyle: captionStyle ? 'provided' : 'null',
        captionPosition,
        textOverlaysCount: textOverlays.length,
      });
    }

    // Override with explicit parameters if provided
    if (forceEnabled !== undefined) {
      captionEnabled = forceEnabled;
    }

    // Temporarily update the job with the test config (new columns)
    await supabase
      .from('jobs')
      .update({
        caption_enabled: captionEnabled,
        caption_style: captionStyle,
        caption_position: captionPosition,
        text_overlays: textOverlays,
      })
      .eq('id', jobId);

    console.log('[TEST-CAPTIONS] Job details:', {
      id: job.id,
      caption_enabled: captionEnabled,
      caption_style: captionStyle ? 'provided' : 'null',
      caption_position: captionPosition,
      text_overlays_count: textOverlays.length,
      video_url: job.video_url,
    });

    // Get script text
    const scriptText = (job.scripts as any)?.content || '';

    if (!scriptText) {
      return res.status(400).json({ error: 'No script content found' });
    }

    console.log('[TEST-CAPTIONS] Script text length:', scriptText.length);

    // Process video with captions using Remotion
    const processedBuffer = await applyCaptionsWithRemotion(
      job.video_url,
      job.id,
      job.user_id,
      scriptText
    );

    console.log('[TEST-CAPTIONS] Processed video size:', processedBuffer.length, 'bytes');

    // Upload test video with timestamp to avoid caching issues
    const timestamp = Date.now();
    const testPath = `${job.user_id}/test_${job.id}_${timestamp}.mp4`;
    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(testPath, processedBuffer, {
        contentType: 'video/mp4',
        upsert: true,
      });

    if (uploadError) {
      console.error('[TEST-CAPTIONS] Upload error:', uploadError);
      return res.status(500).json({ error: 'Failed to upload test video' });
    }

    const { data: publicUrlData } = supabase.storage
      .from('videos')
      .getPublicUrl(testPath);

    console.log('[TEST-CAPTIONS] Test video uploaded:', publicUrlData.publicUrl);

    return res.json({
      success: true,
      message: 'Caption processing completed',
      testVideoUrl: publicUrlData.publicUrl,
      originalVideoUrl: job.video_url,
      captionEnabled,
      captionStyle: captionStyle ? 'provided' : null,
      textOverlaysCount: textOverlays.length,
    });
  } catch (error) {
    console.error('[TEST-CAPTIONS] Error:', error);
    return res.status(500).json({
      error: 'Caption processing failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/test-captions/jobs
 * List jobs with their caption config for debugging
 */
router.get('/test-captions/jobs', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseAdmin();

    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('id, campaign_name, status, caption_enabled, caption_style, caption_position, text_overlays, video_url, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch jobs' });
    }

    // Format jobs for display
    const formattedJobs = (jobs || []).map((job) => ({
      ...job,
      caption_style: job.caption_style ? 'configured' : null,
      text_overlays_count: (job.text_overlays || []).length,
    }));

    return res.json({
      jobs: formattedJobs,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

/**
 * POST /api/test-captions/direct
 * Test caption processing with a direct video URL (no HeyGen needed)
 *
 * Body:
 * - videoUrl: Direct URL to a video file
 * - jobId: (optional) Job ID to use for config, or creates a test one
 */
router.post('/test-captions/direct', async (req: Request, res: Response) => {
  try {
    const { videoUrl, jobId } = req.body;

    if (!videoUrl) {
      return res.status(400).json({ error: 'videoUrl is required' });
    }

    console.log('[TEST-CAPTIONS-DIRECT] Testing captions with direct video URL');
    console.log('[TEST-CAPTIONS-DIRECT] Video URL:', videoUrl);
    console.log('[TEST-CAPTIONS-DIRECT] Job ID:', jobId || 'not provided');

    const supabase = getSupabaseAdmin();

    // If jobId provided, use that job's config
    let scriptText = 'Test caption text for direct video processing.';
    let userId = 'test-user';
    let effectiveJobId = jobId;

    if (jobId) {
      const { data: job } = await supabase
        .from('jobs')
        .select('*, scripts(content)')
        .eq('id', jobId)
        .single();

      if (job) {
        scriptText = (job.scripts as any)?.content || scriptText;
        userId = job.user_id;
        console.log('[TEST-CAPTIONS-DIRECT] Using job config:', {
          captionEnabled: job.caption_enabled,
          captionStyle: job.caption_style ? 'provided' : 'null',
          scriptLength: scriptText.length,
        });
      }
    }

    // Process video with Remotion
    const processedBuffer = await applyCaptionsWithRemotion(
      videoUrl,
      effectiveJobId || 'test-direct',
      userId,
      scriptText
    );

    console.log('[TEST-CAPTIONS-DIRECT] Processed video size:', processedBuffer.length, 'bytes');

    // Upload test video
    const timestamp = Date.now();
    const testPath = `${userId}/test_direct_${timestamp}.mp4`;
    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(testPath, processedBuffer, {
        contentType: 'video/mp4',
        upsert: true,
      });

    if (uploadError) {
      console.error('[TEST-CAPTIONS-DIRECT] Upload error:', uploadError);
      return res.status(500).json({ error: 'Failed to upload test video' });
    }

    const { data: publicUrlData } = supabase.storage
      .from('videos')
      .getPublicUrl(testPath);

    console.log('[TEST-CAPTIONS-DIRECT] Test video uploaded:', publicUrlData.publicUrl);

    return res.json({
      success: true,
      message: 'Caption processing completed',
      testVideoUrl: publicUrlData.publicUrl,
      originalVideoUrl: videoUrl,
      processedSize: processedBuffer.length,
    });
  } catch (error) {
    console.error('[TEST-CAPTIONS-DIRECT] Error:', error);
    return res.status(500).json({
      error: 'Caption processing failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
