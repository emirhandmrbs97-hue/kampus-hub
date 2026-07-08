import { supabase } from './supabaseClient';

const MARKET_BUCKET = 'market-photos';
const MAX_PHOTOS = 10;

export async function uploadPhoto(fileUri: string, filename: string) {
  const resp = await fetch(fileUri);
  const blob = await resp.blob();
  const path = `market/${Date.now()}-${filename}`;
  const { error } = await supabase.storage.from(MARKET_BUCKET).upload(path, blob, { contentType: blob.type });
  if (error) throw error;
  return path;
}

export async function createListing(payload: {
  author: string;
  title: string;
  description?: string;
  price: number;
  category: string;
  city?: string;
  university?: string;
  contact_in_app?: boolean;
  condition?: string;
  photos?: string[]; // array of file paths
}) {
  // insert listing
  const { data, error } = await supabase.from('market_listings').insert([{
    author: payload.author,
    title: payload.title,
    description: payload.description,
    price: payload.price,
    category: payload.category,
    city: payload.city,
    university: payload.university,
    contact_in_app: payload.contact_in_app ?? true,
    condition: payload.condition ?? 'İyi'
  }]).select().maybeSingle();
  if (error) throw error;
  const listingId = data.id;
  // insert photos
  if (payload.photos && payload.photos.length) {
    const photoRows = payload.photos.slice(0, MAX_PHOTOS).map((p, idx) => ({ listing_id: listingId, file_path: p, ordinal: idx }));
    const { error: photoErr } = await supabase.from('market_photos').insert(photoRows);
    if (photoErr) throw photoErr;
  }
  return data;
}

export async function fetchListings({
  q,
  category,
  minPrice,
  maxPrice,
  city,
  university,
  condition,
  sortBy = 'created_at',
  order = 'desc',
  limit = 50,
  offset = 0,
}: any) {
  let query = supabase
    .from('market_listings')
    .select('id, author, title, description, price, category, city, university, condition, status, created_at, author:profiles(id, full_name, avatar_url, username), photos:market_photos(file_path, ordinal)')
    .order(sortBy, { ascending: order === 'asc' })
    .range(offset, offset + limit - 1);

  if (category) query = query.eq('category', category);
  if (city) query = query.eq('city', city);
  if (university) query = query.eq('university', university);
  if (condition) query = query.eq('condition', condition);
  if (minPrice !== undefined) query = query.gte('price', minPrice);
  if (maxPrice !== undefined) query = query.lte('price', maxPrice);
  if (q) query = query.ilike('title', `%${q}%`);

  const { data, error } = await query;
  if (error) throw error;
  // normalize photo arrays
  return (data || []).map((l: any) => ({ ...l, photos: (l.photos || []).sort((a:any,b:any)=>a.ordinal-b.ordinal) }));
}

export async function toggleFavorite(listingId: string, userId: string) {
  // try insert, if conflict delete
  const { error: insertErr } = await supabase.from('market_favorites').insert([{ listing_id: listingId, user_id: userId }]);
  if (!insertErr) return { action: 'favorited' };
  // if error -> try delete
  const { error: delErr } = await supabase.from('market_favorites').delete().match({ listing_id: listingId, user_id: userId });
  if (delErr) throw delErr;
  return { action: 'unfavorited' };
}

export async function fetchFavorites(userId: string) {
  const { data, error } = await supabase.from('market_favorites').select('listing:market_listings(id, title, price, category, city, university, created_at, author:profiles(id, full_name, avatar_url)), created_at').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function markListingStatus(listingId: string, status: string) {
  const { error } = await supabase.from('market_listings').update({ status }).eq('id', listingId);
  if (error) throw error;
}

export async function deleteListing(listingId: string) {
  // remove photos from storage
  const { data: photos, error: selErr } = await supabase.from('market_photos').select('file_path').eq('listing_id', listingId);
  if (selErr) throw selErr;
  const paths = (photos || []).map((p:any)=>p.file_path);
  if (paths.length) {
    const { error: remErr } = await supabase.storage.from(MARKET_BUCKET).remove(paths);
    if (remErr) console.warn('Failed to remove some photos', remErr.message);
  }
  const { error } = await supabase.from('market_listings').delete().eq('id', listingId);
  if (error) throw error;
}
