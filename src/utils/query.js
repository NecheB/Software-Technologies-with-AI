export async function checked(query) {
  const { data, error } = await query;
  if (error) throw error;
  return data;
}
