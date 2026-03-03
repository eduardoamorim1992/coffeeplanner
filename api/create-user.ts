import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, password, nome, role, division_id } = req.body;

    // Criar usuário no Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Inserir perfil
    const { error: profileError } = await supabase
      .from("users_profile")
      .insert({
        id: data.user.id,
        nome,
        role,
        division_id,
        ativo: true,
      });

    if (profileError) {
      return res.status(400).json({ error: profileError.message });
    }

    return res.status(200).json({ success: true });

  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}