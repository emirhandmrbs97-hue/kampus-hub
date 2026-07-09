import { supabase } from './supabaseClient';

const NOTES_BUCKET = 'notes';
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export async function uploadNoteFile(fileUri: string, filename: string, contentType: string) {
  // fetch blob
  const resp = await fetch(fileUri);
  if (!resp.ok) throw new Error('Failed to read file');
  const blob = await resp.blob();
  if (blob.size > MAX_FILE_SIZE) throw new Error('File too large');
  if (contentType !== 'application/pdf' && !filename.toLowerCase().endsWith('.pdf')) throw new Error('Only PDF allowed');

  const path = `notes/${Date.now()}-${filename}`;
  const { data, error } = await supabase.storage.from(NOTES_BUCKET).upload(path, blob, { contentType: 'application/pdf' });
  if (error) throw error;

  // Attempt to get public URL (may be private depending on bucket settings)
  const { data: pub } = supabase.storage.from(NOTES_BUCKET).getPublicUrl(path);
  return { path, filename, publicUrl: pub?.publicUrl ?? null };
}

export async function createNoteRecord(payload: {
  author?: string;
  course: string;
  section: string;
  class: number;
  semester: string;
  title: string;
  description?: string;
  file_path: string;
  filename: string;
}) {
  // Ensure author exists and matches authenticated user when possible
  let authorId = payload.author;
  if (!authorId) {
    const { data } = await supabase.auth.getUser();
    authorId = data?.user?.id as string | undefined;
  }
  if (!authorId) throw new Error('Author id is required');

  const record = {
    author: authorId,
    course: payload.course,
    section: payload.section,
    class: payload.class,
    semester: payload.semester,
    title: payload.title,
    description: payload.description ?? null,
    file_path: payload.file_path,
    filename: payload.filename,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('notes').insert([record]).select().maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchNotes({
  course,
  section,
  classNumber,
  semester,
  q,
  limit = 50,
  offset = 0,
}: {
  course?: string;
  section?: string;
  classNumber?: number;
  semester?: string;
  q?: string;
  limit?: number;
  offset?: number;
}) {
  let query = supabase
    .from('notes')
    .select('id, author, course, section, class, semester, title, description, filename, file_path, downloads, views, created_at')
    .limit(limit)
    .range(offset, offset + limit - 1);

  if (course) query = query.eq('course', course);
  if (section) query = query.eq('section', section);
  if (classNumber) query = query.eq('class', classNumber);
  if (semester) query = query.eq('semester', semester);
  if (q) query = query.or(`title.ilike.%${q}%,course.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getNotePublicUrl(filePath: string) {
  const { data } = supabase.storage.from(NOTES_BUCKET).getPublicUrl(filePath);
  return data?.publicUrl ?? null;
}

export async function getNoteSignedUrl(filePath: string, expiresIn = 60 * 60) {
  const { data, error } = await supabase.storage.from(NOTES_BUCKET).createSignedUrl(filePath, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

export async function incrementNoteView(noteId: string) {
  try {
    const { error } = await supabase.rpc('increment_note_views', { note: noteId });
    if (error) throw error;
  } catch (e) {
    // Fallback: try simple update (requires appropriate RLS or service role)
    const { error } = await supabase.from('notes').update({ views: (supabase.raw ? supabase.raw('views + 1') : undefined) }).eq('id', noteId);
    if (error) console.warn('incrementNoteView fallback failed', error.message || error);
  }
}

export async function incrementNoteDownload(noteId: string) {
  try {
    const { error } = await supabase.rpc('increment_note_downloads', { note: noteId });
    if (error) throw error;
  } catch (e) {
    const { error } = await supabase.from('notes').update({ downloads: (supabase.raw ? supabase.raw('downloads + 1') : undefined) }).eq('id', noteId);
    if (error) console.warn('incrementNoteDownload fallback failed', error.message || error);
  }
}

export async function deleteNote(noteId: string) {
  // fetch note to get file path
  const { data: note, error: selErr } = await supabase.from('notes').select('id, file_path, author').eq('id', noteId).maybeSingle();
  if (selErr) throw selErr;
  if (!note) throw new Error('Note not found');

  const { error: delDbErr } = await supabase.from('notes').delete().eq('id', noteId);
  if (delDbErr) throw delDbErr;

  const { data: delData, error: delStorageErr } = await supabase.storage.from(NOTES_BUCKET).remove([note.file_path]);
  if (delStorageErr) {
    // Not fatal, but warn
    console.warn('Failed to remove file from storage', delStorageErr.message || delStorageErr);
  }

  return true;
}
