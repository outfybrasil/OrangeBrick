export function createSupabaseCookieAdapter<
  Cookie extends { name: string; value: string },
  Options
>(cookieStore: {
  getAll(): Cookie[];
  set(name: string, value: string, options?: Options): unknown;
}) {
  return {
    getAll: () => cookieStore.getAll(),
    setAll: (cookiesToSet: Array<{ name: string; value: string; options?: Options }>) => {
      cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
    },
  };
}
