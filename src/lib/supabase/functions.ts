interface FunctionOptions {
  accessToken?: string;
}

export async function invokeFunction<T>(name: string, body: unknown, options: FunctionOptions = {}): Promise<T> {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!baseUrl || !anonKey) throw new Error("Supabase não configurado");
  const response = await fetch(`${baseUrl}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${options.accessToken || anonKey}`,
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => null) as T & { error?: string } | null;
  if (!response.ok) throw new Error(data?.error || `Erro na função ${name}`);
  return data as T;
}
