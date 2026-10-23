import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const migration = await readFile(new URL("../supabase/migrations/20260925000000_restrict_security_definer_privileges.sql", import.meta.url), "utf8");
const defaultPrivilegesMigration = await readFile(new URL("../supabase/migrations/20261023000000_revoke_public_default_function_execute.sql", import.meta.url), "utf8");

test("security definer privileges are restricted to the migration allowlist", async () => {
  const database = new PGlite();

  try {
    await database.exec(`
create role anon;
create role authenticated;
create role service_role;
`);
    await database.exec("alter default privileges in schema public grant execute on functions to anon, authenticated, service_role");

    const functionGrants = [...migration.matchAll(/grant execute on function public\.([a-z0-9_]+)\(([^)]*)\) to /gi)];
    const functions = functionGrants.map(([, name, parameters]) =>
      `create function public.${name}(${parameters}) returns integer language sql security definer as 'select 1';`,
    );
    functions.push("create function public.apply_retention_policy() returns integer language sql security definer as 'select 1';");
    await database.exec(functions.join("\n"));
    await database.exec(migration);
    await database.exec(defaultPrivilegesMigration);

    const canExecute = async (role: string, signature: string) => {
      const result = await database.query<{ allowed: boolean }>(
        "select has_function_privilege($1, $2, 'execute') as allowed",
        [role, `public.${signature}`],
      );
      return result.rows[0].allowed;
    };

    assert.equal(await canExecute("authenticated", "current_user_is_admin()"), true);
    assert.equal(await canExecute("anon", "current_user_is_admin()"), false);
    assert.equal(await canExecute("authenticated", "assert_community_participation_allowed(uuid)"), true);
    assert.equal(await canExecute("anon", "assert_community_participation_allowed(uuid)"), false);
    assert.equal(await canExecute("anon", "season_leaderboard(text, integer)"), true);
    assert.equal(await canExecute("authenticated", "season_leaderboard(text, integer)"), true);
    assert.equal(await canExecute("anon", "apply_retention_policy()"), false);
    assert.equal(await canExecute("authenticated", "apply_retention_policy()"), false);
    assert.equal(await canExecute("service_role", "apply_retention_policy()"), true);

    await database.exec("create function public.new_security_definer() returns integer language sql security definer as 'select 1'");
    assert.equal(await canExecute("anon", "new_security_definer()"), false);
    assert.equal(await canExecute("authenticated", "new_security_definer()"), false);
    assert.equal(await canExecute("service_role", "new_security_definer()"), true);
  } finally {
    await database.close();
  }
});
