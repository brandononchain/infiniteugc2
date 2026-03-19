import { getSupabaseAdmin } from '../lib/supabase';

/**
 * Uploads an extracted frame to Supabase Storage
 *
 * @param frameBuffer - The JPEG frame as a Buffer
 * @param userId - User ID for storage path
 * @param jobId - Premium job ID for storage path
 * @param chunkIndex - Chunk index for file naming
 * @returns Public URL of the uploaded frame
 * @throws Error if upload fails
 */
export async function uploadFrame(
  frameBuffer: Buffer,
  userId: string,
  jobId: string,
  chunkIndex: number
): Promise<string> {
  const supabase = getSupabaseAdmin();

  // Storage path follows pattern: {userId}/{jobId}/frames/chunk_{index}_last_frame.jpg
  const storagePath = `${userId}/${jobId}/frames/chunk_${chunkIndex}_last_frame.jpg`;

  console.log(`Uploading frame to: ${storagePath}`);

  // Upload to premium-videos bucket
  const { error: uploadError } = await supabase.storage
    .from('premium-videos')
    .upload(storagePath, frameBuffer, {
      contentType: 'image/jpeg',
      upsert: true, // Overwrite if exists (for retries)
    });

  if (uploadError) {
    throw new Error(`Failed to upload frame to storage: ${uploadError.message}`);
  }

  // Get public URL
  const { data: publicUrlData } = supabase.storage
    .from('premium-videos')
    .getPublicUrl(storagePath);

  if (!publicUrlData?.publicUrl) {
    throw new Error('Failed to get public URL for uploaded frame');
  }

  console.log(`Frame uploaded successfully: ${publicUrlData.publicUrl}`);

  return publicUrlData.publicUrl;
}
